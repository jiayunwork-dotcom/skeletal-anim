import * as THREE from 'three';
import { Skeleton } from '../skeleton/Skeleton';
import type { MeshData, VertexData, VertexWeight } from '@/types';
import {
  distancePointToSegment,
  heatDiffusionWeight,
  normalizeWeights,
  generateId,
} from '@/utils/math';
import { MAX_WEIGHT_BONES, WEIGHT_SIGMA } from '@/utils/constants';
import { getBoneWorldPosition } from '@/utils/threeHelpers';

export class WeightCalculator {
  skeleton: Skeleton;
  sigma: number;
  maxInfluences: number;

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;
    this.sigma = WEIGHT_SIGMA;
    this.maxInfluences = MAX_WEIGHT_BONES;
  }

  setSigma(sigma: number): void {
    this.sigma = Math.max(0.01, sigma);
  }

  setMaxInfluences(max: number): void {
    this.maxInfluences = Math.max(1, Math.min(8, max));
  }

  calculateWeights(meshData: MeshData): MeshData {
    const bones = this.skeleton.getAllBones();
    const bonePositions = new Map<string, THREE.Vector3>();
    const boneEndPositions = new Map<string, THREE.Vector3>();

    bones.forEach((bone) => {
      bonePositions.set(bone.id, bone.getWorldPosition(this.skeleton.bones));
      boneEndPositions.set(bone.id, bone.getEndPosition(this.skeleton.bones));
    });

    const newVertices: VertexData[] = meshData.vertices.map((vertex) => {
      const vertexPos = new THREE.Vector3(...vertex.position);
      const weights: VertexWeight[] = [];
      const weightValues: number[] = [];
      const boneIds: string[] = [];

      bones.forEach((bone) => {
        const start = bonePositions.get(bone.id);
        const end = boneEndPositions.get(bone.id);
        if (!start || !end) return;

        const distance = distancePointToSegment(vertexPos, start, end);
        const weight = heatDiffusionWeight(distance, this.sigma);
        weightValues.push(weight);
        boneIds.push(bone.id);
      });

      const normalizedWeights = normalizeWeights(weightValues, this.maxInfluences);

      normalizedWeights.forEach((weight, index) => {
        if (weight > 0) {
          weights.push({
            boneId: boneIds[index],
            weight: weight,
          });
        }
      });

      weights.sort((a, b) => b.weight - a.weight);

      return {
        ...vertex,
        weights,
      };
    });

    return {
      ...meshData,
      vertices: newVertices,
    };
  }

  recalculateVertexWeights(
    vertexData: VertexData,
    vertexIndex: number,
    meshData: MeshData
  ): VertexData {
    const vertexPos = new THREE.Vector3(...vertexData.position);
    const bones = this.skeleton.getAllBones();
    const weights: VertexWeight[] = [];
    const weightValues: number[] = [];
    const boneIds: string[] = [];

    bones.forEach((bone) => {
      const start = bone.getWorldPosition(this.skeleton.bones);
      const end = bone.getEndPosition(this.skeleton.bones);
      const distance = distancePointToSegment(vertexPos, start, end);
      const weight = heatDiffusionWeight(distance, this.sigma);
      weightValues.push(weight);
      boneIds.push(bone.id);
    });

    const normalizedWeights = normalizeWeights(weightValues, this.maxInfluences);

    normalizedWeights.forEach((weight, index) => {
      if (weight > 0) {
        weights.push({
          boneId: boneIds[index],
          weight: weight,
        });
      }
    });

    weights.sort((a, b) => b.weight - a.weight);

    return {
      ...vertexData,
      weights,
    };
  }

  smoothWeights(meshData: MeshData, iterations: number = 1): MeshData {
    const adjacency = this.buildAdjacencyList(meshData);
    let result = JSON.parse(JSON.stringify(meshData)) as MeshData;

    for (let iter = 0; iter < iterations; iter++) {
      const newVertices = result.vertices.map((vertex, index) => {
        const neighbors = adjacency[index];
        if (neighbors.length === 0) return vertex;

        const allWeights = new Map<string, number>();
        const totalNeighbors = neighbors.length + 1;

        vertex.weights.forEach((w) => {
          allWeights.set(w.boneId, w.weight / totalNeighbors);
        });

        neighbors.forEach((neighborIndex) => {
          const neighbor = result.vertices[neighborIndex];
          neighbor.weights.forEach((w) => {
            const current = allWeights.get(w.boneId) || 0;
            allWeights.set(w.boneId, current + w.weight / totalNeighbors);
          });
        });

        const weights: VertexWeight[] = [];
        const weightValues: number[] = [];
        const boneIds: string[] = [];

        allWeights.forEach((value, boneId) => {
          weights.push({ boneId, weight: value });
          weightValues.push(value);
          boneIds.push(boneId);
        });

        const normalized = normalizeWeights(weightValues, this.maxInfluences);
        const finalWeights: VertexWeight[] = [];

        normalized.forEach((value, index) => {
          if (value > 0) {
            finalWeights.push({
              boneId: boneIds[index],
              weight: value,
            });
          }
        });

        finalWeights.sort((a, b) => b.weight - a.weight);

        return {
          ...vertex,
          weights: finalWeights,
        };
      });

      result = { ...result, vertices: newVertices };
    }

    return result;
  }

  buildAdjacencyList(meshData: MeshData): number[][] {
    const adjacency: number[][] = meshData.vertices.map(() => []);

    meshData.faces.forEach((face) => {
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

  normalizeMeshWeights(meshData: MeshData): MeshData {
    const newVertices = meshData.vertices.map((vertex) => {
      if (vertex.weights.length === 0) return vertex;

      const totalWeight = vertex.weights.reduce((sum, w) => sum + w.weight, 0);
      if (totalWeight === 0) return vertex;

      const weights = vertex.weights
        .map((w) => ({
          ...w,
          value: w.weight / totalWeight,
        }))
        .filter((w) => w.weight > 0.001)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, this.maxInfluences);

      const newTotal = weights.reduce((sum, w) => sum + w.weight, 0);
      weights.forEach((w) => {
        w.weight /= newTotal;
      });

      return {
        ...vertex,
        weights,
      };
    });

    return {
      ...meshData,
      vertices: newVertices,
    };
  }

  limitWeights(meshData: MeshData): MeshData {
    const newVertices = meshData.vertices.map((vertex) => {
      const sortedWeights = [...vertex.weights].sort((a, b) => b.weight - a.weight);
      const limitedWeights = sortedWeights.slice(0, this.maxInfluences);
      
      const total = limitedWeights.reduce((sum, w) => sum + w.weight, 0);
      limitedWeights.forEach((w) => {
        w.weight /= total;
      });

      return {
        ...vertex,
        weights: limitedWeights,
      };
    });

    return {
      ...meshData,
      vertices: newVertices,
    };
  }
}
