import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import { ensureDir, projectRoot, writeJson } from '../search/common.mjs';

const host = '127.0.0.1';
const route = {
  path: '/#/relation/risk/R0001?view=sankey',
  label: 'mobile/relation-sankey',
};
const reportDir = path.join(projectRoot, 'research/search-reports');
const reportJsonPath = path.join(reportDir, 'lighthouse-mobile-sankey-trace.json');
const reportMdPath = path.join(reportDir, 'lighthouse-mobile-sankey-trace.md');

const mobileProfile = {
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
};

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

async function waitForExit(child, timeoutMs = 5000) {
  if (child.exitCode !== null || child.signalCode !== null) return;

  await Promise.race([
    once(child, 'exit'),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

function removeTempDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: failed to remove temporary Chromium profile ${dir}: ${message}`);
  }
}

async function launchChrome() {
  const port = await findFreePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'break-lighthouse-trace-'));
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
    await waitForExit(chrome);
    removeTempDir(userDataDir);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n${output.trim()}`);
  }

  return {
    port,
    close: async () => {
      chrome.kill('SIGTERM');
      await waitForExit(chrome);
      removeTempDir(userDataDir);
    },
  };
}

function getMetric(lhr, auditId) {
  return Number(lhr.audits[auditId]?.numericValue ?? 0);
}

function formatMs(value) {
  return Math.round(Number(value ?? 0));
}

function formatKb(value) {
  return Number((Number(value ?? 0) / 1024).toFixed(2));
}

function getAuditItems(lhr, auditId) {
  const details = lhr.audits[auditId]?.details;
  return Array.isArray(details?.items) ? details.items : [];
}

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return String(url);
  }
}

function summarizeLongTasks(lhr) {
  return getAuditItems(lhr, 'long-tasks')
    .map((item) => ({
      startTimeMs: formatMs(item.startTime),
      durationMs: formatMs(item.duration),
      url: normalizeUrl(item.url),
    }))
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 12);
}

function summarizeMainThreadWork(lhr) {
  return getAuditItems(lhr, 'mainthread-work-breakdown')
    .map((item) => ({
      group: item.groupLabel || item.group || 'unknown',
      durationMs: formatMs(item.duration),
    }))
    .sort((a, b) => b.durationMs - a.durationMs);
}

