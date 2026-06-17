import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const categories = [
  {
    name: "Risks",
    zhDir: "src/BREAK/risks",
    enDir: "src/i18n/en/BREAK/risks",
    fields: ["title", "definition", "description", "complexity", "influence", "keywords"],
  },
  {
    name: "Avoidances",
    zhDir: "src/BREAK/avoidances",
    enDir: "src/i18n/en/BREAK/avoidances",
    fields: ["title", "definition", "description", "limitation", "keywords"],
  },
  {
    name: "AttackTools",
    zhDir: "src/BREAK/attack-tools",
    enDir: "src/i18n/en/BREAK/attack-tools",
    fields: ["title", "description", "keywords"],
  },
  {
    name: "ThreatActors",
    zhDir: "src/BREAK/threat-actors",
    enDir: "src/i18n/en/BREAK/threat-actors",
    fields: ["title", "description", "keywords"],
  },
  {
    name: "Terms",
    zhDir: "src/BREAK/terms",
    enDir: "src/i18n/en/BREAK/terms",
    fields: ["title", "definition", "description", "usageExample", "keywords", "aliases", "category"],
  },
  {
    name: "BusinessScenes",
    zhDir: "src/BREAK/business-scenes",
    enDir: "src/i18n/en/BREAK/business-scenes",
    fields: ["title", "description"],
    checkBusinessSceneNestedTitles: true,
  },
];

const replaceArrayTranslationKeys = new Set(["keywords", "aliases"]);
const generatedKeywordSuffixes = [
  "control",
  "controls",
  "risk",
  "detection",
  "governance",
  "monitoring",
  "policy",
  "mitigation",
  "indicators",
  "pattern",
];

function loadJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function mergeWithStructure(structure, translations, key) {
  if (replaceArrayTranslationKeys.has(key ?? "") && Array.isArray(structure)) {
    return Array.isArray(translations) ? translations : [];
  }
  if (translations === undefined || translations === null) return structure;
  if (structure === undefined || structure === null) return translations;
  if (typeof structure !== "object") return translations;
  if (typeof translations !== "object") return translations;

  if (Array.isArray(structure)) {
    if (!Array.isArray(translations)) return structure;
    return structure.map((item, index) =>
      index < translations.length ? mergeWithStructure(item, translations[index], key) : item
    );
  }
  if (Array.isArray(translations)) return translations;

  const result = { ...structure };
  for (const arrayKey of replaceArrayTranslationKeys) {
    if (Array.isArray(structure[arrayKey]) && !(arrayKey in translations)) {
      result[arrayKey] = [];
    }
  }
  for (const [key, translatedValue] of Object.entries(translations)) {
    const structureValue = structure[key];
    if (Array.isArray(translatedValue) && Array.isArray(structureValue)) {
      result[key] = replaceArrayTranslationKeys.has(key)
        ? translatedValue
        : structureValue.map((item, index) =>
            index < translatedValue.length ? mergeWithStructure(item, translatedValue[index], key) : item
          );
    } else if (
      typeof translatedValue === "object" &&
      translatedValue !== null &&
      !Array.isArray(translatedValue) &&
      typeof structureValue === "object" &&
      structureValue !== null &&
      !Array.isArray(structureValue)
    ) {
      result[key] = mergeWithStructure(structureValue, translatedValue, key);
    } else {
      result[key] = translatedValue;
    }
  }
  return result;
}

function hasChineseText(value) {
  return /[\u4e00-\u9fff]/.test(JSON.stringify(value ?? ""));
}

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGeneratedKeyword(value, title) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  if (/\skeyword\s\d+$/i.test(text)) return true;
  if (!title) return false;

  const suffixPattern = generatedKeywordSuffixes.map(escapeRegExp).join("|");
  return new RegExp(`^${escapeRegExp(title)}\\s(?:${suffixPattern})$`, "i").test(text);
}

function isGeneratedAlias(value) {
  return /\salias\s\d+$/i.test(String(value ?? "").trim());
}

function isMissingEnglishValue(zhValue, enValue) {
  if (Array.isArray(zhValue) && zhValue.length === 0) {
    return false;
  }
  return (
    enValue === undefined ||
    enValue === null ||
    enValue === "" ||
    (Array.isArray(enValue) && enValue.length === 0 && Array.isArray(zhValue) && zhValue.length > 0)
  );
}

const issues = [];
let checked = 0;

for (const category of categories) {
  const files = readdirSync(category.zhDir).filter((file) => file.endsWith(".json"));

  for (const file of files) {
    const zhData = loadJson(join(category.zhDir, file));
    const enData = loadJson(join(category.enDir, file));

    for (const [id, zhEntity] of Object.entries(zhData)) {
      checked += 1;
      const enEntity = enData[id];
      if (!enEntity) {
        issues.push(`${category.name}.${id}: missing English translation entity`);
        continue;
      }

      const merged = mergeWithStructure(zhEntity, enEntity);

      for (const field of category.fields) {
        if (zhEntity[field] === undefined) continue;
        if (isMissingEnglishValue(zhEntity[field], enEntity[field])) {
          issues.push(`${category.name}.${id}.${field}: missing English field`);
          continue;
        }
        if (hasChineseText(merged[field])) {
          issues.push(`${category.name}.${id}.${field}: English display value contains Chinese text`);
        }
      }

      for (const keyword of Array.isArray(enEntity.keywords) ? enEntity.keywords : []) {
        if (isGeneratedKeyword(keyword, enEntity.title)) {
          issues.push(`${category.name}.${id}.keywords: generated/template keyword "${keyword}"`);
        }
      }

      for (const alias of Array.isArray(enEntity.aliases) ? enEntity.aliases : []) {
        if (isGeneratedAlias(alias)) {
          issues.push(`${category.name}.${id}.aliases: generated/template alias "${alias}"`);
        }
      }

      if (category.checkBusinessSceneNestedTitles) {
        for (const [key, value] of Object.entries(merged.riskDimensions ?? {})) {
          if (hasChineseText(value.title)) {
            issues.push(`${category.name}.${id}.riskDimensions.${key}.title: English display value contains Chinese text`);
          }
        }
        for (const [key, value] of Object.entries(merged.riskScenes ?? {})) {
          if (hasChineseText(value.title)) {
            issues.push(`${category.name}.${id}.riskScenes.${key}.title: English display value contains Chinese text`);
          }
        }
      }
    }
  }
}

if (issues.length > 0) {
  console.error(`\n❌ English i18n quality check failed, ${issues.length} issue(s) found`);
  for (const issue of issues.slice(0, 120)) {
    console.error(`- ${issue}`);
  }
  if (issues.length > 120) {
    console.error(`... ${issues.length - 120} more issue(s) not shown`);
  }
  process.exit(1);
}

console.log(`✅ English i18n quality check passed (${checked} entities)`);
