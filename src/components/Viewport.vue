<template>
  <div ref="viewportRef" class="viewport-container" @contextmenu.prevent>
    <canvas ref="canvasRef" class="viewport-canvas"></canvas>
    <div class="viewport-overlay">
      <div class="viewport-hud">
        <div class="hud-item">
          <span class="hud-label">FPS:</span>
          <span class="hud-value">{{ fps }}</span>
        </div>
        <div class="hud-item">
          <span class="hud-label">Bones:</span>
          <span class="hud-value">{{ boneCount }}</span>
        </div>
        <div class="hud-item" v-if="hasMesh">
          <span class="hud-label">Vertices:</span>
          <span class="hud-value">{{ vertexCount }}</span>
        </div>
        <div class="hud-item" v-if="ikEnabled">
          <span class="hud-label">IK Error:</span>
          <span class="hud-value">{{ ikError.toFixed(4) }}</span>
        </div>
      </div>
      <div class="viewport-camera-controls">
        <button class="camera-btn" @click="setFrontView" :class="{ active: viewMode === 'front' }">
          Front
        </button>
        <button class="camera-btn" @click="setSideView" :class="{ active: viewMode === 'side' }">
          Side
        </button>
        <button class="camera-btn" @click="setTopView" :class="{ active: viewMode === 'top' }">
          Top
        </button>
        <button class="camera-btn" @click="setPerspectiveView" :class="{ active: viewMode === 'perspective' }">
          3D
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { useSkeleton } from '@/composables/useSkeleton';
import { useAnimation } from '@/composables/useAnimation';
import { useRender } from '@/composables/useRender';
import { useIK } from '@/composables/useIK';
import { useSkinning } from '@/composables/useSkinning';
import { createBoneMesh, createGridHelper, createAxesHelper } from '@/utils/threeHelpers';
import skinningVertexShader from '@/shaders/skinningVertex.glsl?raw';
import weightFragmentShader from '@/shaders/weightFragment.glsl?raw';
const viewportRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const fps = ref(60);
const { allBones, selectedBoneId, selectBone, createBone, getBoneWorldPosition, getBoneEndPosition, meshData, skeleton } = useSkeleton();
const { updateAnimation, currentFrame } = useAnimation();
const { editMode, viewMode, renderMode, showGrid, showAxes, showOnionSkin, onionSkinRange, setFrontView, setSideView, setTopView, setPerspectiveView } = useRender();
const { ikEnabled, ikTarget, ikChain, updateTargetPosition, getEndEffectorError } = useIK();
const { hasWeights, paintWeightsAtPoint, weightPaintConfig } = useSkinning();
const boneCount = computed(() => allBones.value.length);
const vertexCount = computed(() => meshData.value?.vertices.length || 0);
const hasMesh = computed(() => meshData.value !== null);
const ikError = computed(() => getEndEffectorError());
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let transformControls: TransformControls;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let gridHelper: THREE.GridHelper;
let axesHelper: THREE.AxesHelper;
let boneMeshes: Map<string, THREE.Group> = new Map();
let skinnedMesh: THREE.Mesh | null = null;
let ikTargetMesh: THREE.Mesh | null = null;
let onionSkinMeshes: THREE.Group[] = [];
let animationId: number;
let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;
let isDragging = false;
let dragStartBone: string | null = null;
const viewModePositions: Record<string, THREE.Vector3> = {
 front: new THREE.Vector3(0, 1.5, 5),
 side: new THREE.Vector3(5, 1.5, 0),
 top: new THREE.Vector3(0, 5, 0.01),
 perspective: new THREE.Vector3(3, 2, 3),
};
function initScene() {
 if (!canvasRef.value || !viewportRef.value)
 return;
 scene = new THREE.Scene();
 scene.background = new THREE.Color(0x1a1a2e);
 const width = viewportRef.value.clientWidth;
 const height = viewportRef.value.clientHeight;
 camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
 camera.position.set(3, 2, 3);
 renderer = new THREE.WebGLRenderer({
 canvas: canvasRef.value,
 antialias: true,
 alpha: true,
 });
 renderer.setSize(width, height);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
 renderer.shadowMap.enabled = true;
 controls = new OrbitControls(camera, renderer.domElement);
 controls.enableDamping = true;
 controls.dampingFactor = 0.05;
 transformControls = new TransformControls(camera, renderer.domElement);
 transformControls.setMode('rotate');
 transformControls.addEventListener('dragging-changed', (event) => {
 controls.enabled = !event.value;
 });
 transformControls.addEventListener('objectChange', () => {
 if (selectedBoneId.value && transformControls.object) {
 const obj = transformControls.object;
 skeleton.value.setBoneRotation(selectedBoneId.value, obj.rotation);
 }
 });
 scene.add(transformControls);
 raycaster = new THREE.Raycaster();
 mouse = new THREE.Vector2();
 gridHelper = createGridHelper(10, 10);
 scene.add(gridHelper);
 axesHelper = createAxesHelper(1);
 scene.add(axesHelper);
 const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
 scene.add(ambientLight);
 const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
 directionalLight.position.set(5, 10, 7);
 directionalLight.castShadow = true;
 scene.add(directionalLight);
 const ikTargetGeometry = new THREE.SphereGeometry(0.1, 16, 16);
 const ikTargetMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
 ikTargetMesh = new THREE.Mesh(ikTargetGeometry, ikTargetMaterial);
 ikTargetMesh.visible = false;
 scene.add(ikTargetMesh);
 setupEventListeners();
 updateBoneMeshes();
 updateSkinnedMesh();
 animate();
}
function setupEventListeners() {
 if (!viewportRef.value || !canvasRef.value)
 return;
 canvasRef.value.addEventListener('mousedown', onMouseDown);
 canvasRef.value.addEventListener('mousemove', onMouseMove);
 canvasRef.value.addEventListener('mouseup', onMouseUp);
 canvasRef.value.addEventListener('wheel', onWheel);
 window.addEventListener('resize', onResize);
 window.addEventListener('keydown', onKeyDown);
}
function removeEventListeners() {
 if (canvasRef.value) {
 canvasRef.value.removeEventListener('mousedown', onMouseDown);
 canvasRef.value.removeEventListener('mousemove', onMouseMove);
 canvasRef.value.removeEventListener('mouseup', onMouseUp);
 canvasRef.value.removeEventListener('wheel', onWheel);
 }
 window.removeEventListener('resize', onResize);
 window.removeEventListener('keydown', onKeyDown);
}
function updateMouse(event: MouseEvent) {
 if (!canvasRef.value)
 return;
 const rect = canvasRef.value.getBoundingClientRect();
 mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
 mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}
