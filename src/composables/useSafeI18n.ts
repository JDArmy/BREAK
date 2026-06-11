import { useI18n } from "vue-i18n";

/**
 * 安全获取 i18n 消息值，绕过 vue-i18n 对 | 管道符的复数解析
 *
 * vue-i18n 的 t() 函数会将 | 当作复数分隔符处理，
 * 导致包含 | 的 title（如"广告推广型网络黑灰产犯罪的治理路径|犯罪行为|犯罪活动"）
 * 被错误截断为 | 后面的部分。
 *
 * 此函数直接从 messages 对象读取值，避免管道符解析问题。
 */
export function useSafeI18n() {
  const { locale, messages } = useI18n();

  /**
   * 安全获取翻译值（不经过 t() 的管道符解析）
   * @param path 点号分隔的 i18n 路径，如 "BREAK.risks.R0001.title"
   */
  function safeT(path: string): string {
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    const value = path.split(".").reduce<unknown>(
      (obj, key) => {
        if (obj === null || obj === undefined) return undefined;
        const o = obj as Record<string, unknown>;
        // 处理数组索引，如 "references[0]" → key="references[0]"
        const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
          const arrKey = arrayMatch[1];
          const idx = parseInt(arrayMatch[2]);
          const arr = o[arrKey];
          if (Array.isArray(arr)) return arr[idx];
          return undefined;
        }
        return o[key];
      },
      localeMessages
    );
    return (value as string) ?? "";
  }

  return { safeT };
}
