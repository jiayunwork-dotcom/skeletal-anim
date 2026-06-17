<template>
  <div class="panel state-machine-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        <span class="panel-icon">🔄</span>
        State Machine
      </h3>
      <div class="panel-actions">
        <label class="toggle-label">
          <input type="checkbox" v-model="useStateMachine" @change="toggleStateMachine" />
          Enable
        </label>
      </div>
    </div>
    <div class="panel-content" v-if="useStateMachine">
      <div class="states-section">
        <div class="section-header">
          <span class="section-title">States</span>
          <button class="icon-btn" @click="onAddState" title="Add State">
            ➕
          </button>
        </div>
        <div class="states-list">
          <div
            v-for="state in states"
            :key="state.id"
            class="state-item"
            :class="{ active: state.id === currentStateId }"
          >
            <div class="state-info">
              <span class="state-name">{{ state.name }}</span>
              <span class="state-clip">{{ getClipName(state.clipId) }}</span>
            </div>
            <button
              class="icon-btn small"
              @click="onRemoveState(state.id)"
              title="Remove State"
              :disabled="states.length <= 1"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      <div class="transitions-section">
        <div class="section-header">
          <span class="section-title">Transitions</span>
          <button class="icon-btn" @click="onAddTransition" title="Add Transition">
            ➕
          </button>
        </div>
        <div class="transitions-list" v-if="transitions.length > 0">
          <div
            v-for="transition in transitions"
            :key="transition.id"
            class="transition-item"
          >
            <div class="transition-info">
              <span class="transition-from">{{ getStateName(transition.fromStateId) }}</span>
              <span class="transition-arrow">→</span>
              <span class="transition-to">{{ getStateName(transition.toStateId) }}</span>
            </div>
            <div class="transition-condition" v-if="transition.condition">
              {{ transition.condition }}
            </div>
            <button
              class="icon-btn small"
              @click="onRemoveTransition(transition.id)"
              title="Remove Transition"
            >
              ✕
            </button>
          </div>
        </div>
        <p v-else class="empty-hint">No transitions defined</p>
      </div>

      <div class="parameters-section">
        <div class="section-header">
          <span class="section-title">Parameters</span>
          <button class="icon-btn" @click="onAddParameter" title="Add Parameter">
            ➕
          </button>
        </div>
        <div class="parameters-list">
          <div
            v-for="(value, name) in parameters"
            :key="name"
            class="parameter-item"
          >
            <span class="param-name">{{ name }}</span>
            <div class="param-control">
              <input
                v-if="typeof value === 'boolean'"
                type="checkbox"
                :checked="value"
                @change="(e) => onParameterChange(name, (e.target as HTMLInputElement).checked)"
              />
              <input
                v-else
                type="number"
                :value="value"
                step="0.1"
                class="property-input tiny"
                @change="(e) => onParameterChange(name, parseFloat((e.target as HTMLInputElement).value))"
              />
            </div>
            <button
              class="icon-btn small"
              @click="onRemoveParameter(name)"
              title="Remove Parameter"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="disabled-hint">
      <p>State machine is disabled.</p>
      <p class="hint">Toggle "Enable" above to use animation state machine.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAnimation } from '@/composables/useAnimation';

const {
  stateMachine,
  useStateMachine,
  enableStateMachine,
  disableStateMachine,
  addAnimationState,
  removeAnimationState,
  addStateTransition,
  removeStateTransition,
  setStateParameter,
  allClips,
} = useAnimation();

const states = computed(() => stateMachine.value?.states ? Array.from(stateMachine.value.states.values()) : []);
const transitions = computed(() => stateMachine.value?.transitions ? Array.from(stateMachine.value.transitions.values()) : []);
const parameters = computed<Record<string, boolean | number>>(() => stateMachine.value?.parameters ? (Object.fromEntries(stateMachine.value.parameters) as Record<string, boolean | number>) : {});
const currentStateId = computed(() => stateMachine.value?.currentStateId || '');

