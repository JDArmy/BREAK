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
];

const routes = [
  { label: 'home', path: '/', text: /BREAK|业务风险|Business Risk/i },
  { label: 'risks', path: '/#/risks', text: /R0001|流程自动化|Process/i },
  { label: 'avoidances', path: '/#/avoidances', text: /A0001|人机验证|CAPTCHA/i },
  { label: 'attack-tools', path: '/#/attack-tools', text: /AT0001|电话黑卡|SIM/i },
  { label: 'threat-actors', path: '/#/threat-actors', text: /Threat Actors|TA0001|Freebie Hunters/i },
  { label: 'terms', path: '/#/terms', text: /T0001|账号|Account/i },
  { label: 'cases', path: '/#/cases', text: /Cases|C0001|Login Replay/i },
  {
    label: 'relation-sankey',
    path: '/#/relation/risk/R0001?view=sankey',
    text: /R0001|攻击路径|Attack Path|关系网络|Network/i,
  },
  {
    label: 'relation-network',
    path: '/#/relation/risk/R0001?view=network',
    text: /R0001|攻击路径|Attack Path|关系网络|Network/i,
    canvasSelector: '.network-chart canvas',
  },
];

const interactionRoutes = [
  { label: 'risks-detail-click', path: '/#/risks', viewport: 'desktop' },
  { label: 'entity-link-navigation', path: '/#/risks#R0001', viewport: 'desktop' },
  { label: 'relation-network-interaction', path: '/#/relation/risk/R0001?view=network', viewport: 'desktop' },
  { label: 'mobile-cases-detail-click', path: '/#/cases', viewport: 'mobile' },
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
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    try {
      await locator.waitFor({ state: 'visible', timeout: 2500 });
      await locator.click({ timeout: 5000 });
      return true;
    } catch {
      // Try next selector.
    }
  }
  issues.push(`无法执行交互：${actionLabel}`);
  return false;
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
  if (!page.url().includes('#R0002')) {
    issues.push(`点击列表后 URL 未切换到 #R0002，实际 ${page.url()}`);
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
      '.entity-reference-link[href*="/avoidances"]',
      '.entity-reference-link:has-text("A")',
      'a[href*="/avoidances"]',
    ],
    issues,
    '点击详情里的规避手段实体链接',
  );
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  if (!page.url().includes('/avoidances') || !page.url().includes('A0001')) {
    issues.push(`实体链接未跳转到规避手段详情，实际 ${page.url()}`);
  }
  await recordState(page, interactions, scenario, 'after-entity-link-click', issues);
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
  if (!page.url().includes('/cases/detail/C0002') && !page.url().includes('#C0002')) {
    issues.push(`移动端案例点击后 URL 未切换到 C0002，实际 ${page.url()}`);
  }
  await recordState(page, interactions, scenario, 'after-case-click', issues);
}

async function runInteractionScenario(page, scenario, interactions) {
  if (scenario.label === 'risks-detail-click') {
    await runRiskDetailScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'entity-link-navigation') {
    await runEntityLinkScenario(page, scenario, interactions);
    return;
  }
  if (scenario.label === 'relation-network-interaction') {
    await runRelationNetworkScenario(page, scenario, interactions);
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
      deviceScaleFactor: viewport.label === 'mobile' ? 2 : 1,
      isMobile: viewport.label === 'mobile',
    });
    const page = await context.newPage();
    page.baseUrl = baseUrl;

    page.on('pageerror', (error) => {
      runtimeErrors.push(`${viewport.label}: ${error.message}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
        runtimeErrors.push(`${viewport.label}: ${message.text()}`);
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
      deviceScaleFactor: viewport.label === 'mobile' ? 2 : 1,
      isMobile: viewport.label === 'mobile',
    });
    const page = await context.newPage();
    page.baseUrl = baseUrl;

    page.on('pageerror', (error) => {
      runtimeErrors.push(`${scenario.label}: ${error.message}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
        runtimeErrors.push(`${scenario.label}: ${message.text()}`);
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
