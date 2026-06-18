import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as THREE from 'three';
import { BlueprintGraph } from '@/core/blueprint/BlueprintGraph';
import type {
  BlueprintGraphData,
  BlueprintNodeType,
  BlueprintNodeData,
  NodeEvaluationResult,
  BlueprintPerformanceFrame,
  BlueprintUndoAction,
  BlueprintUndoActionType,
} from '@/types';
import type { BonePoseMap } from '@/core/blueprint/PoseBlender';
import { useSkeletonStore } from './useSkeletonStore';
import { useAnimationStore } from './useAnimationStore';

const MAX_UNDO_HISTORY = 50;
const PERF_HISTORY_SIZE = 60;
const NODE_TIME_WARNING_THRESHOLD_US = 500;

export const useBlueprintStore = defineStore('blueprint', () => {
  const skeletonStore = useSkeletonStore();
  const animationStore = useAnimationStore();

  const graph = ref<BlueprintGraph>(new BlueprintGraph());
  const graphVersion = ref(0);
  const selectedNodeId = ref<string | null>(null);
  const useBlueprint = ref(false);
  const lastEvaluatedPose = ref<BonePoseMap>(new Map());
  const lastEvalTime = ref(0);

  const breakpoints = ref<Set<string>>(new Set());
  const isPaused = ref(false);
  const pausedAtNodeId = ref<string | null>(null);
  const breakpointEvalIndex = ref(0);
  const breakpointEvalOutputs = ref<Map<string, Map<string, any>> | null>(null);
  const breakpointNodeResults = ref<Map<string, NodeEvaluationResult>>(new Map());
  const breakpointEvalOrder = ref<string[]>([]);

  const nodeResults = ref<Map<string, NodeEvaluationResult>>(new Map());
  const performanceFrames = ref<BlueprintPerformanceFrame[]>([]);
  const showProfiler = ref(false);

  const undoStack = ref<BlueprintUndoAction[]>([]);
  const redoStack = ref<BlueprintUndoAction[]>([]);

  function markDirty() {
    graphVersion.value++;
  }

  const nodes = computed(() => {
    graphVersion.value;
    return Array.from(graph.value.nodes.values());
  });

  const connections = computed(() => {
    graphVersion.value;
    return Array.from(graph.value.connections.values());
  });

  const validationErrors = computed(() => {
    graphVersion.value;
    return graph.value.validate();
  });

  const parameters = computed(() => {
    graphVersion.value;
    return { ...graph.value.parameters };
  });

  const nodeEvaluationTimes = computed(() => {
    const map = new Map<string, number>();
    nodeResults.value.forEach((result, nodeId) => {
      map.set(nodeId, result.evaluationTimeUs);
    });
    return map;
  });

  const warningNodes = computed(() => {
    const set = new Set<string>();
    nodeResults.value.forEach((result, nodeId) => {
      if (result.evaluationTimeUs > NODE_TIME_WARNING_THRESHOLD_US) {
        set.add(nodeId);
      }
    });
    return set;
  });

  function init() {
    graph.value = new BlueprintGraph();
    selectedNodeId.value = null;
    breakpoints.value = new Set();
    isPaused.value = false;
    pausedAtNodeId.value = null;
    breakpointEvalIndex.value = 0;
    breakpointEvalOutputs.value = null;
    breakpointNodeResults.value = new Map();
    nodeResults.value = new Map();
    performanceFrames.value = [];
    undoStack.value = [];
    redoStack.value = [];
    markDirty();
  }

  function setUseBlueprint(enabled: boolean) {
    useBlueprint.value = enabled;
  }

  function captureSnapshot(): BlueprintGraphData {
    return graph.value.toData();
  }

  function pushUndo(type: BlueprintUndoActionType) {
    const afterSnapshot = captureSnapshot();
    if (undoStack.value.length > 0) {
      const lastAction = undoStack.value[undoStack.value.length - 1];
      lastAction.after = afterSnapshot;
    }
    redoStack.value = [];
    if (undoStack.value.length >= MAX_UNDO_HISTORY) {
      undoStack.value.shift();
    }
  }

  function undo() {
    if (undoStack.value.length === 0) return;
    const action = undoStack.value.pop()!;
    graph.value = new BlueprintGraph(action.before);
    redoStack.value.push(action);
    markDirty();
  }

  function redo() {
    if (redoStack.value.length === 0) return;
    const action = redoStack.value.pop()!;
    graph.value = new BlueprintGraph(action.after);
    undoStack.value.push(action);
    markDirty();
  }

  function canUndo(): boolean {
    return undoStack.value.length > 0;
  }

  function canRedo(): boolean {
    return redoStack.value.length > 0;
  }

  function addNode(type: BlueprintNodeType, position: { x: number; y: number }): BlueprintNodeData {
    const beforeSnapshot = captureSnapshot();
    const node = graph.value.addNode(type, position);
    undoStack.value.push({
      type: 'addNode',
      timestamp: Date.now(),
      before: beforeSnapshot,
      after: captureSnapshot(),
    });
    if (undoStack.value.length > MAX_UNDO_HISTORY) {
      undoStack.value.shift();
    }
    redoStack.value = [];
    markDirty();
    return node;
  }

  function removeNode(nodeId: string) {
    const beforeSnapshot = captureSnapshot();
    graph.value.removeNode(nodeId);
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null;
    }
    if (breakpoints.value.has(nodeId)) {
      breakpoints.value.delete(nodeId);
    }
    undoStack.value.push({
      type: 'removeNode',
      timestamp: Date.now(),
      before: beforeSnapshot,
      after: captureSnapshot(),
    });
    if (undoStack.value.length > MAX_UNDO_HISTORY) {
      undoStack.value.shift();
    }
    redoStack.value = [];
    markDirty();
  }

  function duplicateNode(nodeId: string): BlueprintNodeData | null {
    const beforeSnapshot = captureSnapshot();
    const node = graph.value.duplicateNode(nodeId);
    if (node) {
      undoStack.value.push({
        type: 'addNode',
        timestamp: Date.now(),
        before: beforeSnapshot,
        after: captureSnapshot(),
      });
      if (undoStack.value.length > MAX_UNDO_HISTORY) {
        undoStack.value.shift();
      }
      redoStack.value = [];
      markDirty();
    }
    return node;
  }

  function moveNode(nodeId: string, position: { x: number; y: number }) {
    const beforeSnapshot = captureSnapshot();
    graph.value.moveNode(nodeId, position);
    undoStack.value.push({
      type: 'moveNode',
      timestamp: Date.now(),
      before: beforeSnapshot,
      after: captureSnapshot(),
    });
    if (undoStack.value.length > MAX_UNDO_HISTORY) {
      undoStack.value.shift();
    }
    redoStack.value = [];
    markDirty();
  }

  function moveNodeNoUndo(nodeId: string, position: { x: number; y: number }) {
    graph.value.moveNode(nodeId, position);
    markDirty();
  }

  function commitMoveUndo(nodeId: string, beforePos: { x: number; y: number }) {
    const beforeData = captureSnapshot();
    const node = graph.value.nodes.get(nodeId);
    if (!node) return;
    beforeData.nodes = beforeData.nodes.map((n) =>
      n.id === nodeId ? { ...n, position: beforePos } : n
    );
    undoStack.value.push({
      type: 'moveNode',
      timestamp: Date.now(),
      before: beforeData,
      after: captureSnapshot(),
    });
    if (undoStack.value.length > MAX_UNDO_HISTORY) {
      undoStack.value.shift();
    }
    redoStack.value = [];
  }

  function addConnection(
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string
  ) {
    const beforeSnapshot = captureSnapshot();
    const result = graph.value.addConnection(fromNodeId, fromPortId, toNodeId, toPortId);
    if (result) {
      undoStack.value.push({
        type: 'addConnection',
        timestamp: Date.now(),
        before: beforeSnapshot,
        after: captureSnapshot(),
      });
      if (undoStack.value.length > MAX_UNDO_HISTORY) {
        undoStack.value.shift();
      }
      redoStack.value = [];
      markDirty();
    }
    return result;
  }

  function removeConnection(connectionId: string) {
    const beforeSnapshot = captureSnapshot();
    graph.value.removeConnection(connectionId);
    undoStack.value.push({
      type: 'removeConnection',
      timestamp: Date.now(),
      before: beforeSnapshot,
      after: captureSnapshot(),
    });
    if (undoStack.value.length > MAX_UNDO_HISTORY) {
      undoStack.value.shift();
    }
    redoStack.value = [];
    markDirty();
  }

  function disconnectNode(nodeId: string) {
    const beforeSnapshot = captureSnapshot();
    graph.value.disconnectNode(nodeId);
    undoStack.value.push({
      type: 'disconnectNode',
      timestamp: Date.now(),
      before: beforeSnapshot,
      after: captureSnapshot(),
    });
    if (undoStack.value.length > MAX_UNDO_HISTORY) {
      undoStack.value.shift();
    }
    redoStack.value = [];
    markDirty();
  }

  function setNodeConfig(nodeId: string, config: any) {
    const beforeSnapshot = captureSnapshot();
    graph.value.setNodeConfig(nodeId, config);
    undoStack.value.push({
      type: 'setNodeConfig',
      timestamp: Date.now(),
      before: beforeSnapshot,
      after: captureSnapshot(),
    });
    if (undoStack.value.length > MAX_UNDO_HISTORY) {
      undoStack.value.shift();
    }
    redoStack.value = [];
    markDirty();
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId;
  }

  function setParameter(name: string, value: boolean | number) {
    const beforeSnapshot = captureSnapshot();
    graph.value.setParameter(name, value);
    undoStack.value.push({
      type: 'setParameter',
      timestamp: Date.now(),
      before: beforeSnapshot,
      after: captureSnapshot(),
    });
    if (undoStack.value.length > MAX_UNDO_HISTORY) {
      undoStack.value.shift();
    }
    redoStack.value = [];
    markDirty();
  }

  function loadData(data: BlueprintGraphData) {
    graph.value = new BlueprintGraph(data);
    selectedNodeId.value = null;
    undoStack.value = [];
    redoStack.value = [];
    markDirty();
  }

  function toData(): BlueprintGraphData {
    return graph.value.toData();
  }

  function toggleBreakpoint(nodeId: string) {
    if (breakpoints.value.has(nodeId)) {
      breakpoints.value.delete(nodeId);
    } else {
      breakpoints.value.add(nodeId);
    }
    breakpoints.value = new Set(breakpoints.value);
  }

  function hasBreakpoint(nodeId: string): boolean {
    return breakpoints.value.has(nodeId);
  }

  function continueBreakpoint() {
    isPaused.value = false;
    pausedAtNodeId.value = null;
    breakpointEvalOutputs.value = null;
  }

  function stepBreakpoint() {
    isPaused.value = false;
  }

  function evaluate(time: number, deltaTime: number): BonePoseMap {
    if (!useBlueprint.value) return new Map();

    const boneIds = Array.from(skeletonStore.skeleton.bones.keys());
    const clips = new Map(animationStore.allClips.map((c) => [c.id, c]));

    const ctx = {
      time,
      deltaTime,
      skeletonBoneIds: boneIds,
    };

    if (isPaused.value) {
      return lastEvaluatedPose.value;
    }

    if (breakpoints.value.size > 0) {
      const bpResult = graph.value.evaluateWithBreakpoints(
        ctx,
        clips,
        boneIds,
        breakpoints.value,
        breakpointEvalIndex.value,
        breakpointEvalOutputs.value
      );

      if (bpResult.pausedAtNodeId) {
        isPaused.value = true;
        pausedAtNodeId.value = bpResult.pausedAtNodeId;
        breakpointEvalIndex.value = bpResult.currentEvalIndex;
        breakpointEvalOutputs.value = bpResult.outputs;
        breakpointNodeResults.value = bpResult.nodeResults;
        breakpointEvalOrder.value = bpResult.evaluationOrder;
        nodeResults.value = bpResult.nodeResults;

        const outputNode = Array.from(graph.value.nodes.values()).find((n) => n.type === 'output');
        if (outputNode) {
          const inputConn = Array.from(graph.value.connections.values()).find(
            (c) => c.toNodeId === outputNode.id && c.toPortId === 'pose'
          );
          if (inputConn) {
            const fromOutputs = bpResult.outputs.get(inputConn.fromNodeId);
            if (fromOutputs) {
              const pose = fromOutputs.get('pose') || new Map();
              lastEvaluatedPose.value = pose;
              lastEvalTime.value = time;
              return pose;
            }
          }
        }

        lastEvaluatedPose.value = new Map();
        lastEvalTime.value = time;
        return new Map();
      }

      breakpointEvalIndex.value = 0;
      breakpointEvalOutputs.value = null;
      nodeResults.value = bpResult.nodeResults;
      breakpointNodeResults.value = bpResult.nodeResults;

      const outputNode = Array.from(graph.value.nodes.values()).find((n) => n.type === 'output');
      if (outputNode) {
        const inputConn = Array.from(graph.value.connections.values()).find(
          (c) => c.toNodeId === outputNode.id && c.toPortId === 'pose'
        );
        if (inputConn) {
          const fromOutputs = bpResult.outputs.get(inputConn.fromNodeId);
          const pose = fromOutputs?.get('pose') || new Map();
          lastEvaluatedPose.value = pose;
          lastEvalTime.value = time;
          return pose;
        }
      }

      lastEvaluatedPose.value = new Map();
      lastEvalTime.value = time;
      return new Map();
    }

    const result = graph.value.evaluateDetailed(ctx, clips, boneIds);
    nodeResults.value = result.nodeResults;
    lastEvaluatedPose.value = result.finalPose as BonePoseMap;
    lastEvalTime.value = time;

    const frame: BlueprintPerformanceFrame = {
      timestamp: Date.now(),
      evaluationTimeMs: result.totalEvaluationTimeMs,
      nodeCount: graph.value.nodes.size,
      activeConnectionCount: result.activeConnectionCount,
      evaluationOrder: result.evaluationOrder,
      nodeTimings: new Map(
        Array.from(result.nodeResults.values()).map((r) => [r.nodeId, r.evaluationTimeUs])
      ),
    };
    performanceFrames.value.push(frame);
    if (performanceFrames.value.length > PERF_HISTORY_SIZE) {
      performanceFrames.value.shift();
    }

    return result.finalPose as BonePoseMap;
  }

  function applyPoseToSkeleton(pose: BonePoseMap) {
    pose.forEach((rotation, boneId) => {
      skeletonStore.skeleton.setBoneRotation(boneId, rotation);
    });
    skeletonStore.skeleton.updateBoneMatrices();
  }

  function updateAndApply(time: number, deltaTime: number) {
    if (!useBlueprint.value) return;
    const pose = evaluate(time, deltaTime);
    if (!isPaused.value) {
      applyPoseToSkeleton(pose);
    }
  }

  function getNodeResult(nodeId: string): NodeEvaluationResult | undefined {
    return nodeResults.value.get(nodeId);
  }

  function getNodePoseData(nodeId: string): Map<string, THREE.Euler> | null {
    const result = nodeResults.value.get(nodeId);
    if (!result) return null;
    const poseOutput = result.outputs.get('pose');
    return poseOutput || null;
  }

  init();

  return {
    graph,
    selectedNodeId,
    useBlueprint,
    lastEvaluatedPose,
    nodes,
    connections,
    validationErrors,
    parameters,
    nodeResults,
    nodeEvaluationTimes,
    warningNodes,
    breakpoints,
    isPaused,
    pausedAtNodeId,
    breakpointNodeResults,
    breakpointEvalOrder,
    performanceFrames,
    showProfiler,
    init,
    setUseBlueprint,
    addNode,
    removeNode,
    duplicateNode,
    moveNode,
    moveNodeNoUndo,
    commitMoveUndo,
    addConnection,
    removeConnection,
    disconnectNode,
    setNodeConfig,
    selectNode,
    setParameter,
    loadData,
    toData,
    evaluate,
    applyPoseToSkeleton,
    updateAndApply,
    markDirty,
    toggleBreakpoint,
    hasBreakpoint,
    continueBreakpoint,
    stepBreakpoint,
    undo,
    redo,
    canUndo,
    canRedo,
    getNodeResult,
    getNodePoseData,
  };
});
