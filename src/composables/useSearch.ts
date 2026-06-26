import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Fuse from "fuse.js";
import type { FuseResultMatch } from "fuse.js";
import BREAK from "@/BREAK";
import { useCases } from "@/composables/useCases";
import { getMessageStringArray, getNestedMessageValue } from "@/utils/i18nMessage";
import { type EntityType, entityRegistry, getEntityEntry } from "@/BREAK/entityRegistry";

/**
 * 全文搜索功能
 *
 * 基于 Fuse.js 的模糊搜索，支持中英文双语、关键词匹配、语言切换响应式更新。
 *
 * @example
 * ```ts
 * const { search } = useSearch()
 * const results = search('钓鱼攻击')
 * // results.risk -> 风险类搜索结果
 * // results.avoidance -> 规避手段类搜索结果
 * ```
 */

// EntityType 从 entityRegistry 统一导出
export type { EntityType };

/** 搜索结果条目 */
export interface SearchResult {
  /** 实体 ID，如 R0001、AT0001 */
  id: string;
  /** 实体类型 */
  type: EntityType;
  /** 实体标题（当前语言） */
  title: string;
  /** 匹配摘要（截取匹配片段） */
  snippet?: string;
  /** 命中的字段名（用于 UI 展示匹配来源） */
  matchedField?: string;
}

/** 可索引的实体数据 */
interface IndexableItem {
  id: string;
  title: string;
  keywords?: string[];
  aliases?: string[];
  category?: string;
  definition?: string;
  description?: string;
  influence?: string;
  limitation?: string;
  usageExample?: string;
  summary?: string;
  referenceTitles?: string[];
}

/** 各类型的 Fuse 索引配置（i18nPath/idKey 从 entityRegistry 派生） */
const FUSE_CONFIGS: Record<
  EntityType,
  { keys: { name: string; weight: number }[]; i18nPath: string; idKey: string }
> = {
  risk: {
    keys: [
      { name: "id", weight: 2.2 },
      { name: "title", weight: 2 },
      { name: "keywords", weight: 1.6 },
      { name: "definition", weight: 1.5 },
      { name: "description", weight: 1 },
      { name: "influence", weight: 0.5 },
      { name: "referenceTitles", weight: 0.4 },
    ],
    i18nPath: getEntityEntry("risk").i18nPath,
    idKey: getEntityEntry("risk").paramKey,
  },
  avoidance: {
    keys: [
      { name: "id", weight: 2.2 },
      { name: "title", weight: 2 },
      { name: "keywords", weight: 1.6 },
      { name: "definition", weight: 1.5 },
      { name: "description", weight: 1 },
      { name: "limitation", weight: 0.5 },
      { name: "referenceTitles", weight: 0.4 },
    ],
    i18nPath: getEntityEntry("avoidance").i18nPath,
    idKey: getEntityEntry("avoidance").paramKey,
  },
  attackTool: {
    keys: [
      { name: "id", weight: 2.2 },
      { name: "title", weight: 2 },
      { name: "keywords", weight: 1.6 },
      { name: "description", weight: 1 },
      { name: "referenceTitles", weight: 0.4 },
    ],
    i18nPath: getEntityEntry("attackTool").i18nPath,
    idKey: getEntityEntry("attackTool").paramKey,
  },
  threatActor: {
    keys: [
      { name: "id", weight: 2.2 },
      { name: "title", weight: 2 },
      { name: "keywords", weight: 1.6 },
      { name: "description", weight: 1 },
      { name: "referenceTitles", weight: 0.4 },
    ],
    i18nPath: getEntityEntry("threatActor").i18nPath,
    idKey: getEntityEntry("threatActor").paramKey,
  },
  term: {
    keys: [
      { name: "id", weight: 2.2 },
      { name: "title", weight: 2.1 },
      { name: "keywords", weight: 1.8 },
      { name: "aliases", weight: 1.6 },
      { name: "definition", weight: 1.4 },
      { name: "description", weight: 1 },
      { name: "category", weight: 0.8 },
      { name: "usageExample", weight: 0.7 },
      { name: "referenceTitles", weight: 0.4 },
    ],
    i18nPath: getEntityEntry("term").i18nPath,
    idKey: getEntityEntry("term").paramKey,
  },
  case: {
    keys: [
      { name: "id", weight: 2.2 },
      { name: "title", weight: 2 },
      { name: "keywords", weight: 1.6 },
      { name: "summary", weight: 1.2 },
      { name: "description", weight: 1 },
      { name: "category", weight: 0.6 },
      { name: "referenceTitles", weight: 0.4 },
    ],
    i18nPath: getEntityEntry("case").i18nPath,
    idKey: getEntityEntry("case").paramKey,
  },
};

