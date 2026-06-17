<template>
  <div class="bone-node">
    <div
      class="bone-item"
      :class="{ selected: bone.id === selectedBoneId }"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      @click="$emit('select', bone.id)"
    >
      <span
        class="expand-icon"
        :class="{ 'has-children': hasChildren, expanded: isExpanded }"
        @click.stop="onToggle"
      >
        {{ hasChildren ? (isExpanded ? '▼' : '▶') : '•' }}
      </span>
      <span class="bone-icon">🦴</span>
      <span class="bone-name">{{ bone.name }}</span>
      <div class="bone-actions">
        <button class="icon-btn" title="Add Child" @click.stop="$emit('add-child', bone.id)">
          ➕
        </button>
        <button class="icon-btn" title="Delete" @click.stop="$emit('delete', bone.id)">
          🗑️
        </button>
      </div>
    </div>
    
    <div v-if="hasChildren && isExpanded" class="bone-children">
      <BoneTreeNode
        v-for="child in children"
        :key="child.id"
        :bone="child"
        :depth="depth + 1"
        :selected-bone-id="selectedBoneId"
        :expanded-bones="expandedBones"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @add-child="$emit('add-child', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Bone } from '@/core/skeleton/Bone';
import { useSkeleton } from '@/composables/useSkeleton';

const props = defineProps<{
  bone: Bone;
  depth?: number;
  selectedBoneId: string | null;
  expandedBones: string[];
}>();

const emit = defineEmits<{
  select: [boneId: string];
  toggle: [boneId: string];
  'add-child': [parentId: string];
  delete: [boneId: string];
}>();

const { getChildren } = useSkeleton();

const children = computed(() => getChildren(props.bone.id));
const hasChildren = computed(() => children.value.length > 0);
const isExpanded = computed(() => props.expandedBones.includes(props.bone.id));

function onToggle() {
  if (hasChildren.value) {
    emit('toggle', props.bone.id);
  }
}
</script>

<style scoped>
.bone-node {
  display: flex;
  flex-direction: column;
}

.bone-children {
  display: flex;
  flex-direction: column;
}

.expand-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #888;
  cursor: pointer;
  transition: transform 0.15s, color 0.15s;
  flex-shrink: 0;
}

.expand-icon.has-children {
  cursor: pointer;
}

.expand-icon.has-children:hover {
  color: #fff;
}

.bone-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.bone-item:hover {
  background: rgba(74, 158, 255, 0.1);
}

.bone-item.selected {
  background: rgba(74, 158, 255, 0.25);
}

.bone-icon {
  font-size: 14px;
}

.bone-name {
  flex: 1;
  font-size: 12px;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bone-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.bone-item:hover .bone-actions {
  opacity: 1;
}

.icon-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
