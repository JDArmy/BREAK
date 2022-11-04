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
const innerDrawer = ref(false);
const avoidanceKey = ref("");
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

const getAvoidanceReferences = (avoidanceKey: string) => {
  return BREAK.avoidances[avoidanceKey as keyof typeof BREAK.avoidances]
    .references;
};
</script>

<template>
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
              innerDrawer = true;
            "
            >{{ aKey + ":&nbsp;" + $t(`BREAK.avoidances.${aKey}.title`) }}</a
          >
        </li>
      </ul>
    </div>
    <div class="desc">
      <strong>{{ $t("riskReference") }}:&nbsp;</strong>
      <ul>
        <li
          v-for="(reference,refIdx) in risks[rKey as keyof typeof risks].references"
        >
          <a :href="reference.link" v-if="reference.link" target="_blank">{{
            $t(`BREAK.risks.${rKey}.references[${refIdx}].title`)
          }}</a>
          <span v-else>
            {{ $t(`BREAK.risks.${rKey}.references[${refIdx}].title`) }}
          </span>
        </li>
      </ul>
    </div>
    <el-drawer
      v-model="innerDrawer"
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
      <div class="desc">
        <strong>{{ $t("references") }}:&nbsp;</strong>
        <ul>
          <li
            v-for="(reference, refIdx) in getAvoidanceReferences(avoidanceKey)"
          >
            <a :href="reference.link" target="_blank">
              {{
                $t(
                  `BREAK.avoidances.${avoidanceKey}.references[${refIdx}].title`
                )
              }}
            </a>
          </li>
        </ul>
      </div>
    </el-drawer>
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
