import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EntityPopoverContent from "../EntityPopoverContent.vue";
import type { EntitySummary } from "@/composables/useEntityResolver";

const entity: EntitySummary = {
  id: "T0180",
  type: "term",
  typeLabel: "行业术语",
  title: "神父",
  definition: "身份证正反面的高清照片或扫描件。",
  description: null,
  href: "#/knowledges/term/detail/T0180",
  exists: true,
};

const mountContent = (props: Record<string, unknown>) =>
  mount(EntityPopoverContent, {
    props: { entity, ...props },
    global: {
      mocks: {
        $t: (key: string, params?: { text?: string }) =>
          params?.text ? `${key}:${params.text}` : key,
      },
      stubs: { ElIcon: true },
    },
  });

describe("EntityPopoverContent", () => {
  it("关键词命中时在术语标题下显示命中信息", () => {
    const wrapper = mountContent({ matchSource: "keyword", matchText: "绕过认证" });

    expect(wrapper.find(".entity-card__match").text()).toBe(
      "entityPopover.matchedKeyword:绕过认证",
    );
  });

  it("别名命中时显示别名，直接标题或实体 ID 命中时不显示", () => {
    const aliasWrapper = mountContent({ matchSource: "alias", matchText: "身份证料" });
    const directWrapper = mountContent({});

    expect(aliasWrapper.find(".entity-card__match").text()).toBe(
      "entityPopover.matchedAlias:身份证料",
    );
    expect(directWrapper.find(".entity-card__match").exists()).toBe(false);
  });
});
