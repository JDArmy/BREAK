import { execFileSync } from 'node:child_process';
import { projectRoot } from '../search/common.mjs';

function git(args) {
  return execFileSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
  }).trim();
}

const changed = git(['status', '--porcelain', '--', 'docs'])
  .split('\n')
  .map((line) => line.trimEnd())
  .filter(Boolean);

if (changed.length > 0) {
  console.error('\n❌ docs 构建产物未同步\n');
  console.error('请先运行 npm run build-only，并提交 docs/ 下生成的构建产物变化。');
  console.error('');
  for (const line of changed.slice(0, 80)) {
    console.error(`- ${line}`);
  }
  if (changed.length > 80) {
    console.error(`... 另有 ${changed.length - 80} 个文件未显示`);
  }
  process.exit(1);
}

console.log('\n✅ docs 构建产物已同步');
