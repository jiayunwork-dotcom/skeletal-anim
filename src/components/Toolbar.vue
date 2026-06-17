<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="toolbar-section">
        <input
          v-model="projectName"
          type="text"
          class="project-name"
          @input="onProjectNameChange"
        />
      </div>
      <div class="toolbar-section">
        <button class="toolbar-btn" @click="onNewProject">
          <span class="btn-icon">📄</span>
          New
        </button>
        <button class="toolbar-btn" @click="onSave">
          <span class="btn-icon">💾</span>
          Save
        </button>
        <button class="toolbar-btn" @click="onOpenImport">
          <span class="btn-icon">📥</span>
          Import
        </button>
        <button class="toolbar-btn" @click="onOpenExport">
          <span class="btn-icon">📤</span>
          Export
        </button>
      </div>
    </div>
    <div class="toolbar-center">
      <div class="toolbar-section">
        <div class="mode-group">
          <button
            class="mode-btn"
            :class="{ active: editMode === 'select' }"
            @click="setEditMode('select')"
            title="Select Mode (V)"
          >
            <span class="mode-icon">🖱️</span>
            Select
          </button>
          <button
            class="mode-btn"
            :class="{ active: editMode === 'create' }"
            @click="setEditMode('create')"
            title="Create Bone Mode (C)"
          >
            <span class="mode-icon">🦴</span>
            Bone
          </button>
          <button
            class="mode-btn"
            :class="{ active: editMode === 'ik' }"
            @click="setEditMode('ik')"
            title="IK Mode (I)"
          >
            <span class="mode-icon">🔗</span>
            IK
          </button>
          <button
            class="mode-btn"
            :class="{ active: editMode === 'weight' }"
            @click="setEditMode('weight')"
            title="Weight Paint Mode (W)"
          >
            <span class="mode-icon">🎨</span>
            Weight
          </button>
        </div>
      </div>
      <div class="toolbar-section">
        <button
          class="toolbar-btn"
          @click="onLoadHumanoid"
          title="Load Humanoid Preset"
        >
          <span class="btn-icon">🧍</span>
          Humanoid
        </button>
        <button
          class="toolbar-btn"
          @click="onResetPose"
          title="Reset to Bind Pose"
        >
          <span class="btn-icon">↺</span>
          Reset Pose
        </button>
      </div>
    </div>
    <div class="toolbar-right">
      <div class="toolbar-section">
        <div class="render-group">
          <button
            class="render-btn"
            :class="{ active: renderMode === 'solid' }"
            @click="setRenderMode('solid')"
            title="Solid Render"
          >
            🟦
          </button>
          <button
            class="render-btn"
            :class="{ active: renderMode === 'wireframe' }"
            @click="setRenderMode('wireframe')"
            title="Wireframe Render"
          >
            🔲
          </button>
          <button
            class="render-btn"
            :class="{ active: renderMode === 'bones' }"
            @click="setRenderMode('bones')"
            title="Bones Only"
          >
            🦴
          </button>
          <button
            class="render-btn"
            :class="{ active: renderMode === 'weight' }"
            @click="setRenderMode('weight')"
            title="Weight Heatmap"
          >
            🌈
          </button>
        </div>
      </div>
      <div class="toolbar-section">
        <button
          class="toolbar-btn toggle-btn"
          :class="{ active: showGrid }"
          @click="toggleGrid"
          title="Toggle Grid"
        >
          <span class="btn-icon">📐</span>
        </button>
        <button
          class="toolbar-btn toggle-btn"
          :class="{ active: showAxes }"
          @click="toggleAxes"
          title="Toggle Axes"
        >
          <span class="btn-icon">📊</span>
        </button>
        <button
          class="toolbar-btn toggle-btn"
          :class="{ active: showOnionSkin }"
          @click="toggleOnionSkin"
          title="Toggle Onion Skin"
        >
          <span class="btn-icon">👻</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRender } from '@/composables/useRender';
import { useSkeleton } from '@/composables/useSkeleton';
import { useIO } from '@/composables/useIO';

const emit = defineEmits<{
  (e: 'openImport'): void;
  (e: 'openExport'): void;
}>();

const {
  editMode,
  renderMode,
  showGrid,
  showAxes,
  showOnionSkin,
  setEditModeValue,
  setRenderModeValue,
  toggleGridVisibility,
  toggleAxesVisibility,
  toggleOnionSkinVisibility,
} = useRender();

const { loadHumanoid, resetSkeletonPose } = useSkeleton();

const { projectName, setProjectName, newProject, saveProject } = useIO();

function setEditMode(mode: 'select' | 'create' | 'ik' | 'weight') {
  setEditModeValue(mode);
}

function setRenderMode(mode: 'solid' | 'wireframe' | 'bones' | 'weight') {
  setRenderModeValue(mode);
}

function toggleGrid() {
  toggleGridVisibility();
}

function toggleAxes() {
  toggleAxesVisibility();
}

function toggleOnionSkin() {
  toggleOnionSkinVisibility();
}

function onLoadHumanoid() {
  loadHumanoid();
}

function onResetPose() {
  resetSkeletonPose();
}

function onProjectNameChange() {
  setProjectName(projectName.value);
}

function onNewProject() {
  if (confirm('Create new project? Unsaved changes will be lost.')) {
    newProject();
  }
}

function onSave() {
  saveProject();
}

function onOpenImport() {
  emit('openImport');
}

function onOpenExport() {
  emit('openExport');
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #252538;
  border-bottom: 1px solid #333348;
  gap: 16px;
  height: 56px;
  box-sizing: border-box;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-right: 1px solid #333348;
}

.toolbar-section:last-child {
  border-right: none;
}

.project-name {
  padding: 6px 10px;
  background: #1a1a2e;
  border: 1px solid #333348;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  min-width: 150px;
}

.project-name:focus {
  outline: none;
  border-color: #4a9eff;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: rgba(74, 158, 255, 0.15);
  border-color: rgba(74, 158, 255, 0.3);
  color: #fff;
}

.toolbar-btn.active {
  background: rgba(74, 158, 255, 0.3);
  border-color: #4a9eff;
  color: #fff;
}

.btn-icon {
  font-size: 14px;
}

.toggle-btn {
  padding: 6px 8px;
}

.mode-group {
  display: flex;
  background: #1a1a2e;
  border-radius: 6px;
  padding: 2px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  color: #fff;
}

.mode-btn.active {
  background: #4a9eff;
  color: #fff;
}

.mode-icon {
  font-size: 14px;
}

.render-group {
  display: flex;
  background: #1a1a2e;
  border-radius: 6px;
  padding: 2px;
}

.render-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.6;
}

.render-btn:hover {
  opacity: 1;
}

.render-btn.active {
  background: #4a9eff;
  opacity: 1;
}
</style>
