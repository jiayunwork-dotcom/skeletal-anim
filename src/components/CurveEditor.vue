<template>
  <div class="curve-editor">
    <div class="curve-editor-header">
      <h4 class="curve-editor-title">
        <span class="curve-icon">📈</span>
        曲线编辑器
      </h4>
      <div class="curve-presets">
        <button
          v-for="preset in presets"
          :key="preset.type"
          class="preset-btn"
          :class="{ active: currentPreset === preset.type }"
          :title="preset.label"
          @click="onApplyPreset(preset.type)"
        >
          {{ preset.icon }}
        </button>
      </div>
    </div>

    <div v-if="!boneId || keyframeFrames.length === 0" class="curve-empty">
      <span v-if="!boneId">请先选择骨骼</span>
      <span v-else-if="keyframeFrames.length === 0">当前骨骼暂无关键帧</span>
    </div>

    <div v-else class="curve-canvas-container" ref="containerRef">
      <svg
        class="curve-svg"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        preserveAspectRatio="none"
        @mousedown="onSvgMouseDown"
        @mousemove="onSvgMouseMove"
        @mouseup="onSvgMouseUp"
        @mouseleave="onSvgMouseUp"
        @wheel="onWheel"
      >
        <defs>
          <linearGradient id="gridGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2a2a3e" stop-opacity="1" />
            <stop offset="100%" stop-color="#1a1a2e" stop-opacity="1" />
          </linearGradient>
        </defs>

        <rect
          :width="svgWidth"
          :height="svgHeight"
          fill="url(#gridGradient)"
        />

        <g class="grid-lines">
          <line
            v-for="(x, i) in gridLinesX"
            :key="'gx-' + i"
            :x1="x"
            :y1="paddingTop"
            :x2="x"
            :y2="svgHeight - paddingBottom"
            stroke="#333348"
            stroke-width="1"
            stroke-dasharray="2,2"
          />
          <line
            v-for="(y, i) in gridLinesY"
            :key="'gy-' + i"
            :x1="paddingLeft"
            :y1="y"
            :x2="svgWidth - paddingRight"
            :y2="y"
            stroke="#333348"
            stroke-width="1"
            stroke-dasharray="2,2"
          />
        </g>

        <line
          :x1="paddingLeft"
          :y1="zeroLineY"
          :x2="svgWidth - paddingRight"
          :y2="zeroLineY"
          stroke="#555568"
          stroke-width="1.5"
        />

        <g class="axis-labels">
          <text
            v-for="(label, i) in xLabels"
            :key="'xl-' + i"
            :x="label.x"
            :y="svgHeight - paddingBottom + 14"
            fill="#888"
            font-size="9"
            text-anchor="middle"
            font-family="Consolas, monospace"
          >
            {{ label.text }}
          </text>
          <text
            v-for="(label, i) in yLabels"
            :key="'yl-' + i"
            :x="paddingLeft - 6"
            :y="label.y + 3"
            fill="#888"
            font-size="9"
            text-anchor="end"
            font-family="Consolas, monospace"
          >
            {{ label.text }}
          </text>
        </g>

        <line
          v-if="currentFrame >= minFrame && currentFrame <= maxFrame"
          :x1="frameToX(currentFrame)"
          :y1="paddingTop"
          :x2="frameToX(currentFrame)"
          :y2="svgHeight - paddingBottom"
          stroke="#ff6b6b"
          stroke-width="1.5"
          stroke-dasharray="4,4"
          opacity="0.8"
        />

        <rect
          v-if="isBoxSelecting"
          :x="Math.min(boxSelectStart.x, boxSelectEnd.x)"
          :y="Math.min(boxSelectStart.y, boxSelectEnd.y)"
          :width="Math.abs(boxSelectEnd.x - boxSelectStart.x)"
          :height="Math.abs(boxSelectEnd.y - boxSelectStart.y)"
          fill="rgba(74, 158, 255, 0.15)"
          stroke="#4a9eff"
          stroke-width="1"
          stroke-dasharray="3,3"
        />

        <g v-for="(axis, axisIdx) in axes" :key="'curve-' + axis.name">
          <path
            :d="getCurvePath(axisIdx)"
            :stroke="axis.color"
            stroke-width="2"
            fill="none"
            :opacity="visibleAxes.includes(axis.name) ? 1 : 0.15"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        </g>

        <g v-for="(axis, axisIdx) in axes" :key="'handles-' + axis.name">
          <g
            v-for="frame in keyframeFrames"
            :key="'handle-' + axis.name + '-' + frame"
            v-show="visibleAxes.includes(axis.name) && isKeyframeSelected(frame)"
          >
            <g v-if="getPrevKeyframe(frame) !== null">
              <line
                :x1="frameToX(frame)"
                :y1="valueToY(getKeyframeValue(frame, axisIdx))"
                :x2="getHandlePosition(frame, axisIdx, 0).x"
                :y2="getHandlePosition(frame, axisIdx, 0).y"
                :stroke="axis.color"
                stroke-width="1"
                stroke-dasharray="3,3"
                opacity="0.8"
              />
              <circle
                :cx="getHandlePosition(frame, axisIdx, 0).x"
                :cy="getHandlePosition(frame, axisIdx, 0).y"
                r="5"
                :fill="axis.color"
                stroke="#fff"
                stroke-width="1.5"
                class="handle-point handle-in"
                :data-frame="frame"
                :data-axis="axisIdx"
                :data-handle="0"
                @mousedown.stop="onHandleMouseDown($event, frame, axisIdx, 0)"
              />
            </g>
            <g v-if="getNextKeyframe(frame) !== null">
              <line
                :x1="frameToX(frame)"
                :y1="valueToY(getKeyframeValue(frame, axisIdx))"
                :x2="getHandlePosition(frame, axisIdx, 1).x"
                :y2="getHandlePosition(frame, axisIdx, 1).y"
                :stroke="axis.color"
                stroke-width="1"
                stroke-dasharray="3,3"
                opacity="0.8"
              />
              <circle
                :cx="getHandlePosition(frame, axisIdx, 1).x"
                :cy="getHandlePosition(frame, axisIdx, 1).y"
                r="5"
                :fill="axis.color"
                stroke="#fff"
                stroke-width="1.5"
                class="handle-point handle-out"
                :data-frame="frame"
                :data-axis="axisIdx"
                :data-handle="1"
                @mousedown.stop="onHandleMouseDown($event, frame, axisIdx, 1)"
              />
            </g>
          </g>
        </g>

        <g v-for="(axis, axisIdx) in axes" :key="'kf-' + axis.name">
          <g v-for="frame in keyframeFrames" :key="'kf-' + axis.name + '-' + frame">
            <circle
              :cx="frameToX(frame)"
              :cy="valueToY(getKeyframeValue(frame, axisIdx))"
              :r="isKeyframeSelected(frame) ? 7 : 5"
              :fill="axis.color"
              :stroke="isKeyframeSelected(frame) ? '#ff6b6b' : '#fff'"
              :stroke-width="isKeyframeSelected(frame) ? 3 : 2"
              class="keyframe-point"
              :class="{
                selected: isKeyframeSelected(frame),
                hidden: !visibleAxes.includes(axis.name)
              }"
              :data-frame="frame"
              :data-axis="axisIdx"
              v-show="visibleAxes.includes(axis.name)"
              @mousedown.stop="onKeyframeMouseDown($event, frame, axisIdx)"
              @click.stop="onKeyframeClick(frame)"
            />
          </g>
        </g>
      </svg>

      <div class="axis-toggles">
        <button
          v-for="axis in axes"
          :key="'toggle-' + axis.name"
          class="axis-toggle"
          :class="{ active: visibleAxes.includes(axis.name) }"
          :style="{ borderColor: axis.color }"
          @click="toggleAxis(axis.name)"
        >
          <span class="toggle-color" :style="{ background: axis.color }"></span>
          <span class="toggle-label">{{ axis.name }}</span>
        </button>
      </div>
    </div>

    <div v-if="keyframeFrames.length > 0" class="curve-editor-footer">
      <div class="selection-info">
        <span>已选中 {{ selectedKeyframes.size }} 个关键帧</span>
        <span v-if="selectedKeyframes.size > 0" class="hint">
          拖拽平移 | Ctrl+拖拽缩放 | Shift+拖拽解对称
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { useAnimation } from '@/composables/useAnimation';
import type { CurvePresetType } from '@/composables/useAnimation';
import { Keyframe } from '@/core/animation/Keyframe';
import { degreesToRadians, radiansToDegrees } from '@/utils/math';

