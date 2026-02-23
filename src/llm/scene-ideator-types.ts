import type { DecomposedCharacter } from '../models/decomposed-character.js';
import type { DecomposedWorld } from '../models/decomposed-world.js';
import type { ActiveState, TrackedPromise } from '../models/state/index.js';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda.js';
import type { AccumulatedNpcRelationships } from '../models/state/npc-relationship.js';
import type { AccumulatedStructureState, StoryStructure } from '../models/story-arc.js';
import type { StorySpine } from '../models/story-spine.js';
import type { KeyedEntry } from '../models/state/index.js';
import type { AncestorSummary } from './generation-pipeline-types.js';
import type { SceneDirectionOption } from '../models/scene-direction.js';

export interface SceneIdeatorOpeningContext {
  readonly mode: 'opening';
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly spine?: StorySpine;
  readonly structure?: StoryStructure;
  readonly decomposedCharacters: readonly DecomposedCharacter[];
  readonly decomposedWorld: DecomposedWorld;
  readonly startingSituation?: string;
}

export interface SceneIdeatorContinuationContext {
  readonly mode: 'continuation';
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly spine?: StorySpine;
  readonly structure?: StoryStructure;
  readonly accumulatedStructureState?: AccumulatedStructureState;
  readonly decomposedCharacters: readonly DecomposedCharacter[];
  readonly decomposedWorld: DecomposedWorld;
  readonly previousNarrative: string;
  readonly selectedChoice: string;
  readonly activeState: ActiveState;
  readonly ancestorSummaries: readonly AncestorSummary[];
  readonly threadAges?: Readonly<Record<string, number>>;
  readonly accumulatedPromises: readonly TrackedPromise[];
  readonly accumulatedNpcAgendas?: AccumulatedNpcAgendas;
  readonly accumulatedNpcRelationships?: AccumulatedNpcRelationships;
  readonly accumulatedInventory: readonly KeyedEntry[];
  readonly accumulatedHealth: readonly KeyedEntry[];
}

export type SceneIdeatorContext =
  | SceneIdeatorOpeningContext
  | SceneIdeatorContinuationContext;

export interface SceneIdeationResult {
  readonly options: readonly SceneDirectionOption[];
  readonly rawResponse: string;
}
