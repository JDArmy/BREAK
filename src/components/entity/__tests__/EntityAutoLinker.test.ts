import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ATTR,
  CLS,
  MATCH_SOURCE_ATTR,
  createTermMatcher,
  isInsideSkipZone,
  extractEntityId,
  processTextNode,
  scanSubtree,
  TEXT_RENDERED_CLS,
} from "../autoLinkerCore";

/**
 * EntityAutoLinker 的 handleMutations 防抖逻辑测试。
 *
 * 核心回归保障：连续多次 MutationObserver 回调时，
 * 防抖后的处理函数必须覆盖所有批次的 mutations，
 * 不能因为 clearTimeout 丢失早期批次。
 */
describe("EntityAutoLinker mutation batching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("防抖应收集所有批次的 mutations，不丢失中间批次", () => {
    // 模拟 pendingMutations + handleMutations 的核心逻辑
    let pendingMutations: string[] = [];
    let processedBatch: string[] = [];
    let scanTimer: ReturnType<typeof setTimeout> | null = null;

    function handleMutations(mutations: string[]) {
      pendingMutations.push(...mutations);
      if (scanTimer) clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        processedBatch = [...pendingMutations];
        pendingMutations = [];
      }, 100);
    }

    // 连续 3 次调用（模拟 MutationObserver 快速触发）
    handleMutations(["a", "b"]);
    handleMutations(["c"]);
    handleMutations(["d", "e"]);

    // 防抖 100ms 后执行
    vi.advanceTimersByTime(100);

    // 所有 5 个 mutation 都应被处理，不丢失
    expect(processedBatch).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("防抖期间的旧 mutations 不应因 clearTimeout 丢失", () => {
    let pendingMutations: string[] = [];
    const results: string[][] = [];
    let scanTimer: ReturnType<typeof setTimeout> | null = null;

    function handleMutations(mutations: string[]) {
      pendingMutations.push(...mutations);
      if (scanTimer) clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        results.push([...pendingMutations]);
        pendingMutations = [];
      }, 100);
    }

    // 第一批
    handleMutations(["x"]);
    vi.advanceTimersByTime(50); // 50ms 后还没执行

    // 第二批（在 100ms 防抖期内）
    handleMutations(["y"]);
    vi.advanceTimersByTime(100); // 防抖完成

    // 只执行一次，但包含两批的内容
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(["x", "y"]);
  });
});

// ─── 辅助函数 ─────────────────────────────────────────
/** 创建挂载在 document.body 上的容器，测试后自动清理 */
function createContainer(): HTMLDivElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

function cleanup(container: HTMLElement) {
  container.remove();
}

/** 在容器中创建文本节点并返回 */
function appendText(parent: HTMLElement, text: string): Text {
  const textNode = document.createTextNode(text);
  parent.appendChild(textNode);
  return textNode;
}

