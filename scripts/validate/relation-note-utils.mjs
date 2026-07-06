function entityEntries(records) {
  return records.map((record) => [record.key ?? record.id, record.entity]);
}

function entityMap(records) {
  return new Map(entityEntries(records));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function intersectCount(left, right) {
  let count = 0;
  for (const item of left) {
    if (right.has(item)) count += 1;
  }
  return count;
}

function attackToolRiskSet(entity) {
  return new Set(unique([...(entity.directCauseRisks || []), ...(entity.indirectSupportRisks || [])]));
}

function attackToolAvoidanceSet(entity) {
  return new Set(unique(entity.avoidances || []));
}

function attackToolActorIndex(threatActors) {
  const index = new Map();
  for (const [actorKey, entity] of entityEntries(threatActors)) {
    for (const toolKey of unique([...(entity.buildAttackTools || []), ...(entity.useAttackTools || [])])) {
      if (!index.has(toolKey)) index.set(toolKey, new Set());
      index.get(toolKey).add(actorKey);
    }
  }
  return index;
}

function threatActorSet(entity, field) {
  return new Set(unique(entity[field] || []));
}

function avoidanceRiskIndex(risks) {
  const index = new Map();
  for (const [riskKey, entity] of entityEntries(risks)) {
    for (const avoidanceKey of entity.avoidances || []) {
      if (!index.has(avoidanceKey)) index.set(avoidanceKey, new Set());
      index.get(avoidanceKey).add(riskKey);
    }
  }
  return index;
}

function avoidanceAttackToolIndex(attackTools) {
  const index = new Map();
  for (const [toolKey, entity] of entityEntries(attackTools)) {
    for (const avoidanceKey of entity.avoidances || []) {
      if (!index.has(avoidanceKey)) index.set(avoidanceKey, new Set());
      index.get(avoidanceKey).add(toolKey);
    }
  }
  return index;
}

function sentence(parts) {
  return `${parts.join("，")}。`;
}

function topRelations(items) {
  return items
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.riskCount !== left.riskCount) return right.riskCount - left.riskCount;
      if (right.attackToolCount !== left.attackToolCount) return right.attackToolCount - left.attackToolCount;
      if (right.avoidanceCount !== left.avoidanceCount) return right.avoidanceCount - left.avoidanceCount;
      if (right.actorCount !== left.actorCount) return right.actorCount - left.actorCount;
      return left.key.localeCompare(right.key);
    })
    .slice(0, 6);
}

export function isDerivedAvoidanceNote(note) {
  return /^共同(?:覆盖 \d+ 个风险|限制 \d+ 个攻击工具)/.test(note || "");
}

export function isDerivedAttackToolNote(note) {
  return /^共同关联 \d+ 个风险/.test(note || "");
}

export function isDerivedThreatActorNote(note) {
  return /^共同(?:直接造成|间接支持|建设|使用) \d+ 个/.test(note || "");
}

// 派生 Risk 横向关系 note 的识别正则。命中即视为可派生（应与 expectedRiskRelationNote 一致）。
// variant 三种子类型 + co-occurrence 三种可派生结构（直接/间接攻击工具、共享规避手段、共享威胁行为者）
// + prerequisite/escalation。未命中（如"在定义或描述中互相指向""同属风险场景"等）保留手写语义。
export function isDerivedRiskNote(note) {
  return /(?:同属父.*下的细分变体|是.*的细分变体|是.*的上层风险|均可由攻击工具|均受攻击工具.*间接支持|共享规避手段|均可被威胁行为者|是.*的前置条件|可升级为)/.test(
    note || "",
  );
}

export function expectedAvoidanceRelationNote(sourceKey, targetKey, context) {
  const sourceRisks = context.avoidanceRiskRefs.get(sourceKey) || new Set();
  const targetRisks = context.avoidanceRiskRefs.get(targetKey) || new Set();
  const sourceAttackTools = context.avoidanceAttackToolRefs.get(sourceKey) || new Set();
  const targetAttackTools = context.avoidanceAttackToolRefs.get(targetKey) || new Set();

  const riskCount = intersectCount(sourceRisks, targetRisks);
  const attackToolCount = intersectCount(sourceAttackTools, targetAttackTools);
  const parts = [];
  if (riskCount > 0) parts.push(`共同覆盖 ${riskCount} 个风险`);
  if (attackToolCount > 0) parts.push(`共同限制 ${attackToolCount} 个攻击工具`);
  return sentence(parts);
}

