import { computed } from 'vue';
import * as THREE from 'three';
import { useAnimationStore } from '@/stores/useAnimationStore';
import type { CurvePresetType } from '@/stores/useAnimationStore';
import type { AnimationClip } from '@/core/animation/AnimationClip';
import type { State, Transition } from '@/core/animation/StateMachine';

export type { CurvePresetType };

export function useAnimation() {
  const store = useAnimationStore();

  const animator = computed(() => store.animator);
  const currentClipId = computed(() => store.currentClipId);
  const currentClip = computed(() => store.currentClip);
  const allClips = computed(() => store.allClips);
  const playbackState = computed(() => store.playbackState);
  const isPlaying = computed(() => store.isPlaying);
  const currentFrame = computed(() => store.currentFrame);
  const stateMachine = computed(() => store.stateMachine);
  const useStateMachine = computed(() => store.useStateMachine);
  const selectedKeyframe = computed(() => store.selectedKeyframe);
  const curveEditorSelectedKeyframes = computed(() => store.curveEditorSelectedKeyframes);

  const fps = computed(() => store.animator.fps);
  const duration = computed(() => currentClip.value?.duration || 0);
  const totalFrames = computed(() => Math.ceil(duration.value * fps.value));

  function addClip(name: string): AnimationClip {
    return store.createClip(name);
  }

  function duplicateClip(clipId: string, newName?: string): AnimationClip | null {
    return store.duplicateClip(clipId, newName);
  }

  function removeClip(clipId: string) {
    store.deleteClip(clipId);
  }

  function selectClip(clipId: string | null) {
    store.setCurrentClip(clipId);
  }

  function playAnimation() {
    store.play();
  }

  function pauseAnimation() {
    store.pause();
  }

  function togglePlayback() {
    store.togglePlay();
  }

  function stopAnimation() {
    store.stop();
  }

  function goToNextFrame() {
    store.nextFrame();
  }

  function goToPrevFrame() {
    store.prevFrame();
  }

  function goToFrame(frame: number) {
    store.setCurrentFrame(frame);
  }

  function setPlaybackSpeed(speed: number) {
    store.setSpeed(speed);
  }

  function setLooping(loop: boolean) {
    store.setLoop(loop);
  }

  function recordKeyframe() {
    store.addKeyframe();
  }

  function deleteKeyframe(frame: number) {
    store.removeKeyframe(frame);
  }

  function moveKeyframePosition(fromFrame: number, toFrame: number) {
    store.moveKeyframe(fromFrame, toFrame);
  }

  function copyKeyframeData(frame: number) {
    store.copyKeyframe(frame);
  }

  function pasteKeyframeData(targetFrame: number) {
    store.pasteKeyframe(targetFrame);
  }

  function setKeyframeInterpolationMode(frame: number, interpolation: 'linear' | 'bezier') {
    store.setKeyframeInterpolation(frame, interpolation);
  }

  function hasKeyframeAtFrame(frame: number): boolean {
    if (!currentClip.value) return false;
    return currentClip.value.keyframes.some((kf) => kf.frame === frame);
  }

  function getKeyframesForBone(boneId: string): number[] {
    if (!currentClip.value) return [];
    return currentClip.value.keyframes
      .filter((kf) => kf.boneRotations.has(boneId))
      .map((kf) => kf.frame)
      .sort((a, b) => a - b);
  }

  function updateAnimation(deltaTime: number) {
    store.update();
  }

  function enableStateMachine() {
    if (!store.stateMachine) {
      store.initStateMachine();
    }
    store.useStateMachine = true;
  }

  function disableStateMachine() {
    store.useStateMachine = false;
  }

  function addAnimationState(name: string, clipId?: string): State | null {
    return store.addState(name, clipId);
  }

  function removeAnimationState(stateId: string) {
    store.removeState(stateId);
  }

  function addStateTransition(fromId: string, toId: string, condition?: string): Transition | null {
    return store.addTransition(fromId, toId, condition);
  }

  function removeStateTransition(transitionId: string) {
    store.removeTransition(transitionId);
  }

  function setStateParameter(name: string, value: boolean | number) {
    store.setParameter(name, value);
  }

  function getStateParameter(name: string): boolean | number | undefined {
    return store.getParameter(name);
  }

  function setBezierHandle(
    frame: number,
    boneId: string,
    handleIndex: 0 | 1,
    newHandle: THREE.Vector3
  ): void {
    store.setBezierHandle(frame, boneId, handleIndex, newHandle);
  }

  function getBezierHandles(
    frame: number,
    boneId: string
  ): [THREE.Vector3, THREE.Vector3] | null {
    return store.getBezierHandles(frame, boneId);
  }

  function applyCurvePreset(
    frame: number,
    boneId: string,
    preset: CurvePresetType
  ): void {
    store.applyCurvePreset(frame, boneId, preset);
  }

  function applyPresetToSelectedFrames(
    boneId: string,
    preset: CurvePresetType,
    frames: number[]
  ): void {
    store.applyPresetToSelectedFrames(boneId, preset, frames);
  }

  function batchScaleKeyframes(
    boneId: string,
    frames: number[],
    scaleFactor: number,
    centerFrame?: number,
    centerValue?: number
  ): void {
    store.batchScaleKeyframes(boneId, frames, scaleFactor, centerFrame, centerValue);
  }

  function batchMoveKeyframes(
    boneId: string,
    frames: number[],
    frameDelta: number,
    valueDelta: THREE.Vector3
  ): void {
    store.batchMoveKeyframes(boneId, frames, frameDelta, valueDelta);
  }

  function setCurveEditorSelectedKeyframes(frames: Set<number> | number[]): void {
    store.setCurveEditorSelectedKeyframes(frames);
  }

  function addCurveEditorSelectedKeyframe(frame: number): void {
    store.addCurveEditorSelectedKeyframe(frame);
  }

  function clearCurveEditorSelectedKeyframes(): void {
    store.clearCurveEditorSelectedKeyframes();
  }

  function removeKeyframeFromCurveEditorSelection(frame: number): void {
    store.removeKeyframeFromCurveEditorSelection(frame);
  }

  function setSelectedKeyframe(frame: number | null): void {
    store.setSelectedKeyframe(frame);
  }

  return {
    animator,
    currentClipId,
    currentClip,
    allClips,
    playbackState,
    isPlaying,
    currentFrame,
    stateMachine,
    useStateMachine,
    selectedKeyframe,
    curveEditorSelectedKeyframes,
    fps,
    duration,
    totalFrames,
    addClip,
    duplicateClip,
    removeClip,
    selectClip,
    playAnimation,
    pauseAnimation,
    togglePlayback,
    stopAnimation,
    goToNextFrame,
    goToPrevFrame,
    goToFrame,
    setPlaybackSpeed,
    setLooping,
    recordKeyframe,
    deleteKeyframe,
    moveKeyframePosition,
    copyKeyframeData,
    pasteKeyframeData,
    setKeyframeInterpolationMode,
    hasKeyframeAtFrame,
    getKeyframesForBone,
    updateAnimation,
    enableStateMachine,
    disableStateMachine,
    addAnimationState,
    removeAnimationState,
    addStateTransition,
    removeStateTransition,
    setStateParameter,
    getStateParameter,
    setBezierHandle,
    getBezierHandles,
    applyCurvePreset,
    applyPresetToSelectedFrames,
    batchScaleKeyframes,
    batchMoveKeyframes,
    setCurveEditorSelectedKeyframes,
    addCurveEditorSelectedKeyframe,
    clearCurveEditorSelectedKeyframes,
    removeKeyframeFromCurveEditorSelection,
    setSelectedKeyframe,
  };
}
