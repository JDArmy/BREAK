<script lang="ts" setup>
import { ref, watch } from "vue";
import BREAK from "@/BREAK";
import { reactive } from "vue";

const breakType = ref("");
const breakKey = ref("");

enum BreakType {
  risks = "risks",
  avoidances = "avoidances",
  attackTools = "attackTools",
  threatActors = "threatActors",
}

enum BreakTypeForder {
  risks = "risks",
  avoidances = "avoidances",
  attackTools = "attack-tools",
  threatActors = "threat-actors",
}

enum BreakTypeTitle {
  risks = "风险",
  avoidances = "规避手段",
  attackTools = "攻击工具",
  threatActors = "威胁行为者",
}

interface Option {
  key: string;
  label: string;
  disabled: boolean;
}

enum relationType {
  one2many = "one2many",
  many2one = "many2one",
}

const relationShips = reactive({
  risks: {
    avoidances: {
      title: "规避手段",
      type: relationType.one2many,
      fromBreakKey: BreakType.risks,
      fromBreakItemKey: "avoidances",
      toBreakKey: BreakType.avoidances,
      val: [] as string[],
      data: [] as Option[],
      jsons: [] as any,
    },
    attackTools: {
      title: "攻击工具",
      type: relationType.many2one,
      fromBreakKey: BreakType.attackTools,
      fromBreakItemKey: "couseRisks",
      toBreakKey: BreakType.risks,
      val: [] as string[],
      data: [] as Option[],
    },
    threatActors: {
      title: "威胁行为者",
      type: relationType.many2one,
      fromBreakKey: BreakType.threatActors,
      fromBreakItemKey: "couseRisks",
      toBreakKey: BreakType.risks,
      val: [] as string[],
      data: [] as Option[],
    },
  },
  avoidances: {
    risks: {
      title: "规避风险",
      type: relationType.many2one,
      fromBreakKey: BreakType.risks,
      fromBreakItemKey: "avoidances",
      toBreakKey: BreakType.avoidances,
      val: [] as string[],
      data: [] as Option[],
    },
    attackTools: {
      title: "攻击工具",
      type: relationType.many2one,
      fromBreakKey: BreakType.attackTools,
      fromBreakItemKey: "avoidances",
      toBreakKey: BreakType.avoidances,
      val: [] as string[],
      data: [] as Option[],
    },
  },
  attackTools: {
    avoidances: {
      title: "规避手段",
      type: relationType.one2many,
      fromBreakKey: BreakType.attackTools,
      fromBreakItemKey: "avoidances",
      toBreakKey: BreakType.avoidances,
      val: [] as string[],
      data: [] as Option[],
    },
    couseRisks: {
      title: "造成风险",
      type: relationType.one2many,
      fromBreakKey: BreakType.attackTools,
      fromBreakItemKey: "couseRisks",
      toBreakKey: BreakType.risks,
      val: [] as string[],
      data: [] as Option[],
    },
    buildAttackTools: {
      title: "制造攻击工具",
      type: relationType.many2one,
      fromBreakKey: BreakType.threatActors,
      fromBreakItemKey: "buildAttackTools",
      toBreakKey: BreakType.attackTools,
      val: [] as string[],
      data: [] as Option[],
    },
    useAttackTools: {
      title: "使用攻击工具",
      type: relationType.many2one,
      fromBreakKey: BreakType.threatActors,
      fromBreakItemKey: "useAttackTools",
      toBreakKey: BreakType.attackTools,
      val: [] as string[],
      data: [] as Option[],
    },
  },
  threatActors: {
    couseRisks: {
      title: "造成风险",
      type: relationType.one2many,
      fromBreakKey: BreakType.threatActors,
      fromBreakItemKey: "couseRisks",
      toBreakKey: BreakType.risks,
      val: [] as string[],
      data: [] as Option[],
    },
    buildAttackTools: {
      title: "制造攻击工具",
      type: relationType.one2many,
      fromBreakKey: BreakType.threatActors,
      fromBreakItemKey: "buildAttackTools",
      toBreakKey: BreakType.attackTools,
      val: [] as string[],
      data: [] as Option[],
    },
    useAttackTools: {
      title: "使用攻击工具",
      type: relationType.one2many,
      fromBreakKey: BreakType.threatActors,
      fromBreakItemKey: "useAttackTools",
      toBreakKey: BreakType.attackTools,
      val: [] as string[],
      data: [] as Option[],
    },
  },
});

const genData = (BreakKey: any) => {
  const data: Option[] = [];
  Object.entries(BREAK[BreakKey as keyof typeof BREAK]).forEach(
    ([key, item]) => {
      data.push({
        key,
        label: key + ": " + item.title,
        disabled: false,
      });
    }
  );
  return data;
};

Object.values(relationShips).forEach((rsItems) => {
  Object.values(rsItems).forEach((rsItem) => {
    if (rsItem.type === relationType.one2many) {
      rsItem.data = genData(rsItem.toBreakKey);
    } else if (rsItem.type === relationType.many2one) {
      rsItem.data = genData(rsItem.fromBreakKey);
    }
  });
});

