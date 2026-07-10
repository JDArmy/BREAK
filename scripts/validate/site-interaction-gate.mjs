import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const consoleBlockTypes = new Set(['info', 'warning', 'error']);
const minCanvasPaintedPixels = 1200;

const entities = [
  { type: 'risk', relationKey: 'risk', listPath: '/#/knowledges/risk/list', detailPath: '/#/knowledges/risk/detail/R0001', homePath: '/#/home/risk/R0001', id: 'R0001', drawerText: /R0001|流程自动化|Process Automation/i },
  { type: 'avoidance', relationKey: 'avoidance', listPath: '/#/knowledges/avoidance/list', detailPath: '/#/knowledges/avoidance/detail/A0001', homePath: '/#/home/avoidance/A0001', id: 'A0001', drawerText: /A0001|人机验证|CAPTCHA/i },
  { type: 'attackTool', relationKey: 'attack-tool', listPath: '/#/knowledges/attack-tool/list', detailPath: '/#/knowledges/attack-tool/detail/AT0077', homePath: '/#/home/attack-tool/AT0077', id: 'AT0077', drawerText: /AT0077|DeFi攻击脚本|DeFi Attack Scripts/i },
  { type: 'threatActor', relationKey: 'threat-actor', listPath: '/#/knowledges/threat-actor/list', detailPath: '/#/knowledges/threat-actor/detail/TA0001', homePath: '/#/home/threat-actor/TA0001', id: 'TA0001', drawerText: /TA0001|羊毛党|Freebie/i },
  { type: 'term', relationKey: 'term', listPath: '/#/knowledges/term/list', detailPath: '/#/knowledges/term/detail/T0001', homePath: '/#/home/term/T0001', id: 'T0001', drawerText: /T0001|账号|Account/i },
  { type: 'case', relationKey: 'case', listPath: '/#/knowledges/case/list', detailPath: '/#/knowledges/case/detail/C0001', homePath: '/#/home/case/C0001', id: 'C0001', drawerText: /C0001|案例|Case|Login/i },
];

const relationRoutes = [
  { label: 'risk', path: '/#/relations/risk-relation/risk/R0001', expected: /风险视角|Risk|关系网络|Network/i, canvas: '.network-chart canvas' },
  { label: 'attack-path', path: '/#/relations/attack-path/risk/R0001', expected: /攻击路径|Attack Path|Sankey|桑基/i, canvas: '.sankey-chart canvas' },
  { label: 'defense-coverage', path: '/#/relations/defense-coverage/risk/R0001', expected: /防御覆盖|Defense Coverage|覆盖|Coverage/i },
  { label: 'path-explorer', path: '/#/relations/path-explorer/risk/R0001', expected: /路径探索|Path Explorer|Source|Target/i, canvas: '.path-explorer-chart canvas' },
];

const viewports = [
  { label: 'desktop', width: 1440, height: 980, isMobile: false },
  { label: 'mobile', width: 390, height: 844, isMobile: true },
];

async function findFreePort() {
  const server = net.createServer();
  server.listen(0, host);
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4173;
  server.close();
  await once(server, 'close');
  return port;
}

function waitForServer(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          resolve();
          return;
        }
      } catch {
        // retry
      }

      if (Date.now() > deadline) {
        reject(new Error(`Preview server did not become ready: ${url}`));
        return;
      }
      setTimeout(check, 250);
    };
    void check();
  });
}

