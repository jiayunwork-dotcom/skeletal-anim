export type BlueprintNodeType =
  | 'animationSource'
  | 'blend'
  | 'condition'
  | 'additive'
  | 'transition'
  | 'output';

export type PortType = 'pose' | 'boolean' | 'number';

export interface BlueprintPort {
  id: string;
  name: string;
  type: PortType;
  isInput: boolean;
}

export type TransitionCurveType = 'linear' | 'easeInOut';

export interface AnimationSourceNodeConfig {
  clipId: string | null;
  playbackTime: number;
}

export interface BlendNodeConfig {
  weight: number;
  boneMask: Record<string, boolean>;
}

export interface ConditionNodeConfig {
  parameterName: string;
}

export interface AdditiveNodeConfig {
  strength: number;
}

export interface TransitionNodeConfig {
  duration: number;
  curveType: TransitionCurveType;
  isActive: boolean;
  transitionProgress: number;
}

export interface OutputNodeConfig {}

export type BlueprintNodeConfig =
  | AnimationSourceNodeConfig
  | BlendNodeConfig
  | ConditionNodeConfig
  | AdditiveNodeConfig
  | TransitionNodeConfig
  | OutputNodeConfig;

export interface BlueprintNodeData {
  id: string;
  type: BlueprintNodeType;
  position: { x: number; y: number };
  config: BlueprintNodeConfig;
}

export interface BlueprintConnectionData {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface BlueprintGraphData {
  id: string;
  nodes: BlueprintNodeData[];
  connections: BlueprintConnectionData[];
  parameters: Record<string, boolean | number>;
}

export interface BlueprintValidationError {
  nodeId: string;
  message: string;
  errorType: 'loop' | 'unconnected' | 'typeMismatch';
}

export interface BlueprintEvaluationContext {
  time: number;
  deltaTime: number;
  skeletonBoneIds: string[];
}