const props = defineProps<{
  boneId: string | null;
  selectedFrame: number | null;
}>();

const emit = defineEmits<{
  (e: 'selectKeyframe', frame: number): void;
  (e: 'updateBoneRotation', frame: number, rotation: THREE.Euler): void;
}>();

const {
  currentClip,
  currentFrame,
  getKeyframesForBone,
  curveEditorSelectedKeyframes,
  setCurveEditorSelectedKeyframes,
  addCurveEditorSelectedKeyframe,
  clearCurveEditorSelectedKeyframes,
  goToFrame,
  setBezierHandle,
  getBezierHandles,
  applyCurvePreset,
  applyPresetToSelectedFrames,
  batchScaleKeyframes,
  batchMoveKeyframes,
} = useAnimation();

const containerRef = ref<HTMLDivElement | null>(null);
const svgWidth = ref(600);
const svgHeight = ref(320);
const paddingLeft = 44;
const paddingRight = 16;
const paddingTop = 16;
const paddingBottom = 28;

const visibleAxes = ref<string[]>(['X', 'Y', 'Z']);
const currentPreset = ref<CurvePresetType | null>(null);

const presets: { type: CurvePresetType; label: string; icon: string }[] = [
  { type: 'linear', label: '线性', icon: '📏' },
  { type: 'easeIn', label: '缓入', icon: '↗️' },
  { type: 'easeOut', label: '缓出', icon: '↘️' },
  { type: 'easeInOut', label: '缓入缓出', icon: '🔄' },
  { type: 'elastic', label: '弹性', icon: '🎯' },
  { type: 'step', label: '阶梯', icon: '🪜' },
];

