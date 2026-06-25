import { ref } from "vue";
import { describe, expect, it } from "vitest";
import { createRelationAttackPathBuilder } from "../relationAttackPathBuilder";
import { RelationType } from "../relationTypes";

describe("relationAttackPathBuilder", () => {
  const createBuilder = (relType: RelationType, relKey: string) =>
    createRelationAttackPathBuilder({
      relKey: ref(relKey),
      relType: ref(relType),
    });

  it("按攻击工具根节点构建限定路径，并保留规避来源字段", () => {
    const { buildAttackPaths } = createBuilder(
      RelationType.attackTool,
      "AT0001"
    );

    const paths = buildAttackPaths();

    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((path) => path.attackToolKey === "AT0001")).toBe(true);
    expect(paths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          threatActorKey: "TA0017",
          attackToolKey: "AT0001",
          riskKey: "R0005-001",
          avoidanceKey: "A0016-003",
          avoidanceSourceFields: expect.arrayContaining([
            "AttackTool.avoidances",
          ]),
        }),
      ])
    );
  });

  it("按风险根节点聚合工具、行为者和规避路径", () => {
    const { buildAttackPaths } = createBuilder(RelationType.risk, "R0001");

    const paths = buildAttackPaths();

    expect(paths.length).toBeGreaterThan(10);
    expect(paths.every((path) => path.riskKey === "R0001")).toBe(true);
    expect(paths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attackToolKey: "AT0034-001",
          avoidanceKey: "A0016-001",
          avoidanceSourceFields: expect.arrayContaining([
            "Risk.avoidances",
            "AttackTool.avoidances",
          ]),
        }),
      ])
    );
  });

  it("按规避手段根节点只返回命中该规避手段的路径", () => {
    const { buildAttackPaths } = createBuilder(
      RelationType.avoidance,
      "A0016-001"
    );

    const paths = buildAttackPaths();

    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((path) => path.avoidanceKey === "A0016-001")).toBe(true);
  });

  it("术语根节点不生成攻击路径", () => {
    const { buildAttackPaths } = createBuilder(RelationType.term, "T0001");

    expect(buildAttackPaths()).toEqual([]);
  });

  it("无效风险、攻击工具、威胁行为者和规避手段不生成路径", () => {
    expect(createBuilder(RelationType.risk, "R9999").buildAttackPaths()).toEqual([]);
    expect(
      createBuilder(RelationType.attackTool, "AT9999").buildAttackPaths(),
    ).toEqual([]);
    expect(
      createBuilder(RelationType.threatActor, "TA9999").buildAttackPaths(),
    ).toEqual([]);
    expect(
      createBuilder(RelationType.avoidance, "A9999").buildAttackPaths(),
    ).toEqual([]);
  });

  it("威胁行为者根节点合并直接风险和工具风险并限定行为者", () => {
    const { buildAttackPaths, getCandidateRiskKeys } = createBuilder(
      RelationType.threatActor,
      "TA0017",
    );

    const candidateRiskKeys = getCandidateRiskKeys();
    const paths = buildAttackPaths();

    expect(candidateRiskKeys).toContain("R0005-001");
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((path) => path.threatActorKey === "TA0017")).toBe(true);
    expect(paths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          threatActorKey: "TA0017",
          attackToolKey: "AT0001",
        }),
      ]),
    );
  });

  it("all 根节点构建全量路径并允许直接调用风险路径过滤条件", () => {
    const { buildAttackPaths, buildAttackPathsForRisk, getCandidateRiskKeys } =
      createBuilder(RelationType.all, "");

    expect(getCandidateRiskKeys().length).toBeGreaterThan(100);
    expect(buildAttackPaths().length).toBeGreaterThan(100);
    expect(
      buildAttackPathsForRisk("R0001", {
        attackToolKey: "missing-tool",
        threatActorKey: "missing-actor",
        avoidanceKey: "missing-avoidance",
      }),
    ).toEqual([]);
    expect(buildAttackPathsForRisk("R9999")).toEqual([]);
  });
});
