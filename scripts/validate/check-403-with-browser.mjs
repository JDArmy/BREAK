import { chromium } from 'playwright';
import fs from 'fs';

const issues = JSON.parse(fs.readFileSync('reference-validation-report.json', 'utf-8'));
const forbiddenIssues = issues.filter(i => i.issue === '403_forbidden');

console.log(`找到 ${forbiddenIssues.length} 个403错误，使用Chrome验证...\n`);

async function checkWithBrowser(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  try {
    const response = await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' });
    const status = response.status();
    await browser.close();
    return { ok: status >= 200 && status < 400, status };
  } catch (error) {
    await browser.close();
    return { ok: false, status: 0, error: error.message };
  }
}

async function main() {
  const reallyBroken = [];
  const actuallyWorking = [];

  for (let i = 0; i < forbiddenIssues.length; i++) {
    const issue = forbiddenIssues[i];
    console.log(`[${i + 1}/${forbiddenIssues.length}] 检查: ${issue.link}`);

    const result = await checkWithBrowser(issue.link);

    if (result.ok) {
      console.log(`  ✅ ${result.status} - 实际可访问`);
      actuallyWorking.push(issue);
    } else {
      console.log(`  ❌ ${result.status || 'FAILED'} - 确实失效`);
      reallyBroken.push(issue);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n\n========== 验证结果 ==========`);
  console.log(`✅ 实际可访问: ${actuallyWorking.length} 个`);
  console.log(`❌ 确实失效: ${reallyBroken.length} 个`);

  if (reallyBroken.length > 0) {
    fs.writeFileSync('403-really-broken.json', JSON.stringify(reallyBroken, null, 2));
    console.log(`\n确实失效的链接已保存到: 403-really-broken.json`);
  }
}

main().catch(console.error);