function summarizeBootup(lhr) {
  return getAuditItems(lhr, 'bootup-time')
    .map((item) => ({
      url: normalizeUrl(item.url),
      totalMs: formatMs(item.total),
      scriptingMs: formatMs(item.scripting),
      scriptParseCompileMs: formatMs(item.scriptParseCompile),
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 12);
}

function summarizeNetworkScripts(lhr) {
  return getAuditItems(lhr, 'network-requests')
    .filter((item) => String(item.resourceType ?? '').toLowerCase() === 'script' || String(item.url ?? '').endsWith('.js'))
    .map((item) => ({
      url: normalizeUrl(item.url),
      transferKb: formatKb(item.transferSize),
      resourceKb: formatKb(item.resourceSize),
      startTimeMs: formatMs(item.startTime),
      endTimeMs: formatMs(item.endTime),
    }))
    .sort((a, b) => b.transferKb - a.transferKb)
    .slice(0, 16);
}

function networkRequestSummary(item) {
  return {
    url: normalizeUrl(item.url),
    resourceType: item.resourceType || '',
    mimeType: item.mimeType || '',
    transferKb: formatKb(item.transferSize),
    resourceKb: formatKb(item.resourceSize),
    startTimeMs: formatMs(item.startTime),
    endTimeMs: formatMs(item.endTime),
    durationMs: formatMs(Number(item.endTime ?? 0) - Number(item.startTime ?? 0)),
    statusCode: item.statusCode || '',
  };
}

function summarizeCriticalNetworkRequests(lhr) {
  const lcpMs = getMetric(lhr, 'largest-contentful-paint');
  const fcpMs = getMetric(lhr, 'first-contentful-paint');
  const cutoffMs = Math.max(lcpMs, fcpMs);

  return getAuditItems(lhr, 'network-requests')
    .filter((item) => Number(item.startTime ?? 0) <= cutoffMs + 250)
    .map(networkRequestSummary)
    .sort((a, b) => a.endTimeMs - b.endTimeMs)
    .slice(0, 24);
}

function summarizeSlowNetworkRequests(lhr) {
  return getAuditItems(lhr, 'network-requests')
    .map(networkRequestSummary)
    .filter((item) => item.durationMs > 0)
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 12);
}

function summarizeRenderBlocking(lhr) {
  return getAuditItems(lhr, 'render-blocking-resources')
    .map((item) => ({
      url: normalizeUrl(item.url),
      totalKb: item.totalBytes ? formatKb(item.totalBytes) : 0,
      wastedMs: formatMs(item.wastedMs),
    }))
    .sort((a, b) => b.wastedMs - a.wastedMs);
}

function summarizeLcpElement(lhr) {
  const item = getAuditItems(lhr, 'largest-contentful-paint-element')[0];
  if (!item) return null;
  return {
    nodeLabel: item.node?.nodeLabel || item.node?.snippet || '',
    selector: item.node?.selector || '',
    timing: item.timing ? String(item.timing) : '',
  };
}

function summarizeLcpPhases(lhr) {
  const details = lhr.audits['largest-contentful-paint-element']?.details;
  const phaseTable = Array.isArray(details?.items)
    ? details.items.find((item) =>
        Array.isArray(item?.headings) &&
        item.headings.some((heading) => heading.key === 'phase') &&
        Array.isArray(item.items)
      )
    : null;

  return Array.isArray(phaseTable?.items)
    ? phaseTable.items.map((item) => ({
        phase: item.phase || '',
        percent: item.percent || '',
        timingMs: formatMs(item.timing),
      }))
    : [];
}

function collectOpportunities(lhr) {
  const ids = [
    'render-blocking-resources',
    'unused-javascript',
    'total-byte-weight',
    'legacy-javascript',
    'dom-size',
    'duplicated-javascript',
  ];

  return ids
    .map((id) => {
      const audit = lhr.audits[id];
      if (!audit) return null;
      return {
        id,
        title: audit.title,
        score: audit.score,
        numericValue: audit.numericValue ? Math.round(audit.numericValue) : 0,
        displayValue: audit.displayValue || '',
        items: getAuditItems(lhr, id).slice(0, 6).map((item) => ({
          url: normalizeUrl(item.url),
          totalBytes: item.totalBytes ? formatKb(item.totalBytes) : undefined,
          wastedBytes: item.wastedBytes ? formatKb(item.wastedBytes) : undefined,
          wastedMs: item.wastedMs ? formatMs(item.wastedMs) : undefined,
        })),
      };
    })
    .filter(Boolean);
}

function buildReport(lhr, url) {
  const performanceScore = Math.round((lhr.categories.performance.score ?? 0) * 100);
  return {
    generatedAt: new Date().toISOString(),
    route: {
      label: route.label,
      path: route.path,
      url,
    },
    profile: mobileProfile,
    metrics: {
      performanceScore,
      fcpMs: formatMs(getMetric(lhr, 'first-contentful-paint')),
      lcpMs: formatMs(getMetric(lhr, 'largest-contentful-paint')),
      tbtMs: formatMs(getMetric(lhr, 'total-blocking-time')),
      cls: Number(getMetric(lhr, 'cumulative-layout-shift').toFixed(3)),
      speedIndexMs: formatMs(getMetric(lhr, 'speed-index')),
      maxPotentialFidMs: formatMs(getMetric(lhr, 'max-potential-fid')),
    },
    lcpElement: summarizeLcpElement(lhr),
    lcpPhases: summarizeLcpPhases(lhr),
    renderBlocking: summarizeRenderBlocking(lhr),
    criticalNetworkRequests: summarizeCriticalNetworkRequests(lhr),
    slowNetworkRequests: summarizeSlowNetworkRequests(lhr),
    mainThreadWork: summarizeMainThreadWork(lhr),
    longTasks: summarizeLongTasks(lhr),
    bootup: summarizeBootup(lhr),
    networkScripts: summarizeNetworkScripts(lhr),
    opportunities: collectOpportunities(lhr),
    runtimeError: lhr.runtimeError?.message || '',
  };
}

function renderTable(lines, headers, rows, renderRow) {
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  if (rows.length === 0) {
    lines.push(`| ${headers.map((_, index) => (index === 0 ? 'n/a' : '')).join(' | ')} |`);
    return;
  }
  rows.forEach((row) => {
    lines.push(`| ${renderRow(row).join(' | ')} |`);
  });
}

function renderMarkdown(report) {
  const lines = [
    '# Mobile Sankey Lighthouse Trace',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Route: \`${report.route.path}\``,
    '',
    '## Metrics',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Performance | ${report.metrics.performanceScore} |`,
    `| FCP | ${report.metrics.fcpMs} ms |`,
    `| LCP | ${report.metrics.lcpMs} ms |`,
    `| TBT | ${report.metrics.tbtMs} ms |`,
    `| CLS | ${report.metrics.cls} |`,
    `| Speed Index | ${report.metrics.speedIndexMs} ms |`,
    `| Max Potential FID | ${report.metrics.maxPotentialFidMs} ms |`,
    '',
    '## LCP Element',
    '',
  ];

  if (report.lcpElement) {
    lines.push(`- Selector: \`${report.lcpElement.selector || 'n/a'}\``);
    lines.push(`- Node: ${report.lcpElement.nodeLabel || 'n/a'}`);
  } else {
    lines.push('No LCP element details reported.');
  }

  lines.push('', '## LCP Phases', '');
  renderTable(lines, ['Phase', 'Percent', 'Timing'], report.lcpPhases, (item) => [
    item.phase,
    item.percent,
    `${item.timingMs} ms`,
  ]);

  lines.push('', '## Render-blocking Resources', '');
  renderTable(lines, ['URL', 'Wasted', 'Size'], report.renderBlocking, (item) => [
    `\`${item.url || 'n/a'}\``,
    `${item.wastedMs} ms`,
    `${item.totalKb} kB`,
  ]);

  lines.push('', '## Critical Network Requests', '');
  renderTable(lines, ['URL', 'Type', 'Start', 'End'], report.criticalNetworkRequests, (item) => [
    `\`${item.url || 'n/a'}\``,
    item.resourceType || 'n/a',
    `${item.startTimeMs} ms`,
    `${item.endTimeMs} ms`,
  ]);

  lines.push('', '## Slow Network Requests', '');
  renderTable(lines, ['URL', 'Type', 'Duration', 'Transfer'], report.slowNetworkRequests, (item) => [
    `\`${item.url || 'n/a'}\``,
    item.resourceType || 'n/a',
    `${item.durationMs} ms`,
    `${item.transferKb} kB`,
  ]);

  lines.push('', '## Main Thread Work', '');
  renderTable(lines, ['Group', 'Duration'], report.mainThreadWork, (item) => [
    item.group,
    `${item.durationMs} ms`,
  ]);

  lines.push('', '## Long Tasks', '');
  renderTable(lines, ['Start', 'Duration', 'URL'], report.longTasks, (item) => [
    `${item.startTimeMs} ms`,
    `${item.durationMs} ms`,
    `\`${item.url || 'n/a'}\``,
  ]);

  lines.push('', '## Bootup Time', '');
  renderTable(lines, ['URL', 'Total', 'Scripting', 'Parse/Compile'], report.bootup, (item) => [
    `\`${item.url || 'n/a'}\``,
    `${item.totalMs} ms`,
    `${item.scriptingMs} ms`,
    `${item.scriptParseCompileMs} ms`,
  ]);

  lines.push('', '## Largest Script Requests', '');
  renderTable(lines, ['URL', 'Transfer', 'Resource', 'Start', 'End'], report.networkScripts, (item) => [
    `\`${item.url || 'n/a'}\``,
    `${item.transferKb} kB`,
    `${item.resourceKb} kB`,
    `${item.startTimeMs} ms`,
    `${item.endTimeMs} ms`,
  ]);

  lines.push('', '## Opportunities', '');
  if (report.opportunities.length === 0) {
    lines.push('No opportunity audits reported.');
  } else {
    for (const item of report.opportunities) {
      lines.push(`- ${item.title}: ${item.displayValue || item.numericValue || 'n/a'}`);
    }
  }

  if (report.runtimeError) {
    lines.push('', '## Runtime Error', '', report.runtimeError);
  }

  return `${lines.join('\n')}\n`;
}

