import { computed } from 'vue';
import { useViewportStore } from '@/stores/useViewportStore';
import type { EditMode, ViewMode, RenderMode } from '@/types';

export function useRender() {
  const store = useViewportStore();

  const editMode = computed(() => store.editMode);
  const viewMode = computed(() => store.viewMode);
  const renderMode = computed(() => store.renderMode);
  const showGrid = computed(() => store.showGrid);
  const showAxes = computed(() => store.showAxes);
  const showOnionSkin = computed(() => store.showOnionSkin);
  const onionSkinRange = computed(() => store.onionSkinRange);
  const rightPanelWidth = computed(() => store.rightPanelWidth);
  const timelineHeight = computed(() => store.timelineHeight);
  const rightPanelCollapsed = computed(() => store.rightPanelCollapsed);
  const timelineCollapsed = computed(() => store.timelineCollapsed);

  function setEditModeValue(mode: EditMode) {
    store.setEditMode(mode);
  }

  function setViewModeValue(mode: ViewMode) {
    store.setViewMode(mode);
  }

  function setRenderModeValue(mode: RenderMode) {
    store.setRenderMode(mode);
  }

  function toggleGridVisibility() {
    store.toggleGrid();
  }

  function toggleAxesVisibility() {
    store.toggleAxes();
  }

  function toggleOnionSkinVisibility() {
    store.toggleOnionSkin();
  }

  function setOnionSkinRangeValue(range: number) {
    store.setOnionSkinRange(range);
  }

  function setRightPanelWidthValue(width: number) {
    store.setRightPanelWidth(width);
  }

  function setTimelineHeightValue(height: number) {
    store.setTimelineHeight(height);
  }

  function toggleRightPanelCollapsed() {
    store.toggleRightPanel();
  }

  function toggleTimelineCollapsed() {
    store.toggleTimeline();
  }

  function resetViewportSettings() {
    store.resetViewport();
  }

  function isEditMode(mode: EditMode): boolean {
    return store.editMode === mode;
  }

  function isRenderMode(mode: RenderMode): boolean {
    return store.renderMode === mode;
  }

  function isViewMode(mode: ViewMode): boolean {
    return store.viewMode === mode;
  }

  function cycleEditMode() {
    const modes: EditMode[] = ['select', 'create', 'ik', 'weight'];
    const currentIndex = modes.indexOf(store.editMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    store.setEditMode(modes[nextIndex]);
  }

  function cycleRenderMode() {
    const modes: RenderMode[] = ['solid', 'wireframe', 'bones', 'weight'];
    const currentIndex = modes.indexOf(store.renderMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    store.setRenderMode(modes[nextIndex]);
  }

  function setFrontView() {
    store.setViewMode('front');
  }

  function setSideView() {
    store.setViewMode('side');
  }

  function setTopView() {
    store.setViewMode('top');
  }

  function setPerspectiveView() {
    store.setViewMode('perspective');
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
    setEditModeValue,
    setViewModeValue,
    setRenderModeValue,
    toggleGridVisibility,
    toggleAxesVisibility,
    toggleOnionSkinVisibility,
    setOnionSkinRangeValue,
    setRightPanelWidthValue,
    setTimelineHeightValue,
    toggleRightPanelCollapsed,
    toggleTimelineCollapsed,
    resetViewportSettings,
    isEditMode,
    isRenderMode,
    isViewMode,
    cycleEditMode,
    cycleRenderMode,
    setFrontView,
    setSideView,
    setTopView,
    setPerspectiveView,
  };
}
