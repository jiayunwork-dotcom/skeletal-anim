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
          :depth="0"
          :selected-bone-id="selectedBoneId"
          :expanded-bones="expandedBones"
          @select="onSelectBone"
          @toggle="onToggleExpand"
          @add-child="onAddChildBone"
          @delete="onDeleteBone"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import BoneTreeNode from './BoneTreeNode.vue';
import { useSkeleton } from '@/composables/useSkeleton';
import * as THREE from 'three';

const { allBones, boneCount, selectedBoneId, selectBone, createBone, deleteBone, getChildren, skeleton } = useSkeleton();

const rootBones = computed(() => getChildren(null));
const expandedBones = ref<string[]>([]);

function expandAll() {
  const newList: string[] = [];
  allBones.value.forEach((bone) => {
    if (getChildren(bone.id).length > 0) {
      newList.push(bone.id);
    }
  });
  expandedBones.value = newList;
}

onMounted(() => {
  nextTick(() => {
    expandAll();
  });
});

watch(boneCount, () => {
  nextTick(() => {
    expandAll();
  });
});

function onSelectBone(boneId: string) {
  selectBone(boneId);
}

function onToggleExpand(boneId: string) {
  const index = expandedBones.value.indexOf(boneId);
  if (index >= 0) {
    expandedBones.value.splice(index, 1);
  } else {
    expandedBones.value.push(boneId);
  }
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
      if (!expandedBones.value.includes(parentId)) {
        expandedBones.value.push(parentId);
      }
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
    const idx = expandedBones.value.indexOf(boneId);
    if (idx >= 0) {
      expandedBones.value.splice(idx, 1);
    }
  }
}
</script>

<style scoped>
.hierarchy-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.bone-tree {
  display: flex;
  flex-direction: column;
  user-select: none;
}
</style>
