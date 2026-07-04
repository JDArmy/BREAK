/**
 * 关系图视角覆盖测试：pathExplorer + analysis（defense-coverage）。
 *
 * 补强 v2.40.7/v2.40.8 重构后的浏览器覆盖缺口：
 * - pathExplorer 视角此前零浏览器覆盖（control-stability/smoke/autolinker/visual-review 均未触及）。
 * - analysis 视角仅有视觉截图，无 rightAction/preserveScrollPane 交互回归。
 *
 * 用例：
 * 1. pathExplorer 控制面板元素可展示正确性
 * 2. pathExplorer 起点同步回归（切视角保 startKey，v2.40.7）
 * 3. analysis 三列元素可展示正确性
 * 4. analysis rightAction 滚动保持回归（preserveScrollPane，v2.40.7）
 *
 * 断言：关键元素可见 + 交互后状态正确 + 无运行时错误/同源资源错误。
 * 与 relation-stability.mjs 同模式：shouldRunOnMinorBump 守卫 + BREAK_FORCE_PERSPECTIVE_COVERAGE 强制。
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { chromium } from 'playwright';
import { shouldRunOnMinorBump } from '../search/common.mjs';

const host = '127.0.0.1';

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
        // 重试直到超时
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

// 等 pathExplorer 结果区渲染（stats 或 empty 二选一，桑基异步）
// 3 个 empty div 用 v-show 切换，需 filter visible + first 限定
async function waitForPathExplorerResult(page) {
  await Promise.race([
    page.locator('.path-explorer-stats').waitFor({ state: 'visible', timeout: 10000 }),
    page
      .locator('.path-explorer-empty')
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'visible', timeout: 10000 }),
  ]);
}

// 点 el-tabs__item 切视角（按文案匹配）
async function switchPerspectiveByTab(page, text) {
  const tab = page.locator('.relation-tabs .el-tabs__item', { hasText: text });
  await tab.click();
  await page.waitForTimeout(400);
}

// 用例 1：pathExplorer 控制面板元素可展示正确性
async function testCasePathExplorerControls(page) {
  await page.goto(`${page.baseUrl}/#/relations/path-explorer`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.locator('.path-explorer-pane').waitFor({ state: 'visible', timeout: 15000 });

  // 控制面板可见
  await page.locator('.path-explorer-controls').waitFor({ state: 'visible', timeout: 10000 });

  // 2 个类型下拉（起点类型 + 终点类型）
  const typeSelects = page.locator('.path-explorer-controls .type-select');
  if ((await typeSelects.count()) !== 2) {
    throw new Error(`pathExplorer type-select 数量期望 2，实际 ${await typeSelects.count()}`);
  }

  // 2 个实体下拉（起点实体 + 终点实体）
  const entitySelects = page.locator('.path-explorer-controls .entity-select');
  if ((await entitySelects.count()) !== 2) {
    throw new Error(`pathExplorer entity-select 数量期望 2，实际 ${await entitySelects.count()}`);
  }

  // 2 个滑块（maxHops + maxPaths）
  const sliders = page.locator('.path-explorer-controls .param-slider');
  if ((await sliders.count()) !== 2) {
    throw new Error(`pathExplorer param-slider 数量期望 2，实际 ${await sliders.count()}`);
  }

  // 结果区初始态：结果容器可见（empty/stats/chart 任一渲染即可，含 searching 态）
  await page.locator('.path-explorer-result').waitFor({ state: 'visible', timeout: 10000 });

  console.log('  ✅ 用例 1: pathExplorer 控制面板元素展示正确');
}

// 用例 2：pathExplorer 起点同步回归（v2.40.7 核心修复）
async function testCasePathExplorerStartSync(page) {
  // 从 attack-path 视角带 entity 进入（根节点 R0001）
  await page.goto(`${page.baseUrl}/#/relations/attack-path/risk/R0001`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.locator('.relation-page').waitFor({ state: 'visible', timeout: 15000 });

  // 切到 pathExplorer
  await switchPerspectiveByTab(page, /Path Explorer|路径探索/);
  await page.locator('.path-explorer-pane').waitFor({ state: 'visible', timeout: 15000 });

  // 起点实体 select 应显示 R0001（startKey 同步，v2.40.7 修复点）
  const startEntitySelect = page.locator('.path-explorer-controls .entity-select').first();
  await startEntitySelect.waitFor({ state: 'visible', timeout: 10000 });
  const startEntityText = await startEntitySelect.textContent({ timeout: 10000 });
  if (!startEntityText.includes('R0001')) {
    throw new Error(
      `pathExplorer 起点实体未同步 R0001（v2.40.7 修复点），实际：${startEntityText}`,
    );
  }

  // 切到 risk-relation 视角再切回 pathExplorer，startKey 应保留
  // tab 文案：["Risk","Attack Path","Defense Coverage","Path Explorer"]（en）/ 中文 locale 对应中文
  await switchPerspectiveByTab(page, /^Risk$|^风险$/);
  await page.locator('.network-graph-pane, .relation-analysis-pane, .relation-page').first().waitFor({
    state: 'visible',
    timeout: 15000,
  });
  await switchPerspectiveByTab(page, /Path Explorer|路径探索/);
  await page.locator('.path-explorer-pane').waitFor({ state: 'visible', timeout: 15000 });

  const startEntityTextAfter = await page
    .locator('.path-explorer-controls .entity-select')
    .first()
    .textContent({ timeout: 10000 });
  if (!startEntityTextAfter.includes('R0001')) {
    throw new Error(
      `pathExplorer 切视角再切回后起点实体丢失 R0001（v2.40.7 修复点），实际：${startEntityTextAfter}`,
    );
  }

  console.log('  ✅ 用例 2: pathExplorer 起点同步回归通过（startKey 切视角保留）');
}

// 用例 3：analysis 三列元素可展示正确性
async function testCaseAnalysisColumns(page) {
  await page.goto(`${page.baseUrl}/#/relations/defense-coverage/risk/R0001`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.locator('.relation-analysis-pane').waitFor({ state: 'visible', timeout: 15000 });

  // 三列可见
  for (const sel of [
    '#relation-analysis-coverage-column',
    '#relation-analysis-path-column',
    '#relation-analysis-detail-column',
  ]) {
    await page.locator(sel).waitFor({ state: 'visible', timeout: 10000 });
  }

  // 筛选下拉渲染
  const filters = page.locator('.relation-analysis-filter');
  const filterCount = await filters.count();
  if (filterCount === 0) {
    throw new Error('analysis 筛选项 .relation-analysis-filter 未渲染');
  }

  // 覆盖项 > 0（R0001 有覆盖项）
  const coverageItems = page.locator('.relation-analysis-coverage-item');
  const coverageCount = await coverageItems.count();
  if (coverageCount === 0) {
    throw new Error('analysis 覆盖项 .relation-analysis-coverage-item 为空（R0001 应有覆盖）');
  }

  // 路径项 > 0（R0001 有攻击路径）
  const pathItems = page.locator('.relation-analysis-path-list-item');
  const pathCount = await pathItems.count();
  if (pathCount === 0) {
    throw new Error('analysis 路径项 .relation-analysis-path-list-item 为空（R0001 应有攻击路径）');
  }

  console.log(
    `  ✅ 用例 3: analysis 三列展示正确（filters=${filterCount} coverage=${coverageCount} paths=${pathCount}）`,
  );

  return { coverageCount, pathCount };
}

// 用例 4：analysis rightAction 滚动保持回归（v2.40.7 核心修复）
// rightAction 包装右列 DetailColumn emit 的操作（focus-node/reset/update:attack-path-filters），
// 这些操作改 vm 状态触发 watch resetColumnScroll，右列因 preserveScrollPane='right' 跳过 scrollTop=0。
// 左列操作（coverage-item → applyLeftAvoidanceFilter）preserveScroll='left'，右列会重置——作对照。
async function testCaseAnalysisScrollPreserve(page) {
  // 复用用例 3 已导航的页面（analysis 视角已渲染）
  const detailColumn = page.locator('#relation-analysis-detail-column');

  // 直接设 scrollTop=200（确定性，非 mouse.wheel）
  await detailColumn.evaluate((el) => {
    el.scrollTop = 200;
  });
  await page.waitForTimeout(150);
  const scrollTopBefore = await detailColumn.evaluate((el) => el.scrollTop);
  if (scrollTopBefore < 100) {
    throw new Error(
      `analysis 右列 scrollTop 设置失败（期望 ~200，实际 ${scrollTopBefore}），可能内容不足以滚动`,
    );
  }

  // 点右列关联实体项 → RelationNodeRelatedEntityBlock emit focus-node
  // → DetailColumn 透传 → rightAction(focusNodeInDrawer) → preserveScrollPane='right'
  // → watch resetColumnScroll 跳过右列 scrollTop=0
  // 注意：focusNodeInDrawer 会打开 node detail drawer（遮罩拦截后续点击），
  // 但 scrollTop 是 DOM 属性，evaluate 读取不受遮罩影响。
  const relatedEntity = page.locator('#relation-analysis-detail-column .node-related-entity-main').first();
  await relatedEntity.waitFor({ state: 'visible', timeout: 10000 });
  await relatedEntity.click();
  // 等 nextTick + resetColumnScroll 完成（抽屉动画 + watch 触发）
  await page.waitForTimeout(500);
  const scrollTopAfterRightAction = await detailColumn.evaluate((el) => el.scrollTop);

  if (Math.abs(scrollTopAfterRightAction - scrollTopBefore) > 10) {
    throw new Error(
      `analysis rightAction(focus-node) 后右列 scrollTop 未保持（v2.40.7 修复点）：before=${scrollTopBefore} after=${scrollTopAfterRightAction}`,
    );
  }

  console.log(
    `  ✅ 用例 4a: analysis rightAction(focus-node) 滚动保持通过（before=${scrollTopBefore} after=${scrollTopAfterRightAction}）`,
  );

  // 关闭 focus-node 打开的抽屉，避免遮罩影响对照操作
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 对照：点左列 coverage-item → applyLeftAvoidanceFilter → preserveScrollPane='left'
  // → 右列不在保持范围 → scrollTop 归零（反向佐证 preserveScrollPane 逻辑正确）
  // 重新设右列 scrollTop
  await detailColumn.evaluate((el) => {
    el.scrollTop = 200;
  });
  await page.waitForTimeout(150);

  const coverageItem = page.locator('.relation-analysis-coverage-item').first();
  await coverageItem.click();
  await page.waitForTimeout(300);
  const scrollTopAfterLeftAction = await detailColumn.evaluate((el) => el.scrollTop);

  if (scrollTopAfterLeftAction > 50) {
    throw new Error(
      `analysis 左列 coverage-item 操作后右列 scrollTop 应归零（对照验证），实际 after=${scrollTopAfterLeftAction}`,
    );
  }

  console.log(
    `  ✅ 用例 4b: analysis 左列操作右列滚动归零（对照验证 preserveScrollPane 逻辑）after=${scrollTopAfterLeftAction}`,
  );
}

const bump = shouldRunOnMinorBump();
const forceRun = process.env.BREAK_FORCE_PERSPECTIVE_COVERAGE === '1';
if (!bump.shouldRun && !forceRun) {
  console.log(`⏭️  跳过关系图视角覆盖测试：${bump.reason}`);
  process.exit(0);
}
if (forceRun && !bump.shouldRun) {
  console.log(`强制运行关系图视角覆盖测试：${bump.reason}`);
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
  const runtimeErrors = [];
  const resourceErrors = [];

  const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
  const page = await context.newPage();
  page.baseUrl = baseUrl;
  page.on('pageerror', (error) => {
    runtimeErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      runtimeErrors.push(message.text());
    }
  });
  page.on('requestfailed', (request) => {
    if (!isSameOrigin(request.url(), baseUrl)) return;
    resourceErrors.push(
      `${formatRequest(request)} failed: ${request.failure()?.errorText ?? 'unknown'}`,
    );
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status < 400 || !isSameOrigin(response.url(), baseUrl)) return;
    resourceErrors.push(
      `${response.request().method()} ${response.url()} returned HTTP ${status}`,
    );
  });

  console.log('\n关系图视角覆盖测试开始（pathExplorer + analysis）\n');

  await testCasePathExplorerControls(page);
  await testCasePathExplorerStartSync(page);
  await testCaseAnalysisColumns(page);
  await testCaseAnalysisScrollPreserve(page);

  await page.close();
  await context.close();

  if (runtimeErrors.length > 0) {
    throw new Error(
      `运行时错误:\n${runtimeErrors.map((item) => `- ${item}`).join('\n')}`,
    );
  }
  if (resourceErrors.length > 0) {
    throw new Error(
      `同源资源错误:\n${resourceErrors.map((item) => `- ${item}`).join('\n')}`,
    );
  }

  console.log('\n✅ 关系图视角覆盖测试通过');
  console.log('用例=4（pathExplorer 控制/起点同步 + analysis 三列/滚动保持）');
} catch (error) {
  console.error('\n❌ 关系图视角覆盖测试失败\n');
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
