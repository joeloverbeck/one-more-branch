import type { ContentPacketerContext } from '../../models/content-generation-contracts.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO = `You are a content-packeting engine for branching interactive fiction. Given a taste profile and a set of raw sparks, you expand the best sparks into 12-16 load-bearing content packets.

Each packet is a fully fleshed-out content seed with explicit setup context and structure: premiseSummary, situationFrame, worldState, playerPosition, coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationPath, wildnessInvariant, dullCollapse, and interactionVerbs. These packets will later be evaluated, ranked, and woven into story concepts.`;

const RULES = `RULES:
- Select the 12-16 strongest sparks and expand each into exactly one full content packet. Each packet is built from ONE primary spark.
- Every packet must have ALL required fields -- no partial packets.
- contentId: unique identifier in the format "pkt-NN" (e.g., "pkt-01", "pkt-02").
- sourceSparkIds: array containing exactly 1 sparkId -- the single spark this packet expands. Do NOT merge or combine similar sparks into one packet; each spark stands alone.
- contentKind: one of ENTITY, INSTITUTION, RELATIONSHIP, TRANSFORMATION, WORLD_INTRUSION, RITUAL, POLICY, JOB, SUBCULTURE, ECONOMY.
- premiseSummary: plain-language causal setup that explains what is concretely happening here.
- situationFrame: the immediate arrangement or trap the packet assumes at the moment play begins.
- worldState: the relevant baseline reality or surrounding conditions that make the anomaly legible.
- playerPosition: mandatory description of who the player is inside this setup, what they know or do not know, and why their position is inherently pressured.
- coreAnomaly: the central "what's wrong here?" that makes this content charged and specific.
- Do not bury setup inside coreAnomaly alone. premiseSummary/situationFrame/worldState explain the setup; coreAnomaly explains what is structurally wrong or charged inside it.
- humanAnchor: the emotional or relational truth that grounds the anomaly in lived experience.
- socialEngine: the social mechanism or pressure that drives conflict and branching.
- choicePressure: what forces the player to choose, and why every option costs something.
- signatureImage: a single vivid, concrete image that anchors the packet visually.
- escalationPath: how this content can intensify, deepen, or spiral if the player engages.
- wildnessInvariant: the one thing that must stay wild/strange/charged no matter how the story branches.
- dullCollapse: what would make this content generic or boring -- the failure mode to avoid.
- interactionVerbs: 4-6 story-specific action verbs the player might use to engage with this content. Generic verbs like "explore", "fight", or "talk" are not enough unless made unusually concrete by the packet itself.
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
      `STORY KERNEL (use as gravitational anchor, not a constraint):\n${kernelBlock}`
    );
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching exactly: { "packets": [ ... ] }
- Each packet object must have: contentId, sourceSparkIds, contentKind, premiseSummary, situationFrame, worldState, playerPosition, coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationPath, wildnessInvariant, dullCollapse, interactionVerbs.
- playerPosition is required in every packet.
- interactionVerbs: exactly 4-6 story-specific action verbs per packet.
- 12-16 packets total.`
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