// ─── processTextNode 基本功能 ──────────────────────────
describe("processTextNode", () => {
  let container: HTMLDivElement;
  let processed: WeakSet<Text>;

  beforeEach(() => {
    container = createContainer();
    processed = new WeakSet();
  });

  afterEach(() => {
    cleanup(container);
  });

  it("包含实体 ID 的文本节点被正确拆分为 span + 文本", () => {
    const textNode = appendText(container, "参见 R0001 获取详情");
    processTextNode(textNode, processed);

    // 可见副本应为：文本 "参见 " + span(R0001) + 文本 " 获取详情"；
    // 原始文本节点保留在隐藏容器中，供 Vue 后续更新。
    const rendered = container.querySelector(`.${TEXT_RENDERED_CLS}`);
    expect(rendered).not.toBeNull();
    const children = rendered!.childNodes;
    expect(children.length).toBe(3);
    expect(children[0].textContent).toBe("参见 ");

    const span = children[1] as HTMLSpanElement;
    expect(span.tagName).toBe("SPAN");
    expect(span.className).toBe(CLS);
    expect(span.getAttribute(ATTR)).toBe("R0001");
    expect(span.textContent).toBe("R0001");

    expect(children[2].textContent).toBe(" 获取详情");
  });

  it("多个实体 ID 被分别包裹", () => {
    const textNode = appendText(container, "R0001 和 A0002 以及 AT0003");
    processTextNode(textNode, processed);

    const spans = container.querySelectorAll(`.${CLS}`);
    expect(spans.length).toBe(3);
    expect(spans[0].getAttribute(ATTR)).toBe("R0001");
    expect(spans[1].getAttribute(ATTR)).toBe("A0002");
    expect(spans[2].getAttribute(ATTR)).toBe("AT0003");
  });

  it("子编号 ID（如 R0001-001）被正确识别", () => {
    const textNode = appendText(container, "子风险 R0001-001 说明");
    processTextNode(textNode, processed);

    const span = container.querySelector(`.${CLS}`);
    expect(span).not.toBeNull();
    expect(span!.getAttribute(ATTR)).toBe("R0001-001");
  });

  it("不含实体 ID 的文本不被修改", () => {
    const textNode = appendText(container, "这是普通文本，没有任何实体引用");
    const result = processTextNode(textNode, processed);

    expect(result).toBe(false);
    expect(container.childNodes.length).toBe(1);
    expect(container.textContent).toBe("这是普通文本，没有任何实体引用");
  });

  it("已处理节点不重复处理", () => {
    const textNode = appendText(container, "R0001 说明");
    processTextNode(textNode, processed);

    // 获取包裹后的子节点列表快照
    const childCountAfterFirst = container.childNodes.length;

    // 尝试对同一 processed WeakSet 再次处理容器内的新文本节点
    // 由于原 textNode 已在 WeakSet 中，不会重复处理
    const newTextNodes = Array.from(container.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE,
    ) as Text[];
    for (const tn of newTextNodes) {
      // 这些是拆分后的新文本节点（"说明"），它们没有实体 ID，不会产生变化
      processTextNode(tn, processed);
    }

    expect(container.childNodes.length).toBe(childCountAfterFirst);
  });

  it("Vue 更新原始文本节点后应刷新已包裹的可见文本", () => {
    const matcher = createTermMatcher([
      { id: "T0001", text: "未授权访问", source: "title" },
    ]);
    const textNode = appendText(container, "R0292 · 提示注入风险");

    processTextNode(textNode, processed, matcher);
    const visibleText = () => container.querySelector(`.${TEXT_RENDERED_CLS}`)?.textContent;
    expect(visibleText()).toBe("R0292 · 提示注入风险");

    // Vue 的虚拟 DOM 仍持有原始 Text 引用，并直接更新其 data。
    textNode.data = "R0293 · 未授权访问风险";
    processed.delete(textNode);
    processTextNode(textNode, processed, matcher);

    expect(visibleText()).toBe("R0293 · 未授权访问风险");
    const rendered = container.querySelector(`.${TEXT_RENDERED_CLS}`);
    expect(rendered?.querySelector(`[${ATTR}="R0293"]`)?.textContent).toBe("R0293");
    expect(rendered?.querySelector(`[${ATTR}="T0001"]`)?.textContent).toBe("未授权访问");
    expect(rendered?.querySelector(`[${ATTR}="R0292"]`)).toBeNull();
  });

  it("Vue 更新为不含实体或术语的文本后不应保留旧内容", () => {
    const matcher = createTermMatcher([
      { id: "T0001", text: "未授权访问", source: "title" },
    ]);
    const textNode = appendText(container, "R0293 · 未授权访问风险");

    processTextNode(textNode, processed, matcher);
    textNode.data = "普通风险说明";
    processed.delete(textNode);
    processTextNode(textNode, processed, matcher);

    const rendered = container.querySelector(`.${TEXT_RENDERED_CLS}`);
    expect(rendered?.textContent).toBe("普通风险说明");
    expect(rendered?.querySelector(`[${ATTR}]`)).toBeNull();
  });

  it("短文本（< 5 字符）不触发正则匹配", () => {
    const textNode = appendText(container, "R001"); // 4 字符，不匹配 \d{4}
    const result = processTextNode(textNode, processed);
    expect(result).toBe(false);
  });

  it("识别术语标题、别名和关键词并复用实体 ID 标记", () => {
    const matcher = createTermMatcher([
      { id: "T0001", text: "撞库", source: "title" },
      { id: "T0002", text: "凭证填充", source: "alias" },
      { id: "T0003", text: "自动化攻击", source: "keyword" },
    ]);
    const textNode = appendText(container, "撞库与凭证填充都可能形成自动化攻击");

    processTextNode(textNode, processed, matcher);

    const spans = container.querySelectorAll(`.${CLS}`);
    expect(Array.from(spans).map((span) => span.getAttribute(ATTR))).toEqual([
      "T0001",
      "T0002",
      "T0003",
    ]);
    expect(Array.from(spans).map((span) => span.textContent)).toEqual([
      "撞库",
      "凭证填充",
      "自动化攻击",
    ]);
    expect(Array.from(spans).map((span) => span.getAttribute(MATCH_SOURCE_ATTR))).toEqual([
      "title",
      "alias",
      "keyword",
    ]);
  });

  it("术语详情页不自动链接当前术语的标题、别名和关键词", () => {
    container.setAttribute("data-current-term-id", "T0001");
    const matcher = createTermMatcher([
      { id: "T0001", text: "神父", source: "title" },
      { id: "T0001", text: "身份证料", source: "alias" },
      { id: "T0001", text: "绕过认证", source: "keyword" },
      { id: "T0002", text: "未授权访问", source: "title" },
    ]);
    const textNode = appendText(container, "神父与身份证料可被用于绕过认证和未授权访问");

    processTextNode(textNode, processed, matcher);

    const spans = container.querySelectorAll(`.${CLS}`);
    expect(Array.from(spans).map((span) => span.getAttribute(ATTR))).toEqual(["T0002"]);
    expect(spans[0].textContent).toBe("未授权访问");
  });

  it("术语匹配优先采用最长词，且不覆盖实体 ID", () => {
    const matcher = createTermMatcher([
      { id: "T0001", text: "设备", source: "title" },
      { id: "T0002", text: "设备指纹", source: "title" },
      { id: "T0003", text: "R0001", source: "title" },
    ]);
    const textNode = appendText(container, "设备指纹用于防护 R0001");

    processTextNode(textNode, processed, matcher);

    const spans = container.querySelectorAll(`.${CLS}`);
    expect(Array.from(spans).map((span) => span.getAttribute(ATTR))).toEqual([
      "T0002",
      "R0001",
    ]);
  });
});

