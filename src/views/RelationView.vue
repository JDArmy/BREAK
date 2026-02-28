<script setup lang="ts">
import { onMounted, ref, reactive, watch, nextTick } from "vue";
import BREAK from "@/BREAK";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

import RelationGraph, {
  type RGJsonData,
  type RGLayoutOptions,
  type RGOptions,
} from "relation-graph/vue3";
import type { DropdownInstance } from "element-plus";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

enum RelationType {
  risk = "risk",
  avoidance = "avoidance",
  attackTool = "attack-tool",
  threatActor = "threat-actor",
  all = "all",
}

const RelationTypeMapping = {
  [RelationType.risk]: {
    get title() { return t("relationType.risk"); },
    relType: RelationType.risk,
    BreakKey: "risks",
    color: "orange",
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.avoidance]: {
    get title() { return t("relationType.avoidance"); },
    relType: RelationType.avoidance,
    BreakKey: "avoidances",
    color: "green",
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.attackTool]: {
    get title() { return t("relationType.attackTool"); },
    relType: RelationType.attackTool,
    BreakKey: "attackTools",
    color: "blue",
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.threatActor]: {
    get title() { return t("relationType.threatActor"); },
    relType: RelationType.threatActor,
    BreakKey: "threatActors",
    color: "red",
    disableContextMenu: ref<boolean>(false),
  },
};

const relType = ref<RelationType>(route.params.type as RelationType);
const relKey = ref<string>(route.params.key as string);

const graphRef$ = ref<RelationGraph>();

const graphOptions: RGOptions = reactive({
  allowShowMiniToolBar: true,
  disableZoom: false,
  disableDragCanvas: false,
  defaultExpandHolderPosition: "right",
  defaultShowLineLabel: true,
  defaultNodeWidth: 120,
  defaultNodeHeight: 120,
  moveToCenterWhenRefresh: true,
  zoomToFitWhenRefresh: true,
});

graphOptions.layout = {
  layoutLabel: "中心布局",
  layoutName: "center",
  distance_coefficient: 2,
  maxLayoutTimes: 20,
  force_line_elastic: 0.3, // 连线牵引力系数
  force_node_repulsion: 3, // 节点排斥力系数
} as RGLayoutOptions;

// Reference: https://relation-graph.github.io/#/docs/node
interface Node {
  id: string;
  type: string;
  text: string;
  color: string;
  data?: { isSubNode?: boolean };
}

// Reference: https://relation-graph.github.io/#/docs/link
interface Line {
  from: string;
  text: string;
  to: string;
}

const nodes = reactive([] as Node[]);
const lines = reactive([] as Line[]);
const jsonData = reactive({
  rootId: relKey.value,
  nodes: nodes,
  lines: lines,
} as RGJsonData);

const addRootNode = () => {
  const breakItemAttr =
    RelationTypeMapping[relType.value as keyof typeof RelationTypeMapping];
  const items = BREAK[breakItemAttr.BreakKey as keyof typeof BREAK];
  const item = items[relKey.value as keyof typeof items] as { title: string };
  if (item === undefined) {
    alert(t("unknownId"));
    return;
  }

  nodes.push({
    id: relKey.value,
    type: breakItemAttr.relType,
    text: relKey.value + "<br>" + t(`BREAK.${RelationTypeMapping[relType.value as keyof typeof RelationTypeMapping].BreakKey}.${relKey.value}.title`),
    color: breakItemAttr.color,
  } as Node);
};

/** Risk */
const addRiskAvoidance = (rKey: string) => {
  const avoidanceKeys =
    BREAK.risks[rKey as keyof typeof BREAK.risks].avoidances;
  avoidanceKeys.forEach((avoidanceKey) => {
    nodes.push({
      id: avoidanceKey,
      type: RelationType.avoidance,
      text: avoidanceKey + "<br>" + t(`BREAK.avoidances.${avoidanceKey}.title`),
      color: RelationTypeMapping[RelationType.avoidance].color,
    } as Node);
    lines.push({
      from: rKey,
      text: t("relationLine.avoidanceMeans"),
      to: avoidanceKey,
    } as Line);
  });
};

