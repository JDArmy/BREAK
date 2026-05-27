import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const entityTypes = [
  { type: 'risks', path: 'src/BREAK/risks' },
  { type: 'avoidances', path: 'src/BREAK/avoidances' },
  { type: 'attack-tools', path: 'src/BREAK/attack-tools' },
  { type: 'threat-actors', path: 'src/BREAK/threat-actors' }
];

function cleanEmptyLinks() {
  let totalCleaned = 0;

  entityTypes.forEach(({ path: dirPath }) => {
    const fullPath = path.join(projectRoot, dirPath);
    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.json'));

    files.forEach(file => {
      const filePath = path.join(fullPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      let modified = false;

      Object.entries(data).forEach(([key, entity]) => {
        if (entity.references && Array.isArray(entity.references)) {
          const originalLength = entity.references.length;

          // 过滤掉空对象和空链接
          entity.references = entity.references.filter(ref =>
            ref && typeof ref === 'object' && ref.link && ref.link.trim() !== ''
          );

          if (entity.references.length < originalLength) {
            modified = true;
            totalCleaned += (originalLength - entity.references.length);
            console.log(`✓ ${key} - 清理了 ${originalLength - entity.references.length} 个空链接`);
          }
        }
      });

      if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      }
    });
  });

  console.log(`\n总计清理了 ${totalCleaned} 个空链接`);
}

cleanEmptyLinks();
