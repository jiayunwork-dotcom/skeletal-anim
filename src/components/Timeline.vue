<template>
  <div class="timeline">
    <div class="timeline-header">
      <div class="timeline-controls">
        <div class="clip-selector">
          <select v-model="selectedClipId" class="property-input" @change="onClipChange">
            <option v-for="clip in allClips" :key="clip.id" :value="clip.id">
              {{ clip.name }}
            </option>
          </select>
          <button class="icon-btn" @click="onAddClip" title="Add Clip">
            ➕
          </button>
          <button
            class="icon-btn"
            @click="onDuplicateClip"
            title="Duplicate Clip"
            :disabled="!selectedClipId"
          >
            📋
          </button>
          <button
            class="icon-btn"
            @click="onDeleteClip"
            title="Delete Clip"
            :disabled="allClips.length <= 1"
          >
            🗑️
          </button>
        </div>
      </div>

      <div class="playback-controls">
        <button class="play-btn" @click="goToStart" title="Go to Start">
          ⏮️
        </button>
        <button class="play-btn" @click="goToPrevFrame" title="Previous Frame">
          ◀️
        </button>
        <button class="play-btn play-pause" @click="togglePlayback" :title="isPlaying ? 'Pause' : 'Play'">
          {{ isPlaying ? '⏸️' : '▶️' }}
        </button>
        <button class="play-btn" @click="goToNextFrame" title="Next Frame">
          ▶️
        </button>
        <button class="play-btn" @click="goToEnd" title="Go to End">
          ⏭️
        </button>
        <div class="divider"></div>
        <label class="checkbox-label">
          <input type="checkbox" v-model="looping" @change="onLoopChange" />
          Loop
        </label>
      </div>

      <div class="timeline-settings">
        <div class="setting-group">
          <label class="setting-label">FPS</label>
          <input
            v-model.number="fpsValue"
            type="number"
            min="1"
            max="120"
            class="property-input small"
            @change="onFpsChange"
          />
        </div>
        <div class="setting-group">
          <label class="setting-label">Speed</label>
          <select v-model="speedValue" class="property-input small" @change="onSpeedChange">
            <option :value="0.25">0.25x</option>
            <option :value="0.5">0.5x</option>
            <option :value="1">1x</option>
            <option :value="1.5">1.5x</option>
            <option :value="2">2x</option>
          </select>
        </div>
        <div class="setting-group">
          <label class="setting-label">Frame</label>
          <input
            v-model.number="frameValue"
            type="number"
            :min="0"
            :max="maxFrames"
            class="property-input small"
            @change="onFrameChange"
          />
        </div>
      </div>
    </div>

    <div class="timeline-body">
      <div class="bone-tracks">
        <div
          v-for="bone in allBones"
          :key="bone.id"
          class="bone-track"
          :class="{ selected: bone.id === selectedBoneId }"
          @click="selectBone(bone.id)"
        >
          <span class="track-name">{{ bone.name }}</span>
        </div>
      </div>

      <div class="keyframes-area" ref="keyframesAreaRef">
        <div class="timeline-ruler" ref="rulerRef">
          <div
            v-for="frame in rulerFrames"
            :key="frame"
            class="ruler-mark"
            :style="{ left: `${frame * pixelsPerFrame}px` }"
          >
            <span class="ruler-label" v-if="frame % 10 === 0">{{ frame }}</span>
          </div>
        </div>

        <div class="keyframes-container">
          <div
            v-for="bone in allBones"
            :key="bone.id"
            class="keyframe-row"
          >
            <div
              v-for="keyframe in getKeyframesForBone(bone.id)"
              :key="`${bone.id}-${keyframe}`"
              class="keyframe-diamond"
              :class="{
                selected: keyframe === selectedKeyframeFrame,
                hasBezier: getKeyframeInterpolation(keyframe) === 'bezier'
              }"
              :style="{ left: `${keyframe * pixelsPerFrame - 6}px` }"
              @click.stop="onSelectKeyframe(keyframe)"
              @mousedown.stop="onStartDragKeyframe($event, keyframe)"
              @contextmenu.prevent="onKeyframeContextMenu($event, keyframe)"
            >
              <span class="diamond-inner"></span>
            </div>
          </div>
        </div>

        <div
          class="playhead"
          :style="{ left: `${currentFrame * pixelsPerFrame}px` }"
        ></div>

        <div
          class="scrubber-area"
          @mousedown="onScrubberMouseDown"
        ></div>
      </div>
    </div>

    <div class="timeline-footer">
      <div class="keyframe-actions">
        <button class="btn btn-primary" @click="onAddKeyframe">
          ➕ Add Keyframe
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!selectedKeyframeFrame"
          @click="onDeleteSelectedKeyframe"
        >
          🗑️ Delete
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!selectedKeyframeFrame"
          @click="onCopyKeyframe"
        >
          📋 Copy
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!hasCopiedKeyframe"
          @click="onPasteKeyframe"
        >
          📄 Paste
        </button>
        <div class="interpolation-select" v-if="selectedKeyframeFrame">
          <label>Interpolation:</label>
          <select
            :value="getKeyframeInterpolation(selectedKeyframeFrame)"
            class="property-input small"
            @change="onInterpolationChange($event)"
          >
            <option value="linear">Linear</option>
            <option value="bezier">Bezier</option>
          </select>
        </div>
      </div>

      <div class="timeline-info">
        <span>{{ formatTime(currentFrame) }} / {{ formatTime(maxFrames) }}</span>
        <span>{{ currentFrame }} / {{ maxFrames }} frames</span>
      </div>
    </div>

    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }"
    >
      <button class="context-item" @click="onContextDelete">🗑️ Delete Keyframe</button>
      <button class="context-item" @click="onContextCopy">📋 Copy Keyframe</button>
      <button class="context-item" @click="onContextPaste">📄 Paste Keyframe</button>
      <div class="context-divider"></div>
      <button class="context-item" @click="onContextLinear">📏 Set Linear</button>
      <button class="context-item" @click="onContextBezier">🔵 Set Bezier</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useAnimation } from '@/composables/useAnimation';
