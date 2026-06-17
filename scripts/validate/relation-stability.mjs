import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const layouts = ['horizontal', 'lanes', 'split', 'radial', 'hierarchical', 'force'];
const fixtureLimit = 5;
const minCanvasPaintedPixels = 1200;

function readStaticData() {
  const payload = JSON.parse(fs.readFileSync('public/data/break-data.json', 'utf8'));
  return payload.data;
}

function relationCount(data, type, key) {
  if (type === 'risk') {
    const risk = data.risks[key];
    const tools = Object.values(data.attackTools).filter((tool) =>
      [...tool.directCauseRisks, ...tool.indirectSupportRisks].includes(key),
    );
    const actors = Object.values(data.threatActors).filter((actor) =>
      [...actor.directCauseRisks, ...actor.indirectSupportRisks].includes(key),
    );
    const terms = Object.values(data.terms).filter((term) => term.relatedRisks.includes(key));
    return risk.avoidances.length + tools.length + actors.length + terms.length;
  }

  if (type === 'attack-tool') {
    const tool = data.attackTools[key];
    const actors = Object.values(data.threatActors).filter((actor) =>
      [...actor.buildAttackTools, ...actor.useAttackTools].includes(key),
    );
    const terms = Object.values(data.terms).filter((term) => term.relatedAttackTools.includes(key));
    return tool.avoidances.length + tool.directCauseRisks.length + tool.indirectSupportRisks.length + actors.length + terms.length;
  }

  if (type === 'threat-actor') {
    const actor = data.threatActors[key];
    const terms = Object.values(data.terms).filter((term) => term.relatedThreatActors.includes(key));
    return actor.buildAttackTools.length + actor.useAttackTools.length + actor.directCauseRisks.length + actor.indirectSupportRisks.length + terms.length;
  }

  if (type === 'avoidance') {
    const risks = Object.values(data.risks).filter((risk) => risk.avoidances.includes(key));
    const tools = Object.values(data.attackTools).filter((tool) => tool.avoidances.includes(key));
    const terms = Object.values(data.terms).filter((term) => term.relatedAvoidances.includes(key));
    return risks.length + tools.length + terms.length;
  }

  return 0;
}

function pickComplexFixtures(data) {
  const byType = (type, collection) =>
    Object.keys(collection)
      .map((key) => ({ type, key, relationCount: relationCount(data, type, key) }))
      .sort((a, b) => b.relationCount - a.relationCount || a.key.localeCompare(b.key));

  const fixtures = [
    byType('avoidance', data.avoidances)[0],
    byType('threat-actor', data.threatActors)[0],
    byType('risk', data.risks)[0],
    byType('attack-tool', data.attackTools)[0],
    byType('avoidance', data.avoidances)[1],
  ];

  return fixtures.filter(Boolean).slice(0, fixtureLimit);
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

async function getPaintedCanvasPixels(page) {
  return page.locator('.network-chart canvas').first().evaluate((canvas) => {
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

async function selectLayout(page, layout) {
  await page.locator('.graph-toolbar .el-dropdown').click();
  await page.locator('.el-dropdown-menu__item', { hasText: new RegExp(layout, 'i') }).click();
  await page.waitForTimeout(layout === 'force' ? 900 : 450);
}

async function assertNetworkStable(page, fixture, layout) {
  await page.locator('.network-chart canvas').first().waitFor({ state: 'visible', timeout: 15000 });
  const box = await page.locator('.network-chart canvas').first().boundingBox();
  if (!box || box.width < 300 || box.height < 260) {
    throw new Error(`${fixture.type}/${fixture.key} ${layout}: canvas is too small`);
  }

  const paintedPixels = await getPaintedCanvasPixels(page);
  if (paintedPixels < minCanvasPaintedPixels) {
    throw new Error(`${fixture.type}/${fixture.key} ${layout}: canvas painted pixels ${paintedPixels} < ${minCanvasPaintedPixels}`);
  }
}

async function assertFiltersRemainUsable(page, fixture) {
  const riskCheckbox = page.locator('#node-filter-pane .el-checkbox', { hasText: /Risk|风险/i }).first();
  await riskCheckbox.click();
  await page.waitForTimeout(450);
  await assertNetworkStable(page, fixture, 'node-filter');

  const lineCheckbox = page.locator('#line-filter-pane .el-checkbox').first();
  await lineCheckbox.click();
  await page.waitForTimeout(450);
  await assertNetworkStable(page, fixture, 'line-filter');
}

async function assertNodeDrawerOpens(page, fixture) {
  await page.locator('.graph-toolbar .el-button').last().click();
  await page.locator('.relation-drawer').waitFor({ state: 'visible', timeout: 10000 });
  const drawerText = await page.locator('.relation-drawer').innerText({ timeout: 10000 });
  if (!drawerText.includes(fixture.key)) {
    throw new Error(`${fixture.type}/${fixture.key}: node detail drawer did not include the root key`);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
}

const data = readStaticData();
const fixtures = pickComplexFixtures(data);
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

  for (const fixture of fixtures) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => {
      runtimeErrors.push(`${fixture.type}/${fixture.key}: ${error.message}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
        runtimeErrors.push(`${fixture.type}/${fixture.key}: ${message.text()}`);
      }
    });
    page.on('requestfailed', (request) => {
      if (!isSameOrigin(request.url(), baseUrl)) return;
      resourceErrors.push(`${fixture.type}/${fixture.key}: ${formatRequest(request)} failed: ${request.failure()?.errorText ?? 'unknown'}`);
    });
    page.on('response', (response) => {
      const status = response.status();
      if (status < 400 || !isSameOrigin(response.url(), baseUrl)) return;
      resourceErrors.push(`${fixture.type}/${fixture.key}: ${response.request().method()} ${response.url()} returned HTTP ${status}`);
    });

    await page.goto(`${baseUrl}/#/relation/${fixture.type}/${fixture.key}?view=network`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.locator('.network-graph-pane').waitFor({ state: 'visible', timeout: 15000 });
    await assertNetworkStable(page, fixture, 'initial');

    for (const layout of layouts) {
      await selectLayout(page, layout);
      await assertNetworkStable(page, fixture, layout);
    }

    await assertFiltersRemainUsable(page, fixture);
    await assertNodeDrawerOpens(page, fixture);

    results.push(`${fixture.type}/${fixture.key}:${fixture.relationCount}`);
    await page.close();
    await context.close();
  }

  if (runtimeErrors.length > 0) {
    throw new Error(`Runtime errors during relation stability test:\n${runtimeErrors.map((item) => `- ${item}`).join('\n')}`);
  }
  if (resourceErrors.length > 0) {
    throw new Error(`Same-origin resource errors during relation stability test:\n${resourceErrors.map((item) => `- ${item}`).join('\n')}`);
  }

  console.log('\n✅ 复杂关系图谱稳定性测试通过');
  console.log(`fixtures=${results.join(', ')}`);
  console.log(`layouts=${layouts.join(', ')}`);
} catch (error) {
  console.error('\n❌ 复杂关系图谱稳定性测试失败\n');
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
