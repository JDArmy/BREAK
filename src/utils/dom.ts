/**
 * 把当前页面正在滚动的容器平滑滚到顶部。
 *
 * 滚动容器不在 banner 的祖先链上（el-main 是 el-header 的兄弟节点），
 * 因此不能用"从触发元素向上找祖先"的方式。改为：
 * 1. 定位 App 的主内容区 `.el-main`；
 * 2. 在其内部深度优先查找第一个"可见且内容溢出"的可滚动元素
 *    （overflow-y 为 auto/scroll 且 scrollHeight > clientHeight）；
 * 3. 找不到则回退到 `.el-main` 自身，再不行回退到 window。
 *
 * 适配各页面滚动容器：
 * - 知识库列表态 → `.knowledge-list`
 * - 知识库详情态 → `.knowledge-detail`
 * - 首页 / 关系图谱 / 业务域 → `.el-main`
 */
export function scrollActiveContainerToTop(): void {
  const SCROLL_RE = /^(auto|scroll)$/;
  const isScrollable = (el: HTMLElement): boolean => {
    if (el.scrollHeight <= el.clientHeight + 1) return false;
    const style = getComputedStyle(el);
    return SCROLL_RE.test(style.overflowY);
  };

  // 在 root 子树内深度优先找第一个可见可滚动元素
  const findScrollable = (root: HTMLElement): HTMLElement | null => {
    const stack: HTMLElement[] = [root];
    while (stack.length) {
      const node = stack.shift()!;
      // 跳过 display:none / visibility:hidden 的子树
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (node !== root && isScrollable(node)) return node;
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        if (child instanceof HTMLElement) stack.unshift(child);
      }
    }
    return null;
  };

  const main = document.querySelector<HTMLElement>(".el-main");
  const target =
    (main && findScrollable(main)) ||
    (main && isScrollable(main) ? main : null);

  if (target) {
    target.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
