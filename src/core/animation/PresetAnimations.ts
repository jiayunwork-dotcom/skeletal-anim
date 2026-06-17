import * as THREE from 'three';
import { AnimationClip } from './AnimationClip';
import { Keyframe } from './Keyframe';
import { generateId } from '../../utils/math';
import { getHumanoidBoneNames } from '../skeleton/HumanoidPreset';
import type { Skeleton } from '../skeleton/Skeleton';

function createKeyframe(
  frame: number,
  rotations: Record<string, [number, number, number]>,
  nameToId: Map<string, string>
): Keyframe {
  const boneRotations: Record<string, [number, number, number]> = {};
  for (const [boneName, [x, y, z]] of Object.entries(rotations)) {
    const boneId = nameToId.get(boneName);
    if (boneId) {
      boneRotations[boneId] = [
        THREE.MathUtils.degToRad(x),
        THREE.MathUtils.degToRad(y),
        THREE.MathUtils.degToRad(z),
      ];
    }
  }
  return new Keyframe({ frame, boneRotations });
}

function createIdleAnimation(nameToId: Map<string, string>): AnimationClip {
  const fps = 30;
  const duration = 60;
  const totalFrames = Math.floor(fps * 2);

  const keyframes: Keyframe[] = [];

  keyframes.push(createKeyframe(0, {
    'Hips': [0, 0, 0],
    'Spine': [0, 0, 0],
    'Chest': [0, 0, 0],
    'Neck': [0, 0, 0],
    'Head': [0, 0, 0],
    'LeftShoulder': [0, 0, 10],
    'LeftElbow': [0, 0, -5],
    'LeftWrist': [0, 0, 0],
    'RightShoulder': [0, 0, -10],
    'RightElbow': [0, 0, 5],
    'RightWrist': [0, 0, 0],
    'LeftHip': [0, 0, 5],
    'LeftKnee': [-3, 0, 0],
    'LeftAnkle': [3, 0, 0],
    'RightHip': [0, 0, -5],
    'RightKnee': [-3, 0, 0],
    'RightAnkle': [3, 0, 0],
  }, nameToId));

  keyframes.push(createKeyframe(30, {
    'Hips': [0, 0, 0],
    'Spine': [1, 0.5, 0],
    'Chest': [0.6, 0.3, 0],
    'Neck': [-0.4, -0.3, 0],
    'Head': [-0.2, 0, 0],
    'LeftShoulder': [0, 0, 11],
    'LeftElbow': [0, 0, -5],
    'LeftWrist': [0, 0, 0],
    'RightShoulder': [0, 0, -11],
    'RightElbow': [0, 0, 5],
    'RightWrist': [0, 0, 0],
    'LeftHip': [0, 0, 5],
    'LeftKnee': [-3, 0, 0],
    'LeftAnkle': [3, 0, 0],
    'RightHip': [0, 0, -5],
    'RightKnee': [-3, 0, 0],
    'RightAnkle': [3, 0, 0],
  }, nameToId));

  keyframes.push(createKeyframe(60, {
    'Hips': [0, 0, 0],
    'Spine': [0, 0, 0],
    'Chest': [0, 0, 0],
    'Neck': [0, 0, 0],
    'Head': [0, 0, 0],
    'LeftShoulder': [0, 0, 10],
    'LeftElbow': [0, 0, -5],
    'LeftWrist': [0, 0, 0],
    'RightShoulder': [0, 0, -10],
    'RightElbow': [0, 0, 5],
    'RightWrist': [0, 0, 0],
    'LeftHip': [0, 0, 5],
    'LeftKnee': [-3, 0, 0],
    'LeftAnkle': [3, 0, 0],
    'RightHip': [0, 0, -5],
    'RightKnee': [-3, 0, 0],
    'RightAnkle': [3, 0, 0],
  }, nameToId));

  return new AnimationClip({
    id: generateId(),
    name: 'Idle',
    fps,
    duration,
    keyframes: keyframes.map(k => k.toData()),
  });
}