const axes = [
  { name: 'X', color: '#ff5555' },
  { name: 'Y', color: '#55ff55' },
  { name: 'Z', color: '#5555ff' },
];

type DragMode =
  | { kind: 'none' }
  | { kind: 'keyframe'; startX: number; startY: number; startFrames: Map<number, { frame: number; values: [number, number, number] }> }
  | { kind: 'handle'; frame: number; axis: number; handle: 0 | 1; startX: number; startY: number; startHandle: THREE.Vector3; symmetric: boolean }
  | { kind: 'boxSelect'; startX: number; startY: number }
  | { kind: 'pan'; startX: number; startY: number }
  | { kind: 'zoom' };

const dragMode = ref<DragMode>({ kind: 'none' });
const viewOffset = ref({ x: 0, y: 0 });
const viewScale = ref({ x: 1, y: 1 });
const isBoxSelecting = ref(false);
const boxSelectStart = ref({ x: 0, y: 0 });
const boxSelectEnd = ref({ x: 0, y: 0 });

const selectedKeyframes = computed(() => {
  const s = new Set<number>();
  if (props.selectedFrame !== null) {
    s.add(props.selectedFrame);
  }
  curveEditorSelectedKeyframes.value.forEach((f) => s.add(f));
  return s;
});

const keyframeFrames = computed(() => {
  if (!props.boneId) return [];
  const frames = getKeyframesForBone(props.boneId);
  return frames;
});

const minFrame = computed(() => {
  if (keyframeFrames.value.length === 0) return 0;
  return Math.max(0, Math.min(...keyframeFrames.value) - 5);
});

const maxFrame = computed(() => {
  if (keyframeFrames.value.length === 0) return 100;
  const max = Math.max(...keyframeFrames.value);
  const fromClip = currentClip.value?.duration || 60;
  return Math.max(max + 5, fromClip);
});

const valueMin = -180;
const valueMax = 180;

const zeroLineY = computed(() => {
  return valueToY(0);
});