watch([breakType, breakKey], () => {
  if (breakType.value && breakKey.value) {
    let relationShip =
      relationShips[breakType.value as keyof typeof relationShips];
    Object.values(relationShip).forEach((rsItem) => {
      const val: string[] = [];
      const fromBreakItems = BREAK[rsItem.fromBreakKey as keyof typeof BREAK];

      if (rsItem.type === relationType.one2many) {
        // one2many
        const fromBreakItem = fromBreakItems[
          breakKey.value as keyof typeof fromBreakItems
        ] as any;
        if (fromBreakItem) {
          val.push(
            ...fromBreakItem[
              rsItem.fromBreakItemKey as keyof typeof fromBreakItem
            ]
          );
        }
      } else if (rsItem.type === relationType.many2one) {
        // many2one
        Object.entries(fromBreakItems).forEach(([key, item]) => {
          if (
            item[rsItem.fromBreakItemKey as keyof typeof item].includes(
              breakKey.value
            )
          ) {
            val.push(key);
          }
        });
      }
      rsItem.val = val;
    });
  }
});

const transferChange = (relationItem: any) => {
  if (relationItem.type === relationType.one2many) {
    const breakItems = BREAK[breakType.value as keyof typeof BREAK];
    const breakItem = breakItems[
      breakKey.value as keyof typeof breakItems
    ] as any;
    breakItem[relationItem.fromBreakItemKey as keyof typeof breakItem] = [
      ...new Set(relationItem.val),
    ];
    breakItem[relationItem.fromBreakItemKey as keyof typeof breakItem].sort();

    const json = JSON.stringify({ [breakKey.value]: breakItem }, null, 2);
    const path = `src/BREAK/${BreakTypeForder[breakType.value as keyof typeof BreakTypeForder]}/${breakKey.value}.json`;

    console.log(path, json);
  } else if (relationItem.type === relationType.many2one) {
    const breakItems = BREAK[relationItem.fromBreakKey as keyof typeof BREAK];
    // 枚举所有的breakItems
    Object.entries(breakItems).forEach(([bKey, bItem]) => {
      // 比对所有breakItems的ID是否在relationItem.val中
      if (relationItem.val.includes(bKey)) {
        // 如果在，比对breakKey是否在对应的关系中，如果不在则添加
        bItem[relationItem.fromBreakItemKey as keyof typeof bItem].includes(
          breakKey.value
        ) ||
          bItem[relationItem.fromBreakItemKey as keyof typeof bItem].push(
            breakKey.value
          );
        bItem[relationItem.fromBreakItemKey as keyof typeof bItem] = [
          ...new Set(
            bItem[relationItem.fromBreakItemKey as keyof typeof bItem]
          ),
        ];
        bItem[relationItem.fromBreakItemKey as keyof typeof bItem].sort();

        const json = JSON.stringify({ [bKey]: bItem }, null, 2);
        const path = `src/BREAK/${BreakTypeForder[relationItem.fromBreakKey as keyof typeof BreakTypeForder]}/${bKey}.json`;

        console.log(path, json);
      } else {
        // 如果不在，比对breakKey是否在对应的关系中，如果在则删除
        const index = bItem[
          relationItem.fromBreakItemKey as keyof typeof bItem
        ].indexOf(breakKey.value);
        if (index > -1) {
          bItem[relationItem.fromBreakItemKey as keyof typeof bItem].splice(
            index,
            1
          );
          bItem[relationItem.fromBreakItemKey as keyof typeof bItem] = [
            ...new Set(
              bItem[relationItem.fromBreakItemKey as keyof typeof bItem]
            ),
          ];
          bItem[relationItem.fromBreakItemKey as keyof typeof bItem].sort();

          const json = JSON.stringify({ [bKey]: bItem }, null, 2);
          const path = `src/BREAK/${BreakTypeForder[relationItem.fromBreakKey as keyof typeof BreakTypeForder]}/${bKey}.json`;

          console.log(path, json);
        }
      }
    });
  }
};
</script>

<template>
  <el-row :gutter="20">
    <el-col :md="4">
      <el-select v-model="breakType">
        <el-option
          v-for="bType in BreakType"
          :key="bType"
          :label="BreakTypeTitle[bType]"
          :value="bType"
          @change="breakKey = ''"
        >
        </el-option>
      </el-select>
    </el-col>
    <el-col :md="4">
      <el-select v-model="breakKey">
        <el-option
          v-for="(item, key) in BREAK[breakType as keyof typeof BREAK] as any"
          :key="key"
          :label="key + ':' + item.title"
          :value="key"
        >
        </el-option>
      </el-select>
    </el-col>
  </el-row>
  <template v-if="breakType && breakKey">
    <el-row
      :gutter="20"
      style="padding: 10px"
      v-for="[relationKey, relationItem] of Object.entries(
        relationShips[breakType as keyof typeof relationShips]
      )"
      :key="breakType + relationKey"
    >
      <el-col :md="12">
        <h3 style="text-align: center">
          {{ BreakTypeTitle[breakType as keyof typeof BreakTypeTitle] }}
          的
          {{
            relationItem.type == relationType.one2many
              ? BreakTypeTitle[relationItem.toBreakKey]
              : BreakTypeTitle[relationItem.fromBreakKey]
          }}
          （{{ relationItem.title }}）
        </h3>
        <el-transfer
          v-model="relationItem.val"
          :data="relationItem.data"
          @change="transferChange(relationItem)"
        />
      </el-col>
      <el-col :md="12"></el-col>
    </el-row>
  </template>
</template>

<style>
.el-transfer-panel {
  width: calc(calc(100% - 180px) / 2);
}
/* .el-transfer-panel__list,
.el-transfer-panel__body {
  height: 600px;
} */
</style>
