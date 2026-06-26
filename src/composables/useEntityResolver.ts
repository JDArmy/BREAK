/**
 * 实体信息解析 composable：根据实体 ID 获取标题、定义、描述等摘要信息。
 *
 * - 通过 i18n `t()` / `te()` 获取翻译后文本，语言切换时自动响应
 * - Case 类型首次访问时触发懒加载（不阻塞，数据就绪后响应式刷新）
 * - 返回 `resolve(id)` 用于 Popover 卡片内容填充
 */

import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useCases } from "@/composables/useCases";
import {
  inferEntityType,
  entityI18nPrefix,
  entityDetailHref,
  type EntityType,
} from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";

/** Popover 中展示的实体摘要信息 */
export interface EntitySummary {
  id: string;
  type: EntityType;
  /** 人类可读的类型标签，如"风险" / "Risk" */
  typeLabel: string;
  title: string;
  /** 首要描述 —— 优先 definition，Case 取 summary，无 definition 取 description 截断 */
  definition: string | null;
  /** 次要描述（截断） */
  description: string | null;
  /** 详情页 href（含 # 前缀），供 `<a :href>` 使用 */
  href: string | null;
  /** 实体是否存在于数据集中 */
  exists: boolean;
}

/** 描述文本截断长度 */
const DESC_MAX_LEN = 120;

function truncate(s: string | undefined | null, max = DESC_MAX_LEN): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function useEntityResolver() {
  const { t, te } = useI18n();
  const router = useRouter();
  const { cases, loaded, ensureCases } = useCases();

  /**
   * 检查实体是否存在于数据集中。
   * 非 case 类型通过 i18n te() 判断（BREAK 数据注入 i18n 后等价于 id in BREAK[collection]）。
   * Case 未加载时返回 false，不触发加载。
   */
  function entityExists(id: string, type: EntityType): boolean {
    const entry = getEntityEntry(type);
    if (entry.dataSource === "lazy") {
      return loaded.value ? id in cases.value : false;
    }
    // BREAK 数据通过 i18n 动态注入，te(prefix.title) 与 id in BREAK[collection] 等价
    return te(`${entityI18nPrefix(id, type)}.title`);
  }

  /**
   * 解析实体摘要信息（同步，用于 Popover 内容）。
   * Case 类型首次调用时触发懒加载，返回 exists: false 直到数据就绪。
   */
  function resolve(id: string): EntitySummary | null {
    const type = inferEntityType(id);
    if (!type) return null;

    const entry = getEntityEntry(type);

    // 懒加载数据源：触发加载（不阻塞，Promise 忽略）
    if (entry.dataSource === "lazy" && !loaded.value) {
      void ensureCases();
    }

    const prefix = entityI18nPrefix(id, type);
    const exists = entityExists(id, type);

    // 类型标签
    const typeLabel = te(entry.typeLabelKey) ? t(entry.typeLabelKey) : type;

    // 标题
    const titleKey = `${prefix}.title`;
    const title = exists && te(titleKey) ? t(titleKey) : id;

    // 按字段优先级提取 definition / description
    let definition: string | null = null;
    let description: string | null = null;

    if (exists) {
      for (const field of entry.fieldPriority) {
        const key = `${prefix}.${field}`;
        if (te(key)) {
          const val = t(key);
          if (val && val !== key) {
            // 避免 vue-i18n 返回 key 本身（表示翻译缺失）
            if (!definition) {
              definition = truncate(val);
            } else if (!description) {
              description = truncate(val);
              break;
            }
          }
        }
      }
    }

    return {
      id,
      type,
      typeLabel,
      title,
      definition,
      description,
      href: entityDetailHref(router, id, type),
      exists,
    };
  }

  return { resolve, entityExists };
}
