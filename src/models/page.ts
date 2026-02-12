import { Choice, isChoice } from './choice';
import { PageId } from './id';
import {
  ProtagonistAffect,
  createDefaultProtagonistAffect,
  isProtagonistAffect,
} from './protagonist-affect';
import { StructureVersionId, isStructureVersionId } from './structure-version';
import { AccumulatedStructureState, createEmptyAccumulatedStructureState } from './story-arc';
import type { NarrativePromise } from './state/keyed-entry';
import type { AnalystResult, StoryBible } from '../llm/types';
import {
  ActiveState,
  ActiveStateChanges,
  AccumulatedCharacterState,
  CharacterStateChanges,
  Health,
  HealthChanges,
  Inventory,
  InventoryChanges,
  applyActiveStateChanges,
  applyCharacterStateChanges,
  applyHealthChanges,
  applyInventoryChanges,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  createEmptyAccumulatedCharacterState,
  createEmptyCharacterStateChanges,
  createEmptyHealthChanges,
  createEmptyInventoryChanges,
  isActiveState,
  isActiveStateChanges,
} from './state/index.js';
import type { NpcAgenda, AccumulatedNpcAgendas } from './state/npc-agenda';
import { createEmptyAccumulatedNpcAgendas, applyAgendaUpdates } from './state/npc-agenda';

export interface Page {
  readonly id: PageId;
  readonly narrativeText: string;
  readonly sceneSummary: string;
  readonly choices: Choice[];
  readonly activeStateChanges: ActiveStateChanges;
  readonly accumulatedActiveState: ActiveState;
  readonly inventoryChanges: InventoryChanges;
  readonly accumulatedInventory: Inventory;
  readonly healthChanges: HealthChanges;
  readonly accumulatedHealth: Health;
  readonly characterStateChanges: CharacterStateChanges;
  readonly accumulatedCharacterState: AccumulatedCharacterState;
  readonly accumulatedStructureState: AccumulatedStructureState;
  readonly protagonistAffect: ProtagonistAffect;
  readonly structureVersionId: StructureVersionId | null;
  readonly storyBible: StoryBible | null;
  readonly analystResult: AnalystResult | null;
  readonly threadAges: Readonly<Record<string, number>>;
  readonly inheritedNarrativePromises: readonly NarrativePromise[];
  readonly npcAgendaUpdates: readonly NpcAgenda[];
  readonly accumulatedNpcAgendas: AccumulatedNpcAgendas;
  readonly isEnding: boolean;
  readonly parentPageId: PageId | null;
  readonly parentChoiceIndex: number | null;
}

export interface CreatePageData {
  id: PageId;
  narrativeText: string;
  sceneSummary: string;
  choices: Choice[];
  activeStateChanges?: ActiveStateChanges;
  inventoryChanges?: InventoryChanges;
  healthChanges?: HealthChanges;
  characterStateChanges?: CharacterStateChanges;
  isEnding: boolean;
  parentPageId: PageId | null;
  parentChoiceIndex: number | null;
  parentAccumulatedActiveState?: ActiveState;
  parentAccumulatedInventory?: Inventory;
  parentAccumulatedHealth?: Health;
  parentAccumulatedCharacterState?: AccumulatedCharacterState;
  parentAccumulatedStructureState?: AccumulatedStructureState;
  protagonistAffect?: ProtagonistAffect;
  structureVersionId?: StructureVersionId | null;
  storyBible?: StoryBible | null;
  analystResult?: AnalystResult | null;
  threadAges?: Readonly<Record<string, number>>;
  inheritedNarrativePromises?: readonly NarrativePromise[];
  npcAgendaUpdates?: readonly NpcAgenda[];
  parentAccumulatedNpcAgendas?: AccumulatedNpcAgendas;
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

  const parentActiveState = data.parentAccumulatedActiveState ?? createEmptyActiveState();
  const parentInventory = data.parentAccumulatedInventory ?? [];
  const parentHealth = data.parentAccumulatedHealth ?? [];
  const parentCharacterState = data.parentAccumulatedCharacterState ?? createEmptyAccumulatedCharacterState();
  const parentStructureState =
    data.parentAccumulatedStructureState ?? createEmptyAccumulatedStructureState();
  const activeStateChanges = data.activeStateChanges ?? createEmptyActiveStateChanges();
  const inventoryChanges = data.inventoryChanges ?? createEmptyInventoryChanges();
  const healthChanges = data.healthChanges ?? createEmptyHealthChanges();
  const characterStateChanges = data.characterStateChanges ?? createEmptyCharacterStateChanges();

  return {
    id: data.id,
    narrativeText: data.narrativeText.trim(),
    sceneSummary: data.sceneSummary.trim(),
    choices: data.choices,
    activeStateChanges,
    accumulatedActiveState: applyActiveStateChanges(parentActiveState, activeStateChanges),
    inventoryChanges,
    accumulatedInventory: applyInventoryChanges(parentInventory, inventoryChanges),
    healthChanges,
    accumulatedHealth: applyHealthChanges(parentHealth, healthChanges),
    characterStateChanges,
    accumulatedCharacterState: applyCharacterStateChanges(parentCharacterState, characterStateChanges),
    accumulatedStructureState: parentStructureState,
    protagonistAffect: data.protagonistAffect ?? createDefaultProtagonistAffect(),
    structureVersionId: data.structureVersionId ?? null,
    storyBible: data.storyBible ?? null,
    analystResult: data.analystResult ?? null,
    threadAges: data.threadAges ?? {},
    inheritedNarrativePromises: data.inheritedNarrativePromises ?? [],
    npcAgendaUpdates: data.npcAgendaUpdates ?? [],
    accumulatedNpcAgendas: applyAgendaUpdates(
      data.parentAccumulatedNpcAgendas ?? createEmptyAccumulatedNpcAgendas(),
      data.npcAgendaUpdates ?? [],
    ),
    isEnding: data.isEnding,
    parentPageId: data.parentPageId,
    parentChoiceIndex: data.parentChoiceIndex,
  };
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
  const structureVersionId = obj['structureVersionId'];
  const structureVersionIdValid =
    structureVersionId === null || isStructureVersionId(structureVersionId);

  const protagonistAffectValid = isProtagonistAffect(obj['protagonistAffect']);
  const activeStateChangesValid = isActiveStateChanges(obj['activeStateChanges']);
  const accumulatedActiveStateValid = isActiveState(obj['accumulatedActiveState']);

  return (
    typeof obj['id'] === 'number' &&
    Number.isInteger(obj['id']) &&
    obj['id'] >= 1 &&
    typeof obj['narrativeText'] === 'string' &&
    typeof obj['sceneSummary'] === 'string' &&
    Array.isArray(obj['choices']) &&
    obj['choices'].every(isChoice) &&
    activeStateChangesValid &&
    accumulatedActiveStateValid &&
    isAccumulatedStructureState(obj['accumulatedStructureState']) &&
    protagonistAffectValid &&
    structureVersionIdValid &&
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
