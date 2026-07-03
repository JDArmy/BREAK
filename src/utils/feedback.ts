// GitHub issue 新建 URL 构造。owner/repo 集中维护，避免散落硬编码。
export const GITHUB_REPO = "JDArmy/BREAK";
export const GITHUB_ISSUES_NEW = `https://github.com/${GITHUB_REPO}/issues/new`;

export interface IssuePrefill {
  /** 实体 ID，如 R0001 / C0002 */
  entityId: string;
  /** 实体标题（中文，已由调用方从 i18n 或对象取好） */
  entityTitle: string;
  /** 实体类型中文名，如"风险"/"案例" */
  entityTypeLabel: string;
  /** 当前页面 URL（可选，便于在 issue 中定位来源页面） */
  pageUrl?: string;
}

/**
 * 构造预填好 title/body/labels 的 GitHub issue 新建链接。
 * URLSearchParams 自动做 URL 编码。
 */
export function buildIssueUrl(prefill: IssuePrefill): string {
  const title = `[${prefill.entityTypeLabel}] ${prefill.entityId}: ${prefill.entityTitle}`;
  const body = [
    `## 实体信息`,
    `- 类型：${prefill.entityTypeLabel}`,
    `- ID：${prefill.entityId}`,
    `- 标题：${prefill.entityTitle}`,
    prefill.pageUrl ? `- 页面：${prefill.pageUrl}` : null,
    ``,
    `## 反馈/纠正内容`,
    `<!-- 请描述问题或建议修改的内容 -->`,
    ``,
    ``,
    `## 来源/依据（可选）`,
    `<!-- 如有参考资料请补充链接 -->`,
  ]
    .filter((line) => line !== null)
    .join("\n");
  const params = new URLSearchParams({ title, body, labels: "feedback" });
  return `${GITHUB_ISSUES_NEW}?${params.toString()}`;
}
