import * as THREE from 'three';
import type { BoneData, RotationConstraintData } from '@/types';
import { generateId } from '@/utils/math';
import { arrayToEuler, arrayToVector3, eulerToArray, vector3ToArray } from '@/utils/threeHelpers';

export class Bone {
  id: string;
  name: string;
  parentId: string | null;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  length: number;
  minAngle: number;
  maxAngle: number;

  constructor(data: Partial<BoneData> = {}) {
    this.id = data.id || generateId();
    this.name = data.name || 'Bone';
    this.parentId = data.parentId || null;
    this.position = data.position ? arrayToVector3(data.position) : new THREE.Vector3();
    this.rotation = data.rotation ? arrayToEuler(data.rotation) : new THREE.Euler();
    this.length = data.length || 1;
    this.minAngle = data.minAngle ?? -Math.PI;
    this.maxAngle = data.maxAngle ?? Math.PI;
  }

  toData(): BoneData {
    return {
      id: this.id,
      name: this.name,
      parentId: this.parentId,
      position: vector3ToArray(this.position) as [number, number, number],
      rotation: eulerToArray(this.rotation) as [number, number, number],
      length: this.length,
      minAngle: this.minAngle,
      maxAngle: this.maxAngle,
    };
  }

  clone(): Bone {
    return new Bone(this.toData());
  }

  getWorldTransform(bonesMap: Map<string, Bone>): THREE.Matrix4 {
    const transform = new THREE.Matrix4();
    const translation = new THREE.Matrix4().makeTranslation(
      this.position.x,
      this.position.y,
      this.position.z
    );
    const rotation = new THREE.Matrix4().makeRotationFromEuler(this.rotation);
    
    transform.multiplyMatrices(translation, rotation);
    
    if (this.parentId) {
      const parent = bonesMap.get(this.parentId);
      if (parent) {
        const parentTransform = parent.getWorldTransform(bonesMap);
        transform.premultiply(parentTransform);
      }
    }
    
    return transform;
  }

  getWorldPosition(bonesMap: Map<string, Bone>): THREE.Vector3 {
    const position = this.position.clone();
    
    if (this.parentId) {
      const parent = bonesMap.get(this.parentId);
      if (parent) {
        const parentPos = parent.getWorldPosition(bonesMap);
        const parentQuat = parent.getWorldQuaternion(bonesMap);
        position.applyQuaternion(parentQuat);
        position.add(parentPos);
      }
    }
    
    return position;
  }

  getWorldQuaternion(bonesMap: Map<string, Bone>): THREE.Quaternion {
    const quat = new THREE.Quaternion().setFromEuler(this.rotation);
    
    if (this.parentId) {
      const parent = bonesMap.get(this.parentId);
      if (parent) {
        const parentQuat = parent.getWorldQuaternion(bonesMap);
        quat.premultiply(parentQuat);
      }
    }
    
    return quat;
  }

  getBindMatrix(bonesMap: Map<string, Bone>): THREE.Matrix4 {
    const transform = this.getWorldTransform(bonesMap);
    return transform.invert();
  }

  constrainRotation(): void {
    this.rotation.x = Math.max(this.minAngle, Math.min(this.maxAngle, this.rotation.x));
    this.rotation.y = Math.max(this.minAngle, Math.min(this.maxAngle, this.rotation.y));
    this.rotation.z = Math.max(this.minAngle, Math.min(this.maxAngle, this.rotation.z));
  }

  getEndPosition(bonesMap: Map<string, Bone>): THREE.Vector3 {
    const worldPos = this.getWorldPosition(bonesMap);
    const direction = new THREE.Vector3(0, this.length, 0);
    const worldQuat = this.getWorldQuaternion(bonesMap);
    direction.applyQuaternion(worldQuat);
    return worldPos.add(direction);
  }
}