import { useSkeleton } from '@/composables/useSkeleton';
import { DEFAULT_FPS } from '@/utils/constants';

const {
  allClips,
  currentClipId,
  currentClip,
  isPlaying,
  currentFrame,
  selectedKeyframe,
  fps,
  playbackState,
  selectClip,
  addClip,
  duplicateClip,
  removeClip,
  togglePlayback,
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
  getKeyframesForBone,
  hasKeyframeAtFrame,
} = useAnimation();

const { allBones, selectedBoneId, selectBone } = useSkeleton();

const keyframesAreaRef = ref<HTMLDivElement | null>(null);
const rulerRef = ref<HTMLDivElement | null>(null);

const pixelsPerFrame = 8;
const fpsValue = ref(DEFAULT_FPS);
const speedValue = ref(1);
const frameValue = ref(0);
const selectedClipId = ref<string | null>(null);
const selectedKeyframeFrame = ref<number | null>(null);
const draggingKeyframe = ref<number | null>(null);
const dragStartFrame = ref(0);
const dragStartX = ref(0);
const looping = ref(true);
const hasCopiedKeyframe = ref(false);

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  frame: 0,
});

const maxFrames = computed(() => {
  if (!currentClip.value) return 100;
  const maxKf = Math.max(...currentClip.value.keyframes.map((kf) => kf.frame), 0);
  return Math.max(maxKf + 30, 100);
});

const rulerFrames = computed(() => {
  const frames: number[] = [];
  for (let i = 0; i <= maxFrames.value; i += 5) {
    frames.push(i);
  }
  return frames;
});

watch(currentClipId, (id) => {
  selectedClipId.value = id;
});

watch(currentFrame, (frame) => {
  frameValue.value = Math.floor(frame);
});

watch(playbackState, (state) => {
  fpsValue.value = state.fps;
  speedValue.value = state.speed;
  looping.value = state.loop;
}, { deep: true });

function onClipChange() {
  if (selectedClipId.value) {
    selectClip(selectedClipId.value);
  }
}

function onAddClip() {
  const name = prompt('Enter clip name:', `Clip ${allClips.value.length + 1}`);
  if (name) {
    const clip = addClip(name);
    selectedClipId.value = clip.id;
  }
}

function onDuplicateClip() {
  if (selectedClipId.value) {
    const original = allClips.value.find((c) => c.id === selectedClipId.value);
    if (original) {
      const newName = prompt('Enter new clip name:', `${original.name} Copy`);
      if (newName) {
        duplicateClip(selectedClipId.value, newName);
      }
    }
  }
}

function onDeleteClip() {
  if (allClips.value.length <= 1) return;
  if (selectedClipId.value && confirm('Delete this clip?')) {
    removeClip(selectedClipId.value);
  }
}

