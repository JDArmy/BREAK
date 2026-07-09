/**
 * 实体类型注册表（Entity Registry）—— 全站唯一的实体元信息来源。
 *
 * 所有涉及实体类型元信息的代码（路由参数、i18n 路径、ID 前缀推断、搜索配置等）
 * 应引用此注册表，而非各自硬编码。新增实体类型只需在此处添加一条记录。
 */

/** 实体类型标识（camelCase，全站统一） */
export type EntityType =
  | "risk"
  | "avoidance"
  | "attackTool"
  | "threatActor"
  | "term"
  | "case";

/** 实体注册表单条配置 */
export interface EntityRegistryEntry {
  /** camelCase 类型标识 */
  type: EntityType;
  /** ID 前缀（最长优先匹配），如 ["AT"]、["TA"] */
  idPrefix: string;
  /** 关系图中使用的 kebab-case 类型键，如 "attack-tool"、"threat-actor" */
  relationKey: string;
  /** 路由参数名，如 rKey / aKey / atKey / taKey / tKey / cKey */
  paramKey: string;
  /** BREAK 数据对象的集合键名（复数），同时也是 ReferenceList 的 type prop */
  breakKey: string;
  /** i18n 数据路径前缀，如 "BREAK.risks" */
  i18nPath: string;
  /** i18n 类型标签 key，如 "relationType.risk" */
  typeLabelKey: string;
  /** 知识库列表路由名 */
  listRouteName: string;
  /** 知识库详情路由名 */
  detailRouteName: string;
  /** 首页抽屉路由名 */
  homeDetailRouteName: string;
  /** 业务域抽屉路由名 */
  businessDomainDetailRouteName: string;
  /** 关系图视角路由名（如 "relationRiskEntity"），term/case 无视角留空 */
  relationPerspectiveRouteName: string;
  /** Popover 展示的字段优先级（第一个命中作 definition，第二个作 description） */
  fieldPriority: string[];
  /** 数据来源：'i18n'(走 BREAK+i18n) | 'lazy'(懒加载，如 cases) */
  dataSource: "i18n" | "lazy";
  /** 子编号 ID 正则（可选，如 /^R\d{4}-\d+/），用于关系图子节点识别 */
  childIdPattern?: RegExp;
}

/**
 * 注册表数据。顺序重要：idPrefix 更长的必须排在前面（AT 先于 A，TA 先于 T）。
 */
const REGISTRY: readonly EntityRegistryEntry[] = [
  {
    type: "risk",
    idPrefix: "R",
    relationKey: "risk",
    paramKey: "rKey",
    breakKey: "risks",
    i18nPath: "BREAK.risks",
    typeLabelKey: "relationType.risk",
    listRouteName: "knowledgesRiskList",
    detailRouteName: "knowledgesRiskDetail",
    homeDetailRouteName: "homeRiskDetail",
    businessDomainDetailRouteName: "businessDomainRiskDetail",
    relationPerspectiveRouteName: "relationRiskEntity",
    fieldPriority: ["definition", "description"],
    dataSource: "i18n",
    childIdPattern: /^R\d{4}-\d+/,
  },
  {
    type: "avoidance",
    idPrefix: "A",
    relationKey: "avoidance",
    paramKey: "aKey",
    breakKey: "avoidances",
    i18nPath: "BREAK.avoidances",
    typeLabelKey: "relationType.avoidance",
    listRouteName: "knowledgesAvoidanceList",
    detailRouteName: "knowledgesAvoidanceDetail",
    homeDetailRouteName: "homeAvoidanceDetail",
    businessDomainDetailRouteName: "businessDomainAvoidanceDetail",
    relationPerspectiveRouteName: "relationDefenseCoverageEntity",
    fieldPriority: ["definition", "description"],
    dataSource: "i18n",
    childIdPattern: /^A\d{4}-\d+/,
  },
  {
    type: "attackTool",
    idPrefix: "AT",
    relationKey: "attack-tool",
    paramKey: "atKey",
    breakKey: "attackTools",
    i18nPath: "BREAK.attackTools",
    typeLabelKey: "relationType.attackTool",
    listRouteName: "knowledgesAttackToolList",
    detailRouteName: "knowledgesAttackToolDetail",
    homeDetailRouteName: "homeAttackToolDetail",
    businessDomainDetailRouteName: "businessDomainAttackToolDetail",
    relationPerspectiveRouteName: "relationAttackPathEntity",
    fieldPriority: ["description"],
    dataSource: "i18n",
    childIdPattern: /^AT\d{4}-\d+/,
  },
  {
    type: "threatActor",
    idPrefix: "TA",
    relationKey: "threat-actor",
    paramKey: "taKey",
    breakKey: "threatActors",
    i18nPath: "BREAK.threatActors",
    typeLabelKey: "relationType.threatActor",
    listRouteName: "knowledgesThreatActorList",
    detailRouteName: "knowledgesThreatActorDetail",
    homeDetailRouteName: "homeThreatActorDetail",
    businessDomainDetailRouteName: "businessDomainThreatActorDetail",
    relationPerspectiveRouteName: "relationAttackPathEntity",
    fieldPriority: ["description"],
    dataSource: "i18n",
    childIdPattern: /^TA\d{4}-\d+/,
  },
  {
    type: "term",
    idPrefix: "T",
    relationKey: "term",
    paramKey: "tKey",
    breakKey: "terms",
    i18nPath: "BREAK.terms",
    typeLabelKey: "relationType.term",
    listRouteName: "knowledgesTermList",
    detailRouteName: "knowledgesTermDetail",
    homeDetailRouteName: "homeTermDetail",
    businessDomainDetailRouteName: "businessDomainTermDetail",
    relationPerspectiveRouteName: "",
    fieldPriority: ["definition", "description"],
    dataSource: "i18n",
  },
  {
    type: "case",
    idPrefix: "C",
    relationKey: "case",
    paramKey: "cKey",
    breakKey: "cases",
    i18nPath: "BREAK.cases",
    typeLabelKey: "relationType.case",
    listRouteName: "knowledgesCaseList",
    detailRouteName: "knowledgesCaseDetail",
    homeDetailRouteName: "homeCaseDetail",
    businessDomainDetailRouteName: "",
    relationPerspectiveRouteName: "",
    fieldPriority: ["summary", "description"],
    dataSource: "lazy",
  },
] as const;

