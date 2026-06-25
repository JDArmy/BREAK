import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useRelationViewModel } from "../useRelationViewModel";
import { RelationType } from "../relationTypes";

const { createRelationViewAssembly, useRoute, useRouter } = vi.hoisted(() => ({
  createRelationViewAssembly: vi.fn(),
  useRoute: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("vue-router", () => ({
  useRoute,
  useRouter,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    locale: ref("zh-CN"),
    t: (key: string) => `t:${key}`,
  }),
}));

vi.mock("@/composables/useTheme", () => ({
  useTheme: () => ({ isDark: ref(false) }),
}));

vi.mock("@/composables/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: ref(false), width: ref(1280) }),
}));

vi.mock("@/views/relation/relationViewAssembly", () => ({
  createRelationViewAssembly,
}));

describe("useRelationViewModel", () => {
  beforeEach(() => {
    createRelationViewAssembly.mockReset();
    useRoute.mockReturnValue({ params: { entity: "risk", id: "R0001" } });
    useRouter.mockReturnValue({ push: vi.fn() });
    createRelationViewAssembly.mockReturnValue({ assembled: true });
    document.documentElement.style.cssText = [
      "--break-relation-risk: rgb(239, 68, 68);",
      "--break-relation-avoidance: rgb(34, 197, 94);",
      "--break-relation-attack-tool: rgb(59, 130, 246);",
      "--break-relation-threat-actor: rgb(168, 85, 247);",
      "--break-relation-term: rgb(245, 158, 11);",
      "--break-bg-primary: rgb(255, 255, 255);",
      "--break-text-muted: rgb(100, 116, 139);",
      "--break-text-secondary: rgb(71, 85, 105);",
      "--break-text-primary: rgb(15, 23, 42);",
      "--break-border: rgb(226, 232, 240);",
      "--break-graph-sub-node-fill: rgb(241, 245, 249);",
      "--break-graph-sub-node-border: rgb(203, 213, 225);",
      "--break-graph-selected-border: rgb(10, 20, 30);",
      "--break-line-avoidance: rgb(22, 163, 74);",
      "--break-line-direct-risk: rgb(220, 38, 38);",
      "--break-line-indirect-risk: rgb(234, 88, 12);",
      "--break-line-cause-risk: rgb(202, 138, 4);",
      "--break-line-related-term: rgb(8, 145, 178);",
      "--break-line-sub: rgb(100, 116, 139);",
      "--break-line-build-tool: rgb(37, 99, 235);",
      "--break-line-use-tool: rgb(79, 70, 229);",
      "--break-line-maker: rgb(147, 51, 234);",
    ].join("");
  });

  it("assembles relation view dependencies and exposes mapping helpers", () => {
    const model = useRelationViewModel();
    const assemblyOptions = createRelationViewAssembly.mock.calls[0]?.[0];

    expect(model.RelationType).toBe(RelationType);
    expect(model.assembled).toBe(true);
    expect(model.networkLayoutOptions.map((option) => option.value)).toContain("force");
    expect(model.RelationTypeMapping.risk.title).toBe("t:relationType.risk");
    expect(model.RelationTypeMapping.risk.color).toBe("rgb(239, 68, 68)");
    expect(model.setDropdownInstance).toBe(assemblyOptions.setDropdownInstance);

    expect(assemblyOptions.route.params.id).toBe("R0001");
    expect(assemblyOptions.RelationTypeMapping[RelationType.attackTool].BreakKey).toBe("attackTools");
    expect(assemblyOptions.getGraphColor("background")).toBe("rgb(255, 255, 255)");
    expect(assemblyOptions.getGraphColor("selectedNodeGlow")).toBe("rgba(10, 20, 30, 0.3)");
    expect(assemblyOptions.getRelationLineColor("avoidanceMeans")).toBe("rgb(22, 163, 74)");
    expect(() => assemblyOptions.renderNetworkChartBridge.current(true)).not.toThrow();
    expect(() => assemblyOptions.networkInteractionsBridge.openNodeDetail({ id: "R0001" })).not.toThrow();
  });
});
