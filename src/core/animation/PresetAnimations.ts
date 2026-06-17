import * as THREE from 'three';
import { AnimationClip } from './AnimationClip';
import { Keyframe } from './Keyframe';
import { generateId } from '../../utils/math';
import { getHumanoidBoneNames } from '../skeleton/HumanoidPreset';

function createKeyframe(frame: number, rotations: Record<string, [number, number, number]>): Keyframe {
  const boneRotations: Record<string, [number, number, number]> = {};
  for (const [boneName, [x, y, z]] of Object.entries(rotations)) {
    boneRotations[boneName] = [
      THREE.MathUtils.degToRad(x),
      THREE.MathUtils.degToRad(y),
      THREE.MathUtils.degToRad(z),
    ];
  }
  return new Keyframe({ frame, boneRotations });
}

function createIdleAnimation(): AnimationClip {
  const fps = 30;
  const duration = 2;
  const totalFrames = Math.floor(fps * duration);

  const keyframes: Keyframe[] = [];

  for (let frame = 0; frame <= totalFrames; frame++) {
    const t = (frame / totalFrames) * Math.PI * 2;
    const breatheOffset = Math.sin(t) * 2;
    const swayOffset = Math.sin(t * 0.5) * 1;

    const rotations: Record<string, [number, number, number]> = {
      'Hips': [0, 0, 0],
      'Spine': [breatheOffset * 0.5, swayOffset * 0.3, 0],
      'Chest': [breatheOffset * 0.3, swayOffset * 0.2, 0],
      'Neck': [-breatheOffset * 0.2, -swayOffset * 0.2, 0],
      'Head': [-breatheOffset * 0.1, 0, 0],
      'LeftShoulder': [0, 0, 10 + breatheOffset * 0.5],
      'LeftElbow': [0, 0, -5],
      'LeftWrist': [0, 0, 0],
      'RightShoulder': [0, 0, -10 - breatheOffset * 0.5],
      'RightElbow': [0, 0, 5],
      'RightWrist': [0, 0, 0],
      'LeftHip': [0, 0, 5],
      'LeftKnee': [-3, 0, 0],
      'LeftAnkle': [3, 0, 0],
      'RightHip': [0, 0, -5],
      'RightKnee': [-3, 0, 0],
      'RightAnkle': [3, 0, 0],
    };

    keyframes.push(createKeyframe(frame, rotations));
  }

  return new AnimationClip({
    id: generateId(),
    name: 'Idle',
    fps,
    duration,
    keyframes: keyframes.map(k => k.toData()),
    loop: true,
  });
}

function createWalkAnimation(): AnimationClip {
  const fps = 30;
  const duration = 1;
  const totalFrames = Math.floor(fps * duration);

  const keyframes: Keyframe[] = [];

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = (frame / totalFrames) * Math.PI * 2;

    const hipSwing = Math.sin(t) * 3;
    const hipBob = Math.abs(Math.sin(t * 2)) * 2;

    const leftLegPhase = t;
    const rightLegPhase = t + Math.PI;

    const leftHipRot = Math.sin(leftLegPhase) * 25;
    const leftKneeRot = Math.max(0, -Math.sin(leftLegPhase)) * 60;
    const leftAnkleRot = Math.sin(leftLegPhase + Math.PI) * 15;

    const rightHipRot = Math.sin(rightLegPhase) * 25;
    const rightKneeRot = Math.max(0, -Math.sin(rightLegPhase)) * 60;
    const rightAnkleRot = Math.sin(rightLegPhase + Math.PI) * 15;

    const leftArmPhase = t + Math.PI;
    const rightArmPhase = t;

    const leftShoulderRot = Math.sin(leftArmPhase) * 20;
    const leftElbowRot = 20 + Math.abs(Math.sin(leftArmPhase)) * 15;

    const rightShoulderRot = Math.sin(rightArmPhase) * 20;
    const rightElbowRot = 20 + Math.abs(Math.sin(rightArmPhase)) * 15;

    const rotations: Record<string, [number, number, number]> = {
      'Hips': [hipBob, 0, hipSwing * 0.2],
      'Spine': [0, 0, -hipSwing * 0.3],
      'Chest': [0, 0, -hipSwing * 0.2],
      'Neck': [0, 0, hipSwing * 0.1],
      'Head': [0, 0, 0],
      'LeftShoulder': [leftShoulderRot, 0, 10],
      'LeftElbow': [0, 0, -leftElbowRot],
      'LeftWrist': [0, 0, 0],
      'RightShoulder': [rightShoulderRot, 0, -10],
      'RightElbow': [0, 0, rightElbowRot],
      'RightWrist': [0, 0, 0],
      'LeftHip': [leftHipRot, 0, 5],
      'LeftKnee': [-leftKneeRot, 0, 0],
      'LeftAnkle': [leftAnkleRot, 0, 0],
      'RightHip': [rightHipRot, 0, -5],
      'RightKnee': [-rightKneeRot, 0, 0],
      'RightAnkle': [rightAnkleRot, 0, 0],
    };

    keyframes.push(createKeyframe(frame, rotations));
  }

  const lastKf = keyframes[0].clone();
  lastKf.frame = totalFrames;
  keyframes.push(lastKf);

  return new AnimationClip({
    id: generateId(),
    name: 'Walk',
    fps,
    duration,
    keyframes: keyframes.map(k => k.toData()),
    loop: true,
  });
}