const addRiskAttackTool = (rKey: string) => {
  const attackToolKeys = Object.keys(BREAK.attackTools).filter((atKey) =>
    BREAK.attackTools[
      atKey as keyof typeof BREAK.attackTools
    ].couseRisks.includes(rKey as never)
  );
  attackToolKeys.forEach((attackToolKey) => {
    nodes.push({
      id: attackToolKey,
      type: RelationType.attackTool,
      text: attackToolKey + "<br>" + t(`BREAK.attackTools.${attackToolKey}.title`),
      color: RelationTypeMapping[RelationType.attackTool].color,
    } as Node);
    lines.push({
      from: rKey,
      text: t("relationLine.makeRisk"),
      to: attackToolKey,
    } as Line);
  });
};

const addRisk_AvoidanceAttackToolRelation = (rKey: string) => {
  const avoidanceKeys =
    BREAK.risks[rKey as keyof typeof BREAK.risks].avoidances;
  const attackToolKeys = Object.keys(BREAK.attackTools).filter((atKey) =>
    BREAK.attackTools[
      atKey as keyof typeof BREAK.attackTools
    ].couseRisks.includes(rKey as never)
  );
  attackToolKeys.forEach((attackToolKey) => {
    avoidanceKeys.forEach((avoidanceKey) => {
      if (
        BREAK.attackTools[
          attackToolKey as keyof typeof BREAK.attackTools
        ].avoidances.includes(avoidanceKey)
      ) {
        lines.push({
          from: avoidanceKey,
          text: t("relationLine.avoidanceMeans"),
          to: attackToolKey,
        } as Line);
      }
    });
  });
};

const addRiskThreatActor = (rKey: string) => {
  const threatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) =>
    BREAK.threatActors[
      taKey as keyof typeof BREAK.threatActors
    ].couseRisks.includes(rKey as never)
  );
  threatActorKeys.forEach((threatActorKey) => {
    nodes.push({
      id: threatActorKey,
      type: RelationType.threatActor,
      text: threatActorKey + "<br>" + t(`BREAK.threatActors.${threatActorKey}.title`),
      color: RelationTypeMapping[RelationType.threatActor].color,
    } as Node);
    lines.push({
      from: threatActorKey,
      text: t("relationLine.causeRisk"),
      to: rKey,
    } as Line);
  });
};

const addRisk_ThreatActorAttackToolRelation = (rKey: string) => {
  const threatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) =>
    BREAK.threatActors[
      taKey as keyof typeof BREAK.threatActors
    ].couseRisks.includes(rKey as never)
  );
  const attackToolKeys = Object.keys(BREAK.attackTools).filter((atKey) =>
    BREAK.attackTools[
      atKey as keyof typeof BREAK.attackTools
    ].couseRisks.includes(rKey as never)
  );

  threatActorKeys.forEach((threatActorKey) => {
    attackToolKeys.forEach((attackToolKey) => {
      if (
        BREAK.threatActors[
          threatActorKey as keyof typeof BREAK.threatActors
        ].useAttackTools.includes(attackToolKey)
      ) {
        lines.push({
          from: threatActorKey,
          text: t("relationLine.useAttackTool"),
          to: attackToolKey,
        } as Line);
      } else if (
        BREAK.threatActors[
          threatActorKey as keyof typeof BREAK.threatActors
        ].buildAttackTools.includes(attackToolKey)
      ) {
        lines.push({
          from: threatActorKey,
          text: t("relationLine.buildAttackTool"),
          to: attackToolKey,
        } as Line);
      }
    });
  });
};

const addRiskSubrisk = (rKey: string) => {
  const subriskKeys = Object.keys(BREAK.risks).filter(
    (riskKey) => riskKey.includes(rKey) && riskKey != rKey
  );
  subriskKeys.forEach((subriskKey) => {
    nodes.push({
      id: subriskKey,
      type: RelationType.risk,
      text: subriskKey + "<br>" + t(`BREAK.risks.${subriskKey}.title`),
      color: RelationTypeMapping[RelationType.risk].color,
      data: { isSubNode: true },
    } as Node);
    lines.push({
      from: rKey,
      text: t("relationLine.subRisk"),
      to: subriskKey,
    } as Line);
  });
};

