import { computed } from 'vue';
import * as THREE from 'three';
import { useSkeletonStore } from '@/stores/useSkeletonStore';
import type { WeightPaintConfig, MeshData } from '@/types';

export function useSkinning() {
  const store = useSkeletonStore();

  const meshData = computed(() => store.meshData);
  const weightPainter = computed(() => store.weightPainter);
  const weightPaintConfig = computed(() => store.weightPaintConfig);
  const hasMesh = computed(() => !!store.meshData);
  const hasWeights = computed(() => {
    if (!store.meshData) return false;
    return store.meshData.vertices.some((v) => v.weights.length > 0);
  });

  function setMesh(mesh: MeshData | null) {
    store.setMeshData(mesh);
  }

  function calculateWeights() {
    store.calculateAutoWeights();
  }

  function smoothMeshWeights(iterations: number = 1) {
    store.smoothWeights(iterations);
  }

  function paintWeightsAtPoint(
    worldPosition: THREE.Vector3,
    camera: THREE.Camera,
    meshMatrix: THREE.Matrix4
  ): number[] {
    return store.paintWeights(worldPosition, camera, meshMatrix);
  }

  function updateWeightPaintConfig(config: Partial<WeightPaintConfig>) {
    store.setWeightPaintConfig(config);
  }

  function setPaintMode(mode: 'add' | 'remove' | 'smooth') {
    store.setWeightPaintConfig({ mode });
  }

  function setBrushSize(size: number) {
    store.setWeightPaintConfig({ brushSize: size });
  }

  function setBrushStrength(strength: number) {
    store.setWeightPaintConfig({ brushStrength: strength });
  }

  function setBrushFalloff(falloff: number) {
    store.setWeightPaintConfig({ brushFalloff: falloff });
  }

  function selectPaintBone(boneId: string | null) {
    store.setWeightPaintBone(boneId);
  }

  function getVertexWeightColor(vertexIndex: number, boneId: string): string {
    if (!store.meshData) return '#0000ff';
    const vertex = store.meshData.vertices[vertexIndex];
    if (!vertex) return '#0000ff';

    const weightEntry = vertex.weights.find((w) => w.boneId === boneId);
    const weight = weightEntry?.weight || 0;

    const hue = (1 - weight) * 240;
    return `hsl(${hue}, 100%, 50%)`;
  }

  function getVertexTotalWeight(vertexIndex: number): number {
    if (!store.meshData) return 0;
    const vertex = store.meshData.vertices[vertexIndex];
    if (!vertex) return 0;
    return vertex.weights.reduce((sum, w) => sum + w.weight, 0);
  }

  function clearVertexWeights(vertexIndex: number) {
    if (!store.meshData) return;
    store.meshData.vertices[vertexIndex].weights = [];
  }

  function clearAllWeights() {
    if (!store.meshData) return;
    store.meshData.vertices.forEach((v) => {
      v.weights = [];
    });
  }

  function normalizeVertexWeights(vertexIndex: number) {
    if (!store.meshData) return;
    const vertex = store.meshData.vertices[vertexIndex];
    if (!vertex || vertex.weights.length === 0) return;

    const total = vertex.weights.reduce((sum, w) => sum + w.weight, 0);
    if (total > 0) {
      vertex.weights.forEach((w) => {
        w.weight /= total;
      });
    }
  }

  function limitBoneInfluences(vertexIndex: number, maxBones: number = 4) {
    if (!store.meshData) return;
    const vertex = store.meshData.vertices[vertexIndex];
    if (!vertex || vertex.weights.length <= maxBones) return;

    vertex.weights.sort((a, b) => b.weight - a.weight);
    vertex.weights = vertex.weights.slice(0, maxBones);

    const total = vertex.weights.reduce((sum, w) => sum + w.weight, 0);
    if (total > 0) {
      vertex.weights.forEach((w) => {
        w.weight /= total;
      });
    }
  }

  return {
    meshData,
    weightPainter,
    weightPaintConfig,
    hasMesh,
    hasWeights,
    setMesh,
    calculateWeights,
    smoothMeshWeights,
    paintWeightsAtPoint,
    updateWeightPaintConfig,
    setPaintMode,
    setBrushSize,
    setBrushStrength,
    setBrushFalloff,
    selectPaintBone,
    getVertexWeightColor,
    getVertexTotalWeight,
    clearVertexWeights,
    clearAllWeights,
    normalizeVertexWeights,
    limitBoneInfluences,
  };
}