// ── 派生查找表（一次性构建，O(1) 查询） ──

/** 按类型查找 */
const byType = new Map<EntityType, EntityRegistryEntry>(
  REGISTRY.map((e) => [e.type, e]),
);

/** 按 breakKey 查找 */
const byBreakKey = new Map<string, EntityRegistryEntry>(
  REGISTRY.map((e) => [e.breakKey, e]),
);

/** 按 relationKey（kebab-case）查找，供关系图模块使用 */
const byRelationKey = new Map<string, EntityRegistryEntry>(
  REGISTRY.map((e) => [e.relationKey, e]),
);

/**
 * ID 前缀 → 类型，按前缀长度降序排列以实现最长前缀优先匹配。
 * AT 匹配先于 A，TA 匹配先于 T。
 */
const prefixesSorted = [...REGISTRY]
  .sort((a, b) => b.idPrefix.length - a.idPrefix.length);

// ── 公共 API ──

/** 注册表完整列表（只读） */
export const entityRegistry: readonly EntityRegistryEntry[] = REGISTRY;

/** 按类型获取注册信息 */
export function getEntityEntry(type: EntityType): EntityRegistryEntry {
  return byType.get(type)!;
}

/** 按 breakKey（如 "risks"）获取注册信息 */
export function getEntityEntryByBreakKey(breakKey: string): EntityRegistryEntry | undefined {
  return byBreakKey.get(breakKey);
}

/** 按 relationKey（如 "attack-tool"）获取注册信息，供关系图模块使用 */
export function getEntityEntryByRelationKey(relationKey: string): EntityRegistryEntry | undefined {
  return byRelationKey.get(relationKey);
}

/**
 * 从 ID 前缀推断实体类型。
 * 最长前缀优先：AT 先于 A，TA 先于 T。返回 null 表示无法识别。
 */
export function inferEntityType(id: string): EntityType | null {
  for (const entry of prefixesSorted) {
    if (id.startsWith(entry.idPrefix)) return entry.type;
  }
  return null;
}

/** 获取实体的 i18n key 前缀，如 `'BREAK.risks.R0001'` */
export function entityI18nPrefix(id: string, type: EntityType): string {
  return `${getEntityEntry(type).i18nPath}.${id}`;
}

/**
 * 全站统一的实体 ID 正则（捕获完整 ID，含子编号）。
 * 从注册表 idPrefix 自动生成，不再手工维护。
 * 每次使用前需 `new RegExp(ENTITY_ID_PATTERN.source, 'g')` 以重置 lastIndex。
 */
export const ENTITY_ID_PATTERN = new RegExp(
  `\\b((?:${prefixesSorted.map((e) => e.idPrefix).join("|")})\\d{4}(?:-\\d{3})?)\\b`,
  "g",
);

/** 所有实体类型列表 */
export const ALL_ENTITY_TYPES: readonly EntityType[] = REGISTRY.map((e) => e.type);