/** Avoidacne */
const addAvoidanceRisk = (avoidanceKey: string) => {
  const riskKeys = Object.keys(BREAK.risks).filter((rKey) =>
    BREAK.risks[rKey as keyof typeof BREAK.risks].avoidances.includes(
      avoidanceKey as never
    )
  );
  riskKeys.forEach((riskKey) => {
    nodes.push({
      id: riskKey,
      type: RelationType.risk,
      text: riskKey + "<br>" + t(`BREAK.risks.${riskKey}.title`),
      color: RelationTypeMapping[RelationType.risk].color,
    } as Node);
    lines.push({
      from: riskKey,
      text: t("relationLine.avoidanceMeans"),
      to: avoidanceKey,
    } as Line);
  });
};

const addAvoidanceSubavoidance = (aKey: string) => {
  const subavoidanceKeys = Object.keys(BREAK.avoidances).filter(
    (avoidanceKey) => avoidanceKey.includes(aKey) && avoidanceKey != aKey
  );
  // console.log(subavoidanceKeys);
  subavoidanceKeys.forEach((subavoidanceKey) => {
    nodes.push({
      id: subavoidanceKey,
      type: RelationType.avoidance,
      text: subavoidanceKey + "<br>" + t(`BREAK.avoidances.${subavoidanceKey}.title`),
      color: RelationTypeMapping[RelationType.avoidance].color,
      data: { isSubNode: true },
    } as Node);
    lines.push({
      from: aKey,
      text: t("relationLine.subAvoidance"),
      to: subavoidanceKey,
    } as Line);
  });
};

/** AttackTool */
const addAttackToolRisk = (attackToolKey: string) => {
  const riskKeys =
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
      .couseRisks;
  riskKeys.forEach((riskKey) => {
    nodes.push({
      id: riskKey,
      type: RelationType.risk,
      text: riskKey + "<br>" + t(`BREAK.risks.${riskKey}.title`),
      color: RelationTypeMapping[RelationType.risk].color,
    } as Node);
    lines.push({
      from: attackToolKey,
      text: t("relationLine.makeRisk"),
      to: riskKey,
    } as Line);
  });
};

const addAttackToolAvoidance = (attackToolKey: string) => {
  const avoidanceKeys =
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
      .avoidances;
  avoidanceKeys.forEach((avoidanceKey) => {
    nodes.push({
      id: avoidanceKey,
      type: RelationType.avoidance,
      text: avoidanceKey + "<br>" + t(`BREAK.avoidances.${avoidanceKey}.title`),
      color: RelationTypeMapping[RelationType.avoidance].color,
    } as Node);
    lines.push({
      from: attackToolKey,
      text: t("relationLine.avoidanceMeans"),
      to: avoidanceKey,
    } as Line);
  });
};

const addAttackTool_RiskAvoidanceRelation = (attackToolKey: string) => {
  const riskKeys =
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
      .couseRisks;
  const avoidanceKeys =
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
      .avoidances;
  riskKeys.forEach((riskKey) => {
    BREAK.risks[riskKey as keyof typeof BREAK.risks].avoidances.forEach(
      (avoidanceKey) => {
        if (avoidanceKeys.includes(avoidanceKey)) {
          lines.push({
            from: riskKey,
            text: t("relationLine.avoidanceMeans"),
            to: avoidanceKey,
          } as Line);
        }
      }
    );
  });
};

