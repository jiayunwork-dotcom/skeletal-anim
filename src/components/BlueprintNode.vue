<template>
  <div
    class="blueprint-node absolute select-none"
    :style="nodeStyle"
    :class="{
      'ring-2 ring-accent-primary': selected,
      'ring-2 ring-red-500': hasError && !selected,
    }"
    @mousedown="$emit('mousedown-node', $event)"
    @contextmenu.prevent="$emit('contextmenu-node', $event, node.id)"
  >
    <div class="node-header" :class="headerClass">
      <span class="node-icon">{{ nodeIcon }}</span>
      <span class="node-title">{{ nodeTitle }}</span>
      <span v-if="hasError" class="ml-auto text-red-400" title="存在错误">⚠️</span>
    </div>

    <div class="node-body">
      <div v-if="node.type === 'animationSource'" class="space-y-2">
        <div>
          <label class="block text-xs text-gray-400 mb-1">动画片段</label>
          <select
            class="select text-xs"
            :value="cfg.clipId || ''"
            @change="(e: any) => updateConfig({ clipId: e.target.value || null })"
          >
            <option value="">-- 未选择 --</option>
            <option v-for="clip in allClips" :key="clip.id" :value="clip.id">
              {{ clip.name }}
            </option>
          </select>
        </div>
        <div v-if="currentClip" class="progress-bar-container">
          <div class="progress-bar-label flex justify-between text-xs text-gray-400">
            <span>{{ currentClip.name }}</span>
            <span>{{ formatProgress(cfg.playbackTime, currentClip.duration / currentClip.fps) }}</span>
          </div>
          <div class="progress-bar-track">
            <div
              class="progress-bar-fill"
              :style="{ width: getProgressPct(cfg.playbackTime, currentClip.duration / currentClip.fps) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <div v-else-if="node.type === 'blend'" class="space-y-2">
        <div>
          <label class="block text-xs text-gray-400 mb-1">权重: {{ cfg.weight.toFixed(2) }}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="cfg.weight"
            @input="(e: any) => updateConfig({ weight: parseFloat(e.target.value) })"
            class="slider"
          />
        </div>
        <div v-if="boneNames && Object.keys(boneNames).length > 0">
          <label class="block text-xs text-gray-400 mb-1">骨骼遮罩</label>
          <div class="bone-mask-list max-h-24 overflow-y-auto space-y-0.5">
            <label
              v-for="(name, id) in boneNames"
              :key="id"
              class="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer hover:text-white"
            >
              <input
                type="checkbox"
                :checked="cfg.boneMask[id] !== false"
                @change="(e: any) => toggleBoneMask(id as string, e.target.checked)"
                class="w-3 h-3"
              />
              <span class="truncate">{{ name }}</span>
            </label>
          </div>
        </div>
      </div>

      <div v-else-if="node.type === 'condition'" class="space-y-2">
        <div>
          <label class="block text-xs text-gray-400 mb-1">参数名称</label>
          <input
            type="text"
            class="input text-xs"
            :value="cfg.parameterName"
            @input="(e: any) => updateConfig({ parameterName: e.target.value })"
          />
        </div>
      </div>

      <div v-else-if="node.type === 'additive'" class="space-y-2">
        <div>
          <label class="block text-xs text-gray-400 mb-1">强度: {{ cfg.strength.toFixed(2) }}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="cfg.strength"
            @input="(e: any) => updateConfig({ strength: parseFloat(e.target.value) })"
            class="slider"
          />
        </div>
      </div>

      <div v-else-if="node.type === 'transition'" class="space-y-2">
        <div>
          <label class="block text-xs text-gray-400 mb-1">过渡时长 (秒): {{ cfg.duration.toFixed(2) }}</label>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            :value="cfg.duration"
            @input="(e: any) => updateConfig({ duration: parseFloat(e.target.value) })"
            class="slider"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">过渡曲线</label>
          <select
            class="select text-xs"
            :value="cfg.curveType"
            @change="(e: any) => updateConfig({ curveType: e.target.value })"
          >
            <option value="linear">线性</option>
            <option value="easeInOut">缓入缓出</option>
          </select>
        </div>
      </div>

      <div v-else-if="node.type === 'output'" class="space-y-2">
        <p class="text-xs text-gray-400">最终姿势输出</p>
      </div>
    </div>

    <div class="ports-container absolute inset-0 pointer-events-none">
      <div
        v-for="(port, idx) in inputPorts"
        :key="'in-' + port.id"
        class="port port-input absolute pointer-events-auto"
        :style="{ left: '-8px', top: getPortTop(idx) + 'px' }"
        :class="{ 'port-highlight': highlightPorts?.inputs.includes(port.id) }"
        @mousedown.stop="(e: MouseEvent) => $emit('port-mousedown', { nodeId: node.id, portId: port.id, port, event: e })"
        @mouseup.stop="() => $emit('port-mouseup', { nodeId: node.id, portId: port.id, port })"
      >
        <span class="port-dot" :class="portColorClass(port.type)"></span>
        <span class="port-label input-label">{{ port.name }}</span>
      </div>

      <div
        v-for="(port, idx) in outputPorts"
        :key="'out-' + port.id"
        class="port port-output absolute pointer-events-auto text-right"
        :style="{ right: '-8px', top: getPortTop(idx) + 'px' }"
        :class="{ 'port-highlight': highlightPorts?.outputs.includes(port.id) }"
        @mousedown.stop="(e: MouseEvent) => $emit('port-mousedown', { nodeId: node.id, portId: port.id, port, event: e })"
        @mouseup.stop="() => $emit('port-mouseup', { nodeId: node.id, portId: port.id, port })"
      >
        <span class="port-label output-label">{{ port.name }}</span>
        <span class="port-dot" :class="portColorClass(port.type)"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getNodePorts } from '@/core/blueprint/BlueprintGraph';
