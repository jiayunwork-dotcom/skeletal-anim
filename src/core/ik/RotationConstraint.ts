import * as THREE from 'three';
import { Bone } from '../skeleton/Bone';
import { clamp } from '@/utils/math';

export class RotationConstraint {
  minAngle: number;
  maxAngle: number;
  hingeAxis: THREE.Vector3 | null;

  constructor(minAngle: number = -Math.PI, maxAngle: number = Math.PI) {
    this.minAngle = minAngle;
    this.maxAngle = maxAngle;
    this.hingeAxis = null;
  }

  apply(bone: Bone): void {
    bone.rotation.x = clamp(bone.rotation.x, this.minAngle, this.maxAngle);
    bone.rotation.y = clamp(bone.rotation.y, this.minAngle, this.maxAngle);
    bone.rotation.z = clamp(bone.rotation.z, this.minAngle, this.maxAngle);
  }

  applyToQuaternion(
    quaternion: THREE.Quaternion,
    boneForward: THREE.Vector3,
    parentForward: THREE.Vector3
  ): THREE.Quaternion {
    const result = quaternion.clone();

    const currentForward = boneForward.clone().applyQuaternion(result);
    const angle = currentForward.angleTo(parentForward);
    const clampedAngle = clamp(angle, this.minAngle, this.maxAngle);

    if (Math.abs(angle - clampedAngle) > 0.001) {
      const correctionAxis = new THREE.Vector3()
        .crossVectors(currentForward, parentForward)
        .normalize();
      const correctionAngle = clampedAngle - angle;
      const correctionQuat = new THREE.Quaternion().setFromAxisAngle(
        correctionAxis,
        correctionAngle
      );
      result.premultiply(correctionQuat);
    }

    return result;
  }

  constrainDirection(
    direction: THREE.Vector3,
    parentDirection: THREE.Vector3,
    upAxis: THREE.Vector3 = new THREE.Vector3(0, 1, 0)
  ): THREE.Vector3 {
    const result = direction.clone().normalize();
    const parentNorm = parentDirection.clone().normalize();

    const angle = result.angleTo(parentNorm);
    if (angle < this.minAngle || angle > this.maxAngle) {
      const clampedAngle = clamp(angle, this.minAngle, this.maxAngle);
      
      const crossAxis = new THREE.Vector3()
        .crossVectors(parentNorm, result)
        .normalize();
      
      if (crossAxis.lengthSq() < 0.0001) {
        crossAxis.copy(upAxis);
      }

      const rotation = new THREE.Quaternion().setFromAxisAngle(
        crossAxis,
        clampedAngle
      );
      result.copy(parentNorm).applyQuaternion(rotation);
    }

    return result.normalize();
  }

  setHingeAxis(axis: THREE.Vector3): void {
    this.hingeAxis = axis.clone().normalize();
  }

  clearHingeAxis(): void {
    this.hingeAxis = null;
  }

  isWithinLimits(angle: number): boolean {
    return angle >= this.minAngle && angle <= this.maxAngle;
  }

  clone(): RotationConstraint {
    const constraint = new RotationConstraint(this.minAngle, this.maxAngle);
    if (this.hingeAxis) {
      constraint.hingeAxis = this.hingeAxis.clone();
    }
    return constraint;
  }
}
