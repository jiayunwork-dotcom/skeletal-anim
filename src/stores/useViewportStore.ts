import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { EditMode, ViewMode, RenderMode, ViewportState } from '@/types';

export const useViewportStore = defineStore('viewport', () => {
  const editMode = ref<EditMode>('select');
  const viewMode = ref<ViewMode>('perspective');
  const renderMode = ref<RenderMode>('solid');
  const showGrid = ref(true);
  const showAxes = ref(true);
  const showOnionSkin = ref(false);
  const onionSkinRange = ref(2);
  const rightPanelWidth = ref(320);
  const timelineHeight = ref(200);
  const rightPanelCollapsed = ref(false);
  const timelineCollapsed = ref(false);

  function setEditMode(mode: EditMode) {
    editMode.value = mode;
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode;
  }

  function setRenderMode(mode: RenderMode) {
    renderMode.value = mode;
  }

  function toggleGrid() {
    showGrid.value = !showGrid.value;
  }

  function toggleAxes() {
    showAxes.value = !showAxes.value;
  }

  function toggleOnionSkin() {
    showOnionSkin.value = !showOnionSkin.value;
  }

  function setOnionSkinRange(range: number) {
    onionSkinRange.value = Math.max(1, Math.min(5, range));
  }

  function setRightPanelWidth(width: number) {
    rightPanelWidth.value = Math.max(240, Math.min(480, width));
  }

  function setTimelineHeight(height: number) {
    timelineHeight.value = Math.max(120, Math.min(400, height));
  }

  function toggleRightPanel() {
    rightPanelCollapsed.value = !rightPanelCollapsed.value;
  }

  function toggleTimeline() {
    timelineCollapsed.value = !timelineCollapsed.value;
  }

  function resetViewport() {
    editMode.value = 'select';
    viewMode.value = 'perspective';
    renderMode.value = 'solid';
    showGrid.value = true;
    showAxes.value = true;
    showOnionSkin.value = false;
    onionSkinRange.value = 2;
  }

  function toState(): ViewportState {
    return {
      editMode: editMode.value,
      viewMode: viewMode.value,
      renderMode: renderMode.value,
      showGrid: showGrid.value,
      showAxes: showAxes.value,
      showOnionSkin: showOnionSkin.value,
      onionSkinRange: onionSkinRange.value,
    };
  }

  return {
    editMode,
    viewMode,
    renderMode,
    showGrid,
    showAxes,
    showOnionSkin,
    onionSkinRange,
    rightPanelWidth,
    timelineHeight,
    rightPanelCollapsed,
    timelineCollapsed,
    setEditMode,
    setViewMode,
    setRenderMode,
    toggleGrid,
    toggleAxes,
    toggleOnionSkin,
    setOnionSkinRange,
    setRightPanelWidth,
    setTimelineHeight,
    toggleRightPanel,
    toggleTimeline,
    resetViewport,
    toState,
  };
});