async function runLighthouse(url, port) {
  const options = {
    port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance'],
    formFactor: mobileProfile.formFactor,
    screenEmulation: mobileProfile.screenEmulation,
    throttling: mobileProfile.throttling,
    throttlingMethod: 'simulate',
    disableStorageReset: false,
  };
  const runnerResult = await lighthouse(url, options);
  if (!runnerResult?.lhr) {
    throw new Error(`Lighthouse did not return a report for ${url}`);
  }
  return runnerResult.lhr;
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
  const url = `${baseUrl}${route.path}`;
  const lhr = await runLighthouse(url, chrome.port);
  const report = buildReport(lhr, url);

  ensureDir(reportDir);
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, renderMarkdown(report));

  console.log('\n=== Mobile Sankey Lighthouse Trace ===\n');
  console.log(`performance=${report.metrics.performanceScore}`);
  console.log(`LCP=${report.metrics.lcpMs}ms, TBT=${report.metrics.tbtMs}ms, CLS=${report.metrics.cls}`);
  console.log(`longTasks=${report.longTasks.length}`);
  console.log(`topMainThread=${report.mainThreadWork[0]?.group || 'n/a'} ${report.mainThreadWork[0]?.durationMs || 0}ms`);
  console.log(`report=${reportMdPath}`);
} catch (error) {
  console.error('\n❌ Mobile Sankey Lighthouse trace failed\n');
  console.error(error instanceof Error ? error.message : String(error));
  if (previewOutput.trim()) {
    console.error('\n--- preview output ---');
    console.error(previewOutput.trim());
  }
  process.exitCode = 1;
} finally {
  await chrome?.close();
  preview.kill('SIGTERM');
}
