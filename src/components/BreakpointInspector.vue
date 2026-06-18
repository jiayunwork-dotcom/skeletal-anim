<template>
  <div class="inspector-panel">
    <div class="inspector-header">
      <span class="text-xs font-medium text-red-400">⏸ 断点暂停</span>
      <span class="text-xs text-gray-500">节点: {{ pausedNodeTitle }}</span>
    </div>

    <div class="inspector-body">
      <div class="inspector-section">
        <div class="section-title">输入端口</div>
        <div v-for="port in inputPorts" :key="port.id" class="port-data-row">
          <span class="port-name" :class="portTypeClass(port.type)">{{ port.name }}</span>
          <span class="port-value">{{ getInputValue(port.id, port.type) }}</span>
        </div>
      </div>

      <div class="inspector-section">
        <div class="section-title">输出端口</div>
        <div v-for="port in outputPorts" :key="port.id" class="port-data-row">
          <span class="port-name" :class="portTypeClass(port.type)">{{ port.name }}</span>
          <span class="port-value">{{ getOutputValue(port.id, port.type) }}</span>
        </div>
      </div>

      <div v-if="poseBoneList.length > 0" class="inspector-section">
        <div class="section-title">骨骼旋转详情</div>
        <div class="bone-list">
          <div v-for="bone in poseBoneList" :key="bone.id" class="bone-row">
            <span class="bone-name">{{ bone.name }}</span>
            <span class="bone-rot">{{ bone.rotation }}</span>
          </div>
        </div>
      </div>

      <div class="inspector-actions">
        <button class="btn btn-xs" @click="$emit('step')">
          ⏭ 单步
        </button>
        <button class="btn btn-xs btn-primary" @click="$emit('continue')">
          ▶ 继续
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import * as THREE from 'three';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import { getNodePorts } from '@/core/blueprint/BlueprintGraph';
import type { BlueprintPort, PortType, NodeEvaluationResult } from '@/types';

defineEmits<{
  (e: 'step'): void;
  (e: 'continue'): void;
}>();

const blueprintStore = useBlueprintStore();

const pausedNodeId = computed(() => blueprintStore.pausedAtNodeId);

const pausedNode = computed(() => {
  if (!pausedNodeId.value) return null;
  return blueprintStore.graph.nodes.get(pausedNodeId.value) || null;
});

const pausedNodeTitle = computed(() => {
  if (!pausedNode.value) return '—';
  return pausedNode.value.type;
});

const inputPorts = computed(() => {
  if (!pausedNode.value) return [];
  return getNodePorts(pausedNode.value.type).inputs;
});

const outputPorts = computed(() => {
  if (!pausedNode.value) return [];
  return getNodePorts(pausedNode.value.type).outputs;
});

const nodeResult = computed((): NodeEvaluationResult | undefined => {
  if (!pausedNodeId.value) return undefined;
  return blueprintStore.breakpointNodeResults.get(pausedNodeId.value);
});

function portTypeClass(type: PortType): string {
  switch (type) {
    case 'pose': return 'text-blue-400';
    case 'boolean': return 'text-yellow-400';
    case 'number': return 'text-green-400';
    default: return 'text-gray-400';
  }
}

function getInputValue(portId: string, portType: PortType): string {
  if (!pausedNodeId.value || !nodeResult.value) return '—';

  const conns = Array.from(blueprintStore.graph.connections.values());
  const conn = conns.find((c) => c.toNodeId === pausedNodeId.value && c.toPortId === portId);
  if (!conn) return '未连接';

  const fromResult = blueprintStore.breakpointNodeResults.get(conn.fromNodeId);
  if (!fromResult) return '—';

  const value = fromResult.outputs.get(conn.fromPortId);
  return formatValue(value, portType);
}

function getOutputValue(portId: string, portType: PortType): string {
  if (!nodeResult.value) return '—';
  const value = nodeResult.value.outputs.get(portId);
  return formatValue(value, portType);
}

function formatValue(value: any, type: PortType): string {
  if (value === undefined || value === null) return '—';
  if (type === 'pose') {
    if (value instanceof Map) {
      return `姿势 (${value.size} 骨骼)`;
    }
    return '姿势';
  }
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'number') return typeof value === 'number' ? value.toFixed(3) : String(value);
  return String(value);
}

interface BoneEntry {
  id: string;
  name: string;
  rotation: string;
}

const poseBoneList = computed((): BoneEntry[] => {
  if (!nodeResult.value) return [];
  const poseOutput = nodeResult.value.outputs.get('pose');
  if (!poseOutput || !(poseOutput instanceof Map)) return [];

  const bones: BoneEntry[] = [];
  poseOutput.forEach((euler: THREE.Euler, boneId: string) => {
    const bone = blueprintStore.graph.nodes.get(boneId);
    const name = boneId;
    const x = ((euler.x * 180) / Math.PI).toFixed(1);
    const y = ((euler.y * 180) / Math.PI).toFixed(1);
    const z = ((euler.z * 180) / Math.PI).toFixed(1);
    bones.push({
      id: boneId,
      name,
      rotation: `${x}° ${y}° ${z}°`,
    });
  });
  return bones;
});
</script>

<style scoped>
.inspector-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: #1e1e2e;
  border-left: 1px solid #3c3c50;
  display: flex;
  flex-direction: column;
  z-index: 20;
}

.inspector-header {
  padding: 8px 10px;
  border-bottom: 1px solid #3c3c50;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.inspector-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.inspector-section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 10px;
  color: #7a7a90;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.port-data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 4px;
  font-size: 11px;
}

.port-data-row:hover {
  background: rgba(99, 102, 241, 0.05);
}

.port-name {
  font-weight: 500;
}

.port-value {
  font-family: monospace;
  color: #a0a0b0;
  font-size: 10px;
}

.bone-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #3c3c50;
  border-radius: 3px;
}

.bone-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 6px;
  font-size: 10px;
  border-bottom: 1px solid rgba(60, 60, 80, 0.5);
}

.bone-row:last-child {
  border-bottom: none;
}

.bone-name {
  color: #60a5fa;
  font-family: monospace;
}

.bone-rot {
  color: #a0a0b0;
  font-family: monospace;
}

.inspector-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #3c3c50;
}

.btn-xs {
  padding: 4px 10px;
  font-size: 11px;
}
</style>
