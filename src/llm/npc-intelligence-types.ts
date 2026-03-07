import type { KnowledgeAsymmetry } from '../models/state/knowledge-state.js';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda.js';
import type { AccumulatedNpcRelationships } from '../models/state/npc-relationship.js';
import type { GenreFrame } from '../models/concept-generator.js';
import type { StorySpine } from '../models/story-spine.js';

export interface DetectedRelationshipShift {
  readonly npcName: string;
  readonly shiftDescription: string;
  readonly suggestedValenceChange: number;
  readonly suggestedNewDynamic: string;
}

export interface NpcIntelligenceResult {
  npcCoherenceAdherent: boolean;
  npcCoherenceIssues: string;
  relationshipShiftsDetected: DetectedRelationshipShift[];
  knowledgeAsymmetryDetected: KnowledgeAsymmetry[];
  dramaticIronyOpportunities: string[];
}

export interface AgendaResolverAnalystSignals {
  readonly npcCoherenceIssues?: string;
  readonly relationshipShiftsDetected?: readonly DetectedRelationshipShift[];
  readonly knowledgeAsymmetryDetected?: readonly KnowledgeAsymmetry[];
}

export interface NpcIntelligenceContext {
  readonly narrative: string;
  readonly protagonistName: string;
  readonly accumulatedNpcAgendas?: AccumulatedNpcAgendas;
  readonly accumulatedNpcRelationships?: AccumulatedNpcRelationships;
  readonly spine?: StorySpine;
  readonly genreFrame?: GenreFrame;
}
