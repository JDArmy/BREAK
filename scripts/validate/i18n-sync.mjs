/**
 * i18n 同步检查脚本
 * 对比 src/BREAK/ 和 src/i18n/en/BREAK/ 下每种实体的 key 集合，
 * 并校验英文 i18n 只维护翻译字段，不写入结构字段。
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadSchemaModule, getSchemaTopLevelFields } from "./schema-loader.mjs";

const strict = process.argv.includes("--strict");

// schemaKey 与 category 的映射，用于白名单元校验（从 schema 派生字段集）
const SCHEMA_KEY_BY_CATEGORY = {
  Risks: "risks",
  Avoidances: "avoidances",
  AttackTools: "attackTools",
  ThreatActors: "threatActors",
  Terms: "terms",
  BusinessDomains: "businessDomains",
  Cases: "cases",
};

/** 一次遍历目录同时产出 key 集合与 records map（避免 loadKeys/loadRecords 双重解析同一批文件） */
function loadDir(dir) {
  const keys = new Set();
  const records = new Map();
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const content = JSON.parse(readFileSync(join(dir, file), "utf-8"));
    for (const [key, entity] of Object.entries(content)) {
      keys.add(key);
      records.set(key, { file, entity });
    }
  }
  return { keys, records };
}

const categories = [
  {
    name: "Risks",
    zhDir: "src/BREAK/risks",
    enDir: "src/i18n/en/BREAK/risks",
    fields: ["title", "keywords", "definition", "description", "complexity", "influence", "references", "riskAssessment"],
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
    name: "BusinessDomains",
    zhDir: "src/BREAK/business-domains",
    enDir: "src/i18n/en/BREAK/business-domains",
    fields: ["title", "description", "riskDimensions", "riskScenes"],
    businessDomain: true,
  },
  {
    name: "Cases",
    zhDir: "src/BREAK/cases",
    enDir: "src/i18n/en/BREAK/cases",
    fields: ["title", "keywords", "summary", "references"],
  },
];

let hasErrors = false;

function checkReferenceTranslations(issues, category, key, entity, zhEntity) {
  if (!Object.prototype.hasOwnProperty.call(entity, "references")) return;
  if (!Array.isArray(entity.references)) {
    issues.push(`${category.name}.${key}.references 必须是数组`);
    return;
  }
  // 检查中英文 references 数组长度一致性，防止按索引合并时错配 title ↔ link
  if (zhEntity && Array.isArray(zhEntity.references)) {
    if (entity.references.length !== zhEntity.references.length) {
      issues.push(
        `${category.name}.${key}.references 长度不一致: 中文 ${zhEntity.references.length} 条, 英文 ${entity.references.length} 条`
      );
    }
  } else if (zhEntity && !Array.isArray(zhEntity.references)) {
    // 中文实体无 references 但英文有：英文 references 成孤儿（mergeWithStructure 无中文基底可合并）
    issues.push(
      `${category.name}.${key}.references 在中文源无对应（中文无 references 数组，英文为孤儿数据）`
    );
  }
  entity.references.forEach((reference, index) => {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
      issues.push(`${category.name}.${key}.references[${index}] 必须是对象`);
      return;
    }
    const extraKeys = Object.keys(reference).filter((field) => field !== "title" && field !== "link");
    if (extraKeys.length > 0) {
      issues.push(
        `${category.name}.${key}.references[${index}] 包含结构字段: ${extraKeys.join(", ")}`
      );
    }
  });
}

function checkBusinessDomainTranslations(issues, category, key, entity) {
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

function checkTranslationFields(category, enRecords, zhRecords) {
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

    const zhRecord = zhRecords.get(key);
    const zhEntity = zhRecord?.entity;
    checkReferenceTranslations(issues, category, key, entity, zhEntity);
    if (category.businessDomain) {
      checkBusinessDomainTranslations(issues, category, key, entity);
    }
  }

  return issues;
}

// 白名单元校验：确保 i18n-sync 的 fields 白名单是 schema 字段集的子集，
// 防止白名单含 schema 未定义的幽灵字段（如历史遗留的 Case description）。
// 完全自动推导不可行（references/riskAssessment 的嵌套翻译边界需人工编码），
// 故白名单仍手写，但机器保证白名单 ⊆ schema 字段集。
const { entitySchemas } = await loadSchemaModule();
const metaIssues = [];
for (const cat of categories) {
  const schemaKey = SCHEMA_KEY_BY_CATEGORY[cat.name];
  const schema = entitySchemas[schemaKey];
  if (!schema) {
    metaIssues.push(`${cat.name}: schemaKey "${schemaKey}" 在 entitySchemas 中不存在`);
    continue;
  }
  const schemaFields = getSchemaTopLevelFields(schema);
  const allowedFields = new Set(cat.fields);
  const ghostFields = [...allowedFields].filter((f) => !schemaFields.has(f));
  if (ghostFields.length > 0) {
    metaIssues.push(
      `${cat.name}: i18n 白名单含 schema 未定义字段 ${ghostFields.join(", ")}（白名单必须 ⊆ schema 字段集）`
    );
  }
}

if (metaIssues.length > 0) {
  hasErrors = true;
  console.log("❌ i18n 白名单元校验失败（白名单与 schema 不一致）：");
  for (const issue of metaIssues) console.log(`   - ${issue}`);
  console.log("\n❌ i18n 同步检查失败（白名单元校验未通过）");
  process.exit(1);
}

for (const cat of categories) {
  const zhLoaded = loadDir(cat.zhDir);
  const enLoaded = loadDir(cat.enDir);
  const zhKeys = zhLoaded.keys;
  const enKeys = enLoaded.keys;
  const enRecords = enLoaded.records;
  const zhRecords = zhLoaded.records;

  const missingInEn = [...zhKeys].filter((k) => !enKeys.has(k));
  const extraInEn = [...enKeys].filter((k) => !zhKeys.has(k));
  const fieldIssues = checkTranslationFields(cat, enRecords, zhRecords);

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
