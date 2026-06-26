import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

// mock BREAK 数据——多场景版本用于测试滚动阈值
vi.mock("@/BREAK/home", () => ({
  default: {
    risks: {
      R0001: { title: "风险A", definition: "定义A" },
      R0002: { title: "风险B风险B风险B风险B风险B", definition: "定义B" },
      R0003: { title: "C", definition: "定义C" },
      "R0001-001": { title: "子风险", definition: "子定义" },
    },
    businessScenes: {
      BS00: {
        riskDimensions: {
          RD01: { title: "维度1", riskScenes: ["RS01", "RS02"] },
          RD02: { title: "维度二", riskScenes: ["RS03"] },
        },
        riskScenes: {
          RS01: { title: "场景1", risks: ["R0001", "R0002"] },
          RS02: { title: "场景2", risks: ["R0003"] },
          RS03: { title: "场景LongName长名称场景", risks: ["R0001"] },
        },
      },
      BS01: {
        riskDimensions: {
          RD01: { title: "DIM1", riskScenes: ["RS01", "RS02", "RS03", "RS04", "RS05", "RS06", "RS07", "RS08", "RS09"] },
        },
        riskScenes: {
          RS01: { title: "S1", risks: ["R0001"] },
          RS02: { title: "S2", risks: ["R0001"] },
          RS03: { title: "S3", risks: ["R0001"] },
          RS04: { title: "S4", risks: ["R0001"] },
          RS05: { title: "S5", risks: ["R0001"] },
          RS06: { title: "S6", risks: ["R0001"] },
          RS07: { title: "S7", risks: ["R0001"] },
          RS08: { title: "S8", risks: ["R0001"] },
          RS09: { title: "S9", risks: ["R0001"] },
        },
      },
    },
  },
}));

import { useHomeSceneLayout, useSubRiskToggle } from "@/composables/useHomeSceneLayout";

describe("useHomeSceneLayout", () => {
  it("返回 sceneLayout 计算属性", () => {
    const bsKey = ref("BS00");
    const locale = ref("cn");
    const { sceneLayout, sceneBREAK, shouldEnableScroll } = useHomeSceneLayout(
      bsKey,
      locale,
      {
        riskScene: (key) => sceneBREAK.value.riskScenes[key]?.title ?? key,
        risk: (key) => key,
      },
    );

    expect(sceneLayout.value.length).toBeGreaterThan(0);
    expect(sceneLayout.value[0].key).toBe("RD01");
    expect(sceneLayout.value[0].scenes.length).toBeGreaterThan(0);
    // 3 个场景，低于中文阈值 8
    expect(shouldEnableScroll.value).toBe(false);
  });

  it("英文 locale 使用不同阈值", () => {
    const bsKey = ref("BS00");
    const locale = ref("en");
    const { shouldEnableScroll, sceneBREAK } = useHomeSceneLayout(
      bsKey,
      locale,
      {
        riskScene: (key) => sceneBREAK.value.riskScenes[key]?.title ?? key,
        risk: (key) => key,
      },
    );
    expect(shouldEnableScroll.value).toBe(false);
  });

  it("超过阈值时启用滚动并计算维度宽度", () => {
    const bsKey = ref("BS01"); // 9 个场景
    const locale = ref("cn");
    const { sceneLayout, sceneBREAK, shouldEnableScroll } = useHomeSceneLayout(
      bsKey,
      locale,
      {
        riskScene: (key) => sceneBREAK.value.riskScenes[key]?.title ?? key,
        risk: () => "R0001",
      },
    );

    // 9 个场景 > 中文阈值 8
    expect(shouldEnableScroll.value).toBe(true);
    // 滚动模式下维度有固定 width
    expect(sceneLayout.value[0].width).toBeGreaterThan(0);
    // 场景也有固定 width
    expect(sceneLayout.value[0].scenes[0].width).toBeGreaterThan(0);
  });

  it("多维度时尺寸按比例分配", () => {
    const bsKey = ref("BS00");
    const locale = ref("cn");
    const { sceneLayout, sceneBREAK } = useHomeSceneLayout(
      bsKey,
      locale,
      {
        riskScene: (key) => sceneBREAK.value.riskScenes[key]?.title ?? key,
        risk: (key) => key,
      },
    );

    // BS00 有 2 个维度
    expect(sceneLayout.value).toHaveLength(2);
    const totalSize = sceneLayout.value.reduce((s, d) => s + d.size, 0);
    expect(totalSize).toBeLessThanOrEqual(24);
  });

  it("isChineseLocale 正确响应", () => {
    const bsKey = ref("BS00");
    const locale = ref("cn");
    const { isChineseLocale, sceneBREAK } = useHomeSceneLayout(
      bsKey,
      locale,
      {
        riskScene: (key) => sceneBREAK.value.riskScenes[key]?.title ?? key,
        risk: (key) => key,
      },
    );
    expect(isChineseLocale.value).toBe(true);
    locale.value = "en";
    expect(isChineseLocale.value).toBe(false);
  });
});

describe("useSubRiskToggle", () => {
  it("识别子风险并提供折叠控制", async () => {
    const { subRisks, hideSubRisks, hideAllSubRisks } = useSubRiskToggle();

    // R0001 有子风险 R0001-001
    expect(subRisks.value["R0001"]).toEqual(["R0001-001"]);
    expect(hideSubRisks.value["R0001"]).toBe(false);

    // 全部隐藏
    hideAllSubRisks.value = true;
    await nextTick();
    expect(hideSubRisks.value["R0001"]).toBe(true);

    // 全部展开
    hideAllSubRisks.value = false;
    await nextTick();
    expect(hideSubRisks.value["R0001"]).toBe(false);
  });

  it("无子风险的实体不进入 subRisks", () => {
    const { subRisks } = useSubRiskToggle();
    expect(subRisks.value["R0002"]).toBeUndefined();
  });
});