const gridLinesX = computed(() => {
  const lines: number[] = [];
  const span = maxFrame.value - minFrame.value;
  let step = 10;
  if (span > 200) step = 50;
  if (span > 500) step = 100;
  if (span < 50) step = 5;
  if (span < 20) step = 2;

  for (let f = Math.ceil(minFrame.value / step) * step; f <= maxFrame.value; f += step) {
    lines.push(frameToX(f));
  }
  return lines;
});

const gridLinesY = computed(() => {
  const lines: number[] = [];
  const step = 45;
  for (let v = valueMin; v <= valueMax; v += step) {
    lines.push(valueToY(v));
  }
  return lines;
});

const xLabels = computed(() => {
  const labels: { x: number; text: string }[] = [];
  const span = maxFrame.value - minFrame.value;
  let step = 10;
  if (span > 200) step = 50;
  if (span > 500) step = 100;
  if (span < 50) step = 10;

  for (let f = Math.ceil(minFrame.value / step) * step; f <= maxFrame.value; f += step) {
    labels.push({ x: frameToX(f), text: String(f) });
  }
  return labels;
});

const yLabels = computed(() => {
  const labels: { y: number; text: string }[] = [];
  const step = 45;
  for (let v = valueMin; v <= valueMax; v += step) {
    labels.push({ y: valueToY(v), text: String(v) });
  }
  return labels;
});

function frameToX(frame: number): number {
  const range = maxFrame.value - minFrame.value || 1;
  const chartWidth = svgWidth.value - paddingLeft - paddingRight;
  const normalized = (frame - minFrame.value) / range;
  return paddingLeft + normalized * chartWidth * viewScale.value.x + viewOffset.value.x;
}

function xToFrame(x: number): number {
  const chartWidth = svgWidth.value - paddingLeft - paddingRight;
  const normalized = (x - paddingLeft - viewOffset.value.x) / (chartWidth * viewScale.value.x);
  const range = maxFrame.value - minFrame.value || 1;
  return minFrame.value + normalized * range;
}

function valueToY(degrees: number): number {
  const range = valueMax - valueMin;
  const chartHeight = svgHeight.value - paddingTop - paddingBottom;
  const normalized = (degrees - valueMin) / range;
  return paddingTop + (1 - normalized) * chartHeight * viewScale.value.y + viewOffset.value.y;
}

function yToValue(y: number): number {
  const chartHeight = svgHeight.value - paddingTop - paddingBottom;
  const normalized = 1 - (y - paddingTop - viewOffset.value.y) / (chartHeight * viewScale.value.y);
  const range = valueMax - valueMin;
  return valueMin + normalized * range;
}

function getKeyframeValue(frame: number, axisIdx: number): number {
  if (!currentClip.value || !props.boneId) return 0;
  const kf = currentClip.value.getKeyframeAt(frame);
  if (!kf) return 0;
  const rot = kf.getBoneRotation(props.boneId);
  if (!rot) return 0;
  const vals = [rot.x, rot.y, rot.z];
  return radiansToDegrees(vals[axisIdx]);
}

function getPrevKeyframe(frame: number): number | null {
  const idx = keyframeFrames.value.indexOf(frame);
  if (idx <= 0) return null;
  return keyframeFrames.value[idx - 1];
}

function getNextKeyframe(frame: number): number | null {
  const idx = keyframeFrames.value.indexOf(frame);
  if (idx < 0 || idx >= keyframeFrames.value.length - 1) return null;
  return keyframeFrames.value[idx + 1];
}

function getHandlePosition(
  frame: number,
  axisIdx: number,
  handleIdx: 0 | 1
): { x: number; y: number } {
  if (!currentClip.value || !props.boneId) return { x: 0, y: 0 };
  const handles = getBezierHandles(frame, props.boneId);
  if (!handles) return { x: frameToX(frame), y: valueToY(getKeyframeValue(frame, axisIdx)) };

  const h = handles[handleIdx];
  const adjFrame = frame + h.x * Math.max(1, (maxFrame.value - minFrame.value) * 0.3);
  const curVal = getKeyframeValue(frame, axisIdx);
  const nextKf = handleIdx === 1 ? getNextKeyframe(frame) : getPrevKeyframe(frame);
  let valRange = 180;
  if (nextKf !== null) {
    valRange = Math.abs(getKeyframeValue(nextKf, axisIdx) - curVal) || 180;
  }
  const adjVal = curVal + h.y * valRange;

  return {
    x: frameToX(adjFrame),
    y: valueToY(adjVal),
  };
}

