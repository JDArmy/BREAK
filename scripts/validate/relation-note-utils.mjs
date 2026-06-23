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

export function buildRelationNoteContext({ risks, attackTools, threatActors }) {
  return {
    attackToolsByKey: entityMap(attackTools),
    attackToolActorRefs: attackToolActorIndex(threatActors),
    avoidanceRiskRefs: avoidanceRiskIndex(risks),
    avoidanceAttackToolRefs: avoidanceAttackToolIndex(attackTools),
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

function sameRelations(actual, expected) {
  return JSON.stringify(actual || []) === JSON.stringify(expected);
}

export function validateDerivedRelationNotes({ risks, avoidances, attackTools, threatActors }) {
  const context = buildRelationNoteContext({ risks, attackTools, threatActors });
  const issues = [];

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

  return issues;
}

export function validateDerivedRelationTop6({ risks, avoidances, attackTools, threatActors }) {
  const context = buildRelationNoteContext({ risks, attackTools, threatActors });
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

  return issues;
}
