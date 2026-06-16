/**
 * i18n 同步检查脚本
 * 对比 src/BREAK/ 和 src/i18n/en/BREAK/ 下每种实体的 key 集合
 * 输出差异报告，--strict 模式下有差异则 exit(1)
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const strict = process.argv.includes("--strict");

function loadKeys(dir) {
  const result = new Set();
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const content = JSON.parse(readFileSync(join(dir, file), "utf-8"));
    for (const key of Object.keys(content)) {
      result.add(key);
    }
  }
  return result;
}

const categories = [
  { name: "Risks", zhDir: "src/BREAK/risks", enDir: "src/i18n/en/BREAK/risks" },
  { name: "Avoidances", zhDir: "src/BREAK/avoidances", enDir: "src/i18n/en/BREAK/avoidances" },
  { name: "AttackTools", zhDir: "src/BREAK/attack-tools", enDir: "src/i18n/en/BREAK/attack-tools" },
  { name: "ThreatActors", zhDir: "src/BREAK/threat-actors", enDir: "src/i18n/en/BREAK/threat-actors" },
  { name: "Terms", zhDir: "src/BREAK/terms", enDir: "src/i18n/en/BREAK/terms" },
  { name: "BusinessScenes", zhDir: "src/BREAK/business-scenes", enDir: "src/i18n/en/BREAK/business-scenes" },
];

let hasErrors = false;

for (const cat of categories) {
  const zhKeys = loadKeys(cat.zhDir);
  const enKeys = loadKeys(cat.enDir);

  const missingInEn = [...zhKeys].filter((k) => !enKeys.has(k));
  const extraInEn = [...enKeys].filter((k) => !zhKeys.has(k));

  if (missingInEn.length === 0 && extraInEn.length === 0) {
    console.log(`✅ ${cat.name}: 中英文同步 (${zhKeys.size} 条)`);
  } else {
    hasErrors = true;
    console.log(`❌ ${cat.name}: 不同步`);
    if (missingInEn.length > 0) {
      console.log(`   EN 缺少: ${missingInEn.join(", ")}`);
    }
    if (extraInEn.length > 0) {
      console.log(`   EN 多余: ${extraInEn.join(", ")}`);
    }
  }
}

if (strict && hasErrors) {
  console.log("\n❌ i18n 同步检查失败（--strict 模式）");
  process.exit(1);
} else if (!hasErrors) {
  console.log("\n✅ 所有实体中英文数据同步");
}
