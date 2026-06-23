import BREAK from "@/BREAK";
import type { AttackToolRelation, AvoidanceRelation, RiskRelation } from "@/BREAK/types";

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
  type: "avoidances" | "attackTools" | "threatActors",
  title: string,
  t: Translate,
) {
  const records = BREAK[type] as Record<string, { title: string }>;
  const key = keyByTitle(records, title);
  return key ? t(`BREAK.${type}.${key}.title`) : title;
}

function translatedRiskSceneTitle(title: string, t: Translate) {
  for (const [sceneKey, scene] of Object.entries(BREAK.businessScenes.BS00.riskScenes)) {
    if (scene.title === title) {
      return t(`BREAK.businessScenes.BS00.riskScenes.${sceneKey}.title`);
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

export function formatRiskRelationNote(
  relation: RiskRelation,
  sourceKey: string,
  locale: string,
  t: Translate,
) {
  if (!relation.note || !isEnglish(locale)) return relation.note || "";

  const fromTitle = t(`BREAK.risks.${sourceKey}.title`);
  const toTitle = t(`BREAK.risks.${relation.key}.title`);
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

  const attackToolDirect = note.match(/均可由攻击工具“(.+)”直接造成/);
  if (attackToolDirect) {
    return t("relationNote.riskSharedDirectAttackTool", {
      fromTitle,
      toTitle,
      toolTitle: translatedEntityTitle("attackTools", attackToolDirect[1], t),
    });
  }

  const attackToolIndirect = note.match(/均受攻击工具“(.+)”间接支持/);
  if (attackToolIndirect) {
    return t("relationNote.riskSharedIndirectAttackTool", {
      fromTitle,
      toTitle,
      toolTitle: translatedEntityTitle("attackTools", attackToolIndirect[1], t),
    });
  }

  const threatActorDirect = note.match(/均可由威胁行为者“(.+)”直接造成/);
  if (threatActorDirect) {
    return t("relationNote.riskSharedDirectThreatActor", {
      fromTitle,
      toTitle,
      actorTitle: translatedEntityTitle("threatActors", threatActorDirect[1], t),
    });
  }

  const threatActorIndirect = note.match(/均受威胁行为者“(.+)”间接支持/);
  if (threatActorIndirect) {
    return t("relationNote.riskSharedIndirectThreatActor", {
      fromTitle,
      toTitle,
      actorTitle: translatedEntityTitle("threatActors", threatActorIndirect[1], t),
    });
  }

  const avoidance = note.match(/共享规避手段“(.+)”/);
  if (avoidance) {
    return t("relationNote.riskSharedAvoidance", {
      fromTitle,
      toTitle,
      avoidanceTitle: translatedEntityTitle("avoidances", avoidance[1], t),
    });
  }

  const riskScene = note.match(/同属“(.+)”风险场景/);
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
