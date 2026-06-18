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

export interface NodeEvaluationResult {
  nodeId: string;
  outputs: Map<string, any>;
  evaluationTimeUs: number;
}

export interface BlueprintEvaluationResult {
  finalPose: Map<string, any>;
  nodeResults: Map<string, NodeEvaluationResult>;
  evaluationOrder: string[];
  totalEvaluationTimeMs: number;
  activeConnectionCount: number;
}

export interface BlueprintPerformanceFrame {
  timestamp: number;
  evaluationTimeMs: number;
  nodeCount: number;
  activeConnectionCount: number;
  evaluationOrder: string[];
  nodeTimings: Map<string, number>;
}

export type BlueprintUndoActionType =
  | 'addNode'
  | 'removeNode'
  | 'moveNode'
  | 'addConnection'
  | 'removeConnection'
  | 'setNodeConfig'
  | 'setParameter'
  | 'disconnectNode';

export interface BlueprintUndoAction {
  type: BlueprintUndoActionType;
  timestamp: number;
  before: BlueprintGraphData;
  after: BlueprintGraphData;
}

export interface BlueprintBreakpointState {
  breakpoints: Set<string>;
  pausedAtNodeId: string | null;
  isPaused: boolean;
  evaluationOrder: string[];
  currentEvalIndex: number;
  nodeResults: Map<string, NodeEvaluationResult>;
}