const addAttackToolThreatActor = (attackToolKey: string) => {
  const builderThreatActorKeys = Object.keys(BREAK.threatActors).filter(
    (taKey) =>
      BREAK.threatActors[
        taKey as keyof typeof BREAK.threatActors
      ].buildAttackTools.includes(attackToolKey as never)
  );
  builderThreatActorKeys.forEach((builderThreatActorKey) => {
    nodes.push({
      id: builderThreatActorKey,
      type: RelationType.threatActor,
      text: builderThreatActorKey + "<br>" + t(`BREAK.threatActors.${builderThreatActorKey}.title`),
      color: RelationTypeMapping[RelationType.threatActor].color,
    } as Node);
    lines.push({
      from: builderThreatActorKey,
      text: t("relationLine.buildAttackTool"),
      to: attackToolKey,
    } as Line);
  });

  const userThreatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) =>
    BREAK.threatActors[
      taKey as keyof typeof BREAK.threatActors
    ].useAttackTools.includes(attackToolKey as never)
  );
  userThreatActorKeys.forEach((userThreatActorKey) => {
    nodes.push({
      id: userThreatActorKey,
      type: RelationType.threatActor,
      text: userThreatActorKey + "<br>" + t(`BREAK.threatActors.${userThreatActorKey}.title`),
      color: RelationTypeMapping[RelationType.threatActor].color,
    } as Node);
    lines.push({
      from: userThreatActorKey,
      text: t("relationLine.useAttackTool"),
      to: attackToolKey,
    } as Line);
  });
};

const addAttackTool_ThreatActorRiskRelation = (attackToolKey: string) => {
  const builderThreatActorKeys = Object.keys(BREAK.threatActors).filter(
    (taKey) =>
      BREAK.threatActors[
        taKey as keyof typeof BREAK.threatActors
      ].buildAttackTools.includes(attackToolKey as never)
  );
  const userThreatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) =>
    BREAK.threatActors[
      taKey as keyof typeof BREAK.threatActors
    ].useAttackTools.includes(attackToolKey as never)
  );
  const riskKeys =
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
      .couseRisks;
  builderThreatActorKeys.forEach((builderThreatActorKey) => {
    riskKeys.forEach((riskKey) => {
      if (
        BREAK.threatActors[
          builderThreatActorKey as keyof typeof BREAK.threatActors
        ].couseRisks.includes(riskKey as never)
      ) {
        lines.push({
          from: riskKey,
          text: t("relationLine.attackToolMaker"),
          to: builderThreatActorKey,
        } as Line);
      }
    });
  });
  userThreatActorKeys.forEach((userThreatActorKey) => {
    riskKeys.forEach((riskKey) => {
      if (
        BREAK.threatActors[
          userThreatActorKey as keyof typeof BREAK.threatActors
        ].couseRisks.includes(riskKey as never)
      ) {
        lines.push({
          from: userThreatActorKey,
          text: t("relationLine.causeRisk"),
          to: riskKey,
        } as Line);
      }
    });
  });
};

const addAttackToolSubattackTool = (atKey: string) => {
  const subattackToolKeys = Object.keys(BREAK.attackTools).filter(
    (attackToolKey) => attackToolKey.includes(atKey) && attackToolKey != atKey
  );
  subattackToolKeys.forEach((subattackToolKey) => {
    nodes.push({
      id: subattackToolKey,
      type: RelationType.attackTool,
      text:
        subattackToolKey + "<br>" + t(`BREAK.attackTools.${subattackToolKey}.title`),
      color: RelationTypeMapping[RelationType.attackTool].color,
      data: { isSubNode: true },
    } as Node);
    lines.push({
      from: atKey,
      text: t("relationLine.subAttackTool"),
      to: subattackToolKey,
    } as Line);
  });
};

/** ThreatActor */
const addThreatActorRisk = (threatActorKey: string) => {
  const riskKeys = BREAK.threatActors[threatActorKey].couseRisks;
  riskKeys.forEach((riskKey) => {
    nodes.push({
      id: riskKey,
      type: RelationType.risk,
      text: riskKey + "<br>" + t(`BREAK.risks.${riskKey}.title`),
      color: RelationTypeMapping[RelationType.risk].color,
    } as Node);
    lines.push({
      from: threatActorKey,
      text: t("relationLine.causeRisk"),
      to: riskKey,
    } as Line);
  });
};

