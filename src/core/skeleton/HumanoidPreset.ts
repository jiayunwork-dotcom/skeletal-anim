import { Skeleton } from './Skeleton';
import { Bone } from './Bone';
import { degreesToRadians } from '@/utils/math';

const HUMANOID_BONE_NAMES = [
  'Hips',
  'Spine',
  'Chest',
  'Neck',
  'Head',
  'LeftShoulder',
  'LeftElbow',
  'LeftWrist',
  'RightShoulder',
  'RightElbow',
  'RightWrist',
  'LeftHip',
  'LeftKnee',
  'LeftAnkle',
  'RightHip',
  'RightKnee',
  'RightAnkle',
] as const;

const HUMANOID_HIERARCHY: Record<string, string | null> = {
  Hips: null,
  Spine: 'Hips',
  Chest: 'Spine',
  Neck: 'Chest',
  Head: 'Neck',
  LeftShoulder: 'Chest',
  LeftElbow: 'LeftShoulder',
  'LeftWrist': 'LeftElbow',
  RightShoulder: 'Chest',
  RightElbow: 'RightShoulder',
  RightWrist: 'RightElbow',
  LeftHip: 'Hips',
  LeftKnee: 'LeftHip',
  LeftAnkle: 'LeftKnee',
  RightHip: 'Hips',
  RightKnee: 'RightHip',
  RightAnkle: 'RightKnee',
};

const HUMANOID_POSITIONS: Record<string, [number, number, number]> = {
  Hips: [0, 1.0, 0],
  Spine: [0, 0.3, 0],
  Chest: [0, 0.35, 0],
  Neck: [0, 0.25, 0],
  Head: [0, 0.25, 0],
  LeftShoulder: [0.15, 0.1, 0],
  LeftElbow: [0.4, 0, 0],
  LeftWrist: [0.4, 0, 0],
  RightShoulder: [-0.15, 0.1, 0],
  RightElbow: [-0.4, 0, 0],
  RightWrist: [-0.4, 0, 0],
  LeftHip: [0.15, -0.1, 0],
  LeftKnee: [0, -0.5, 0],
  LeftAnkle: [0, -0.5, 0],
  RightHip: [-0.15, -0.1, 0],
  RightKnee: [0, -0.5, 0],
  RightAnkle: [0, -0.5, 0],
};

const HUMANOID_LENGTHS: Record<string, number> = {
  Hips: 0.1,
  Spine: 0.3,
  Chest: 0.35,
  Neck: 0.25,
  Head: 0.25,
  LeftShoulder: 0.15,
  LeftElbow: 0.4,
  LeftWrist: 0.1,
  RightShoulder: 0.15,
  RightElbow: 0.4,
  RightWrist: 0.1,
  LeftHip: 0.5,
  LeftKnee: 0.5,
  LeftAnkle: 0.1,
  RightHip: 0.5,
  RightKnee: 0.5,
  RightAnkle: 0.1,
};

const HUMANOID_ROTATION_CONSTRAINTS: Record<string, [number, number]> = {
  LeftElbow: [0, degreesToRadians(150)],
  RightElbow: [0, degreesToRadians(150)],
  LeftKnee: [0, degreesToRadians(150)],
  RightKnee: [0, degreesToRadians(150)],
};

export function createHumanoidSkeleton(): Skeleton {
  const skeleton = new Skeleton({ name: 'Humanoid' });
  const nameToId = new Map<string, string>();

  HUMANOID_BONE_NAMES.forEach((name) => {
    const parentName = HUMANOID_HIERARCHY[name];
    const parentBoneId = parentName ? nameToId.get(parentName) || null : null;

    const bone = new Bone({
      name,
      parentId: parentBoneId,
      position: HUMANOID_POSITIONS[name],
      length: HUMANOID_LENGTHS[name],
      rotation: [0, 0, 0],
    });

    if (HUMANOID_ROTATION_CONSTRAINTS[name]) {
      [bone.minAngle, bone.maxAngle] = HUMANOID_ROTATION_CONSTRAINTS[name];
    }

    skeleton.addBone(bone, parentBoneId);
    nameToId.set(name, bone.id);
  });

  return skeleton;
}

export function getHumanoidBoneNames(): string[] {
  return [...HUMANOID_BONE_NAMES];
}

export function getHumanoidHierarchy(): Record<string, string | null> {
  return { ...HUMANOID_HIERARCHY };
}
