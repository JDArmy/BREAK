// 记录因外部服务故障或人工豁免跳过的 LLM 门禁，供服务恢复后重跑。
import fs from 'node:fs';
import path from 'node:path';
import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { ensureDir, projectRoot, writeJson } from '../search/common.mjs';

const opts = parseArgs(process.argv.slice(2));
const reasonArg = process.argv.find((arg) => arg.startsWith('--reason='));
const reason = reasonArg ? reasonArg.slice('--reason='.length) : '未提供原因';
const outDir = path.join(projectRoot, 'research/search-reports/llm-gate-retry');
const outPath = path.join(outDir, 'pending.json');

const changed = await getChangedEntities({
  baseRef: opts.baseRef,
  stagedOnly: opts.stagedOnly,
});
const entities = changed
  .filter((item) => item.hasContentChange || item.isNew)
  .map((item) => ({ key: item.key, type: item.type }));

if (entities.length === 0) {
  console.log('LLM 门禁跳过记录：无实体内容变更，无需登记。');
  process.exit(0);
}

ensureDir(outDir);
let entries = [];
if (fs.existsSync(outPath)) {
  try {
    entries = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  } catch {
    entries = [];
  }
}
if (!Array.isArray(entries)) entries = [];

const entry = {
  recordedAt: new Date().toISOString(),
  base: opts.baseRef,
  stagedOnly: opts.stagedOnly,
  reason,
  entities,
  recheckCommand: `npm run review:changed -- --base ${opts.baseRef}`,
};
entries.push(entry);
writeJson(outPath, entries);

const mdPath = path.join(outDir, 'pending.md');
const lines = [
  '# LLM 门禁待重跑清单',
  '',
  '外部服务恢复后，按各记录的命令重跑 LLM 评审；成功后可删除已完成记录。',
  '',
];
for (const item of entries) {
  lines.push(`## ${item.recordedAt}`);
  lines.push(`- 原因：${item.reason}`);
  lines.push(`- 范围：${item.base}${item.stagedOnly ? '（仅暂存区）' : ''}`);
  lines.push(`- 实体：${item.entities.map((entity) => entity.key).join(', ')}`);
  lines.push(`- 重跑：\`${item.recheckCommand}\``);
  lines.push('');
}
fs.writeFileSync(mdPath, `${lines.join('\n')}\n`);
console.log(`LLM 门禁跳过已记录：${entities.length} 个实体 → ${path.relative(projectRoot, outPath)}`);
