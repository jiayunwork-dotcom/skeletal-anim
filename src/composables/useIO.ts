import { computed, ref } from 'vue';
import { useProjectStore } from '@/stores/useProjectStore';
import { useSkeletonStore } from '@/stores/useSkeletonStore';
import { useAnimationStore } from '@/stores/useAnimationStore';
import type { ProjectData } from '@/types';

export function useIO() {
  const projectStore = useProjectStore();
  const skeletonStore = useSkeletonStore();
  const animationStore = useAnimationStore();

  const projectName = computed(() => projectStore.projectName);
  const isDirty = computed(() => projectStore.isDirty);
  const showImportDialog = computed(() => projectStore.showImportDialog);
  const showExportDialog = computed(() => projectStore.showExportDialog);
  const importType = computed(() => projectStore.importType);
  const exportType = computed(() => projectStore.exportType);

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  function setProjectName(name: string) {
    projectStore.projectName = name;
  }

  function setShowImportDialog(show: boolean) {
    projectStore.showImportDialog = show;
  }

  function setShowExportDialog(show: boolean) {
    projectStore.showExportDialog = show;
  }

  function setImportType(type: 'obj' | 'gltf') {
    projectStore.importType = type;
  }

  function setExportType(type: 'gltf' | 'bvh') {
    projectStore.exportType = type;
  }

  function newProject() {
    projectStore.newProject();
  }

  async function importFile(file: File): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      await projectStore.importFile(file);
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Import failed';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function exportGltf(): void {
    projectStore.exportGltf();
  }

  function exportBvh(): void {
    projectStore.exportBvh();
  }

  function exportProject(): void {
    if (projectStore.exportType === 'gltf') {
      exportGltf();
    } else {
      exportBvh();
    }
  }

  function saveProject(): void {
    projectStore.saveToLocalStorage();
  }

  function loadProject(): boolean {
    return projectStore.loadFromLocalStorage();
  }

  function downloadProject(): void {
    const animData = animationStore.toData();
    const projectData: ProjectData = {
      version: '1.0',
      name: projectStore.projectName,
      skeleton: skeletonStore.toData().skeleton,
      mesh: skeletonStore.toData().mesh,
      animationClips: animData.clips,
      stateMachine: animData.stateMachine,
      animation: {
        clips: animData.clips,
        stateMachine: animData.stateMachine,
        currentClipId: animData.currentClipId,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectStore.projectName || 'skeletal-project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openProjectFile(file: File): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ProjectData;

      if (data.skeleton) {
        skeletonStore.setSkeleton(
          new (await import('@/core/skeleton/Skeleton')).Skeleton(data.skeleton)
        );
      }

      if (data.mesh) {
        skeletonStore.setMeshData(data.mesh);
      }

      if (data.animation) {
        if (data.animation.clips) {
          animationStore.loadClipsData(data.animation.clips);
        }
        if (data.animation.stateMachine) {
          animationStore.loadStateMachineData(data.animation.stateMachine);
        }
        if (data.animation.currentClipId) {
          animationStore.setCurrentClip(data.animation.currentClipId);
        }
      }

      if (data.name) {
        projectStore.projectName = data.name;
      }

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load project';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function getProjectData(): ProjectData {
    const animData = animationStore.toData();
    return {
      version: '1.0',
      name: projectStore.projectName,
      skeleton: skeletonStore.toData().skeleton,
      mesh: skeletonStore.toData().mesh,
      animationClips: animData.clips,
      stateMachine: animData.stateMachine,
      animation: {
        clips: animData.clips,
        stateMachine: animData.stateMachine,
        currentClipId: animData.currentClipId,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    projectName,
    isDirty,
    showImportDialog,
    showExportDialog,
    importType,
    exportType,
    isLoading,
    error,
    setProjectName,
    setShowImportDialog,
    setShowExportDialog,
    setImportType,
    setExportType,
    newProject,
    importFile,
    exportGltf,
    exportBvh,
    exportProject,
    saveProject,
    loadProject,
    downloadProject,
    openProjectFile,
    getProjectData,
  };
}