function onFpsChange() {
  if (fpsValue.value > 0 && currentClip.value) {
    currentClip.value.fps = fpsValue.value;
  }
}

function onSpeedChange() {
  setPlaybackSpeed(speedValue.value);
}

function onFrameChange() {
  goToFrame(frameValue.value);
}

function onLoopChange() {
  setLooping(looping.value);
}

function goToStart() {
  goToFrame(0);
}

function goToEnd() {
  goToFrame(maxFrames.value);
}

function onAddKeyframe() {
  recordKeyframe();
}

function onDeleteSelectedKeyframe() {
  if (selectedKeyframeFrame.value !== null) {
    deleteKeyframe(selectedKeyframeFrame.value);
    selectedKeyframeFrame.value = null;
  }
}

function onCopyKeyframe() {
  if (selectedKeyframeFrame.value !== null) {
    copyKeyframeData(selectedKeyframeFrame.value);
    hasCopiedKeyframe.value = true;
  }
}

function onPasteKeyframe() {
  pasteKeyframeData(Math.floor(currentFrame.value));
}

function getKeyframeInterpolation(frame: number): 'linear' | 'bezier' {
  if (!currentClip.value) return 'linear';
  const kf = currentClip.value.keyframes.find((k) => k.frame === frame);
  return kf?.interpolation || 'linear';
}

function onInterpolationChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  if (selectedKeyframeFrame.value !== null) {
    setKeyframeInterpolationMode(selectedKeyframeFrame.value, target.value as 'linear' | 'bezier');
  }
}

function onSelectKeyframe(frame: number) {
  selectedKeyframeFrame.value = frame;
  goToFrame(frame);
}

function onStartDragKeyframe(event: MouseEvent, frame: number) {
  draggingKeyframe.value = frame;
  dragStartFrame.value = frame;
  dragStartX.value = event.clientX;

  document.addEventListener('mousemove', onDragKeyframe);
  document.addEventListener('mouseup', onEndDragKeyframe);
}

function onDragKeyframe(event: MouseEvent) {
  if (draggingKeyframe.value === null) return;

  const deltaX = event.clientX - dragStartX.value;
  const deltaFrames = Math.round(deltaX / pixelsPerFrame);
  const newFrame = Math.max(0, dragStartFrame.value + deltaFrames);

  if (newFrame !== draggingKeyframe.value) {
    if (!hasKeyframeAtFrame(newFrame)) {
      moveKeyframePosition(draggingKeyframe.value, newFrame);
      draggingKeyframe.value = newFrame;
      selectedKeyframeFrame.value = newFrame;
      goToFrame(newFrame);
    }
  }
}

function onEndDragKeyframe() {
  draggingKeyframe.value = null;
  document.removeEventListener('mousemove', onDragKeyframe);
  document.removeEventListener('mouseup', onEndDragKeyframe);
}

function onKeyframeContextMenu(event: MouseEvent, frame: number) {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    frame,
  };
  selectedKeyframeFrame.value = frame;

  setTimeout(() => {
    document.addEventListener('click', closeContextMenu, { once: true });
  }, 0);
}

function closeContextMenu() {
  contextMenu.value.visible = false;
}

function onContextDelete() {
  deleteKeyframe(contextMenu.value.frame);
  closeContextMenu();
}

function onContextCopy() {
  copyKeyframeData(contextMenu.value.frame);
  hasCopiedKeyframe.value = true;
  closeContextMenu();
}

function onContextPaste() {
  pasteKeyframeData(contextMenu.value.frame);
  closeContextMenu();
}

function onContextLinear() {
  setKeyframeInterpolationMode(contextMenu.value.frame, 'linear');
  closeContextMenu();
}

function onContextBezier() {
  setKeyframeInterpolationMode(contextMenu.value.frame, 'bezier');
  closeContextMenu();
}

function onScrubberMouseDown(event: MouseEvent) {
  if (!keyframesAreaRef.value) return;

  const rect = keyframesAreaRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const frame = Math.round(x / pixelsPerFrame);
  goToFrame(Math.max(0, Math.min(frame, maxFrames.value)));

  const onMouseMove = (e: MouseEvent) => {
    const rect2 = keyframesAreaRef.value!.getBoundingClientRect();
    const x2 = e.clientX - rect2.left;
    const frame2 = Math.round(x2 / pixelsPerFrame);
    goToFrame(Math.max(0, Math.min(frame2, maxFrames.value)));
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function formatTime(frame: number): string {
  const totalSeconds = frame / fps.value;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 100);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragKeyframe);
  document.removeEventListener('mouseup', onEndDragKeyframe);
});
</script>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e2e;
  border-top: 1px solid #333348;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #252538;
  border-bottom: 1px solid #333348;
  gap: 16px;
}