const addThreatActorAttackTool = (threatActorKey: string) => {
  const buildAttackToolKeys =
    BREAK.threatActors[threatActorKey].buildAttackTools;
  buildAttackToolKeys.forEach((buildAttackToolKey) => {
    nodes.push({
      id: buildAttackToolKey,
      type: RelationType.attackTool,
      text: buildAttackToolKey + "<br>" + t(`BREAK.attackTools.${buildAttackToolKey}.title`),
      color: RelationTypeMapping[RelationType.attackTool].color,
    } as Node);
    lines.push({
      from: threatActorKey,
      text: t("relationLine.buildAttackTool"),
      to: buildAttackToolKey,
    } as Line);
  });

  const useAttackToolKeys = BREAK.threatActors[threatActorKey].useAttackTools;
  useAttackToolKeys.forEach((useAttackToolKey) => {
    nodes.push({
      id: useAttackToolKey,
      type: RelationType.attackTool,
      text: useAttackToolKey + "<br>" + t(`BREAK.attackTools.${useAttackToolKey}.title`),
      color: RelationTypeMapping[RelationType.attackTool].color,
    } as Node);
    lines.push({
      from: threatActorKey,
      text: t("relationLine.useAttackTool"),
      to: useAttackToolKey,
    } as Line);
  });
};

const addThreatActor_AttackToolRiskRelation = (threatActorKey: string) => {
  const attackToolKeys = [
    ...BREAK.threatActors[threatActorKey].buildAttackTools,
    ...BREAK.threatActors[threatActorKey].useAttackTools,
  ];
  const riskKeys = BREAK.threatActors[threatActorKey].couseRisks;
  attackToolKeys.forEach((attackToolKey) => {
    riskKeys.forEach((riskKey) => {
      if (
        BREAK.attackTools[
          attackToolKey as keyof typeof BREAK.attackTools
        ].couseRisks.includes(riskKey as never)
      ) {
        lines.push({
          from: attackToolKey,
          text: t("relationLine.causeRisk"),
          to: riskKey,
        } as Line);
      }
    });
  });
};

const addThreatActorSubthreatActor = (taKey: string) => {
  const subthreatActorKeys = Object.keys(BREAK.threatActors).filter(
    (threatActorKey) =>
      threatActorKey.includes(taKey) && threatActorKey != taKey
  );
  subthreatActorKeys.forEach((subthreatActorKey) => {
    nodes.push({
      id: subthreatActorKey,
      type: RelationType.threatActor,
      text:
        subthreatActorKey + "<br>" + t(`BREAK.threatActors.${subthreatActorKey}.title`),
      color: RelationTypeMapping[RelationType.threatActor].color,
      data: { isSubNode: true },
    } as Node);
    lines.push({
      from: taKey,
      text: t("relationLine.subThreatActor"),
      to: subthreatActorKey,
    } as Line);
  });
};
/**
 * 生成关系图数据
 */
// 删除lines中的重复数据
const uniqLines = () => {
  const linesSet = new Set();
  lines.forEach((line) => {
    linesSet.add(JSON.stringify(line));
  });
  lines.splice(0, lines.length);
  linesSet.forEach((line) => {
    lines.push(JSON.parse(line as string) as Line);
  });
};
// 设置关系图数据
const setRGJsonData = () => {
  uniqLines();
  graphRef$?.value?.setJsonData(jsonData);
  // graphRef$?.value?.setOptions(graphOptions);
  // 重新获取所有连线类型，服务于筛选功能
  getLineType();
};

