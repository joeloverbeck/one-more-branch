import type { ContentEvaluatorContext } from '../../models/content-generation-contracts.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO = `You are a content evaluator for branching interactive fiction. Given a set of content packets, you score each on 10 dimensions, detect substantive overlap across the batch, and assign a role label indicating its usefulness as concept-seeding material.

You are NOT building concepts. You are judging raw content packets on their imaginative charge, human depth, social load-bearing capacity, and interactive potential.`;

const RULES = `SCORING DIMENSIONS (each 0-5):
- imageCharge: Is there an unforgettable concrete visual? (0 = abstract/generic, 5 = searing, specific, instantly memorable)
- humanAche: Is there a live emotional wound/desire/shame/love inside the weirdness? (0 = no human stake, 5 = gut-level resonance)
- socialLoadBearing: Does the anomaly create institutions, incentives, public consequences, or power structures? (0 = isolated gimmick, 5 = reshapes society)
- branchingPressure: Does it naturally force meaningful choices? (0 = no dilemma, 5 = every option costs something real)
- surfaceFreshness: Is the packet's surface treatment vivid and non-stock? (0 = familiar genre coating, 5 = instantly distinctive surface)
- deepOriginality: Is the underlying narrative pattern fresh rather than formulaic? (0 = standard structure, 5 = the pattern itself feels invented)
- sceneBurst: Does it immediately imply multiple vivid scenes? (0 = one-note, 5 = rich with implied moments)
- structuralIrony: Is there a contradiction baked into the content itself? (0 = straightforward, 5 = the solution is the problem)
- tasteAlignment: Does this feel specifically matched to the supplied taste profile? (0 = generic fit, 5 = tailor-made for this profile's deep patterns, engagement modes, and value tensions)
- causalSpecificity: Are the mechanisms specific enough to generate scenes and choices on their own? (0 = decorative abstraction, 5 = causally specific engine)

ROLE LABELS:
- PRIMARY_SEED: Strong enough to anchor a concept. High scores across most dimensions.
- SECONDARY_MUTAGEN: Interesting but not strong enough alone. Could enrich a concept seeded by something else.
- IMAGE_ONLY: Has a striking image or moment but lacks interactive/social depth. Useful as flavour, not structure.
- REJECT: Too generic, too abstract, or too decorative to be useful.

RULES:
- Evaluate every packet. Do not skip any.
- Be honest and critical. A 3 is average. 5 is exceptional.
- Scores must be integers from 0 to 5.
- strengths: 1-3 brief statements about what works.
- weaknesses: 1-3 brief statements about what doesn't work or is missing.
- redundancyCluster: if this packet materially overlaps a stronger packet in the same batch, set this to that stronger packet's contentId; otherwise set it to null.
- Do not inflate scores. Most packets should NOT be PRIMARY_SEED.`;

export function buildContentEvaluatorPrompt(context: ContentEvaluatorContext): ChatMessage[] {
  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, RULES];

  const userSections: string[] = [
    'Evaluate each content packet below.',
    `CONTENT PACKETS:\n${JSON.stringify(context.packets, null, 2)}`,
  ];

  userSections.push(
    `TASTE PROFILE (use to score tasteAlignment against deepPatterns, engagementModes, valueTensions, collisionPatterns, and sceneAppetites):\n${JSON.stringify(context.tasteProfile, null, 2)}`
  );

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching exactly: { "evaluations": [ ... ] }
- One evaluation per packet, in the same order as the input.
- Each evaluation must have: contentId, scores (all 10 dimensions), strengths, weaknesses, recommendedRole, redundancyCluster.
- Scores are integers 0-5.
- redundancyCluster must be either a contentId string from the batch or null.
- recommendedRole must be one of: PRIMARY_SEED, SECONDARY_MUTAGEN, IMAGE_ONLY, REJECT.`
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
