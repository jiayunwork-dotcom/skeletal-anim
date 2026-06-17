export type InterpolationType = 'linear' | 'bezier';

export interface KeyframeData {
  frame: number;
  boneRotations: Record<string, [number, number, number]>;
  interpolation: InterpolationType;
  bezierHandles?: Record<string, [[number, number, number], [number, number, number]]>;
}

export interface AnimationClipData {
  id: string;
  name: string;
  fps: number;
  duration: number;
  keyframes: KeyframeData[];
  loop?: boolean;
}

export interface StateData {
  id: string;
  name: string;
  clipId: string;
  speed: number;
  position: [number, number];
}

export interface TransitionData {
  id: string;
  fromStateId: string;
  toStateId: string;
  blendDuration: number;
  condition: string;
}

export interface StateMachineData {
  id: string;
  states: StateData[];
  transitions: TransitionData[];
  parameters: Record<string, boolean | number>;
  initialStateId: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  currentClipId: string | null;
  speed: number;
  loop: boolean;
  fps: number;
}
