<template>
  <div class="panel ik-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        <span class="panel-icon">🔗</span>
        IK Controls
      </h3>
    </div>
    <div class="panel-content">
      <div class="ik-status">
        <div class="status-item">
          <span class="status-label">Status:</span>
          <span class="status-value" :class="{ active: ikEnabled }">
            {{ ikEnabled ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <div class="status-item" v-if="ikEnabled">
          <span class="status-label">Error:</span>
          <span class="status-value error">{{ ikError.toFixed(4) }}</span>
        </div>
      </div>

      <div class="ik-section">
        <label class="section-label">End Effector</label>
        <select v-model="selectedEndBone" class="property-input" @change="onEndBoneChange">
          <option value="">Select a bone...</option>
          <option v-for="bone in endEffectorCandidates" :key="bone.id" :value="bone.id">
            {{ bone.name }}
          </option>
        </select>
      </div>

      <div class="ik-section" v-if="ikEnabled">
        <label class="section-label">Target Position</label>
        <div class="vector3-inputs">
          <div class="vector-component">
            <span class="component-label x">X</span>
            <input
              v-model.number="targetX"
              type="number"
              step="0.1"
              class="property-input"
              @input="onTargetChange"
            />
          </div>
          <div class="vector-component">
            <span class="component-label y">Y</span>
            <input
              v-model.number="targetY"
              type="number"
              step="0.1"
              class="property-input"
              @input="onTargetChange"
            />
          </div>
          <div class="vector-component">
            <span class="component-label z">Z</span>
            <input
              v-model.number="targetZ"
              type="number"
              step="0.1"
              class="property-input"
              @input="onTargetChange"
            />
          </div>
        </div>
      </div>

      <div class="ik-section">
        <label class="section-label">Rotation Constraints</label>
        <div class="constraint-list" v-if="ikChain.length > 0">
          <div
            v-for="bone in ikChain"
            :key="bone.id"
            class="constraint-item"
          >
            <span class="bone-name">{{ bone.name }}</span>
            <div class="constraint-inputs">
              <input
                v-model.number="constraintMin[bone.id]"
                type="number"
                step="5"
                placeholder="Min"
                class="property-input small"
                @input="onConstraintChange(bone.id)"
              />
              <span class="constraint-sep">to</span>
              <input
                v-model.number="constraintMax[bone.id]"
                type="number"
                step="5"
                placeholder="Max"
                class="property-input small"
                @input="onConstraintChange(bone.id)"
              />
            </div>
          </div>
        </div>
        <p v-else class="hint">Select an end effector bone to configure constraints</p>
      </div>

      <div class="ik-actions">
        <button
          class="btn btn-primary"
          :disabled="!selectedEndBone"
          @click="onToggleIk"
        >
          {{ ikEnabled ? 'Disable IK' : 'Enable IK' }}
        </button>
        <button
          class="btn btn-secondary"
          v-if="ikEnabled"
          @click="onResetTarget"
        >
          Reset Target
        </button>
      </div>

      <div class="preset-constraints">
        <label class="section-label">Presets</label>
        <div class="preset-buttons">
          <button class="btn btn-small" @click="applyKneePreset">Knee (0-150°)</button>
          <button class="btn btn-small" @click="applyElbowPreset">Elbow (0-160°)</button>
          <button class="btn btn-small" @click="clearAllConstraints">Clear All</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import * as THREE from 'three';
import { useIK } from '@/composables/useIK';
import { useSkeleton } from '@/composables/useSkeleton';
import { degreesToRadians, radiansToDegrees } from '@/utils/math';

const {
  ikEnabled,
  ikTarget,
  ikChain,
  toggleIkMode,
  enableIkMode,
  disableIkMode,
  updateTargetPosition,
  addRotationConstraint,
  removeRotationConstraint,
  getConstraint,
  hasConstraint,
  getEndEffectorError,
} = useIK();

const { allBones, skeleton } = useSkeleton();

const selectedEndBone = ref('');
const targetX = ref(0);
const targetY = ref(1.5);
const targetZ = ref(0);
const constraintMin = reactive<Record<string, number>>({});
const constraintMax = reactive<Record<string, number>>({});

const ikError = computed(() => getEndEffectorError());

const endEffectorCandidates = computed(() => {
  return allBones.value.filter((bone) => {
    const children = allBones.value.filter((b) => b.parentId === bone.id);
    return children.length === 0;
  });
});

watch(ikTarget, (target) => {
  targetX.value = parseFloat(target.x.toFixed(3));
  targetY.value = parseFloat(target.y.toFixed(3));
  targetZ.value = parseFloat(target.z.toFixed(3));
});

watch(ikChain, (chain) => {
  chain.forEach((bone) => {
    if (hasConstraint(bone.id)) {
      const constraint = getConstraint(bone.id);
      if (constraint) {
        constraintMin[bone.id] = radiansToDegrees(constraint.minAngle);
        constraintMax[bone.id] = radiansToDegrees(constraint.maxAngle);
      }
    } else if (!constraintMin[bone.id] && !constraintMax[bone.id]) {
      constraintMin[bone.id] = -180;
      constraintMax[bone.id] = 180;
    }
  });
}, { immediate: true });

function onEndBoneChange() {
  if (selectedEndBone.value) {
    enableIkMode(selectedEndBone.value);
  }
}

function onToggleIk() {
  if (!selectedEndBone.value) return;
  toggleIkMode(selectedEndBone.value);
}

function onTargetChange() {
  if (ikEnabled.value) {
    const target = new THREE.Vector3(targetX.value, targetY.value, targetZ.value);
    updateTargetPosition(target);
  }
}

function onConstraintChange(boneId: string) {
  const min = constraintMin[boneId];
  const max = constraintMax[boneId];

  if (min !== undefined && max !== undefined && min !== -180 && max !== 180) {
    addRotationConstraint(boneId, degreesToRadians(min), degreesToRadians(max));
  } else {
    removeRotationConstraint(boneId);
  }
}

function onResetTarget() {
  if (ikEnabled.value) {
    const endPos = ikChain.value[ikChain.value.length - 1]?.getEndPosition(skeleton.value.bones);
    if (endPos) {
      targetX.value = parseFloat(endPos.x.toFixed(3));
      targetY.value = parseFloat(endPos.y.toFixed(3));
      targetZ.value = parseFloat(endPos.z.toFixed(3));
      updateTargetPosition(endPos);
    }
  }
}

function applyKneePreset() {
  ikChain.value.forEach((bone) => {
    if (bone.name.toLowerCase().includes('knee')) {
      constraintMin[bone.id] = 0;
      constraintMax[bone.id] = 150;
      onConstraintChange(bone.id);
    }
  });
}

function applyElbowPreset() {
  ikChain.value.forEach((bone) => {
    if (bone.name.toLowerCase().includes('elbow')) {
      constraintMin[bone.id] = 0;
      constraintMax[bone.id] = 160;
      onConstraintChange(bone.id);
    }
  });
}

function clearAllConstraints() {
  ikChain.value.forEach((bone) => {
    constraintMin[bone.id] = -180;
    constraintMax[bone.id] = 180;
    removeRotationConstraint(bone.id);
  });
}
</script>

<style scoped>
.ik-panel {
  height: 320px;
}

.ik-status {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #1a1a2e;
  border-radius: 4px;
  margin-bottom: 12px;
}

.status-item {
  display: flex;
  gap: 6px;
  font-size: 12px;
}

.status-label {
  color: #888;
}

.status-value {
  color: #ff6b6b;
  font-weight: bold;
}

.status-value.active {
  color: #4ade80;
}

.status-value.error {
  color: #fbbf24;
  font-family: 'Consolas', monospace;
}

.ik-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.section-label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.constraint-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
}

.constraint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #1a1a2e;
  border-radius: 4px;
}

.bone-name {
  flex: 1;
  font-size: 11px;
  color: #ccc;
}

.constraint-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.constraint-sep {
  font-size: 11px;
  color: #666;
}

.property-input.small {
  width: 50px;
  padding: 4px 6px;
  font-size: 11px;
}

.ik-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
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

.btn-secondary {
  background: #333348;
  color: #ccc;
}

.btn-secondary:hover {
  background: #444458;
}

.btn-small {
  padding: 4px 8px;
  background: #333348;
  color: #ccc;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small:hover {
  background: #444458;
  color: #fff;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hint {
  font-size: 11px;
  color: #666;
  text-align: center;
  padding: 12px;
}
</style>
