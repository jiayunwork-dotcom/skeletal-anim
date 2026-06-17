import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as THREE from 'three';
import { Animator } from '@/core/animation/Animator';
import { AnimationClip } from '@/core/animation/AnimationClip';
import { Keyframe } from '@/core/animation/Keyframe';
import { StateMachine, State, Transition } from '@/core/animation/StateMachine';
import { useSkeletonStore } from './useSkeletonStore';
import { generateId } from '@/utils/math';
import { DEFAULT_FPS } from '@/utils/constants';
import type { AnimationClipData, KeyframeData, StateMachineData } from '@/types';

export const useAnimationStore = defineStore('animation', () => {
  const skeletonStore = useSkeletonStore();
  
  const animator = ref<Animator>(new Animator(skeletonStore.skeleton));
  const currentClipId = ref<string | null>(null);
  const stateMachine = ref<StateMachine | null>(null);
  const useStateMachine = ref(false);
  const copiedKeyframe = ref<Keyframe | null>(null);
  const selectedKeyframe = ref<number | null>(null);

  const currentClip = computed(() => {
    if (!currentClipId.value) return null;
    return animator.value.getClip(currentClipId.value) || null;
  });

  const allClips = computed(() => animator.value.getAllClips());

  const clips = computed(() => animator.value.clips);

  const playbackState = computed(() => animator.value.playbackState);

  const isPlaying = computed(() => animator.value.playbackState.isPlaying);

  const currentFrame = computed(() => animator.value.playbackState.currentFrame);

  function init() {
    animator.value = new Animator(skeletonStore.skeleton);
    createClip('Idle');
    currentClipId.value = allClips.value[0]?.id || null;
  }

  function createClip(name: string): AnimationClip {
    const clip = animator.value.createClip(name);
    currentClipId.value = clip.id;
    return clip;
  }

  function duplicateClip(clipId: string, newName?: string): AnimationClip | null {
    return animator.value.duplicateClip(clipId, newName);
  }

  function deleteClip(clipId: string) {
    animator.value.removeClip(clipId);
    if (currentClipId.value === clipId) {
      currentClipId.value = allClips.value[0]?.id || null;
    }
  }

  function setCurrentClip(clipId: string | null) {
    currentClipId.value = clipId;
    if (clipId) {
      animator.value.playbackState.currentClipId = clipId;
    }
  }

  function setActiveClipId(clipId: string) {
    setCurrentClip(clipId);
  }

  function addClip(clip: AnimationClip) {
    animator.value.addClip(clip);
  }

  function play() {
    if (currentClipId.value) {
      animator.value.play(currentClipId.value);
    }
  }

  function pause() {
    animator.value.pause();
  }

  function togglePlay() {
    animator.value.togglePlay();
  }

  function stop() {
    animator.value.stop();
  }

  function nextFrame() {
    animator.value.nextFrame();
    applyCurrentPose();
  }

  function prevFrame() {
    animator.value.prevFrame();
    applyCurrentPose();
  }

  function setCurrentFrame(frame: number) {
    animator.value.setCurrentFrame(frame);
    applyCurrentPose();
  }

  function setSpeed(speed: number) {
    animator.value.setSpeed(speed);
  }

  function setLoop(loop: boolean) {
    animator.value.setLoop(loop);
  }

  function addKeyframe() {
    if (!currentClip.value) return;
    
    const frame = Math.floor(currentFrame.value);
    animator.value.recordKeyframe(frame);
    selectedKeyframe.value = frame;
  }

  function removeKeyframe(frame: number) {
    if (!currentClip.value) return;
    currentClip.value.removeKeyframe(frame);
    if (selectedKeyframe.value === frame) {
      selectedKeyframe.value = null;
    }
  }

  function moveKeyframe(fromFrame: number, toFrame: number) {
    if (!currentClip.value) return;
    currentClip.value.moveKeyframe(fromFrame, toFrame);
    if (selectedKeyframe.value === fromFrame) {
      selectedKeyframe.value = toFrame;
    }
  }

  function copyKeyframe(frame: number) {
    if (!currentClip.value) return;
    copiedKeyframe.value = currentClip.value.copyKeyframe(frame);
  }

  function pasteKeyframe(targetFrame: number) {
    if (!currentClip.value || !copiedKeyframe.value) return;
    currentClip.value.pasteKeyframe(copiedKeyframe.value, targetFrame);
  }

  function setKeyframeInterpolation(frame: number, interpolation: 'linear' | 'bezier') {
    if (!currentClip.value) return;
    currentClip.value.setKeyframeInterpolation(frame, interpolation);
  }

  function applyCurrentPose() {
    if (!currentClip.value) return;
    animator.value.applyPose(currentFrame.value);
  }

  function update() {
    if (useStateMachine.value && stateMachine.value) {
      stateMachine.value.update();
    } else {
      animator.value.update();
    }
  }

  function initStateMachine() {
    stateMachine.value = new StateMachine({}, animator.value);
    if (allClips.value.length > 0) {
      const initialState = stateMachine.value.createState('Idle', allClips.value[0].id);
      stateMachine.value.setInitialState(initialState.id);
    }
  }

  function addState(name: string, clipId?: string): State | null {
    if (!stateMachine.value) return null;
    return stateMachine.value.createState(name, clipId);
  }

  function removeState(stateId: string) {
    if (!stateMachine.value) return;
    stateMachine.value.removeState(stateId);
  }

  function addTransition(fromId: string, toId: string, condition?: string): Transition | null {
    if (!stateMachine.value) return null;
    return stateMachine.value.createTransition(fromId, toId, condition);
  }

  function removeTransition(transitionId: string) {
    if (!stateMachine.value) return;
    stateMachine.value.removeTransition(transitionId);
  }

  function setParameter(name: string, value: boolean | number) {
    if (!stateMachine.value) return;
    stateMachine.value.setParameter(name, value);
  }

  function getParameter(name: string): boolean | number | undefined {
    if (!stateMachine.value) return undefined;
    return stateMachine.value.getParameter(name);
  }

  function loadClipsData(clipsData: AnimationClipData[]) {
    clipsData.forEach((data) => {
      const clip = new AnimationClip(data);
      animator.value.addClip(clip);
    });
    if (allClips.value.length > 0) {
      currentClipId.value = allClips.value[0].id;
    }
  }

  function loadStateMachineData(data: StateMachineData) {
    stateMachine.value = new StateMachine(data, animator.value);
  }

  function toData() {
    return {
      clips: allClips.value.map((c) => c.toData()),
      stateMachine: stateMachine.value?.toData(),
      currentClipId: currentClipId.value,
      playbackState: { ...playbackState.value },
    };
  }

  function loadFromStorage() {
    try {
      const dataStr = localStorage.getItem('skeletal-anim-animation');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.clips && data.clips.length > 0) {
          animator.value = new Animator(skeletonStore.skeleton);
          loadClipsData(data.clips);
        }
        if (data.currentClipId) {
          currentClipId.value = data.currentClipId;
        }
        if (data.stateMachine) {
          loadStateMachineData(data.stateMachine);
        }
      }
    } catch (e) {
      console.error('Failed to load animation from storage:', e);
    }
  }

  init();

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
    copiedKeyframe,
    selectedKeyframe,
    init,
    createClip,
    duplicateClip,
    deleteClip,
    setCurrentClip,
    play,
    pause,
    togglePlay,
    stop,
    nextFrame,
    prevFrame,
    setCurrentFrame,
    setSpeed,
    setLoop,
    addKeyframe,
    removeKeyframe,
    moveKeyframe,
    copyKeyframe,
    pasteKeyframe,
    setKeyframeInterpolation,
    update,
    initStateMachine,
    addState,
    removeState,
    addTransition,
    removeTransition,
    setParameter,
    getParameter,
    loadClipsData,
    loadStateMachineData,
    toData,
    clips,
    addClip,
    setActiveClipId,
    loadFromStorage,
  };
});
