<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import BREAK from "@/BREAK";
import { reactive } from "vue";
import axios from "axios";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const breakType = ref((route.params.type as string) || "");
const breakKey = ref((route.params.key as string) || "");

const breakItems = computed(() => {
  if (breakType.value === "") return {};
  const bItems = BREAK[breakType.value as keyof typeof BREAK];
  if (!bItems) {
    return {};
  }
  return bItems;
});

const breakItem = computed((): BreakItem => {
  if (!breakItems.value) {
    return {} as BreakItem;
  }
  if (breakKey.value === "") {
    return {} as BreakItem;
  }
  const bItem = breakItems.value[
    breakKey.value as keyof typeof breakItems.value
  ] as BreakItem | undefined;
  if (bItem === undefined) {
    return {} as BreakItem;
  }
  return bItem;
});

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
  description: string;
  disabled: boolean;
}

enum relationType {
  one2many = "one2many",
  many2one = "many2one",
}

interface Reference {
  link: string;
  title: string;
  type?: string;
  source?: string;
  language?: string;
  evidenceLevel?: string;
  collectedBy?: string;
  collectedAt?: string;
  verifiedAt?: string;
  note?: string;
}

interface BreakItem {
  title: string;
  description: string;
  updated?: string;
  references?: Reference[];
  [key: string]: unknown;
}

interface RelationItem {
  title: string;
  type: relationType;
  fromBreakKey: BreakType;
  fromBreakItemKey: string;
  toBreakKey: BreakType;
  val: string[];
  data: Option[];
}