/** 各类型对应的 BREAK 数据 key（case 除外，case 懒加载由 useCases 提供，从 entityRegistry 派生） */
const BREAK_KEYS: Record<Exclude<EntityType, "case">, keyof typeof BREAK> =
  Object.fromEntries(
    entityRegistry
      .filter((e) => e.dataSource !== "lazy")
      .map((e) => [e.type, e.breakKey]),
  ) as Record<Exclude<EntityType, "case">, keyof typeof BREAK>;

/** 从 i18n references 数据中提取标题数组 */
function extractReferenceTitles(refs: unknown): string[] | undefined {
  if (!Array.isArray(refs)) return undefined;
  const titles = refs
    .map((r) => (typeof r === "object" && r !== null ? (r as Record<string, unknown>).title : undefined))
    .filter((t): t is string => typeof t === "string" && t.length > 0);
  return titles.length > 0 ? titles : undefined;
}

/** 从 i18n messages 构建可索引的实体列表（case 类型走 casesData 直接构建） */
function buildIndexableItems(
  type: EntityType,
  localeMessages: Record<string, unknown>,
  casesData?: Record<string, { title?: string; keywords?: string[]; summary?: string; description?: string; category?: string; references?: { title: string }[] }>
): IndexableItem[] {
  const config = FUSE_CONFIGS[type];

  // case 懒加载：从 useCases 提供的合并数据直接构建（不走 i18n BREAK.cases）
  if (type === "case") {
    if (!casesData) return [];
    const items: IndexableItem[] = [];
    for (const [id, c] of Object.entries(casesData)) {
      items.push({
        id,
        title: c.title || "",
        keywords: c.keywords || [],
        summary: c.summary,
        description: c.description,
        category: c.category,
        referenceTitles: c.references?.map(r => r.title).filter(Boolean),
      });
    }
    return items;
  }

  const breakCategory = BREAK[BREAK_KEYS[type as Exclude<EntityType, "case">]] as Record<string, unknown>;
  const i18nCategory = getNestedMessageValue(localeMessages, config.i18nPath) as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!i18nCategory || !breakCategory) return [];

  const items: IndexableItem[] = [];
  for (const id of Object.keys(breakCategory)) {
    const i18nEntity = i18nCategory[id];
    if (!i18nEntity) continue;

    items.push({
      id,
      title: (i18nEntity.title as string) || "",
      keywords: getMessageStringArray(
        localeMessages,
        `${config.i18nPath}.${id}.keywords`
      ),
      definition: (i18nEntity.definition as string) || undefined,
      description: (i18nEntity.description as string) || undefined,
      influence: (i18nEntity.influence as string) || undefined,
      limitation: (i18nEntity.limitation as string) || undefined,
      aliases: getMessageStringArray(
        localeMessages,
        `${config.i18nPath}.${id}.aliases`
      ),
      category: (i18nEntity.category as string) || undefined,
      usageExample: (i18nEntity.usageExample as string) || undefined,
      summary: (i18nEntity.summary as string) || undefined,
      referenceTitles: extractReferenceTitles(i18nEntity.references),
    });
  }
  return items;
}

/** 从 Fuse matches 中提取匹配片段及命中字段名 */
export function extractSnippetForSearch(
  item: IndexableItem,
  matches: readonly FuseResultMatch[] | undefined,
  query: string
): { snippet: string; matchedField?: string } {
  const fallback = item.description || item.definition || "";
  const normalizedQuery = query.trim().toLowerCase();
  const snippetRadiusBefore = 12;
  const snippetRadiusAfter = 36;

  const createSnippet = (fieldValue: string, start: number) => {
    const snippetStart = Math.max(0, start - snippetRadiusBefore);
    const snippetEnd = Math.min(fieldValue.length, start + query.trim().length + snippetRadiusAfter);
    let snippet = fieldValue.substring(snippetStart, snippetEnd);
    if (snippetStart > 0) snippet = "..." + snippet;
    if (snippetEnd < fieldValue.length) snippet = snippet + "...";
    return snippet;
  };

  if (normalizedQuery) {
    const searchableFields = [
      "title",
      "keywords",
      "aliases",
      "category",
      "definition",
      "description",
      "influence",
      "limitation",
      "usageExample",
      "summary",
      "referenceTitles",
    ] as const;
    for (const fieldName of searchableFields) {
      const fieldValue = item[fieldName];
      if (!fieldValue) continue;

      if (Array.isArray(fieldValue)) {
        const keywordHit = fieldValue.find((keyword) =>
          keyword.toLowerCase().includes(normalizedQuery)
        );
        if (keywordHit) return { snippet: keywordHit, matchedField: fieldName };
        continue;
      }

      const matchIndex = fieldValue.toLowerCase().indexOf(normalizedQuery);
      if (matchIndex >= 0) return { snippet: createSnippet(fieldValue, matchIndex), matchedField: fieldName };
    }
  }

  if (!matches || matches.length === 0) return { snippet: fallback };

  // 取第一个匹配字段，提取包含匹配的片段
  const firstMatch = matches[0];
  const fieldName = firstMatch.key as keyof IndexableItem;
  const fieldValue = item[fieldName];
  if (!fieldValue) return { snippet: fallback };

  if (Array.isArray(fieldValue)) {
    const keywordHit = fieldValue.find((keyword) =>
      keyword.toLowerCase().includes(normalizedQuery)
    );
    return { snippet: keywordHit || fieldValue[0] || fallback, matchedField: fieldName as string };
  }

  // 截取匹配位置附近的文本（前后各 30 字符）
  const indices = firstMatch.indices;
  if (!indices || indices.length === 0) return { snippet: fieldValue.substring(0, 80), matchedField: fieldName as string };

  const [start] = indices[0];
  return { snippet: createSnippet(fieldValue, start), matchedField: fieldName as string };
}