function toggleStateMachine() {
  if (useStateMachine.value) {
    enableStateMachine();
  } else {
    disableStateMachine();
  }
}

function getClipName(clipId?: string): string {
  if (!clipId) return 'No clip';
  const clip = allClips.value.find((c) => c.id === clipId);
  return clip?.name || 'Unknown';
}

function getStateName(stateId: string): string {
  const state = states.value.find((s) => s.id === stateId);
  return state?.name || 'Unknown';
}

function onAddState() {
  const name = prompt('Enter state name:', `State ${states.value.length + 1}`);
  if (name) {
    addAnimationState(name);
  }
}

function onRemoveState(stateId: string) {
  if (states.value.length <= 1) {
    alert('Cannot remove the last state!');
    return;
  }
  if (confirm('Remove this state?')) {
    removeAnimationState(stateId);
  }
}

function onAddTransition() {
  if (states.value.length < 2) {
    alert('Need at least 2 states to create a transition!');
    return;
  }

  const fromId = prompt('From state ID:', states.value[0]?.id || '');
  const toId = prompt('To state ID:', states.value[1]?.id || '');
  const condition = prompt('Condition (parameter name):', 'isWalking');

  if (fromId && toId) {
    addStateTransition(fromId, toId, condition || undefined);
  }
}

function onRemoveTransition(transitionId: string) {
  if (confirm('Remove this transition?')) {
    removeStateTransition(transitionId);
  }
}

function onAddParameter() {
  const name = prompt('Enter parameter name:', 'isWalking');
  const type = prompt('Type (boolean/number):', 'boolean');

  if (name) {
    const value = type === 'number' ? 0 : false;
    setStateParameter(name, value);
  }
}

function onParameterChange(name: string, value: boolean | number) {
  setStateParameter(name, value);
}

function onRemoveParameter(name: string) {
  if (confirm(`Remove parameter "${name}"?`)) {
    if (stateMachine.value) {
      delete stateMachine.value.parameters[name];
    }
  }
}
</script>

<style scoped>
.state-machine-panel {
  height: 300px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
}

.states-section,
.transitions-section,
.parameters-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.states-list,
.transitions-list,
.parameters-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 80px;
  overflow-y: auto;
}

.state-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: #1a1a2e;
  border: 1px solid transparent;
  border-radius: 4px;
  transition: all 0.2s;
}

.state-item.active {
  border-color: #4a9eff;
  background: rgba(74, 158, 255, 0.1);
}

.state-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.state-name {
  font-size: 12px;
  font-weight: 500;
  color: #fff;
}

.state-clip {
  font-size: 10px;
  color: #666;
}

.transition-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #1a1a2e;
  border-radius: 4px;
}

.transition-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #ccc;
}

.transition-arrow {
  color: #4a9eff;
}

.transition-from {
  color: #fff;
}

.transition-to {
  color: #fff;
}

.transition-condition {
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(74, 158, 255, 0.2);
  border-radius: 3px;
  color: #4a9eff;
  font-family: 'Consolas', monospace;
}

.parameter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #1a1a2e;
  border-radius: 4px;
}

.param-name {
  flex: 1;
  font-size: 12px;
  color: #ccc;
  font-family: 'Consolas', monospace;
}

.param-control {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
}

.property-input.tiny {
  width: 50px;
  padding: 2px 4px;
  font-size: 11px;
}

.icon-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333348;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) {
  background: #444458;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.icon-btn.small {
  width: 20px;
  height: 20px;
  font-size: 10px;
}

.empty-hint {
  text-align: center;
  color: #666;
  font-size: 11px;
  padding: 12px;
}

.disabled-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: #666;
}

.disabled-hint p {
  margin: 4px 0;
}

.disabled-hint .hint {
  font-size: 11px;
  color: #555;
}
</style>
