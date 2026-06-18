import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { BlueprintGraph } from '@/core/blueprint/BlueprintGraph';
import type { BlueprintGraphData, BlueprintNodeType, BlueprintNodeData } from '@/types';
import type { BonePoseMap } from '@/core/blueprint/PoseBlender';
import { useSkeletonStore } from './useSkeletonStore';
import { useAnimationStore } from './useAnimationStore';
import { generateId } from '@/utils/math';

export const useBlueprintStore = defineStore('blueprint', () => {
  const skeletonStore = useSkeletonStore();
  const animationStore = useAnimationStore();

  const graph = ref<BlueprintGraph>(new BlueprintGraph());
  const graphVersion = ref(0);
  const selectedNodeId = ref<string | null>(null);
  const useBlueprint = ref(false);
  const lastEvaluatedPose = ref<BonePoseMap>(new Map());
  const lastEvalTime = ref(0);

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

  function init() {
    graph.value = new BlueprintGraph();
    selectedNodeId.value = null;
    markDirty();
  }

  function setUseBlueprint(enabled: boolean) {
    useBlueprint.value = enabled;
  }

  function addNode(type: BlueprintNodeType, position: { x: number; y: number }): BlueprintNodeData {
    const node = graph.value.addNode(type, position);
    markDirty();
    return node;
  }

  function removeNode(nodeId: string) {
    graph.value.removeNode(nodeId);
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null;
    }
    markDirty();
  }

  function duplicateNode(nodeId: string): BlueprintNodeData | null {
    const node = graph.value.duplicateNode(nodeId);
    if (node) {
      markDirty();
    }
    return node;
  }

  function moveNode(nodeId: string, position: { x: number; y: number }) {
    graph.value.moveNode(nodeId, position);
    markDirty();
  }

  function addConnection(
    fromNodeId: string,
    fromPortId: string,
    toNodeId: string,
    toPortId: string
  ) {
    const result = graph.value.addConnection(fromNodeId, fromPortId, toNodeId, toPortId);
    if (result) {
      markDirty();
    }
    return result;
  }

  function removeConnection(connectionId: string) {
    graph.value.removeConnection(connectionId);
    markDirty();
  }

  function disconnectNode(nodeId: string) {
    graph.value.disconnectNode(nodeId);
    markDirty();
  }

  function setNodeConfig(nodeId: string, config: any) {
    graph.value.setNodeConfig(nodeId, config);
    markDirty();
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId;
  }

  function setParameter(name: string, value: boolean | number) {
    graph.value.setParameter(name, value);
    markDirty();
  }

  function loadData(data: BlueprintGraphData) {
    graph.value = new BlueprintGraph(data);
    selectedNodeId.value = null;
    markDirty();
  }

  function toData(): BlueprintGraphData {
    return graph.value.toData();
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

    const pose = graph.value.evaluate(ctx, clips, boneIds);
    lastEvaluatedPose.value = pose;
    lastEvalTime.value = time;
    return pose;
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
    applyPoseToSkeleton(pose);
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
    init,
    setUseBlueprint,
    addNode,
    removeNode,
    duplicateNode,
    moveNode,
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
  };
});