function createRunAnimation(): AnimationClip {
  const fps = 30;
  const duration = 0.8;
  const totalFrames = Math.floor(fps * duration);

  const keyframes: Keyframe[] = [];

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = (frame / totalFrames) * Math.PI * 2;

    const hipSwing = Math.sin(t) * 8;
    const hipBob = Math.abs(Math.sin(t * 2)) * 6;

    const leftLegPhase = t;
    const rightLegPhase = t + Math.PI;

    const leftHipRot = Math.sin(leftLegPhase) * 40;
    const leftKneeRot = Math.max(0, -Math.sin(leftLegPhase)) * 90;
    const leftAnkleRot = Math.sin(leftLegPhase + Math.PI) * 25;

    const rightHipRot = Math.sin(rightLegPhase) * 40;
    const rightKneeRot = Math.max(0, -Math.sin(rightLegPhase)) * 90;
    const rightAnkleRot = Math.sin(rightLegPhase + Math.PI) * 25;

    const leftArmPhase = t + Math.PI;
    const rightArmPhase = t;

    const leftShoulderRot = Math.sin(leftArmPhase) * 35;
    const leftElbowRot = 40 + Math.abs(Math.sin(leftArmPhase)) * 30;

    const rightShoulderRot = Math.sin(rightArmPhase) * 35;
    const rightElbowRot = 40 + Math.abs(Math.sin(rightArmPhase)) * 30;

    const bodyLean = Math.abs(Math.sin(t * 2)) * 5;

    const rotations: Record<string, [number, number, number]> = {
      'Hips': [hipBob + bodyLean, 0, hipSwing * 0.3],
      'Spine': [bodyLean * 0.5, 0, -hipSwing * 0.4],
      'Chest': [bodyLean * 0.3, 0, -hipSwing * 0.3],
      'Neck': [-bodyLean * 0.2, 0, hipSwing * 0.1],
      'Head': [-bodyLean * 0.1, 0, 0],
      'LeftShoulder': [leftShoulderRot, 0, 15],
      'LeftElbow': [0, 0, -leftElbowRot],
      'LeftWrist': [0, 0, 0],
      'RightShoulder': [rightShoulderRot, 0, -15],
      'RightElbow': [0, 0, rightElbowRot],
      'RightWrist': [0, 0, 0],
      'LeftHip': [leftHipRot, 0, 8],
      'LeftKnee': [-leftKneeRot, 0, 0],
      'LeftAnkle': [leftAnkleRot, 0, 0],
      'RightHip': [rightHipRot, 0, -8],
      'RightKnee': [-rightKneeRot, 0, 0],
      'RightAnkle': [rightAnkleRot, 0, 0],
    };

    keyframes.push(createKeyframe(frame, rotations));
  }

  const lastKf = keyframes[0].clone();
  lastKf.frame = totalFrames;
  keyframes.push(lastKf);

  return new AnimationClip({
    id: generateId(),
    name: 'Run',
    fps,
    duration,
    keyframes: keyframes.map(k => k.toData()),
    loop: true,
  });
}

export function createPresetAnimations(): AnimationClip[] {
  return [
    createIdleAnimation(),
    createWalkAnimation(),
    createRunAnimation(),
  ];
}

export { getHumanoidBoneNames };
