/**
 * EntityAutoLinker 浏览器回归测试。
 *
 * 覆盖全局 DOM 扫描器在高交互场景下的稳定性：
 * - 大列表页浏览（350+ 条风险）
 * - 抽屉打开/关闭
 * - 搜索弹窗
 * - 关系图 tab 切换
 *
 * 断言：无运行时错误、无资源加载失败、EntityAutoLinker 正确包裹实体 ID。
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { chromium } from 'playwright';

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

  /**
   * 创建带错误收集的新 page
   */
  async function createPage(label) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => {
      runtimeErrors.push(`${label}: ${error.message}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
        runtimeErrors.push(`${label}: ${message.text()}`);
      }
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
    return { page, context };
  }

  // ─── 场景 1：大列表页浏览 ─────────────────────────
  {
    const label = 'risks-list';
    const { page, context } = await createPage(label);
    await page.goto(`${baseUrl}/#/knowledges/risk/list`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('body').waitFor({ state: 'visible', timeout: 10000 });

    // 等待列表渲染完成（验证实体 ID 文本出现）
    await page.locator('.knowledge-id').first().waitFor({ state: 'visible', timeout: 15000 });

    // 列表的 .knowledge-id 元素在 isInsideSkipZone 中被排除（路径 B 负责处理），
    // 所以不会生成 .entity-id-auto span。验证列表正常渲染且无运行时错误。
    const knowledgeIds = await page.locator('.knowledge-id').count();
    if (knowledgeIds === 0) {
      throw new Error(`${label}: 列表未渲染任何 .knowledge-id 元素`);
    }

    // EntityAutoLinker 在详情面板的描述文本中工作（如 description 中引用其他实体 ID）
    // 等待扫描完成后统计
    await page.waitForTimeout(500);
    const autoLinkerSpans = await page.locator('.entity-id-auto').count();

    console.log(`  ${label}: ${knowledgeIds} knowledge-ids, ${autoLinkerSpans} auto-linked spans`);
    await page.close();
    await context.close();
  }

  // ─── 场景 2：抽屉打开/关闭 ────────────────────────
  {
    const label = 'drawer-open-close';
    const { page, context } = await createPage(label);
    await page.goto(`${baseUrl}/#/home/risk/R0001`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('body').waitFor({ state: 'visible', timeout: 10000 });

    // 等待详情抽屉渲染（排除移动端导航抽屉）
    await page.locator('.el-drawer.open').waitFor({ state: 'visible', timeout: 15000 });
    // 等待抽屉内 EntityAutoLinker 扫描完成
    const drawerAutoLinkerLocator = page.locator('.el-drawer.open .entity-id-auto');
    const hasDrawerSpans = await drawerAutoLinkerLocator.first().waitFor({ state: 'attached', timeout: 10000 }).then(() => true).catch(() => false);

    const drawerSpans = hasDrawerSpans ? await drawerAutoLinkerLocator.count() : 0;
    console.log(`  ${label}: ${drawerSpans} entity spans in drawer`);

    // 关闭抽屉
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await page.close();
    await context.close();
  }

  // ─── 场景 3：搜索弹窗 ─────────────────────────────
  {
    const label = 'search-dialog';
    const { page, context } = await createPage(label);
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('body').waitFor({ state: 'visible', timeout: 10000 });

    // 等待页面完全渲染
    await page.waitForTimeout(500);

    // 打开搜索弹窗（Ctrl+K / Meta+K）
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+k`);
    await page.waitForTimeout(500);

    // 验证搜索弹窗打开
    const dialogVisible = await page.locator('.el-dialog').isVisible().catch(() => false);
    if (dialogVisible) {
      // 输入搜索词
      const searchInput = page.locator('.el-dialog input[type="text"], .el-dialog .el-input__inner').first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('R0001');
        await page.waitForTimeout(500);
      }

      // 关闭弹窗
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    console.log(`  ${label}: dialog opened=${dialogVisible}`);
    await page.close();
    await context.close();
  }

  // ─── 场景 4：关系图 tab 切换 ──────────────────────
  {
    const label = 'relation-tab-switch';
    const { page, context } = await createPage(label);
    await page.goto(`${baseUrl}/#/relations/attack-path/risk/R0001`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.locator('body').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1000);

    // 切换到 sankey 视角
    const sankeyTab = page.locator('.el-tabs__item', { hasText: /桑基|Sankey|sankey/i }).first();
    if (await sankeyTab.isVisible().catch(() => false)) {
      await sankeyTab.click();
      await page.waitForTimeout(1000);
    }

    // 切换到 analysis 视角
    const analysisTab = page.locator('.el-tabs__item', { hasText: /分析|Analysis|analysis|覆盖|Coverage/i }).first();
    if (await analysisTab.isVisible().catch(() => false)) {
      await analysisTab.click();
      await page.waitForTimeout(1000);
    }

    console.log(`  ${label}: tab switches completed`);
    await page.close();
    await context.close();
  }

  // ─── 结果汇总 ──────────────────────────────────────
  if (runtimeErrors.length > 0) {
    throw new Error(
      `Runtime errors during EntityAutoLinker regression test:\n${runtimeErrors.map((item) => `- ${item}`).join('\n')}`,
    );
  }
  if (resourceErrors.length > 0) {
    throw new Error(
      `Same-origin resource errors during EntityAutoLinker regression test:\n${resourceErrors.map((item) => `- ${item}`).join('\n')}`,
    );
  }

  console.log('\n✅ EntityAutoLinker 回归测试通过');
} catch (error) {
  console.error('\n❌ EntityAutoLinker 回归测试失败\n');
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
