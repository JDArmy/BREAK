import { spawnSync } from 'node:child_process';
import { shouldRunOnMinorBump } from '../search/common.mjs';

const bump = shouldRunOnMinorBump();

if (!bump.shouldRun) {
  console.log(`⏭️  跳过本地浏览器回归：${bump.reason}`);
  process.exit(0);
}

console.log(`🚦 检测到 major/minor 版本变化，开始本地浏览器回归：${bump.reason}`);

const commands = [
  ['npm', ['run', 'export:data']],
  ['npm', ['run', 'export:data-en']],
  ['npm', ['run', 'build-only']],
  ['npm', ['run', 'test:smoke']],
  ['npm', ['run', 'test:performance']],
  ['npm', ['run', 'test:visual-review']],
  ['npm', ['run', 'test:relation-stability']],
  ['npm', ['run', 'test:lighthouse']],
  ['npm', ['run', 'audit:lighthouse-sankey']],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('✅ 本地浏览器回归通过');
