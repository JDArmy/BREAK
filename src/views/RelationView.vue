<script setup lang="ts">
import { onMounted, ref, reactive, watch } from "vue";
import BREAK from "@/BREAK";
import { useRoute, useRouter } from "vue-router";

import RelationGraph, {
  type RGJsonData,
  type RGLayoutOptions,
  type RGOptions,
} from "relation-graph/vue3";
import type { DropdownInstance } from "element-plus";

const route = useRoute();
const router = useRouter();

enum RelationType {
  risk = "risk",
  avoidance = "avoidance",
  attackTool = "attack-tool",
  threatActor = "threat-actor",
  abilityProvider = "ability-provider",
  all = "all",
}

const RelationTypeMapping = {
  [RelationType.risk]: {
    title: "风险",
    relType: RelationType.risk,
    BreakKey: "risks",
    color: "orange",
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.avoidance]: {
    title: "规避手段",
    relType: RelationType.avoidance,
    BreakKey: "avoidances",
    color: "green",
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.attackTool]: {
    title: "攻击工具",
    relType: RelationType.attackTool,
    BreakKey: "attackTools",
    color: "blue",
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.threatActor]: {
    title: "威胁行为者",
    relType: RelationType.threatActor,
    BreakKey: "threatActors",
    color: "red",
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.abilityProvider]: {
    title: "能力提供者",
    relType: RelationType.abilityProvider,
    BreakKey: "abilityProviders",
    color: "purple",
    disableContextMenu: ref<boolean>(false),
  },
};

const relType = ref<RelationType>(route.params.type as RelationType);
const relKey = ref<string>(route.params.key as string);

const graphRef$ = ref<RelationGraph>();

const graphOptions: RGOptions = reactive({
  allowShowMiniToolBar: true, //是否显示工具栏
  disableZoom: false, //是否禁用缩放
  disableDragCanvas: false, //是否禁用拖拽画布
  defaultExpandHolderPosition: "right", //展开按钮默认方向
  defaultShowLineLabel: true, //默认显示连线标签
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
  const item: any = items[relKey.value as keyof typeof items];
  if (item === undefined) {
    alert("未知ID");
    return;
  }

  nodes.push({
    id: relKey.value,
    type: breakItemAttr.relType,
    text: relKey.value + "<br>" + item.title,
    color: breakItemAttr.color,
  } as Node);
};

/** Risk */
const addRiskAvoidance = (rKey: string) => {
  const avoidanceKeys =
    BREAK.risks[rKey as keyof typeof BREAK.risks].avoidances;
  avoidanceKeys.forEach((avoidanceKey) => {
    const avoidance =
      BREAK.avoidances[avoidanceKey as keyof typeof BREAK.avoidances];
    nodes.push({
      id: avoidanceKey,
      type: RelationType.avoidance,
      text: avoidanceKey + "<br>" + avoidance.title,
      color: RelationTypeMapping[RelationType.avoidance].color,
    } as Node);
    lines.push({
      from: rKey,
      text: "规避手段",
      to: avoidanceKey,
    } as Line);
  });
};

const addRiskAttackTool = (rKey: string) => {
  const attackToolKeys = Object.keys(BREAK.attackTools).filter((atKey) =>
    BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].risks.includes(
      rKey as never
    )
  );
  attackToolKeys.forEach((attackToolKey) => {
    const attackTool =
      BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    nodes.push({
      id: attackToolKey,
      type: RelationType.attackTool,
      text: attackToolKey + "<br>" + attackTool.title,
      color: RelationTypeMapping[RelationType.attackTool].color,
    } as Node);
    lines.push({
      from: rKey,
      text: "攻击工具",
      to: attackToolKey,
    } as Line);
  });
};

const addRisk_AvoidanceAttackToolRelation = (rKey: string) => {
  const avoidanceKeys =
    BREAK.risks[rKey as keyof typeof BREAK.risks].avoidances;
  const attackToolKeys = Object.keys(BREAK.attackTools).filter((atKey) =>
    BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].risks.includes(
      rKey as never
    )
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
          text: "规避手段",
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
    ].makeRisks.includes(rKey as never)
  );
  threatActorKeys.forEach((threatActorKey) => {
    const threatActor =
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    nodes.push({
      id: threatActorKey,
      type: RelationType.threatActor,
      text: threatActorKey + "<br>" + threatActor.title,
      color: RelationTypeMapping[RelationType.threatActor].color,
    } as Node);
    lines.push({
      from: threatActorKey,
      text: "造成风险",
      to: rKey,
    } as Line);
  });
};

