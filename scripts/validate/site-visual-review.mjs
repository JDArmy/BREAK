import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { ensureDir, projectRoot, writeJson } from '../search/common.mjs';

const host = '127.0.0.1';
const reportDir = path.join(projectRoot, 'research/search-reports/browser-visual-review');
const screenshotDir = path.join(reportDir, 'screenshots');
const reportJsonPath = path.join(reportDir, 'browser-visual-review.json');
const reportMdPath = path.join(reportDir, 'browser-visual-review.md');

const viewports = [
  { label: 'desktop', width: 1440, height: 980 },
  { label: 'mobile', width: 390, height: 844 },
  { label: 'mobile-small', width: 360, height: 740 },
];

const routes = [
  { label: 'home', path: '/', text: /BREAK|业务风险|Business Risk/i },
  { label: 'risks', path: '/#/knowledges/risk/list', text: /R0001|流程自动化|Process/i },
  { label: 'avoidances', path: '/#/knowledges/avoidance/list', text: /A0001|人机验证|CAPTCHA/i },
  { label: 'attack-tools', path: '/#/knowledges/attack-tool/list', text: /AT0001|电话黑卡|SIM/i },
  { label: 'threat-actors', path: '/#/knowledges/threat-actor/list', text: /Threat Actors|TA0001|Freebie Hunters/i },
  { label: 'terms', path: '/#/knowledges/term/list', text: /T0001|账号|Account/i },
  { label: 'cases', path: '/#/knowledges/case/list', text: /Cases|C0001|Login Replay/i },
  {
    label: 'relation-sankey',
    path: '/#/relations/attack-path/risk/R0001',
    text: /R0001|攻击路径|Attack Path|关系网络|Network/i,
  },
  {
    label: 'relation-network',
    path: '/#/relations/risk-relation/risk/R0001',
    text: /R0001|攻击路径|Attack Path|关系网络|Network/i,
    canvasSelector: '.network-chart canvas',
  },
  {
    label: 'relation-path-explorer',
    path: '/#/relations/path-explorer/risk/R0001',
    text: /R0001|Path Explorer|路径探索|Source|Target/i,
    canvasSelector: '.path-explorer-chart canvas',
  },
];

const interactionRoutes = [
  { label: 'desktop-global-search', path: '/', viewport: 'desktop' },
  { label: 'desktop-navigation-controls', path: '/', viewport: 'desktop' },
  { label: 'desktop-error-route-fallbacks', path: '/', viewport: 'desktop' },
  { label: 'home-drawer-detail-route', path: '/#/home/risk/R0001', viewport: 'desktop' },
  { label: 'knowledge-search-and-filters', path: '/#/knowledges/risk/list', viewport: 'desktop' },
  { label: 'risks-detail-click', path: '/#/knowledges/risk/list', viewport: 'desktop' },
  { label: 'entity-link-navigation', path: '/#/knowledges/risk/detail/R0001', viewport: 'desktop' },
  { label: 'relation-selector-switch', path: '/#/relations/risk-relation/risk/R0001', viewport: 'desktop' },
  { label: 'relation-network-interaction', path: '/#/relations/risk-relation/risk/R0001', viewport: 'desktop' },
  { label: 'relation-sankey-interaction', path: '/#/relations/attack-path/risk/R0001', viewport: 'desktop' },
  { label: 'relation-analysis-filters', path: '/#/relations/defense-coverage/risk/R0001', viewport: 'desktop' },
  { label: 'mobile-nav-search', path: '/', viewport: 'mobile' },
  { label: 'mobile-cases-detail-click', path: '/#/knowledges/case/list', viewport: 'mobile' },
  { label: 'mobile-small-knowledge-empty', path: '/#/knowledges/risk/list', viewport: 'mobile-small' },
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
        // Retry until timeout.
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

function resetReportDir() {
  fs.rmSync(reportDir, { recursive: true, force: true });
  ensureDir(screenshotDir);
}

function isMobileViewport(label) {
  return label.startsWith('mobile');
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

async function collectLayoutMetrics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = root.clientWidth;
    const viewportHeight = root.clientHeight;
    const overflowElements = [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === 'string' ? element.className.slice(0, 80) : '',
          text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
        };
      })
      .filter((item) => item.right > viewportWidth + 2 || item.left < -2)
      .slice(0, 12);

    return {
      viewportWidth,
      viewportHeight,
      scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
      scrollHeight: Math.max(root.scrollHeight, body.scrollHeight),
      overflowElements,
    };
  });
}

async function waitForExpectedText(page, pattern, timeoutMs = 10000) {
  await page.waitForFunction(
    ({ source, flags }) => new RegExp(source, flags).test(document.body.innerText),
    { source: pattern.source, flags: pattern.flags },
    { timeout: timeoutMs },
  );
}

