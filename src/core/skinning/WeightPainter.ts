import * as THREE from 'three';
import type { MeshData, VertexData, VertexWeight, WeightPaintConfig } from '@/types';
import { normalizeWeights } from '@/utils/math';
import { MAX_WEIGHT_BONES } from '@/utils/constants';

export class WeightPainter {
  meshData: MeshData;
  config: WeightPaintConfig;
  selectedBoneId: string | null;
  adjacencyList: number[][];

  constructor(meshData: MeshData) {
    this.meshData = meshData;
    this.config = {
      brushSize: 0.5,
      brushStrength: 0.5,
      brushFalloff: 0.5,
      mode: 'add',
    };
    this.selectedBoneId = null;
    this.adjacencyList = this.buildAdjacencyList();
  }

  setConfig(config: Partial<WeightPaintConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setSelectedBone(boneId: string | null): void {
    this.selectedBoneId = boneId;
  }

  setMeshData(meshData: MeshData): void {
    this.meshData = meshData;
    this.adjacencyList = this.buildAdjacencyList();
  }

  buildAdjacencyList(): number[][] {
    const adjacency: number[][] = this.meshData.vertices.map(() => []);

    this.meshData.faces.forEach((face) => {
      const [i0, i1, i2] = face;
      
      if (!adjacency[i0].includes(i1)) adjacency[i0].push(i1);
      if (!adjacency[i0].includes(i2)) adjacency[i0].push(i2);
      if (!adjacency[i1].includes(i0)) adjacency[i1].push(i0);
      if (!adjacency[i1].includes(i2)) adjacency[i1].push(i2);
      if (!adjacency[i2].includes(i0)) adjacency[i2].push(i0);
      if (!adjacency[i2].includes(i1)) adjacency[i2].push(i1);
    });

    return adjacency;
  }

  paint(
    worldPosition: THREE.Vector3,
    camera: THREE.Camera,
    meshMatrix: THREE.Matrix4
  ): number[] {
    if (!this.selectedBoneId) return [];

    const paintedIndices: number[] = [];
    const inverseMatrix = meshMatrix.clone().invert();
    const localPosition = worldPosition.clone().applyMatrix4(inverseMatrix);

    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3()
      .subVectors(worldPosition, camera.position)
      .normalize();
    raycaster.set(camera.position, direction);

    const vertices = this.meshData.vertices;
    const hitIndices = this.findVerticesNearPoint(
      localPosition,
      this.config.brushSize
    );

    hitIndices.forEach((vertexIndex) => {
      const vertex = vertices[vertexIndex];
      const vertexPos = new THREE.Vector3(...vertex.position);
      const distance = vertexPos.distanceTo(localPosition);

      const falloff = this.calculateFalloff(distance);
      if (falloff <= 0) return;

      this.applyBrushToVertex(vertexIndex, falloff);
      paintedIndices.push(vertexIndex);
    });

    return paintedIndices;
  }

  findVerticesNearPoint(point: THREE.Vector3, radius: number): number[] {
    const indices: number[] = [];
    const radiusSq = radius * radius;

    this.meshData.vertices.forEach((vertex, index) => {
      const vertexPos = new THREE.Vector3(...vertex.position);
      const distanceSq = vertexPos.distanceToSquared(point);
      if (distanceSq <= radiusSq) {
        indices.push(index);
      }
    });

    return indices;
  }

  calculateFalloff(distance: number): number {
    if (distance > this.config.brushSize) return 0;

    const normalizedDist = distance / this.config.brushSize;
    const falloff = this.config.brushFalloff;

    if (normalizedDist < falloff) {
      return 1;
    } else {
      const t = (normalizedDist - falloff) / (1 - falloff);
      return 1 - t * t * (3 - 2 * t);
    }
  }

  applyBrushToVertex(vertexIndex: number, falloff: number): void {
    if (!this.selectedBoneId) return;

    const vertex = this.meshData.vertices[vertexIndex];
    const delta = this.config.brushStrength * falloff;

    if (this.config.mode === 'add') {
      this.addWeight(vertex, this.selectedBoneId, delta);
    } else if (this.config.mode === 'remove') {
      this.removeWeight(vertex, this.selectedBoneId, delta);
    } else if (this.config.mode === 'smooth') {
      this.smoothVertexWeights(vertexIndex);
    }

    this.normalizeVertexWeights(vertex);
  }

  addWeight(vertex: VertexData, boneId: string, amount: number): void {
    const existingWeight = vertex.weights.find((w) => w.boneId === boneId);
    
    if (existingWeight) {
      existingWeight.weight = Math.min(1, existingWeight.weight + amount);
    } else {
      vertex.weights.push({ boneId, weight: amount });
    }
  }

  removeWeight(vertex: VertexData, boneId: string, amount: number): void {
    const existingWeight = vertex.weights.find((w) => w.boneId === boneId);
    
    if (existingWeight) {
      existingWeight.weight = Math.max(0, existingWeight.weight - amount);
      if (existingWeight.weight <= 0.001) {
        vertex.weights = vertex.weights.filter((w) => w.boneId !== boneId);
      }
    }
  }

  smoothVertexWeights(vertexIndex: number): void {
    const neighbors = this.adjacencyList[vertexIndex];
    if (neighbors.length === 0) return;

    const vertex = this.meshData.vertices[vertexIndex];
    const averageWeights = new Map<string, number>();
    const totalNeighbors = neighbors.length + 1;

    vertex.weights.forEach((w) => {
      averageWeights.set(w.boneId, w.weight * (1 - this.config.brushStrength));
    });

    neighbors.forEach((neighborIndex) => {
      const neighbor = this.meshData.vertices[neighborIndex];
      neighbor.weights.forEach((w) => {
        const current = averageWeights.get(w.boneId) || 0;
        averageWeights.set(
          w.boneId,
          current + (w.weight * this.config.brushStrength) / neighbors.length
        );
      });
    });

    vertex.weights = [];
    averageWeights.forEach((value, boneId) => {
      if (value > 0.001) {
        vertex.weights.push({ boneId, weight: value });
      }
    });
  }

  normalizeVertexWeights(vertex: VertexData): void {
    const total = vertex.weights.reduce((sum, w) => sum + w.weight, 0);
    
    if (total > 0) {
      vertex.weights.forEach((w) => {
        w.weight /= total;
      });
    }

    vertex.weights.sort((a, b) => b.weight - a.weight);
    vertex.weights = vertex.weights.slice(0, MAX_WEIGHT_BONES);

    const newTotal = vertex.weights.reduce((sum, w) => sum + w.weight, 0);
    if (newTotal > 0) {
      vertex.weights.forEach((w) => {
        w.weight /= newTotal;
      });
    }
  }

  floodFill(boneId: string): void {
    this.meshData.vertices.forEach((vertex) => {
      vertex.weights = [{ boneId, weight: 1 }];
    });
  }

  clearWeights(): void {
    this.meshData.vertices.forEach((vertex) => {
      vertex.weights = [];
    });
  }

  getVertexColor(vertexIndex: number): THREE.Color {
    const vertex = this.meshData.vertices[vertexIndex];
    
    if (!this.selectedBoneId) {
      const totalWeight = vertex.weights.reduce((sum, w) => sum + w.weight, 0);
      return new THREE.Color().setHSL(0.66 * (1 - totalWeight), 1, 0.5);
    }

    const weight = vertex.weights.find((w) => w.boneId === this.selectedBoneId);
    const value = weight ? weight.weight : 0;
    
    return new THREE.Color().setHSL(0.66 * (1 - value), 1, 0.5);
  }

  getMeshData(): MeshData {
    return { ...this.meshData };
  }
}