describe("createTermMatcher", () => {
  it("同名冲突按标题、别名、关键词优先级确定归属", () => {
    const matcher = createTermMatcher([
      { id: "T0001", text: "接码平台", source: "title" },
      { id: "T0002", text: "接码平台", source: "keyword" },
    ]);

    expect(matcher.find("使用接码平台")).toEqual([
      { id: "T0001", start: 2, end: 6, source: "title" },
    ]);
  });

  it("最高优先级仍有歧义时不生成错误链接", () => {
    const matcher = createTermMatcher([
      { id: "T0001", text: "身份风险", source: "keyword" },
      { id: "T0002", text: "身份风险", source: "keyword" },
    ]);

    expect(matcher.find("身份风险需要治理")).toEqual([]);
  });

  it("英文术语忽略大小写但遵守单词边界", () => {
    const matcher = createTermMatcher([
      { id: "T0001", text: "Bot", source: "title" },
    ]);

    expect(matcher.find("BOT management")).toEqual([
      { id: "T0001", start: 0, end: 3, source: "title" },
    ]);
    expect(matcher.find("robot management")).toEqual([]);
  });

  it("过滤单字、过短英文和两字关键词", () => {
    const matcher = createTermMatcher([
      { id: "T0001", text: "卡", source: "title" },
      { id: "T0002", text: "AI", source: "title" },
      { id: "T0003", text: "模型", source: "keyword" },
    ]);

    expect(matcher.find("卡 AI 模型")).toEqual([]);
  });
});

