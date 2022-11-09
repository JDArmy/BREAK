<script setup lang="ts">
import { ref, watch } from "vue";
import BREAK from "@/BREAK";

import "element-plus/es/components/drawer/style/css";
import { ElDrawer } from "element-plus";

const props = defineProps<{
  drawer: boolean;
  rKey: string;
}>();
defineEmits(["drawerClose"]);

const risks = BREAK.risks;
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const drawer = ref(false);
drawer.value = props.drawer;

watch(
  () => props.rKey + props.drawer,
  () => {
    drawer.value = props.drawer;
  }
);

const getDrawerWidth = () => {
  return window.innerWidth > 600 ? 600 : "100%";
};

const getInnerDrawerWidth = () => {
  return window.innerWidth > 600 ? 450 : "100%";
};

const getAvoidanceReferences = (aKey: string) => {
  return BREAK.avoidances[aKey as keyof typeof BREAK.avoidances].references;
};

const getAttackToolReferences = (atKey: string) => {
  return BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].references;
};

const getReferences = (rKey: string) =>
  risks[rKey as keyof typeof risks].references;

const getAttackTools = (rKey: string) => {
  return Object.keys(BREAK.attackTools).filter((atKey) =>
    BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].risks.includes(
      rKey as never
    )
  );
};
// const getEvents = (rKey: string) => {
//   let risk = risks[rKey as keyof typeof risks];
//   return risk["events" as keyof typeof risk] as typeof String[];
// };
</script>

<template>
  <!-- 风险详情页 -->
  <el-drawer
    v-model="drawer"
    @closed="$emit('drawerClose')"
    :title="$t('riskDetail')"
    direction="rtl"
    :size="getDrawerWidth()"
  >
    <div class="desc">
      <strong>{{ $t("riskKey") }}:&nbsp;</strong>
      {{ rKey }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskTitle") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskDescription") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.description`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskAttack") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.attack`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskComplexity") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.complexity`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskInfluence") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.influence`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskAvoidances") }}:&nbsp;</strong>
      <ul>
        <li
          v-for="aKey in risks[rKey as keyof typeof risks].avoidances"
          :key="aKey"
        >
          <a
            href="javascript:void(0);"
            @click="
              avoidanceKey = aKey;
              avoidanceDrawer = true;
            "
            >{{ aKey + ":&nbsp;" + $t(`BREAK.avoidances.${aKey}.title`) }}</a
          >
        </li>
      </ul>
    </div>
    <div class="desc" v-if="getReferences(rKey).length > 0">
      <strong>{{ $t("riskReference") }}:&nbsp;</strong>
      <ul>
        <li v-for="(reference, refIdx) in getReferences(rKey)">
          <a :href="reference.link" v-if="reference.link" target="_blank">{{
            $t(`BREAK.risks.${rKey}.references[${refIdx}].title`)
          }}</a>
          <span v-else>
            {{ $t(`BREAK.risks.${rKey}.references[${refIdx}].title`) }}
          </span>
        </li>
      </ul>
    </div>
    <div class="desc" v-if="getAttackTools(rKey).length > 0">
      <strong>{{ $t("attackTools") }}</strong>
      <ul>
        <li v-for="atKey in getAttackTools(rKey)">
          <a
            href="javascript:void(0);"
            @click="
              attackToolKey = atKey;
              attackToolDrawer = true;
            "
            >{{ atKey + ":&nbsp;" + $t(`BREAK.attackTools.${atKey}.title`) }}</a
          >
        </li>
      </ul>
    </div>
  </el-drawer>
  <!-- 手段详情页 -->
  <el-drawer
    v-model="avoidanceDrawer"
    :title="$t('avoidance')"
    :append-to-body="true"
    :size="getInnerDrawerWidth()"
  >
    <div class="desc">
      <strong>{{ $t("ID") }}:&nbsp;</strong>
      {{ avoidanceKey }}
    </div>
    <div class="desc">
      <strong>{{ $t("title") }}:&nbsp;</strong>
      {{ $t(`BREAK.avoidances.${avoidanceKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("summary") }}:&nbsp;</strong>
      {{ $t(`BREAK.avoidances.${avoidanceKey}.summary`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("description") }}:&nbsp;</strong>
      {{ $t(`BREAK.avoidances.${avoidanceKey}.description`) }}
    </div>
    <div class="desc" v-if="getAvoidanceReferences(avoidanceKey).length > 0">
      <strong>{{ $t("references") }}:&nbsp;</strong>
      <ul>
        <li v-for="(reference, refIdx) in getAvoidanceReferences(avoidanceKey)">
          <a :href="reference.link" target="_blank">
            {{
              $t(`BREAK.avoidances.${avoidanceKey}.references[${refIdx}].title`)
            }} </a
          >:
          {{
            $t(
              `BREAK.avoidances.${avoidanceKey}.references[${refIdx}].description`
            )
          }}
        </li>
      </ul>
    </div>
  </el-drawer>
  <!-- 攻击工具详情页 -->
  <el-drawer
    v-model="attackToolDrawer"
    :title="$t('attackTools')"
    :append-to-body="true"
    :size="getInnerDrawerWidth()"
  >
    <div class="desc">
      <strong>{{ $t("ID") }}:&nbsp;</strong>
      {{ attackToolKey }}
    </div>
    <div class="desc">
      <strong>{{ $t("title") }}:&nbsp;</strong>
      {{ $t(`BREAK.attackTools.${attackToolKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("description") }}:&nbsp;</strong>
      {{ $t(`BREAK.attackTools.${attackToolKey}.description`) }}
    </div>
    <div class="desc" v-if="getAttackToolReferences(attackToolKey).length > 0">
      <strong>{{ $t("references") }}:&nbsp;</strong>
      <ul>
        <li
          v-for="(reference, refIdx) in getAttackToolReferences(attackToolKey)"
        >
          <a :href="reference.link" target="_blank">
            {{
              $t(
                `BREAK.attackTools.${attackToolKey}.references[${refIdx}].title`
              )
            }}
          </a>
        </li>
      </ul>
    </div>
  </el-drawer>
</template>

<style scoped>
.desc {
  margin-bottom: 10px;
}

.ability-providers-info {
  color: grey;
  font-size: 50%;
  text-align: center;
  padding-top: 10px;
}
</style>

<style>
.el-drawer__header {
  margin-bottom: 0px;
}
</style>