const genRGJsonData = (
  reqType: RelationType,
  nodeType: RelationType,
  nodeId: string
) => {
  if (nodeType === RelationType.risk) {
    if (reqType == RelationType.avoidance) {
      addRiskAvoidance(nodeId);
    } else if (reqType == RelationType.attackTool) {
      addRiskAttackTool(nodeId);
    } else if (reqType == RelationType.threatActor) {
      addRiskThreatActor(nodeId);
    } else if (reqType == RelationType.all) {
      addRiskAvoidance(nodeId);
      addRiskAttackTool(nodeId);
      addRisk_AvoidanceAttackToolRelation(nodeId);
      addRiskThreatActor(nodeId);
      addRisk_ThreatActorAttackToolRelation(nodeId);
      addRiskSubrisk(nodeId);
    }
  } else if (nodeType === RelationType.avoidance) {
    if (reqType == RelationType.risk) {
      addAvoidanceRisk(nodeId);
    }
    if (reqType == RelationType.all) {
      addAvoidanceRisk(nodeId);
      addAvoidanceSubavoidance(nodeId);
    }
  } else if (nodeType === RelationType.attackTool) {
    if (reqType == RelationType.risk) {
      addAttackToolRisk(nodeId);
    } else if (reqType == RelationType.avoidance) {
      addAttackToolAvoidance(nodeId);
    } else if (reqType == RelationType.threatActor) {
      addAttackToolThreatActor(nodeId);
    } else if (reqType == RelationType.all) {
      addAttackToolRisk(nodeId);
      addAttackToolAvoidance(nodeId);
      addAttackTool_RiskAvoidanceRelation(nodeId);
      addAttackToolThreatActor(nodeId);
      addAttackTool_ThreatActorRiskRelation(nodeId);
      addAttackToolSubattackTool(nodeId);
    }
  } else if (nodeType === RelationType.threatActor) {
    if (reqType == RelationType.risk) {
      addThreatActorRisk(nodeId);
    } else if (reqType == RelationType.attackTool) {
      addThreatActorAttackTool(nodeId);
    } else if (reqType == RelationType.all) {
      addThreatActorRisk(nodeId);
      addThreatActorAttackTool(nodeId);
      addThreatActor_AttackToolRiskRelation(nodeId);
      addThreatActorSubthreatActor(nodeId);
    }
  }
  setRGJsonData();
};

/**
 * 初始化
 */
onMounted(() => {
  if (
    !Object.values(RelationType).includes(route.params.type as RelationType) ||
    !Object.keys(
      BREAK[
        RelationTypeMapping[
          route.params.type as keyof typeof RelationTypeMapping
        ].BreakKey as keyof typeof BREAK
      ]
    ).includes(route.params.key as string)
  ) {
    alert(t("unknownTypeOrId"));
    router
      .push({
        name: "relation",
        params: {
          type: "risk",
          key: "R0001",
        },
      })
      .then(() => {
        location.reload();
      });
    return;
  }
  addRootNode();
  genRGJsonData(RelationType.all, relType.value, relKey.value);
  nextTick(() => updateToolbarTitles());
});

// 监听下拉框的值变化，改变路由
watch(
  () => relKey.value,
  (newValue) => {
    if (newValue !== route.params.key) {
      router.push({
        name: "relation",
        params: {
          type: relType.value,
          key: newValue,
        },
      });
    }
  }
);

// 监听路由变化，改变关系图数据
watch(
  () => [route.params.type, route.params.key],
  () => {
    relType.value = route.params.type as RelationType;
    relKey.value = route.params.key as string;
    nodes.splice(0, nodes.length);
    lines.splice(0, lines.length);
    addRootNode();
    genRGJsonData(RelationType.all, relType.value, relKey.value);
  }
);

// 监听语言切换，重新构建图数据（节点/连线文本需重新翻译）
watch(locale, () => {
  nodes.splice(0, nodes.length);
  lines.splice(0, lines.length);
  filterLineType.value = [];
  addRootNode();
  genRGJsonData(RelationType.all, relType.value, relKey.value);
  updateToolbarTitles();
});

// 更新 relation-graph 工具栏按钮的 title（库硬编码中文，需手动替换）
const updateToolbarTitles = () => {
  const titleMap: Record<string, string> = {
    "全屏/退出全屏": t("toolbar.fullscreen"),
    "放大": t("toolbar.zoomIn"),
    "缩小": t("toolbar.zoomOut"),
    "点击停止自动布局": t("toolbar.stopAutoLayout"),
    "点击开始自动调整布局": t("toolbar.autoLayout"),
    "刷新": t("toolbar.refresh"),
    "下载图片": t("toolbar.download"),
  };
  document.querySelectorAll(".rel-toolbar .c-mb-button, .c-mini-toolbar .c-mb-button").forEach((el) => {
    const title = el.getAttribute("title");
    if (title && titleMap[title]) {
      el.setAttribute("title", titleMap[title]);
    }
  });
};

