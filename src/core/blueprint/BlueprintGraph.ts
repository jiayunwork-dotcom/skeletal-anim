import * as THREE from 'three';
import { PoseBlender } from './PoseBlender';
import type { BonePoseMap } from './PoseBlender';
import type {
  BlueprintNodeData,
  BlueprintConnectionData,
  BlueprintGraphData,
  BlueprintPort,
  BlueprintValidationError,
  BlueprintEvaluationContext,
  BlueprintNodeType,
  AnimationSourceNodeConfig,
  BlendNodeConfig,
  ConditionNodeConfig,
  AdditiveNodeConfig,
  TransitionNodeConfig,
} from '@/types';
import type { AnimationClip } from '../animation/AnimationClip';
import { generateId } from '@/utils/math';

export interface NodePortInfo {
  inputs: BlueprintPort[];
  outputs: BlueprintPort[];
}

export function getNodePorts(type: BlueprintNodeType): NodePortInfo {
  switch (type) {
    case 'animationSource':
      return {
        inputs: [],
        outputs: [{ id: 'pose', name: 'Pose', type: 'pose', isInput: false }],
      };
    case 'blend':
      return {
        inputs: [
          { id: 'poseA', name: 'A', type: 'pose', isInput: true },
          { id: 'poseB', name: 'B', type: 'pose', isInput: true },
        ],
        outputs: [{ id: 'pose', name: 'Pose', type: 'pose', isInput: false }],
      };
    case 'condition':
      return {
        inputs: [
          { id: 'condition', name: 'Param', type: 'boolean', isInput: true },
          { id: 'truePose', name: 'True', type: 'pose', isInput: true },
          { id: 'falsePose', name: 'False', type: 'pose', isInput: true },
        ],
        outputs: [{ id: 'pose', name: 'Pose', type: 'pose', isInput: false }],
      };
    case 'additive':
      return {
        inputs: [
          { id: 'basePose', name: 'Base', type: 'pose', isInput: true },
          { id: 'addPose', name: 'Add', type: 'pose', isInput: true },
        ],
        outputs: [{ id: 'pose', name: 'Pose', type: 'pose', isInput: false }],
      };
    case 'transition':
      return {
        inputs: [
          { id: 'poseA', name: 'From', type: 'pose', isInput: true },
          { id: 'poseB', name: 'To', type: 'pose', isInput: true },
          { id: 'trigger', name: 'Trigger', type: 'boolean', isInput: true },
        ],
        outputs: [{ id: 'pose', name: 'Pose', type: 'pose', isInput: false }],
      };
    case 'output':
      return {
        inputs: [{ id: 'pose', name: 'Pose', type: 'pose', isInput: true }],
        outputs: [],
      };
  }
}

export function createDefaultNodeConfig(type: BlueprintNodeType) {
  switch (type) {
    case 'animationSource':
      return { clipId: null, playbackTime: 0 } as AnimationSourceNodeConfig;
    case 'blend':
      return { weight: 0.5, boneMask: {} } as BlendNodeConfig;
    case 'condition':
      return { parameterName: 'isGrounded' } as ConditionNodeConfig;
    case 'additive':
      return { strength: 1.0 } as AdditiveNodeConfig;
    case 'transition':
      return {
        duration: 0.5,
        curveType: 'easeInOut' as const,
        isActive: false,
        transitionProgress: 0,
      } as TransitionNodeConfig;
    case 'output':
      return {};
  }
}

export class BlueprintGraph {
  id: string;
  nodes: Map<string, BlueprintNodeData>;
  connections: Map<string, BlueprintConnectionData>;
  parameters: Record<string, boolean | number>;
  nodeRuntimeState: Map<string, { transitionProgress?: number; isActive?: boolean }>;

  constructor(data: Partial<BlueprintGraphData> = {}) {
    this.id = data.id || generateId();
    this.nodes = new Map();
    this.connections = new Map();
    this.parameters = data.parameters || {};
    this.nodeRuntimeState = new Map();

    if (data.nodes) {
      data.nodes.forEach((n) => this.nodes.set(n.id, JSON.parse(JSON.stringify(n))));
    }
    if (data.connections) {
      data.connections.forEach((c) => this.connections.set(c.id, JSON.parse(JSON.stringify(c))));
    }

    this.ensureOutputNode();
  }

  ensureOutputNode(): void {
    const hasOutput = Array.from(this.nodes.values()).some((n) => n.type === 'output');
    if (!hasOutput) {
      const outputNode: BlueprintNodeData = {
        id: generateId(),
        type: 'output',
        position: { x: 600, y: 200 },
        config: {},
      };
      this.nodes.set(outputNode.id, outputNode);
    }
  }

