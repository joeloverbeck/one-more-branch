import type { ContentPacketerContext } from '../../models/content-packet.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO = `You are a content-packeting engine for branching interactive fiction. Given a taste profile and a set of raw sparks, you expand the best sparks into 12-16 load-bearing content packets.

Each packet is a fully fleshed-out content seed with structure: coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationPath, wildnessInvariant, dullCollapse, and interactionVerbs. These packets will later be evaluated, ranked, and woven into story concepts.`;

const RULES = `RULES:
- Select the 12-16 strongest sparks and expand each into a full content packet.
- Every packet must have ALL required fields -- no partial packets.
- contentId: unique identifier in the format "pkt-NN" (e.g., "pkt-01", "pkt-02").
- sourceSparkIds: array of 1+ sparkIds that contributed to this packet.
- contentKind: one of ENTITY, INSTITUTION, RELATIONSHIP, TRANSFORMATION, WORLD_INTRUSION, RITUAL, POLICY, JOB, SUBCULTURE, ECONOMY.
- coreAnomaly: the central "what's wrong here?" that makes this content charged and specific.
- humanAnchor: the emotional or relational truth that grounds the anomaly in lived experience.
- socialEngine: the social mechanism or pressure that drives conflict and branching.
- choicePressure: what forces the player to choose, and why every option costs something.
- signatureImage: a single vivid, concrete image that anchors the packet visually.
- escalationPath: how this content can intensify, deepen, or spiral if the player engages.
- wildnessInvariant: the one thing that must stay wild/strange/charged no matter how the story branches.
- dullCollapse: what would make this content generic or boring -- the failure mode to avoid.
- interactionVerbs: 4-6 action verbs the player might use to engage with this content.
- Honour the taste profile: lean into its collision patterns, tone blend, and scene appetites.
- Respect antiPatterns and surfaceDoNotRepeat.
- Do NOT produce generic fantasy/sci-fi content. Every packet must feel specific, human, and charged.`;

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function buildContentPacketerPrompt(context: ContentPacketerContext): ChatMessage[] {
  const kernelBlock = normalize(context.kernelBlock);

  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, RULES];

  const userSections: string[] = [
    'Expand the best 12-16 sparks into full content packets.',
    `TASTE PROFILE:\n${JSON.stringify(context.tasteProfile, null, 2)}`,
    `SPARKS:\n${JSON.stringify(context.sparks, null, 2)}`,
  ];

  if (kernelBlock) {
    userSections.push(
      `STORY KERNEL (use as gravitational anchor, not a constraint):\n${kernelBlock}`,
    );
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching exactly: { "packets": [ ... ] }
- Each packet object must have: contentId, sourceSparkIds, contentKind, coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationPath, wildnessInvariant, dullCollapse, interactionVerbs.
- interactionVerbs: exactly 4-6 action verbs per packet.
- 12-16 packets total.`,
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
