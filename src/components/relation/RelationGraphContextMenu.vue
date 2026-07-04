<script setup lang="ts">
import type { DropdownInstance } from "element-plus";
import { computed, inject } from "vue";
import { TopRight } from "@element-plus/icons-vue";
import { RelationType } from "@/views/relation/relationTypes";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";

// inject viewModel（RelationView provide），取代 props 钻取
const vm = inject(RELATION_VIEW_MODEL_KEY)!;
// ref/computed 解构安全，模板内自动 unwrap；方法直接解构
const { setDropdownInstance, dropdownStyle, disableContextMenuAll, disableContextMenuOpenAsRoot, clickContextMenu, gotoNewRelationView, openContextNodeDetailDrawer, copyContextNodeCsv, gotoItemDetailView } = vm;
// RelationTypeMapping 是普通对象（非 ref），直接取
const RelationTypeMapping = vm.RelationTypeMapping;
// 原 RelationView 模板 :show-relation-fetch-actions="activeView === 'network'"
const showRelationFetchActions = computed(() => vm.activeView.value === "network");

const setDropdownRef = (instance: DropdownInstance | undefined) => {
  setDropdownInstance?.(instance);
};
</script>

<template>
  <el-dropdown :ref="setDropdownRef" :handleOpen="true" :style="dropdownStyle">
    <span class="el-dropdown-link"></span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item @click="openContextNodeDetailDrawer">
          {{ $t('relationView.nodeDetail') }}
        </el-dropdown-item>
        <el-dropdown-item
          :disabled="disableContextMenuOpenAsRoot"
          @click="gotoNewRelationView"
        >
          {{ $t('openAsRoot') }}
        </el-dropdown-item>
        <el-dropdown-item @click="copyContextNodeCsv">
          {{ $t('relationView.copyRelatedEntities') }}
        </el-dropdown-item>
        <template v-if="showRelationFetchActions">
          <el-dropdown-item
            v-for="([key, item], index) in Object.entries(RelationTypeMapping)"
            :key="key"
            :divided="index === 0"
            :disabled="item.disableContextMenu.value"
            @click="clickContextMenu(key as RelationType)"
          >
            {{ item.title }}
          </el-dropdown-item>
          <el-dropdown-item
            :disabled="disableContextMenuAll"
            @click="clickContextMenu(RelationType.all)"
          >
            {{ $t('fetchAllRelations') }}
          </el-dropdown-item>
        </template>
        <el-dropdown-item :divided="showRelationFetchActions" @click="gotoItemDetailView">
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
