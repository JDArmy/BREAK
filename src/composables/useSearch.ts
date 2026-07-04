import type { Ref } from "vue";
import { useI18n } from "vue-i18n";
import { type EntityType } from "@/BREAK/entityRegistry";
import { useCases } from "@/composables/useCases";
import {
  search,
  initSearchIndex,
  extractSnippetForSearch,
  __resetSearchSingleton,
  type SearchResult,
  type IndexableItem,
} from "@/composables/useSearchCore";

/**
 * 全文搜索功能
 *
 * 基于 Fuse.js 的模糊搜索，支持中英文双语、关键词匹配、语言切换响应式更新。
 * 索引与 watcher 为模块级单例（实现见 useSearchCore.ts），多次调用 useSearch() 共享同一份。
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
export type { SearchResult };

/** 可索引的实体数据 */
export type { IndexableItem };

export { extractSnippetForSearch };

export function useSearch() {
  const { locale, messages } = useI18n();
  const { cases } = useCases();
  // 注入全局单例 ref 并注册 watcher（flag 防重）。索引与 watcher 均为模块级单例，
  // 见 useSearchCore.ts。locale/messages 来自 vue-i18n 全局实例，cases 来自 useCases 模块级 ref，
  // 所有调用方注入同一引用，组件卸载不影响响应性。
  initSearchIndex(
    locale,
    messages as Ref<Record<string, unknown>>,
    cases as unknown as Ref<Record<string, unknown>>,
  );
  return { search };
}

// 测试环境暴露单例重置工具
export { __resetSearchSingleton };
