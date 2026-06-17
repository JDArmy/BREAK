import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { chromium } from 'playwright';

const host = '127.0.0.1';

const budgets = {
  routeLoadMs: 8000,
  totalTransferBytes: 2800 * 1024,
  scriptTransferBytes: 2200 * 1024,
  resourceCount: 90,
};

const routes = [
  { path: '/', label: 'home', text: /BREAK|业务风险|Business Risk/i },
  { path: '/#/risks', label: 'risks', text: /R0001|流程自动化|Process/i },
  {
    path: '/#/relation/risk/R0001?view=sankey',
    label: 'relation-sankey',
    text: /R0001|攻击路径|Attack Path|关系网络|Network/i,
  },
];

function formatKb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

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

function collectResourceMetrics(entries) {
  const resources = entries.filter((entry) => entry.entryType === 'resource');
  const scripts = resources.filter((entry) => entry.initiatorType === 'script');
  const transferBytes = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
  const scriptTransferBytes = scripts.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);

  return {
    resourceCount: resources.length,
    transferBytes,
    transferKb: formatKb(transferBytes),
    scriptTransferBytes,
    scriptTransferKb: formatKb(scriptTransferBytes),
  };
}

function collectBudgetIssues(result) {
  const issues = [];
  if (result.loadMs > budgets.routeLoadMs) {
    issues.push(`${result.label} load ${result.loadMs}ms > ${budgets.routeLoadMs}ms`);
  }
  if (result.transferBytes > budgets.totalTransferBytes) {
    issues.push(
      `${result.label} transfer ${result.transferKb}kB > ${formatKb(budgets.totalTransferBytes)}kB`,
    );
  }
  if (result.scriptTransferBytes > budgets.scriptTransferBytes) {
    issues.push(
      `${result.label} scripts ${result.scriptTransferKb}kB > ${formatKb(budgets.scriptTransferBytes)}kB`,
    );
  }
  if (result.resourceCount > budgets.resourceCount) {
    issues.push(`${result.label} resources ${result.resourceCount} > ${budgets.resourceCount}`);
  }
  return issues;
}

const port = await findFreePort();
const baseUrl = `http://${host}:${port}`;
const preview = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'preview', '--', '--host', host, '--port', String(port), '--strictPort'],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
  },
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
  const results = [];
  const runtimeErrors = [];

  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => {
      runtimeErrors.push(`${route.label}: ${error.message}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        runtimeErrors.push(`${route.label}: ${message.text()}`);
      }
    });

    const startedAt = Date.now();
    const response = await page.goto(`${baseUrl}${route.path}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    const loadMs = Date.now() - startedAt;

    if (response && !response.ok()) {
      throw new Error(`${route.path} returned HTTP ${response.status()}`);
    }

    await page.locator('body').waitFor({ state: 'visible', timeout: 10000 });
    const bodyText = await page.locator('body').innerText({ timeout: 10000 });
    if (!route.text.test(bodyText)) {
      throw new Error(`${route.path} did not render expected performance test text`);
    }

    const performanceEntries = await page.evaluate(() => performance.getEntries().map((entry) => entry.toJSON()));
    results.push({
      path: route.path,
      label: route.label,
      loadMs,
      ...collectResourceMetrics(performanceEntries),
    });

    await page.close();
    await context.close();
  }

  const budgetIssues = results.flatMap(collectBudgetIssues);
  if (runtimeErrors.length > 0) {
    throw new Error(`Runtime errors during performance test:\n${runtimeErrors.map((item) => `- ${item}`).join('\n')}`);
  }
  if (budgetIssues.length > 0) {
    throw new Error(`Performance budgets exceeded:\n${budgetIssues.map((item) => `- ${item}`).join('\n')}`);
  }

  console.log('\n✅ 静态站性能预算通过');
  console.log(`budgets: load<=${budgets.routeLoadMs}ms, transfer<=${formatKb(budgets.totalTransferBytes)}kB, scripts<=${formatKb(budgets.scriptTransferBytes)}kB, resources<=${budgets.resourceCount}`);
  for (const result of results) {
    console.log(
      `${result.label}: load=${result.loadMs}ms, transfer=${result.transferKb}kB, scripts=${result.scriptTransferKb}kB, resources=${result.resourceCount}`,
    );
  }
} catch (error) {
  console.error('\n❌ 静态站性能预算失败\n');
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
