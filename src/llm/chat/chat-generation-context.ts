import type {
  ChatKnowledgeState,
  ChatLeadInContext,
  ChatPhysicalContext,
  ChatRelationshipState,
  ChatTurn,
  RollingSummaryOutput,
} from '../../models/chat/index.js';
import type { StandaloneDecomposedCharacter } from '../../models/standalone-decomposed-character.js';
import type { DecomposedWorld } from '../../models/decomposed-world.js';

export interface ChatGenerationContext {
  readonly targetCharacter: StandaloneDecomposedCharacter;
  readonly interlocutorCharacter: StandaloneDecomposedCharacter;
  readonly decomposedWorld: DecomposedWorld;
  readonly relationshipState: ChatRelationshipState;
  readonly knowledgeState: ChatKnowledgeState;
  readonly physicalContext: ChatPhysicalContext;
  readonly leadInContext: ChatLeadInContext;
  readonly rollingSummary: RollingSummaryOutput | null;
  readonly recentTurns: readonly ChatTurn[];
}
