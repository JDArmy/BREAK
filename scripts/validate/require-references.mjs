#!/usr/bin/env node
/**
 * 验证所有实体必须包含至少一个参考文献
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const breakDir = path.join(__dirname, '../../src/BREAK');

const entityTypes = [
  { dir: 'risks', name: 'Risk' },
  { dir: 'avoidances', name: 'Avoidance' },
  { dir: 'attack-tools', name: 'AttackTool' },
  { dir: 'threat-actors', name: 'ThreatActor' }
];

let totalCount = 0;
let missingCount = 0;
const missingEntities = [];

for (const entityType of entityTypes) {
  const dir = path.join(breakDir, entityType.dir);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const entityId = Object.keys(data)[0];
    const entity = data[entityId];

    totalCount++;

    if (!entity.references || entity.references.length === 0) {
      missingCount++;
      missingEntities.push({
        type: entityType.name,
        id: entityId,
        file: path.relative(breakDir, filePath)
      });
    }
  }
}

console.log(`\n=== References 覆盖检查 ===\n`);
console.log(`总计实体数: ${totalCount}`);
console.log(`缺少 references: ${missingCount}`);
console.log(`覆盖率: ${((totalCount - missingCount) / totalCount * 100).toFixed(2)}%\n`);

if (missingCount > 0) {
  console.log(`❌ 以下 ${missingCount} 个实体缺少参考文献：\n`);
  for (const item of missingEntities) {
    console.log(`- ${item.type} ${item.id} (${item.file})`);
  }
  process.exit(1);
} else {
  console.log(`✅ 所有实体均包含参考文献`);
}
