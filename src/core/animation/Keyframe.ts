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

  getBezierHandles(boneId: string): [THREE.Vector3, THREE.Vector3] {
    if (!this.bezierHandles.has(boneId)) {
      this.bezierHandles.set(boneId, [
        new THREE.Vector3(-0.33, 0, 0),
        new THREE.Vector3(0.33, 0, 0),
      ]);
    }
    return this.bezierHandles.get(boneId)!;
  }

  setBezierHandles(
    boneId: string,
    handles: [THREE.Vector3, THREE.Vector3]
  ): void {
    this.bezierHandles.set(boneId, [handles[0].clone(), handles[1].clone()]);
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
    const frameSpan = kf2.frame - kf1.frame;

    boneIds.forEach((boneId) => {
      const rot1 = kf1.getBoneRotation(boneId);
      const rot2 = kf2.getBoneRotation(boneId);

      if (rot1 && rot2) {
        const handles1 = kf1.getBezierHandles(boneId);
        const handles2 = kf2.getBezierHandles(boneId);

        const inHandle = handles1[1];
        const outHandle = handles2[0];

        const bezierT = Keyframe.solveBezierT(
          t,
          0,
          0 + inHandle.x,
          1 + outHandle.x,
          1
        );

        const values: [number, number, number] = [0, 0, 0];
        const rot1Arr = [rot1.x, rot1.y, rot1.z];
        const rot2Arr = [rot2.x, rot2.y, rot2.z];
        const inHandleArr = [inHandle.y, inHandle.y, inHandle.y];
        const outHandleArr = [outHandle.y, outHandle.y, outHandle.y];

        for (let axis = 0; axis < 3; axis++) {
          values[axis] = Keyframe.cubicBezier(
            bezierT,
            rot1Arr[axis],
            rot1Arr[axis] + inHandleArr[axis] * (rot2Arr[axis] - rot1Arr[axis]),
            rot2Arr[axis] + outHandleArr[axis] * (rot2Arr[axis] - rot1Arr[axis]),
            rot2Arr[axis]
          );
        }

        result.set(
          boneId,
          new THREE.Euler(values[0], values[1], values[2], rot1.order)
        );
      } else if (rot1) {
        result.set(boneId, rot1.clone());
      } else if (rot2) {
        result.set(boneId, rot2.clone());
      }
    });

    return result;
  }

  static sampleBezierCurve(
    kf1: Keyframe,
    kf2: Keyframe,
    boneId: string,
    axis: number,
    samples: number = 20
  ): { frame: number; value: number }[] {
    const result: { frame: number; value: number }[] = [];
    const rot1 = kf1.getBoneRotation(boneId);
    const rot2 = kf2.getBoneRotation(boneId);

    if (!rot1 || !rot2) return result;

    const rotArr1 = [rot1.x, rot1.y, rot1.z];
    const rotArr2 = [rot2.x, rot2.y, rot2.z];
    const handles1 = kf1.getBezierHandles(boneId);
    const handles2 = kf2.getBezierHandles(boneId);
    const inHandle = handles1[1];
    const outHandle = handles2[0];

    const p0 = { x: 0, y: rotArr1[axis] };
    const p1 = {
      x: 0 + inHandle.x,
      y: rotArr1[axis] + inHandle.y * (rotArr2[axis] - rotArr1[axis]),
    };
    const p2 = {
      x: 1 + outHandle.x,
      y: rotArr2[axis] + outHandle.y * (rotArr2[axis] - rotArr1[axis]),
    };
    const p3 = { x: 1, y: rotArr2[axis] };

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const cx = Keyframe.cubicBezier(t, p0.x, p1.x, p2.x, p3.x);
      const cy = Keyframe.cubicBezier(t, p0.y, p1.y, p2.y, p3.y);
      result.push({
        frame: kf1.frame + cx * (kf2.frame - kf1.frame),
        value: cy,
      });
    }

    return result;
  }

  static cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const mt = 1 - t;
    return (
      mt * mt * mt * p0 +
      3 * mt * mt * t * p1 +
      3 * mt * t * t * p2 +
      t * t * t * p3
    );
  }

  static solveBezierT(
    targetX: number,
    p0x: number,
    p1x: number,
    p2x: number,
    p3x: number,
    iterations: number = 8
  ): number {
    let t = targetX;
    for (let i = 0; i < iterations; i++) {
      const currentX = Keyframe.cubicBezier(t, p0x, p1x, p2x, p3x);
      const derivative =
        3 * (1 - t) * (1 - t) * (p1x - p0x) +
        6 * (1 - t) * t * (p2x - p1x) +
        3 * t * t * (p3x - p2x);
      if (Math.abs(derivative) < 1e-6) break;
      t -= (currentX - targetX) / derivative;
      t = Math.max(0, Math.min(1, t));
    }
    return t;
  }
}