function getCurvePath(axisIdx: number): string {
  if (!props.boneId || !currentClip.value || keyframeFrames.value.length === 0) {
    return '';
  }

  const frames = keyframeFrames.value;
  let path = '';

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const x = frameToX(frame);
    const y = valueToY(getKeyframeValue(frame, axisIdx));

    if (i === 0) {
      path += `M ${x} ${y}`;
    }

    if (i < frames.length - 1) {
      const nextFrame = frames[i + 1];
      const kf1 = currentClip.value.getKeyframeAt(frame);
      const kf2 = currentClip.value.getKeyframeAt(nextFrame);

      if (kf1 && kf2 && kf1.interpolation === 'bezier') {
        const samples = Keyframe.sampleBezierCurve(kf1, kf2, props.boneId, axisIdx, 30);
        for (let s = 1; s < samples.length; s++) {
          const sx = frameToX(samples[s].frame);
          const sy = valueToY(radiansToDegrees(samples[s].value));
          path += ` L ${sx} ${sy}`;
        }
      } else {
        const nextX = frameToX(nextFrame);
        const nextY = valueToY(getKeyframeValue(nextFrame, axisIdx));
        path += ` L ${nextX} ${nextY}`;
      }
    }
  }

  return path;
}

function isKeyframeSelected(frame: number): boolean {
  return selectedKeyframes.value.has(frame);
}

function onKeyframeClick(frame: number) {
  emit('selectKeyframe', frame);
  goToFrame(frame);
}

function onKeyframeMouseDown(event: MouseEvent, frame: number, axisIdx: number) {
  if (event.button !== 0) return;

  event.preventDefault();
  const svg = (event.currentTarget as SVGElement).ownerSVGElement;
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const scaleX = svgWidth.value / rect.width;
  const scaleY = svgHeight.value / rect.height;
  const startX = (event.clientX - rect.left) * scaleX;
  const startY = (event.clientY - rect.top) * scaleY;

  if (!isKeyframeSelected(frame)) {
    if (!event.shiftKey) {
      setCurveEditorSelectedKeyframes([frame]);
    } else {
      addCurveEditorSelectedKeyframe(frame);
    }
    emit('selectKeyframe', frame);
  }

  const startFrames = new Map<number, { frame: number; values: [number, number, number] }>();
  selectedKeyframes.value.forEach((f) => {
    if (!currentClip.value || !props.boneId) return;
    const kf = currentClip.value.getKeyframeAt(f);
    if (!kf) return;
    const rot = kf.getBoneRotation(props.boneId);
    if (!rot) return;
    startFrames.set(f, {
      frame: f,
      values: [
        radiansToDegrees(rot.x),
        radiansToDegrees(rot.y),
        radiansToDegrees(rot.z),
      ],
    });
  });

  dragMode.value = {
    kind: 'keyframe',
    startX,
    startY,
    startFrames,
  };
}

function onHandleMouseDown(
  event: MouseEvent,
  frame: number,
  axisIdx: number,
  handleIdx: 0 | 1
) {
  if (event.button !== 0) return;

  event.preventDefault();
  event.stopPropagation();

  const svg = (event.currentTarget as SVGElement).ownerSVGElement;
  if (!svg || !props.boneId) return;

  const rect = svg.getBoundingClientRect();
  const scaleX = svgWidth.value / rect.width;
  const scaleY = svgHeight.value / rect.height;
  const startX = (event.clientX - rect.left) * scaleX;
  const startY = (event.clientY - rect.top) * scaleY;

  const handles = getBezierHandles(frame, props.boneId);
  if (!handles) return;

  emit('selectKeyframe', frame);
  goToFrame(frame);

  dragMode.value = {
    kind: 'handle',
    frame,
    axis: axisIdx,
    handle: handleIdx,
    startX,
    startY,
    startHandle: handles[handleIdx].clone(),
    symmetric: !event.shiftKey,
  };
}

