import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Skeleton } from '../skeleton/Skeleton';
import { Bone } from '../skeleton/Bone';
import { AnimationClip } from '../animation/AnimationClip';
import { Keyframe } from '../animation/Keyframe';
import type { MeshData, VertexData, ProjectData } from '@/types';
import { generateId } from '@/utils/math';
import { vector3ToArray, eulerToArray } from '@/utils/threeHelpers';
import { DEFAULT_FPS } from '@/utils/constants';

export class GltfIO {
  async importFromFile(file: File): Promise<{
    skeleton: Skeleton;
    mesh?: MeshData;
    clips: AnimationClip[];
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await this.parse(arrayBuffer);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  async parse(arrayBuffer: ArrayBuffer): Promise<{
    skeleton: Skeleton;
    mesh?: MeshData;
    clips: AnimationClip[];
  }> {
    const loader = new GLTFLoader();
    
    return new Promise((resolve, reject) => {
      loader.parse(
        arrayBuffer,
        '',
        (gltf) => {
          const bones: Bone[] = [];
          const boneMap = new Map<THREE.Bone, Bone>();
          const threeBones: THREE.Bone[] = [];

          gltf.scene.traverse((obj) => {
            if (obj instanceof THREE.Bone) {
              threeBones.push(obj);
            }
          });

          threeBones.forEach((threeBone) => {
            const bone = new Bone({
              name: threeBone.name,
              position: vector3ToArray(threeBone.position) as [number, number, number],
              rotation: eulerToArray(threeBone.rotation) as [number, number, number],
              length: 1,
            });
            bones.push(bone);
            boneMap.set(threeBone, bone);
          });

          threeBones.forEach((threeBone, index) => {
            const bone = bones[index];
            if (threeBone.parent && threeBone.parent instanceof THREE.Bone) {
              const parentBone = boneMap.get(threeBone.parent);
              if (parentBone) {
                bone.parentId = parentBone.id;
              }
            }
          });

          const skeleton = new Skeleton({ name: 'Imported Skeleton' });
          bones.forEach((bone) => skeleton.addBone(bone, bone.parentId));

          let meshData: MeshData | undefined;
          
          gltf.scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.geometry && (obj as any).skeleton) {
              meshData = this.extractMeshData(obj as any, boneMap);
            }
          });

          const clips: AnimationClip[] = [];
          if (gltf.animations) {
            gltf.animations.forEach((threeClip) => {
              clips.push(this.convertThreeClip(threeClip, bones, threeBones));
            });
          }

          resolve({ skeleton, mesh: meshData, clips });
        },
        reject
      );
    });
  }

  extractMeshData(
    mesh: THREE.Mesh,
    boneMap: Map<THREE.Bone, Bone>
  ): MeshData {
    const geometry = mesh.geometry;
    const positionAttr = geometry.getAttribute('position');
    const skinIndicesAttr = geometry.getAttribute('skinIndex');
    const skinWeightsAttr = geometry.getAttribute('skinWeight');
    const normalAttr = geometry.getAttribute('normal');
    const indexAttr = geometry.index;

    const vertices: VertexData[] = [];
    const faces: Array<[number, number, number]> = [];

    const boneIdMap = new Map<number, string>();
    const meshWithSkeleton = mesh as any;
    if (meshWithSkeleton.skeleton) {
      meshWithSkeleton.skeleton.bones.forEach((threeBone: THREE.Bone, index: number) => {
        const bone = boneMap.get(threeBone);
        if (bone) {
          boneIdMap.set(index, bone.id);
        }
      });
    }

    for (let i = 0; i < positionAttr.count; i++) {
      const vertex: VertexData = {
        position: [
          positionAttr.getX(i),
          positionAttr.getY(i),
          positionAttr.getZ(i),
        ],
        weights: [],
      };

      if (normalAttr) {
        vertex.normal = [
          normalAttr.getX(i),
          normalAttr.getY(i),
          normalAttr.getZ(i),
        ];
      }

      if (skinIndicesAttr && skinWeightsAttr) {
        for (let j = 0; j < 4; j++) {
          const boneIndex = skinIndicesAttr.getX(i) + (j > 0 ? skinIndicesAttr.getY(i) + (j > 1 ? skinIndicesAttr.getZ(i) + (j > 2 ? skinIndicesAttr.getW(i) : 0) : 0) : 0);
          const weight = skinWeightsAttr.getX(i) + (j > 0 ? skinWeightsAttr.getY(i) + (j > 1 ? skinWeightsAttr.getZ(i) + (j > 2 ? skinWeightsAttr.getW(i) : 0) : 0) : 0);
          
          const actualIndex = skinIndicesAttr.getComponent(i, j);
          const actualWeight = skinWeightsAttr.getComponent(i, j);
          
          if (actualWeight > 0.001) {
            const boneId = boneIdMap.get(actualIndex);
            if (boneId) {
              vertex.weights.push({ boneId, weight: actualWeight });
            }
          }
        }
      }

      vertices.push(vertex);
    }

    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i += 3) {
        faces.push([
          indexAttr.getX(i),
          indexAttr.getX(i + 1),
          indexAttr.getX(i + 2),
        ]);
      }
    } else {
      for (let i = 0; i < positionAttr.count; i += 3) {
        faces.push([i, i + 1, i + 2]);
      }
    }

    return {
      id: generateId(),
      name: mesh.name || 'Imported Mesh',
      vertices,
      faces,
    };
  }

  convertThreeClip(
    threeClip: THREE.AnimationClip,
    bones: Bone[],
    threeBones: THREE.Bone[]
  ): AnimationClip {
    const fps = threeClip.tracks.length > 0 
      ? Math.round(threeClip.tracks[0].times.length / threeClip.duration)
      : DEFAULT_FPS;
    
    const clip = new AnimationClip({
      name: threeClip.name,
      fps,
      duration: threeClip.duration * fps,
    });

    const boneTracks = new Map<string, Map<number, [number, number, number]>>();

    threeClip.tracks.forEach((track) => {
      if (track.name.endsWith('.quaternion') || track.name.endsWith('.rotation')) {
        const boneName = track.name.split('.')[0];
        const boneIndex = threeBones.findIndex((b) => b.name === boneName);
        
        if (boneIndex >= 0 && boneIndex < bones.length) {
          const bone = bones[boneIndex];
          if (!boneTracks.has(bone.id)) {
            boneTracks.set(bone.id, new Map());
          }

          const rotations = boneTracks.get(bone.id)!;
          
          for (let i = 0; i < track.times.length; i++) {
            const frame = Math.round(track.times[i] * fps);
            
            if (track.name.endsWith('.quaternion')) {
              const x = track.values[i * 4];
              const y = track.values[i * 4 + 1];
              const z = track.values[i * 4 + 2];
              const w = track.values[i * 4 + 3];
              const quat = new THREE.Quaternion(x, y, z, w);
              const euler = new THREE.Euler().setFromQuaternion(quat);
              rotations.set(frame, [euler.x, euler.y, euler.z]);
            } else {
              const x = track.values[i * 3];
              const y = track.values[i * 3 + 1];
              const z = track.values[i * 3 + 2];
              rotations.set(frame, [x, y, z]);
            }
          }
        }
      }
    });

    const allFrames = new Set<number>();
    boneTracks.forEach((rotations) => {
      rotations.forEach((_, frame) => allFrames.add(frame));
    });

    allFrames.forEach((frame) => {
      const keyframe = new Keyframe({ frame });
      
      boneTracks.forEach((rotations, boneId) => {
        const rotation = rotations.get(frame);
        if (rotation) {
          keyframe.setBoneRotation(boneId, new THREE.Euler(...rotation));
        }
      });

      clip.addKeyframe(keyframe);
    });

    return clip;
  }

  export(
    project: ProjectData
  ): Blob {
    const gltfData = {
      asset: {
        version: '2.0',
        generator: 'Skeletal Animation Editor',
      },
      scene: 0,
      scenes: [{ nodes: [] }],
      nodes: [] as any[],
      meshes: [] as any[],
      skins: [] as any[],
      animations: [] as any[],
      accessors: [] as any[],
      bufferViews: [] as any[],
      buffers: [] as any[],
    };

    const json = JSON.stringify(gltfData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  download(project: ProjectData, filename: string = 'model.gltf'): void {
    const blob = this.export(project);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
