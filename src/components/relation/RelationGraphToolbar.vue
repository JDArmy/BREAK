<script setup lang="ts">
import { Aim, Download, Filter as FilterIcon, FullScreen, InfoFilled, Operation, Refresh, ZoomIn, ZoomOut } from "@element-plus/icons-vue";
import type { NetworkLayoutMode } from "@/views/relation/relationTypes";

defineProps<{
  networkLayoutTooltip: string;
  networkLayoutOptions: { value: NetworkLayoutMode; labelKey: string }[];
  networkState: { layout: NetworkLayoutMode };
  nodeFilterVisible: boolean;
  lineFilterVisible: boolean;
}>();

const emit = defineEmits<{
  fullscreen: [];
  zoomIn: [];
  zoomOut: [];
  layoutCommand: [command: string | number | object];
  refresh: [];
  download: [];
  toggleNodeFilter: [];
  toggleLineFilter: [];
  openNodeDetail: [];
}>();
</script>

<template>
  <div class="graph-toolbar">
    <el-tooltip :content="$t('toolbar.fullscreen')" placement="top">
      <el-button circle size="small" @click="emit('fullscreen')">
        <el-icon><FullScreen /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="$t('toolbar.zoomIn')" placement="top">
      <el-button circle size="small" @click="emit('zoomIn')">
        <el-icon><ZoomIn /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="$t('toolbar.zoomOut')" placement="top">
      <el-button circle size="small" @click="emit('zoomOut')">
        <el-icon><ZoomOut /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="networkLayoutTooltip" placement="top">
      <el-dropdown trigger="click" placement="left" @command="emit('layoutCommand', $event)">
        <el-button circle size="small">
          <el-icon><Aim /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="layout in networkLayoutOptions"
              :key="layout.value"
              :command="layout.value"
              :class="{ 'is-active-layout': layout.value === networkState.layout }"
            >
              {{ $t(layout.labelKey) }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-tooltip>
    <el-tooltip :content="$t('toolbar.refresh')" placement="top">
      <el-button circle size="small" @click="emit('refresh')">
        <el-icon><Refresh /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="$t('toolbar.download')" placement="top">
      <el-button circle size="small" @click="emit('download')">
        <el-icon><Download /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="$t('toolbar.nodeFilterPanel')" placement="top">
      <el-button
        circle
        size="small"
        :class="{ 'is-toolbar-active': nodeFilterVisible }"
        @click="emit('toggleNodeFilter')"
      >
        <el-icon><Operation /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="$t('toolbar.relationFilterPanel')" placement="top">
      <el-button
        circle
        size="small"
        :class="{ 'is-toolbar-active': lineFilterVisible }"
        @click="emit('toggleLineFilter')"
      >
        <el-icon><FilterIcon /></el-icon>
      </el-button>
    </el-tooltip>
    <el-tooltip :content="$t('relationView.nodeDetail')" placement="top">
      <el-button circle size="small" @click="emit('openNodeDetail')">
        <el-icon><InfoFilled /></el-icon>
      </el-button>
    </el-tooltip>
  </div>
</template>

<style scoped>
.graph-toolbar {
  position: absolute;
  z-index: 710;
  top: 50%;
  right: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 48px;
  padding: 10px 7px;
  border: 1px solid var(--break-graph-border);
  border-radius: 8px;
  background: var(--break-bg-card);
  transform: translateY(-50%);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.graph-toolbar .el-button {
  width: 28px;
  height: 28px;
  margin-left: 0;
}

.graph-toolbar .is-toolbar-active {
  border-color: color-mix(in srgb, var(--el-color-primary) 45%, var(--break-graph-border));
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary-light-9) 72%, var(--break-bg-card));
}

.graph-toolbar :deep(.el-button + .el-button) {
  margin-left: 0;
}

.graph-toolbar :deep(.el-dropdown) {
  line-height: 1;
}

.is-active-layout {
  color: var(--el-color-primary);
  font-weight: 600;
}

@media (max-width: 767px) {
  .graph-toolbar {
    top: auto;
    right: 10px;
    bottom: 10px;
    flex-direction: row;
    flex-wrap: wrap;
    max-width: calc(100% - 20px);
    transform: none;
  }
}
</style>
