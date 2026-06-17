import * as THREE from 'three';
import { Bone } from '../skeleton/Bone';
import { Skeleton } from '../skeleton/Skeleton';
import type { RotationConstraint } from './RotationConstraint';
import { MAX_IK_ITERATIONS, IK_THRESHOLD, EPSILON } from '@/utils/constants';
import { clamp } from '@/utils/math';

export class FabrikSolver {
  skeleton: Skeleton;
  constraints: Map<string, RotationConstraint>;
  maxIterations: number;
  threshold: number;

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;
    this.constraints = new Map();
    this.maxIterations = MAX_IK_ITERATIONS;
    this.threshold = IK_THRESHOLD;
  }

  addConstraint(boneId: string, constraint: RotationConstraint): void {
    this.constraints.set(boneId, constraint);
  }

  removeConstraint(boneId: string): void {
    this.constraints.delete(boneId);
  }

  getConstraint(boneId: string): RotationConstraint | undefined {
    return this.constraints.get(boneId);
  }

  solve(
    endBoneId: string,
    targetPosition: THREE.Vector3,
    rootBoneId?: string
  ): boolean {
    const chain = this.skeleton.getBoneChain(endBoneId);
    
    if (chain.length === 0) return false;

    let startIndex = 0;
    if (rootBoneId) {
      startIndex = chain.findIndex((b) => b.id === rootBoneId);
      if (startIndex === -1) startIndex = 0;
    }

    const ikChain = chain.slice(startIndex);
    if (ikChain.length < 2) return false;

    const jointPositions: THREE.Vector3[] = [];
    const boneLengths: number[] = [];

    ikChain.forEach((bone, index) => {
      const worldPos = bone.getWorldPosition(this.skeleton.bones);
      jointPositions.push(worldPos.clone());
      
      if (index < ikChain.length - 1) {
        const nextBone = ikChain[index + 1];
        const nextWorldPos = nextBone.getWorldPosition(this.skeleton.bones);
        boneLengths.push(worldPos.distanceTo(nextWorldPos));
      } else {
        boneLengths.push(bone.length);
      }
    });

    const endEffectorPos = jointPositions[jointPositions.length - 1].clone();
    
    if (endEffectorPos.distanceTo(targetPosition) < this.threshold) {
      return true;
    }

    const totalLength = boneLengths.reduce((sum, len) => sum + len, 0);
    const rootToTarget = jointPositions[0].distanceTo(targetPosition);
    
    if (rootToTarget > totalLength + EPSILON) {
      const direction = targetPosition.clone().sub(jointPositions[0]).normalize();
      for (let i = 1; i < jointPositions.length; i++) {
        jointPositions[i] = jointPositions[i - 1]
          .clone()
          .add(direction.multiplyScalar(boneLengths[i - 1]));
      }
      this.applyJointPositions(ikChain, jointPositions);
      return false;
    }

    let iteration = 0;
    let error = Infinity;
    const rootPosition = jointPositions[0].clone();

    while (iteration < this.maxIterations && error > this.threshold) {
      jointPositions[jointPositions.length - 1] = targetPosition.clone();

      for (let i = jointPositions.length - 2; i >= 0; i--) {
        const direction = jointPositions[i]
          .clone()
          .sub(jointPositions[i + 1])
          .normalize();
        jointPositions[i] = jointPositions[i + 1]
          .clone()
          .add(direction.multiplyScalar(boneLengths[i]));
      }

      jointPositions[0] = rootPosition.clone();

      for (let i = 0; i < jointPositions.length - 1; i++) {
        const direction = jointPositions[i + 1]
          .clone()
          .sub(jointPositions[i])
          .normalize();
        jointPositions[i + 1] = jointPositions[i]
          .clone()
          .add(direction.multiplyScalar(boneLengths[i]));
      }

      this.applyConstraints(ikChain, jointPositions, boneLengths);

      error = jointPositions[jointPositions.length - 1].distanceTo(targetPosition);
      iteration++;
    }

    this.applyJointPositions(ikChain, jointPositions);

    return error < this.threshold;
  }

  applyJointPositions(chain: Bone[], jointPositions: THREE.Vector3[]): void {
    for (let i = 0; i < chain.length; i++) {
      const bone = chain[i];
      const currentPos = jointPositions[i];
      const nextPos = i < chain.length - 1
        ? jointPositions[i + 1]
        : currentPos.clone().add(
            new THREE.Vector3(0, bone.length, 0).applyQuaternion(
              bone.getWorldQuaternion(this.skeleton.bones)
            )
          );

      const boneDirection = nextPos.clone().sub(currentPos).normalize();
      const localUp = new THREE.Vector3(0, 1, 0);

      if (bone.parentId) {
        const parent = this.skeleton.bones.get(bone.parentId);
        if (parent) {
          const parentQuat = parent.getWorldQuaternion(this.skeleton.bones);
          localUp.applyQuaternion(parentQuat);
        }
      }

      const targetQuat = new THREE.Quaternion().setFromUnitVectors(
        localUp.clone().normalize(),
        boneDirection.clone().normalize()
      );

      if (bone.parentId) {
        const parent = this.skeleton.bones.get(bone.parentId);
        if (parent) {
          const parentQuat = parent.getWorldQuaternion(this.skeleton.bones);
          const invParentQuat = parentQuat.clone().invert();
          targetQuat.premultiply(invParentQuat);
        }
      }

      const constraint = this.constraints.get(bone.id);
      if (constraint) {
        const euler = new THREE.Euler().setFromQuaternion(targetQuat);
        euler.x = clamp(euler.x, bone.minAngle, bone.maxAngle);
        euler.y = clamp(euler.y, bone.minAngle, bone.maxAngle);
        euler.z = clamp(euler.z, bone.minAngle, bone.maxAngle);
        targetQuat.setFromEuler(euler);
      }

      bone.rotation.setFromQuaternion(targetQuat);
    }

    this.skeleton.updateBoneMatrices();
  }

  applyConstraints(
    chain: Bone[],
    jointPositions: THREE.Vector3[],
    boneLengths: number[]
  ): void {
    for (let i = 1; i < chain.length - 1; i++) {
      const bone = chain[i];
      const constraint = this.constraints.get(bone.id);
      
      if (!constraint) continue;

      const prevPos = jointPositions[i - 1];
      const currPos = jointPositions[i];
      const nextPos = jointPositions[i + 1];

      const toCurrent = currPos.clone().sub(prevPos).normalize();
      const toNext = nextPos.clone().sub(currPos).normalize();

      const constrainedDir = constraint.constrainDirection(
        toNext,
        toCurrent,
        new THREE.Vector3(0, 0, 1)
      );

      jointPositions[i + 1] = currPos
        .clone()
        .add(constrainedDir.multiplyScalar(boneLengths[i]));
    }
  }

  setMaxIterations(iterations: number): void {
    this.maxIterations = Math.max(1, iterations);
  }

  setThreshold(threshold: number): void {
    this.threshold = Math.max(EPSILON, threshold);
  }

  getEndEffectorPosition(endBoneId: string): THREE.Vector3 | null {
    const bone = this.skeleton.getBone(endBoneId);
    if (!bone) return null;
    return bone.getEndPosition(this.skeleton.bones);
  }
}
