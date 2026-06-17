import * as THREE from 'three';
import type { KeyframeData, InterpolationType } from '@/types';
import { arrayToEuler, eulerToArray } from '@/utils/threeHelpers';

export class Keyframe {
  frame: number;
  boneRotations: Map<string, THREE.Euler>;
  interpolation: InterpolationType;
  bezierHandles: Map<string, [THREE.Vector3, THREE.Vector3]>;

  constructor(data: Partial<KeyframeData> = {}) {
    this.frame = data.frame || 0;
    this.boneRotations = new Map();
    this.interpolation = data.interpolation || 'linear';
    this.bezierHandles = new Map();

    if (data.boneRotations) {
      Object.entries(data.boneRotations).forEach(([boneId, rot]) => {
        this.boneRotations.set(boneId, arrayToEuler(rot));
      });
    }

    if (data.bezierHandles) {
      Object.entries(data.bezierHandles).forEach(([boneId, handles]) => {
        this.bezierHandles.set(boneId, [
          new THREE.Vector3(...handles[0]),
          new THREE.Vector3(...handles[1]),
        ]);
      });
    }
  }

  toData(): KeyframeData {
    const boneRotations: Record<string, [number, number, number]> = {};
    this.boneRotations.forEach((rot, boneId) => {
      boneRotations[boneId] = eulerToArray(rot) as [number, number, number];
    });

    const bezierHandles: Record<string, [[number, number, number], [number, number, number]]> = {};
    this.bezierHandles.forEach((handles, boneId) => {
      bezierHandles[boneId] = [
        handles[0].toArray() as [number, number, number],
        handles[1].toArray() as [number, number, number],
      ];
    });

    return {
      frame: this.frame,
      boneRotations,
      interpolation: this.interpolation,
      bezierHandles: this.bezierHandles.size > 0 ? bezierHandles : undefined,
    };
  }

  getBoneRotation(boneId: string): THREE.Euler | undefined {
    return this.boneRotations.get(boneId);
  }

  setBoneRotation(boneId: string, rotation: THREE.Euler): void {
    this.boneRotations.set(boneId, rotation.clone());
  }

  removeBoneRotation(boneId: string): void {
    this.boneRotations.delete(boneId);
    this.bezierHandles.delete(boneId);
  }

  clone(): Keyframe {
    return new Keyframe(this.toData());
  }

  static lerp(
    kf1: Keyframe,
    kf2: Keyframe,
    t: number,
    boneIds: string[]
  ): Map<string, THREE.Euler> {
    const result = new Map<string, THREE.Euler>();

    boneIds.forEach((boneId) => {
      const rot1 = kf1.getBoneRotation(boneId);
      const rot2 = kf2.getBoneRotation(boneId);

      if (rot1 && rot2) {
        const q1 = new THREE.Quaternion().setFromEuler(rot1);
        const q2 = new THREE.Quaternion().setFromEuler(rot2);
        const q = new THREE.Quaternion().slerpQuaternions(q1, q2, t);
        result.set(boneId, new THREE.Euler().setFromQuaternion(q));
      } else if (rot1) {
        result.set(boneId, rot1.clone());
      } else if (rot2) {
        result.set(boneId, rot2.clone());
      }
    });

    return result;
  }

  static bezierInterpolate(
    kf1: Keyframe,
    kf2: Keyframe,
    t: number,
    boneIds: string[]
  ): Map<string, THREE.Euler> {
    const result = new Map<string, THREE.Euler>();
    const mt = 1 - t;
    const bezierT = mt * mt * t * 3 + mt * t * t * 3 + t * t * t;

    return Keyframe.lerp(kf1, kf2, bezierT, boneIds);
  }
}
