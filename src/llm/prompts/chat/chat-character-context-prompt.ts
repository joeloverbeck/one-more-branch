import type { ChatSceneContext } from '../../../models/chat/index.js';
import type { ChatMessage } from '../../llm-client-types.js';
import { CONTENT_POLICY } from '../../content-policy.js';
import type { ChatGenerationContext } from '../../chat/chat-generation-context.js';
import {
  buildEstablishedSceneContextSection,
  buildInterlocutorSummarySection,
  buildKnowledgeSection,
  buildRecentTurnsSection,
  buildRelationshipSection,
  buildTargetCharacterSummarySection,
} from './chat-context-prompt-sections.js';

const SYSTEM_PROMPT = `You are synthesizing a character's psychological state for an in-world one-on-one conversation.
You receive the established scene context as ground truth and must not contradict it.
Determine the character's current objective, emotional state, and willingness to engage.
Model the relationship dynamic, knowledge boundaries, and information asymmetries.
Derive continuity guardrails and response constraints from all available context.
Compress aggressively for the next 1-3 turns only.
Do not write dialogue.`;

export function buildChatCharacterContextMessages(
  context: ChatGenerationContext,
  sceneContext: ChatSceneContext
): ChatMessage[] {
  const userSections = [
    buildEstablishedSceneContextSection(sceneContext),
    buildTargetCharacterSummarySection(context, 'full'),
    buildInterlocutorSummarySection(context, 'full'),
    buildRelationshipSection(context),
    buildKnowledgeSection(context),
    buildRecentTurnsSection(context),
  ];

  return [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n${CONTENT_POLICY}`,
    },
    {
      role: 'user',
      content: userSections.join('\n\n'),
    },
  ];
}