function onSvgMouseDown(event: MouseEvent) {
  if (event.button !== 0) return;

  const target = event.target as SVGElement;
  if (
    target.classList.contains('keyframe-point') ||
    target.classList.contains('handle-point')
  ) {
    return;
  }

  const svg = target.closest('svg');
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const scaleX = svgWidth.value / rect.width;
  const scaleY = svgHeight.value / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  if (event.ctrlKey || event.metaKey) {
    dragMode.value = { kind: 'zoom', startX: x, startY: y } as any;
  } else if (event.shiftKey) {
    dragMode.value = { kind: 'pan', startX: x, startY: y };
  } else {
    isBoxSelecting.value = true;
    boxSelectStart.value = { x, y };
    boxSelectEnd.value = { x, y };
    dragMode.value = { kind: 'boxSelect', startX: x, startY: y };
    if (!event.shiftKey) {
      clearCurveEditorSelectedKeyframes();
    }
  }
}

function onSvgMouseMove(event: MouseEvent) {
  const svg = (event.currentTarget as SVGElement);
  const rect = svg.getBoundingClientRect();
  const scaleX = svgWidth.value / rect.width;
  const scaleY = svgHeight.value / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  if (dragMode.value.kind === 'keyframe' && props.boneId) {
    const dx = x - dragMode.value.startX;
    const dy = y - dragMode.value.startY;

    const chartWidth = svgWidth.value - paddingLeft - paddingRight;
    const chartHeight = svgHeight.value - paddingTop - paddingBottom;
    const frameRange = maxFrame.value - minFrame.value || 1;
    const valueRange = valueMax - valueMin;

    const frameDelta = (dx / (chartWidth * viewScale.value.x)) * frameRange;
    const valueDeltaDeg = -(dy / (chartHeight * viewScale.value.y)) * valueRange;

    if (event.ctrlKey || event.metaKey) {
      const frames = Array.from(selectedKeyframes.value);
      const sortedFrames = [...frames].sort((a, b) => a - b);
      if (sortedFrames.length >= 1) {
        const centerFrame = (sortedFrames[0] + sortedFrames[sortedFrames.length - 1]) / 2;
        
        let allValues: number[] = [];
        sortedFrames.forEach((f) => {
          const data = dragMode.value!.kind === 'keyframe' ? dragMode.value.startFrames.get(f) : null;
          if (data) {
            allValues.push(...data.values);
          }
        });
        const centerValue = allValues.length > 0
          ? allValues.reduce((a, b) => a + b, 0) / allValues.length
          : 0;

        const rawScaleY = 1 + (dy / (chartHeight * 0.5));
        const scaleFactor = Math.max(0.1, Math.min(3, rawScaleY));
        batchScaleKeyframes(props.boneId, frames, scaleFactor, centerFrame, centerValue);
      }
    } else {
      const valueDelta = new THREE.Vector3(
        degreesToRadians(valueDeltaDeg),
        degreesToRadians(valueDeltaDeg),
        degreesToRadians(valueDeltaDeg)
      );
      const currentFrames = Array.from(selectedKeyframes.value);
      batchMoveKeyframes(props.boneId, currentFrames, Math.round(frameDelta), valueDelta);
    }
  } else if (dragMode.value.kind === 'handle' && props.boneId) {
    const dm = dragMode.value;
    const dx = x - dm.startX;
    const dy = y - dm.startY;

    const chartWidth = svgWidth.value - paddingLeft - paddingRight;
    const chartHeight = svgHeight.value - paddingTop - paddingBottom;
    const frameSpan = Math.max(1, (maxFrame.value - minFrame.value) * 0.3);
    const curVal = getKeyframeValue(dm.frame, dm.axis);
    const nextKf = dm.handle === 1 ? getNextKeyframe(dm.frame) : getPrevKeyframe(dm.frame);
    let valSpan = 180;
    if (nextKf !== null) {
      valSpan = Math.abs(getKeyframeValue(nextKf, dm.axis) - curVal) || 180;
    }

    const deltaXNorm = (dx / (chartWidth * viewScale.value.x)) * (frameSpan / frameSpan);
    const deltaYNorm = -(dy / (chartHeight * viewScale.value.y)) * (180 / valSpan);

    let newHandleX = dm.startHandle.x + deltaXNorm * 0.3;
    let newHandleY = dm.startHandle.y + deltaYNorm;

    if (dm.handle === 0) {
      newHandleX = Math.min(-0.01, Math.max(-1, newHandleX));
    } else {
      newHandleX = Math.max(0.01, Math.min(1, newHandleX));
    }
    newHandleY = Math.max(-2, Math.min(2, newHandleY));

    const newHandle = new THREE.Vector3(newHandleX, newHandleY, dm.startHandle.z);
    setBezierHandle(dm.frame, props.boneId, dm.handle, newHandle);

    if (dm.symmetric) {
      const otherHandleIdx: 0 | 1 = dm.handle === 0 ? 1 : 0;
      const symmetricHandle = new THREE.Vector3(-newHandleX, -newHandleY, dm.startHandle.z);
      const hasOtherSide = dm.handle === 0
        ? getNextKeyframe(dm.frame) !== null
        : getPrevKeyframe(dm.frame) !== null;
      const originalHasOther = dm.handle === 0
        ? getPrevKeyframe(dm.frame) !== null
        : getNextKeyframe(dm.frame) !== null;
      if (originalHasOther) {
        setBezierHandle(dm.frame, props.boneId, otherHandleIdx, symmetricHandle);
      }
    }
  } else if (dragMode.value.kind === 'boxSelect') {
    boxSelectEnd.value = { x, y };

    if (props.boneId && keyframeFrames.value.length > 0) {
      const minX = Math.min(boxSelectStart.value.x, boxSelectEnd.value.x);
      const maxX = Math.max(boxSelectStart.value.x, boxSelectEnd.value.x);
      const minY = Math.min(boxSelectStart.value.y, boxSelectEnd.value.y);
      const maxY = Math.max(boxSelectStart.value.y, boxSelectEnd.value.y);

      const tempSelected = new Set<number>();
      if (!event.shiftKey) {
        curveEditorSelectedKeyframes.value.forEach((f) => tempSelected.add(f));
      }

      keyframeFrames.value.forEach((frame) => {
        for (let axisIdx = 0; axisIdx < 3; axisIdx++) {
          if (!visibleAxes.value.includes(axes[axisIdx].name)) continue;
          const kfX = frameToX(frame);
          const kfY = valueToY(getKeyframeValue(frame, axisIdx));
          if (kfX >= minX && kfX <= maxX && kfY >= minY && kfY <= maxY) {
            tempSelected.add(frame);
            break;
          }
        }
      });

      if (!event.shiftKey) {
        setCurveEditorSelectedKeyframes(Array.from(tempSelected));
        if (tempSelected.size > 0 && props.selectedFrame === null) {
          const first = Array.from(tempSelected)[0];
          emit('selectKeyframe', first);
        }
      } else {
        tempSelected.forEach((f) => addCurveEditorSelectedKeyframe(f));
      }
    }
  } else if (dragMode.value.kind === 'pan') {
    const dm = dragMode.value;
    viewOffset.value.x += x - dm.startX;
    viewOffset.value.y += y - dm.startY;
    dm.startX = x;
    dm.startY = y;
  }
}