const addRisk_ThreatActorAttackToolRelation = (rKey: string) => {
  const threatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) =>
    BREAK.threatActors[
      taKey as keyof typeof BREAK.threatActors
    ].makeRisks.includes(rKey as never)
  );
  const attackToolKeys = Object.keys(BREAK.attackTools).filter((atKey) =>
    BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].risks.includes(
      rKey as never
    )
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
          text: "使用攻击工具",
          to: attackToolKey,
        } as Line);
      } else if (
        BREAK.threatActors[
          threatActorKey as keyof typeof BREAK.threatActors
        ].buildAttackTools.includes(attackToolKey)
      ) {
        lines.push({
          from: threatActorKey,
          text: "制作攻击工具",
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
      text: subriskKey + "<br>" + BREAK.risks[subriskKey].title,
      color: RelationTypeMapping[RelationType.risk].color,
    } as Node);
    lines.push({
      from: rKey,
      text: "子风险",
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
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    nodes.push({
      id: riskKey,
      type: RelationType.risk,
      text: riskKey + "<br>" + risk.title,
      color: RelationTypeMapping[RelationType.risk].color,
    } as Node);
    lines.push({
      from: riskKey,
      text: "规避手段",
      to: avoidanceKey,
    } as Line);
  });
};

const addAvoidanceAbilityProvider = (avoidanceKey: string) => {
  const abilityProviderKeys = Object.keys(BREAK.abilityProviders).filter(
    (apKey) =>
      Object.keys(
        BREAK.abilityProviders[apKey as keyof typeof BREAK.abilityProviders]
          .abilities
      ).includes(avoidanceKey as never)
  );
  abilityProviderKeys.forEach((abilityProviderKey) => {
    const abilityProvider =
      BREAK.abilityProviders[
        abilityProviderKey as keyof typeof BREAK.abilityProviders
      ];
    nodes.push({
      id: abilityProviderKey,
      type: RelationType.abilityProvider,
      text: abilityProviderKey + "<br>" + abilityProvider.title,
      color: RelationTypeMapping[RelationType.abilityProvider].color,
    } as Node);
    lines.push({
      from: avoidanceKey,
      text: "能力提供者",
      to: abilityProviderKey,
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
      text: subavoidanceKey + "<br>" + BREAK.avoidances[subavoidanceKey].title,
      color: RelationTypeMapping[RelationType.avoidance].color,
    } as Node);
    lines.push({
      from: aKey,
      text: "子规避手段",
      to: subavoidanceKey,
    } as Line);
  });
};

/** AttackTool */
const addAttackToolRisk = (attackToolKey: string) => {
  const riskKeys =
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools].risks;
  riskKeys.forEach((riskKey) => {
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    nodes.push({
      id: riskKey,
      type: RelationType.risk,
      text: riskKey + "<br>" + risk.title,
      color: RelationTypeMapping[RelationType.risk].color,
    } as Node);
    lines.push({
      from: attackToolKey,
      text: "制造风险",
      to: riskKey,
    } as Line);
  });
};

const addAttackToolAvoidance = (attackToolKey: string) => {
  const avoidanceKeys =
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
      .avoidances;
  avoidanceKeys.forEach((avoidanceKey) => {
    const avoidance =
      BREAK.avoidances[avoidanceKey as keyof typeof BREAK.avoidances];
    nodes.push({
      id: avoidanceKey,
      type: RelationType.avoidance,
      text: avoidanceKey + "<br>" + avoidance.title,
      color: RelationTypeMapping[RelationType.avoidance].color,
    } as Node);
    lines.push({
      from: attackToolKey,
      text: "规避手段",
      to: avoidanceKey,
    } as Line);
  });
};

