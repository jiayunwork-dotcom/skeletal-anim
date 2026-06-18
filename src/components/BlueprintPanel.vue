<template>
  <div class="h-full flex flex-col bg-dark-900">
    <div class="panel-header shrink-0">
      <h3 class="panel-title">
        <span class="panel-icon">🎯</span>
        动画蓝图
      </h3>
      <div class="panel-actions flex items-center gap-2">
        <label class="toggle-label flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" v-model="useBlueprint" @change="onToggleBlueprint" />
          启用
        </label>
        <button class="btn-icon text-xs" @click="resetView" title="重置视图">
          <Focus class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <div
      ref="canvasContainerRef"
      class="flex-1 relative overflow-hidden bg-dark-950 cursor-grab active:cursor-grabbing"
      @mousedown="onCanvasMouseDown"
      @wheel="onCanvasWheel"
      @dblclick="onCanvasDblClick"
      @contextmenu.prevent="onCanvasContextMenu"
    >
      <div
        class="absolute inset-0 opacity-30"
        :style="gridStyle"
      ></div>

      <svg
        class="absolute inset-0 w-full h-full pointer-events-none"
        style="z-index: 1"
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
          </marker>
        </defs>
        <path
          v-for="conn in connections"
          :key="conn.id"
          :d="getConnectionPath(conn)"
          stroke="#6366f1"
          stroke-width="2"
          fill="none"
          class="pointer-events-auto cursor-pointer transition-all hover:stroke-accent-primary"
          style="z-index: 2"
          @contextmenu.prevent.stop="onConnectionContextMenu($event, conn.id)"
          @click.stop="onConnectionClick(conn.id)"
        />
        <path
          v-if="draggingConnection"
          :d="getDraggingConnectionPath()"
          stroke="#a855f7"
          stroke-width="2"
          stroke-dasharray="5,5"
          fill="none"
        />
      </svg>

      <div
        class="absolute origin-top-left"
        :style="transformStyle"
        style="z-index: 3"
      >
        <BlueprintNode
          v-for="node in nodes"
          :key="node.id"
          :node="node"
          :selected="selectedNodeId === node.id"
          :has-error="hasNodeError(node.id)"
          :highlight-ports="highlightPortsFor(node.id)"
          :all-clips="allClips"
          :bone-names="boneNames"
          @mousedown-node="onNodeMouseDown($event, node.id)"
          @port-mousedown="onPortMouseDown"
          @port-mouseup="onPortMouseUp"
          @contextmenu-node="onNodeContextMenu"
          @config-change="onNodeConfigChange"
        />
      </div>

      <div
        v-if="showCreateMenu"
        class="context-menu"
        :style="{ left: createMenuPos.x + 'px', top: createMenuPos.y + 'px' }"
      >
        <div class="context-menu-item" @click="createNode('animationSource')">
          <span>🎬</span> 动画源节点
        </div>
        <div class="context-menu-item" @click="createNode('blend')">
          <span>🔀</span> 混合节点
        </div>
        <div class="context-menu-item" @click="createNode('condition')">
          <span>❓</span> 条件分支节点
        </div>
        <div class="context-menu-item" @click="createNode('additive')">
          <span>➕</span> 加法混合节点
        </div>
        <div class="context-menu-item" @click="createNode('transition')">
          <span>🔄</span> 状态过渡节点
        </div>
      </div>

      <div
        v-if="showNodeContextMenu"
        class="context-menu"
        :style="{ left: nodeContextMenuPos.x + 'px', top: nodeContextMenuPos.y + 'px' }"
      >
        <div class="context-menu-item" @click="duplicateSelectedNode">
          <span>📋</span> 复制节点
        </div>
        <div class="context-menu-item" @click="disconnectSelectedNode">
          <span>🔌</span> 断开连接
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item text-red-400 hover:text-red-300" @click="deleteSelectedNode" v-if="canDeleteSelected">
          <span>🗑️</span> 删除节点
        </div>
      </div>
    </div>

    <div v-if="Object.keys(parameters).length > 0" class="shrink-0 border-t border-dark-600 p-2 bg-dark-800">
      <div class="text-xs text-gray-400 mb-1.5 font-medium">蓝图参数</div>
      <div class="flex flex-wrap gap-2">
        <div v-for="(value, name) in parameters" :key="name" class="flex items-center gap-1.5 bg-dark-700 rounded px-2 py-1">
          <span class="text-xs text-gray-300 font-mono">{{ name }}</span>
          <input
            v-if="typeof value === 'boolean'"
            type="checkbox"
            :checked="value"
            @change="(e: any) => setParameter(String(name), e.target.checked)"
            class="cursor-pointer"
          />
          <input
            v-else
            type="number"
            step="0.1"
            :value="value"
            @change="(e: any) => setParameter(String(name), parseFloat(e.target.value))"
            class="w-14 bg-dark-900 border border-dark-600 rounded px-1 py-0.5 text-xs text-right"
          />
          <button @click="removeParameter(String(name))" class="text-gray-500 hover:text-red-400 text-xs">✕</button>
        </div>
        <button @click="addParameter" class="text-xs text-accent-primary hover:text-accent-primary/80 px-2 py-1">+ 新参数</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue';