  toData(): BlueprintGraphData {
    return {
      id: this.id,
      nodes: Array.from(this.nodes.values()),
      connections: Array.from(this.connections.values()),
      parameters: { ...this.parameters },
    };
  }

  addNode(type: BlueprintNodeType, position: { x: number; y: number }): BlueprintNodeData {
    const node: BlueprintNodeData = {
      id: generateId(),
      type,
      position: { ...position },
      config: createDefaultNodeConfig(type),
    };
    this.nodes.set(node.id, node);
    return node;
  }

  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    if (node.type === 'output') return;

    this.nodes.delete(nodeId);

    const toRemove: string[] = [];
    this.connections.forEach((conn, id) => {
      if (conn.fromNodeId === nodeId || conn.toNodeId === nodeId) {
        toRemove.push(id);
      }
    });
    toRemove.forEach((id) => this.connections.delete(id));
  }

  duplicateNode(nodeId: string, offset: { x: number; y: number } = { x: 40, y: 40 }): BlueprintNodeData | null {
    const node = this.nodes.get(nodeId);
    if (!node || node.type === 'output') return null;

    const newNode: BlueprintNodeData = {
      id: generateId(),
      type: node.type,
      position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
      config: JSON.parse(JSON.stringify(node.config)),
    };
    this.nodes.set(newNode.id, newNode);
    return newNode;
  }

  moveNode(nodeId: string, position: { x: number; y: number }): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.position = { ...position };
    }
  }

  addConnection(
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string
  ): BlueprintConnectionData | null {
    if (fromNodeId === toNodeId) return null;

    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);
    if (!fromNode || !toNode) return null;

    const fromPorts = getNodePorts(fromNode.type);
    const toPorts = getNodePorts(toNode.type);

    const fromPort = fromPorts.outputs.find((p) => p.id === fromPortId);
    const toPort = toPorts.inputs.find((p) => p.id === toPortId);
    if (!fromPort || !toPort) return null;
    if (fromPort.type !== toPort.type) return null;

    this.connections.forEach((conn) => {
      if (conn.toNodeId === toNodeId && conn.toPortId === toPortId) {
        this.connections.delete(conn.id);
      }
    });

    const conn: BlueprintConnectionData = {
      id: generateId(),
      fromNodeId,
      fromPortId,
      toNodeId,
      toPortId,
    };
    this.connections.set(conn.id, conn);
    return conn;
  }

  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  disconnectNode(nodeId: string): void {
    const toRemove: string[] = [];
    this.connections.forEach((conn, id) => {
      if (conn.fromNodeId === nodeId || conn.toNodeId === nodeId) {
        toRemove.push(id);
      }
    });
    toRemove.forEach((id) => this.connections.delete(id));
  }

  setNodeConfig(nodeId: string, config: any): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.config = { ...node.config, ...config };
    }
  }

  setParameter(name: string, value: boolean | number): void {
    this.parameters[name] = value;
  }

  getParameter(name: string): boolean | number | undefined {
    return this.parameters[name];
  }

  validate(): BlueprintValidationError[] {
    const errors: BlueprintValidationError[] = [];

    if (this.detectCycle()) {
      errors.push({
        nodeId: '',
        message: 'Graph contains a cycle',
        errorType: 'loop',
      });
    }

    this.nodes.forEach((node) => {
      const ports = getNodePorts(node.type);
      ports.inputs.forEach((port) => {
        const hasConnection = Array.from(this.connections.values()).some(
          (c) => c.toNodeId === node.id && c.toPortId === port.id
        );
        if (!hasConnection && port.type === 'pose' && node.type !== 'output') {
          errors.push({
            nodeId: node.id,
            message: `Required input "${port.name}" not connected`,
            errorType: 'unconnected',
          });
        }
      });
    });

    return errors;
  }

  detectCycle(): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const outgoing = Array.from(this.connections.values()).filter((c) => c.fromNodeId === nodeId);
      for (const conn of outgoing) {
        if (!visited.has(conn.toNodeId)) {
          if (dfs(conn.toNodeId)) return true;
        } else if (recStack.has(conn.toNodeId)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) return true;
      }
    }
    return false;
  }

  topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    this.nodes.forEach((_, id) => inDegree.set(id, 0));

    this.connections.forEach((conn) => {
      inDegree.set(conn.toNodeId, (inDegree.get(conn.toNodeId) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });

    const result: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      this.connections.forEach((conn) => {
        if (conn.fromNodeId === nodeId) {
          const newDegree = (inDegree.get(conn.toNodeId) || 0) - 1;
          inDegree.set(conn.toNodeId, newDegree);
          if (newDegree === 0) queue.push(conn.toNodeId);
        }
      });
    }

    return result;
  }

  evaluate(
    ctx: BlueprintEvaluationContext,
    clips: Map<string, AnimationClip>,
    boneIds: string[]
  ): BonePoseMap {
    const outputs = new Map<string, Map<string, any>>();
    const errors = this.validate();

    if (errors.length > 0) {
      return PoseBlender.emptyPose();
    }

    const order = this.topologicalSort();

    for (const nodeId of order) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;

      const nodeOutputs = this.evaluateNode(node, ctx, clips, boneIds, outputs);
      outputs.set(nodeId, nodeOutputs);
    }

    const outputNode = Array.from(this.nodes.values()).find((n) => n.type === 'output');
    if (!outputNode) return PoseBlender.emptyPose();

    const inputConn = Array.from(this.connections.values()).find(
      (c) => c.toNodeId === outputNode.id && c.toPortId === 'pose'
    );
    if (!inputConn) return PoseBlender.emptyPose();

    const fromOutputs = outputs.get(inputConn.fromNodeId);
    if (!fromOutputs) return PoseBlender.emptyPose();

    return fromOutputs.get('pose') || PoseBlender.emptyPose();
  }

  private evaluateNode(
    node: BlueprintNodeData,
    ctx: BlueprintEvaluationContext,
    clips: Map<string, AnimationClip>,
    boneIds: string[],
    nodeOutputs: Map<string, Map<string, any>>
  ): Map<string, any> {
    const result = new Map<string, any>();
    const getInput = (portId: string): any => {
      const conn = Array.from(this.connections.values()).find(
        (c) => c.toNodeId === node.id && c.toPortId === portId
      );
      if (!conn) return undefined;
      const outs = nodeOutputs.get(conn.fromNodeId);
      return outs?.get(conn.fromPortId);
    };

    switch (node.type) {
      case 'animationSource': {
        const cfg = node.config as AnimationSourceNodeConfig;
        let pose: BonePoseMap = PoseBlender.emptyPose();
        if (cfg.clipId) {
          const clip = clips.get(cfg.clipId);
          if (clip) {
            const fps = clip.fps || 30;
            const frame = (ctx.time * fps) % clip.getTotalFrames();
            cfg.playbackTime = frame / fps;
            pose = clip.evaluate(frame, boneIds);
          }
        }
        result.set('pose', pose);
        break;
      }

      case 'blend': {
        const cfg = node.config as BlendNodeConfig;
        const poseA: BonePoseMap = getInput('poseA') || PoseBlender.emptyPose();
        const poseB: BonePoseMap = getInput('poseB') || PoseBlender.emptyPose();
        const blended = PoseBlender.lerpPoses(poseA, poseB, cfg.weight, cfg.boneMask);
        result.set('pose', blended);
        break;
      }

      case 'condition': {
        const cfg = node.config as ConditionNodeConfig;
        let condValue = getInput('condition');
        if (condValue === undefined) {
          condValue = this.parameters[cfg.parameterName];
        }
        const truePose: BonePoseMap = getInput('truePose') || PoseBlender.emptyPose();
        const falsePose: BonePoseMap = getInput('falsePose') || PoseBlender.emptyPose();
        result.set('pose', condValue ? PoseBlender.clonePose(truePose) : PoseBlender.clonePose(falsePose));
        break;
      }

      case 'additive': {
        const cfg = node.config as AdditiveNodeConfig;
        const basePose: BonePoseMap = getInput('basePose') || PoseBlender.emptyPose();
        const addPose: BonePoseMap = getInput('addPose') || PoseBlender.emptyPose();
        const combined = PoseBlender.addPoses(basePose, addPose, cfg.strength);
        result.set('pose', combined);
        break;
      }

      case 'transition': {
        const cfg = node.config as TransitionNodeConfig;
        const poseA: BonePoseMap = getInput('poseA') || PoseBlender.emptyPose();
        const poseB: BonePoseMap = getInput('poseB') || PoseBlender.emptyPose();
        const trigger = getInput('trigger');

        let runtime = this.nodeRuntimeState.get(node.id);
        if (!runtime) {
          runtime = { transitionProgress: 0, isActive: false };
          this.nodeRuntimeState.set(node.id, runtime);
        }

        if (trigger && !runtime.isActive) {
          runtime.isActive = true;
          runtime.transitionProgress = 0;
        }

        if (runtime.isActive) {
          runtime.transitionProgress = (runtime.transitionProgress || 0) + ctx.deltaTime / Math.max(0.001, cfg.duration);
          if (runtime.transitionProgress >= 1) {
            runtime.transitionProgress = 1;
            runtime.isActive = false;
          }
        }

        const t = PoseBlender.applyCurve(runtime.transitionProgress || 0, cfg.curveType);
        result.set('pose', PoseBlender.lerpPoses(poseA, poseB, t));
        break;
      }

      case 'output': {
        const pose = getInput('pose');
        result.set('pose', pose || PoseBlender.emptyPose());
        break;
      }
    }

    return result;
  }
}
