import * as THREE from 'three';

export type BonePoseMap = Map<string, THREE.Euler>;

export class PoseBlender {
  static lerpPoses(
    poseA: BonePoseMap,
    poseB: BonePoseMap,
    weight: number,
    boneMask?: Record<string, boolean>
  ): BonePoseMap {
    const result: BonePoseMap = new Map();
    const allBoneIds = new Set([...poseA.keys(), ...poseB.keys()]);

    allBoneIds.forEach((boneId) => {
      if (boneMask && boneMask[boneId] === false) {
        const rotA = poseA.get(boneId);
        if (rotA) {
          result.set(boneId, rotA.clone());
        }
        return;
      }

      const rotA = poseA.get(boneId);
      const rotB = poseB.get(boneId);

      if (rotA && rotB) {
        const quatA = new THREE.Quaternion().setFromEuler(rotA);
        const quatB = new THREE.Quaternion().setFromEuler(rotB);
        const resultQuat = new THREE.Quaternion().slerpQuaternions(quatA, quatB, weight);
        result.set(boneId, new THREE.Euler().setFromQuaternion(resultQuat));
      } else if (rotA) {
        result.set(boneId, rotA.clone());
      } else if (rotB) {
        result.set(boneId, rotB.clone());
      }
    });

    return result;
  }

  static addPoses(
    basePose: BonePoseMap,
    additivePose: BonePoseMap,
    strength: number
  ): BonePoseMap {
    const result: BonePoseMap = new Map();
    const allBoneIds = new Set([...basePose.keys(), ...additivePose.keys()]);

    allBoneIds.forEach((boneId) => {
      const baseRot = basePose.get(boneId);
      const addRot = additivePose.get(boneId);

      if (baseRot && addRot) {
        const baseQuat = new THREE.Quaternion().setFromEuler(baseRot);
        const addQuat = new THREE.Quaternion().setFromEuler(addRot);
        const identity = new THREE.Quaternion();
        const delta = new THREE.Quaternion().multiplyQuaternions(addQuat, identity.invert());
        const scaledDelta = new THREE.Quaternion().slerpQuaternions(identity, delta, strength);
        const resultQuat = new THREE.Quaternion().multiplyQuaternions(baseQuat, scaledDelta);
        result.set(boneId, new THREE.Euler().setFromQuaternion(resultQuat));
      } else if (baseRot) {
        result.set(boneId, baseRot.clone());
      } else if (addRot) {
        result.set(boneId, addRot.clone());
      }
    });

    return result;
  }

  static applyCurve(value: number, curveType: 'linear' | 'easeInOut'): number {
    switch (curveType) {
      case 'easeInOut':
        return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
      case 'linear':
      default:
        return value;
    }
  }

  static clonePose(pose: BonePoseMap): BonePoseMap {
    const result: BonePoseMap = new Map();
    pose.forEach((rot, boneId) => {
      result.set(boneId, rot.clone());
    });
    return result;
  }

  static emptyPose(): BonePoseMap {
    return new Map();
  }
}
