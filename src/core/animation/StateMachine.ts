import * as THREE from 'three';
import { AnimationClip } from './AnimationClip';
import { Animator } from './Animator';
import type { StateMachineData, StateData, TransitionData } from '@/types';
import { generateId } from '@/utils/math';
import { eulerToArray } from '@/utils/threeHelpers';

export class State {
  id: string;
  name: string;
  clipId: string;
  speed: number;
  position: { x: number; y: number };

  constructor(data: Partial<StateData> = {}) {
    this.id = data.id || generateId();
    this.name = data.name || 'State';
    this.clipId = data.clipId || '';
    this.speed = data.speed || 1;
    this.position = {
      x: data.position?.[0] || 0,
      y: data.position?.[1] || 0,
    };
  }

  toData(): StateData {
    return {
      id: this.id,
      name: this.name,
      clipId: this.clipId,
      speed: this.speed,
      position: [this.position.x, this.position.y],
    };
  }
}

export class Transition {
  id: string;
  fromStateId: string;
  toStateId: string;
  blendDuration: number;
  condition: string;

  constructor(data: Partial<TransitionData> = {}) {
    this.id = data.id || generateId();
    this.fromStateId = data.fromStateId || '';
    this.toStateId = data.toStateId || '';
    this.blendDuration = data.blendDuration || 0.3;
    this.condition = data.condition || '';
  }

  toData(): TransitionData {
    return {
      id: this.id,
      fromStateId: this.fromStateId,
      toStateId: this.toStateId,
      blendDuration: this.blendDuration,
      condition: this.condition,
    };
  }
}

export class StateMachine {
  id: string;
  states: Map<string, State>;
  transitions: Map<string, Transition>;
  parameters: Map<string, boolean | number>;
  initialStateId: string;
  currentStateId: string;
  activeTransition: {
    transition: Transition;
    startTime: number;
    fromState: State;
    toState: State;
  } | null;

  animator: Animator | null;
  lastUpdateTime: number;

  constructor(data: Partial<StateMachineData> = {}, animator?: Animator) {
    this.id = data.id || generateId();
    this.states = new Map();
    this.transitions = new Map();
    this.parameters = new Map();
    this.initialStateId = data.initialStateId || '';
    this.currentStateId = data.initialStateId || '';
    this.activeTransition = null;
    this.animator = animator || null;
    this.lastUpdateTime = performance.now();

    if (data.states) {
      data.states.forEach((s) => this.states.set(s.id, new State(s)));
    }
    if (data.transitions) {
      data.transitions.forEach((t) => this.transitions.set(t.id, new Transition(t)));
    }
    if (data.parameters) {
      Object.entries(data.parameters).forEach(([k, v]) => this.parameters.set(k, v));
    }
  }

  toData(): StateMachineData {
    const parameters: Record<string, boolean | number> = {};
    this.parameters.forEach((v, k) => {
      parameters[k] = v;
    });

    return {
      id: this.id,
      states: Array.from(this.states.values()).map((s) => s.toData()),
      transitions: Array.from(this.transitions.values()).map((t) => t.toData()),
      parameters,
      initialStateId: this.initialStateId,
    };
  }

  setAnimator(animator: Animator): void {
    this.animator = animator;
  }

  addState(state: State): void {
    this.states.set(state.id, state);
    if (!this.initialStateId) {
      this.initialStateId = state.id;
      this.currentStateId = state.id;
    }
  }

  removeState(stateId: string): void {
    this.states.delete(stateId);
    
    const transitionsToRemove: string[] = [];
    this.transitions.forEach((t, id) => {
      if (t.fromStateId === stateId || t.toStateId === stateId) {
        transitionsToRemove.push(id);
      }
    });
    transitionsToRemove.forEach((id) => this.transitions.delete(id));

    if (this.currentStateId === stateId) {
      const firstState = this.states.values().next().value;
      this.currentStateId = firstState?.id || '';
    }
    if (this.initialStateId === stateId) {
      const firstState = this.states.values().next().value;
      this.initialStateId = firstState?.id || '';
    }
  }