// 鼠标右键下拉菜单
const dropdownStyle = reactive({
  position: "absolute",
  zIndex: 65535,
  top: "0px",
  left: "0px",
  display: "none",
});
const dropdown1 = ref<DropdownInstance>();

const disableContextMenuAll = ref(false);
const disableContextMenuOpenAsRoot = ref(false);

// 当前右键的节点类型和id
const nodeType = ref("" as RelationType);
const nodeId = ref("" as string);

const nodeClick = (node: Node, e: MouseEvent) => {
  dropdownStyle.top = e.clientY + "px";
  dropdownStyle.left = e.clientX + "px";
  dropdownStyle.display = "block";
  dropdown1.value?.handleOpen();

  switch (node.type) {
    case RelationType.risk: {
      RelationTypeMapping[RelationType.risk].disableContextMenu.value = true;
      RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = false;
      RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = false;
      RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = false;
      disableContextMenuAll.value = false;
      disableContextMenuOpenAsRoot.value = false;
      break;
    }
    case RelationType.avoidance: {
      RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
      RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = true;
      RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = true;
      RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = true;
      disableContextMenuAll.value = false;
      disableContextMenuOpenAsRoot.value = false;
      break;
    }
    case RelationType.attackTool: {
      RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
      RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = false;
      RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = true;
      RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = false;
      disableContextMenuAll.value = false;
      disableContextMenuOpenAsRoot.value = false;
      break;
    }
    case RelationType.threatActor: {
      RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
      RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = true;
      RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = false;
      RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = true;
      disableContextMenuAll.value = false;
      disableContextMenuOpenAsRoot.value = false;
      break;
    }
  }

  if (node.id == relKey.value) {
    disableContextMenuOpenAsRoot.value = true;
  }

  nodeType.value = node.type as RelationType;
  nodeId.value = node.id;
};

const clickContextMenu = (reqType: RelationType) => {
  genRGJsonData(reqType, nodeType.value, nodeId.value);
};

const gotoNewRelationView = () => {
  router.push({
    name: "relation",
    params: {
      type: nodeType.value,
      key: nodeId.value,
    },
  });
};

const gotoItemDetailView = () => {
  let routeName = "";
  switch (nodeType.value) {
    case RelationType.risk: {
      routeName = "riskDetail";
      router.push({
        name: routeName,
        params: {
          rKey: nodeId.value,
        },
      });
      return;
    }
    case RelationType.avoidance: {
      routeName = "avoidances";
      break;
    }
    case RelationType.attackTool: {
      routeName = "attackTools";
      break;
    }
    case RelationType.threatActor: {
      routeName = "threatActors";
      break;
    }
  }
  router.push({
    name: routeName,
    hash: "#" + nodeId.value,
  });
};
/**
 * 筛选
 */
const filterRelationType = ref([
  RelationType.risk,
  RelationType.avoidance,
  RelationType.attackTool,
  RelationType.threatActor,
] as string[]);

const filterSubNode = ref(true);

const totalLineType = ref([] as string[]);
const getLineType = () => {
  totalLineType.value.splice(0, totalLineType.value.length);
  lines.forEach((line) => {
    if (!totalLineType.value.includes(line.text)) {
      totalLineType.value.push(line.text);
    }
  });
  // 将新增的连线类型默认加入筛选（保持全选状态）
  totalLineType.value.forEach((lineType) => {
    if (!filterLineType.value.includes(lineType)) {
      filterLineType.value.push(lineType);
    }
  });
};
const filterLineType = ref(totalLineType.value);

const doFilter = () => {
  const _all_nodes = graphRef$.value?.getInstance().getNodes();
  const _all_links = graphRef$.value?.getInstance().getLinks();
  _all_nodes?.forEach((thisNode) => {
    const isSubNode = thisNode.data?.isSubNode;
    const _isHideThisNode =
      !filterRelationType.value.includes(thisNode.type as string) ||
      (isSubNode && !filterSubNode.value);
    thisNode.isHide = _isHideThisNode;
  });
  _all_links?.forEach((thisLink) => {
    thisLink.relations.forEach((thisLine) => {
      thisLine.isHide = !filterLineType.value.includes(thisLine.text as string);
    });
  });
  graphRef$.value?.getInstance().dataUpdated();
  graphRef$.value?.getInstance().refresh(true);
};
</script>

