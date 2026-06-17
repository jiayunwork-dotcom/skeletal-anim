<template>
  <div class="w-full h-full flex flex-col bg-dark-950 text-gray-200 no-select">
    <!-- 顶部工具栏 -->
    <Toolbar class="h-toolbar shrink-0" />

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 3D视口 -->
      <div class="flex-1 relative">
        <Viewport />
      </div>

      <!-- 垂直分割线 -->
      <div
        class="splitter splitter-horizontal"
        @mousedown="startResize('right', $event)"
      />

      <!-- 右侧面板 -->
      <div
        v-show="showRightPanel"
        class="w-panel flex flex-col shrink-0"
        :style="{ width: rightPanelWidth + 'px' }"
      >
        <!-- 面板标签 -->
        <div class="flex bg-dark-850 border-b border-dark-600">
          <button
            v-for="tab in rightPanelTabs"
            :key="tab.id"
            class="px-3 py-2 text-sm border-b-2 transition-colors"
            :class="
              activeRightTab === tab.id
                ? 'border-accent-primary text-accent-primary bg-dark-800'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-dark-750'
            "
            @click="activeRightTab = tab.id"
          >
            {{ tab.label }}
          </button>
          <button
            class="ml-auto px-2 text-gray-400 hover:text-gray-200"
            @click="showRightPanel = false"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <!-- 面板内容 -->
        <div class="flex-1 overflow-hidden">
          <HierarchyPanel v-show="activeRightTab === 'hierarchy'" />
          <PropertiesPanel v-show="activeRightTab === 'properties'" />
          <IkPanel v-show="activeRightTab === 'ik'" />
          <StateMachinePanel v-show="activeRightTab === 'state'" />
        </div>
      </div>

      <!-- 右侧面板展开按钮 -->
      <button
        v-show="!showRightPanel"
        class="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-dark-800 border border-dark-600 border-r-0 rounded-l-md px-1 py-4 text-gray-400 hover:text-gray-200 hover:bg-dark-700"
        @click="showRightPanel = true"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
    </div>

    <!-- 水平分割线 -->
    <div
      v-show="showTimeline"
      class="splitter splitter-vertical"
      @mousedown="startResize('bottom', $event)"
    />

    <!-- 底部时间轴 -->
    <div
      v-show="showTimeline"
      class="shrink-0"
      :style="{ height: timelineHeight + 'px' }"
    >
      <Timeline />
    </div>

    <!-- 时间轴展开按钮 -->
    <button
      v-show="!showTimeline"
      class="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 bg-dark-800 border border-dark-600 border-b-0 rounded-t-md px-4 py-1 text-gray-400 hover:text-gray-200 hover:bg-dark-700"
      @click="showTimeline = true"
    >
      <ChevronUp class="w-4 h-4" />
    </button>

    <!-- 对话框 -->
    <ImportDialog
      v-if="projectStore.showImportDialog"
      :visible="projectStore.showImportDialog"
      @close="projectStore.closeImportDialog()"
    />
    <ExportDialog
      v-if="projectStore.showExportDialog"
      :visible="projectStore.showExportDialog"
      @close="projectStore.closeExportDialog()"
    />

    <!-- 状态提示 -->
    <div
      v-if="statusMessage"
      class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-sm shadow-lg"
    >
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ChevronRight, ChevronLeft, ChevronUp } from 'lucide-vue-next';
import {
  Toolbar,
  Viewport,
  Timeline,
  HierarchyPanel,
  PropertiesPanel,
  IkPanel,
  StateMachinePanel,
  ImportDialog,
  ExportDialog,
} from './components';
import { useProjectStore, useSkeletonStore, useAnimationStore } from './stores';
import { createHumanoidSkeleton } from './core/skeleton/HumanoidPreset';
import { createPresetAnimations } from './core/animation/PresetAnimations';

const projectStore = useProjectStore();
const skeletonStore = useSkeletonStore();
const animationStore = useAnimationStore();

const showRightPanel = ref(true);
const showTimeline = ref(true);
const rightPanelWidth = ref(280);
const timelineHeight = ref(220);
const activeRightTab = ref<'hierarchy' | 'properties' | 'ik' | 'state'>('hierarchy');
const statusMessage = ref('');

const rightPanelTabs = [
  { id: 'hierarchy' as const, label: '层级' },
  { id: 'properties' as const, label: '属性' },
  { id: 'ik' as const, label: 'IK' },
  { id: 'state' as const, label: '状态机' },
];

let resizingPanel: 'right' | 'bottom' | null = null;
let startMousePos = 0;
let startSize = 0;

function startResize(panel: 'right' | 'bottom', e: MouseEvent) {
  resizingPanel = panel;
  startMousePos = panel === 'right' ? e.clientX : e.clientY;
  startSize = panel === 'right' ? rightPanelWidth.value : timelineHeight.value;
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', stopResize);
  e.preventDefault();
}

function onResize(e: MouseEvent) {
  if (!resizingPanel) return;
  if (resizingPanel === 'right') {
    const delta = startMousePos - e.clientX;
    rightPanelWidth.value = Math.max(200, Math.min(500, startSize - delta));
  } else {
    const delta = startMousePos - e.clientY;
    timelineHeight.value = Math.max(120, Math.min(500, startSize - delta));
  }
}

function stopResize() {
  resizingPanel = null;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', stopResize);
}

function showStatus(msg: string, duration = 2000) {
  statusMessage.value = msg;
  setTimeout(() => {
    statusMessage.value = '';
  }, duration);
}

onMounted(() => {
  const presetSkeleton = createHumanoidSkeleton();
  skeletonStore.setSkeleton(presetSkeleton);
  animationStore.resetAnimator();
  showStatus('已加载人形骨架预设');

  const presets = createPresetAnimations(presetSkeleton);
  if (presets.length > 0) {
    const existingClips = [...animationStore.allClips];
    existingClips.forEach(clip => {
      if (presets.some(p => p.name === clip.name)) {
        animationStore.deleteClip(clip.id);
      }
    });
    presets.forEach(clip => {
      animationStore.addClip(clip);
    });
    animationStore.setActiveClipId(presets[0].id);
    showStatus('已加载预设动画');
  }

  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

function handleKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }

  switch (e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      if (animationStore.isPlaying) {
        animationStore.pause();
      } else {
        animationStore.play();
      }
      break;
    case 'f':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        projectStore.saveProject();
        showStatus('项目已保存');
      }
      break;
    case 'z':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        showStatus('撤销功能开发中');
      }
      break;
    case 'delete':
    case 'backspace':
      if (skeletonStore.selectedBoneId) {
        e.preventDefault();
        skeletonStore.removeBone(skeletonStore.selectedBoneId);
      }
      break;
  }
}
</script>