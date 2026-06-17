import { computed } from 'vue';
import * as THREE from 'three';
import { useSkeletonStore } from '@/stores/useSkeletonStore';

export function useIK() {
  const store = useSkeletonStore();

  const ikEnabled = computed(() => store.ikEnabled);
  const ikEndBoneId = computed(() => store.ikEndBoneId);
  const ikTarget = computed(() => store.ikTarget);
  const ikSolver = computed(() => store.ikSolver);

  const ikChain = computed(() => {
    if (!store.ikEndBoneId) return [];
    return store.skeleton.getBoneChain(store.ikEndBoneId);
  });

  function enableIkMode(endBoneId: string) {
    store.enableIk(endBoneId);
  }

  function disableIkMode() {
    store.disableIk();
  }

  function toggleIkMode(endBoneId: string) {
    if (store.ikEnabled && store.ikEndBoneId === endBoneId) {
      disableIkMode();
    } else {
      enableIkMode(endBoneId);
    }
  }

  function solveIkToTarget(targetPosition: THREE.Vector3): boolean {
    if (!store.ikEnabled || !store.ikEndBoneId) return false;
    return store.solveIk(targetPosition);
  }

  function updateTargetPosition(targetPosition: THREE.Vector3) {
    store.solveIk(targetPosition);
  }

  function addRotationConstraint(boneId: string, minAngle: number, maxAngle: number) {
    store.addIkConstraint(boneId, minAngle, maxAngle);
  }

  function removeRotationConstraint(boneId: string) {
    store.removeIkConstraint(boneId);
  }

  function setHingeConstraint(boneId: string, minAngle: number, maxAngle: number, axis?: THREE.Vector3) {
    store.addIkConstraint(boneId, minAngle, maxAngle);
  }

  function getConstraint(boneId: string) {
    return store.ikSolver.getConstraint(boneId);
  }

  function hasConstraint(boneId: string): boolean {
    return !!store.ikSolver.getConstraint(boneId);
  }

  function getChainLength(): number {
    if (!store.ikEndBoneId) return 0;
    const chain = store.skeleton.getBoneChain(store.ikEndBoneId);
    return chain.reduce((sum, bone) => sum + bone.length, 0);
  }

  function getEndEffectorPosition(): THREE.Vector3 | null {
    if (!store.ikEndBoneId) return null;
    const bone = store.skeleton.getBone(store.ikEndBoneId);
    if (!bone) return null;
    return bone.getEndPosition(store.skeleton.bones);
  }

  function getEndEffectorError(): number {
    const endPos = getEndEffectorPosition();
    if (!endPos) return 0;
    return endPos.distanceTo(store.ikTarget);
  }

  return {
    ikEnabled,
    ikEndBoneId,
    ikTarget,
    ikSolver,
    ikChain,
    enableIkMode,
    disableIkMode,
    toggleIkMode,
    solveIkToTarget,
    updateTargetPosition,
    addRotationConstraint,
    removeRotationConstraint,
    setHingeConstraint,
    getConstraint,
    hasConstraint,
    getChainLength,
    getEndEffectorPosition,
    getEndEffectorError,
  };
}
