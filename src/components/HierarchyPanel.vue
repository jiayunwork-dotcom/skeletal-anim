<template>
  <div class="panel hierarchy-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        <span class="panel-icon">📋</span>
        Skeleton Hierarchy
      </h3>
      <div class="panel-actions">
        <button class="icon-btn" @click="onAddBone" title="Add Bone">
          ➕
        </button>
      </div>
    </div>
    <div class="panel-content">
      <div class="bone-tree">
        <BoneTreeNode
          v-for="bone in rootBones"
          :key="bone.id"
          :bone="bone"
          :selected-bone-id="selectedBoneId"
          @select="onSelectBone"
          @add-child="onAddChildBone"
          @delete="onDeleteBone"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSkeleton } from '@/composables/useSkeleton';
import type { Bone } from '@/core/skeleton/Bone';
import * as THREE from 'three';

const { allBones, selectedBoneId, selectBone, createBone, deleteBone, getChildren, skeleton } = useSkeleton();

const rootBones = computed(() => getChildren(null));

function onSelectBone(boneId: string) {
  selectBone(boneId);
}

function onAddBone() {
  const position = new THREE.Vector3(0, 1, 0);
  if (selectedBoneId.value) {
    const selected = allBones.value.find((b) => b.id === selectedBoneId.value);
    if (selected) {
      const endPos = selected.getEndPosition(skeleton.value.bones);
      if (endPos) {
        position.copy(endPos);
      }
    }
  }
  createBone(selectedBoneId.value, position);
}

function onAddChildBone(parentId: string) {
  const parent = allBones.value.find((b) => b.id === parentId);
  if (parent) {
    const endPos = parent.getEndPosition(skeleton.value.bones);
    if (endPos) {
      createBone(parentId, endPos);
    }
  }
}

function onDeleteBone(boneId: string) {
  if (allBones.value.length <= 1) {
    alert('Cannot delete the last bone!');
    return;
  }
  if (confirm('Delete this bone and all its children?')) {
    deleteBone(boneId);
  }
}
</script>

<script lang="ts">
import { defineComponent, h } from 'vue';

export const BoneTreeNode = defineComponent({
  name: 'BoneTreeNode',
  props: {
    bone: { type: Object as () => Bone, required: true },
    selectedBoneId: { type: String, default: null },
    depth: { type: Number, default: 0 },
  },
  emits: ['select', 'add-child', 'delete'],
  setup(props, { emit, slots }) {
    const { getChildren } = useSkeleton();

    const hasChildren = () => getChildren(props.bone.id).length > 0;

    const children = () => getChildren(props.bone.id);

    const onSelect = () => {
      emit('select', props.bone.id);
    };

    const onAddChild = (e: Event) => {
      e.stopPropagation();
      emit('add-child', props.bone.id);
    };

    const onDelete = (e: Event) => {
      e.stopPropagation();
      emit('delete', props.bone.id);
    };

    return () =>
      h('div', { class: 'bone-node' }, [
        h(
          'div',
          {
            class: ['bone-item', { selected: props.selectedBoneId === props.bone.id }],
            style: { paddingLeft: `${props.depth * 16 + 8}px` },
            onClick: onSelect,
          },
          [
            h('span', { class: 'bone-icon' }, '🦴'),
            h('span', { class: 'bone-name' }, props.bone.name),
            h('div', { class: 'bone-actions' }, [
              h(
                'button',
                { class: 'icon-btn', title: 'Add Child', onClick: onAddChild },
                '➕'
              ),
              h(
                'button',
                { class: 'icon-btn', title: 'Delete', onClick: onDelete },
                '🗑️'
              ),
            ]),
          ]
        ),
        hasChildren()
          ? h(
              'div',
              { class: 'bone-children' },
              children().map((child: Bone) =>
                h(BoneTreeNode, {
                  key: child.id,
                  bone: child,
                  selectedBoneId: props.selectedBoneId,
                  depth: props.depth + 1,
                  onSelect: (id: string) => emit('select', id),
                  onAddChild: (id: string) => emit('add-child', id),
                  onDelete: (id: string) => emit('delete', id),
                })
              )
            )
          : null,
      ]);
  },
});
</script>

<style scoped>
.hierarchy-panel {
  height: 280px;
}

.bone-tree {
  display: flex;
  flex-direction: column;
}

.bone-node {
  display: flex;
  flex-direction: column;
}

.bone-item {
  display: flex;
  align-items: center;
  gap: 8px;
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