export function expectedAttackToolRelationNote(sourceKey, targetKey, context) {
  const source = context.attackToolsByKey.get(sourceKey);
  const target = context.attackToolsByKey.get(targetKey);
  if (!source || !target) return "";

  const riskCount = intersectCount(attackToolRiskSet(source), attackToolRiskSet(target));
  const avoidanceCount = intersectCount(attackToolAvoidanceSet(source), attackToolAvoidanceSet(target));
  const actorCount = intersectCount(
    context.attackToolActorRefs.get(sourceKey) || new Set(),
    context.attackToolActorRefs.get(targetKey) || new Set(),
  );

  const parts = [];
  if (riskCount > 0) parts.push(`共同关联 ${riskCount} 个风险`);
  if (avoidanceCount > 0) parts.push(`共享 ${avoidanceCount} 个规避手段`);
  if (actorCount > 0) parts.push(`被 ${actorCount} 个相同行为者使用或建设`);
  return sentence(parts);
}

export function expectedThreatActorRelationNote(sourceKey, targetKey, context) {
  const source = context.threatActorsByKey.get(sourceKey);
  const target = context.threatActorsByKey.get(targetKey);
  if (!source || !target) return "";

  const directRiskCount = intersectCount(
    threatActorSet(source, "directCauseRisks"),
    threatActorSet(target, "directCauseRisks"),
  );
  const indirectRiskCount = intersectCount(
    threatActorSet(source, "indirectSupportRisks"),
    threatActorSet(target, "indirectSupportRisks"),
  );
  const buildToolCount = intersectCount(
    threatActorSet(source, "buildAttackTools"),
    threatActorSet(target, "buildAttackTools"),
  );
  const useToolCount = intersectCount(
    threatActorSet(source, "useAttackTools"),
    threatActorSet(target, "useAttackTools"),
  );

  const parts = [];
  if (directRiskCount > 0) parts.push(`共同直接造成 ${directRiskCount} 个风险`);
  if (indirectRiskCount > 0) parts.push(`共同间接支持 ${indirectRiskCount} 个风险`);
  if (buildToolCount > 0) parts.push(`共同建设 ${buildToolCount} 个攻击工具`);
  if (useToolCount > 0) parts.push(`共同使用 ${useToolCount} 个攻击工具`);
  return sentence(parts);
}

// 反查：Risk -> 攻击工具（区分 direct/indirect）。从 AttackTool 的 directCauseRisks/indirectSupportRisks 反推。
function riskAttackToolIndex(attackTools) {
  const direct = new Map();
  const indirect = new Map();
  const add = (index, riskKey, toolKey) => {
    if (!index.has(riskKey)) index.set(riskKey, new Set());
    index.get(riskKey).add(toolKey);
  };
  for (const [toolKey, entity] of entityEntries(attackTools)) {
    for (const riskKey of unique(entity.directCauseRisks || [])) add(direct, riskKey, toolKey);
    for (const riskKey of unique(entity.indirectSupportRisks || [])) add(indirect, riskKey, toolKey);
  }
  return { direct, indirect };
}

// 反查：Risk -> 威胁行为者（合并 direct/indirect，用于 note 派生）。
function riskThreatActorIndex(threatActors) {
  const index = new Map();
  for (const [actorKey, entity] of entityEntries(threatActors)) {
    const risks = unique([
      ...(entity.directCauseRisks || []),
      ...(entity.indirectSupportRisks || []),
    ]);
    for (const riskKey of risks) {
      if (!index.has(riskKey)) index.set(riskKey, new Set());
      index.get(riskKey).add(actorKey);
    }
  }
  return index;
}

// Risk -> 规避手段（直接取 Risk.avoidances）。
function riskAvoidanceIndex(risks) {
  const index = new Map();
  for (const [riskKey, entity] of entityEntries(risks)) {
    index.set(riskKey, new Set(unique(entity.avoidances || [])));
  }
  return index;
}

// 父子关系：key -> 父 key（取 split('-')[0]）。
function parentKeyOf(key) {
  return String(key).split("-")[0];
}

