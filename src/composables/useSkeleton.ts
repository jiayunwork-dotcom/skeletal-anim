import { computed } from 'vue';
import * as THREE from 'three';
import { useSkeletonStore } from '@/stores/useSkeletonStore';
import type { Bone } from '@/core/skeleton/Bone';

export function useSkeleton() {
  const store = useSkeletonStore();

  const skeleton = computed(() => store.skeleton);
  const selectedBoneId = computed(() => store.selectedBoneId);
  const selectedBone = computed(() => store.selectedBone);
  const boneCount = computed(() => store.boneCount);
  const allBones = computed(() => store.allBones);
  const meshData = computed(() => store.meshData);

  function selectBone(boneId: string | null) {
    store.setSelectedBone(boneId);
  }

  function createBone(parentId: string | null, position: THREE.Vector3) {
    store.addBone(parentId, position);
  }

  function deleteBone(boneId: string) {
    store.removeBone(boneId);
  }

  function updateRotation(boneId: string, rotation: THREE.Euler) {
    store.updateBoneRotation(boneId, rotation);
  }

  function updatePosition(boneId: string, position: THREE.Vector3) {
    store.updateBonePosition(boneId, position);
  }

  function updateLength(boneId: string, length: number) {
    store.updateBoneLength(boneId, length);
  }

  function updateName(boneId: string, name: string) {
    store.updateBoneName(boneId, name);
  }

  function loadHumanoid() {
    store.loadHumanoidPreset();
  }

  function getChildren(boneId: string | null): Bone[] {
    return store.getBoneChildren(boneId);
  }

  function resetSkeletonPose() {
    store.resetPose();
  }

  function reparent(boneId: string, newParentId: string | null) {
    store.reparentBone(boneId, newParentId);
  }

  function getBoneWorldPosition(boneId: string): THREE.Vector3 | null {
    const bone = store.skeleton.getBone(boneId);
    if (!bone) return null;
    return bone.getWorldPosition(store.skeleton.bones);
  }

  function getBoneEndPosition(boneId: string): THREE.Vector3 | null {
    const bone = store.skeleton.getBone(boneId);
    if (!bone) return null;
    return bone.getEndPosition(store.skeleton.bones);
  }

  function getBoneWorldTransform(boneId: string): THREE.Matrix4 | null {
    const bone = store.skeleton.getBone(boneId);
    if (!bone) return null;
    return bone.getWorldTransform(store.skeleton.bones);
  }

  function isDescendant(boneId: string, potentialAncestorId: string): boolean {
    return store.skeleton.isDescendant(boneId, potentialAncestorId);
  }

  return {
    skeleton,
    selectedBoneId,
    selectedBone,
    boneCount,
    allBones,
    meshData,
    selectBone,
    createBone,
    deleteBone,
    updateRotation,
    updatePosition,
    updateLength,
    updateName,
    loadHumanoid,
    getChildren,
    resetSkeletonPose,
    reparent,
    getBoneWorldPosition,
    getBoneEndPosition,
    getBoneWorldTransform,
    isDescendant,
  };
}