function isSameOrigin(url, baseUrl) {
  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

function formatRequest(request) {
  return `${request.method()} ${request.url()}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectVisible(page, selector, message, timeout = 10000) {
  try {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout });
  } catch {
    throw new Error(message);
  }
}

async function expectText(page, pattern, message, timeout = 10000) {
  try {
    await page.waitForFunction(
      ({ source, flags }) => new RegExp(source, flags).test(document.body.innerText),
      { source: pattern.source, flags: pattern.flags },
      { timeout },
    );
  } catch {
    throw new Error(message);
  }
}

async function getPaintedCanvasPixels(page, selector) {
  return page.locator(selector).first().evaluate((canvas) => {
    const context = canvas.getContext('2d');
    if (!context) return 0;
    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return 0;
    const sampleWidth = Math.min(width, 360);
    const sampleHeight = Math.min(height, 260);
    const image = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    let painted = 0;
    for (let index = 3; index < image.length; index += 4) {
      if (image[index] > 0) painted += 1;
    }
    return painted;
  });
}

async function assertCanvasPainted(page, selector, label) {
  await expectVisible(page, selector, `${label} 画布不可见`, 15000);
  const pixels = await getPaintedCanvasPixels(page, selector);
  assert(pixels >= minCanvasPaintedPixels, `${label} 画布有效像素过少 ${pixels}`);
}

async function clickFirstVisible(page, selectors, label) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    try {
      await locator.waitFor({ state: 'visible', timeout: 2500 });
      await locator.click({ timeout: 5000 });
      return true;
    } catch {
      // try next selector
    }
  }
  throw new Error(`无法点击：${label}`);
}

async function openGlobalSearch(page, viewport) {
  if (viewport.isMobile) {
    await clickFirstVisible(page, ['.mobile-search'], '打开移动端搜索');
  } else {
    await clickFirstVisible(page, ['.search-trigger'], '打开全局搜索');
  }
  await expectVisible(page, '#global-search', '全局搜索输入框未出现');
}

async function searchAndOpenEntityDrawer(page, viewport, baseUrl, startPath, entity, expectedPathPart) {
  await page.goto(`${baseUrl}${startPath}`, { waitUntil: 'networkidle', timeout: 30000 });
  await openGlobalSearch(page, viewport);
  await page.locator('#global-search').fill(entity.id);
  const result = page.locator('.search-result-item', { hasText: entity.id }).first();
  await result.waitFor({ state: 'visible', timeout: 10000 });

  const resultText = await result.innerText();
  assert(resultText.includes(entity.id), `${entity.id} 搜索结果未展示实体 ID`);
  assert(resultText.replace(entity.id, '').trim().length > 0, `${entity.id} 搜索结果 pane 缺少标题或摘要文本`);

  await result.click();
  await expectVisible(page, '.home-entity-detail-drawer', `${entity.id} 点击搜索结果后首页抽屉未出现`);
  await expectText(page, entity.drawerText, `${entity.id} 抽屉未展示预期实体内容`);
  assert(page.url().includes(expectedPathPart), `${entity.id} 搜索结果打开 URL 不正确：${page.url()}`);
}

async function assertDrawerDetailLayout(page, entity, viewport) {
  await page.goto(`${page.baseUrl}${entity.homePath}`, { waitUntil: 'networkidle', timeout: 30000 });
  await expectVisible(page, '.home-entity-detail-drawer .detail-panel', `${entity.id} 抽屉详情未出现`);
  await expectText(page, entity.drawerText, `${entity.id} 抽屉内容缺失`);
  await expectVisible(page, '.home-entity-detail-drawer .detail-heading h2', `${entity.id} 抽屉标题缺失`);
  await expectVisible(page, '.home-entity-detail-drawer .detail-section', `${entity.id} 抽屉详情 section 缺失`);

  if (entity.type === 'risk') {
    const meta = await page.evaluate(() => {
      const get = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width) };
      };
      const cards = [...document.querySelectorAll('.risk-meta-grid > .risk-meta-card')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top), left: Math.round(r.left), text: el.textContent?.trim() ?? '' };
        });
      return {
        first: cards[0] ?? null,
        second: cards[1] ?? null,
        impact: get('.risk-meta-card--impact'),
      };
    });
    assert(meta.first && meta.second && meta.impact, '风险抽屉元信息卡片缺失');
    assert(Math.abs(meta.first.top - meta.second.top) <= 4, '风险抽屉处置优先级和风险复杂度未同排');
    assert(meta.impact.top > meta.first.top, '风险抽屉风险影响未单独显示在下一行');
  }

  if (entity.type === 'avoidance') {
    const meta = await page.evaluate(() => {
      const get = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), width: Math.round(r.width) };
      };
      return {
        category: get('.avoidance-meta-card--category'),
        effectiveness: get('.avoidance-meta-card--effectiveness'),
      };
    });
    assert(meta.category && meta.effectiveness, '规避手段抽屉分类或有效性缺失');
    assert(Math.abs(meta.category.top - meta.effectiveness.top) <= 4, '规避手段抽屉分类和有效性未同排');
  }

  if (entity.type === 'attackTool') {
    const relationLayout = await page.evaluate(() => {
      const list = document.querySelector('.attack-tool-relation-list');
      const items = [...document.querySelectorAll('.attack-tool-relation-item')];
      const first = items[0];
      const second = items[1];
      const badge = first?.querySelector('.attack-tool-relation-type');
      const rect = (element) => {
        if (!element) return null;
        const bounds = element.getBoundingClientRect();
        return { top: Math.round(bounds.top), left: Math.round(bounds.left) };
      };
      const itemStyle = first ? getComputedStyle(first) : null;
      const badgeStyle = badge ? getComputedStyle(badge) : null;
      return {
        listDisplay: list ? getComputedStyle(list).display : '',
        itemCount: items.length,
        first: rect(first),
        second: rect(second),
        itemDisplay: itemStyle?.display ?? '',
        itemBorderTopWidth: itemStyle?.borderTopWidth ?? '',
        badgeBorderRadius: badgeStyle?.borderRadius ?? '',
      };
    });
    assert(relationLayout.itemCount >= 2, '攻击工具抽屉缺少关联攻击工具测试数据');
    assert(relationLayout.listDisplay === 'grid' && relationLayout.itemDisplay === 'grid', '关联攻击工具卡片网格样式丢失');
    assert(relationLayout.itemBorderTopWidth !== '0px', '关联攻击工具卡片边框样式丢失');
    assert(relationLayout.badgeBorderRadius !== '0px', '关联攻击工具关系类型 badge 样式丢失');
    assert(relationLayout.first && relationLayout.second, '关联攻击工具卡片布局数据不足');
    assert(relationLayout.second.top > relationLayout.first.top, '窄抽屉关联攻击工具未降为单列');
  }

  if (entity.type === 'case') {
    const meta = await page.evaluate(() => {
      const get = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          top: Math.round(r.top),
          width: Math.round(r.width),
          borderTopWidth: style.borderTopWidth,
        };
      };
      return {
        id: get('.case-drawer-meta-row .detail-id'),
        action: get('.case-drawer-meta-row .el-button'),
        title: get('.case-drawer-title'),
        category: get('.case-drawer-category'),
        time: get('.case-drawer-time'),
      };
    });
    assert(meta.id && meta.action && meta.title, '案例抽屉标题区域缺失');
    assert(Math.abs(meta.id.top - meta.action.top) <= 8, '案例抽屉实体 ID 和按钮未同排');
    assert(meta.title.top > meta.id.top, '案例抽屉标题未单独下一行显示');
    if (meta.category && meta.time) {
      if (!viewport.isMobile) {
        assert(Math.abs(meta.category.top - meta.time.top) <= 4, '案例分类和发生时间未同排');
        assert(meta.category.width > meta.time.width, '案例分类没有比发生时间更宽');
      }
      assert(meta.category.borderTopWidth !== '0px' && meta.time.borderTopWidth !== '0px', '案例分类或发生时间缺少边框');
    }
  }
}

async function assertHomeRiskMatrix(page, baseUrl, viewport) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await expectVisible(page, '.risk-card', '首页风险矩阵未出现');
  await expectVisible(page, '.risk-list .link', '首页风险链接未出现');

  const oneLineIssues = await page.evaluate(() =>
    [...document.querySelectorAll('.risk-list .link')]
      .slice(0, 40)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const lineHeight = Number.parseFloat(style.lineHeight);
        return { text: el.textContent?.trim(), height: rect.height, lineHeight };
      })
      .filter((item) => item.lineHeight > 0 && item.height > item.lineHeight * 1.65)
      .slice(0, 8)
  );
  assert(oneLineIssues.length === 0, `首页风险链接不是单行显示：${oneLineIssues.map((i) => i.text).join(', ')}`);

  await page.locator('.risk-list .link').first().click();
  await expectVisible(page, '.home-entity-detail-drawer', '首页风险点击后抽屉未打开');
  await expectVisible(page, '.home-entity-detail-drawer .detail-heading h2', '首页风险抽屉标题缺失');

  if (viewport.isMobile) {
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await expectVisible(page, '.risk-card', '移动端首页风险矩阵未出现');
  }
}

async function selectFirstVisibleOption(page, selectSelector, label) {
  const select = page.locator(selectSelector).first();
  await select.waitFor({ state: 'visible', timeout: 8000 });
  try {
    await select.locator('.el-select__wrapper').click({ timeout: 5000 });
  } catch {
    await select.click({ timeout: 5000, force: true });
  }
  const options = page.locator('.el-select-dropdown__item:visible');
  await options.nth(1).click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await expectVisible(page, '.risk-card', `${label} 后风险矩阵未显示`);
}

async function assertBusinessDomainAndSubRiskSwitch(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await selectFirstVisibleOption(page, '#business-domain-selector', '切换业务域');
  assert(page.url().includes('/business-domain/'), `切换业务域后 URL 未同步：${page.url()}`);

  await expectVisible(page, '.subrisk-toggle', '子风险切换控件缺失');
  const before = await page.locator('.sub-risk:visible').count();
  await page.locator('.subrisk-toggle label').last().click({ timeout: 5000 });
  await page.waitForTimeout(500);
  const afterHide = await page.locator('.sub-risk:visible').count();
  assert(afterHide <= before, '隐藏子风险后可见子风险数量未减少');
  await page.locator('.subrisk-toggle label').first().click({ timeout: 5000 });
  await page.waitForTimeout(500);
  const afterShow = await page.locator('.sub-risk:visible').count();
  assert(afterShow >= afterHide, '显示子风险后可见子风险数量未恢复');
}

async function assertKnowledgePages(page, baseUrl, viewport) {
  for (const entity of entities) {
    await page.goto(`${baseUrl}${entity.listPath}`, { waitUntil: 'networkidle', timeout: 30000 });
    await expectVisible(page, '.knowledge-list-item', `${entity.type} 知识库列表未出现`);
    await expectVisible(page, '.knowledge-list-item.active', `${entity.type} 知识库未自动激活默认实体`);
    if (viewport.isMobile) {
      await page.locator('.knowledge-list-item.active, .knowledge-list-item').first().click({ timeout: 5000 });
      await expectVisible(page, '.knowledge-mobile-detail .detail-panel, .knowledge-detail .detail-panel', `${entity.type} 移动端详情未出现`);
    }
    await expectVisible(page, '.knowledge-detail .detail-panel', `${entity.type} 知识库详情未出现`);
    await expectVisible(page, '.knowledge-detail .detail-heading h2', `${entity.type} 知识库详情标题缺失`);
    await expectVisible(page, '.knowledge-detail .detail-section, .knowledge-detail .detail-grid', `${entity.type} 知识库详情数据 section 缺失`);

    if (!viewport.isMobile) {
      const activeKey = await page.locator('.knowledge-list-item.active').first().getAttribute('data-knowledge-key');
      assert(Boolean(activeKey), `${entity.type} 默认激活列表项缺少 data-knowledge-key`);
    }

    if (entity.type === 'risk') {
      const meta = await page.evaluate(() => {
        const get = (selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top) };
        };
        const cards = [...document.querySelectorAll('.risk-meta-grid > .risk-meta-card')]
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { top: Math.round(r.top) };
          });
        return {
          first: cards[0] ?? null,
          second: cards[1] ?? null,
          impact: get('.risk-meta-card--impact'),
        };
      });
      if (meta.first && meta.second && !viewport.isMobile) {
        assert(Math.abs(meta.first.top - meta.second.top) <= 4, '知识库风险优先级和复杂度未同排');
      }
      assert(meta.impact, '知识库风险影响缺失');

      const relationStyles = await page.evaluate(() => {
        const list = document.querySelector('.knowledge-detail .risk-relation-list');
        const item = document.querySelector('.knowledge-detail .risk-relation-item');
        if (!list || !item) return null;
        const listStyle = getComputedStyle(list);
        const itemStyle = getComputedStyle(item);
        return {
          listDisplay: listStyle.display,
          itemDisplay: itemStyle.display,
          itemBorderTopWidth: itemStyle.borderTopWidth,
          itemPadding: itemStyle.padding,
        };
      });
      assert(relationStyles, '知识库相关风险测试数据或区域缺失');
      assert(relationStyles.listDisplay === 'grid' && relationStyles.itemDisplay === 'grid', '知识库相关风险卡片网格样式丢失');
      assert(relationStyles.itemBorderTopWidth !== '0px' && relationStyles.itemPadding !== '0px', '知识库相关风险卡片边框或内边距样式丢失');
    }

    if (entity.type === 'avoidance') {
      const meta = await page.evaluate(() => {
        const get = (selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top) };
        };
        return {
          category: get('.avoidance-meta-card--category'),
          effectiveness: get('.avoidance-meta-card--effectiveness'),
        };
      });
      if (meta.category && meta.effectiveness && !viewport.isMobile) {
        assert(Math.abs(meta.category.top - meta.effectiveness.top) <= 4, '知识库规避手段分类和有效性未同排');
      }
    }

  }
}

async function assertRelationView(page, baseUrl, route, viewport) {
  await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
  await expectText(page, route.expected, `${route.label} 视角预期文本缺失`, 15000);
  await expectVisible(page, '.relation-selector', `${route.label} 全局筛选框缺失`);

  if (route.canvas) {
    await assertCanvasPainted(page, route.canvas, route.label);
  }
  const networkCanvasCount = await page.locator('.network-chart canvas:visible').count();
  if (networkCanvasCount > 0) {
    await assertCanvasPainted(page, '.network-chart canvas:visible', `${route.label} 关系网络`);
  }
  const sankeyCanvasCount = await page.locator('.sankey-chart canvas:visible').count();
  if (sankeyCanvasCount > 0) {
    await assertCanvasPainted(page, '.sankey-chart canvas:visible', `${route.label} 桑基图`);
  }

  const typeSelect = page.locator('#relation-selector-type').first();
  if ((await typeSelect.count()) > 0 && !viewport.isMobile) {
    try {
      await typeSelect.locator('.el-select__wrapper').click({ timeout: 5000 });
    } catch {
      await typeSelect.click({ timeout: 5000, force: true });
    }
    await page.locator('.el-select-dropdown__item:visible').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.keyboard.press('Escape');
  }

  const toolbarButtons = page.locator('.graph-toolbar .el-button:visible');
  if ((await toolbarButtons.count()) > 0) {
    await toolbarButtons.nth(Math.min(6, (await toolbarButtons.count()) - 1)).click({ force: true });
    await page.waitForTimeout(300);
    if ((await page.locator('#node-filter-pane, .filter-pane').count()) > 0) {
      await expectVisible(page, '#node-filter-pane, .filter-pane', `${route.label} 筛选面板未出现`);
      const checkbox = page.locator('#node-filter-pane .el-checkbox, .filter-pane .el-checkbox').first();
      if ((await checkbox.count()) > 0) {
        await checkbox.click({ timeout: 5000 });
        await page.waitForTimeout(300);
      }
    }
  }

  const analysisFilter = page.locator('.relation-analysis-filter .el-select').first();
  if ((await analysisFilter.count()) > 0 && !viewport.isMobile) {
    try {
      await analysisFilter.locator('.el-select__wrapper').click({ timeout: 5000 });
    } catch {
      await analysisFilter.click({ timeout: 5000, force: true });
    }
    const option = page.locator('.el-select-dropdown__item:visible').nth(1);
    if ((await option.count()) > 0) {
      await page.waitForTimeout(150);
      await option.click({ timeout: 5000, force: true });
      await expectVisible(page, '.relation-analysis-filter-summary', `${route.label} 分析筛选摘要未出现`);
    } else {
      await page.keyboard.press('Escape');
    }
  }

  const pathExplorerControl = page.locator('.path-explorer-control, .path-explorer-chart, .path-explorer-pane').first();
  if (route.label === 'path-explorer') {
    await pathExplorerControl.waitFor({ state: 'visible', timeout: 15000 });
  }
}

async function assertRelationViews(page, baseUrl, viewport) {
  for (const route of relationRoutes) {
    await assertRelationView(page, baseUrl, route, viewport);
  }
}

function attachGuards(page, label, baseUrl, runtimeErrors, resourceErrors) {
  page.on('pageerror', (error) => {
    runtimeErrors.push(`${label}: pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (!consoleBlockTypes.has(message.type())) return;
    if (message.type() === 'error' && message.text().startsWith('Failed to load resource:')) return;
    if (message.text().includes('Canvas2D: Multiple readback operations using getImageData')) return;
    runtimeErrors.push(`${label}: console.${message.type()}: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    if (!isSameOrigin(request.url(), baseUrl)) return;
    resourceErrors.push(`${label}: ${formatRequest(request)} failed: ${request.failure()?.errorText ?? 'unknown'}`);
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status < 400 || !isSameOrigin(response.url(), baseUrl)) return;
    resourceErrors.push(`${label}: ${response.request().method()} ${response.url()} returned HTTP ${status}`);
  });
}

async function runScenario(browser, baseUrl, viewport, label, fn) {
  const runtimeErrors = [];
  const resourceErrors = [];
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.isMobile ? 2 : 1,
    isMobile: viewport.isMobile,
  });
  const page = await context.newPage();
  page.baseUrl = baseUrl;
  attachGuards(page, `${viewport.label}/${label}`, baseUrl, runtimeErrors, resourceErrors);
  try {
    await fn(page);
    if (runtimeErrors.length || resourceErrors.length) {
      throw new Error([...runtimeErrors, ...resourceErrors].join('\n'));
    }
    console.log(`  ✓ ${viewport.label}/${label}`);
  } finally {
    await page.close();
    await context.close();
  }
}

const port = await findFreePort();
const baseUrl = `http://${host}:${port}`;
const preview = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'preview', '--', '--host', host, '--port', String(port), '--strictPort'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

let previewOutput = '';
preview.stdout.on('data', (chunk) => {
  previewOutput += chunk.toString();
});
preview.stderr.on('data', (chunk) => {
  previewOutput += chunk.toString();
});

let browser;
try {
  await waitForServer(baseUrl);
  browser = await chromium.launch({ headless: true });

  for (const viewport of viewports) {
    await runScenario(browser, baseUrl, viewport, 'home-search-all-entities', async (page) => {
      for (const entity of entities) {
        await searchAndOpenEntityDrawer(page, viewport, baseUrl, '/', entity, `/home/${entity.relationKey}/${entity.id}`);
      }
    });

    await runScenario(browser, baseUrl, viewport, 'cross-page-search-all-entities', async (page) => {
      for (const entity of entities) {
        await searchAndOpenEntityDrawer(page, viewport, baseUrl, '/#/knowledges/risk/list', entity, `/home/${entity.relationKey}/${entity.id}`);
      }
    });

    await runScenario(browser, baseUrl, viewport, 'home-risk-layout-and-drawers', async (page) => {
      await assertHomeRiskMatrix(page, baseUrl, viewport);
      for (const entity of entities) {
        await assertDrawerDetailLayout(page, entity, viewport);
      }
    });

    await runScenario(browser, baseUrl, viewport, 'business-domain-and-subrisks', async (page) => {
      await assertBusinessDomainAndSubRiskSwitch(page, baseUrl);
    });

    await runScenario(browser, baseUrl, viewport, 'knowledge-navigation-and-details', async (page) => {
      await assertKnowledgePages(page, baseUrl, viewport);
    });

    await runScenario(browser, baseUrl, viewport, 'relation-views-and-filters', async (page) => {
      await assertRelationViews(page, baseUrl, viewport);
    });
  }

  console.log('\n✅ 站点交互门禁通过');
} catch (error) {
  console.error('\n❌ 站点交互门禁失败\n');
  console.error(error instanceof Error ? error.message : String(error));
  if (previewOutput.trim()) {
    console.error('\n--- preview output ---');
    console.error(previewOutput.trim());
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  preview.kill('SIGTERM');
}