function onMouseDown(event: MouseEvent) {
 updateMouse(event);
 if (event.button === 2)
 return;
 if (transformControls.dragging)
 return;
 raycaster.setFromCamera(mouse, camera);
 if (editMode.value === 'select') {
 const boneIntersects = raycaster.intersectObjects(Array.from(boneMeshes.values()).flatMap((g) => g.children), true);
 if (boneIntersects.length > 0) {
 const clickedMesh = boneIntersects[0].object;
 const boneGroup = clickedMesh.parent as THREE.Group;
 const boneId = Array.from(boneMeshes.entries()).find(([_, group]) => group === boneGroup)?.[0];
 if (boneId) {
 selectBone(boneId);
 updateTransformControls();
 }
 }
 else {
 selectBone(null);
 transformControls.detach();
 }
 }
 else if (editMode.value === 'create') {
 const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
 const intersection = new THREE.Vector3();
 raycaster.ray.intersectPlane(plane, intersection);
 if (intersection) {
 if (selectedBoneId.value) {
 createBone(selectedBoneId.value, intersection);
 }
 else {
 createBone(null, intersection);
 }
 updateBoneMeshes();
 }
 }
 else if (editMode.value === 'ik' && ikEnabled.value && ikTargetMesh) {
 const intersects = raycaster.intersectObject(ikTargetMesh);
 if (intersects.length > 0) {
 isDragging = true;
 controls.enabled = false;
 }
 }
 else if (editMode.value === 'weight' && skinnedMesh) {
 const intersects = raycaster.intersectObject(skinnedMesh);
 if (intersects.length > 0) {
 isDragging = true;
 const point = intersects[0].point;
 paintWeightsAtPoint(point, camera, skinnedMesh.matrixWorld);
 updateSkinnedMesh();
 }
 }
}
function onMouseMove(event: MouseEvent) {
 updateMouse(event);
 if (isDragging && editMode.value === 'ik' && ikEnabled.value) {
 const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
 const intersection = new THREE.Vector3();
 raycaster.ray.intersectPlane(plane, intersection);
 if (intersection) {
 updateTargetPosition(intersection);
 updateIkTargetMesh();
 }
 }
 else if (isDragging && editMode.value === 'weight' && skinnedMesh) {
 raycaster.setFromCamera(mouse, camera);
 const intersects = raycaster.intersectObject(skinnedMesh);
 if (intersects.length > 0) {
 const point = intersects[0].point;
 paintWeightsAtPoint(point, camera, skinnedMesh.matrixWorld);
 updateSkinnedMesh();
 }
 }
}
function onMouseUp() {
 isDragging = false;
 controls.enabled = true;
}
function onWheel(event: WheelEvent) {
 event.preventDefault();
}
function onResize() {
 if (!viewportRef.value || !camera || !renderer)
 return;
 const width = viewportRef.value.clientWidth;
 const height = viewportRef.value.clientHeight;
 camera.aspect = width / height;
 camera.updateProjectionMatrix();
 renderer.setSize(width, height);
}
function onKeyDown(event: KeyboardEvent) {
 if (event.key === 'Escape') {
 selectBone(null);
 transformControls.detach();
 }
 else if (event.key === 'g' || event.key === 'G') {
 controls.enabled = !controls.enabled;
 }
 else if (event.key === 'r' || event.key === 'R') {
 if (selectedBoneId.value) {
 transformControls.setMode('rotate');
 }
 }
 else if (event.key === 'Delete' || event.key === 'Backspace') {
 if (selectedBoneId.value) {
 const bones = skeleton.value.getAllBones();
 if (bones.length > 1) {
 skeleton.value.removeBone(selectedBoneId.value);
 selectBone(null);
 transformControls.detach();
 updateBoneMeshes();
 }
 }
 }
}
function updateBoneMeshes() {
 boneMeshes.forEach((group) => {
 scene.remove(group);
 });
 boneMeshes.clear();
 const bones = allBones.value;
 bones.forEach((bone) => {
 const startPos = getBoneWorldPosition(bone.id);
 const endPos = getBoneEndPosition(bone.id);
 if (startPos && endPos) {
 const isSelected = bone.id === selectedBoneId.value;
 const boneGroup = createBoneMesh(startPos, endPos, isSelected);
 boneGroup.userData.boneId = bone.id;
 boneMeshes.set(bone.id, boneGroup);
 scene.add(boneGroup);
 }
 });
 updateTransformControls();
}
function updateTransformControls() {
 if (!selectedBoneId.value || !transformControls) {
 transformControls.detach();
 return;
 }
 const boneGroup = boneMeshes.get(selectedBoneId.value);
 if (boneGroup) {
 transformControls.attach(boneGroup);
 }
}
function updateSkinnedMesh() {
 if (skinnedMesh) {
 scene.remove(skinnedMesh);
 skinnedMesh.geometry.dispose();
 (skinnedMesh.material as THREE.Material).dispose();
 skinnedMesh = null;
 }
 if (!meshData.value)
 return;
 const geometry = new THREE.BufferGeometry();
 const positions = new Float32Array(meshData.value.vertices.length * 3);
 const normals = new Float32Array(meshData.value.vertices.length * 3);
 const skinIndices = new Float32Array(meshData.value.vertices.length * 4);
 const skinWeights = new Float32Array(meshData.value.vertices.length * 4);
 meshData.value.vertices.forEach((vertex, i) => {
 positions[i * 3] = vertex.position[0];
 positions[i * 3 + 1] = vertex.position[1];
 positions[i * 3 + 2] = vertex.position[2];
 if (vertex.normal) {
 normals[i * 3] = vertex.normal[0];
 normals[i * 3 + 1] = vertex.normal[1];
 normals[i * 3 + 2] = vertex.normal[2];
 }
 const sortedWeights = [...vertex.weights].sort((a, b) => b.weight - a.weight).slice(0, 4);
 const bones = skeleton.value.getAllBones();
 sortedWeights.forEach((w, j) => {
 const boneIndex = bones.findIndex((b) => b.id === w.boneId);
 skinIndices[i * 4 + j] = boneIndex >= 0 ? boneIndex : 0;
 skinWeights[i * 4 + j] = w.weight;
 });
 });
 geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
 geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
 geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
 geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
 const indices = new Uint32Array(meshData.value.faces.length * 3);
 meshData.value.faces.forEach((face, i) => {
 indices[i * 3] = face[0];
 indices[i * 3 + 1] = face[1];
 indices[i * 3 + 2] = face[2];
 });
 geometry.setIndex(new THREE.BufferAttribute(indices, 1));
 const bones = skeleton.value.getAllBones();
 const bindMatrices: number[] = [];
 const boneMatrices: number[] = [];
 bones.forEach((bone) => {
 const bindMatrix = new THREE.Matrix4();
 bindMatrix.makeTranslation(bone.position[0], bone.position[1], bone.position[2]);
 bindMatrices.push(...bindMatrix.elements);
 const worldTransform = bone.getWorldTransform(skeleton.value.bones);
 boneMatrices.push(...worldTransform.elements);
 });
 const material = new THREE.ShaderMaterial({
 vertexShader: skinningVertexShader,
 fragmentShader: weightFragmentShader,
 uniforms: {
 bindMatrices: { value: bindMatrices },
 boneMatrices: { value: boneMatrices },
 opacity: { value: 0.8 },
 color: { value: new THREE.Color(0x4a9eff) },
 showWeights: { value: renderMode.value === 'weight' },
 },
 transparent: true,
 side: THREE.DoubleSide,
 wireframe: renderMode.value === 'wireframe',
 });
 skinnedMesh = new THREE.Mesh(geometry, material);
 skinnedMesh.frustumCulled = false;
 if (renderMode.value !== 'bones') {
 scene.add(skinnedMesh);
 }
}
function updateBoneMatrices() {
 if (!skinnedMesh || !meshData.value)
 return;
 const material = skinnedMesh.material as THREE.ShaderMaterial;
 const bones = skeleton.value.getAllBones();
 const boneMatrices: number[] = [];
 bones.forEach((bone) => {
 const worldTransform = bone.getWorldTransform(skeleton.value.bones);
 boneMatrices.push(...worldTransform.elements);
 });
 material.uniforms.boneMatrices.value = boneMatrices;
 material.uniforms.showWeights.value = renderMode.value === 'weight';
 material.wireframe = renderMode.value === 'wireframe';
}
function updateIkTargetMesh() {
 if (!ikTargetMesh)
 return;
 ikTargetMesh.visible = ikEnabled.value;
 if (ikEnabled.value) {
 ikTargetMesh.position.copy(ikTarget.value);
 }
}
function updateOnionSkin() {
 onionSkinMeshes.forEach((group) => scene.remove(group));
 onionSkinMeshes = [];
 if (!showOnionSkin.value)
 return;
 const currentF = currentFrame.value;
 for (let offset = -onionSkinRange.value; offset <= onionSkinRange.value; offset++) {
 if (offset === 0)
 continue;
 const frame = currentF + offset;
 const opacity = 0.3 * (1 - Math.abs(offset) / (onionSkinRange.value + 1));
 const poseGroup = new THREE.Group();
 poseGroup.userData.isOnionSkin = true;
 const bones = skeleton.value.getAllBones();
 bones.forEach((bone) => {
 const startPos = bone.getWorldPosition(skeleton.value.bones);
 const endPos = bone.getEndPosition(skeleton.value.bones);
 if (startPos && endPos) {
 const boneMesh = createBoneMesh(startPos, endPos, false);
 boneMesh.traverse((child) => {
 if (child instanceof THREE.Mesh) {
 const mat = child.material as THREE.MeshBasicMaterial;
 mat.opacity = opacity;
 mat.color.setHex(0x666666);
 }
 });
 poseGroup.add(boneMesh);
 }
 });
 onionSkinMeshes.push(poseGroup);
 scene.add(poseGroup);
 }
}
function updateViewMode() {
 const targetPos = viewModePositions[viewMode.value] || viewModePositions.perspective;
 camera.position.copy(targetPos);
 controls.target.set(0, 1.5, 0);
 controls.update();
}
function animate(currentTime = 0) {
 animationId = requestAnimationFrame(animate);
 const deltaTime = (currentTime - lastTime) / 1000;
 lastTime = currentTime;
 frameCount++;
 fpsTime += deltaTime;
 if (fpsTime >= 1) {
 fps.value = Math.round(frameCount / fpsTime);
 frameCount = 0;
 fpsTime = 0;
 }
 updateAnimation(deltaTime);
 updateBoneMeshes();
 updateBoneMatrices();
 updateIkTargetMesh();
 updateOnionSkin();
 gridHelper.visible = showGrid.value;
 axesHelper.visible = showAxes.value;
 if (skinnedMesh) {
 skinnedMesh.visible = renderMode.value !== 'bones';
 }
 controls.update();
 renderer.render(scene, camera);
}
watch(selectedBoneId, () => {
 updateBoneMeshes();
});
watch(renderMode, () => {
 updateSkinnedMesh();
});
watch(viewMode, () => {
 updateViewMode();
});
watch(meshData, () => {
 updateSkinnedMesh();
}, { deep: true });
onMounted(() => {
 initScene();
 updateViewMode();
});
onUnmounted(() => {
 if (animationId) {
 cancelAnimationFrame(animationId);
 }
 removeEventListeners();
 if (renderer) {
 renderer.dispose();
 }
});
</script>

<style scoped>
.viewport-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #1a1a2e;
}

.viewport-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.viewport-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.viewport-hud {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #fff;
}

.hud-item {
  display: flex;
  gap: 8px;
}

.hud-label {
  color: #888;
}

.hud-value {
  color: #4a9eff;
  font-weight: bold;
}

.viewport-camera-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  pointer-events: auto;
}

.camera-btn {
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid #333;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.camera-btn:hover {
  background: rgba(74, 158, 255, 0.3);
  border-color: #4a9eff;
  color: #fff;
}

.camera-btn.active {
  background: rgba(74, 158, 255, 0.5);
  border-color: #4a9eff;
  color: #fff;
}
</style>
