import type { NpcAgenda } from '../models/state/npc-agenda.js';
import type { NpcRelationship } from '../models/state/npc-relationship.js';

export interface StoryBibleCharacter {
  readonly name: string;
  readonly role: string;
  readonly relevantProfile: string;
  readonly speechPatterns: string;
  readonly protagonistRelationship: string;
  readonly interCharacterDynamics?: string;
  readonly currentState: string;
}

export interface StoryBible {
  readonly sceneWorldContext: string;
  readonly relevantCharacters: readonly StoryBibleCharacter[];
  readonly relevantCanonFacts: readonly string[];
  readonly relevantHistory: string;
}

export interface LorekeeperResult extends StoryBible {
  readonly rawResponse: string;
}

export interface AgendaResolverResult {
  readonly updatedAgendas: readonly NpcAgenda[];
  readonly updatedRelationships: readonly NpcRelationship[];
  readonly rawResponse: string;
}
