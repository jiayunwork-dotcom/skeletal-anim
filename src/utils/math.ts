import * as THREE from 'three';
import { EPSILON } from './constants';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function distancePointToSegment(
  point: THREE.Vector3,
  segStart: THREE.Vector3,
  segEnd: THREE.Vector3
): number {
  const segment = new THREE.Vector3().subVectors(segEnd, segStart);
  const pointVec = new THREE.Vector3().subVectors(point, segStart);
  const segLenSq = segment.lengthSq();
  
  if (segLenSq < EPSILON) {
    return point.distanceTo(segStart);
  }
  
  let t = pointVec.dot(segment) / segLenSq;
  t = clamp(t, 0, 1);
  
  const projection = new THREE.Vector3().copy(segStart).add(segment.multiplyScalar(t));
  return point.distanceTo(projection);
}

export function slerpQuaternions(
  q1: THREE.Quaternion,
  q2: THREE.Quaternion,
  t: number
): THREE.Quaternion {
  const result = new THREE.Quaternion();
  result.slerpQuaternions(q1, q2, t);
  return result;
}

export function cubicBezier(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

export function normalizeWeights(weights: number[], maxCount: number): number[] {
  const indexed = weights.map((w, i) => ({ w, i }));
  indexed.sort((a, b) => b.w - a.w);
  
  const top = indexed.slice(0, maxCount);
  const sum = top.reduce((s, item) => s + item.w, 0);
  
  const result = new Array(weights.length).fill(0);
  if (sum > EPSILON) {
    top.forEach((item) => {
      result[item.i] = item.w / sum;
    });
  }
  
  return result;
}

export function heatDiffusionWeight(distance: number, sigma: number): number {
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}
