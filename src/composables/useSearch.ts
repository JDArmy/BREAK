import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Fuse from "fuse.js";
import BREAK from "@/BREAK";

/** 实体类型 */
export type EntityType = "risk" | "avoidance" | "attackTool" | "threatActor";

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
}

/** 可索引的实体数据 */
interface IndexableItem {
  id: string;
  title: string;
  definition?: string;
  description?: string;
  influence?: string;
  limitation?: string;
}

/** 各类型的 Fuse 索引配置 */
const FUSE_CONFIGS: Record<
  EntityType,
  { keys: { name: string; weight: number }[]; i18nPath: string; idKey: string }
> = {
  risk: {
    keys: [
      { name: "title", weight: 2 },
      { name: "definition", weight: 1.5 },
      { name: "description", weight: 1 },
      { name: "influence", weight: 0.5 },
      { name: "id", weight: 0.3 },
    ],
    i18nPath: "BREAK.risks",
    idKey: "rKey",
  },
  avoidance: {
    keys: [
      { name: "title", weight: 2 },
      { name: "definition", weight: 1.5 },
      { name: "description", weight: 1 },
      { name: "limitation", weight: 0.5 },
      { name: "id", weight: 0.3 },
    ],
    i18nPath: "BREAK.avoidances",
    idKey: "aKey",
  },
  attackTool: {
    keys: [
      { name: "title", weight: 2 },
      { name: "description", weight: 1 },
      { name: "id", weight: 0.3 },
    ],
    i18nPath: "BREAK.attackTools",
    idKey: "atKey",
  },
  threatActor: {
    keys: [
      { name: "title", weight: 2 },
      { name: "description", weight: 1 },
      { name: "id", weight: 0.3 },
    ],
    i18nPath: "BREAK.threatActors",
    idKey: "taKey",
  },
};

/** 各类型对应的 BREAK 数据 key */
const BREAK_KEYS: Record<EntityType, keyof typeof BREAK> = {
  risk: "risks",
  avoidance: "avoidances",
  attackTool: "attackTools",
  threatActor: "threatActors",
};

/** 通过点分隔路径获取嵌套属性值 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((o, k) => (o as Record<string, unknown>)?.[k], obj);
}

/** 从 i18n messages 构建可索引的实体列表 */
function buildIndexableItems(
  type: EntityType,
  localeMessages: Record<string, unknown>
): IndexableItem[] {
  const config = FUSE_CONFIGS[type];
  const breakCategory = BREAK[BREAK_KEYS[type]] as Record<string, unknown>;
  const i18nCategory = getNestedValue(localeMessages, config.i18nPath) as
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
      definition: (i18nEntity.definition as string) || undefined,
      description: (i18nEntity.description as string) || undefined,
      influence: (i18nEntity.influence as string) || undefined,
      limitation: (i18nEntity.limitation as string) || undefined,
    });
  }
  return items;
}

/** 从 Fuse matches 中提取匹配片段 */
export function extractSnippetForSearch(
  item: IndexableItem,
  matches: readonly Fuse.FuseResultMatch[] | undefined,
  query: string
): string {
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
    const searchableFields = ["title", "definition", "description", "influence", "limitation"] as const;
    for (const fieldName of searchableFields) {
      const fieldValue = item[fieldName];
      if (!fieldValue) continue;

      const matchIndex = fieldValue.toLowerCase().indexOf(normalizedQuery);
      if (matchIndex >= 0) return createSnippet(fieldValue, matchIndex);
    }
  }

  if (!matches || matches.length === 0) return fallback;

  // 取第一个匹配字段，提取包含匹配的片段
  const firstMatch = matches[0];
  const fieldName = firstMatch.key as string;
  const fieldValue = (item as Record<string, unknown>)[fieldName] as string;
  if (!fieldValue) return fallback;

  // 截取匹配位置附近的文本（前后各 30 字符）
  const indices = firstMatch.indices;
  if (!indices || indices.length === 0) return fieldValue.substring(0, 80);

  const [start] = indices[0];
  return createSnippet(fieldValue, start);
}

export function useSearch() {
  const { locale, messages } = useI18n();

  // 惰性构建的 Fuse 实例缓存
  const fuseInstances = ref<Record<EntityType, Fuse<IndexableItem>> | null>(
    null
  );

  /** 构建/重建搜索索引 */
  function buildIndex() {
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    const instances: Record<EntityType, Fuse<IndexableItem>> = {} as Record<
      EntityType,
      Fuse<IndexableItem>
    >;

    for (const type of Object.keys(FUSE_CONFIGS) as EntityType[]) {
      const config = FUSE_CONFIGS[type];
      const items = buildIndexableItems(type, localeMessages);

      instances[type] = new Fuse(items, {
        keys: config.keys,
        threshold: 0.4, // 宽松阈值，支持模糊匹配
        includeMatches: true,
        minMatchCharLength: 2,
      });
    }

    fuseInstances.value = instances;
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
    };

    if (!query.trim() || !fuseInstances.value) return results;

    for (const type of Object.keys(FUSE_CONFIGS) as EntityType[]) {
      const fuse = fuseInstances.value[type];
      const fuseResults = fuse.search(query, { limit: 5 });

      results[type] = fuseResults.map((r) => ({
        id: r.item.id,
        type,
        title: r.item.title,
        snippet: extractSnippetForSearch(r.item, r.matches, query),
      }));
    }

    return results;
  }

  // locale 变化时重建索引
  watch(locale, () => {
    fuseInstances.value = null;
  });

  return { search };
}