export function useSearch() {
  const { locale, messages } = useI18n();
  const { cases } = useCases();

  // 惰性构建的 Fuse 实例缓存（按类型独立管理，避免全量重建）
  const fuseInstances = ref<Record<EntityType, Fuse<IndexableItem>> | null>(
    null
  );

  /** 构建单个类型的 Fuse 索引 */
  function buildTypeIndex(type: EntityType, localeMessages: Record<string, unknown>): Fuse<IndexableItem> {
    const config = FUSE_CONFIGS[type];
    const items = buildIndexableItems(
      type,
      localeMessages,
      type === "case" ? cases.value : undefined
    );
    return new Fuse(items, {
      keys: config.keys,
      threshold: 0.4, // 宽松阈值，支持模糊匹配
      includeMatches: true,
      minMatchCharLength: 1,
    });
  }

  /** 构建全部索引 */
  function buildIndex() {
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    const instances: Record<EntityType, Fuse<IndexableItem>> = {} as Record<
      EntityType,
      Fuse<IndexableItem>
    >;

    for (const type of Object.keys(FUSE_CONFIGS) as EntityType[]) {
      instances[type] = buildTypeIndex(type, localeMessages);
    }

    fuseInstances.value = instances;
  }

  /** 仅重建指定类型的索引，不影响其他类型 */
  function rebuildTypeIndex(type: EntityType) {
    if (!fuseInstances.value) return;
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    fuseInstances.value = {
      ...fuseInstances.value,
      [type]: buildTypeIndex(type, localeMessages),
    };
  }

  /** 仅重建非 case 类型的索引（locale 变化时，case 数据不受 i18n 消息影响） */
  function rebuildNonCaseIndexes() {
    if (!fuseInstances.value) return;
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    const updated = { ...fuseInstances.value };
    for (const type of Object.keys(FUSE_CONFIGS) as EntityType[]) {
      if (type !== "case") {
        updated[type] = buildTypeIndex(type, localeMessages);
      }
    }
    fuseInstances.value = updated;
  }

  /** 确保索引已构建 */
  function ensureIndex() {
    if (!fuseInstances.value) buildIndex();
  }

  /** 执行搜索，返回按类型分组的结果 */
  function search(query: string): Record<EntityType, SearchResult[]> {
    ensureIndex();

    const results: Record<EntityType, SearchResult[]> = {
      risk: [],
      avoidance: [],
      attackTool: [],
      threatActor: [],
      term: [],
      case: [],
    };

    if (!query.trim() || !fuseInstances.value) return results;

    for (const type of Object.keys(FUSE_CONFIGS) as EntityType[]) {
      const fuse = fuseInstances.value[type];
      const fuseResults = fuse.search(query, { limit: 5 });

      results[type] = fuseResults.map((r) => {
        const { snippet, matchedField } = extractSnippetForSearch(r.item, r.matches, query);
        return {
          id: r.item.id,
          type,
          title: r.item.title,
          snippet,
          matchedField,
        };
      });
    }

    return results;
  }

  // locale 变化时仅重建非 case 索引（case 数据由 useCases 管理，
  // locale 变化时 useCases 会独立触发 cases ref 更新，由下方 watch(cases) 处理）
  watch(locale, () => {
    if (fuseInstances.value) {
      rebuildNonCaseIndexes();
    }
  });

  // cases 懒加载完成或 locale 切换合并后仅重建 case 索引
  watch(cases, () => {
    if (fuseInstances.value) {
      rebuildTypeIndex("case");
    }
  }, { deep: false });

  return { search };
}