function onSvgMouseUp(event: MouseEvent) {
  if (dragMode.value.kind === 'boxSelect') {
    isBoxSelecting.value = false;
  }
  dragMode.value = { kind: 'none' };
}

function onWheel(event: WheelEvent) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? 0.9 : 1.1;
  const newScaleX = Math.max(0.3, Math.min(5, viewScale.value.x * delta));
  const newScaleY = Math.max(0.3, Math.min(5, viewScale.value.y * delta));

  const svg = (event.currentTarget as SVGElement);
  const rect = svg.getBoundingClientRect();
  const scaleX = svgWidth.value / rect.width;
  const scaleY = svgHeight.value / rect.height;
  const mx = (event.clientX - rect.left) * scaleX;
  const my = (event.clientY - rect.top) * scaleY;

  viewOffset.value.x = mx - (mx - viewOffset.value.x) * (newScaleX / viewScale.value.x);
  viewOffset.value.y = my - (my - viewOffset.value.y) * (newScaleY / viewScale.value.y);

  viewScale.value.x = newScaleX;
  viewScale.value.y = newScaleY;
}

function toggleAxis(axisName: string) {
  const idx = visibleAxes.value.indexOf(axisName);
  if (idx >= 0) {
    if (visibleAxes.value.length > 1) {
      visibleAxes.value.splice(idx, 1);
    }
  } else {
    visibleAxes.value.push(axisName);
  }
}