const addAttackTool_RiskAvoidanceRelation = (attackToolKey: string) => {
  const riskKeys =
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools].risks;
  const avoidanceKeys =
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
      .avoidances;
  riskKeys.forEach((riskKey) => {
    BREAK.risks[riskKey as keyof typeof BREAK.risks].avoidances.forEach(
      (avoidanceKey) => {
        if (avoidanceKeys.includes(avoidanceKey)) {
          lines.push({
            from: riskKey,
            text: "规避手段",
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
    const threatActor =
      BREAK.threatActors[
        builderThreatActorKey as keyof typeof BREAK.threatActors
      ];
    nodes.push({
      id: builderThreatActorKey,
      type: RelationType.threatActor,
      text: builderThreatActorKey + "<br>" + threatActor.title,
      color: RelationTypeMapping[RelationType.threatActor].color,
    } as Node);
    lines.push({
      from: builderThreatActorKey,
      text: "制作攻击工具",
      to: attackToolKey,
    } as Line);
  });

  const userThreatActorKeys = Object.keys(BREAK.threatActors).filter((taKey) =>
    BREAK.threatActors[
      taKey as keyof typeof BREAK.threatActors
    ].useAttackTools.includes(attackToolKey as never)
  );
  userThreatActorKeys.forEach((userThreatActorKey) => {
    const threatActor =
      BREAK.threatActors[userThreatActorKey as keyof typeof BREAK.threatActors];
    nodes.push({
      id: userThreatActorKey,
      type: RelationType.threatActor,
      text: userThreatActorKey + "<br>" + threatActor.title,
      color: RelationTypeMapping[RelationType.threatActor].color,
    } as Node);
    lines.push({
      from: userThreatActorKey,
      text: "使用攻击工具",
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
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools].risks;
  builderThreatActorKeys.forEach((builderThreatActorKey) => {
    riskKeys.forEach((riskKey) => {
      if (
        BREAK.threatActors[
          builderThreatActorKey as keyof typeof BREAK.threatActors
        ].makeRisks.includes(riskKey as never)
      ) {
        lines.push({
          from: riskKey,
          text: "攻击工具制造者",
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
        ].makeRisks.includes(riskKey as never)
      ) {
        lines.push({
          from: userThreatActorKey,
          text: "造成风险",
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
        subattackToolKey + "<br>" + BREAK.attackTools[subattackToolKey].title,
      color: RelationTypeMapping[RelationType.attackTool].color,
    } as Node);
    lines.push({
      from: atKey,
      text: "子攻击工具",
      to: subattackToolKey,
    } as Line);
  });
};

/** ThreatActor */
const addThreatActorRisk = (threatActorKey: string) => {
  const riskKeys = BREAK.threatActors[threatActorKey].makeRisks;
  riskKeys.forEach((riskKey) => {
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    nodes.push({
      id: riskKey,
      type: RelationType.risk,
      text: riskKey + "<br>" + risk.title,
      color: RelationTypeMapping[RelationType.risk].color,
    } as Node);
    lines.push({
      from: threatActorKey,
      text: "造成风险",
      to: riskKey,
    } as Line);
  });
};

const addThreatActorAttackTool = (threatActorKey: string) => {
  const buildAttackToolKeys =
    BREAK.threatActors[threatActorKey].buildAttackTools;
  buildAttackToolKeys.forEach((buildAttackToolKey) => {
    const attackTool =
      BREAK.attackTools[buildAttackToolKey as keyof typeof BREAK.attackTools];
    nodes.push({
      id: buildAttackToolKey,
      type: RelationType.attackTool,
      text: buildAttackToolKey + "<br>" + attackTool.title,
      color: RelationTypeMapping[RelationType.attackTool].color,
    } as Node);
    lines.push({
      from: threatActorKey,
      text: "制作攻击工具",
      to: buildAttackToolKey,
    } as Line);
  });

  const useAttackToolKeys = BREAK.threatActors[threatActorKey].useAttackTools;
  useAttackToolKeys.forEach((useAttackToolKey) => {
    const attackTool =
      BREAK.attackTools[useAttackToolKey as keyof typeof BREAK.attackTools];
    nodes.push({
      id: useAttackToolKey,
      type: RelationType.attackTool,
      text: useAttackToolKey + "<br>" + attackTool.title,
      color: RelationTypeMapping[RelationType.attackTool].color,
    } as Node);
    lines.push({
      from: threatActorKey,
      text: "使用攻击工具",
      to: useAttackToolKey,
    } as Line);
  });
};

const addThreatActor_AttackToolRiskRelation = (threatActorKey: string) => {
  const attackToolKeys = [
    ...BREAK.threatActors[threatActorKey].buildAttackTools,
    ...BREAK.threatActors[threatActorKey].useAttackTools,
  ];
  const riskKeys = BREAK.threatActors[threatActorKey].makeRisks;
  attackToolKeys.forEach((attackToolKey) => {
    riskKeys.forEach((riskKey) => {
      if (riskKeys.includes(riskKey)) {
        lines.push({
          from: attackToolKey,
          text: "造成风险",
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
        subthreatActorKey +
        "<br>" +
        BREAK.threatActors[subthreatActorKey].title,
      color: RelationTypeMapping[RelationType.threatActor].color,
    } as Node);
    lines.push({
      from: taKey,
      text: "子威胁行为者",
      to: subthreatActorKey,
    } as Line);
  });
};
/** AbilityProvider */
const addAbilityProviderAvoidance = (abilityProviderKey: string) => {
  const avoidanceKeys = Object.keys(
    BREAK.abilityProviders[abilityProviderKey].abilities
  );
  avoidanceKeys.forEach((avoidanceKey) => {
    const avoidance =
      BREAK.avoidances[avoidanceKey as keyof typeof BREAK.avoidances];
    nodes.push({
      id: avoidanceKey,
      type: RelationType.avoidance,
      text: avoidanceKey + "<br>" + avoidance.title,
      color: RelationTypeMapping[RelationType.avoidance].color,
    } as Node);
    lines.push({
      from: avoidanceKey,
      text: "能力提供者",
      to: abilityProviderKey,
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
    if (reqType == RelationType.abilityProvider) {
      addAvoidanceAbilityProvider(nodeId);
    }
    if (reqType == RelationType.all) {
      addAvoidanceRisk(nodeId);
      addAvoidanceAbilityProvider(nodeId);
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
  } else if (nodeType === RelationType.abilityProvider) {
    if (reqType == RelationType.avoidance || reqType == RelationType.all) {
      addAbilityProviderAvoidance(nodeId);
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
    alert("未知类型或ID");
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

const nodeClick = (node: Node, e: any) => {
  dropdownStyle.top = e.clientY + "px";
  dropdownStyle.left = e.clientX + "px";
  dropdownStyle.display = "block";
  dropdown1.value?.handleOpen();

  switch (node.type) {
    case RelationType.risk: {
      RelationTypeMapping[RelationType.risk].disableContextMenu.value = true;
      RelationTypeMapping[RelationType.avoidance].disableContextMenu.value =
        false;
      RelationTypeMapping[RelationType.attackTool].disableContextMenu.value =
        false;
      RelationTypeMapping[RelationType.threatActor].disableContextMenu.value =
        false;
      RelationTypeMapping[
        RelationType.abilityProvider
      ].disableContextMenu.value = true;
      disableContextMenuAll.value = false;
      disableContextMenuOpenAsRoot.value = false;
      break;
    }
    case RelationType.avoidance: {
      RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
      RelationTypeMapping[RelationType.avoidance].disableContextMenu.value =
        true;
      RelationTypeMapping[RelationType.attackTool].disableContextMenu.value =
        true;
      RelationTypeMapping[RelationType.threatActor].disableContextMenu.value =
        true;
      RelationTypeMapping[
        RelationType.abilityProvider
      ].disableContextMenu.value = false;
      disableContextMenuAll.value = false;
      disableContextMenuOpenAsRoot.value = false;
      break;
    }
    case RelationType.attackTool: {
      RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
      RelationTypeMapping[RelationType.avoidance].disableContextMenu.value =
        false;
      RelationTypeMapping[RelationType.attackTool].disableContextMenu.value =
        true;
      RelationTypeMapping[RelationType.threatActor].disableContextMenu.value =
        false;
      RelationTypeMapping[
        RelationType.abilityProvider
      ].disableContextMenu.value = true;
      disableContextMenuAll.value = false;
      disableContextMenuOpenAsRoot.value = false;
      break;
    }
    case RelationType.threatActor: {
      RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
      RelationTypeMapping[RelationType.avoidance].disableContextMenu.value =
        true;
      RelationTypeMapping[RelationType.attackTool].disableContextMenu.value =
        false;
      RelationTypeMapping[RelationType.threatActor].disableContextMenu.value =
        true;
      RelationTypeMapping[
        RelationType.abilityProvider
      ].disableContextMenu.value = true;
      disableContextMenuAll.value = false;
      disableContextMenuOpenAsRoot.value = false;
      break;
    }
    case RelationType.abilityProvider: {
      RelationTypeMapping[RelationType.risk].disableContextMenu.value = true;
      RelationTypeMapping[RelationType.avoidance].disableContextMenu.value =
        false;
      RelationTypeMapping[RelationType.attackTool].disableContextMenu.value =
        true;
      RelationTypeMapping[RelationType.threatActor].disableContextMenu.value =
        true;
      RelationTypeMapping[
        RelationType.abilityProvider
      ].disableContextMenu.value = true;
      disableContextMenuAll.value = true;
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
    case RelationType.abilityProvider: {
      routeName = "abilityProviders";
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
  RelationType.abilityProvider,
] as string[]);

const totalLineType = ref([] as string[]);
const getLineType = () => {
  totalLineType.value.splice(0, totalLineType.value.length);
  lines.forEach((line) => {
    if (!totalLineType.value.includes(line.text)) {
      totalLineType.value.push(line.text);
    }
  });
};
const filterLineType = ref(totalLineType.value);

const doFilter = () => {
  const _all_nodes = graphRef$.value?.getInstance().getNodes();
  const _all_links = graphRef$.value?.getInstance().getLinks();
  _all_nodes?.forEach((thisNode) => {
    let _isHideThisNode = false;
    if (!filterRelationType.value.includes(thisNode.type as string)) {
      _isHideThisNode = true;
    }
    thisNode.opacity = _isHideThisNode ? 0.1 : 1;
  });
  _all_links?.forEach((thisLink) => {
    thisLink.relations.forEach((thisLine) => {
      if (filterLineType.value.includes(thisLine.text as string)) {
        thisLine.isHide = false;
      } else {
        thisLine.isHide = true;
      }
    });
  });
  graphRef$.value?.getInstance().dataUpdated();
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
            font-size: xx-small;
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
          <div>
            <el-select style="width: 200px" v-model="relKey">
              <el-option
                v-for="(item, key) in BREAK[
                  RelationTypeMapping[
                    relType as keyof typeof RelationTypeMapping
                  ].BreakKey as keyof typeof BREAK
                ] as any"
                :key="key"
                :label="key + ':' + item.title"
                :value="key"
              >
              </el-option>
            </el-select>
          </div>
          <h2>节点筛选：</h2>
          <el-checkbox-group v-model="filterRelationType" @change="doFilter">
            <el-checkbox
              v-for="(item, key) in RelationTypeMapping"
              :key="key"
              :name="key"
              class="filter-checkbox"
              :label="key"
              :value="key"
              >{{ item.title }}</el-checkbox
            >
          </el-checkbox-group>

          <!--  -->
        </div>
        <div class="filter-pane" id="line-filter-pane">
          <h2>关系筛选：</h2>
          <el-checkbox-group v-model="filterLineType" @change="doFilter">
            <el-checkbox
              class="filter-checkbox"
              v-for="oneType in totalLineType"
              :key="oneType"
              :label="oneType"
              :name="oneType"
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
            >拉取全部关系</el-dropdown-item
          >
          <el-dropdown-item
            @click="gotoNewRelationView()"
            :disabled="disableContextMenuOpenAsRoot"
            divided
            >作为根节点打开</el-dropdown-item
          >
          <el-dropdown-item divided @click="gotoItemDetailView()"
            >查看详细描述</el-dropdown-item
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
</style>