<template>
  <!-- 关系图 -->
  <div
    style="border: #efefef solid 1px; height: calc(100vh - 150px); width: 100%"
  >
    <relation-graph ref="graphRef$" :options="graphOptions">
      <template #node="{ node }">
        <div
          style="
            cursor: pointer;
            font-size: 16px;
            display: flex;
            height: inherit;
            align-items: center;
            justify-content: center;
          "
          @dblclick="nodeClick(node, $event)"
          @contextmenu="nodeClick(node, $event)"
          v-html="(node as Node).text"
        ></div>
      </template>
      <template #graph-plug>
        <div class="filter-pane" id="node-filter-pane">
          <div>
            <el-select style="width: 200px" v-model="relType">
              <el-option
                v-for="(item, key) in RelationTypeMapping"
                :label="item.title"
                :key="key"
                :value="key"
              >
              </el-option>
            </el-select>
          </div>
          <div style="margin-top: 8px">
            <el-select style="width: 200px" v-model="relKey">
              <el-option
                v-for="(item, key) in BREAK[
                  RelationTypeMapping[
                    relType as keyof typeof RelationTypeMapping
                  ].BreakKey as keyof typeof BREAK
                ] as any"
                :key="key"
                :label="key + ':' + $t(`BREAK.${RelationTypeMapping[relType as keyof typeof RelationTypeMapping].BreakKey}.${key}.title`)"
                :value="key"
              >
              </el-option>
            </el-select>
          </div>
          <h2>{{ $t('nodeFilter') }}</h2>
          <el-checkbox-group v-model="filterRelationType" @change="doFilter">
            <el-checkbox
              v-for="(item, key) in RelationTypeMapping"
              :key="key"
              :name="key"
              class="filter-checkbox"
              :value="key"
              >{{ item.title }}</el-checkbox
            >
          </el-checkbox-group>
          <el-checkbox v-model="filterSubNode" class="filter-checkbox" @change="doFilter">{{ $t('subNodeFilter') }}</el-checkbox>
        </div>
        <div class="filter-pane" id="line-filter-pane">
          <h2>{{ $t('lineFilter') }}</h2>
          <el-checkbox-group v-model="filterLineType" @change="doFilter">
            <el-checkbox
              class="filter-checkbox"
              v-for="oneType in totalLineType"
              :key="oneType"
              :name="oneType"
              :value="oneType"
              >{{ oneType }}</el-checkbox
            >
          </el-checkbox-group>
        </div>
      </template>
    </relation-graph>
    <el-dropdown ref="dropdown1" :handleOpen="true" :style="dropdownStyle">
      <span class="el-dropdown-link"></span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="(item, key) in RelationTypeMapping"
            :key="key"
            @click="clickContextMenu(key)"
            :disabled="item.disableContextMenu.value"
            >{{ item.title }}</el-dropdown-item
          >
          <el-dropdown-item
            @click="clickContextMenu(RelationType.all)"
            :disabled="disableContextMenuAll"
            >{{ $t('fetchAllRelations') }}</el-dropdown-item
          >
          <el-dropdown-item
            @click="gotoNewRelationView()"
            :disabled="disableContextMenuOpenAsRoot"
            divided
            >{{ $t('openAsRoot') }}</el-dropdown-item
          >
          <el-dropdown-item divided @click="gotoItemDetailView()"
            >{{ $t('viewDetail') }}</el-dropdown-item
          >
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped>
.filter-pane {
  position: absolute;
  z-index: 700;
  top: 20px;
  padding: 10px 30px;
  border: #efefef solid 1px;
  color: #555555;
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 0.5);
}

.filter-checkbox {
  font-size: xx-small;
  display: block;
}

.filter-pane h2 {
  font-size: medium;
}

#node-filter-pane {
  left: 20px;
}
#line-filter-pane {
  right: 80px;
}

:deep(svg text) {
  font-size: 14px !important;
  fill: #5e6269 !important;
}
</style>
