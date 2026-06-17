import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ObjImporter } from '@/core/io/ObjImporter';
import { GltfIO } from '@/core/io/GltfIO';
import { BvhExporter } from '@/core/io/BvhExporter';
import { useSkeletonStore } from './useSkeletonStore';
import { useAnimationStore } from './useAnimationStore';
import type { ProjectData, MeshData } from '@/types';
import { Skeleton } from '@/core/skeleton/Skeleton';

export const useProjectStore = defineStore('project', () => {
  const skeletonStore = useSkeletonStore();
  const animationStore = useAnimationStore();

  const projectName = ref('Untitled');
  const isDirty = ref(false);
  const showImportDialog = ref(false);
  const showExportDialog = ref(false);
  const importType = ref<'obj' | 'gltf'>('obj');
  const exportType = ref<'gltf' | 'bvh'>('gltf');

  const objImporter = ref(new ObjImporter());
  const gltfIO = ref(new GltfIO());
  const bvhExporter = ref(new BvhExporter());

  function markDirty() {
    isDirty.value = true;
  }

  function saveProject() {
    saveToLocalStorage();
  }

  function clearDirty() {
    isDirty.value = false;
  }

  function setProjectName(name: string) {
    projectName.value = name;
    markDirty();
  }

  function newProject() {
    skeletonStore.loadHumanoidPreset();
    animationStore.init();
    projectName.value = 'Untitled';
    clearDirty();
  }

  async function importObj(file: File) {
    try {
      const meshData = await objImporter.value.importFromFile(file);
      skeletonStore.setMeshData(meshData);
      skeletonStore.calculateAutoWeights();
      markDirty();
      return meshData;
    } catch (error) {
      console.error('Failed to import OBJ:', error);
      throw error;
    }
  }

  async function importGltf(file: File) {
    try {
      const result = await gltfIO.value.importFromFile(file);
      skeletonStore.setSkeleton(result.skeleton);
      if (result.mesh) {
        skeletonStore.setMeshData(result.mesh);
      }
      if (result.clips.length > 0) {
        animationStore.loadClipsData(result.clips.map((c) => c.toData()));
      }
      markDirty();
      return result;
    } catch (error) {
      console.error('Failed to import glTF:', error);
      throw error;
    }
  }

  async function importFile(file: File) {
    const extension = file.name.toLowerCase().split('.').pop();
    
    if (extension === 'obj') {
      return await importObj(file);
    } else if (extension === 'gltf' || extension === 'glb') {
      return await importGltf(file);
    } else {
      throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  function exportGltf() {
    const projectData = getProjectData();
    gltfIO.value.download(projectData, `${projectName.value}.gltf`);
    markDirty();
  }

  function exportBvh() {
    const currentClip = animationStore.currentClip;
    if (!currentClip) {
      throw new Error('No animation clip selected');
    }
    
    bvhExporter.value.download(
      skeletonStore.skeleton,
      currentClip,
      `${projectName.value}.bvh`
    );
    markDirty();
  }

  function exportProject() {
    if (exportType.value === 'gltf') {
      exportGltf();
    } else if (exportType.value === 'bvh') {
      exportBvh();
    }
  }

  function getProjectData(): ProjectData {
    const animData = animationStore.toData();
    const skelData = skeletonStore.toData();
    
    return {
      version: '1.0',
      name: projectName.value,
      skeleton: skelData.skeleton,
      mesh: skelData.mesh || undefined,
      animationClips: animData.clips,
      stateMachine: animData.stateMachine || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function loadProjectData(data: ProjectData) {
    const skeleton = new Skeleton(data.skeleton);
    skeletonStore.setSkeleton(skeleton);
    
    if (data.mesh) {
      skeletonStore.setMeshData(data.mesh);
    }
    
    if (data.animationClips) {
      animationStore.loadClipsData(data.animationClips);
    }
    
    if (data.stateMachine) {
      animationStore.loadStateMachineData(data.stateMachine);
    }
    
    clearDirty();
  }

  function saveToLocalStorage() {
    try {
      const data = getProjectData();
      localStorage.setItem('skeletal-anim-project', JSON.stringify(data));
      localStorage.setItem('skeletal-anim-name', projectName.value);
      clearDirty();
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  function loadFromLocalStorage(): boolean {
    try {
      const dataStr = localStorage.getItem('skeletal-anim-project');
      const nameStr = localStorage.getItem('skeletal-anim-name');
      
      if (!dataStr) return false;
      
      const data = JSON.parse(dataStr) as ProjectData;
      loadProjectData(data);
      
      if (nameStr) {
        projectName.value = nameStr;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return false;
    }
  }

  function openImportDialog(type: 'obj' | 'gltf' = 'obj') {
    importType.value = type;
    showImportDialog.value = true;
  }

  function closeImportDialog() {
    showImportDialog.value = false;
  }

  function openExportDialog(type: 'gltf' | 'bvh' = 'gltf') {
    exportType.value = type;
    showExportDialog.value = true;
  }

  function closeExportDialog() {
    showExportDialog.value = false;
  }

  return {
    projectName,
    isDirty,
    showImportDialog,
    showExportDialog,
    importType,
    exportType,
    setProjectName,
    newProject,
    importFile,
    importObj,
    importGltf,
    exportGltf,
    exportBvh,
    exportProject,
    getProjectData,
    loadProjectData,
    saveToLocalStorage,
    loadFromLocalStorage,
    openImportDialog,
    closeImportDialog,
    openExportDialog,
    closeExportDialog,
    markDirty,
    saveProject,
  };
});
