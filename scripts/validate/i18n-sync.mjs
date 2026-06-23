/**
 * i18n 同步检查脚本
 * 对比 src/BREAK/ 和 src/i18n/en/BREAK/ 下每种实体的 key 集合，
 * 并校验英文 i18n 只维护翻译字段，不写入结构字段。
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const strict = process.argv.includes("--strict");

function loadRecords(dir) {
  const records = new Map();
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const content = JSON.parse(readFileSync(join(dir, file), "utf-8"));
    for (const [key, entity] of Object.entries(content)) {
      records.set(key, { file, entity });
    }
  }
  return records;
}

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
  {
    name: "Risks",
    zhDir: "src/BREAK/risks",
    enDir: "src/i18n/en/BREAK/risks",
    fields: ["title", "keywords", "definition", "description", "complexity", "influence", "references"],
  },
  {
    name: "Avoidances",
    zhDir: "src/BREAK/avoidances",
    enDir: "src/i18n/en/BREAK/avoidances",
    fields: ["title", "keywords", "definition", "description", "complexity", "limitation", "references"],
  },
  {
    name: "AttackTools",
    zhDir: "src/BREAK/attack-tools",
    enDir: "src/i18n/en/BREAK/attack-tools",
    fields: ["title", "keywords", "description", "references"],
  },
  {
    name: "ThreatActors",
    zhDir: "src/BREAK/threat-actors",
    enDir: "src/i18n/en/BREAK/threat-actors",
    fields: ["title", "keywords", "description", "references"],
  },
  {
    name: "Terms",
    zhDir: "src/BREAK/terms",
    enDir: "src/i18n/en/BREAK/terms",
    fields: [
      "title",
      "keywords",
      "aliases",
      "category",
      "definition",
      "description",
      "usageExample",
      "references",
    ],
  },
  {
    name: "BusinessScenes",
    zhDir: "src/BREAK/business-scenes",
    enDir: "src/i18n/en/BREAK/business-scenes",
    fields: ["title", "description", "riskDimensions", "riskScenes"],
    businessScene: true,
  },
  {
    name: "Cases",
    zhDir: "src/BREAK/cases",
    enDir: "src/i18n/en/BREAK/cases",
    fields: ["title", "keywords", "summary", "description", "references"],
  },
];

let hasErrors = false;

function checkReferenceTranslations(issues, category, key, entity) {
  if (!Object.prototype.hasOwnProperty.call(entity, "references")) return;
  if (!Array.isArray(entity.references)) {
    issues.push(`${category.name}.${key}.references 必须是数组`);
    return;
  }
  entity.references.forEach((reference, index) => {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
      issues.push(`${category.name}.${key}.references[${index}] 必须是对象`);
      return;
    }
    const extraKeys = Object.keys(reference).filter((field) => field !== "title");
    if (extraKeys.length > 0) {
      issues.push(
        `${category.name}.${key}.references[${index}] 包含结构字段: ${extraKeys.join(", ")}`
      );
    }
  });
}

function checkBusinessSceneTranslations(issues, category, key, entity) {
  for (const field of ["riskDimensions", "riskScenes"]) {
    if (!Object.prototype.hasOwnProperty.call(entity, field)) continue;
    const records = entity[field];
    if (!records || typeof records !== "object" || Array.isArray(records)) {
      issues.push(`${category.name}.${key}.${field} 必须是对象`);
      continue;
    }
    for (const [nestedKey, nestedValue] of Object.entries(records)) {
      if (!nestedValue || typeof nestedValue !== "object" || Array.isArray(nestedValue)) {
        issues.push(`${category.name}.${key}.${field}.${nestedKey} 必须是对象`);
        continue;
      }
      const extraKeys = Object.keys(nestedValue).filter((nestedField) => nestedField !== "title");
      if (extraKeys.length > 0) {
        issues.push(
          `${category.name}.${key}.${field}.${nestedKey} 包含结构字段: ${extraKeys.join(", ")}`
        );
      }
    }
  }
}

function checkTranslationFields(category, enRecords) {
  const issues = [];
  const allowedFields = new Set(category.fields);

  for (const [key, { entity }] of enRecords.entries()) {
    if (!entity || typeof entity !== "object" || Array.isArray(entity)) {
      issues.push(`${category.name}.${key} 必须是对象`);
      continue;
    }
    const extraFields = Object.keys(entity).filter((field) => !allowedFields.has(field));
    if (extraFields.length > 0) {
      issues.push(`${category.name}.${key} 包含结构字段: ${extraFields.join(", ")}`);
    }

    checkReferenceTranslations(issues, category, key, entity);
    if (category.businessScene) {
      checkBusinessSceneTranslations(issues, category, key, entity);
    }
  }

  return issues;
}

for (const cat of categories) {
  const zhKeys = loadKeys(cat.zhDir);
  const enKeys = loadKeys(cat.enDir);
  const enRecords = loadRecords(cat.enDir);

  const missingInEn = [...zhKeys].filter((k) => !enKeys.has(k));
  const extraInEn = [...enKeys].filter((k) => !zhKeys.has(k));
  const fieldIssues = checkTranslationFields(cat, enRecords);

  if (missingInEn.length === 0 && extraInEn.length === 0 && fieldIssues.length === 0) {
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
    for (const issue of fieldIssues.slice(0, 60)) {
      console.log(`   字段污染: ${issue}`);
    }
    if (fieldIssues.length > 60) {
      console.log(`   字段污染: 另有 ${fieldIssues.length - 60} 个问题未显示`);
    }
  }
}

if (strict && hasErrors) {
  console.log("\n❌ i18n 同步检查失败（--strict 模式）");
  process.exit(1);
} else if (hasErrors) {
  // 非 strict 模式：有差异但不阻断，明确提示避免手动调用误判为同步
  console.log("\n⚠️ 检测到中英文数据差异（非 strict 模式未阻断，CI 使用 --strict 会失败）");
} else {
  console.log("\n✅ 所有实体中英文数据同步");
}
