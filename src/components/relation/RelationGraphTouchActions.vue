<script setup lang="ts">
import { computed, inject } from "vue";
import { TopRight } from "@element-plus/icons-vue";
import { RelationType } from "@/views/relation/relationTypes";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";

// inject viewModel（RelationView provide），取代 props 钻取
const vm = inject(RELATION_VIEW_MODEL_KEY)!;
// ref/computed 解构安全，模板内自动 unwrap；方法直接解构
const { touchActionVisible, disableContextMenuAll, disableContextMenuOpenAsRoot, clickContextMenu, gotoNewRelationView, openTouchNodeDetailDrawer, copyContextNodeCsv, gotoItemDetailView, touchActionClose } = vm;
// RelationTypeMapping 是普通对象（非 ref），直接取
const RelationTypeMapping = vm.RelationTypeMapping;
// 原 RelationView 模板 :show-relation-fetch-actions="activeView === 'network'"
const showRelationFetchActions = computed(() => vm.activeView.value === "network");
</script>

<template>
  <div v-if="touchActionVisible" class="touch-action-overlay" @click="touchActionClose">
    <div class="touch-action-sheet" @click.stop>
      <div class="touch-action-item" @click="openTouchNodeDetailDrawer">
        {{ $t('relationView.nodeDetail') }}
      </div>
      <div
        class="touch-action-item"
        :class="{ disabled: disableContextMenuOpenAsRoot }"
        @click="!disableContextMenuOpenAsRoot && gotoNewRelationView()"
      >
        {{ $t('openAsRoot') }}
      </div>
      <div class="touch-action-item" @click="copyContextNodeCsv">
        {{ $t('relationView.copyRelatedEntities') }}
      </div>
      <template v-if="showRelationFetchActions">
        <div class="touch-action-divider"></div>
        <div
          v-for="(item, key) in RelationTypeMapping"
          :key="key"
          class="touch-action-item"
          :class="{ disabled: item.disableContextMenu.value }"
          @click="!item.disableContextMenu.value && clickContextMenu(key as RelationType)"
        >
          {{ item.title }}
        </div>
        <div
          class="touch-action-item"
          :class="{ disabled: disableContextMenuAll }"
          @click="!disableContextMenuAll && clickContextMenu(RelationType.all)"
        >
          {{ $t('fetchAllRelations') }}
        </div>
      </template>
      <div class="touch-action-divider"></div>
      <div class="touch-action-item" @click="gotoItemDetailView">
        <span class="menu-action-with-icon">
          <el-icon><TopRight /></el-icon>
          <span>{{ $t('viewDetail') }}</span>
        </span>
      </div>
      <div class="touch-action-divider"></div>
      <div class="touch-action-item touch-action-cancel" @click="touchActionClose">
        {{ $t('cancel') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-action-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.touch-action-overlay {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2000;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.touch-action-sheet {
  width: 100%;
  max-width: 500px;
  padding: 8px 0;
  border-radius: 16px 16px 0 0;
  background: var(--break-bg-card);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
}

.touch-action-item {
  padding: 14px 20px;
  color: var(--break-text-primary);
  font-size: 16px;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.15s;
}

.touch-action-item:hover,
.touch-action-item:active {
  background: var(--break-bg-secondary);
}

.touch-action-item.disabled {
  color: var(--break-text-weak);
  cursor: not-allowed;
}

.touch-action-divider {
  height: 1px;
  margin: 4px 20px;
  background: var(--break-border);
}

.touch-action-cancel {
  color: var(--break-text-secondary);
  font-weight: 600;
}
</style>
