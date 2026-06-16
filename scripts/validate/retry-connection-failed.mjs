import fs from 'fs';

const issues = JSON.parse(fs.readFileSync('reference-validation-report.json', 'utf-8'));
const connectionFailedIssues = issues.filter(i => i.issue === 'connection_failed');

console.log(`找到 ${connectionFailedIssues.length} 个连接失败的链接，重试验证中...\n`);

const RETRIES = 3;
const TIMEOUT = 15000;

async function retryCheck(url) {
  for (let i = 0; i < RETRIES; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        redirect: 'follow'
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return { ok: true, status: response.status };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (i === RETRIES - 1) {
        return { ok: false, status: 0, error: error.message };
      }
      await new Promise(r => setTimeout(r, 2000)); // 等待2秒后重试
    }
  }
  return { ok: false, status: 0, error: 'Max retries exceeded' };
}

async function main() {
  const stillFailed = [];
  const recovered = [];

  for (let i = 0; i < connectionFailedIssues.length; i++) {
    const issue = connectionFailedIssues[i];
    console.log(`[${i + 1}/${connectionFailedIssues.length}] 重试: ${issue.link}`);

    const result = await retryCheck(issue.link);

    if (result.ok) {
      console.log(`  ✅ ${result.status} - 恢复正常`);
      recovered.push(issue);
    } else {
      console.log(`  ❌ 仍然失败 - ${result.error}`);
      stillFailed.push(issue);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n\n========== 重试结果 ==========`);
  console.log(`✅ 恢复正常: ${recovered.length} 个`);
  console.log(`❌ 仍然失败: ${stillFailed.length} 个（将按404处理）`);

  if (stillFailed.length > 0) {
    // 将仍然失败的标记为404，追加到404列表
    const notFoundIssues = issues.filter(i => i.issue === '404_not_found');
    const combined = [...notFoundIssues, ...stillFailed.map(i => ({...i, issue: '404_not_found'}))];

    fs.writeFileSync('404-combined.json', JSON.stringify(combined, null, 2));
    console.log(`\n合并后的404列表已保存到: 404-combined.json (${combined.length} 个)`);
  }
}

main().catch(console.error);
