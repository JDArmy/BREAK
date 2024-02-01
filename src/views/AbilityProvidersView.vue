<script lang="ts" setup>
import BREAK from "@/BREAK";
import { Link } from "@element-plus/icons-vue";
import { useRoute } from "vue-router";
import iconRelation from "@/components/icons/iconRelation.vue";

const route = useRoute();

let providers = Object.keys(BREAK.abilityProviders).map((apKey) => ({
  apKey: apKey,
  ...BREAK.abilityProviders[apKey as keyof typeof BREAK.abilityProviders],
}));

//页内锚点
const getTableHeight = () =>
  route.hash.split("#")[1] ? "unset" : window.innerHeight - 200;
const tableRowClassName = ({ row }: { row: any }) => {
  if (route.hash.split("#")[1] === row.apKey) {
    return "anchor-row";
  }
  return "";
};
</script>

<template lang="">
  <h3>{{ $t("abilityProviders") }}</h3>
  <el-table
    :height="getTableHeight()"
    :row-class-name="tableRowClassName"
    :data="providers"
    border
    stripe
  >
    <el-table-column prop="logo" width="150" :label="$t('logo')">
      <template #default="scope">
        <a :id="scope.row.apKey" class="ability-provider-anchor"></a>
        <div class="aLogo">
          <img :src="scope.row.logoBase64" />
        </div>
      </template>
    </el-table-column>
    <el-table-column prop="title" width="135" :label="$t('title')">
      <template #default="scope">
        <a :href="scope.row.site" target="_blank">
          <el-icon><Link /></el-icon
          >{{
            scope.row.apKey
              ? $t(`BREAK.abilityProviders.${scope.row.apKey}.title`)
              : ""
          }}
        </a>
        <router-link
          :title="$t('relationMap')"
          class="relation-map-icon"
          :to="{
            name: 'relation',
            params: { type: 'ability-provider', key: scope.row.apKey },
          }"
        >
          <icon-relation width="14px" height="14px" />
        </router-link>
      </template>
    </el-table-column>
    <el-table-column prop="abilities" :label="$t('supportAbilities')">
      <template #default="scope">
        <span
          class="provider-abilities"
          v-for="(ability, aKey) in scope.row.abilities"
          :key="aKey"
        >
          <a :href="ability.link" target="_blank"
            ><el-icon><Link /></el-icon
            >{{ $t(`BREAK.avoidances.${aKey}.title`) }}</a
          >
        </span>
      </template>
    </el-table-column>
    <el-table-column prop="description" :label="$t('description')">
      <template #default="scope">
        {{
          scope.row.apKey
            ? $t(`BREAK.abilityProviders.${scope.row.apKey}.description`)
            : ""
        }}
      </template>
    </el-table-column>
  </el-table>
  <div class="commit-new-provider">
    {{ $t("commitNewProvider") }}:
    <a href="https://github.com/JDArmy/BREAK/issues" target="_blank">
      <el-icon><Link /></el-icon>https://github.com/JDArmy/BREAK/issues
    </a>
    <div>参考：src/BREAK/ability-providers/AP****.json 文件格式。</div>
  </div>
</template>

<style scoped>
.aLogo {
  text-align: center;
}
.aLogo img {
  height: 30px;
  max-width: 120px;
}

.commit-new-provider {
  text-align: center;
  color: grey;
  margin: 50px;
  font-size: 50%;
}

.provider-abilities {
  padding: 10px;
  display: inline-block;
}
.provider-abilities a:hover {
  color: brown;
}

.ability-provider-anchor {
  position: absolute;
  top: -1vh;
  left: 0px;
}
</style>
