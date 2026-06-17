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

const routes = [
  { path: '/', text: /BREAK|业务风险|Business Risk/i },
  { path: '/#/risks', text: /R0001|流程自动化|Process/i },
  { path: '/#/avoidances', text: /A0001|人机验证|CAPTCHA/i },
  { path: '/#/attack-tools', text: /AT0001|电话黑卡|SIM/i },
  { path: '/#/threat-actors', text: /TA0001|羊毛党|Threat/i },
  { path: '/#/terms', text: /T0001|账号|Account/i },
  { path: '/#/relation/risk/R0001?view=sankey', text: /R0001|攻击路径|Attack Path|关系网络|Network/i },
];

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
  {
    stdio: ['ignore', 'pipe', 'pipe'],
  }
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
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const runtimeErrors = [];
  const resourceErrors = [];
  page.on('pageerror', (error) => {
    runtimeErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      if (message.text().startsWith('Failed to load resource:')) {
        return;
      }
      runtimeErrors.push(message.text());
    }
  });
  page.on('requestfailed', (request) => {
    if (!isSameOrigin(request.url(), baseUrl)) {
      return;
    }
    resourceErrors.push(`${formatRequest(request)} failed: ${request.failure()?.errorText ?? 'unknown'}`);
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status < 400 || !isSameOrigin(response.url(), baseUrl)) {
      return;
    }
    resourceErrors.push(`${response.request().method()} ${response.url()} returned HTTP ${status}`);
  });

  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route.path}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    if (response && !response.ok()) {
      throw new Error(`${route.path} returned HTTP ${response?.status() ?? 'unknown'}`);
    }
    await page.locator('body').waitFor({ state: 'visible', timeout: 10000 });
    const bodyText = await page.locator('body').innerText({ timeout: 10000 });
    if (!route.text.test(bodyText)) {
      throw new Error(`${route.path} did not render expected smoke text`);
    }
  }

  if (runtimeErrors.length > 0) {
    throw new Error(`Runtime errors during smoke test:\n${runtimeErrors.map((item) => `- ${item}`).join('\n')}`);
  }
  if (resourceErrors.length > 0) {
    throw new Error(`Same-origin resource errors during smoke test:\n${resourceErrors.map((item) => `- ${item}`).join('\n')}`);
  }

  console.log('\n✅ 站点 smoke 测试通过');
  console.log(`routes=${routes.length}`);
} catch (error) {
  console.error('\n❌ 站点 smoke 测试失败\n');
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