const relationShips = reactive({
  [BreakType.risks]: {
    avoidances: {
      title: "规避手段",
      type: relationType.one2many,
      fromBreakKey: BreakType.risks,
      fromBreakItemKey: "avoidances",
      toBreakKey: BreakType.avoidances,
      val: [] as string[],
      data: [] as Option[],
      jsons: [] as string[],
    },
    attackTools: {
      title: "攻击工具",
      type: relationType.many2one,
      fromBreakKey: BreakType.attackTools,
      fromBreakItemKey: "directCauseRisks",
      toBreakKey: BreakType.risks,
      val: [] as string[],
      data: [] as Option[],
    },
    indirectAttackTools: {
      title: "攻击工具（间接）",
      type: relationType.many2one,
      fromBreakKey: BreakType.attackTools,
      fromBreakItemKey: "indirectSupportRisks",
      toBreakKey: BreakType.risks,
      val: [] as string[],
      data: [] as Option[],
    },
    threatActors: {
      title: "威胁行为者",
      type: relationType.many2one,
      fromBreakKey: BreakType.threatActors,
      fromBreakItemKey: "directCauseRisks",
      toBreakKey: BreakType.risks,
      val: [] as string[],
      data: [] as Option[],
    },
    indirectThreatActors: {
      title: "威胁行为者（间接）",
      type: relationType.many2one,
      fromBreakKey: BreakType.threatActors,
      fromBreakItemKey: "indirectSupportRisks",
      toBreakKey: BreakType.risks,
      val: [] as string[],
      data: [] as Option[],
    },
  },
  [BreakType.avoidances]: {
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
  [BreakType.attackTools]: {
    avoidances: {
      title: "规避手段",
      type: relationType.one2many,
      fromBreakKey: BreakType.attackTools,
      fromBreakItemKey: "avoidances",
      toBreakKey: BreakType.avoidances,
      val: [] as string[],
      data: [] as Option[],
    },
    directCauseRisks: {
      title: "直接造成风险",
      type: relationType.one2many,
      fromBreakKey: BreakType.attackTools,
      fromBreakItemKey: "directCauseRisks",
      toBreakKey: BreakType.risks,
      val: [] as string[],
      data: [] as Option[],
    },
    indirectSupportRisks: {
      title: "间接关联风险",
      type: relationType.one2many,
      fromBreakKey: BreakType.attackTools,
      fromBreakItemKey: "indirectSupportRisks",
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
  [BreakType.threatActors]: {
    directCauseRisks: {
      title: "直接造成风险",
      type: relationType.one2many,
      fromBreakKey: BreakType.threatActors,
      fromBreakItemKey: "directCauseRisks",
      toBreakKey: BreakType.risks,
      val: [] as string[],
      data: [] as Option[],
    },
    indirectSupportRisks: {
      title: "间接关联风险",
      type: relationType.one2many,
      fromBreakKey: BreakType.threatActors,
      fromBreakItemKey: "indirectSupportRisks",
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

// todo，可以直接编辑 json，然后保存到文件
// const editable = {
//   [BreakType.risks]: [
//     "title",
//     "definition",
//     "description",
//     "complexity",
//     "influence",
//     "references",
//   ],
//   [BreakType.avoidances]: [
//     "title",
//     "category",
//     "definition",
//     "description",
//     "limitation",
//     "references",
//   ],
//   [BreakType.attackTools]: ["title", "description", "references"],
//   [BreakType.threatActors]: ["title", "description", "references"],
// };

const genData = (BreakKey: BreakType) => {
  const data: Option[] = [];
  Object.entries(BREAK[BreakKey as keyof typeof BREAK]).forEach(
    ([key, item]) => {
      data.push({
        key,
        label: key + ": " + item.title,
        description: item.description,
        disabled: false,
      });
    }
  );
  return data;
};

// 初始化左侧数据
Object.values(relationShips).forEach((rsItems) => {
  Object.values(rsItems).forEach((rsItem) => {
    if (rsItem.type === relationType.one2many) {
      rsItem.data = genData(rsItem.toBreakKey);
    } else if (rsItem.type === relationType.many2one) {
      rsItem.data = genData(rsItem.fromBreakKey);
    }
  });
});

// 初始化右侧数据
const genVal = () => {
  const relationShip =
    relationShips[breakType.value as keyof typeof relationShips];
  Object.values(relationShip).forEach((rsItem) => {
    const val: string[] = [];
    const fromBreakItems = BREAK[rsItem.fromBreakKey as keyof typeof BREAK];

    if (rsItem.type === relationType.one2many) {
      // one2many
      const fromBreakItem = fromBreakItems[
        breakKey.value as keyof typeof fromBreakItems
      ] as BreakItem | undefined;
      if (fromBreakItem) {
        val.push(
          ...(fromBreakItem[
            rsItem.fromBreakItemKey as keyof typeof fromBreakItem
          ] as string[])
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
};

if (breakType.value && breakKey.value) {
  genVal();
}
// 监听breakType和breakKey的变化，并初始化右侧数据
watch([breakType, breakKey], () => {
  if (breakType.value && breakKey.value) {
    router.push({
      name: "editorWithParams",
      params: {
        type: breakType.value,
        key: breakKey.value,
      },
    });
    genVal();
    initReferences();
  }
});

// References editing
const references = ref<Reference[]>([]);
const editingRef = ref<Reference | null>(null);
const editingIndex = ref<number>(-1);
const showRefDialog = ref(false);

const initReferences = () => {
  references.value = breakItem.value.references ? [...breakItem.value.references] : [];
};

const addReference = () => {
  editingRef.value = {
    link: "",
    title: "",
    type: "industry",
    source: "",
    language: "zh-CN",
    evidenceLevel: "medium",
    collectedBy: "manual",
    collectedAt: new Date().toISOString().slice(0, 10),
    verifiedAt: new Date().toISOString().slice(0, 10),
    note: "",
  };
  editingIndex.value = -1;
  showRefDialog.value = true;
};

const editReference = (index: number) => {
  editingRef.value = { ...references.value[index] };
  editingIndex.value = index;
  showRefDialog.value = true;
};

const deleteReference = (index: number) => {
  references.value.splice(index, 1);
};

const saveReference = () => {
  if (!editingRef.value || !editingRef.value.link || !editingRef.value.title) {
    alert("链接和标题不能为空");
    return;
  }
  Object.keys(editingRef.value).forEach((key) => {
    const value = editingRef.value?.[key as keyof Reference];
    if (value === "") {
      delete editingRef.value?.[key as keyof Reference];
    }
  });
  if (editingIndex.value === -1) {
    references.value.push(editingRef.value);
  } else {
    references.value[editingIndex.value] = editingRef.value;
  }
  showRefDialog.value = false;
};

const saveReferences = () => {
  const newBreakItem = { ...breakItem.value, references: references.value, updated: getDateTimeString() };
  const newBreakItems: Record<string, unknown> = { [breakKey.value]: newBreakItem };
  let parentKey = breakKey.value;
  if (breakKey.value.indexOf("-") > -1) {
    parentKey = breakKey.value.split("-")[0];
  }
  Object.keys(breakItems.value).forEach((key) => {
    if (key !== breakKey.value && key.indexOf(parentKey) > -1) {
      newBreakItems[key] = breakItems.value[key as keyof typeof breakItems.value];
    }
  });
  const sortedNewBreakItems = Object.keys(newBreakItems)
    .sort()
    .reduce((sortedObj: Record<string, unknown>, key: string) => {
      sortedObj[key] = newBreakItems[key];
      return sortedObj;
    }, {});
  const json = JSON.stringify(sortedNewBreakItems, null, 2);
  const path = `${rootPath}/BREAK/${BreakTypeForder[breakType.value as keyof typeof BreakTypeForder]}/${parentKey}.json`;
  saveFileToServer(path, json);
};

if (breakType.value && breakKey.value) {
  initReferences();
}
// 向服务器保存文件
let saveFileToServerSuccessStatus: boolean = true;
const saveFileToServer = (path: string, json: string) => {
  saveFileToServerSuccessStatus = false;
  const payload = {
    path,
    json,
  };
  axios
    .post("http://127.0.0.1:3000/", payload)
    .then((response) => {
      saveFileToServerSuccessStatus = true;
      console.log(response.data);
    })
    .catch((error) => {
      saveFileToServerSuccessStatus = false;
      alert(error.response?.data?.error?.message || error.message);
    });
};
// 监控页面关闭事件，如果数据未完全上传成功，则通过beforeunload事件阻止页面关闭
const onBeforeUnload = (e: BeforeUnloadEvent) => {
  if (!saveFileToServerSuccessStatus) {
    e.preventDefault();
    e.returnValue = "";
  }
};

onMounted(() => {
  window.addEventListener("beforeunload", onBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", onBeforeUnload);
});

const getDateTimeString = () => {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Chongqing",
  }).format(new Date());
};

const rootPath = "src"; //相对于项目根目录的路径
const transferChange = (relationItem: RelationItem) => {
  if (relationItem.type === relationType.one2many) {
    const breakItemOldJson = JSON.stringify(breakItem.value);
    const newBreakItem = breakItem.value as BreakItem;
    (newBreakItem[relationItem.fromBreakItemKey] as unknown) = [
      ...new Set(relationItem.val),
    ];
    (newBreakItem[relationItem.fromBreakItemKey] as string[]).sort();
    // 如果没有变化则不保存
    if (breakItemOldJson === JSON.stringify(newBreakItem)) {
      return;
    }
    // 添加更新时间
    newBreakItem.updated = getDateTimeString();

    const newBreakItems: Record<string, unknown> = { [breakKey.value]: newBreakItem };
    let parentKey = breakKey.value;
    if (breakKey.value.indexOf("-") > -1) {
      parentKey = breakKey.value.split("-")[0];
    }
    Object.keys(breakItems.value).forEach((key) => {
      if (key !== breakKey.value && key.indexOf(parentKey) > -1) {
        newBreakItems[key] =
          breakItems.value[key as keyof typeof breakItems.value];
      }
    });
    const sortedNewBreakItems = Object.keys(newBreakItems)
      .sort()
      .reduce((sortedObj: Record<string, unknown>, key: string) => {
        sortedObj[key] = newBreakItems[key];
        return sortedObj;
      }, {});

    const json = JSON.stringify(sortedNewBreakItems, null, 2);
    const path = `${rootPath}/BREAK/${BreakTypeForder[breakType.value as keyof typeof BreakTypeForder]}/${parentKey}.json`;

    // console.log(path, json);
    saveFileToServer(path, json);
  } else if (relationItem.type === relationType.many2one) {
    // 枚举所有的breakItems
    Object.entries(breakItems.value).forEach(([bKey, bItem]) => {
      const bItemOldJson = JSON.stringify(bItem);
      const itemFields = bItem as BreakItem;
      const fieldArr = itemFields[relationItem.fromBreakItemKey] as string[];
      // 比对所有breakItems的ID是否在relationItem.val中
      if (relationItem.val.includes(bKey)) {
        // 添加操作：如果在，比对breakKey是否在对应的关系中，如果不在则添加
        if (!fieldArr.includes(breakKey.value)) {
          fieldArr.push(breakKey.value);
        }
        itemFields[relationItem.fromBreakItemKey] = [...new Set(fieldArr)];
        (itemFields[relationItem.fromBreakItemKey] as string[]).sort();
      } else {
        // 删除操作：如果不在，比对breakKey是否在对应的关系中，如果在则删除
        const index = fieldArr.indexOf(breakKey.value);
        if (index <= -1) {
          return;
        }
        fieldArr.splice(index, 1);
        itemFields[relationItem.fromBreakItemKey] = [...new Set(fieldArr)];
        (itemFields[relationItem.fromBreakItemKey] as string[]).sort();
      }

      // 如果没有变化则不保存
      if (bItemOldJson === JSON.stringify(itemFields)) {
        return;
      }
      // 添加更新时间
      itemFields.updated = getDateTimeString();

      const newBreakItems: Record<string, unknown> = { [bKey]: itemFields };
      let parentKey = bKey;
      if (bKey.indexOf("-") > -1) {
        parentKey = bKey.split("-")[0];
      }
      Object.keys(breakItems.value).forEach((key) => {
        if (key !== bKey && key.indexOf(parentKey) > -1) {
          newBreakItems[key] =
            breakItems.value[key as keyof typeof breakItems.value];
        }
      });
      const sortedNewBreakItems = Object.keys(newBreakItems)
        .sort()
        .reduce((sortedObj: Record<string, unknown>, key: string) => {
          sortedObj[key] = newBreakItems[key];
          return sortedObj;
        }, {});

      const json = JSON.stringify(sortedNewBreakItems, null, 2);
      const path = `${rootPath}/BREAK/${BreakTypeForder[relationItem.fromBreakKey as keyof typeof BreakTypeForder]}/${parentKey}.json`;

      // console.log(path, json);
      saveFileToServer(path, json);
    });
  }
};
</script>

<template>
  <el-row :gutter="20">
    <el-col :md="4">
      <el-select v-model="breakType" @change="breakKey = ''">
        <el-option
          v-for="bType in BreakType"
          :key="bType"
          :label="BreakTypeTitle[bType]"
          :value="bType"
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
    <el-col :md="4">
      最近更新：
      {{ breakItem ? breakItem.updated : "" }}
    </el-col>
  </el-row>
  <template v-if="breakType && breakKey">
    <el-row :gutter="20" style="padding: 10px">
      <el-col
        v-for="[relationKey, relationItem] of Object.entries(
          relationShips[breakType as keyof typeof relationShips]
        )"
        :key="breakType + relationKey"
        :md="12"
      >
        <h3 style="text-align: center">
          {{ breakItem ? breakItem.title : "" }}
          {{ BreakTypeTitle[breakType as keyof typeof BreakTypeTitle] }}
          &nbsp;-&nbsp;
          {{
            relationItem.type == relationType.one2many
              ? BreakTypeTitle[relationItem.toBreakKey]
              : BreakTypeTitle[relationItem.fromBreakKey]
          }}
          （{{ relationItem.title }}）
        </h3>
        <el-transfer v-model="relationItem.val" :data="relationItem.data">
          <template #default="{ option }">
            <span :title="option.description">{{ option.label }}</span>
          </template>
        </el-transfer>
        <div style="text-align: center; margin: 10px">
          <el-button
            type="primary"
            size="default"
            @click="transferChange(relationItem)"
            >提交修改</el-button
          >
        </div>
      </el-col>
      <!-- <el-col :md="12"></el-col> -->
    </el-row>
    <el-row :gutter="20" style="padding: 10px">
      <el-col :md="24">
        <h3 style="text-align: center">参考资料编辑</h3>
        <el-button type="primary" @click="addReference">添加参考资料</el-button>
        <el-table :data="references" style="margin-top: 10px">
          <el-table-column prop="title" label="标题" width="200" />
          <el-table-column prop="link" label="链接" />
          <el-table-column prop="type" label="类型" width="100" />
          <el-table-column prop="source" label="来源" width="120" />
          <el-table-column prop="language" label="语言" width="100" />
          <el-table-column prop="evidenceLevel" label="证据等级" width="100" />
          <el-table-column label="操作" width="150">
            <template #default="{ $index }">
              <el-button size="small" @click="editReference($index)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteReference($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="text-align: center; margin: 10px">
          <el-button type="primary" @click="saveReferences">保存参考资料</el-button>
        </div>
      </el-col>
    </el-row>
    <el-dialog v-model="showRefDialog" title="编辑参考资料" width="600px">
      <el-form v-if="editingRef" label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="editingRef.title" />
        </el-form-item>
        <el-form-item label="链接">
          <el-input v-model="editingRef.link" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="editingRef.type">
            <el-option label="标准" value="standard" />
            <el-option label="学术" value="academic" />
            <el-option label="监管" value="regulation" />
            <el-option label="厂商" value="vendor" />
            <el-option label="新闻" value="news" />
            <el-option label="百科" value="encyclopedia" />
            <el-option label="博客" value="blog" />
            <el-option label="工具" value="tool" />
            <el-option label="行业" value="industry" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model="editingRef.source" placeholder="owasp / nist / arxiv / baidu" />
        </el-form-item>
        <el-form-item label="语言">
          <el-select v-model="editingRef.language">
            <el-option label="中文" value="zh-CN" />
            <el-option label="英文" value="en" />
          </el-select>
        </el-form-item>
        <el-form-item label="证据等级">
          <el-select v-model="editingRef.evidenceLevel">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="采集日期">
          <el-input v-model="editingRef.collectedAt" placeholder="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="验证日期">
          <el-input v-model="editingRef.verifiedAt" placeholder="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editingRef.note" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRefDialog = false">取消</el-button>
        <el-button type="primary" @click="saveReference">确定</el-button>
      </template>
    </el-dialog>
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