// 派生 Risk 横向关系 note（方案 B：混合派生 + 保留语义）。
// 返回空字符串表示该 relation 不可由结构派生（如"在定义或描述中互相指向""同属风险场景"），调用方应保留手写 note。
export function expectedRiskRelationNote(sourceKey, targetKey, relation, context) {
  const risksByKey = context.risksByKey;
  const source = risksByKey.get(sourceKey);
  const target = risksByKey.get(targetKey);
  if (!source || !target) return "";

  const srcTitle = source.title || sourceKey;
  const tgtTitle = target.title || targetKey;

  if (relation === "variant") {
    const srcParent = parentKeyOf(sourceKey);
    const tgtParent = parentKeyOf(targetKey);
    const sameParent = srcParent === tgtParent;
    const srcIsParent = !String(sourceKey).includes("-");
    const tgtIsParent = !String(targetKey).includes("-");

    if (sameParent && !srcIsParent && !tgtIsParent) {
      // 同父兄弟
      const parentTitle = risksByKey.get(srcParent)?.title || srcParent;
      return `${srcTitle}与${tgtTitle}同属父${parentTitle}下的细分变体。`;
    }
    if (srcIsParent && !tgtIsParent && tgtParent === sourceKey) {
      // 父 -> 子
      return `${tgtTitle}是${srcTitle}的细分变体。`;
    }
    if (tgtIsParent && !srcIsParent && srcParent === targetKey) {
      // 子 -> 父
      return `${tgtTitle}是${srcTitle}的上层风险。`;
    }
    // 不同父或无法判定父子结构，按泛变体派生
    return `${srcTitle}与${tgtTitle}是相关变体。`;
  }

  if (relation === "prerequisite") {
    return `${srcTitle}是${tgtTitle}的前置条件。`;
  }

  if (relation === "escalation") {
    return `${srcTitle}可升级为${tgtTitle}。`;
  }

  // co-occurrence：按优先级派生（第一个非空用）
  const srcDirectTools = context.riskDirectAttackToolRefs.get(sourceKey) || new Set();
  const tgtDirectTools = context.riskDirectAttackToolRefs.get(targetKey) || new Set();
  const commonDirect = [...srcDirectTools].filter((t) => tgtDirectTools.has(t));
  if (commonDirect.length > 0) {
    const toolTitle = context.attackToolsByKey.get(commonDirect[0])?.title || commonDirect[0];
    return `${srcTitle}与${tgtTitle}均可由攻击工具“${toolTitle}”直接造成。`;
  }

  const srcIndirectTools = context.riskIndirectAttackToolRefs.get(sourceKey) || new Set();
  const tgtIndirectTools = context.riskIndirectAttackToolRefs.get(targetKey) || new Set();
  const commonIndirect = [...srcIndirectTools].filter((t) => tgtIndirectTools.has(t));
  if (commonIndirect.length > 0) {
    const toolTitle = context.attackToolsByKey.get(commonIndirect[0])?.title || commonIndirect[0];
    return `${srcTitle}与${tgtTitle}均受攻击工具“${toolTitle}”间接支持。`;
  }

  const srcAvoidances = context.riskAvoidanceRefs.get(sourceKey) || new Set();
  const tgtAvoidances = context.riskAvoidanceRefs.get(targetKey) || new Set();
  const commonAvoidance = [...srcAvoidances].find((a) => tgtAvoidances.has(a));
  if (commonAvoidance) {
    const avoidanceTitle = context.avoidancesByKey?.get(commonAvoidance)?.title || commonAvoidance;
    return `${srcTitle}与${tgtTitle}共享规避手段“${avoidanceTitle}”。`;
  }

  const srcActors = context.riskThreatActorRefs.get(sourceKey) || new Set();
  const tgtActors = context.riskThreatActorRefs.get(targetKey) || new Set();
  const commonActor = [...srcActors].find((a) => tgtActors.has(a));
  if (commonActor) {
    const actorTitle = context.threatActorsByKey.get(commonActor)?.title || commonActor;
    return `${srcTitle}与${tgtTitle}均可被威胁行为者“${actorTitle}”实施。`;
  }

  // 无可派生结构（如"在定义或描述中互相指向""同属风险场景"），返回空串保留手写 note
  return "";
}

