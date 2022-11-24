<template lang="">
  <h3>{{ $t("menu.attackTools") }}</h3>
  <el-table :height="getWindowHeight() - 50" :data="attackTools" border stripe>
    <el-table-column prop="atKey" label="ID" :width="100" />
    <el-table-column prop="title" :label="$t('title')" :width="150" />
    <el-table-column prop="description" :label="$t('description')" />
    <el-table-column :label="$t('references')" :width="300">
      <template #default="scope">
        <ul>
          <li v-for="(reference, refIdx) in scope.row.references" :key="refIdx">
            <a :href="reference.link" target="_blank"
              ><el-icon><Link /></el-icon
              >{{
                $t(
                  `BREAK.attackTools.${scope.row.atKey}.references[${refIdx}].title`
                )
              }}</a
            >
          </li>
        </ul>
      </template>
    </el-table-column>
    <el-table-column :label="$t('avoidance')" :width="180">
      <template #default="scope">
        <ul>
          <li v-for="aKey in scope.row.avoidances" :title="aKey" :key="aKey">
            {{ $t(`BREAK.avoidances.${aKey}.title`) }}
          </li>
        </ul>
      </template>
    </el-table-column>
  </el-table>
</template>
<script lang="ts" setup>
import BREAK from "@/BREAK";
import { ElIcon } from "element-plus";
import { Link } from "@element-plus/icons-vue";

let attackTools = Object.keys(BREAK.attackTools).map((atKey) => {
  return {
    atKey: atKey,
    ...BREAK.attackTools[atKey as keyof typeof BREAK.attackTools],
  };
});

let getWindowHeight = () => window.innerHeight;
</script>
<style scoped>
ul {
  padding: 0px;
  margin-left: 5px;
}
</style>
