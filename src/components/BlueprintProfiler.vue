<template>
  <div class="profiler-panel">
    <div class="profiler-header" @click="$emit('toggle')">
      <span class="text-xs font-medium text-gray-300">📊 性能分析器</span>
      <span class="text-xs text-gray-500">{{ collapsed ? '▼' : '▲' }}</span>
    </div>

    <div v-if="!collapsed" class="profiler-content">
      <div class="profiler-stats">
        <div class="stat-item">
          <span class="stat-label">评估耗时</span>
          <span class="stat-value" :class="evalTimeClass">{{ lastEvalTimeMs.toFixed(2) }}ms</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">节点数</span>
          <span class="stat-value">{{ nodeCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">活跃连接</span>
          <span class="stat-value">{{ activeConnections }}</span>
        </div>
      </div>

      <div class="profiler-chart">
        <canvas
          ref="chartRef"
          :width="chartWidth"
          :height="chartHeight"
          :style="{ width: chartWidth / dpr + 'px', height: chartHeight / dpr + 'px' }"
        />
      </div>

      <div v-if="evalOrder.length > 0" class="eval-order">
        <span class="text-xs text-gray-500">评估顺序:</span>
        <div class="eval-order-list">
          <span
            v-for="(nodeId, idx) in evalOrder"
            :key="idx"
            class="eval-order-item"
            :class="{ 'eval-order-warning': isNodeSlow(nodeId) }"
          >
            {{ getNodeLabel(nodeId, idx) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import { getNodePorts } from '@/core/blueprint/BlueprintGraph';

const props = defineProps<{
  collapsed: boolean;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();

const blueprintStore = useBlueprintStore();
const chartRef = ref<HTMLCanvasElement | null>(null);
const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1;
const chartWidth = 300 * dpr;
const chartHeight = 60 * dpr;

const performanceFrames = computed(() => blueprintStore.performanceFrames);
const lastEvalTimeMs = computed(() => {
  const frames = performanceFrames.value;
  return frames.length > 0 ? frames[frames.length - 1].evaluationTimeMs : 0;
});
const nodeCount = computed(() => {
  const frames = performanceFrames.value;
  return frames.length > 0 ? frames[frames.length - 1].nodeCount : 0;
});
const activeConnections = computed(() => {
  const frames = performanceFrames.value;
  return frames.length > 0 ? frames[frames.length - 1].activeConnectionCount : 0;
});
const evalOrder = computed(() => {
  const frames = performanceFrames.value;
  return frames.length > 0 ? frames[frames.length - 1].evaluationOrder : [];
});

const evalTimeClass = computed(() => {
  const ms = lastEvalTimeMs.value;
  if (ms > 16) return 'text-red-400';
  if (ms > 8) return 'text-yellow-400';
  return 'text-green-400';
});

function isNodeSlow(nodeId: string): boolean {
  const frames = performanceFrames.value;
  if (frames.length === 0) return false;
  const timings = frames[frames.length - 1].nodeTimings;
  return (timings.get(nodeId) || 0) > 500;
}

function getNodeLabel(nodeId: string, idx: number): string {
  const node = blueprintStore.graph.nodes.get(nodeId);
  if (!node) return `${idx}`;
  return node.type.substring(0, 3);
}

function drawChart() {
  const canvas = chartRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, chartWidth, chartHeight);

  const frames = performanceFrames.value;
  if (frames.length === 0) return;

  const maxMs = Math.max(16, ...frames.map((f) => f.evaluationTimeMs));
  const barWidth = chartWidth / 60;

  frames.forEach((frame, i) => {
    const barHeight = (frame.evaluationTimeMs / maxMs) * chartHeight;
    const x = i * barWidth;
    const y = chartHeight - barHeight;

    if (frame.evaluationTimeMs > 16) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    } else if (frame.evaluationTimeMs > 8) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
    } else {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.7)';
    }

    ctx.fillRect(x, y, barWidth - 1, barHeight);
  });

  const line16 = chartHeight - (16 / maxMs) * chartHeight;
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, line16);
  ctx.lineTo(chartWidth, line16);
  ctx.stroke();
  ctx.setLineDash([]);
}

let rafId: number | null = null;

watch(performanceFrames, () => {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(drawChart);
}, { deep: true });

onMounted(() => {
  drawChart();
});

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<style scoped>
.profiler-panel {
  border-top: 1px solid #3c3c50;
  background: #1e1e2e;
}

.profiler-header {
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.profiler-header:hover {
  background: rgba(99, 102, 241, 0.1);
}

.profiler-content {
  padding: 6px 8px;
}

.profiler-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 10px;
  color: #7a7a90;
}

.stat-value {
  font-size: 11px;
  font-family: monospace;
  color: #e5e7eb;
}

.profiler-chart {
  border: 1px solid #3c3c50;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.eval-order {
  margin-top: 4px;
}

.eval-order-list {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 2px;
}

.eval-order-item {
  font-size: 9px;
  padding: 1px 4px;
  background: rgba(99, 102, 241, 0.15);
  color: #a0a0b0;
  border-radius: 2px;
  font-family: monospace;
}

.eval-order-warning {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}
</style>
