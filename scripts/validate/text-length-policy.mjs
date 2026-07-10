// 中文按去空白后的 Unicode 字符数计算，英文按单词数计算。
// minZh 仅用于新增中文实体准入；maxZh/maxEnWords 对全库生效。
export const TEXT_LENGTH_POLICY = {
  risks: {
    definition: { minZh: 20, maxZh: 160, maxEnWords: 80 },
    description: { minZh: 60, maxZh: 600, maxEnWords: 300 },
    influence: { minZh: 15, maxZh: 250, maxEnWords: 120 },
  },
  avoidances: {
    definition: { minZh: 20, maxZh: 160, maxEnWords: 80 },
    description: { minZh: 60, maxZh: 600, maxEnWords: 300 },
    limitation: { minZh: 30, maxZh: 200, maxEnWords: 150 },
  },
  'attack-tools': {
    description: { minZh: 80, maxZh: 600, maxEnWords: 300 },
  },
  'threat-actors': {
    description: { minZh: 80, maxZh: 450, maxEnWords: 220 },
  },
  terms: {
    definition: { minZh: 20, maxZh: 100, maxEnWords: 60 },
    description: { minZh: 60, maxZh: 400, maxEnWords: 220 },
    usageExample: { maxZh: 120, maxEnWords: 80 },
  },
  cases: {
    summary: { minZh: 80, maxZh: 300, maxEnWords: 180 },
  },
};

export function countZhChars(value) {
  return [...String(value || '').replace(/\s+/gu, '')].length;
}

export function countEnglishWords(value) {
  return (String(value || '').match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
}
