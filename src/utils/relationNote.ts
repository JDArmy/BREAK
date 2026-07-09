/**
 * 关系说明翻译工具。
 *
 * 设计说明：note 字段始终来自中文结构数据（src/BREAK/ 下的 JSON），不会被英文翻译覆盖。
 * 中文 locale 时直接显示原文 note；英文 locale 时，用正则从中文 note 中提取数字/实体名，
 * 然后通过 i18n key 组装英文翻译。如果正则未匹配（新增了中文 note 模式但未更新此文件），
 * 则回退显示中文原文。
 */

import BREAK from "@/BREAK";
import type { AttackToolRelation, AvoidanceRelation, RiskRelation, ThreatActorRelation } from "@/BREAK/types";
import { getEntityEntry, type EntityType } from "@/BREAK/entityRegistry";

type Translate = (key: string, named?: Record<string, unknown>) => string;

function isEnglish(locale: string) {
  return locale.toLowerCase().startsWith("en");
}

function formatParts(parts: string[], t: Translate) {
  return `${parts.join(t("relationNote.separator"))}${t("relationNote.period")}`;
}

function matchCount(note: string, pattern: RegExp) {
  return Number(note.match(pattern)?.[1] || 0);
}

function keyByTitle<T extends { title: string }>(records: Record<string, T>, title: string) {
  return Object.entries(records).find(([, entity]) => entity.title === title)?.[0] || "";
}

function translatedEntityTitle(
  type: EntityType,
  title: string,
  t: Translate,
) {
  const entry = getEntityEntry(type);
  const records = BREAK[entry.breakKey as keyof typeof BREAK] as Record<string, { title: string }>;
  const key = keyByTitle(records, title);
  return key ? t(`${entry.i18nPath}.${key}.title`) : title;
}

function translatedRiskSceneTitle(title: string, t: Translate) {
  for (const [sceneKey, scene] of Object.entries(BREAK.businessDomains.BD00.riskScenes)) {
    if (scene.title === title) {
      return t(`BREAK.businessDomains.BD00.riskScenes.${sceneKey}.title`);
    }
  }
  return title;
}

export function formatAvoidanceRelationNote(
  relation: AvoidanceRelation,
  locale: string,
  t: Translate,
) {
  if (!relation.note || !isEnglish(locale)) return relation.note || "";

  const riskCount = matchCount(relation.note, /共同覆盖 (\d+) 个风险/);
  const attackToolCount = matchCount(relation.note, /共同限制 (\d+) 个攻击工具/);
  const parts = [];
  if (riskCount > 0) parts.push(t("relationNote.avoidanceSharedRisks", { count: riskCount }));
  if (attackToolCount > 0) {
    parts.push(t("relationNote.avoidanceSharedAttackTools", { count: attackToolCount }));
  }

  return parts.length ? formatParts(parts, t) : relation.note;
}

export function formatAttackToolRelationNote(
  relation: AttackToolRelation,
  locale: string,
  t: Translate,
) {
  if (!relation.note || !isEnglish(locale)) return relation.note || "";

  const riskCount = matchCount(relation.note, /共同关联 (\d+) 个风险/);
  const avoidanceCount = matchCount(relation.note, /共享 (\d+) 个规避手段/);
  const actorCount = matchCount(relation.note, /被 (\d+) 个相同行为者使用或建设/);
  const parts = [];
  if (riskCount > 0) parts.push(t("relationNote.attackToolSharedRisks", { count: riskCount }));
  if (avoidanceCount > 0) {
    parts.push(t("relationNote.attackToolSharedAvoidances", { count: avoidanceCount }));
  }
  if (actorCount > 0) parts.push(t("relationNote.attackToolSharedThreatActors", { count: actorCount }));

  return parts.length ? formatParts(parts, t) : relation.note;
}

