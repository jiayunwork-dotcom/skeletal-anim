import * as THREE from 'three';
import { Skeleton } from '../skeleton/Skeleton';
import { AnimationClip } from './AnimationClip';
import { Keyframe } from './Keyframe';
import type { PlaybackState } from '@/types';
import { DEFAULT_FPS } from '@/utils/constants';

export class Animator {
  skeleton: Skeleton;
  clips: Map<string, AnimationClip>;
  playbackState: PlaybackState;
  blendClips: Map<string, { clip: AnimationClip; weight: number }>;
  lastTime: number;
  cachedPose: Map<string, THREE.Euler>;

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;
    this.clips = new Map();
    this.playbackState = {
      isPlaying: false,
      currentFrame: 0,
      currentClipId: null,
      speed: 1,
      loop: true,
      fps: DEFAULT_FPS,
    };
    this.blendClips = new Map();
    this.lastTime = performance.now();
    this.cachedPose = new Map();
  }

  addClip(clip: AnimationClip): void {
    this.clips.set(clip.id, clip);
  }

  removeClip(clipId: string): void {
    this.clips.delete(clipId);
    if (this.playbackState.currentClipId === clipId) {
      this.playbackState.currentClipId = null;
      this.playbackState.isPlaying = false;
    }
  }

  getClip(clipId: string): AnimationClip | undefined {
    return this.clips.get(clipId);
  }

  getAllClips(): AnimationClip[] {
    return Array.from(this.clips.values());
  }

  get fps(): number {
    const currentClip = this.getClip(this.playbackState.currentClipId || '');
    return currentClip?.fps || this.playbackState.fps;
  }

  play(clipId?: string): void {
    if (clipId) {
      this.playbackState.currentClipId = clipId;
    }
    if (this.playbackState.currentClipId) {
      this.playbackState.isPlaying = true;
      this.lastTime = performance.now();
    }
  }

  pause(): void {
    this.playbackState.isPlaying = false;
  }

  togglePlay(): void {
    if (this.playbackState.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  stop(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.currentFrame = 0;
  }

  setCurrentFrame(frame: number): void {
    const clip = this.getCurrentClip();
    if (clip) {
      this.playbackState.currentFrame = Math.max(0, Math.min(clip.getTotalFrames() - 1, frame));
    }
  }

  nextFrame(): void {
    this.setCurrentFrame(this.playbackState.currentFrame + 1);
  }

  prevFrame(): void {
    this.setCurrentFrame(this.playbackState.currentFrame - 1);
  }

  setSpeed(speed: number): void {
    this.playbackState.speed = Math.max(0.25, Math.min(2, speed));
  }

  setLoop(loop: boolean): void {
    this.playbackState.loop = loop;
  }

  getCurrentClip(): AnimationClip | undefined {
    if (!this.playbackState.currentClipId) return undefined;
    return this.clips.get(this.playbackState.currentClipId);
  }

  update(): void {
    if (!this.playbackState.isPlaying) return;

    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const clip = this.getCurrentClip();
    if (!clip) return;

    const fps = clip.fps || DEFAULT_FPS;
    const frameDelta = deltaTime * fps * this.playbackState.speed;
    let newFrame = this.playbackState.currentFrame + frameDelta;
    const totalFrames = clip.getTotalFrames();

    if (this.playbackState.loop) {
      newFrame = ((newFrame % totalFrames) + totalFrames) % totalFrames;
    } else {
      newFrame = Math.min(newFrame, totalFrames - 1);
      if (newFrame >= totalFrames - 1) {
        this.playbackState.isPlaying = false;
      }
    }

    this.playbackState.currentFrame = newFrame;
    this.applyPose(newFrame);
  }

  applyPose(frame: number): void {
    const clip = this.getCurrentClip();
    if (!clip) return;

    const boneIds = Array.from(this.skeleton.bones.keys());
    let pose = clip.evaluate(frame, boneIds);

    if (this.blendClips.size > 0) {
      pose = this.blendPoses(pose, frame);
    }

    this.cachedPose = pose;

    pose.forEach((rotation, boneId) => {
      this.skeleton.setBoneRotation(boneId, rotation);
    });

    this.skeleton.updateBoneMatrices();
  }

  blendPoses(
    basePose: Map<string, THREE.Euler>,
    currentFrame: number
  ): Map<string, THREE.Euler> {
    const result = new Map<string, THREE.Euler>();
    const boneIds = Array.from(this.skeleton.bones.keys());

    boneIds.forEach((boneId) => {
      let totalWeight = 0;
      const quats: THREE.Quaternion[] = [];
      const weights: number[] = [];

      const baseRot = basePose.get(boneId);
      if (baseRot) {
        const baseQuat = new THREE.Quaternion().setFromEuler(baseRot);
        const baseWeight = 1 - this.getTotalBlendWeight();
        if (baseWeight > 0) {
          quats.push(baseQuat);
          weights.push(baseWeight);
          totalWeight += baseWeight;
        }
      }

      this.blendClips.forEach(({ clip, weight }, clipId) => {
        const clipPose = clip.evaluate(currentFrame, [boneId]);
        const rot = clipPose.get(boneId);
        if (rot && weight > 0) {
          const quat = new THREE.Quaternion().setFromEuler(rot);
          quats.push(quat);
          weights.push(weight);
          totalWeight += weight;
        }
      });

      if (quats.length > 0 && totalWeight > 0) {
        const normalizedWeights = weights.map((w) => w / totalWeight);
        const resultQuat = this.slerpMultiple(quats, normalizedWeights);
        result.set(boneId, new THREE.Euler().setFromQuaternion(resultQuat));
      } else if (baseRot) {
        result.set(boneId, baseRot.clone());
      }
    });

    return result;
  }

  slerpMultiple(quats: THREE.Quaternion[], weights: number[]): THREE.Quaternion {
    if (quats.length === 0) return new THREE.Quaternion();
    if (quats.length === 1) return quats[0].clone();

    let result = quats[0].clone();
    let accumulatedWeight = weights[0];

    for (let i = 1; i < quats.length; i++) {
      if (weights[i] > 0 && accumulatedWeight + weights[i] > 0) {
        const t = weights[i] / (accumulatedWeight + weights[i]);
        result.slerp(quats[i], t);
        accumulatedWeight += weights[i];
      }
    }

    return result;
  }

  setBlendWeight(clipId: string, weight: number): void {
    const clip = this.clips.get(clipId);
    if (clip) {
      this.blendClips.set(clipId, { clip, weight: Math.max(0, Math.min(1, weight)) });
    }
  }

  clearBlend(): void {
    this.blendClips.clear();
  }

  getTotalBlendWeight(): number {
    let total = 0;
    this.blendClips.forEach(({ weight }) => {
      total += weight;
    });
    return Math.min(1, total);
  }

  getCurrentPose(): Map<string, THREE.Euler> {
    return new Map(this.cachedPose);
  }

  recordKeyframe(frame: number): Keyframe {
    const keyframe = new Keyframe({ frame });
    
    this.skeleton.bones.forEach((bone, boneId) => {
      keyframe.setBoneRotation(boneId, bone.rotation.clone());
    });

    const clip = this.getCurrentClip();
    if (clip) {
      clip.addKeyframe(keyframe);
    }

    return keyframe;
  }

  createClip(name: string): AnimationClip {
    const clip = new AnimationClip({ name });
    this.addClip(clip);
    return clip;
  }

  duplicateClip(clipId: string, newName?: string): AnimationClip | null {
    const clip = this.clips.get(clipId);
    if (!clip) return null;

    const newClip = clip.clone();
    newClip.id = '';
    newClip.name = newName || `${clip.name} (Copy)`;
    this.addClip(newClip);
    return newClip;
  }
}
