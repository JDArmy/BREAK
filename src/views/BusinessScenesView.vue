<script lang="ts" setup>
import BREAK from "@/BREAK";

let businessScenes = Array();
Object.keys(BREAK.businessScenes).forEach((bsKey) => {
  let businessSceneVal =
    BREAK.businessScenes[bsKey as keyof typeof BREAK.businessScenes];
  let businessScene = {
    ...businessSceneVal,
    bsKey: bsKey,
  };
  businessScenes.push(businessScene);
});
</script>
<template lang="">
  <el-table :data="businessScenes" border stripe>
    <el-table-column prop="bsKey" label="bsKey" />
    <el-table-column prop="title" label="title" />
    <el-table-column prop="description" label="description" />
  </el-table>
</template>

<style lang=""></style>
