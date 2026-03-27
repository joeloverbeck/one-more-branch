import type { ChatMessage } from '../../llm-client-types.js';
import { CONTENT_POLICY } from '../../content-policy.js';
import type { ChatBibleContext } from '../../chat/chat-bible-context.js';
import {
  buildInterlocutorSummarySection,
  buildLeadInSection,
  buildOlderChatSummarySection,
  buildPhysicalContextSection,
  buildRecentTurnsSection,
  buildTargetCharacterSummarySection,
  buildWorldbuildingSection,
} from './chat-context-prompt-sections.js';

const SYSTEM_PROMPT = `You are establishing the objective scene reality for an in-world one-on-one conversation.
Focus on physical environment, narrative momentum, and conversation state.
Physical context is mandatory and authoritative.
State why this conversation is happening now and what pressures are active.
Compress aggressively for the next 1-3 turns only.
Do not write dialogue. Do not analyze character psychology.`;

export function buildChatSceneContextMessages(context: ChatBibleContext): ChatMessage[] {
  const userSections = [
    buildTargetCharacterSummarySection(context, 'identity'),
    buildInterlocutorSummarySection(context, 'identity'),
    buildWorldbuildingSection(context),
    buildPhysicalContextSection(context),
    buildLeadInSection(context),
    buildOlderChatSummarySection(context),
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
