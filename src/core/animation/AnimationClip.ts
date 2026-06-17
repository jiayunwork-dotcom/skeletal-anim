import * as THREE from 'three';
import { Keyframe } from './Keyframe';
import type { AnimationClipData, InterpolationType } from '@/types';
import { generateId } from '@/utils/math';
import { DEFAULT_FPS } from '@/utils/constants';

export class AnimationClip {
  id: string;
  name: string;
  fps: number;
  duration: number;
  keyframes: Keyframe[];
  loop: boolean;

  constructor(data: Partial<AnimationClipData> = {}) {
    this.id = data.id || generateId();
    this.name = data.name || 'Animation';
    this.fps = data.fps || DEFAULT_FPS;
    this.duration = data.duration || 60;
    this.loop = data.loop !== undefined ? data.loop : true;
    this.keyframes = [];

    if (data.keyframes) {
      this.keyframes = data.keyframes.map((kf) => new Keyframe(kf));
      this.sortKeyframes();
      this.updateDuration();
    }
  }

  toData(): AnimationClipData {
    return {
      id: this.id,
      name: this.name,
      fps: this.fps,
      duration: this.duration,
      keyframes: this.keyframes.map((kf) => kf.toData()),
      loop: this.loop,
    };
  }

  addKeyframe(keyframe: Keyframe): void {
    const existingIndex = this.keyframes.findIndex((kf) => kf.frame === keyframe.frame);
    if (existingIndex >= 0) {
      this.keyframes[existingIndex] = keyframe;
    } else {
      this.keyframes.push(keyframe);
    }
    this.sortKeyframes();
    this.updateDuration();
  }

  removeKeyframe(frame: number): void {
    const index = this.keyframes.findIndex((kf) => kf.frame === frame);
    if (index >= 0) {
      this.keyframes.splice(index, 1);
      this.updateDuration();
    }
  }

  getKeyframeAt(frame: number): Keyframe | undefined {
    return this.keyframes.find((kf) => kf.frame === frame);
  }

  getNearestKeyframes(frame: number): [Keyframe | null, Keyframe | null] {
    if (this.keyframes.length === 0) {
      return [null, null];
    }

    let prevKeyframe: Keyframe | null = null;
    let nextKeyframe: Keyframe | null = null;

    for (const kf of this.keyframes) {
      if (kf.frame <= frame) {
        prevKeyframe = kf;
      } else {
        nextKeyframe = kf;
        break;
      }
    }

    if (!prevKeyframe && this.keyframes.length > 0) {
      prevKeyframe = this.keyframes[0];
    }
    if (!nextKeyframe && this.keyframes.length > 0) {
      nextKeyframe = this.keyframes[this.keyframes.length - 1];
    }

    return [prevKeyframe, nextKeyframe];
  }

  evaluate(frame: number, boneIds: string[]): Map<string, THREE.Euler> {
    if (this.keyframes.length === 0) {
      return new Map();
    }

    const [prevKf, nextKf] = this.getNearestKeyframes(frame);

    if (!prevKf || !nextKf || prevKf.frame === nextKf.frame) {
      const kf = prevKf || nextKf;
      if (kf) {
        const result = new Map<string, THREE.Euler>();
        boneIds.forEach((id) => {
          const rot = kf.getBoneRotation(id);
          if (rot) result.set(id, rot.clone());
        });
        return result;
      }
      return new Map();
    }

    const t = (frame - prevKf.frame) / (nextKf.frame - prevKf.frame);
    const clampedT = Math.max(0, Math.min(1, t));

    if (prevKf.interpolation === 'bezier') {
      return Keyframe.bezierInterpolate(prevKf, nextKf, clampedT, boneIds);
    } else {
      return Keyframe.lerp(prevKf, nextKf, clampedT, boneIds);
    }
  }

  sortKeyframes(): void {
    this.keyframes.sort((a, b) => a.frame - b.frame);
  }

  updateDuration(): void {
    if (this.keyframes.length > 0) {
      const maxFrame = Math.max(...this.keyframes.map((kf) => kf.frame));
      this.duration = Math.max(this.duration, maxFrame + 1);
    }
  }

  setKeyframeInterpolation(frame: number, interpolation: InterpolationType): void {
    const kf = this.getKeyframeAt(frame);
    if (kf) {
      kf.interpolation = interpolation;
    }
  }

  moveKeyframe(fromFrame: number, toFrame: number): void {
    const kf = this.getKeyframeAt(fromFrame);
    if (kf) {
      this.removeKeyframe(fromFrame);
      kf.frame = toFrame;
      this.addKeyframe(kf);
    }
  }

  copyKeyframe(frame: number): Keyframe | null {
    const kf = this.getKeyframeAt(frame);
    return kf ? kf.clone() : null;
  }

  pasteKeyframe(keyframe: Keyframe, targetFrame: number): void {
    const copy = keyframe.clone();
    copy.frame = targetFrame;
    this.addKeyframe(copy);
  }

  clone(): AnimationClip {
    return new AnimationClip(this.toData());
  }

  getKeyframeFrames(): number[] {
    return this.keyframes.map((kf) => kf.frame);
  }

  getTotalFrames(): number {
    return Math.floor(this.duration);
  }

  getTimeAtFrame(frame: number): number {
    return frame / this.fps;
  }

  getFrameAtTime(time: number): number {
    return Math.floor(time * this.fps);
  }
}