function sanitizeIssueText(text) {
  return String(text || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function classifyKnownWarning(result, warning) {
  const warningText = String(warning);
  const isOverflowElement = warningText.startsWith('溢出元素 ');
  const isHorizontalOverflow = warningText.startsWith('横向溢出 ');

  if (
    result.label === 'home' &&
    result.viewport === 'desktop' &&
    isOverflowElement &&
    /risk-dimension|risk-card|risk-scene|risk-list|risk-with-sub|s-risk|parent-risk-link|risk-dimension-title|risk-scene-title|el-row is-justify-center|tbody\.no-class|tr\.no-class/.test(warningText)
  ) {
    return '首页英文场景矩阵采用受控横向滚动，风险维度和风险场景列允许超出视口';
  }

  if (
    result.label === 'relation-network' &&
    result.viewport.startsWith('mobile') &&
    isOverflowElement &&
    /network-chart|canvas|no-class/.test(warningText)
  ) {
    return '移动端关系网络画布在面板内通过缩放和拖拽浏览，允许 canvas 尺寸超出视口';
  }

  if (
    result.label === 'relation-path-explorer' &&
    result.viewport.startsWith('mobile') &&
    isOverflowElement &&
    /el-tabs__nav|el-tabs__item|no-class/.test(warningText)
  ) {
    return '移动端关系图 el-tabs 在窄屏 nav 溢出，与 relation-network 同属已知移动端布局限制';
  }

  if (
    result.label === 'desktop-global-search' &&
    result.viewport === 'desktop' &&
    isOverflowElement &&
    /risk-dimension|risk-card|risk-scene|risk-list|risk-with-sub|s-risk|parent-risk-link|risk-dimension-title|risk-scene-title|el-row is-justify-center|tbody\.no-class|tr\.no-class/.test(warningText)
  ) {
    return '桌面全局搜索场景停留在首页背景，继承首页英文场景矩阵受控横向滚动';
  }

  if (
    [
      'desktop-navigation-controls',
      'desktop-error-route-fallbacks',
      'home-drawer-detail-route',
    ].includes(result.label) &&
    result.viewport === 'desktop' &&
    isOverflowElement &&
    /risk-dimension|risk-card|risk-scene|risk-list|risk-with-sub|s-risk|parent-risk-link|risk-dimension-title|risk-scene-title|el-row is-justify-center|tbody\.no-class|tr\.no-class/.test(warningText)
  ) {
    return '桌面导航和详情抽屉场景停留在首页背景，继承首页英文场景矩阵受控横向滚动';
  }

  if (
    result.label === 'relation-network-interaction' &&
    result.step === 'after-node-detail-drawer' &&
    isOverflowElement &&
    /el-drawer|relation-drawer|drawer|node-insight-panel|node-detail-panel|node-detail-title|svg\.no-class|path\.no-class|risk-dimension|risk-card|risk-scene|risk-list|risk-with-sub|s-risk|parent-risk-link|risk-dimension-title|risk-scene-title|tbody\.no-class|tr\.no-class/.test(warningText)
  ) {
    return '关系节点详情抽屉打开态会保留图谱和长内容背景，抽屉内滚动由组件控制';
  }

  if (
    result.label === 'mobile-nav-search' &&
    result.viewport === 'mobile' &&
    isOverflowElement &&
    /mobile-nav-drawer|el-drawer|drawer-header|drawer-logo|drawer-title|mobile-nav-list|mobile-nav-item|span\.no-class|search-result|search-highlight|risk-dimension|risk-card|risk-scene|risk-list|risk-with-sub|s-risk|parent-risk-link|risk-dimension-title|risk-scene-title|tbody\.no-class|tr\.no-class/.test(warningText)
  ) {
    return '移动端菜单和搜索抽屉打开态由抽屉内部滚动控制';
  }

  if (
    result.label === 'mobile-cases-detail-click' &&
    result.viewport === 'mobile' &&
    isOverflowElement &&
    /knowledge|case|detail|entity-reference|el-drawer|risk-dimension|risk-card|risk-scene|risk-list|risk-with-sub|s-risk|parent-risk-link|risk-dimension-title|risk-scene-title|tbody\.no-class|thead\.no-class|tr\.no-class|th\.no-class|colgroup\.no-class/.test(warningText)
  ) {
    return '移动端知识库详情页长内容由详情区域滚动控制';
  }

  if (
    isHorizontalOverflow &&
    [
      'home',
      'desktop-global-search',
      'desktop-navigation-controls',
      'desktop-error-route-fallbacks',
      'home-drawer-detail-route',
      'relation-network',
      'relation-network-interaction',
      'mobile-nav-search',
      'mobile-cases-detail-click',
    ].includes(result.label)
  ) {
    return '该场景存在已知受控横向滚动或抽屉打开态溢出，保留截图人工复核';
  }

  if (isOverflowElement && /entity-id-auto/.test(warningText)) {
    return '实体 ID 自动识别 span 在长文本中可能微量超出视口，属于行内元素自然溢出';
  }

  return null;
}

function splitKnownWarnings(result) {
  const warnings = [];
  const knownWarnings = [];
  for (const warning of result.warnings) {
    const reason = classifyKnownWarning(result, warning);
    if (reason) {
      knownWarnings.push({ warning, reason });
    } else {
      warnings.push(warning);
    }
  }
  result.warnings = warnings;
  result.knownWarnings = knownWarnings;
}

function renderMarkdown(report) {
  const lines = [
    '# Browser Visual Review',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Route Screenshots',
    '',
    '| Viewport | Route | Screenshot | Issues |',
    '| --- | --- | --- | --- |',
  ];

  for (const result of report.results) {
    const issues = [
      ...result.issues.map((item) => `错误：${item}`),
      ...result.warnings.map((item) => `警告：${item}`),
      ...(result.knownWarnings ?? []).map((item) => `已知：${item.warning}（${item.reason}）`),
    ];
    lines.push(
      `| ${result.viewport} | \`${result.path}\` | [${result.screenshot}](screenshots/${result.screenshot}) | ${issues.length ? issues.map(sanitizeIssueText).join('<br>') : 'ok'} |`,
    );
  }

  lines.push('', '## Interaction Screenshots', '');
  lines.push('| Viewport | Scenario | Step | URL | Screenshot | Issues |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const result of report.interactions) {
    const issues = [
      ...result.issues.map((item) => `错误：${item}`),
      ...result.warnings.map((item) => `警告：${item}`),
      ...(result.knownWarnings ?? []).map((item) => `已知：${item.warning}（${item.reason}）`),
    ];
    lines.push(
      `| ${result.viewport} | ${result.label} | ${result.step} | \`${result.url}\` | [${result.screenshot}](screenshots/${result.screenshot}) | ${issues.length ? issues.map(sanitizeIssueText).join('<br>') : 'ok'} |`,
    );
  }

  if (report.runtimeErrors.length || report.resourceErrors.length) {
    lines.push('', '## Runtime And Resource Errors', '');
    for (const item of [...report.runtimeErrors, ...report.resourceErrors]) {
      lines.push(`- ${item}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function recordState(page, collection, scenario, step, issues = [], warnings = []) {
  const layout = await collectLayoutMetrics(page);
  if (layout.scrollWidth > layout.viewportWidth + 2) {
    warnings.push(`横向溢出 ${layout.scrollWidth}px > ${layout.viewportWidth}px`);
  }
  for (const item of layout.overflowElements) {
    warnings.push(`溢出元素 ${item.tag}.${item.className || 'no-class'} "${item.text}"`);
  }

  const screenshot = `${scenario.viewport}-${scenario.label}-${step}.png`;
  await page.screenshot({
    path: path.join(screenshotDir, screenshot),
    fullPage: true,
  });
  collection.push({
    viewport: scenario.viewport,
    label: scenario.label,
    step,
    url: page.url(),
    screenshot,
    layout,
    issues: [...issues],
    warnings: [...warnings],
  });
}

async function clickFirstVisible(page, selectors, issues, actionLabel) {
  for (const selector of selectors) {
    const locators = page.locator(selector);
    const count = await locators.count();
    for (let i = 0; i < count; i += 1) {
      const locator = locators.nth(i);
      try {
        await locator.waitFor({ state: 'visible', timeout: 1000 });
        await locator.scrollIntoViewIfNeeded({ timeout: 2000 });
        await locator.click({ timeout: 5000 });
        return true;
      } catch {
        // Try next matching element.
      }
    }
  }
  issues.push(`无法执行交互：${actionLabel}`);
  return false;
}

async function waitForUrlIncludes(page, expected, issues, actionLabel) {
  try {
    await page.waitForFunction(
      (value) => window.location.href.includes(value),
      expected,
      { timeout: 6000 },
    );
  } catch {
    issues.push(`${actionLabel} 后 URL 未包含 ${expected}，实际 ${page.url()}`);
  }
}

async function waitForVisibleDrawerText(page, textPattern, timeoutMs = 10000) {
  const drawerBody = page.locator('.el-drawer__body', { hasText: textPattern }).last();
  await drawerBody.waitFor({ state: 'visible', timeout: timeoutMs });
}

async function clickDropdownItemByText(page, textPattern, issues, actionLabel) {
  const locators = page.locator('.el-dropdown-menu__item', { hasText: textPattern });
  const count = await locators.count();
  for (let i = 0; i < count; i += 1) {
    const locator = locators.nth(i);
    try {
      await locator.waitFor({ state: 'visible', timeout: 1000 });
      await locator.scrollIntoViewIfNeeded({ timeout: 2000 });
      await locator.click({ timeout: 5000 });
      return true;
    } catch {
      // Try next matching dropdown item.
    }
  }
  issues.push(`无法选择下拉项：${actionLabel}`);
  return false;
}

async function clickMoreDocsEntry(page, issues) {
  const before = issues.length;
  await clickFirstVisible(page, ['.more-menu .el-dropdown-link'], issues, '打开更多菜单');
  if (await clickDropdownItemByText(page, /Docs|User Manual|文档|使用手册/i, issues, '文档')) {
    return true;
  }
  issues.splice(before);

  await clickFirstVisible(page, ['.overflow-menu .el-dropdown-link'], issues, '打开溢出菜单');
  return clickDropdownItemByText(page, /Docs|User Manual|文档|使用手册/i, issues, '文档');
}

async function clickSelectOptionByText(page, triggerSelector, textPattern, issues, actionLabel) {
  try {
    await page.locator(triggerSelector).locator('.el-select__wrapper').first().click({ timeout: 5000 });
  } catch {
    try {
      await page.locator(triggerSelector).click({ timeout: 5000 });
    } catch {
      issues.push(`无法打开选择器：${actionLabel}`);
      return false;
    }
  }

  const option = page
    .locator('.el-select-dropdown__item:visible', {
      hasText: textPattern,
    })
    .first();
  try {
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click({ timeout: 5000 });
    return true;
  } catch {
    issues.push(`无法选择下拉项：${actionLabel}`);
    return false;
  }
}

async function clickFirstSelectOption(page, triggerSelector, issues, actionLabel) {
  try {
    await page.locator(triggerSelector).locator('.el-select__wrapper').first().click({ timeout: 5000 });
  } catch {
    try {
      await page.locator(triggerSelector).click({ timeout: 5000 });
    } catch {
      issues.push(`无法打开选择器：${actionLabel}`);
      return false;
    }
  }

  const option = page.locator('.el-select-dropdown__item:visible').first();
  try {
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click({ timeout: 5000 });
    return true;
  } catch {
    issues.push(`无法选择首个下拉项：${actionLabel}`);
    return false;
  }
}

async function expectKnowledgeListHasResult(page, expectedText, issues, actionLabel) {
  try {
    await page.locator('.knowledge-list-item').first().waitFor({ state: 'visible', timeout: 8000 });
  } catch {
    issues.push(`${actionLabel} 后列表没有结果`);
    return;
  }

  if (expectedText) {
    try {
      await page.locator('.knowledge-list-item', { hasText: expectedText }).first().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      issues.push(`${actionLabel} 后未出现预期结果 ${expectedText}`);
    }
  }
}

async function expectKnowledgeEmpty(page, issues, actionLabel) {
  try {
    await page.locator('.knowledge-empty').waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    issues.push(`${actionLabel} 后未出现空结果状态`);
  }
}

async function runDesktopGlobalSearchScenario(page, scenario, interactions) {
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  await recordState(page, interactions, scenario, 'initial');

  const openIssues = [];
  await clickFirstVisible(page, ['.search-trigger'], openIssues, '打开全局搜索');
  try {
    await page.locator('#global-search').waitFor({ state: 'visible', timeout: 8000 });
  } catch {
    openIssues.push('全局搜索输入框未出现');
  }
  await recordState(page, interactions, scenario, 'after-search-open', openIssues);

  const queryIssues = [];
  try {
    await page.locator('#global-search').fill('R0001');
    await page.locator('.search-result-item').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('.search-result-item').first().hover();
  } catch {
    queryIssues.push('全局搜索结果未出现或不可悬停');
  }
  await recordState(page, interactions, scenario, 'after-search-query-hover', queryIssues);

  const selectIssues = [];
  try {
    await page.locator('.search-result-item').first().click();
    await waitForVisibleDrawerText(page, /R0001|Process Automation|流程自动化/i, 10000);
  } catch {
    selectIssues.push('点击全局搜索结果后详情抽屉未出现');
  }
  if (!page.url().includes('/risk/R0001')) {
    selectIssues.push(`点击全局搜索结果后 URL 未进入风险详情路由，实际 ${page.url()}`);
  }
  await recordState(page, interactions, scenario, 'after-search-result-click', selectIssues);
}

async function runDesktopNavigationScenario(page, scenario, interactions) {
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  await recordState(page, interactions, scenario, 'initial');

  const knowledgeIssues = [];
  await clickFirstVisible(page, ['.knowledge-menu .el-dropdown-link'], knowledgeIssues, '打开知识库菜单');
  await clickDropdownItemByText(page, /Terms|术语/i, knowledgeIssues, '术语');
  await waitForUrlIncludes(page, '/term', knowledgeIssues, '点击知识库术语菜单');
  await recordState(page, interactions, scenario, 'after-knowledge-menu-click', knowledgeIssues);

  const docsIssues = [];
  await clickMoreDocsEntry(page, docsIssues);
  await waitForUrlIncludes(page, '/docs', docsIssues, '点击更多文档菜单');
  try {
    await waitForExpectedText(page, /快速上手|Getting Started|文档|Docs|使用手册|User Manual/i, 8000);
  } catch {
    docsIssues.push('进入文档页后未出现文档内容');
  }
  await recordState(page, interactions, scenario, 'after-more-docs-click', docsIssues);

  const themeIssues = [];
  await clickFirstVisible(page, ['.theme-toggle .el-dropdown-link'], themeIssues, '打开主题菜单');
  await clickDropdownItemByText(page, /Dark|深色|暗色/i, themeIssues, '深色主题');
  try {
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'), { timeout: 5000 });
  } catch {
    themeIssues.push('选择深色主题后 html.dark 未生效');
  }
  await recordState(page, interactions, scenario, 'after-theme-dark-click', themeIssues);

  const localeIssues = [];
  await clickFirstVisible(page, ['.translate .el-dropdown-link'], localeIssues, '打开语言菜单');
  await clickDropdownItemByText(page, /中文|Chinese/i, localeIssues, '中文');
  try {
    await waitForExpectedText(page, /行业术语|知识库|业务风险/i, 8000);
  } catch {
    localeIssues.push('切换中文后页面文本未更新');
  }
  await recordState(page, interactions, scenario, 'after-locale-zh-click', localeIssues);
}

async function runDesktopErrorRouteFallbacksScenario(page, scenario, interactions) {
  const notFoundIssues = [];
  await page.goto(`${page.baseUrl}/#/path-that-does-not-exist`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForUrlIncludes(page, '/#/', notFoundIssues, '未知路由回退');
  try {
    await waitForExpectedText(page, /BREAK|业务风险|Business Risk/i, 8000);
  } catch {
    notFoundIssues.push('未知路由回退后首页内容未出现');
  }
  await recordState(page, interactions, scenario, 'unknown-route-redirect-home', notFoundIssues);

  const relationIssues = [];
  await page.goto(`${page.baseUrl}/#/relations/risk-relation/risk/NOPE`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForUrlIncludes(page, '/relations/risk-relation', relationIssues, '非法关系路由回退');
  try {
    await waitForExpectedText(page, /R0001|Process Automation|流程自动化|未知类型|Unknown type/i, 8000);
  } catch {
    relationIssues.push('非法关系路由回退后未出现默认关系页或提示');
  }
  await recordState(page, interactions, scenario, 'invalid-relation-route-redirect-default', relationIssues);
}

const knowledgeSearchConfigs = [
  { label: 'risks', path: '/#/knowledges/risk/list', query: 'R0001', expected: /R0001|Process Automation|流程自动化/i },
  { label: 'avoidances', path: '/#/knowledges/avoidance/list', query: 'A0001', expected: /A0001|CAPTCHA|人机验证/i, filterSelector: '.avoidance-category-filter' },
  { label: 'attack-tools', path: '/#/knowledges/attack-tool/list', query: 'AT0001', expected: /AT0001|SIM|电话黑卡/i },
  { label: 'threat-actors', path: '/#/knowledges/threat-actor/list', query: 'TA0001', expected: /TA0001|Freebie|羊毛/i },
  { label: 'terms', path: '/#/knowledges/term/list', query: 'T0001', expected: /T0001|Account|账号/i },
  { label: 'cases', path: '/#/knowledges/case/list', query: 'C0001', expected: /C0001|Login Replay|登录/i, filterSelector: '.case-category-filter' },
];

async function runKnowledgeSearchAndFiltersScenario(page, scenario, interactions) {
  for (const config of knowledgeSearchConfigs) {
    await page.goto(page.baseUrl + config.path, { waitUntil: 'networkidle', timeout: 30000 });
    const queryIssues = [];
    try {
      await page.locator('#knowledge-search').fill(config.query);
      await expectKnowledgeListHasResult(page, config.expected, queryIssues, `${config.label} 搜索 ${config.query}`);
      await page.locator('.knowledge-list-item').first().hover();
    } catch {
      queryIssues.push(`${config.label} 搜索输入或悬停失败`);
    }
    await recordState(page, interactions, scenario, `${config.label}-search-result-hover`, queryIssues);

    const emptyIssues = [];
    try {
      await page.locator('#knowledge-search').fill(`no-result-${config.label}-zzzz`);
      await expectKnowledgeEmpty(page, emptyIssues, `${config.label} 无结果搜索`);
    } catch {
      emptyIssues.push(`${config.label} 无结果搜索输入失败`);
    }
    await recordState(page, interactions, scenario, `${config.label}-empty-search`, emptyIssues);

    if (!config.filterSelector) continue;
    const filterIssues = [];
    await page.locator('#knowledge-search').fill('');
    if (await clickFirstSelectOption(page, config.filterSelector, filterIssues, `${config.label} 分类筛选`)) {
      await expectKnowledgeListHasResult(page, null, filterIssues, `${config.label} 分类筛选`);
    }
    await recordState(page, interactions, scenario, `${config.label}-category-filter`, filterIssues);
  }
}

async function runHomeDrawerDetailRouteScenario(page, scenario, interactions) {
  const issues = [];
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  try {
    await waitForVisibleDrawerText(page, /R0001|Process Automation|流程自动化/i, 10000);
  } catch {
    issues.push('首页详情路由未打开风险抽屉');
  }
  await recordState(page, interactions, scenario, 'drawer-opened', issues);

  const closeIssues = [];
  await clickFirstVisible(page, ['.drawer-back-btn', '.el-drawer__close-btn'], closeIssues, '关闭首页详情抽屉');
  await page.waitForTimeout(500);
  await recordState(page, interactions, scenario, 'after-drawer-close', closeIssues);
}

async function runRiskDetailScenario(page, scenario, interactions) {
  const issues = [];
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  await recordState(page, interactions, scenario, 'initial');

  await clickFirstVisible(
    page,
    [
      '.knowledge-list .el-menu-item:has-text("R0002")',
      '.knowledge-list [role="menuitem"]:has-text("R0002")',
      'text=R0002',
    ],
    issues,
    '点击风险列表 R0002',
  );
  await page.waitForTimeout(500);
  if (!page.url().includes('R0002')) {
    issues.push(`点击列表后 URL 未包含 R0002，实际 ${page.url()}`);
  }
  await recordState(page, interactions, scenario, 'after-list-click', issues);
}

async function runEntityLinkScenario(page, scenario, interactions) {
  const issues = [];
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  await recordState(page, interactions, scenario, 'initial');

  await clickFirstVisible(
    page,
    [
      '.entity-reference-link[href*="/avoidance"]',
      '.entity-reference-link:has-text("A")',
      'a[href*="/avoidance"]',
    ],
    issues,
    '点击详情里的规避手段实体链接',
  );
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  if (!page.url().includes('/avoidance') || !page.url().includes('A0001')) {
    issues.push(`实体链接未跳转到规避手段详情，实际 ${page.url()}`);
  }
  await recordState(page, interactions, scenario, 'after-entity-link-click', issues);
}

async function runRelationSelectorScenario(page, scenario, interactions) {
  const issues = [];
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('.network-chart canvas').first().waitFor({ state: 'visible', timeout: 15000 });
  await recordState(page, interactions, scenario, 'initial');

  if (await clickSelectOptionByText(page, '.relation-select', /Avoidance|规避手段/i, issues, '规避手段')) {
    await waitForUrlIncludes(page, '/avoidance/', issues, '切换关系实体类型');
  }
  await page.waitForTimeout(800);
  const paintedPixels = await getPaintedCanvasPixels(page, '.network-chart canvas');
  if (paintedPixels < 1200) {
    issues.push(`切换实体类型后画布有效像素过少 ${paintedPixels}`);
  }
  await recordState(page, interactions, scenario, 'after-type-switch', issues);
}

async function runRelationNetworkScenario(page, scenario, interactions) {
  const issues = [];
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('.network-chart canvas').first().waitFor({ state: 'visible', timeout: 15000 });
  await recordState(page, interactions, scenario, 'initial');

  const canvas = page.locator('.network-chart canvas').first();
  const box = await canvas.boundingBox();
  if (!box) {
    issues.push('关系图 canvas 不可见');
    await recordState(page, interactions, scenario, 'canvas-missing', issues);
    return;
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(500);
  await recordState(page, interactions, scenario, 'after-canvas-hover');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 50, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const paintedAfterDrag = await getPaintedCanvasPixels(page, '.network-chart canvas');
  if (paintedAfterDrag < 1200) {
    issues.push(`拖动后画布有效像素过少 ${paintedAfterDrag}`);
  }
  await recordState(page, interactions, scenario, 'after-canvas-drag', issues);

  const toolbarButtons = page.locator('.graph-toolbar .el-button');
  if ((await toolbarButtons.count()) >= 9) {
    const filterIssues = [];
    await toolbarButtons.nth(6).click({ force: true });
    try {
      await page.locator('.filter-pane').first().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      filterIssues.push('点击筛选按钮后筛选面板未出现');
    }
    await recordState(page, interactions, scenario, 'after-filter-open', filterIssues);

    const drawerIssues = [];
    await toolbarButtons.nth(8).click({ force: true });
    try {
      await page.locator('.relation-drawer').waitFor({ state: 'visible', timeout: 8000 });
    } catch {
      drawerIssues.push('点击节点详情按钮后详情抽屉未出现');
    }
    await recordState(page, interactions, scenario, 'after-node-detail-drawer', drawerIssues);
  } else {
    issues.push('关系图工具栏按钮数量不足，无法检查筛选和详情抽屉');
    await recordState(page, interactions, scenario, 'toolbar-missing', issues);
  }
}

async function runRelationSankeyScenario(page, scenario, interactions) {
  const issues = [];
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  const sankeyCanvas = page.locator('.sankey-chart canvas').first();
  try {
    await sankeyCanvas.waitFor({ state: 'visible', timeout: 15000 });
  } catch {
    issues.push('Sankey 画布未出现');
  }
  await recordState(page, interactions, scenario, 'initial', issues);

  const box = await sankeyCanvas.boundingBox().catch(() => null);
  const hoverIssues = [];
  if (box) {
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.45);
    await page.waitForTimeout(500);
  } else {
    hoverIssues.push('Sankey canvas 不可悬停');
  }
  await recordState(page, interactions, scenario, 'after-sankey-hover', hoverIssues);

  const tabIssues = [];
  await clickFirstVisible(page, ['.el-tabs__item:has-text("Defense Coverage")', '.el-tabs__item:has-text("防御覆盖")'], tabIssues, '切换关系分析 tab');
  try {
    await waitForExpectedText(page, /Analysis|Coverage|分析|覆盖/i, 8000);
  } catch {
    tabIssues.push('切换分析 tab 后未出现分析内容');
  }
  await recordState(page, interactions, scenario, 'after-analysis-tab-click', tabIssues);
}

async function runRelationAnalysisFiltersScenario(page, scenario, interactions) {
  const issues = [];
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  try {
    await waitForExpectedText(page, /Analysis|Coverage|Attack Path|分析|覆盖|攻击路径/i, 10000);
  } catch {
    issues.push('关系分析页未出现预期内容');
  }
  await recordState(page, interactions, scenario, 'initial', issues);

  const filterIssues = [];
  const attackToolFilter = '.relation-analysis-filter:has(#relation-analysis-filter-attack-tool) .el-select';
  if (await clickFirstSelectOption(page, attackToolFilter, filterIssues, '关系分析攻击工具过滤')) {
    try {
      await waitForExpectedText(page, /Filtered|过滤|path|路径/i, 8000);
    } catch {
      filterIssues.push('选择攻击工具过滤后未出现过滤摘要');
    }
  }
  await recordState(page, interactions, scenario, 'after-attack-tool-filter', filterIssues);

  const resetIssues = [];
  await clickFirstVisible(page, ['.relation-analysis-filter-summary .el-button', '.node-filter-clear-button'], resetIssues, '清空关系分析过滤');
  await page.waitForTimeout(500);
  await recordState(page, interactions, scenario, 'after-filter-reset', resetIssues);
}

async function runMobileNavSearchScenario(page, scenario, interactions) {
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  await recordState(page, interactions, scenario, 'initial');

  const menuIssues = [];
  await clickFirstVisible(page, ['.mobile-hamburger'], menuIssues, '打开移动端菜单');
  try {
    await page.locator('.mobile-nav-drawer').waitFor({ state: 'visible', timeout: 6000 });
  } catch {
    menuIssues.push('移动端菜单抽屉未出现');
  }
  await recordState(page, interactions, scenario, 'after-mobile-menu-open', menuIssues);

  const navIssues = [];
  await clickFirstVisible(page, ['.mobile-nav-item:has-text("Terms")', '.mobile-nav-item:has-text("术语")'], navIssues, '移动端菜单跳转术语');
  await waitForUrlIncludes(page, '/term', navIssues, '移动端菜单跳转术语');
  await recordState(page, interactions, scenario, 'after-mobile-menu-terms-click', navIssues);

  const docsIssues = [];
  await clickFirstVisible(page, ['.mobile-hamburger'], docsIssues, '重新打开移动端菜单');
  await clickFirstVisible(page, ['.mobile-nav-item:has-text("Docs")', '.mobile-nav-item:has-text("User Manual")', '.mobile-nav-item:has-text("文档")', '.mobile-nav-item:has-text("使用手册")'], docsIssues, '移动端菜单跳转文档');
  await waitForUrlIncludes(page, '/docs', docsIssues, '移动端菜单跳转文档');
  try {
    await waitForExpectedText(page, /快速上手|Getting Started|文档|Docs|使用手册|User Manual/i, 8000);
  } catch {
    docsIssues.push('移动端进入文档页后未出现文档内容');
  }
  await recordState(page, interactions, scenario, 'after-mobile-menu-docs-click', docsIssues);

  const searchIssues = [];
  await clickFirstVisible(page, ['.mobile-search'], searchIssues, '打开移动端搜索');
  try {
    await page.locator('#global-search').waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('#global-search').fill('Account');
    await page.locator('.search-result-item').first().waitFor({ state: 'visible', timeout: 8000 });
  } catch {
    searchIssues.push('移动端搜索结果未出现');
  }
  await recordState(page, interactions, scenario, 'after-mobile-search-query', searchIssues);
}

async function runMobileSmallKnowledgeEmptyScenario(page, scenario, interactions) {
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  await recordState(page, interactions, scenario, 'initial');

  const emptyIssues = [];
  try {
    await page.locator('#knowledge-mobile-search').fill('mobile-small-no-result-zzzz');
    await expectKnowledgeEmpty(page, emptyIssues, '小屏移动端无结果搜索');
  } catch {
    emptyIssues.push('小屏移动端搜索输入失败');
  }
  await recordState(page, interactions, scenario, 'after-empty-search', emptyIssues);
}

async function runMobileCasesScenario(page, scenario, interactions) {
  const issues = [];
  await page.goto(page.baseUrl + scenario.path, { waitUntil: 'networkidle', timeout: 30000 });
  await recordState(page, interactions, scenario, 'initial');

  await clickFirstVisible(
    page,
    [
      '.knowledge-list .el-menu-item:has-text("C0002")',
      '.knowledge-list [role="menuitem"]:has-text("C0002")',
      'text=C0002',
    ],
    issues,
    '移动端点击案例列表 C0002',
  );
  await page.waitForTimeout(500);
  if (!page.url().includes('/case/detail/C0002') && !page.url().includes('#C0002')) {
    issues.push(`移动端案例点击后 URL 未切换到 C0002，实际 ${page.url()}`);
  }
  await recordState(page, interactions, scenario, 'after-case-click', issues);
}

async function runInteractionScenario(page, scenario, interactions) {
  if (scenario.label === 'desktop-global-search') {
    await runDesktopGlobalSearchScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'desktop-navigation-controls') {
    await runDesktopNavigationScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'desktop-error-route-fallbacks') {
    await runDesktopErrorRouteFallbacksScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'home-drawer-detail-route') {
    await runHomeDrawerDetailRouteScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'knowledge-search-and-filters') {
    await runKnowledgeSearchAndFiltersScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'risks-detail-click') {
    await runRiskDetailScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'entity-link-navigation') {
    await runEntityLinkScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'relation-selector-switch') {
    await runRelationSelectorScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'relation-network-interaction') {
    await runRelationNetworkScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'relation-sankey-interaction') {
    await runRelationSankeyScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'relation-analysis-filters') {
    await runRelationAnalysisFiltersScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'mobile-nav-search') {
    await runMobileNavSearchScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'mobile-small-knowledge-empty') {
    await runMobileSmallKnowledgeEmptyScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'mobile-cases-detail-click') {
    await runMobileCasesScenario(page, scenario, interactions);
  }
}

resetReportDir();

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
  const runtimeErrors = [];
  const resourceErrors = [];
  const results = [];
  const interactions = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: isMobileViewport(viewport.label) ? 2 : 1,
      isMobile: isMobileViewport(viewport.label),
    });
    const page = await context.newPage();
    page.baseUrl = baseUrl;

    page.on('pageerror', (error) => {
      runtimeErrors.push(`${viewport.label}: ${error.message}`);
    });
    page.on('console', (message) => {
      const text = message.text();
      const isZeroSizeEChartsWarning = message.type() === 'warning' && text.includes("[ECharts] Can't get DOM width or height");
      if ((message.type() === 'error' && !text.startsWith('Failed to load resource:')) || isZeroSizeEChartsWarning) {
        runtimeErrors.push(`${viewport.label}: ${text}`);
      }
    });
    page.on('requestfailed', (request) => {
      if (!isSameOrigin(request.url(), baseUrl)) return;
      resourceErrors.push(`${viewport.label}: ${formatRequest(request)} failed: ${request.failure()?.errorText ?? 'unknown'}`);
    });
    page.on('response', (response) => {
      const status = response.status();
      if (status < 400 || !isSameOrigin(response.url(), baseUrl)) return;
      resourceErrors.push(`${viewport.label}: ${response.request().method()} ${response.url()} returned HTTP ${status}`);
    });

    for (const route of routes) {
      const issues = [];
      const warnings = [];
      const response = await page.goto(`${baseUrl}${route.path}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      if (response && !response.ok()) {
        issues.push(`HTTP ${response.status()}`);
      }

      await page.locator('body').waitFor({ state: 'visible', timeout: 10000 });
      try {
        await waitForExpectedText(page, route.text);
      } catch {
        issues.push('未渲染预期页面文本');
      }

      const layout = await collectLayoutMetrics(page);
      if (layout.scrollWidth > layout.viewportWidth + 2) {
        warnings.push(`横向溢出 ${layout.scrollWidth}px > ${layout.viewportWidth}px`);
      }
      for (const item of layout.overflowElements) {
        warnings.push(`溢出元素 ${item.tag}.${item.className || 'no-class'} "${item.text}"`);
      }

      if (route.canvasSelector) {
        await page.locator(route.canvasSelector).first().waitFor({ state: 'visible', timeout: 15000 });
        const paintedPixels = await getPaintedCanvasPixels(page, route.canvasSelector);
        if (paintedPixels < 1200) {
          issues.push(`画布有效像素过少 ${paintedPixels}`);
        }
      }

      const screenshot = `${viewport.label}-${route.label}.png`;
      await page.screenshot({
        path: path.join(screenshotDir, screenshot),
        fullPage: true,
      });

      results.push({
        viewport: viewport.label,
        width: viewport.width,
        height: viewport.height,
        label: route.label,
        path: route.path,
        screenshot,
        layout,
        issues,
        warnings,
      });
    }

    await page.close();
    await context.close();
  }

  for (const scenario of interactionRoutes) {
    const viewport = viewports.find((item) => item.label === scenario.viewport);
    if (!viewport) continue;
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: isMobileViewport(viewport.label) ? 2 : 1,
      isMobile: isMobileViewport(viewport.label),
    });
    const page = await context.newPage();
    page.baseUrl = baseUrl;

    page.on('pageerror', (error) => {
      runtimeErrors.push(`${scenario.label}: ${error.message}`);
    });
    page.on('console', (message) => {
      const text = message.text();
      const isZeroSizeEChartsWarning = message.type() === 'warning' && text.includes("[ECharts] Can't get DOM width or height");
      if ((message.type() === 'error' && !text.startsWith('Failed to load resource:')) || isZeroSizeEChartsWarning) {
        runtimeErrors.push(`${scenario.label}: ${text}`);
      }
    });
    page.on('requestfailed', (request) => {
      if (!isSameOrigin(request.url(), baseUrl)) return;
      resourceErrors.push(`${scenario.label}: ${formatRequest(request)} failed: ${request.failure()?.errorText ?? 'unknown'}`);
    });
    page.on('response', (response) => {
      const status = response.status();
      if (status < 400 || !isSameOrigin(response.url(), baseUrl)) return;
      resourceErrors.push(`${scenario.label}: ${response.request().method()} ${response.url()} returned HTTP ${status}`);
    });

    try {
      await runInteractionScenario(page, scenario, interactions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await recordState(page, interactions, scenario, 'interaction-error', [`交互脚本异常：${message}`]);
    }
    await page.close();
    await context.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    results,
    interactions,
    runtimeErrors,
    resourceErrors,
  };

  for (const result of results) splitKnownWarnings(result);
  for (const result of interactions) splitKnownWarnings(result);

  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, renderMarkdown(report));

  const issueCount = results.reduce((sum, item) => sum + item.issues.length, 0);
  const interactionIssueCount = interactions.reduce((sum, item) => sum + item.issues.length, 0);
  if (runtimeErrors.length > 0 || resourceErrors.length > 0 || issueCount > 0 || interactionIssueCount > 0) {
    throw new Error(
      [
        `visual review found ${issueCount} route issues and ${interactionIssueCount} interaction issues`,
        ...runtimeErrors.map((item) => `runtime: ${item}`),
        ...resourceErrors.map((item) => `resource: ${item}`),
        `report=${reportMdPath}`,
      ].join('\n'),
    );
  }

  console.log('\n✅ 浏览器视觉巡检通过');
  console.log(`screenshots=${results.length + interactions.length}`);
  console.log(`report=${reportMdPath}`);
} catch (error) {
  console.error('\n❌ 浏览器视觉巡检失败\n');
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
