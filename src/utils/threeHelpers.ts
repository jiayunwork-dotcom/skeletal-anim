import * as THREE from 'three';
import type { BoneData } from '@/types';
import { BONE_RADIUS, JOINT_RADIUS, BONE_COLOR, SELECTED_BONE_COLOR } from './constants';

export function createBoneMesh(
  start: THREE.Vector3,
  end: THREE.Vector3,
  isSelected: boolean = false
): THREE.Group {
  const group = new THREE.Group();
  
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  
  const boneGeometry = new THREE.ConeGeometry(BONE_RADIUS, length, 8);
  const boneMaterial = new THREE.MeshBasicMaterial({
    color: isSelected ? SELECTED_BONE_COLOR : BONE_COLOR,
    transparent: true,
    opacity: 0.9,
  });
  
  const bone = new THREE.Mesh(boneGeometry, boneMaterial);
  bone.position.copy(start).add(end).multiplyScalar(0.5);
  bone.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  
  const jointGeometry = new THREE.SphereGeometry(JOINT_RADIUS, 16, 16);
  const jointMaterial = new THREE.MeshBasicMaterial({
    color: isSelected ? SELECTED_BONE_COLOR : BONE_COLOR,
  });
  
  const startJoint = new THREE.Mesh(jointGeometry, jointMaterial);
  startJoint.position.copy(start);
  
  const endJoint = new THREE.Mesh(jointGeometry, jointMaterial);
  endJoint.position.copy(end);
  
  group.add(bone);
  group.add(startJoint);
  group.add(endJoint);
  
  return group;
}

export function createGridHelper(size: number, divisions: number): THREE.GridHelper {
  const grid = new THREE.GridHelper(size, divisions, 0x333344, 0x222233);
  grid.position.y = 0;
  return grid;
}

export function createAxesHelper(size: number): THREE.AxesHelper {
  const axes = new THREE.AxesHelper(size);
  return axes;
}

export function eulerToArray(euler: THREE.Euler): [number, number, number] {
  return [euler.x, euler.y, euler.z];
}

export function arrayToEuler(arr: [number, number, number]): THREE.Euler {
  return new THREE.Euler(arr[0], arr[1], arr[2]);
}

export function vector3ToArray(v: THREE.Vector3): [number, number, number] {
  return [v.x, v.y, v.z];
}

export function arrayToVector3(arr: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
}

export function getBoneWorldPosition(
  boneData: BoneData,
  bonesMap: Map<string, BoneData>,
  bindPose: boolean = false
): THREE.Vector3 {
  const position = arrayToVector3(boneData.position);
  
  if (boneData.parentId) {
    const parent = bonesMap.get(boneData.parentId);
    if (parent) {
      const parentPos = getBoneWorldPosition(parent, bonesMap, bindPose);
      const rotation = bindPose ? new THREE.Euler() : arrayToEuler(parent.rotation);
      const quat = new THREE.Quaternion().setFromEuler(rotation);
      position.applyQuaternion(quat);
      position.add(parentPos);
    }
  }
  
  return position;
}

export function getBoneWorldRotation(
  boneData: BoneData,
  bonesMap: Map<string, BoneData>
): THREE.Quaternion {
  const rotation = arrayToEuler(boneData.rotation);
  const quat = new THREE.Quaternion().setFromEuler(rotation);
  
  if (boneData.parentId) {
    const parent = bonesMap.get(boneData.parentId);
    if (parent) {
      const parentQuat = getBoneWorldRotation(parent, bonesMap);
      quat.premultiply(parentQuat);
    }
  }
  
  return quat;
}