export function buildRelationNoteContext({ risks, avoidances, attackTools, threatActors }) {
  const { direct, indirect } = riskAttackToolIndex(attackTools);
  return {
    attackToolsByKey: entityMap(attackTools),
    threatActorsByKey: entityMap(threatActors),
    avoidancesByKey: entityMap(avoidances || []),
    risksByKey: entityMap(risks),
    attackToolActorRefs: attackToolActorIndex(threatActors),
    avoidanceRiskRefs: avoidanceRiskIndex(risks),
    avoidanceAttackToolRefs: avoidanceAttackToolIndex(attackTools),
    riskDirectAttackToolRefs: direct,
    riskIndirectAttackToolRefs: indirect,
    riskAvoidanceRefs: riskAvoidanceIndex(risks),
    riskThreatActorRefs: riskThreatActorIndex(threatActors),
  };
}

export function expectedAvoidanceRelations(sourceKey, avoidances, context) {
  const sourceRisks = context.avoidanceRiskRefs.get(sourceKey) || new Set();
  const sourceAttackTools = context.avoidanceAttackToolRefs.get(sourceKey) || new Set();

  return topRelations(
    entityEntries(avoidances)
      .filter(([targetKey]) => targetKey !== sourceKey)
      .map(([targetKey]) => {
        const riskCount = intersectCount(sourceRisks, context.avoidanceRiskRefs.get(targetKey) || new Set());
        const attackToolCount = intersectCount(
          sourceAttackTools,
          context.avoidanceAttackToolRefs.get(targetKey) || new Set(),
        );
        return {
          key: targetKey,
          riskCount,
          attackToolCount,
          score: riskCount + attackToolCount,
        };
      }),
  ).map((target) => ({
    key: target.key,
    relation: "complement",
    note: expectedAvoidanceRelationNote(sourceKey, target.key, context),
  }));
}

export function expectedAttackToolRelations(sourceKey, attackTools, context) {
  const source = context.attackToolsByKey.get(sourceKey);
  if (!source) return [];
  const sourceRisks = attackToolRiskSet(source);
  const sourceAvoidances = attackToolAvoidanceSet(source);
  const sourceActors = context.attackToolActorRefs.get(sourceKey) || new Set();

  return topRelations(
    entityEntries(attackTools)
      .filter(([targetKey]) => targetKey !== sourceKey)
      .map(([targetKey, target]) => {
        const riskCount = intersectCount(sourceRisks, attackToolRiskSet(target));
        const avoidanceCount = intersectCount(sourceAvoidances, attackToolAvoidanceSet(target));
        const actorCount = intersectCount(sourceActors, context.attackToolActorRefs.get(targetKey) || new Set());
        return {
          key: targetKey,
          riskCount,
          avoidanceCount,
          actorCount,
          score: riskCount + avoidanceCount + actorCount,
        };
      }),
  ).map((target) => ({
    key: target.key,
    relation: "co-used",
    note: expectedAttackToolRelationNote(sourceKey, target.key, context),
  }));
}

export function expectedThreatActorRelations(sourceKey, threatActors, context) {
  const source = context.threatActorsByKey.get(sourceKey);
  if (!source) return [];
  const sourceDirectRisks = threatActorSet(source, "directCauseRisks");
  const sourceIndirectRisks = threatActorSet(source, "indirectSupportRisks");
  const sourceBuildTools = threatActorSet(source, "buildAttackTools");
  const sourceUseTools = threatActorSet(source, "useAttackTools");

  return topRelations(
    entityEntries(threatActors)
      .filter(([targetKey]) => targetKey !== sourceKey)
      .map(([targetKey, target]) => {
        const directRiskCount = intersectCount(sourceDirectRisks, threatActorSet(target, "directCauseRisks"));
        const indirectRiskCount = intersectCount(sourceIndirectRisks, threatActorSet(target, "indirectSupportRisks"));
        const buildToolCount = intersectCount(sourceBuildTools, threatActorSet(target, "buildAttackTools"));
        const useToolCount = intersectCount(sourceUseTools, threatActorSet(target, "useAttackTools"));
        return {
          key: targetKey,
          riskCount: directRiskCount + indirectRiskCount,
          attackToolCount: buildToolCount + useToolCount,
          directRiskCount,
          indirectRiskCount,
          buildToolCount,
          useToolCount,
          score: directRiskCount + indirectRiskCount + buildToolCount + useToolCount,
        };
      }),
  ).map((target) => ({
    key: target.key,
    relation: "co-involved",
    note: expectedThreatActorRelationNote(sourceKey, target.key, context),
  }));
}

