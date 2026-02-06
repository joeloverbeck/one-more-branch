import { Choice, isChoice } from './choice';
import { PageId } from './id';
import {
  AccumulatedState,
  Inventory,
  InventoryChanges,
  StateChanges,
  applyInventoryChanges,
  applyStateChanges,
  createEmptyAccumulatedState,
  createEmptyInventoryChanges,
  createEmptyStateChanges,
} from './state';

export interface Page {
  readonly id: PageId;
  readonly narrativeText: string;
  readonly choices: Choice[];
  readonly stateChanges: StateChanges;
  readonly accumulatedState: AccumulatedState;
  readonly inventoryChanges: InventoryChanges;
  readonly accumulatedInventory: Inventory;
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
  isEnding: boolean;
  parentPageId: PageId | null;
  parentChoiceIndex: number | null;
  parentAccumulatedState?: AccumulatedState;
  parentAccumulatedInventory?: Inventory;
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
  const stateChanges = data.stateChanges ?? createEmptyStateChanges();
  const inventoryChanges = data.inventoryChanges ?? createEmptyInventoryChanges();

  return {
    id: data.id,
    narrativeText: data.narrativeText.trim(),
    choices: data.choices,
    stateChanges,
    accumulatedState: applyStateChanges(parentState, stateChanges),
    inventoryChanges,
    accumulatedInventory: applyInventoryChanges(parentInventory, inventoryChanges),
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
