<template>
  <canvas
    ref="canvasRef"
    :width="width * dpr"
    :height="height * dpr"
    :style="{ width: width + 'px', height: height + 'px' }"
    class="pose-thumbnail"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

const props = withDefaults(defineProps<{
  poseData: Map<string, THREE.Euler> | null;
  width?: number;
  height?: number;
}>(), {
  width: 40,
  height: 60,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1;

const STICKMAN_BONES: Record<string, { px: number; py: number; parent?: string }> = {
  hips: { px: 0.5, py: 0.5 },
  spine: { px: 0.5, py: 0.4, parent: 'hips' },
  chest: { px: 0.5, py: 0.3, parent: 'spine' },
  neck: { px: 0.5, py: 0.24, parent: 'chest' },
  head: { px: 0.5, py: 0.14, parent: 'neck' },
  leftShoulder: { px: 0.38, py: 0.3, parent: 'chest' },
  leftUpperArm: { px: 0.28, py: 0.38, parent: 'leftShoulder' },
  leftLowerArm: { px: 0.2, py: 0.48, parent: 'leftUpperArm' },
  rightShoulder: { px: 0.62, py: 0.3, parent: 'chest' },
  rightUpperArm: { px: 0.72, py: 0.38, parent: 'rightShoulder' },
  rightLowerArm: { px: 0.8, py: 0.48, parent: 'rightUpperArm' },
  leftUpperLeg: { px: 0.44, py: 0.6, parent: 'hips' },
  leftLowerLeg: { px: 0.42, py: 0.75, parent: 'leftUpperLeg' },
  leftFoot: { px: 0.4, py: 0.9, parent: 'leftLowerLeg' },
  rightUpperLeg: { px: 0.56, py: 0.6, parent: 'hips' },
  rightLowerLeg: { px: 0.58, py: 0.75, parent: 'rightUpperLeg' },
  rightFoot: { px: 0.6, py: 0.9, parent: 'rightLowerLeg' },
};

function rotationToOffset(euler: THREE.Euler | undefined): { dx: number; dy: number } {
  if (!euler) return { dx: 0, dy: 0 };
  const scale = 0.04;
  return {
    dx: Math.sin(euler.z) * scale + Math.sin(euler.y) * scale * 0.3,
    dy: Math.sin(euler.x) * scale,
  };
}

function drawStickman() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = props.width * dpr;
  const h = props.height * dpr;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
  ctx.lineWidth = dpr;

  const poseMap = new Map<string, { dx: number; dy: number }>();

  if (props.poseData && props.poseData.size > 0) {
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.9)';
    ctx.lineWidth = 1.5 * dpr;

    props.poseData.forEach((euler, boneId) => {
      poseMap.set(boneId, rotationToOffset(euler));
    });
  }

  const bonePositions: Record<string, { x: number; y: number }> = {};

  for (const [boneId, base] of Object.entries(STICKMAN_BONES)) {
    const offset = poseMap.get(boneId) || { dx: 0, dy: 0 };
    bonePositions[boneId] = {
      x: (base.px + offset.dx) * w,
      y: (base.py + offset.dy) * h,
    };
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawnBones = new Set<string>();
  for (const [boneId, base] of Object.entries(STICKMAN_BONES)) {
    if (base.parent && bonePositions[base.parent] && bonePositions[boneId]) {
      const parent = bonePositions[base.parent];
      const child = bonePositions[boneId];
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(child.x, child.y);
      ctx.stroke();
      drawnBones.add(boneId);
      drawnBones.add(base.parent);
    }
  }

  for (const boneId of drawnBones) {
    if (boneId === 'head') {
      const head = bonePositions[boneId];
      if (head) {
        ctx.beginPath();
        ctx.arc(head.x, head.y, 3 * dpr, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      const pos = bonePositions[boneId];
      if (pos) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 1.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

let rafId: number | null = null;

watch(() => props.poseData, () => {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(drawStickman);
}, { deep: true });

onMounted(() => {
  drawStickman();
});

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<style scoped>
.pose-thumbnail {
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 3px;
  background: rgba(10, 10, 15, 0.8);
  display: block;
}
</style>
