import type { KnowledgeAsymmetry } from '../models/state/knowledge-state.js';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda.js';
import type { AccumulatedNpcRelationships } from '../models/state/npc-relationship.js';
import type { GenreFrame } from '../models/concept-generator.js';
import type { StorySpine } from '../models/story-spine.js';

export type ThematicCharge = 'THESIS_SUPPORTING' | 'ANTITHESIS_SUPPORTING' | 'AMBIGUOUS';
export type NarrativeFocus = 'DEEPENING' | 'BROADENING' | 'BALANCED';

export interface DetectedRelationshipShift {
  readonly npcName: string;
  readonly shiftDescription: string;
  readonly suggestedValenceChange: number;
  readonly suggestedNewDynamic: string;
}

export interface SceneQualityResult {
  toneAdherent: boolean;
  toneDriftDescription: string;
  thematicCharge: ThematicCharge;
  thematicChargeDescription: string;
  narrativeFocus: NarrativeFocus;
  npcCoherenceAdherent: boolean;
  npcCoherenceIssues: string;
  relationshipShiftsDetected: DetectedRelationshipShift[];
  knowledgeAsymmetryDetected: KnowledgeAsymmetry[];
  dramaticIronyOpportunities: string[];
}

export interface SceneQualityContext {
  readonly narrative: string;
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly thematicQuestion: string;
  readonly antithesis: string;
  readonly spine?: StorySpine;
  readonly genreFrame?: GenreFrame;
  readonly accumulatedNpcAgendas?: AccumulatedNpcAgendas;
  readonly accumulatedNpcRelationships?: AccumulatedNpcRelationships;
}
