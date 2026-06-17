<template>
  <div class="panel properties-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        <span class="panel-icon">⚙️</span>
        Properties
      </h3>
    </div>
    <div class="panel-content">
      <div v-if="selectedBone" class="bone-properties">
        <div class="property-group">
          <label class="property-label">Name</label>
          <input
            v-model="boneName"
            type="text"
            class="property-input"
            @input="onNameChange"
          />
        </div>

        <div class="property-group">
          <label class="property-label">Length</label>
          <input
            v-model.number="boneLength"
            type="number"
            step="0.1"
            min="0.1"
            class="property-input"
            @input="onLengthChange"
          />
        </div>

        <div class="property-group">
          <label class="property-label">Rotation (Euler)</label>
          <div class="vector3-inputs">
            <div class="vector-component">
              <span class="component-label x">X</span>
              <input
                v-model.number="rotationX"
                type="number"
                step="1"
                class="property-input"
                @input="onRotationChange"
              />
            </div>
            <div class="vector-component">
              <span class="component-label y">Y</span>
              <input
                v-model.number="rotationY"
                type="number"
                step="1"
                class="property-input"
                @input="onRotationChange"
              />
            </div>
            <div class="vector-component">
              <span class="component-label z">Z</span>
              <input
                v-model.number="rotationZ"
                type="number"
                step="1"
                class="property-input"
                @input="onRotationChange"
              />
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Position</label>
          <div class="vector3-inputs">
            <div class="vector-component">
              <span class="component-label x">X</span>
              <input
                v-model.number="positionX"
                type="number"
                step="0.1"
                class="property-input"
                @input="onPositionChange"
              />
            </div>
            <div class="vector-component">
              <span class="component-label y">Y</span>
              <input
                v-model.number="positionY"
                type="number"
                step="0.1"
                class="property-input"
                @input="onPositionChange"
              />
            </div>
            <div class="vector-component">
              <span class="component-label z">Z</span>
              <input
                v-model.number="positionZ"
                type="number"
                step="0.1"
                class="property-input"
                @input="onPositionChange"
              />
            </div>
          </div>
        </div>

        <div class="property-group">
          <label class="property-label">Parent</label>
          <select v-model="parentId" class="property-input" @change="onParentChange">
            <option :value="null">None (Root)</option>
            <option
              v-for="bone in availableParents"
              :key="bone.id"
              :value="bone.id"
              :disabled="bone.id === selectedBone?.id"
            >
              {{ bone.name }}
            </option>
          </select>
        </div>

        <div class="bone-info">
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value">{{ selectedBone.id }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Children:</span>
            <span class="info-value">{{ childCount }}</span>
          </div>
        </div>
      </div>
      <div v-else class="no-selection">
        <span class="no-selection-icon">👆</span>
        <p>Select a bone to edit its properties</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import * as THREE from 'three';
import { useSkeleton } from '@/composables/useSkeleton';
import { degreesToRadians, radiansToDegrees } from '@/utils/math';

const { selectedBone, allBones, updateName, updateLength, updateRotation, updatePosition, reparent, isDescendant, getChildren } = useSkeleton();

const boneName = ref('');
const boneLength = ref(1);
const rotationX = ref(0);
const rotationY = ref(0);
const rotationZ = ref(0);
const positionX = ref(0);
const positionY = ref(0);
const positionZ = ref(0);
const parentId = ref<string | null>(null);

const childCount = computed(() => {
  if (!selectedBone.value) return 0;
  return getChildren(selectedBone.value.id).length;
});

const availableParents = computed(() => {
  if (!selectedBone.value) return [];
  return allBones.value.filter(
    (b) => b.id !== selectedBone.value?.id && !isDescendant(b.id, selectedBone.value!.id)
  );
});

watch(
  selectedBone,
  (bone) => {
    if (bone) {
      boneName.value = bone.name;
      boneLength.value = bone.length;
      rotationX.value = radiansToDegrees(bone.rotation.x);
      rotationY.value = radiansToDegrees(bone.rotation.y);
      rotationZ.value = radiansToDegrees(bone.rotation.z);
      positionX.value = bone.position[0];
      positionY.value = bone.position[1];
      positionZ.value = bone.position[2];
      parentId.value = bone.parentId;
    }
  },
  { immediate: true }
);

function onNameChange() {
  if (selectedBone.value) {
    updateName(selectedBone.value.id, boneName.value);
  }
}

function onLengthChange() {
  if (selectedBone.value && boneLength.value > 0) {
    updateLength(selectedBone.value.id, boneLength.value);
  }
}

function onRotationChange() {
  if (selectedBone.value) {
    const euler = new THREE.Euler(
      degreesToRadians(rotationX.value),
      degreesToRadians(rotationY.value),
      degreesToRadians(rotationZ.value)
    );
    updateRotation(selectedBone.value.id, euler);
  }
}

function onPositionChange() {
  if (selectedBone.value) {
    const pos = new THREE.Vector3(positionX.value, positionY.value, positionZ.value);
    updatePosition(selectedBone.value.id, pos);
  }
}

function onParentChange() {
  if (selectedBone.value) {
    reparent(selectedBone.value.id, parentId.value);
  }
}
</script>

<style scoped>
.properties-panel {
  flex: 1;
}

.bone-properties {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.property-label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.property-input {
  padding: 6px 8px;
  background: #1a1a2e;
  border: 1px solid #333348;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  font-family: 'Consolas', monospace;
}

.property-input:focus {
  outline: none;
  border-color: #4a9eff;
}

.vector3-inputs {
  display: flex;
  gap: 6px;
}

.vector-component {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.component-label {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
}

.component-label.x {
  background: #ff5555;
}

.component-label.y {
  background: #55ff55;
}

.component-label.z {
  background: #5555ff;
}

.bone-info {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #333348;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.info-label {
  color: #888;
}

.info-value {
  color: #4a9eff;
  font-family: 'Consolas', monospace;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.no-selection-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}
</style>