import { Focus } from 'lucide-vue-next';
import BlueprintNode from './BlueprintNode.vue';
import { useBlueprintStore } from '@/stores/useBlueprintStore';
import { useAnimationStore } from '@/stores/useAnimationStore';
import { useSkeletonStore } from '@/stores/useSkeletonStore';
import { getNodePorts } from '@/core/blueprint/BlueprintGraph';
import type { BlueprintNodeType, BlueprintConnectionData, BlueprintNodeData, BlueprintPort } from '@/types';

const blueprintStore = useBlueprintStore();
const animationStore = useAnimationStore();
const skeletonStore = useSkeletonStore();

const canvasContainerRef = ref<HTMLDivElement | null>(null);
const nodes = computed(() => blueprintStore.nodes);
const connections = computed(() => blueprintStore.connections);
const selectedNodeId = computed(() => blueprintStore.selectedNodeId);
const useBlueprint = computed({
  get: () => blueprintStore.useBlueprint,
  set: (v: boolean) => blueprintStore.setUseBlueprint(v),
});
const parameters = computed(() => blueprintStore.parameters);
const allClips = computed(() => animationStore.allClips);
const boneNames = computed(() => {
  const map: Record<string, string> = {};
  skeletonStore.allBones.forEach((b) => {
    map[b.id] = b.name;
  });
  return map;
});

const validationErrors = computed(() => blueprintStore.validationErrors);

