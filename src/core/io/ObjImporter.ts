import * as THREE from 'three';
import type { MeshData, VertexData } from '@/types';
import { generateId } from '@/utils/math';

export class ObjImporter {
  parse(content: string): MeshData {
    const vertices: VertexData[] = [];
    const faces: Array<[number, number, number]> = [];
    const positions: [number, number, number][] = [];
    const normals: [number, number, number][] = [];

    const lines = content.split('\n');
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length === 0) continue;

      const type = parts[0];

      if (type === 'v' && parts.length >= 4) {
        positions.push([
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3]),
        ]);
      } else if (type === 'vn' && parts.length >= 4) {
        normals.push([
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3]),
        ]);
      } else if (type === 'f' && parts.length >= 4) {
        const indices: number[] = [];
        
        for (let i = 1; i < parts.length; i++) {
          const faceParts = parts[i].split('/');
          const posIndex = parseInt(faceParts[0], 10) - 1;
          
          if (posIndex >= 0 && posIndex < positions.length) {
            indices.push(posIndex);
          }
        }

        if (indices.length >= 3) {
          for (let i = 1; i < indices.length - 1; i++) {
            faces.push([indices[0], indices[i], indices[i + 1]]);
          }
        }
      }
    }

    for (let i = 0; i < positions.length; i++) {
      const vertex: VertexData = {
        position: positions[i],
        weights: [],
      };
      
      if (i < normals.length) {
        vertex.normal = normals[i];
      }
      
      vertices.push(vertex);
    }

    return {
      id: generateId(),
      name: 'Imported Mesh',
      vertices,
      faces,
    };
  }

  async importFromFile(file: File): Promise<MeshData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const meshData = this.parse(content);
          meshData.name = file.name.replace('.obj', '');
          resolve(meshData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  convertToThreeMesh(meshData: MeshData): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const positionArray: number[] = [];
    const normalArray: number[] = [];
    const indexArray: number[] = [];
    const vertexIndexMap = new Map<string, number>();
    let currentIndex = 0;

    meshData.faces.forEach((face) => {
      face.forEach((vertIdx) => {
        const vertex = meshData.vertices[vertIdx];
        const posKey = vertex.position.join(',');
        
        if (!vertexIndexMap.has(posKey)) {
          vertexIndexMap.set(posKey, currentIndex);
          positionArray.push(...vertex.position);
          if (vertex.normal) {
            normalArray.push(...vertex.normal);
          }
          currentIndex++;
        }
        
        indexArray.push(vertexIndexMap.get(posKey)!);
      });
    });

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positionArray, 3)
    );
    
    if (normalArray.length > 0) {
      geometry.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(normalArray, 3)
      );
    } else {
      geometry.computeVertexNormals();
    }
    
    geometry.setIndex(indexArray);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }

  createSkinningAttributes(
    meshData: MeshData,
    boneIndexMap: Map<string, number>
  ): {
    skinIndices: THREE.Float32BufferAttribute;
    skinWeights: THREE.Float32BufferAttribute;
  } {
    const indices: number[] = [];
    const weights: number[] = [];

    meshData.vertices.forEach((vertex) => {
      const boneIndices = [0, 0, 0, 0];
      const boneWeights = [0, 0, 0, 0];

      vertex.weights.forEach((weight, i) => {
        if (i < 4) {
          const boneIndex = boneIndexMap.get(weight.boneId) ?? 0;
          boneIndices[i] = boneIndex;
          boneWeights[i] = weight.weight;
        }
      });

      indices.push(...boneIndices);
      weights.push(...boneWeights);
    });

    return {
      skinIndices: new THREE.Float32BufferAttribute(indices, 4),
      skinWeights: new THREE.Float32BufferAttribute(weights, 4),
    };
  }
}
