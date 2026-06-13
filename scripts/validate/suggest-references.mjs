import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// 需要补充引用的实体列表
const missingRefs = [
  { type: 'avoidances', key: 'A0016-002', file: 'A0016.json' },
  { type: 'avoidances', key: 'A0016-003', file: 'A0016.json' },
  { type: 'avoidances', key: 'A0016-005', file: 'A0016.json' },
  { type: 'avoidances', key: 'A0019-002', file: 'A0018.json' },
  { type: 'avoidances', key: 'A0019-003', file: 'A0018.json' },
  { type: 'avoidances', key: 'A0020-001', file: 'A0020.json' },
  { type: 'attack-tools', key: 'AT0050', file: 'AT0050.json' }
];

// 空链接实体列表
const emptyLinks = [
  { type: 'risks', key: 'R0095', file: 'R0095.json' },
  { type: 'attack-tools', key: 'AT0052-001', file: 'AT0052.json' },
  { type: 'attack-tools', key: 'AT0052-002', file: 'AT0052.json' },
  { type: 'attack-tools', key: 'AT0052-003', file: 'AT0052.json' }
];

// 生成搜索建议
function generateSearchSuggestions(entity) {
  const suggestions = [];
  const desc = entity.definition || entity.description || '';

  // 中文搜索
  suggestions.push({
    engine: 'baidu',
    query: `${entity.title} 定义`,
    purpose: '基础概念'
  });

  suggestions.push({
    engine: 'baidu',
    query: `${entity.title} 原理 方法`,
    purpose: '技术细节'
  });

  // 英文搜索（如果有英文关键词）
  if (desc.match(/[A-Z]{2,}/)) {
    suggestions.push({
      engine: 'google',
      query: `${entity.title} security`,
      purpose: '国际标准'
    });
  }

  return suggestions;
}

// 主函数
function main() {
  console.log('\n=== 缺少引用实体的搜索建议 ===\n');

  [...missingRefs, ...emptyLinks].forEach(item => {
    const filePath = path.join(projectRoot, `src/BREAK/${item.type}/${item.file}`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const entity = data[item.key];

    if (!entity) {
      console.log(`⚠️  未找到实体: ${item.key}`);
      return;
    }

    console.log(`\n## ${item.key} - ${entity.title}`);
    const desc = entity.definition || entity.description || '';
    console.log(`定义: ${desc.substring(0, 100)}...`);
    console.log('\n建议搜索:');

    const suggestions = generateSearchSuggestions(entity);
    suggestions.forEach(s => {
      console.log(`  - [${s.engine}] ${s.query} (${s.purpose})`);
    });
  });

  console.log('\n\n提示: 请手动搜索以上关键词，找到合适的参考资料后补充到对应的实体中。');
}

main();