const canvasOffset = reactive({ x: 0, y: 0 });
const canvasScale = ref(1);
const isPanning = ref(false);
const panStart = reactive({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

const isDraggingNode = ref(false);
const dragNodeId = ref<string | null>(null);
const dragNodeStart = reactive({ x: 0, y: 0, nodeX: 0, nodeY: 0 });

const draggingConnection = ref<{
  fromNodeId: string;
  fromPortId: string;
  fromPort: BlueprintPort;
  mouseX: number;
  mouseY: number;
} | null>(null);

const showCreateMenu = ref(false);
const createMenuPos = reactive({ x: 0, y: 0 });

const showNodeContextMenu = ref(false);
const nodeContextMenuPos = reactive({ x: 0, y: 0 });
const contextMenuNodeId = ref<string | null>(null);
const contextMenuConnectionId = ref<string | null>(null);

const NODE_WIDTH = 180;
const PORT_OFFSET_Y = 28;
const PORT_ROW_HEIGHT = 24;

const transformStyle = computed(() => ({
  transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale.value})`,
}));

const gridStyle = computed(() => {
  const spacing = 20 * canvasScale.value;
  return {
    backgroundImage: `
      linear-gradient(to right, rgba(99, 102, 241, 0.15) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(99, 102, 241, 0.15) 1px, transparent 1px)
    `,
    backgroundSize: `${spacing}px ${spacing}px`,
    backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
  };
});

const canDeleteSelected = computed(() => {
  if (!contextMenuNodeId.value) return false;
  const node = blueprintStore.graph.nodes.get(contextMenuNodeId.value);
  return node?.type !== 'output';
});

function hasNodeError(nodeId: string): boolean {
  return validationErrors.value.some((e) => e.nodeId === nodeId || (e.errorType === 'loop' && e.nodeId === ''));
}

function highlightPortsFor(nodeId: string): { inputs: string[]; outputs: string[] } | null {
  if (!draggingConnection.value) return null;
  const fromPort = draggingConnection.value.fromPort;
  const node = blueprintStore.graph.nodes.get(nodeId);
  if (!node) return null;

  const ports = getNodePorts(node.type);
  const compatibleInputs = ports.inputs
    .filter((p) => p.type === fromPort.type)
    .map((p) => p.id);

  return { inputs: compatibleInputs, outputs: [] };
}

function onToggleBlueprint() {
  blueprintStore.setUseBlueprint(useBlueprint.value);
}

function resetView() {
  canvasOffset.x = 0;
  canvasOffset.y = 0;
  canvasScale.value = 1;
}

function screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
  if (!canvasContainerRef.value) return { x: 0, y: 0 };
  const rect = canvasContainerRef.value.getBoundingClientRect();
  const x = (screenX - rect.left - canvasOffset.x) / canvasScale.value;
  const y = (screenY - rect.top - canvasOffset.y) / canvasScale.value;
  return { x, y };
}

function getPortScreenPosition(nodeId: string, portId: string, isInput: boolean): { x: number; y: number } | null {
  const node = blueprintStore.graph.nodes.get(nodeId);
  if (!node) return null;

  const ports = getNodePorts(node.type);
  const portList = isInput ? ports.inputs : ports.outputs;
  const portIndex = portList.findIndex((p) => p.id === portId);
  if (portIndex < 0) return null;

  const x = node.position.x + (isInput ? 0 : NODE_WIDTH);
  const y = node.position.y + PORT_OFFSET_Y + portIndex * PORT_ROW_HEIGHT;
  return { x, y };
}

function getConnectionPath(conn: BlueprintConnectionData): string {
  const fromPos = getPortScreenPosition(conn.fromNodeId, conn.fromPortId, false);
  const toPos = getPortScreenPosition(conn.toNodeId, conn.toPortId, true);
  if (!fromPos || !toPos) return '';

  return bezierPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
}

function getDraggingConnectionPath(): string {
  if (!draggingConnection.value || !canvasContainerRef.value) return '';
  const fromPos = getPortScreenPosition(
    draggingConnection.value.fromNodeId,
    draggingConnection.value.fromPortId,
    false
  );
  if (!fromPos) return '';

  const world = screenToWorld(draggingConnection.value.mouseX, draggingConnection.value.mouseY);
  return bezierPath(fromPos.x, fromPos.y, world.x, world.y);
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  const cp1x = x1 + dx;
  const cp1y = y1;
  const cp2x = x2 - dx;
  const cp2y = y2;
  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

function onCanvasMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  hideAllMenus();

  isPanning.value = true;
  panStart.x = e.clientX;
  panStart.y = e.clientY;
  panStart.offsetX = canvasOffset.x;
  panStart.offsetY = canvasOffset.y;

  blueprintStore.selectNode(null);

  document.addEventListener('mousemove', onDocumentMouseMove);
  document.addEventListener('mouseup', onDocumentMouseUp);
}

function onCanvasWheel(e: WheelEvent) {
  e.preventDefault();
  if (!canvasContainerRef.value) return;

  const rect = canvasContainerRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.3, Math.min(3, canvasScale.value * delta));

  const worldX = (mouseX - canvasOffset.x) / canvasScale.value;
  const worldY = (mouseY - canvasOffset.y) / canvasScale.value;

  canvasScale.value = newScale;
  canvasOffset.x = mouseX - worldX * newScale;
  canvasOffset.y = mouseY - worldY * newScale;
}

function onCanvasDblClick(e: MouseEvent) {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement;
  if (target.closest('.blueprint-node')) return;

  createMenuPos.x = e.clientX;
  createMenuPos.y = e.clientY;
  showCreateMenu.value = true;
  showNodeContextMenu.value = false;
}

function onCanvasContextMenu(e: MouseEvent) {
  hideAllMenus();
}

function onNodeMouseDown(e: MouseEvent, nodeId: string) {
  e.stopPropagation();
  if (e.button !== 0) return;
  hideAllMenus();

  blueprintStore.selectNode(nodeId);

  const node = blueprintStore.graph.nodes.get(nodeId);
  if (!node) return;

  isDraggingNode.value = true;
  dragNodeId.value = nodeId;
  dragNodeStart.x = e.clientX;
  dragNodeStart.y = e.clientY;
  dragNodeStart.nodeX = node.position.x;
  dragNodeStart.nodeY = node.position.y;

  document.addEventListener('mousemove', onDocumentMouseMove);
  document.addEventListener('mouseup', onDocumentMouseUp);
}

function onPortMouseDown(data: { nodeId: string; portId: string; port: BlueprintPort; event: MouseEvent }) {
  data.event.stopPropagation();
  if (data.port.isInput) return;

  draggingConnection.value = {
    fromNodeId: data.nodeId,
    fromPortId: data.portId,
    fromPort: data.port,
    mouseX: data.event.clientX,
    mouseY: data.event.clientY,
  };

  document.addEventListener('mousemove', onDocumentMouseMove);
  document.addEventListener('mouseup', onDocumentMouseUp);
}

function onPortMouseUp(data: { nodeId: string; portId: string; port: BlueprintPort }) {
  if (!draggingConnection.value) return;
  if (!data.port.isInput) return;
  if (draggingConnection.value.fromPort.type !== data.port.type) return;
  if (draggingConnection.value.fromNodeId === data.nodeId) return;

  blueprintStore.addConnection(
    draggingConnection.value.fromNodeId,
    draggingConnection.value.fromPortId,
    data.nodeId,
    data.portId
  );

  draggingConnection.value = null;
}

function onDocumentMouseMove(e: MouseEvent) {
  if (isPanning.value) {
    canvasOffset.x = panStart.offsetX + (e.clientX - panStart.x);
    canvasOffset.y = panStart.offsetY + (e.clientY - panStart.y);
  }

  if (isDraggingNode.value && dragNodeId.value) {
    const dx = (e.clientX - dragNodeStart.x) / canvasScale.value;
    const dy = (e.clientY - dragNodeStart.y) / canvasScale.value;
    blueprintStore.moveNode(dragNodeId.value, {
      x: dragNodeStart.nodeX + dx,
      y: dragNodeStart.nodeY + dy,
    });
  }

  if (draggingConnection.value) {
    draggingConnection.value.mouseX = e.clientX;
    draggingConnection.value.mouseY = e.clientY;
  }
}

function onDocumentMouseUp() {
  isPanning.value = false;
  isDraggingNode.value = false;
  dragNodeId.value = null;
  draggingConnection.value = null;
  document.removeEventListener('mousemove', onDocumentMouseMove);
  document.removeEventListener('mouseup', onDocumentMouseUp);
}

function onNodeContextMenu(e: MouseEvent, nodeId: string) {
  e.preventDefault();
  e.stopPropagation();
  blueprintStore.selectNode(nodeId);
  contextMenuNodeId.value = nodeId;
  contextMenuConnectionId.value = null;
  nodeContextMenuPos.x = e.clientX;
  nodeContextMenuPos.y = e.clientY;
  showNodeContextMenu.value = true;
  showCreateMenu.value = false;
}

function onConnectionContextMenu(e: MouseEvent, connId: string) {
  contextMenuConnectionId.value = connId;
  contextMenuNodeId.value = null;
  nodeContextMenuPos.x = e.clientX;
  nodeContextMenuPos.y = e.clientY;
  showNodeContextMenu.value = true;
  showCreateMenu.value = false;
}

function onConnectionClick(connId: string) {
  blueprintStore.selectNode(null);
}

function hideAllMenus() {
  showCreateMenu.value = false;
  showNodeContextMenu.value = false;
  contextMenuNodeId.value = null;
  contextMenuConnectionId.value = null;
}

function createNode(type: BlueprintNodeType) {
  const worldPos = screenToWorld(createMenuPos.x, createMenuPos.y);
  blueprintStore.addNode(type, worldPos);
  hideAllMenus();
}

function deleteSelectedNode() {
  if (contextMenuNodeId.value) {
    blueprintStore.removeNode(contextMenuNodeId.value);
  } else if (contextMenuConnectionId.value) {
    blueprintStore.removeConnection(contextMenuConnectionId.value);
  }
  hideAllMenus();
}

function duplicateSelectedNode() {
  if (contextMenuNodeId.value) {
    blueprintStore.duplicateNode(contextMenuNodeId.value);
  }
  hideAllMenus();
}

function disconnectSelectedNode() {
  if (contextMenuNodeId.value) {
    blueprintStore.disconnectNode(contextMenuNodeId.value);
  }
  hideAllMenus();
}

function onNodeConfigChange(data: { nodeId: string; config: any }) {
  blueprintStore.setNodeConfig(data.nodeId, data.config);
}

function setParameter(name: string, value: boolean | number) {
  blueprintStore.setParameter(name, value);
}

function addParameter() {
  const name = prompt('输入参数名称:', 'isRunning');
  if (!name) return;
  const type = prompt('参数类型 (boolean/number):', 'boolean');
  const value = type === 'number' ? 0 : false;
  blueprintStore.setParameter(name, value);
}

function removeParameter(name: string) {
  if (confirm(`删除参数 "${name}"?`)) {
    const params = { ...blueprintStore.parameters };
    delete params[name];
    blueprintStore.graph.parameters = params;
    blueprintStore.markDirty();
  }
}

function onGlobalClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.context-menu') && !target.closest('.blueprint-node')) {
    hideAllMenus();
  }
}

onMounted(() => {
  document.addEventListener('click', onGlobalClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onGlobalClick);
  document.removeEventListener('mousemove', onDocumentMouseMove);
  document.removeEventListener('mouseup', onDocumentMouseUp);
});
</script>

<style scoped>
.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