export function formatThreatActorRelationNote(
  relation: ThreatActorRelation,
  locale: string,
  t: Translate,
) {
  if (!relation.note || !isEnglish(locale)) return relation.note || "";

  const directRiskCount = matchCount(relation.note, /共同直接造成 (\d+) 个风险/);
  const indirectRiskCount = matchCount(relation.note, /共同间接支持 (\d+) 个风险/);
  const buildToolCount = matchCount(relation.note, /共同建设 (\d+) 个攻击工具/);
  const useToolCount = matchCount(relation.note, /共同使用 (\d+) 个攻击工具/);
  const parts = [];
  if (directRiskCount > 0) {
    parts.push(t("relationNote.threatActorSharedDirectRisks", { count: directRiskCount }));
  }
  if (indirectRiskCount > 0) {
    parts.push(t("relationNote.threatActorSharedIndirectRisks", { count: indirectRiskCount }));
  }
  if (buildToolCount > 0) {
    parts.push(t("relationNote.threatActorSharedBuildTools", { count: buildToolCount }));
  }
  if (useToolCount > 0) {
    parts.push(t("relationNote.threatActorSharedUseTools", { count: useToolCount }));
  }

  return parts.length ? formatParts(parts, t) : relation.note;
}

export function formatRiskRelationNote(
  relation: RiskRelation,
  sourceKey: string,
  locale: string,
  t: Translate,
) {
  if (!relation.note || !isEnglish(locale)) return relation.note || "";

  const riskI18n = getEntityEntry("risk").i18nPath;
  const fromTitle = t(`${riskI18n}.${sourceKey}.title`);
  const toTitle = t(`${riskI18n}.${relation.key}.title`);
  const note = relation.note;

  if (note.includes("在定义或描述中互相指向")) {
    return t("relationNote.riskMutualReference", { fromTitle, toTitle });
  }
  if (note.includes("同属") && note.includes("细分变体")) {
    return t("relationNote.riskSiblingVariant", { fromTitle, toTitle });
  }
  if (note.includes("上层风险")) {
    return t("relationNote.riskParentVariant", { fromTitle, toTitle });
  }
  if (note.includes("细分变体")) {
    return t("relationNote.riskSubtypeVariant", { fromTitle, toTitle });
  }

  const attackToolDirect = note.match(/均可由攻击工具"(.+)"直接造成/);
  if (attackToolDirect) {
    return t("relationNote.riskSharedDirectAttackTool", {
      fromTitle,
      toTitle,
      toolTitle: translatedEntityTitle("attackTool", attackToolDirect[1], t),
    });
  }

  const attackToolIndirect = note.match(/均受攻击工具"(.+)"间接支持/);
  if (attackToolIndirect) {
    return t("relationNote.riskSharedIndirectAttackTool", {
      fromTitle,
      toTitle,
      toolTitle: translatedEntityTitle("attackTool", attackToolIndirect[1], t),
    });
  }

  const threatActorDirect = note.match(/均可由威胁行为者"(.+)"直接造成/);
  if (threatActorDirect) {
    return t("relationNote.riskSharedDirectThreatActor", {
      fromTitle,
      toTitle,
      actorTitle: translatedEntityTitle("threatActor", threatActorDirect[1], t),
    });
  }

  const threatActorIndirect = note.match(/均受威胁行为者"(.+)"间接支持/);
  if (threatActorIndirect) {
    return t("relationNote.riskSharedIndirectThreatActor", {
      fromTitle,
      toTitle,
      actorTitle: translatedEntityTitle("threatActor", threatActorIndirect[1], t),
    });
  }

  const avoidance = note.match(/共享规避手段"(.+)"/);
  if (avoidance) {
    return t("relationNote.riskSharedAvoidance", {
      fromTitle,
      toTitle,
      avoidanceTitle: translatedEntityTitle("avoidance", avoidance[1], t),
    });
  }

  const riskScene = note.match(/同属"(.+)"风险场景/);
  if (riskScene) {
    return t("relationNote.riskSharedScene", {
      fromTitle,
      toTitle,
      sceneTitle: translatedRiskSceneTitle(riskScene[1], t),
    });
  }

  return t("relationNote.riskGeneric", {
    fromTitle,
    toTitle,
    relationType: t(`riskRelationType.${relation.relation}`),
  });
}
