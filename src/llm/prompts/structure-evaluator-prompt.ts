import type { StructureEvaluatorContext } from '../structure-evaluator-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { buildAnalystStructureEvaluation } from './continuation/story-structure-section.js';
import { buildSpineSection } from './sections/shared/spine-section.js';

const STRUCTURE_EVALUATOR_ROLE = `You are a story structure evaluator for interactive fiction. Your SINGLE responsibility is to evaluate whether the narrative satisfies structural objectives — beat completion, deviation, pacing, and spine integrity.

You do NOT evaluate tone, NPC coherence, narrative promises, or quality. Those are handled by other evaluators.`;

const STRUCTURE_EVALUATOR_RULES = `Use this strict sequence:
Step A: Classify scene signals using the provided enums.
Step B: Apply the completion gate against the active beat objective before deciding beatConcluded.

Before setting beatConcluded, extract 1-3 objective anchors from activeBeat.objective and map each anchor to concrete evidence.

An objective anchor is a distinct verifiable condition embedded in the beat objective text. Each anchor represents one thing the protagonist must accomplish for the beat to be complete. Multi-part objectives yield multiple anchors.

Example 1 — Objective: "Secure evidence before the tribunal can destroy it"
  Anchors:
    1. "evidence is secured" — look for: protagonist physically obtains, copies, or safeguards the evidence
    2. "tribunal has not yet destroyed it" — look for: evidence still intact at time of acquisition, no indication it was tampered with or lost
  Evidence mapping: If the narrative shows the protagonist stealing sealed ledgers and escaping the archive, anchor 1 is satisfied. If the narrative mentions guards arriving but the ledgers are already taken, anchor 2 is satisfied. Both anchors met → beatConcluded = true.

Example 2 — Objective: "Convince the rival houses to commit support without revealing all leverage"
  Anchors:
    1. "rival houses commit support" — look for: explicit agreement, alliance, or promise of aid from at least one house
    2. "leverage is not fully revealed" — look for: protagonist withholds key information, negotiates selectively
  Evidence mapping: If house leaders agree to back the protagonist but the protagonist kept the damning letters secret, both anchors are met. If the protagonist revealed everything to win support, anchor 2 fails → beatConcluded = false despite anchor 1 being met.

Evidence is cumulative across the current narrative and active state.
If no anchor has explicit evidence, beatConcluded must be false.

MIDPOINT EVALUATION:
- If the active beat is midpoint-tagged, enforce midpoint delivery quality:
  - FALSE_VICTORY: apparent win with hidden structural cost or instability.
  - FALSE_DEFEAT: apparent loss that plants credible recovery potential.
- If beatConcluded is true without midpoint-grade reversal function, mark pacingIssueDetected true and explain the midpoint miss.

SPINE INTEGRITY EVALUATION:
- If a STORY SPINE section is present, evaluate whether any spine element has been IRREVERSIBLY invalidated by the narrative.
- Set spineDeviationDetected to true ONLY when an element cannot be recovered or redirected. This should be extremely rare.
- dramatic_question: The central dramatic question has been definitively and unambiguously answered. The story can no longer meaningfully explore it.
- antagonistic_force: The primary antagonistic force has been permanently eliminated with no successor or transformation possible.
- need_want: The protagonist's inner need has been fully satisfied OR the need-want tension has been completely resolved prematurely, leaving no room for further character development.
- Be EXTREMELY conservative. Partial answers, temporary setbacks to the antagonist, or incremental growth do NOT constitute spine deviation. Only truly irreversible narrative events qualify.
- When spineDeviationDetected is false, set spineDeviationReason to empty string and spineInvalidatedElement to null.
- When no STORY SPINE section is present, always set spineDeviationDetected to false.
- Beyond checking for deviation, briefly assess whether this scene meaningfully advanced the protagonist's need/want arc — did it deepen, complicate, or clarify the tension between Need and Want?

PACING DIRECTIVE:
After classifying scene signals, write a pacingDirective: a 1-3 sentence natural-language briefing for the page planner.
Synthesize ALL of the following into one coherent instruction:
- Scene rhythm: Does the next scene need to breathe after a major event, or accelerate toward a conclusion?
- Momentum: Is the story stalling, progressing steadily, or shifting scope?
- Structural position: How close is the current beat to conclusion? Is the next beat's entry condition approaching readiness?
- Commitment level: Has the protagonist locked into a path, or are options still open?
- Pacing budget: How many pages remain relative to beats? Burning budget or running lean?
- Any pacing issue detected: If pacingIssueDetected is true, the directive MUST include the corrective action.

Write as if briefing a fiction writer: "The next scene should deliver a direct confrontation that advances the beat objective" NOT "momentum should increase."
If no pacing concern exists, still provide rhythm guidance: "After this tense revelation, the next scene can afford a brief character moment before escalating."

Be analytical and precise. Evaluate cumulative progress, not just single scenes.
Be conservative about deviation - minor variations are acceptable. Only mark true deviation when future beats are genuinely invalidated.`;

export function buildStructureEvaluatorPrompt(
  context: StructureEvaluatorContext
): ChatMessage[] {
  const structureEvaluation = buildAnalystStructureEvaluation(
    context.structure,
    context.accumulatedStructureState,
    context.activeState,
    context.threadsResolved,
    context.threadAges
  );

  const spineSection = buildSpineSection(context.spine);

  const userContent = `${structureEvaluation}${spineSection}
NARRATIVE TO EVALUATE:
${context.narrative}`;

  const systemPrompt = `${STRUCTURE_EVALUATOR_ROLE}\n\n${CONTENT_POLICY}\n\n${STRUCTURE_EVALUATOR_RULES}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