import type { BlueprintNodeData, BlueprintPort, PortType, AnimationSourceNodeConfig, BlendNodeConfig, ConditionNodeConfig, AdditiveNodeConfig, TransitionNodeConfig } from '@/types';
import type { AnimationClip } from '@/core/animation/AnimationClip';

const props = defineProps<{
  node: BlueprintNodeData;
  selected: boolean;
  hasError: boolean;
  highlightPorts: { inputs: string[]; outputs: string[] } | null;
  allClips: AnimationClip[];
  boneNames: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: 'mousedown-node', event: MouseEvent): void;
  (e: 'contextmenu-node', event: MouseEvent, nodeId: string): void;
  (e: 'port-mousedown', data: { nodeId: string; portId: string; port: BlueprintPort; event: MouseEvent }): void;
  (e: 'port-mouseup', data: { nodeId: string; portId: string; port: BlueprintPort }): void;
  (e: 'config-change', data: { nodeId: string; config: any }): void;
}>();

const NODE_WIDTH = 180;
const PORT_OFFSET_Y = 28;
const PORT_ROW_HEIGHT = 24;

const ports = computed(() => getNodePorts(props.node.type));
const inputPorts = computed(() => ports.value.inputs);
const outputPorts = computed(() => ports.value.outputs);

const cfg = computed(() => {
  switch (props.node.type) {
    case 'animationSource':
      return props.node.config as AnimationSourceNodeConfig;
    case 'blend':
      return props.node.config as BlendNodeConfig;
    case 'condition':
      return props.node.config as ConditionNodeConfig;
    case 'additive':
      return props.node.config as AdditiveNodeConfig;
    case 'transition':
      return props.node.config as TransitionNodeConfig;
    default:
      return {} as any;
  }
});

const nodeStyle = computed(() => ({
  left: props.node.position.x + 'px',
  top: props.node.position.y + 'px',
  width: NODE_WIDTH + 'px',
}));

