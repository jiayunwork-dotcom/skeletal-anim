<template>
  <div v-if="visible" class="dialog-overlay" @click.self="onClose">
    <div class="dialog">
      <div class="dialog-header">
        <h3 class="dialog-title">Import File</h3>
        <button class="close-btn" @click="onClose">✕</button>
      </div>
      <div class="dialog-body">
        <div class="import-type-selector">
          <label class="type-option">
            <input
              type="radio"
              v-model="importType"
              value="obj"
            />
            <span class="type-label">
              <span class="type-icon">📦</span>
              OBJ Mesh
            </span>
            <span class="type-desc">Import a static mesh for skinning</span>
          </label>
          <label class="type-option">
            <input
              type="radio"
              v-model="importType"
              value="gltf"
            />
            <span class="type-label">
              <span class="type-icon">🎬</span>
              glTF Model
            </span>
            <span class="type-desc">Import skeleton, mesh, and animations</span>
          </label>
        </div>

        <div class="drop-zone" @click="triggerFileInput" @drop.prevent="onDrop" @dragover.prevent="onDragOver">
          <input
            ref="fileInputRef"
            type="file"
            :accept="acceptedFormats"
            class="file-input"
            @change="onFileSelect"
          />
          <div v-if="!selectedFile" class="drop-content">
            <span class="drop-icon">📁</span>
            <p class="drop-text">Click or drag file here</p>
            <p class="drop-hint">Supported: {{ acceptedFormats }}</p>
          </div>
          <div v-else class="file-info">
            <span class="file-icon">📄</span>
            <div class="file-details">
              <span class="file-name">{{ selectedFile.name }}</span>
              <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
            </div>
            <button class="remove-btn" @click.stop="clearFile">✕</button>
          </div>
        </div>

        <div v-if="error" class="error-message">
          ⚠️ {{ error }}
        </div>

        <div v-if="importType === 'obj'" class="import-options">
          <h4 class="options-title">Import Options</h4>
          <label class="checkbox-label">
            <input type="checkbox" v-model="options.calculateWeights" />
            Auto-calculate weights after import
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="options.centerMesh" />
            Center mesh to origin
          </label>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="onClose">Cancel</button>
        <button
          class="btn btn-primary"
          :disabled="!selectedFile || isLoading"
          @click="onImport"
        >
          {{ isLoading ? 'Importing...' : 'Import' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useIO } from '@/composables/useIO';
import { useSkinning } from '@/composables/useSkinning';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'imported'): void;
}>();

const { importType, setImportType, importFile } = useIO();
const { calculateWeights } = useSkinning();

const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

const options = ref({
  calculateWeights: true,
  centerMesh: true,
});

const acceptedFormats = computed(() => {
  return importType.value === 'obj' ? '.obj' : '.gltf,.glb';
});

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      selectedFile.value = null;
      error.value = null;
      isLoading.value = false;
    }
  }
);

watch(importType, () => {
  selectedFile.value = null;
  error.value = null;
  setImportType(importType.value);
});

function onClose() {
  emit('close');
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function onFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    selectedFile.value = files[0];
    error.value = null;
  }
}

function onDragOver(event: DragEvent) {
  event.dataTransfer!.dropEffect = 'copy';
}

function onDrop(event: DragEvent) {
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (acceptedFormats.value.includes(ext)) {
      selectedFile.value = file;
      error.value = null;
    } else {
      error.value = `Invalid file type. Expected ${acceptedFormats.value}`;
    }
  }
}

function clearFile() {
  selectedFile.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

async function onImport() {
  if (!selectedFile.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const success = await importFile(selectedFile.value);

    if (success) {
      if (importType.value === 'obj' && options.value.calculateWeights) {
        calculateWeights();
      }
      emit('imported');
      onClose();
    } else {
      error.value = 'Failed to import file';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Import failed';
  } finally {
    isLoading.value = false;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
  max-height: 90vh;
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
  overflow-y: auto;
  max-height: calc(90vh - 140px);
}

.import-type-selector {
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

.drop-zone {
  position: relative;
  padding: 32px;
  border: 2px dashed #333348;
  border-radius: 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 16px;
}

.drop-zone:hover {
  border-color: #4a9eff;
  background: rgba(74, 158, 255, 0.05);
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drop-icon {
  font-size: 48px;
  opacity: 0.5;
}

.drop-text {
  margin: 0;
  font-size: 14px;
  color: #ccc;
}

.drop-hint {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #1a1a2e;
  border-radius: 6px;
}

.file-icon {
  font-size: 32px;
}

.file-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.file-name {
  font-size: 13px;
  color: #fff;
  word-break: break-all;
}

.file-size {
  font-size: 11px;
  color: #888;
}

.remove-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

.error-message {
  padding: 12px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 6px;
  color: #ff6b6b;
  font-size: 13px;
  margin-bottom: 16px;
}

.import-options {
  padding: 16px;
  background: #1a1a2e;
  border-radius: 6px;
}

.options-title {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

.btn-primary:hover:not(:disabled) {
  background: #3a8eef;
}

.btn-primary:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}
</style>
