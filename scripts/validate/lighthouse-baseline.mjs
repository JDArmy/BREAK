import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';

const host = '127.0.0.1';

const routes = [
  { path: '/', label: 'home' },
  { path: '/#/risks', label: 'risks' },
  { path: '/#/relation/risk/R0001?view=sankey', label: 'relation-sankey' },
];

const profiles = [
  {
    label: 'desktop',
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1366, height: 900, deviceScaleFactor: 1, disabled: false },
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
    budgets: {
      performance: 0.7,
      accessibility: 0.7,
      bestPractices: 0.9,
      seo: 0.85,
      lcpMs: 4200,
      cls: 0.1,
    },
  },
  {
    label: 'mobile',
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
    budgets: {
      performance: 0.4,
      accessibility: 0.7,
      bestPractices: 0.9,
      seo: 0.85,
      lcpMs: 12000,
      cls: 0.1,
    },
  },
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

async function waitForChrome(port, timeoutMs = 15000) {
  const endpoint = `http://${host}:${port}/json/version`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return;
    } catch {
      // Retry until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Chromium remote debugging endpoint did not become ready: ${endpoint}`);
}

async function launchChrome() {
  const port = await findFreePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'break-lighthouse-'));
  const chrome = spawn(chromium.executablePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--no-sandbox',
    'about:blank',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  chrome.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  chrome.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForChrome(port);
  } catch (error) {
    chrome.kill('SIGTERM');
    fs.rmSync(userDataDir, { recursive: true, force: true });
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n${output.trim()}`);
  }

  return {
    port,
    close: () => {
      chrome.kill('SIGTERM');
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    },
  };
}

function formatScore(score) {
  return Number((score * 100).toFixed(0));
}

function getMetric(lhr, auditId) {
  return Number(lhr.audits[auditId]?.numericValue ?? 0);
}

function collectIssues(result) {
  const { budgets, lhr } = result;
  const scores = result.scores;
  const issues = [];

  if (scores.performance < budgets.performance) {
    issues.push(`performance ${formatScore(scores.performance)} < ${formatScore(budgets.performance)}`);
  }
  if (scores.accessibility < budgets.accessibility) {
    issues.push(`accessibility ${formatScore(scores.accessibility)} < ${formatScore(budgets.accessibility)}`);
  }
  if (scores.bestPractices < budgets.bestPractices) {
    issues.push(`best-practices ${formatScore(scores.bestPractices)} < ${formatScore(budgets.bestPractices)}`);
  }
  if (scores.seo < budgets.seo) {
    issues.push(`seo ${formatScore(scores.seo)} < ${formatScore(budgets.seo)}`);
  }
  if (result.lcpMs > budgets.lcpMs) {
    issues.push(`LCP ${Math.round(result.lcpMs)}ms > ${budgets.lcpMs}ms`);
  }
  if (result.cls > budgets.cls) {
    issues.push(`CLS ${result.cls.toFixed(3)} > ${budgets.cls}`);
  }
  if (lhr.runtimeError) {
    issues.push(`runtime error: ${lhr.runtimeError.message}`);
  }

  return issues;
}

function formatResult(result) {
  return `${result.profile}/${result.label}: perf=${formatScore(result.scores.performance)}, a11y=${formatScore(result.scores.accessibility)}, best=${formatScore(result.scores.bestPractices)}, seo=${formatScore(result.scores.seo)}, LCP=${Math.round(result.lcpMs)}ms, TBT=${Math.round(result.tbtMs)}ms, CLS=${result.cls.toFixed(3)}`;
}

async function runLighthouse(url, profile, port) {
  const options = {
    port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: profile.formFactor,
    screenEmulation: profile.screenEmulation,
    throttling: profile.throttling,
    throttlingMethod: 'simulate',
    disableStorageReset: false,
  };
  const runnerResult = await lighthouse(url, options);
  if (!runnerResult?.lhr) {
    throw new Error(`Lighthouse did not return a report for ${url}`);
  }

  const lhr = runnerResult.lhr;
  return {
    lhr,
    scores: {
      performance: lhr.categories.performance.score ?? 0,
      accessibility: lhr.categories.accessibility.score ?? 0,
      bestPractices: lhr.categories['best-practices'].score ?? 0,
      seo: lhr.categories.seo.score ?? 0,
    },
    fcpMs: getMetric(lhr, 'first-contentful-paint'),
    lcpMs: getMetric(lhr, 'largest-contentful-paint'),
    cls: getMetric(lhr, 'cumulative-layout-shift'),
    tbtMs: getMetric(lhr, 'total-blocking-time'),
  };
}

async function runLighthouseWithRetry(url, profile, route, port) {
  const first = await runLighthouse(url, profile, port);
  const firstResult = {
    profile: profile.label,
    label: route.label,
    path: route.path,
    budgets: profile.budgets,
    ...first,
  };
  if (collectIssues(firstResult).length === 0) {
    return firstResult;
  }

  const retry = await runLighthouse(url, profile, port);
  return {
    profile: profile.label,
    label: route.label,
    path: route.path,
    budgets: profile.budgets,
    retryOf: formatResult(firstResult),
    ...retry,
  };
}

const previewPort = await findFreePort();
const baseUrl = `http://${host}:${previewPort}`;
const preview = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'preview', '--', '--host', host, '--port', String(previewPort), '--strictPort'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

let previewOutput = '';
preview.stdout.on('data', (chunk) => {
  previewOutput += chunk.toString();
});
preview.stderr.on('data', (chunk) => {
  previewOutput += chunk.toString();
});

let chrome;
try {
  await waitForServer(baseUrl);
  chrome = await launchChrome();
  const results = [];

  for (const profile of profiles) {
    for (const route of routes) {
      const url = `${baseUrl}${route.path}`;
      results.push(await runLighthouseWithRetry(url, profile, route, chrome.port));
    }
  }

  const failures = [];
  for (const result of results) {
    const issues = collectIssues(result);
    if (issues.length > 0) {
      failures.push(`${result.profile}/${result.label}: ${issues.join(', ')}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Lighthouse budgets failed:\n${failures.map((item) => `- ${item}`).join('\n')}\n\nMeasured results:\n${results.map(formatResult).join('\n')}`
    );
  }

  console.log('\n✅ Lighthouse 基线测试通过');
  for (const result of results) {
    console.log(formatResult(result));
    if (result.retryOf) {
      console.log(`  retryOf=${result.retryOf}`);
    }
  }
} catch (error) {
  console.error('\n❌ Lighthouse 基线测试失败\n');
  console.error(error instanceof Error ? error.message : String(error));
  if (previewOutput.trim()) {
    console.error('\n--- preview output ---');
    console.error(previewOutput.trim());
  }
  process.exitCode = 1;
} finally {
  chrome?.close();
  preview.kill('SIGTERM');
}
