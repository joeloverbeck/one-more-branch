import { Choice, isChoice } from './choice';
import { PageId } from './id';
import { AccumulatedStructureState, createEmptyAccumulatedStructureState } from './story-arc';
import {
  AccumulatedCharacterState,
  AccumulatedState,
  CharacterStateChanges,
  Health,
  HealthChanges,
  Inventory,
  InventoryChanges,
  StateChanges,
  applyCharacterStateChanges,
  applyHealthChanges,
  applyInventoryChanges,
  applyStateChanges,
  createEmptyAccumulatedCharacterState,
  createEmptyAccumulatedState,
  createEmptyCharacterStateChanges,
  createEmptyHealthChanges,
  createEmptyInventoryChanges,
  createEmptyStateChanges,
} from './state/index.js';

export interface Page {
  readonly id: PageId;
  readonly narrativeText: string;
  readonly choices: Choice[];
  readonly stateChanges: StateChanges;
  readonly accumulatedState: AccumulatedState;
  readonly inventoryChanges: InventoryChanges;
  readonly accumulatedInventory: Inventory;
  readonly healthChanges: HealthChanges;
  readonly accumulatedHealth: Health;
  readonly characterStateChanges: CharacterStateChanges;
  readonly accumulatedCharacterState: AccumulatedCharacterState;
  readonly accumulatedStructureState: AccumulatedStructureState;
  readonly isEnding: boolean;
  readonly parentPageId: PageId | null;
  readonly parentChoiceIndex: number | null;
}

export interface CreatePageData {
  id: PageId;
  narrativeText: string;
  choices: Choice[];
  stateChanges?: StateChanges;
  inventoryChanges?: InventoryChanges;
  healthChanges?: HealthChanges;
  characterStateChanges?: CharacterStateChanges;
  isEnding: boolean;
  parentPageId: PageId | null;
  parentChoiceIndex: number | null;
  parentAccumulatedState?: AccumulatedState;
  parentAccumulatedInventory?: Inventory;
  parentAccumulatedHealth?: Health;
  parentAccumulatedCharacterState?: AccumulatedCharacterState;
  parentAccumulatedStructureState?: AccumulatedStructureState;
}

export function createPage(data: CreatePageData): Page {
  if (data.isEnding && data.choices.length > 0) {
    throw new Error('Ending pages must have no choices');
  }

  if (!data.isEnding && data.choices.length < 2) {
    throw new Error('Non-ending pages must have at least 2 choices');
  }

  if (data.id === 1) {
    if (data.parentPageId !== null || data.parentChoiceIndex !== null) {
      throw new Error('Page 1 cannot have a parent');
    }
  } else if (data.parentPageId === null || data.parentChoiceIndex === null) {
    throw new Error('Pages after page 1 must have a parent');
  }

  const parentState = data.parentAccumulatedState ?? createEmptyAccumulatedState();
  const parentInventory = data.parentAccumulatedInventory ?? [];
  const parentHealth = data.parentAccumulatedHealth ?? [];
  const parentCharacterState = data.parentAccumulatedCharacterState ?? createEmptyAccumulatedCharacterState();
  const parentStructureState =
    data.parentAccumulatedStructureState ?? createEmptyAccumulatedStructureState();
  const stateChanges = data.stateChanges ?? createEmptyStateChanges();
  const inventoryChanges = data.inventoryChanges ?? createEmptyInventoryChanges();
  const healthChanges = data.healthChanges ?? createEmptyHealthChanges();
  const characterStateChanges = data.characterStateChanges ?? createEmptyCharacterStateChanges();

  return {
    id: data.id,
    narrativeText: data.narrativeText.trim(),
    choices: data.choices,
    stateChanges,
    accumulatedState: applyStateChanges(parentState, stateChanges),
    inventoryChanges,
    accumulatedInventory: applyInventoryChanges(parentInventory, inventoryChanges),
    healthChanges,
    accumulatedHealth: applyHealthChanges(parentHealth, healthChanges),
    characterStateChanges,
    accumulatedCharacterState: applyCharacterStateChanges(parentCharacterState, characterStateChanges),
    accumulatedStructureState: parentStructureState,
    isEnding: data.isEnding,
    parentPageId: data.parentPageId,
    parentChoiceIndex: data.parentChoiceIndex,
  };
}

function isStateChanges(value: unknown): value is StateChanges {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj['added']) &&
    obj['added'].every((item: unknown) => typeof item === 'string') &&
    Array.isArray(obj['removed']) &&
    obj['removed'].every((item: unknown) => typeof item === 'string')
  );
}

function isAccumulatedStructureState(value: unknown): value is AccumulatedStructureState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['currentActIndex'] === 'number' &&
    Number.isInteger(obj['currentActIndex']) &&
    obj['currentActIndex'] >= 0 &&
    typeof obj['currentBeatIndex'] === 'number' &&
    Number.isInteger(obj['currentBeatIndex']) &&
    obj['currentBeatIndex'] >= 0 &&
    Array.isArray(obj['beatProgressions'])
  );
}

export function isPage(value: unknown): value is Page {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === 'number' &&
    Number.isInteger(obj['id']) &&
    obj['id'] >= 1 &&
    typeof obj['narrativeText'] === 'string' &&
    Array.isArray(obj['choices']) &&
    obj['choices'].every(isChoice) &&
    isStateChanges(obj['stateChanges']) &&
    isAccumulatedStructureState(obj['accumulatedStructureState']) &&
    typeof obj['isEnding'] === 'boolean'
  );
}

export function isPageFullyExplored(page: Page): boolean {
  return page.choices.every(choice => choice.nextPageId !== null);
}

export function getUnexploredChoiceIndices(page: Page): number[] {
  return page.choices
    .map((choice, index) => (choice.nextPageId === null ? index : -1))
    .filter(index => index !== -1);
}