function createWalkAnimation(nameToId: Map<string, string>): AnimationClip {
  const fps = 30;
  const duration = 30;

  const keyframes: Keyframe[] = [];

  keyframes.push(createKeyframe(0, {
    'Hips': [2, 0, 0.6],
    'Spine': [0, 0, -0.9],
    'Chest': [0, 0, -0.6],
    'Neck': [0, 0, 0.3],
    'Head': [0, 0, 0],
    'LeftShoulder': [20, 0, 10],
    'LeftElbow': [0, 0, -20],
    'LeftWrist': [0, 0, 0],
    'RightShoulder': [-20, 0, -10],
    'RightElbow': [0, 0, 20],
    'RightWrist': [0, 0, 0],
    'LeftHip': [25, 0, 5],
    'LeftKnee': [0, 0, 0],
    'LeftAnkle': [-15, 0, 0],
    'RightHip': [-25, 0, -5],
    'RightKnee': [-60, 0, 0],
    'RightAnkle': [15, 0, 0],
  }, nameToId));

  keyframes.push(createKeyframe(15, {
    'Hips': [2, 0, -0.6],
    'Spine': [0, 0, 0.9],
    'Chest': [0, 0, 0.6],
    'Neck': [0, 0, -0.3],
    'Head': [0, 0, 0],
    'LeftShoulder': [-20, 0, 10],
    'LeftElbow': [0, 0, -20],
    'LeftWrist': [0, 0, 0],
    'RightShoulder': [20, 0, -10],
    'RightElbow': [0, 0, 20],
    'RightWrist': [0, 0, 0],
    'LeftHip': [-25, 0, 5],
    'LeftKnee': [-60, 0, 0],
    'LeftAnkle': [15, 0, 0],
    'RightHip': [25, 0, -5],
    'RightKnee': [0, 0, 0],
    'RightAnkle': [-15, 0, 0],
  }, nameToId));

  keyframes.push(createKeyframe(30, {
    'Hips': [2, 0, 0.6],
    'Spine': [0, 0, -0.9],
    'Chest': [0, 0, -0.6],
    'Neck': [0, 0, 0.3],
    'Head': [0, 0, 0],
    'LeftShoulder': [20, 0, 10],
    'LeftElbow': [0, 0, -20],
    'LeftWrist': [0, 0, 0],
    'RightShoulder': [-20, 0, -10],
    'RightElbow': [0, 0, 20],
    'RightWrist': [0, 0, 0],
    'LeftHip': [25, 0, 5],
    'LeftKnee': [0, 0, 0],
    'LeftAnkle': [-15, 0, 0],
    'RightHip': [-25, 0, -5],
    'RightKnee': [-60, 0, 0],
    'RightAnkle': [15, 0, 0],
  }, nameToId));

  return new AnimationClip({
    id: generateId(),
    name: 'Walk',
    fps,
    duration,
    keyframes: keyframes.map(k => k.toData()),
  });
}

function createRunAnimation(nameToId: Map<string, string>): AnimationClip {
  const fps = 30;
  const duration = 24;

  const keyframes: Keyframe[] = [];

  keyframes.push(createKeyframe(0, {
    'Hips': [6, 0, 2.4],
    'Spine': [2.5, 0, -3.2],
    'Chest': [1.5, 0, -2.4],
    'Neck': [-1, 0, 0.8],
    'Head': [-0.5, 0, 0],
    'LeftShoulder': [35, 0, 15],
    'LeftElbow': [0, 0, -40],
    'LeftWrist': [0, 0, 0],
    'RightShoulder': [-35, 0, -15],
    'RightElbow': [0, 0, 40],
    'RightWrist': [0, 0, 0],
    'LeftHip': [40, 0, 8],
    'LeftKnee': [0, 0, 0],
    'LeftAnkle': [-25, 0, 0],
    'RightHip': [-40, 0, -8],
    'RightKnee': [-90, 0, 0],
    'RightAnkle': [25, 0, 0],
  }, nameToId));

  keyframes.push(createKeyframe(12, {
    'Hips': [6, 0, -2.4],
    'Spine': [2.5, 0, 3.2],
    'Chest': [1.5, 0, 2.4],
    'Neck': [-1, 0, -0.8],
    'Head': [-0.5, 0, 0],
    'LeftShoulder': [-35, 0, 15],
    'LeftElbow': [0, 0, -40],
    'LeftWrist': [0, 0, 0],
    'RightShoulder': [35, 0, -15],
    'RightElbow': [0, 0, 40],
    'RightWrist': [0, 0, 0],
    'LeftHip': [-40, 0, 8],
    'LeftKnee': [-90, 0, 0],
    'LeftAnkle': [25, 0, 0],
    'RightHip': [40, 0, -8],
    'RightKnee': [0, 0, 0],
    'RightAnkle': [-25, 0, 0],
  }, nameToId));

  keyframes.push(createKeyframe(24, {
    'Hips': [6, 0, 2.4],
    'Spine': [2.5, 0, -3.2],
    'Chest': [1.5, 0, -2.4],
    'Neck': [-1, 0, 0.8],
    'Head': [-0.5, 0, 0],
    'LeftShoulder': [35, 0, 15],
    'LeftElbow': [0, 0, -40],
    'LeftWrist': [0, 0, 0],
    'RightShoulder': [-35, 0, -15],
    'RightElbow': [0, 0, 40],
    'RightWrist': [0, 0, 0],
    'LeftHip': [40, 0, 8],
    'LeftKnee': [0, 0, 0],
    'LeftAnkle': [-25, 0, 0],
    'RightHip': [-40, 0, -8],
    'RightKnee': [-90, 0, 0],
    'RightAnkle': [25, 0, 0],
  }, nameToId));

  return new AnimationClip({
    id: generateId(),
    name: 'Run',
    fps,
    duration,
    keyframes: keyframes.map(k => k.toData()),
  });
}

export function createPresetAnimations(skeleton: Skeleton): AnimationClip[] {
  const nameToId = new Map<string, string>();
  skeleton.getAllBones().forEach(bone => {
    nameToId.set(bone.name, bone.id);
  });

  return [
    createIdleAnimation(nameToId),
    createWalkAnimation(nameToId),
    createRunAnimation(nameToId),
  ];
}

export { getHumanoidBoneNames };
