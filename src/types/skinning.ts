export interface VertexWeight {
  boneId: string;
  weight: number;
}

export interface VertexData {
  position: [number, number, number];
  normal?: [number, number, number];
  weights: VertexWeight[];
}

export interface MeshData {
  id: string;
  name: string;
  vertices: VertexData[];
  faces: Array<[number, number, number]>;
}

export interface WeightPaintConfig {
  brushSize: number;
  brushStrength: number;
  brushFalloff: number;
  mode: 'add' | 'remove' | 'smooth';
}

export interface ProjectData {
  version: string;
  name: string;
  skeleton: import('./skeleton').SkeletonData;
  mesh?: MeshData;
  animationClips: import('./animation').AnimationClipData[];
  stateMachine?: import('./animation').StateMachineData;
  blueprint?: import('./blueprint').BlueprintGraphData;
  animation?: {
    clips: import('./animation').AnimationClipData[];
    stateMachine?: import('./animation').StateMachineData;
    currentClipId?: string;
  };
  createdAt: string;
  updatedAt: string;
}
