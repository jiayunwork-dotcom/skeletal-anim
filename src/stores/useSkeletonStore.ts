import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as THREE from 'three';
import { Skeleton } from '@/core/skeleton/Skeleton';
import { Bone } from '@/core/skeleton/Bone';
import { createHumanoidSkeleton } from '@/core/skeleton/HumanoidPreset';
import { FabrikSolver } from '@/core/ik/FabrikSolver';
import { RotationConstraint } from '@/core/ik/RotationConstraint';
import { WeightCalculator } from '@/core/skinning/WeightCalculator';
import { WeightPainter } from '@/core/skinning/WeightPainter';
import type { MeshData, WeightPaintConfig } from '@/types';
import { generateId } from '@/utils/math';

export const useSkeletonStore = defineStore('skeleton', () => {
  const skeleton = ref<Skeleton>(createHumanoidSkeleton());
  const skeletonVersion = ref(0);
  const selectedBoneId = ref<string | null>(null);
  const ikSolver = ref<FabrikSolver>(new FabrikSolver(skeleton.value));
  const ikEnabled = ref(false);
  const ikEndBoneId = ref<string | null>(null);
  const ikTarget = ref<THREE.Vector3>(new THREE.Vector3());
  const weightCalculator = ref<WeightCalculator>(new WeightCalculator(skeleton.value));
  const weightPainter = ref<WeightPainter | null>(null);
  const meshData = ref<MeshData | null>(null);
  const weightPaintConfig = ref<WeightPaintConfig>({
    brushSize: 0.5,
    brushStrength: 0.5,
    brushFalloff: 0.5,
    mode: 'add',
  });

  function markDirty() {
    skeletonVersion.value++;
  }

  const selectedBone = computed(() => {
    skeletonVersion.value;
    if (!selectedBoneId.value) return null;
    return skeleton.value.getBone(selectedBoneId.value) || null;
  });

  const boneCount = computed(() => {
    skeletonVersion.value;
    return skeleton.value.getBoneCount();
  });

  const allBones = computed(() => {
    skeletonVersion.value;
    return skeleton.value.getAllBones();
  });

  const bones = computed(() => {
    skeletonVersion.value;
    return skeleton.value.bones;
  });

  function setSelectedBone(boneId: string | null) {
    selectedBoneId.value = boneId;
  }

  function addBone(parentId: string | null, position: THREE.Vector3) {
    const bone = new Bone({
      name: `Bone_${skeleton.value.getBoneCount() + 1}`,
      parentId,
      position: [position.x, position.y, position.z],
      length: 1,
    });
    skeleton.value.addBone(bone, parentId);
    selectedBoneId.value = bone.id;
    updateIkSolver();
    markDirty();
  }

  function removeBone(boneId: string) {
    skeleton.value.removeBone(boneId);
    if (selectedBoneId.value === boneId) {
      selectedBoneId.value = null;
    }
    updateIkSolver();
    markDirty();
  }

  function updateBoneRotation(boneId: string, rotation: THREE.Euler) {
    skeleton.value.setBoneRotation(boneId, rotation);
    markDirty();
  }

  function updateBonePosition(boneId: string, position: THREE.Vector3) {
    skeleton.value.setBonePosition(boneId, position);
    markDirty();
  }

  function updateBoneLength(boneId: string, length: number) {
    skeleton.value.setBoneLength(boneId, length);
    markDirty();
  }

  function updateBoneName(boneId: string, name: string) {
    const bone = skeleton.value.getBone(boneId);
    if (bone) {
      bone.name = name;
      markDirty();
    }
  }

  function loadHumanoidPreset() {
    skeleton.value = createHumanoidSkeleton();
    selectedBoneId.value = null;
    updateIkSolver();
    updateWeightCalculator();
    markDirty();
  }

  function setSkeleton(newSkeleton: Skeleton) {
    skeleton.value = newSkeleton;
    selectedBoneId.value = null;
    updateIkSolver();
    updateWeightCalculator();
    markDirty();
  }

  function updateIkSolver() {
    ikSolver.value = new FabrikSolver(skeleton.value);
  }

  function updateWeightCalculator() {
    weightCalculator.value = new WeightCalculator(skeleton.value);
  }

  function enableIk(endBoneId: string) {
    ikEnabled.value = true;
    ikEndBoneId.value = endBoneId;
    const bone = skeleton.value.getBone(endBoneId);
    if (bone) {
      ikTarget.value = bone.getEndPosition(skeleton.value.bones).clone();
    }
  }

  function disableIk() {
    ikEnabled.value = false;
    ikEndBoneId.value = null;
  }

  function solveIk(targetPosition: THREE.Vector3): boolean {
    if (!ikEnabled.value || !ikEndBoneId.value) return false;
    
    ikTarget.value.copy(targetPosition);
    const result = ikSolver.value.solve(ikEndBoneId.value, targetPosition);
    if (result) {
      markDirty();
    }
    return result;
  }

  function addIkConstraint(boneId: string, minAngle: number, maxAngle: number) {
    const constraint = new RotationConstraint(minAngle, maxAngle);
    ikSolver.value.addConstraint(boneId, constraint);
  }

  function removeIkConstraint(boneId: string) {
    ikSolver.value.removeConstraint(boneId);
  }

  function setMeshData(mesh: MeshData | null) {
    meshData.value = mesh;
    if (mesh) {
      weightPainter.value = new WeightPainter(mesh);
    } else {
      weightPainter.value = null;
    }
  }

  function calculateAutoWeights() {
    if (!meshData.value) return;
    
    const weightedMesh = weightCalculator.value.calculateWeights(meshData.value);
    meshData.value = weightCalculator.value.normalizeMeshWeights(weightedMesh);
    
    if (weightPainter.value) {
      weightPainter.value.setMeshData(meshData.value);
    }
    markDirty();
  }

  function smoothWeights(iterations: number = 1) {
    if (!meshData.value) return;
    
    meshData.value = weightCalculator.value.smoothWeights(meshData.value, iterations);
    
    if (weightPainter.value) {
      weightPainter.value.setMeshData(meshData.value);
    }
    markDirty();
  }

  function paintWeights(
    worldPosition: THREE.Vector3,
    camera: THREE.Camera,
    meshMatrix: THREE.Matrix4
  ): number[] {
    if (!weightPainter.value) return [];
    const result = weightPainter.value.paint(worldPosition, camera, meshMatrix);
    if (result.length > 0) {
      markDirty();
    }
    return result;
  }

  function setWeightPaintConfig(config: Partial<WeightPaintConfig>) {
    weightPaintConfig.value = { ...weightPaintConfig.value, ...config };
    if (weightPainter.value) {
      weightPainter.value.setConfig(weightPaintConfig.value);
    }
  }

  function setWeightPaintBone(boneId: string | null) {
    if (weightPainter.value) {
      weightPainter.value.setSelectedBone(boneId);
    }
  }

  function getBoneChildren(boneId: string | null): Bone[] {
    skeletonVersion.value;
    if (!boneId) {
      const root = skeleton.value.getRootBone();
      return root ? [root] : [];
    }
    return skeleton.value.getChildren(boneId);
  }

  function resetPose() {
    skeleton.value.resetPose();
    markDirty();
  }

  function reparentBone(boneId: string, newParentId: string | null) {
    skeleton.value.reparentBone(boneId, newParentId);
    markDirty();
  }

  function toData() {
    return {
      skeleton: skeleton.value.toData(),
      mesh: meshData.value,
      selectedBoneId: selectedBoneId.value,
    };
  }

  function loadFromStorage() {
    try {
      const dataStr = localStorage.getItem('skeletal-anim-skeleton');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.skeleton) {
          const skel = new Skeleton(data.skeleton);
          skeleton.value = skel;
          updateIkSolver();
          updateWeightCalculator();
        }
        if (data.selectedBoneId) {
          selectedBoneId.value = data.selectedBoneId;
        }
      }
    } catch (e) {
      console.error('Failed to load skeleton from storage:', e);
    }
  }

  return {
    skeleton,
    selectedBoneId,
    selectedBone,
    boneCount,
    allBones,
    ikSolver,
    ikEnabled,
    ikEndBoneId,
    ikTarget,
    weightCalculator,
    weightPainter,
    meshData,
    weightPaintConfig,
    setSelectedBone,
    addBone,
    removeBone,
    updateBoneRotation,
    updateBonePosition,
    updateBoneLength,
    updateBoneName,
    loadHumanoidPreset,
    setSkeleton,
    enableIk,
    disableIk,
    solveIk,
    addIkConstraint,
    removeIkConstraint,
    setMeshData,
    calculateAutoWeights,
    smoothWeights,
    paintWeights,
    setWeightPaintConfig,
    setWeightPaintBone,
    getBoneChildren,
    resetPose,
    reparentBone,
    toData,
    bones,
    loadFromStorage,
  };
});