// ─── isInsideSkipZone 边界 ─────────────────────────────
describe("isInsideSkipZone", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
  });

  afterEach(() => {
    cleanup(container);
  });

  it("INPUT 内文本被跳过", () => {
    // 用 TEXTAREA 构造含文本子节点的表单祖先
    const form = document.createElement("textarea");
    container.appendChild(form);
    const textDiv = document.createElement("div");
    form.appendChild(textDiv);
    const tn = appendText(textDiv, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it("SELECT 内文本被跳过", () => {
    const select = document.createElement("select");
    container.appendChild(select);
    const option = document.createElement("option");
    select.appendChild(option);
    const tn = appendText(option, "R0001 选项");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it("<code> 内文本被跳过", () => {
    const code = document.createElement("code");
    container.appendChild(code);
    const tn = appendText(code, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it("<pre> 内文本被跳过", () => {
    const pre = document.createElement("pre");
    container.appendChild(pre);
    const tn = appendText(pre, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it("<canvas> 内文本被跳过", () => {
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    // canvas 通常不含文本，但测试标签判断逻辑
    const inner = document.createElement("div");
    canvas.appendChild(inner);
    const tn = appendText(inner, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it(".el-select-dropdown 内文本被跳过", () => {
    const dropdown = document.createElement("div");
    dropdown.className = "el-select-dropdown";
    container.appendChild(dropdown);
    const tn = appendText(dropdown, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it(".el-autocomplete-suggestion 内文本被跳过", () => {
    const suggestion = document.createElement("div");
    suggestion.className = "el-autocomplete-suggestion";
    container.appendChild(suggestion);
    const tn = appendText(suggestion, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it(".el-popover 内文本被跳过", () => {
    const popover = document.createElement("div");
    popover.className = "el-popover";
    container.appendChild(popover);
    const tn = appendText(popover, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it(".entity-popover 内文本被跳过", () => {
    const popover = document.createElement("div");
    popover.className = "entity-popover";
    container.appendChild(popover);
    const tn = appendText(popover, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it(".entity-card 内文本被跳过", () => {
    const card = document.createElement("div");
    card.className = "entity-card";
    container.appendChild(card);
    const tn = appendText(card, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it("[_echarts_instance_] 容器内文本被跳过", () => {
    const chart = document.createElement("div");
    chart.setAttribute("_echarts_instance_", "ec_12345");
    container.appendChild(chart);
    const tn = appendText(chart, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it(".network-chart 内文本被跳过", () => {
    const chart = document.createElement("div");
    chart.className = "network-chart";
    container.appendChild(chart);
    const tn = appendText(chart, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it(".sankey-chart 内文本被跳过", () => {
    const chart = document.createElement("div");
    chart.className = "sankey-chart";
    container.appendChild(chart);
    const tn = appendText(chart, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it(".detail-id 内文本被跳过", () => {
    const el = document.createElement("span");
    el.className = "detail-id";
    container.appendChild(el);
    const tn = appendText(el, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it(".knowledge-list-item 内的 .knowledge-id 允许具体 ID 被包裹", () => {
    const button = document.createElement("button");
    button.className = "knowledge-list-item";
    container.appendChild(button);
    const el = document.createElement("span");
    el.className = "knowledge-id";
    button.appendChild(el);
    const tn = appendText(el, "R0001");
    expect(isInsideSkipZone(tn)).toBe(false);
  });

  it(".el-input 内文本被跳过", () => {
    const el = document.createElement("div");
    el.className = "el-input";
    container.appendChild(el);
    const tn = appendText(el, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it("已包裹的 data-entity-id 容器内被跳过", () => {
    const span = document.createElement("span");
    span.setAttribute(ATTR, "R0001");
    container.appendChild(span);
    const tn = appendText(span, "R0001");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it("普通 <a> 标签内文本被跳过，避免改写普通导航链接", () => {
    const a = document.createElement("a");
    a.href = "#/risks/R0001";
    container.appendChild(a);
    const tn = appendText(a, "R0001: 风险标题");
    expect(isInsideSkipZone(tn)).toBe(true);
  });

  it(".entity-link 内的 <a> 允许路径 A 扫描", () => {
    const wrapper = document.createElement("div");
    wrapper.className = "entity-link";
    container.appendChild(wrapper);
    const a = document.createElement("a");
    wrapper.appendChild(a);
    const tn = appendText(a, "R0001: 风险标题");
    // entity-link 匹配 INTERACTIVE_SELECTOR，<a> 标签 closest 命中 → 允许具体 ID 被包裹
    expect(isInsideSkipZone(tn)).toBe(false);
  });

  it("关联实体外层链接允许内部具体 ID 被包裹", () => {
    const a = document.createElement("a");
    a.className = "risk-relation-item";
    container.appendChild(a);
    const title = document.createElement("span");
    title.className = "risk-relation-title";
    a.appendChild(title);
    const tn = appendText(title, "R0001: 风险标题");

    expect(isInsideSkipZone(tn)).toBe(false);
  });

  it("关系图抽屉关系列表按钮允许内部具体 ID 被包裹", () => {
    const button = document.createElement("button");
    button.className = "node-relation-link";
    container.appendChild(button);
    const id = document.createElement("span");
    id.className = "node-relation-link-id";
    button.appendChild(id);
    const tn = appendText(id, "A0001");

    expect(isInsideSkipZone(tn)).toBe(false);
  });

  it("关系图抽屉节点标题按钮允许内部具体 ID 被包裹", () => {
    const button = document.createElement("button");
    button.className = "node-detail-title";
    container.appendChild(button);
    const id = document.createElement("span");
    id.className = "node-detail-id";
    button.appendChild(id);
    const tn = appendText(id, "A0001");

    expect(isInsideSkipZone(tn)).toBe(false);
  });

  it("关系图抽屉相关实体按钮允许内部具体 ID 被包裹", () => {
    const button = document.createElement("button");
    button.className = "node-related-entity-main";
    container.appendChild(button);
    const id = document.createElement("span");
    id.className = "node-related-entity-id";
    button.appendChild(id);
    const tn = appendText(id, "A0004");

    expect(isInsideSkipZone(tn)).toBe(false);
  });

  it("普通 div 内的文本不被跳过", () => {
    const div = document.createElement("div");
    div.className = "some-content";
    container.appendChild(div);
    const tn = appendText(div, "参见 R0001");
    expect(isInsideSkipZone(tn)).toBe(false);
  });
});

// ─── extractEntityId ──────────────────────────────────
describe("extractEntityId", () => {
  it("提取第一个有效实体 ID", () => {
    expect(extractEntityId("R0001: 流程自动化攻击风险")).toBe("R0001");
  });

  it("从 '关系类型 · ID: 标题' 格式提取", () => {
    expect(extractEntityId("直接造成 · R0042: 资金损失")).toBe("R0042");
  });

  it("提取所有类型前缀", () => {
    expect(extractEntityId("AT0001 电话黑卡")).toBe("AT0001");
    expect(extractEntityId("TA0001 羊毛党")).toBe("TA0001");
    expect(extractEntityId("A0001 人机验证")).toBe("A0001");
    expect(extractEntityId("T0001 账号")).toBe("T0001");
    expect(extractEntityId("C0001 案例")).toBe("C0001");
  });

  it("无实体 ID 返回 null", () => {
    expect(extractEntityId("没有实体引用")).toBeNull();
    expect(extractEntityId("R00 太短")).toBeNull();
  });
});

// ─── scanSubtree ──────────────────────────────────────
describe("scanSubtree", () => {
  let container: HTMLDivElement;
  let processed: WeakSet<Text>;

  beforeEach(() => {
    container = createContainer();
    processed = new WeakSet();
  });

  afterEach(() => {
    cleanup(container);
  });

  it("扫描子树中所有文本节点并包裹实体 ID", () => {
    const div1 = document.createElement("div");
    div1.textContent = "风险 R0001 说明";
    const div2 = document.createElement("div");
    div2.textContent = "手段 A0001 详情";
    container.appendChild(div1);
    container.appendChild(div2);

    scanSubtree(container, processed);

    const spans = container.querySelectorAll(`.${CLS}`);
    expect(spans.length).toBe(2);
    expect(spans[0].getAttribute(ATTR)).toBe("R0001");
    expect(spans[1].getAttribute(ATTR)).toBe("A0001");
  });

  it("skip zone 内的文本不被扫描", () => {
    const code = document.createElement("code");
    code.textContent = "R0001 不应被包裹";
    const div = document.createElement("div");
    div.textContent = "R0002 应被包裹";
    container.appendChild(code);
    container.appendChild(div);

    scanSubtree(container, processed);

    const spans = container.querySelectorAll(`.${CLS}`);
    expect(spans.length).toBe(1);
    expect(spans[0].getAttribute(ATTR)).toBe("R0002");
  });

  it("短文本节点（< 5 字符）被跳过", () => {
    const div = document.createElement("div");
    div.textContent = "R001"; // 4 字符
    container.appendChild(div);

    scanSubtree(container, processed);

    const spans = container.querySelectorAll(`.${CLS}`);
    expect(spans.length).toBe(0);
  });
});

// ─── 性能预算 ─────────────────────────────────────────
describe("DOM 扫描性能预算", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createContainer();
  });

  afterEach(() => {
    cleanup(container);
  });

  it("1000 个含实体 ID 的文本节点扫描耗时 < 200ms", () => {
    for (let i = 0; i < 1000; i++) {
      const div = document.createElement("div");
      const id = `R${String(i).padStart(4, "0")}`;
      div.textContent = `风险 ${id} 的描述说明`;
      container.appendChild(div);
    }

    const processed = new WeakSet<Text>();
    const start = performance.now();
    scanSubtree(container, processed);
    const elapsed = performance.now() - start;

    // happy-dom 比真实浏览器慢，预算设宽松一些
    expect(elapsed).toBeLessThan(200);

    // 验证确实处理了大量节点
    const spans = container.querySelectorAll(`.${CLS}`);
    expect(spans.length).toBe(1000);
  });

  it("500 个混合节点（含 skip zone）扫描不退化", () => {
    for (let i = 0; i < 500; i++) {
      if (i % 5 === 0) {
        // 每 5 个节点放一个 skip zone
        const code = document.createElement("code");
        code.textContent = `R${String(i).padStart(4, "0")} 在代码块内`;
        container.appendChild(code);
      } else {
        const div = document.createElement("div");
        const id = `R${String(i).padStart(4, "0")}`;
        div.textContent = `风险 ${id} 的描述`;
        container.appendChild(div);
      }
    }

    const processed = new WeakSet<Text>();
    const start = performance.now();
    scanSubtree(container, processed);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(200);

    // skip zone 内的不应被包裹（每 5 个有 1 个在 <code> 内）
    const spans = container.querySelectorAll(`.${CLS}`);
    expect(spans.length).toBe(400); // 500 - 100 skip zone 内的
  });
});
