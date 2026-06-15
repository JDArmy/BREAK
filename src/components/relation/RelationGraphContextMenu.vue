<script setup lang="ts">
import type { DropdownInstance } from "element-plus";
import { TopRight } from "@element-plus/icons-vue";
import type { Ref } from "vue";
import { RelationType } from "@/views/relation/relationTypes";

defineProps<{
  dropdown1?: Ref<DropdownInstance | undefined>;
  dropdownStyle: Record<string, string | number>;
  RelationTypeMapping: Record<string, { title: string; disableContextMenu: { value: boolean } }>;
  disableContextMenuAll: boolean;
  disableContextMenuOpenAsRoot: boolean;
}>();

const emit = defineEmits<{
  clickContextMenu: [reqType: RelationType];
  gotoNewRelationView: [];
  openContextNodeDetailDrawer: [];
  copyContextNodeCsv: [];
  gotoItemDetailView: [];
}>();
</script>

<template>
  <el-dropdown :ref="dropdown1" :handleOpen="true" :style="dropdownStyle">
    <span class="el-dropdown-link"></span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="(item, key) in RelationTypeMapping"
          :key="key"
          :disabled="item.disableContextMenu.value"
          @click="emit('clickContextMenu', key as RelationType)"
        >
          {{ item.title }}
        </el-dropdown-item>
        <el-dropdown-item
          :disabled="disableContextMenuAll"
          @click="emit('clickContextMenu', RelationType.all)"
        >
          {{ $t('fetchAllRelations') }}
        </el-dropdown-item>
        <el-dropdown-item
          divided
          :disabled="disableContextMenuOpenAsRoot"
          @click="emit('gotoNewRelationView')"
        >
          {{ $t('openAsRoot') }}
        </el-dropdown-item>
        <el-dropdown-item @click="emit('openContextNodeDetailDrawer')">
          {{ $t('relationView.nodeDetail') }}
        </el-dropdown-item>
        <el-dropdown-item @click="emit('copyContextNodeCsv')">
          {{ $t('relationView.copyCsv') }}
        </el-dropdown-item>
        <el-dropdown-item divided @click="emit('gotoItemDetailView')">
          <span class="menu-action-with-icon">
            <el-icon><TopRight /></el-icon>
            <span>{{ $t('viewDetail') }}</span>
          </span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.menu-action-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