.timeline-controls,
.playback-controls,
.timeline-settings {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clip-selector {
  display: flex;
  align-items: center;
  gap: 4px;
}

.property-input {
  padding: 4px 8px;
  background: #1a1a2e;
  border: 1px solid #333348;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

.property-input:focus {
  outline: none;
  border-color: #4a9eff;
}

.property-input.small {
  width: 60px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333348;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) {
  background: #444458;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.play-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333348;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.play-btn:hover {
  background: #444458;
}

.play-btn.play-pause {
  width: 40px;
  background: #4a9eff;
}

.play-btn.play-pause:hover {
  background: #3a8eef;
}

.divider {
  width: 1px;
  height: 24px;
  background: #333348;
  margin: 0 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.setting-label {
  font-size: 11px;
  color: #888;
}

.timeline-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.bone-tracks {
  width: 160px;
  background: #252538;
  border-right: 1px solid #333348;
  overflow-y: auto;
  flex-shrink: 0;
}

.bone-track {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 8px;
  border-bottom: 1px solid #1a1a2e;
  cursor: pointer;
  transition: background 0.15s;
}

.bone-track:hover {
  background: rgba(74, 158, 255, 0.1);
}

.bone-track.selected {
  background: rgba(74, 158, 255, 0.25);
}

.track-name {
  font-size: 11px;
  color: #ccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.keyframes-area {
  flex: 1;
  position: relative;
  overflow-x: auto;
  overflow-y: auto;
}

.timeline-ruler {
  position: sticky;
  top: 0;
  height: 24px;
  background: #252538;
  border-bottom: 1px solid #333348;
  z-index: 10;
  min-width: 2000px;
}

.ruler-mark {
  position: absolute;
  top: 0;
  height: 100%;
  width: 1px;
  background: #333348;
}

.ruler-mark:nth-child(2n) .ruler-label {
  display: none;
}

.ruler-label {
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 10px;
  color: #888;
  font-family: 'Consolas', monospace;
}

.keyframes-container {
  position: relative;
  min-width: 2000px;
}

.keyframe-row {
  position: relative;
  height: 28px;
  border-bottom: 1px solid #1a1a2e;
}

.keyframe-diamond {
  position: absolute;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 12px;
  height: 12px;
  background: #4a9eff;
  border: 2px solid #fff;
  cursor: pointer;
  transition: all 0.15s;
  z-index: 5;
}

.keyframe-diamond:hover {
  transform: translateY(-50%) rotate(45deg) scale(1.2);
  box-shadow: 0 0 8px rgba(74, 158, 255, 0.8);
}

.keyframe-diamond.selected {
  background: #ff6b6b;
  box-shadow: 0 0 10px rgba(255, 107, 107, 0.8);
}

.keyframe-diamond.hasBezier {
  background: #9b59b6;
}

.keyframe-diamond.hasBezier.selected {
  background: #ff6b6b;
}

.diamond-inner {
  display: none;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ff6b6b;
  z-index: 20;
  pointer-events: none;
}

.playhead::before {
  content: '';
  position: absolute;
  top: 0;
  left: -5px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 8px solid #ff6b6b;
}

.scrubber-area {
  position: absolute;
  top: 24px;
  left: 0;
  right: 0;
  bottom: 0;
  cursor: ew-resize;
}

.timeline-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #252538;
  border-top: 1px solid #333348;
}

.keyframe-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #4a9eff;
  color: #fff;
}

.btn-primary:hover {
  background: #3a8eef;
}

.btn-secondary {
  background: #333348;
  color: #ccc;
}

.btn-secondary:hover:not(:disabled) {
  background: #444458;
  color: #fff;
}

.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.interpolation-select {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 12px;
  border-left: 1px solid #333348;
  font-size: 12px;
  color: #888;
}

.timeline-info {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: #888;
  font-family: 'Consolas', monospace;
}

.context-menu {
  position: fixed;
  background: #2a2a3e;
  border: 1px solid #333348;
  border-radius: 6px;
  padding: 4px;
  z-index: 1000;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.context-item:hover {
  background: rgba(74, 158, 255, 0.2);
  color: #fff;
}

.context-divider {
  height: 1px;
  background: #333348;
  margin: 4px 0;
}
</style>
