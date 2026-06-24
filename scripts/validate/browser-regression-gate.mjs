import { shouldRunOnMinorBump } from '../search/common.mjs';
import fs from 'node:fs';

const bump = shouldRunOnMinorBump();
const run = bump.shouldRun ? 'true' : 'false';

console.log(`${bump.shouldRun ? 'run' : 'skip'} browser regression: ${bump.reason}`);
console.log(`current=${bump.current ?? 'unknown'}`);
console.log(`previous=${bump.previous ?? 'unknown'}`);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `run=${run}`,
      `current=${bump.current ?? ''}`,
      `previous=${bump.previous ?? ''}`,
      `reason=${bump.reason}`,
      '',
    ].join('\n'),
  );
}
