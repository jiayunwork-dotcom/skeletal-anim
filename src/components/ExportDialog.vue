<template>
  <div v-if="visible" class="dialog-overlay" @click.self="onClose">
    <div class="dialog">
      <div class="dialog-header">
        <h3 class="dialog-title">Export Project</h3>
        <button class="close-btn" @click="onClose">✕</button>
      </div>
      <div class="dialog-body">
        <div class="export-type-selector">
          <label class="type-option">
            <input
              type="radio"
              v-model="exportType"
              value="gltf"
            />
            <span class="type-label">
              <span class="type-icon">🎬</span>
              glTF 2.0
            </span>
            <span class="type-desc">Export full project (skeleton + mesh + animations)</span>
          </label>
          <label class="type-option">
            <input
              type="radio"
              v-model="exportType"
              value="bvh"
            />
            <span class="type-label">
              <span class="type-icon">📊</span>
              BVH
            </span>
            <span class="type-desc">Export only skeletal animation data</span>
          </label>
        </div>

        <div v-if="exportType === 'gltf'" class="export-options">
          <h4 class="options-title">glTF Options</h4>
          <label class="checkbox-label">
            <input type="checkbox" v-model="options.embedImages" checked disabled />
            Embed all resources (GLB format)
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="options.includeAnimations" />
            Include all animation clips
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="options.includeSkin" />
            Include skinning weights
          </label>
        </div>

        <div v-if="exportType === 'bvh'" class="export-options">
          <h4 class="options-title">BVH Options</h4>
          <div class="option-row">
            <label class="option-label">Frames Per Second</label>
            <input
              v-model.number="options.bvhFps"
              type="number"
              min="1"
              max="120"
              class="property-input small"
            />
          </div>
          <div class="option-row">
            <label class="option-label">Animation Clip</label>
            <select v-model="options.selectedClip" class="property-input">
              <option v-for="clip in allClips" :key="clip.id" :value="clip.id">
                {{ clip.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="export-summary">
          <div class="summary-item">
            <span class="summary-label">File name</span>
            <span class="summary-value">{{ fileName }}.{{ exportType === 'gltf' ? 'glb' : 'bvh' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Bones</span>
            <span class="summary-value">{{ boneCount }}</span>
          </div>
          <div class="summary-item" v-if="hasMesh">
            <span class="summary-label">Vertices</span>
            <span class="summary-value">{{ vertexCount }}</span>
          </div>
          <div class="summary-item" v-if="exportType === 'gltf' && options.includeAnimations">
            <span class="summary-label">Animations</span>
            <span class="summary-value">{{ animationCount }}</span>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="onClose">Cancel</button>
        <button class="btn btn-primary" @click="onExport">
          Export
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useIO } from '@/composables/useIO';
import { useSkeleton } from '@/composables/useSkeleton';
import { useAnimation } from '@/composables/useAnimation';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'exported'): void;
}>();

const { exportType, setExportType, exportGltf, exportBvh, projectName } = useIO();
const { allBones, meshData } = useSkeleton();
const { allClips } = useAnimation();

const options = ref({
  embedImages: true,
  includeAnimations: true,
  includeSkin: true,
  bvhFps: 30,
  selectedClip: '' as string,
});

const boneCount = computed(() => allBones.value.length);
const vertexCount = computed(() => meshData.value?.vertices.length || 0);
const hasMesh = computed(() => !!meshData.value);
const animationCount = computed(() => allClips.value.length);
const fileName = computed(() => projectName.value || 'skeletal-anim');

watch(
  () => props.visible,
  (visible) => {
    if (visible && allClips.value.length > 0) {
      options.value.selectedClip = allClips.value[0].id;
    }
  }
);

watch(exportType, () => {
  setExportType(exportType.value);
});

function onClose() {
  emit('close');
}

function onExport() {
  if (exportType.value === 'gltf') {
    exportGltf();
  } else {
    exportBvh();
  }
  emit('exported');
  onClose();
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #252538;
  border-radius: 8px;
  width: 480px;
  max-width: 90vw;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #333348;
}

.dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.dialog-body {
  padding: 20px;
}

.export-type-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.type-option {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: #1a1a2e;
  border: 2px solid #333348;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.type-option:has(input:checked) {
  border-color: #4a9eff;
  background: rgba(74, 158, 255, 0.1);
}

.type-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.type-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.type-icon {
  font-size: 20px;
}

.type-desc {
  margin-top: 4px;
  margin-left: 28px;
  font-size: 12px;
  color: #888;
}

.export-options {
  padding: 16px;
  background: #1a1a2e;
  border-radius: 6px;
  margin-bottom: 16px;
}

.options-title {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.option-row:last-child {
  margin-bottom: 0;
}

.option-label {
  font-size: 13px;
  color: #ccc;
}

.property-input {
  padding: 4px 8px;
  background: #252538;
  border: 1px solid #333348;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  min-width: 120px;
}

.property-input:focus {
  outline: none;
  border-color: #4a9eff;
}

.property-input.small {
  width: 80px;
  min-width: auto;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #ccc;
  cursor: pointer;
  margin-bottom: 8px;
}

.checkbox-label:last-child {
  margin-bottom: 0;
}

.export-summary {
  padding: 16px;
  background: #1a1a2e;
  border-radius: 6px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-label {
  color: #888;
}

.summary-value {
  color: #4a9eff;
  font-weight: 500;
  font-family: 'Consolas', monospace;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #333348;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #333348;
  color: #ccc;
}

.btn-secondary:hover {
  background: #444458;
  color: #fff;
}

.btn-primary {
  background: #4a9eff;
  color: #fff;
}

.btn-primary:hover {
  background: #3a8eef;
}
</style>
