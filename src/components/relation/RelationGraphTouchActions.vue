<script setup lang="ts">
import { TopRight } from "@element-plus/icons-vue";
import { RelationType } from "@/views/relation/relationTypes";

defineProps<{
  touchActionVisible: boolean;
  RelationTypeMapping: Record<string, { title: string; disableContextMenu: { value: boolean } }>;
  disableContextMenuAll: boolean;
  disableContextMenuOpenAsRoot: boolean;
  showRelationFetchActions?: boolean;
}>();

const emit = defineEmits<{
  clickContextMenu: [reqType: RelationType];
  gotoNewRelationView: [];
  openTouchNodeDetailDrawer: [];
  copyContextNodeCsv: [];
  gotoItemDetailView: [];
  touchActionClose: [];
}>();
</script>

<template>
  <div v-if="touchActionVisible" class="touch-action-overlay" @click="emit('touchActionClose')">
    <div class="touch-action-sheet" @click.stop>
      <div class="touch-action-item" @click="emit('openTouchNodeDetailDrawer')">
        {{ $t('relationView.nodeDetail') }}
      </div>
      <div
        class="touch-action-item"
        :class="{ disabled: disableContextMenuOpenAsRoot }"
        @click="!disableContextMenuOpenAsRoot && emit('gotoNewRelationView')"
      >
        {{ $t('openAsRoot') }}
      </div>
      <div class="touch-action-item" @click="emit('copyContextNodeCsv')">
        {{ $t('relationView.copyRelatedEntities') }}
      </div>
      <template v-if="showRelationFetchActions">
        <div class="touch-action-divider"></div>
        <div
          v-for="(item, key) in RelationTypeMapping"
          :key="key"
          class="touch-action-item"
          :class="{ disabled: item.disableContextMenu.value }"
          @click="!item.disableContextMenu.value && emit('clickContextMenu', key as RelationType)"
        >
          {{ item.title }}
        </div>
        <div
          class="touch-action-item"
          :class="{ disabled: disableContextMenuAll }"
          @click="!disableContextMenuAll && emit('clickContextMenu', RelationType.all)"
        >
          {{ $t('fetchAllRelations') }}
        </div>
      </template>
      <div class="touch-action-divider"></div>
      <div class="touch-action-item" @click="emit('gotoItemDetailView')">
        <span class="menu-action-with-icon">
          <el-icon><TopRight /></el-icon>
          <span>{{ $t('viewDetail') }}</span>
        </span>
      </div>
      <div class="touch-action-divider"></div>
      <div class="touch-action-item touch-action-cancel" @click="emit('touchActionClose')">
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
