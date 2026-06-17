import * as THREE from 'three';
import { Bone } from './Bone';
import type { SkeletonData, BoneData } from '@/types';
import { generateId } from '@/utils/math';
import { arrayToVector3, vector3ToArray } from '@/utils/threeHelpers';

export class Skeleton {
  id: string;
  name: string;
  bones: Map<string, Bone>;
  rootBoneId: string;
  boneMatrices: Float32Array;

  constructor(data: Partial<SkeletonData> = {}) {
    this.id = data.id || generateId();
    this.name = data.name || 'Skeleton';
    this.bones = new Map();
    this.rootBoneId = data.rootBoneId || '';
    this.boneMatrices = new Float32Array(100 * 16);

    if (data.bones) {
      data.bones.forEach((boneData) => {
        const bone = new Bone(boneData);
        this.bones.set(bone.id, bone);
        if (!this.rootBoneId && !bone.parentId) {
          this.rootBoneId = bone.id;
        }
      });
    }
  }

  toData(): SkeletonData {
    return {
      id: this.id,
      name: this.name,
      bones: Array.from(this.bones.values()).map((b) => b.toData()),
      rootBoneId: this.rootBoneId,
    };
  }

  addBone(bone: Bone, parentId: string | null = null): void {
    if (parentId) {
      bone.parentId = parentId;
    }
    this.bones.set(bone.id, bone);
    
    if (!this.rootBoneId && !parentId) {
      this.rootBoneId = bone.id;
    }
  }

  removeBone(boneId: string): void {
    const bone = this.bones.get(boneId);
    if (!bone) return;

    this.getChildren(boneId).forEach((child) => {
      child.parentId = bone.parentId;
    });

    this.bones.delete(boneId);

    if (this.rootBoneId === boneId) {
      const rootBone = Array.from(this.bones.values()).find((b) => !b.parentId);
      this.rootBoneId = rootBone?.id || '';
    }
  }

  getBone(boneId: string): Bone | undefined {
    return this.bones.get(boneId);
  }

  getRootBone(): Bone | undefined {
    return this.bones.get(this.rootBoneId);
  }

  getChildren(parentId: string): Bone[] {
    return Array.from(this.bones.values()).filter((b) => b.parentId === parentId);
  }

  getBoneChain(endBoneId: string): Bone[] {
    const chain: Bone[] = [];
    let currentId: string | null = endBoneId;
    
    while (currentId) {
      const bone = this.bones.get(currentId);
      if (bone) {
        chain.unshift(bone);
        currentId = bone.parentId;
      } else {
        break;
      }
    }
    
    return chain;
  }

  getAllBones(): Bone[] {
    return Array.from(this.bones.values());
  }

  getBoneCount(): number {
    return this.bones.size;
  }

  getBoneIndex(boneId: string): number {
    const boneIds = Array.from(this.bones.keys());
    return boneIds.indexOf(boneId);
  }

  getBoneByIndex(index: number): Bone | undefined {
    const boneIds = Array.from(this.bones.keys());
    return this.bones.get(boneIds[index]);
  }

  setBoneRotation(boneId: string, rotation: THREE.Euler): void {
    const bone = this.bones.get(boneId);
    if (bone) {
      bone.rotation.copy(rotation);
      bone.constrainRotation();
    }
  }

  setBonePosition(boneId: string, position: THREE.Vector3): void {
    const bone = this.bones.get(boneId);
    if (bone) {
      bone.position.copy(position);
    }
  }

  setBoneLength(boneId: string, length: number): void {
    const bone = this.bones.get(boneId);
    if (bone) {
      bone.length = Math.max(0.01, length);
    }
  }

  updateBoneMatrices(): void {
    const bones = this.getAllBones();
    bones.forEach((bone, index) => {
      if (index < 100) {
        const matrix = bone.getWorldTransform(this.bones);
        const elements = matrix.elements;
        for (let i = 0; i < 16; i++) {
          this.boneMatrices[index * 16 + i] = elements[i];
        }
      }
    });
  }

  getBindPoseMatrices(): Float32Array {
    const matrices = new Float32Array(this.bones.size * 16);
    const bones = this.getAllBones();
    
    bones.forEach((bone, index) => {
      const matrix = bone.getBindMatrix(this.bones);
      const elements = matrix.elements;
      for (let i = 0; i < 16; i++) {
        matrices[index * 16 + i] = elements[i];
      }
    });
    
    return matrices;
  }

  getBoneWorldPositions(): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    this.bones.forEach((bone, id) => {
      positions.set(id, bone.getWorldPosition(this.bones));
    });
    return positions;
  }

  isDescendant(boneId: string, potentialAncestorId: string): boolean {
    let currentId: string | null = boneId;
    while (currentId) {
      if (currentId === potentialAncestorId) return true;
      const bone = this.bones.get(currentId);
      currentId = bone?.parentId || null;
    }
    return false;
  }

  resetPose(): void {
    this.bones.forEach((bone) => {
      bone.rotation.set(0, 0, 0);
    });
  }

  clone(): Skeleton {
    return new Skeleton(this.toData());
  }

  findBoneByName(name: string): Bone | undefined {
    return Array.from(this.bones.values()).find((b) => b.name === name);
  }

  reparentBone(boneId: string, newParentId: string | null): void {
    const bone = this.bones.get(boneId);
    if (!bone) return;

    const oldWorldPos = bone.getWorldPosition(this.bones);
    const oldWorldQuat = bone.getWorldQuaternion(this.bones);

    bone.parentId = newParentId;

    if (newParentId) {
      const newParent = this.bones.get(newParentId);
      if (newParent) {
        const parentInvMatrix = new THREE.Matrix4()
          .copy(newParent.getWorldTransform(this.bones))
          .invert();
        
        const localMatrix = new THREE.Matrix4().compose(
          oldWorldPos,
          oldWorldQuat,
          new THREE.Vector3(1, 1, 1)
        );
        localMatrix.premultiply(parentInvMatrix);

        const newLocalPos = new THREE.Vector3();
        const newLocalQuat = new THREE.Quaternion();
        const newLocalScale = new THREE.Vector3();
        localMatrix.decompose(newLocalPos, newLocalQuat, newLocalScale);

        bone.position.copy(newLocalPos);
        bone.rotation.setFromQuaternion(newLocalQuat);
      }
    }
  }
}