function sameRelations(actual, expected) {
  return JSON.stringify(actual || []) === JSON.stringify(expected);
}

export function validateDerivedRelationNotes({ risks, avoidances, attackTools, threatActors }) {
  const context = buildRelationNoteContext({ risks, avoidances, attackTools, threatActors });
  const issues = [];

  for (const [sourceKey, entity] of entityEntries(risks)) {
    for (const [index, relation] of (entity.relatedRisks || []).entries()) {
      if (!isDerivedRiskNote(relation?.note)) continue;
      const expected = expectedRiskRelationNote(sourceKey, relation.key, relation.relation, context);
      // expected 为空表示不可派生（手写语义），不校验；命中 isDerivedRiskNote 但 expected 不同则报错
      if (expected && relation.note !== expected) {
        issues.push({
          entity: "Risk",
          field: "relatedRisks",
          sourceKey,
          targetKey: relation.key,
          index,
          note: relation.note,
          expected,
        });
      }
    }
  }

  for (const [sourceKey, entity] of entityEntries(avoidances)) {
    for (const [index, relation] of (entity.relatedAvoidances || []).entries()) {
      if (!isDerivedAvoidanceNote(relation?.note)) continue;
      const expected = expectedAvoidanceRelationNote(sourceKey, relation.key, context);
      if (relation.note !== expected) {
        issues.push({
          entity: "Avoidance",
          field: "relatedAvoidances",
          sourceKey,
          targetKey: relation.key,
          index,
          note: relation.note,
          expected,
        });
      }
    }
  }

  for (const [sourceKey, entity] of entityEntries(attackTools)) {
    for (const [index, relation] of (entity.relatedAttackTools || []).entries()) {
      if (!isDerivedAttackToolNote(relation?.note)) continue;
      const expected = expectedAttackToolRelationNote(sourceKey, relation.key, context);
      if (relation.note !== expected) {
        issues.push({
          entity: "AttackTool",
          field: "relatedAttackTools",
          sourceKey,
          targetKey: relation.key,
          index,
          note: relation.note,
          expected,
        });
      }
    }
  }

  for (const [sourceKey, entity] of entityEntries(threatActors)) {
    for (const [index, relation] of (entity.relatedThreatActors || []).entries()) {
      if (!isDerivedThreatActorNote(relation?.note)) continue;
      const expected = expectedThreatActorRelationNote(sourceKey, relation.key, context);
      if (relation.note !== expected) {
        issues.push({
          entity: "ThreatActor",
          field: "relatedThreatActors",
          sourceKey,
          targetKey: relation.key,
          index,
          note: relation.note,
          expected,
        });
      }
    }
  }

  return issues;
}

export function validateDerivedRelationTop6({ risks, avoidances, attackTools, threatActors }) {
  const context = buildRelationNoteContext({ risks, avoidances, attackTools, threatActors });
  const issues = [];

  for (const [sourceKey, entity] of entityEntries(avoidances)) {
    const expected = expectedAvoidanceRelations(sourceKey, avoidances, context);
    if (!sameRelations(entity.relatedAvoidances, expected)) {
      issues.push({
        entity: "Avoidance",
        field: "relatedAvoidances",
        sourceKey,
        actualCount: entity.relatedAvoidances?.length || 0,
        expectedCount: expected.length,
      });
    }
  }

  for (const [sourceKey, entity] of entityEntries(attackTools)) {
    const expected = expectedAttackToolRelations(sourceKey, attackTools, context);
    if (!sameRelations(entity.relatedAttackTools, expected)) {
      issues.push({
        entity: "AttackTool",
        field: "relatedAttackTools",
        sourceKey,
        actualCount: entity.relatedAttackTools?.length || 0,
        expectedCount: expected.length,
      });
    }
  }

  for (const [sourceKey, entity] of entityEntries(threatActors)) {
    const expected = expectedThreatActorRelations(sourceKey, threatActors, context);
    if (!sameRelations(entity.relatedThreatActors, expected)) {
      issues.push({
        entity: "ThreatActor",
        field: "relatedThreatActors",
        sourceKey,
        actualCount: entity.relatedThreatActors?.length || 0,
        expectedCount: expected.length,
      });
    }
  }

  return issues;
}
