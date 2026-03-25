import type { ContentEvaluatorContext } from '../../models/content-generation-contracts.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO = `You are a content evaluator for branching interactive fiction. Given a set of content packets, you score each on 10 dimensions, detect substantive overlap across the batch, and assign a role label indicating its usefulness as concept-seeding material.

You are NOT building concepts. You are judging raw content packets on their imaginative charge, human depth, social load-bearing capacity, and interactive potential.`;

const RULES = `SCORING DIMENSIONS (each 0-5):
- imageCharge:
  0 = abstract/generic, no visual
  3 = one clear image, competent but not arresting
  5 = searing, specific, instantly unforgettable
- humanAche:
  0 = no human stake inside the weirdness
  3 = recognizable emotion, but conventional
  5 = gut-level resonance, makes you wince or ache
- socialLoadBearing:
  0 = isolated gimmick, no social machinery
  3 = implies some social consequence
  5 = reshapes institutions, incentives, or power structures
- branchingPressure:
  0 = no dilemma, player has nothing to decide
  3 = one clear choice point
  5 = every option costs something real, multiple pressure vectors
- surfaceFreshness:
  0 = stock genre imagery, seen a hundred times
  3 = recognizable but with a distinctive twist
  5 = never-seen-before surface, can't be mistaken for anything else
- deepOriginality:
  0 = standard narrative formula underneath
  3 = familiar structure with one unusual element
  5 = structurally unprecedented, the pattern itself is the invention
- sceneBurst:
  0 = one-note, abstract, implies nothing concrete
  3 = 2-3 distinct scenes visible
  5 = rich with implied moments, 5+ scenes practically write themselves
- structuralIrony:
  0 = straightforward, no contradiction
  3 = mild irony or tension
  5 = the solution is the problem, the cure is the disease
- tasteAlignment:
  0 = no connection to the taste profile
  3 = plausible match but could fit many profiles
  5 = feels tailor-made; instantiates deep patterns, engagement modes, and value tensions from this specific profile
- causalSpecificity:
  0 = too abstract or decorative to build a story from
  3 = workable with effort, mechanisms present but vague
  5 = mechanisms so specific they practically generate scenes and choices on their own

ROLE LABELS:
- PRIMARY_SEED: Strong enough to anchor a concept. High scores across most dimensions.
- SECONDARY_MUTAGEN: Interesting but not strong enough alone. Could enrich a concept seeded by something else.
- IMAGE_ONLY: Has a striking image or moment but lacks interactive/social depth. Useful as flavour, not structure.
- REJECT: Too generic, too abstract, or too decorative to be useful.

RULES:
- Evaluate every packet. Do not skip any.
- Be honest and critical. A 3 is average. 5 is exceptional.
- Scores must be integers from 0 to 5.
- When scoring tasteAlignment, cross-reference the taste profile's deepPatterns, engagementModes, valueTensions, collisionPatterns, and sceneAppetites.
- strengths: 1-3 brief statements about what works.
- weaknesses: 1-3 brief statements about what doesn't work or is missing.
- redundancyCluster: if two packets cover essentially the same territory, similar anomaly, similar social engine, or similar emotional core, mark the weaker one with the stronger packet's contentId; otherwise set it to null.
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
