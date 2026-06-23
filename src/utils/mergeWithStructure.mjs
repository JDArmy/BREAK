const replaceArrayTranslationKeys = new Set(["keywords", "aliases"]);

/**
 * 以结构源为基底，用翻译层覆盖可翻译字段。
 * 关系、ID 数组、references[].link、updated 等结构字段必须来自结构源。
 */
export function mergeWithStructure(structure, translations, key) {
  if (replaceArrayTranslationKeys.has(key ?? "") && Array.isArray(structure)) {
    return Array.isArray(translations) ? translations : [];
  }
  if (translations === undefined || translations === null) return structure;
  if (structure === undefined || structure === null) return translations;
  if (typeof structure !== "object") return translations;
  if (typeof translations !== "object") return translations;

  if (Array.isArray(structure)) {
    if (!Array.isArray(translations)) return structure;
    return structure.map((item, idx) =>
      idx < translations.length
        ? mergeWithStructure(item, translations[idx])
        : item
    );
  }
  if (Array.isArray(translations)) return translations;

  const result = { ...structure };
  for (const arrayKey of replaceArrayTranslationKeys) {
    const structVal = structure[arrayKey];
    if (Array.isArray(structVal) && !(arrayKey in translations)) {
      result[arrayKey] = [];
    }
  }

  for (const [key, transVal] of Object.entries(translations)) {
    const structVal = structure[key];
    if (Array.isArray(transVal) && Array.isArray(structVal)) {
      result[key] = replaceArrayTranslationKeys.has(key)
        ? transVal
        : structVal.map((item, idx) =>
            idx < transVal.length
              ? mergeWithStructure(item, transVal[idx], key)
              : item
          );
    } else if (
      typeof transVal === "object" &&
      transVal !== null &&
      !Array.isArray(transVal) &&
      typeof structVal === "object" &&
      structVal !== null &&
      !Array.isArray(structVal)
    ) {
      result[key] = mergeWithStructure(structVal, transVal, key);
    } else {
      result[key] = transVal;
    }
  }

  return result;
}