  addTransition(transition: Transition): void {
    this.transitions.set(transition.id, transition);
  }

  removeTransition(transitionId: string): void {
    this.transitions.delete(transitionId);
  }

  getState(stateId: string): State | undefined {
    return this.states.get(stateId);
  }

  getCurrentState(): State | undefined {
    return this.states.get(this.currentStateId);
  }

  setParameter(name: string, value: boolean | number): void {
    this.parameters.set(name, value);
  }

  getParameter(name: string): boolean | number | undefined {
    return this.parameters.get(name);
  }

  evaluateCondition(condition: string): boolean {
    if (!condition.trim()) return true;

    try {
      const params: Record<string, boolean | number> = {};
      this.parameters.forEach((v, k) => {
        params[k] = v;
      });

      const func = new Function(...Object.keys(params), `return ${condition};`);
      return Boolean(func(...Object.values(params)));
    } catch {
      return false;
    }
  }

  checkTransitions(): Transition | null {
    const currentState = this.getCurrentState();
    if (!currentState) return null;

    for (const transition of this.transitions.values()) {
      if (transition.fromStateId === currentState.id) {
        if (this.evaluateCondition(transition.condition)) {
          return transition;
        }
      }
    }
    return null;
  }

  startTransition(transition: Transition): void {
    const fromState = this.states.get(transition.fromStateId);
    const toState = this.states.get(transition.toStateId);
    
    if (fromState && toState) {
      this.activeTransition = {
        transition,
        startTime: performance.now(),
        fromState,
        toState,
      };

      if (this.animator && toState.clipId) {
        this.animator.setBlendWeight(toState.clipId, 0);
      }
    }
  }

  update(): void {
    const now = performance.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    if (this.activeTransition) {
      const elapsed = (now - this.activeTransition.startTime) / 1000;
      const progress = elapsed / this.activeTransition.transition.blendDuration;

      if (progress >= 1) {
        this.currentStateId = this.activeTransition.toState.id;
        this.activeTransition = null;
        this.animator?.clearBlend();
        
        if (this.animator && this.currentStateId) {
          const state = this.getCurrentState();
          if (state?.clipId) {
            this.animator.play(state.clipId);
          }
        }
      } else {
        if (this.animator) {
          this.animator.setBlendWeight(
            this.activeTransition.toState.clipId,
            progress
          );
        }
      }
      return;
    }

    const transition = this.checkTransitions();
    if (transition) {
      this.startTransition(transition);
    }

    if (this.animator) {
      const currentState = this.getCurrentState();
      if (currentState) {
        this.animator.playbackState.speed = currentState.speed;
      }
      this.animator.update();
    }
  }

  setInitialState(stateId: string): void {
    if (this.states.has(stateId)) {
      this.initialStateId = stateId;
      if (!this.activeTransition) {
        this.currentStateId = stateId;
      }
    }
  }

  getTransitionsFromState(stateId: string): Transition[] {
    return Array.from(this.transitions.values()).filter(
      (t) => t.fromStateId === stateId
    );
  }

  getTransitionsToState(stateId: string): Transition[] {
    return Array.from(this.transitions.values()).filter(
      (t) => t.toStateId === stateId
    );
  }

  createState(name: string, clipId?: string): State {
    const state = new State({ name, clipId });
    this.addState(state);
    return state;
  }

  createTransition(fromId: string, toId: string, condition?: string): Transition {
    const transition = new Transition({
      fromStateId: fromId,
      toStateId: toId,
      condition: condition || '',
    });
    this.addTransition(transition);
    return transition;
  }

  reset(): void {
    this.currentStateId = this.initialStateId;
    this.activeTransition = null;
    this.lastUpdateTime = performance.now();

    if (this.animator) {
      this.animator.clearBlend();
      const initialState = this.getState(this.initialStateId);
      if (initialState?.clipId) {
        this.animator.play(initialState.clipId);
      }
    }
  }
}
