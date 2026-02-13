import type { DecomposedCharacter } from '../models/decomposed-character.js';
import type { DecomposedWorld } from '../models/decomposed-world.js';
import type { Npc } from '../models/npc.js';
import type { ProtagonistAffect } from '../models/protagonist-affect.js';
import type {
  ActiveState,
  KeyedEntry,
  NarrativePromise,
  ThreadPayoffAssessment,
} from '../models/state/index.js';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../models/state/npc-agenda.js';
import type { AccumulatedStructureState, StoryStructure } from '../models/story-arc.js';
import type { ObjectiveEvidenceStrength, SceneMomentum } from './analyst-types.js';
import type {
  AncestorSummary,
  MomentumTrajectory,
  ReconciliationFailureReason,
} from './generation-pipeline-types.js';
import type { StoryBible } from './lorekeeper-types.js';
import type { PagePlan } from './planner-types.js';

export interface OpeningContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  toneKeywords?: readonly string[];
  toneAntiKeywords?: readonly string[];
  npcs?: readonly Npc[];
  startingSituation?: string;
  structure?: StoryStructure;
  initialNpcAgendas?: readonly NpcAgenda[];
  decomposedCharacters?: readonly DecomposedCharacter[];
  decomposedWorld?: DecomposedWorld;
  pagePlan?: PagePlan;
  storyBible?: StoryBible;
  reconciliationFailureReasons?: readonly ReconciliationFailureReason[];
}

export interface ContinuationContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  toneKeywords?: readonly string[];
  toneAntiKeywords?: readonly string[];
  npcs?: readonly Npc[];
  decomposedCharacters?: readonly DecomposedCharacter[];
  decomposedWorld?: DecomposedWorld;
  globalCanon: readonly string[];
  globalCharacterCanon: Readonly<Record<string, readonly string[]>>;
  storyArc?: string | null;
  structure?: StoryStructure;
  accumulatedStructureState?: AccumulatedStructureState;
  previousNarrative: string;
  selectedChoice: string;
  suggestedProtagonistSpeech?: string;

  accumulatedInventory: readonly KeyedEntry[];
  accumulatedHealth: readonly KeyedEntry[];
  accumulatedCharacterState: Readonly<Record<string, readonly KeyedEntry[]>>;
  parentProtagonistAffect?: ProtagonistAffect;

  activeState: ActiveState;

  grandparentNarrative: string | null;
  ancestorSummaries: readonly AncestorSummary[];

  parentToneDriftDescription?: string;
  parentPacingNudge?: string | null;
  parentPacingIssueReason?: string;
  parentSceneMomentum?: SceneMomentum;
  parentObjectiveEvidenceStrength?: ObjectiveEvidenceStrength;
  momentumTrajectory?: MomentumTrajectory;

  threadAges?: Readonly<Record<string, number>>;
  inheritedNarrativePromises?: readonly NarrativePromise[];
  parentAnalystNarrativePromises?: readonly NarrativePromise[];
  parentThreadPayoffAssessments?: readonly ThreadPayoffAssessment[];

  accumulatedNpcAgendas?: AccumulatedNpcAgendas;

  pagePlan?: PagePlan;
  storyBible?: StoryBible;
  reconciliationFailureReasons?: readonly ReconciliationFailureReason[];
}

export interface OpeningPagePlanContext extends OpeningContext {
  mode: 'opening';
}

export interface ContinuationPagePlanContext extends ContinuationContext {
  mode: 'continuation';
}

export type PagePlanContext = OpeningPagePlanContext | ContinuationPagePlanContext;

export interface LorekeeperContext {
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: string;
  readonly toneKeywords?: readonly string[];
  readonly toneAntiKeywords?: readonly string[];
  readonly npcs?: readonly Npc[];
  readonly decomposedCharacters?: readonly DecomposedCharacter[];
  readonly decomposedWorld?: DecomposedWorld;
  readonly globalCanon: readonly string[];
  readonly globalCharacterCanon: Readonly<Record<string, readonly string[]>>;
  readonly accumulatedCharacterState: Readonly<Record<string, readonly KeyedEntry[]>>;
  readonly activeState: ActiveState;
  readonly structure?: StoryStructure;
  readonly accumulatedStructureState?: AccumulatedStructureState;
  readonly accumulatedNpcAgendas?: AccumulatedNpcAgendas;
  readonly ancestorSummaries: readonly AncestorSummary[];
  readonly grandparentNarrative: string | null;
  readonly previousNarrative: string;
  readonly pagePlan: PagePlan;
  readonly startingSituation?: string;
}