const nodeTitle = computed(() => {
  switch (props.node.type) {
    case 'animationSource':
      const clip = props.allClips.find((c) => c.id === cfg.value.clipId);
      return clip?.name || '动画源';
    case 'blend':
      return '混合';
    case 'condition':
      return cfg.value.parameterName || '条件分支';
    case 'additive':
      return '加法混合';
    case 'transition':
      return '状态过渡';
    case 'output':
      return '最终输出';
    default:
      return '节点';
  }
});

const nodeIcon = computed(() => {
  switch (props.node.type) {
    case 'animationSource': return '🎬';
    case 'blend': return '🔀';
    case 'condition': return '❓';
    case 'additive': return '➕';
    case 'transition': return '🔄';
    case 'output': return '📺';
    default: return '⚙️';
  }
});

const headerClass = computed(() => {
  switch (props.node.type) {
    case 'animationSource': return 'bg-blue-900/60';
    case 'blend': return 'bg-purple-900/60';
    case 'condition': return 'bg-yellow-900/60';
    case 'additive': return 'bg-green-900/60';
    case 'transition': return 'bg-orange-900/60';
    case 'output': return 'bg-accent-primary/60';
    default: return 'bg-dark-700';
  }
});

const currentClip = computed(() => {
  if (props.node.type !== 'animationSource') return null;
  return props.allClips.find((c) => c.id === cfg.value.clipId) || null;
});

function getPortTop(index: number): number {
  return PORT_OFFSET_Y + index * PORT_ROW_HEIGHT;
}

function portColorClass(type: PortType): string {
  switch (type) {
    case 'pose': return 'bg-blue-400 border-blue-300';
    case 'boolean': return 'bg-yellow-400 border-yellow-300';
    case 'number': return 'bg-green-400 border-green-300';
    default: return 'bg-gray-400 border-gray-300';
  }
}

function formatProgress(current: number, total: number): string {
  if (!total || total <= 0) return '0s / 0s';
  return `${current.toFixed(1)}s / ${total.toFixed(1)}s`;
}

function getProgressPct(current: number, total: number): number {
  if (!total || total <= 0) return 0;
  const pct = ((current % total) / total) * 100;
  return Math.max(0, Math.min(100, pct));
}

function updateConfig(partial: any) {
  emit('config-change', { nodeId: props.node.id, config: partial });
}

function toggleBoneMask(boneId: string, enabled: boolean) {
  const mask = { ...(cfg.value as BlendNodeConfig).boneMask };
  mask[boneId] = enabled;
  updateConfig({ boneMask: mask });
}
</script>

<style scoped>
.blueprint-node {
  background: #1e1e2e;
  border: 1px solid #3f3f5a;
  border-radius: 8px;
  overflow: visible;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.node-header {
  padding: 6px 10px;
  border-bottom: 1px solid #3f3f5a;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #fff;
  cursor: move;
  border-radius: 8px 8px 0 0;
}

.node-icon {
  font-size: 13px;
}

.node-title {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.node-body {
  padding: 10px;
}

.port {
  display: flex;
  align-items: center;
  height: 16px;
}

.port-input {
  flex-direction: row;
}

.port-output {
  flex-direction: row-reverse;
}

.port-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid;
  cursor: crosshair;
  transition: transform 0.15s;
}

.port-dot:hover {
  transform: scale(1.3);
}

.port-label {
  font-size: 11px;
  color: #a0a0b0;
  padding: 0 6px;
  white-space: nowrap;
}

.input-label {
  padding-left: 8px;
}

.output-label {
  padding-right: 8px;
}

.port-highlight .port-dot {
  box-shadow: 0 0 8px currentColor;
  animation: pulse-port 1s ease-in-out infinite;
}

@keyframes pulse-port {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.4); }
}

.progress-bar-container {
  margin-top: 4px;
}

.progress-bar-track {
  height: 4px;
  background: #2a2a3e;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #6366f1;
  border-radius: 2px;
  transition: width 0.1s linear;
}

.bone-mask-list {
  border: 1px solid #3f3f5a;
  border-radius: 4px;
  padding: 4px;
  background: #1a1a2a;
}
</style>