function onApplyPreset(preset: CurvePresetType) {
  if (!props.boneId) return;
  currentPreset.value = preset;

  const targetFrames: number[] = [];
  if (selectedKeyframes.value.size > 0) {
    selectedKeyframes.value.forEach((f) => targetFrames.push(f));
  } else if (props.selectedFrame !== null) {
    targetFrames.push(props.selectedFrame);
  }

  if (targetFrames.length === 0) return;

  if (targetFrames.length === 1) {
    applyCurvePreset(targetFrames[0], props.boneId, preset);
  } else {
    applyPresetToSelectedFrames(props.boneId, preset, targetFrames);
  }

  setTimeout(() => {
    currentPreset.value = null;
  }, 300);
}

function updateSize() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  svgWidth.value = Math.max(200, rect.width);
  svgHeight.value = Math.max(180, rect.height - 60);
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateSize();
  if (window.ResizeObserver && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(containerRef.value);
  }
  window.addEventListener('resize', updateSize);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  window.removeEventListener('resize', updateSize);
});

watch(
  () => props.boneId,
  () => {
    viewOffset.value = { x: 0, y: 0 };
    viewScale.value = { x: 1, y: 1 };
    clearCurveEditorSelectedKeyframes();
  }
);
</script>

<style scoped>
.curve-editor {
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  border: 1px solid #333348;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 12px;
}

.curve-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: #252538;
  border-bottom: 1px solid #333348;
}

.curve-editor-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #ccc;
  margin: 0;
}

.curve-icon {
  font-size: 14px;
}

.curve-presets {
  display: flex;
  gap: 3px;
}

.preset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 24px;
  padding: 0;
  background: #333348;
  border: 1px solid #444458;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.preset-btn:hover {
  background: #444458;
  border-color: #4a9eff;
}

.preset-btn.active {
  background: #4a9eff;
  border-color: #6ab4ff;
  transform: scale(0.95);
}

.curve-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  color: #666;
  font-size: 12px;
}

.curve-canvas-container {
  position: relative;
  flex: 1;
  min-height: 200px;
  padding: 4px;
}

.curve-svg {
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
  cursor: crosshair;
}

.keyframe-point {
  cursor: pointer;
  transition: r 0.1s;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.keyframe-point:hover {
  r: 7;
}

.keyframe-point.selected {
  filter: drop-shadow(0 0 6px rgba(255, 107, 107, 0.8));
}

.keyframe-point.hidden {
  opacity: 0.2;
}

.handle-point {
  cursor: grab;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.handle-point:active {
  cursor: grabbing;
}

.axis-toggles {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  background: rgba(26, 26, 46, 0.85);
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid #333348;
}

.axis-toggle {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background: transparent;
  border: 1px solid #444458;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  color: #aaa;
  transition: all 0.15s;
  opacity: 0.4;
}

.axis-toggle.active {
  opacity: 1;
  background: rgba(255, 255, 255, 0.05);
}

.toggle-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.toggle-label {
  font-weight: 600;
  font-family: 'Consolas', monospace;
}

.curve-editor-footer {
  padding: 6px 10px;
  background: #252538;
  border-top: 1px solid #333348;
}

.selection-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: #888;
}

.hint {
  color: #666;
  font-style: italic;
}
</style>
