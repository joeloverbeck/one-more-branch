import type { AnalystContext } from '../analyst-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildAnalystStructureEvaluation } from './continuation/story-structure-section.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

const ANALYST_ROLE_INTRO = `You are a story structure analyst for interactive fiction. Your role is to evaluate a narrative passage against a planned story structure and determine:
1. Whether the current story beat has been concluded
2. Whether the narrative has deviated from the planned beats
3. Whether the narrative adheres to the target tone`;

const ANALYST_RULES = `You analyze structure progression, deviation, and tone adherence. You do NOT write narrative or make creative decisions.

Use this strict sequence:
Step A: Classify scene signals using the provided enums.
Step B: Apply the completion gate against the active beat objective before deciding beatConcluded.
Step C: Evaluate whether the narrative prose matches the target TONE/GENRE.

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

TONE EVALUATION:
- Set toneAdherent to true if the narrative's mood, vocabulary, and emotional register match the target tone.
- Set toneAdherent to false if the narrative drifts toward a different genre feel (e.g., grimdark when tone should be comedic).
- When toneAdherent is false, write a brief toneDriftDescription explaining what feels off and what the tone should be instead.
- When toneAdherent is true, set toneDriftDescription to an empty string.

PROMISE EVALUATION:
- Detect at most 3 new promises in promisesDetected.
- Only detect promises with deliberate narrative weight; ignore incidental details.
- Check whether any ACTIVE TRACKED PROMISES were meaningfully paid off in this scene.
- Only include a promise in promisesResolved when it is substantively addressed, not merely referenced.
- Use exact pr-N IDs from ACTIVE TRACKED PROMISES when populating promisesResolved.
- Only provide promisePayoffAssessments entries for promises that appear in promisesResolved.

NPC AGENDA COHERENCE:
- If NPC agendas are provided, evaluate whether NPC behavior in the scene aligns with their stated goals and fears.
- Set npcCoherenceAdherent to true if all NPCs who appear or act in the scene behave consistently with their agendas.
- Set npcCoherenceAdherent to false if any NPC acts contrary to their stated goal or fear without narrative justification.
- When npcCoherenceAdherent is false, write a brief npcCoherenceIssues description naming the NPC and explaining the inconsistency.
- When npcCoherenceAdherent is true or no NPC agendas are provided, set npcCoherenceIssues to an empty string.

NPC-PROTAGONIST RELATIONSHIP SHIFTS:
- If NPC relationships are provided, evaluate whether the scene caused any significant relationship changes.
- Only flag shifts that are meaningful — not every interaction is a shift.
- For each detected shift, provide the NPC name, a 1-2 sentence description of the change, a suggested valence change (-3 to +3), and a new dynamic label if the dynamic itself changed (empty string if unchanged).
- Empty array when no significant relationship shifts occurred or no relationships are provided.

SPINE INTEGRITY EVALUATION:
- If a STORY SPINE section is present, evaluate whether any spine element has been IRREVERSIBLY invalidated by the narrative.
- Set spineDeviationDetected to true ONLY when an element cannot be recovered or redirected. This should be extremely rare.
- dramatic_question: The central dramatic question has been definitively and unambiguously answered. The story can no longer meaningfully explore it.
- antagonistic_force: The primary antagonistic force has been permanently eliminated with no successor or transformation possible.
- need_want: The protagonist's inner need has been fully satisfied OR the need-want tension has been completely resolved prematurely, leaving no room for further character development.
- Be EXTREMELY conservative. Partial answers, temporary setbacks to the antagonist, or incremental growth do NOT constitute spine deviation. Only truly irreversible narrative events qualify.
- When spineDeviationDetected is false, set spineDeviationReason to empty string and spineInvalidatedElement to null.
- When no STORY SPINE section is present, always set spineDeviationDetected to false.

Be analytical and precise. Evaluate cumulative progress, not just single scenes.
Be conservative about deviation - minor variations are acceptable. Only mark true deviation when future beats are genuinely invalidated.`;

function buildAnalystSystemPrompt(
  tone?: string,
  toneFeel?: readonly string[],
  toneAvoid?: readonly string[]
): string {
  const sections: string[] = [ANALYST_ROLE_INTRO];

  if (tone) {
    sections.push(buildToneDirective(tone, toneFeel, toneAvoid));
  }

  sections.push(ANALYST_RULES);
  return sections.join('\n\n');
}

function buildNpcAgendasSection(context: AnalystContext): string {
  const agendas = context.accumulatedNpcAgendas;
  if (!agendas) {
    return '';
  }
  const entries = Object.values(agendas);
  if (entries.length === 0) {
    return '';
  }

  const lines = [
    'NPC AGENDAS (evaluate behavior consistency):',
    ...entries.map(
      (a) =>
        `[${a.npcName}]\n  Goal: ${a.currentGoal}\n  Fear: ${a.fear}`
    ),
  ];

  return `${lines.join('\n')}\n\n`;
}

function buildNpcRelationshipsSection(context: AnalystContext): string {
  const relationships = context.accumulatedNpcRelationships;
  if (!relationships) {
    return '';
  }
  const entries = Object.values(relationships);
  if (entries.length === 0) {
    return '';
  }

  const lines = [
    'NPC-PROTAGONIST RELATIONSHIPS (evaluate for shifts):',
    ...entries.map(
      (r) =>
        `[${r.npcName}] Dynamic: ${r.dynamic} | Valence: ${r.valence} | Tension: ${r.currentTension}`
    ),
  ];

  return `${lines.join('\n')}\n\n`;
}

function buildActivePromisesSection(context: AnalystContext): string {
  const activeTrackedPromises = context.activeTrackedPromises ?? [];
  if (activeTrackedPromises.length === 0) {
    return '';
  }

  const lines = [
    'ACTIVE TRACKED PROMISES:',
    ...activeTrackedPromises.map(
      (promise) =>
        `- [${promise.id}] (${promise.promiseType}/${promise.suggestedUrgency}, ${promise.age} pages old) ${promise.description}`
    ),
    '',
    'Use these IDs for promisesResolved when a promise is explicitly paid off in this scene.',
  ];

  return `${lines.join('\n')}\n`;
}

/**
 * Builds the analyst prompt messages for the analyst LLM call.
 * Returns a system message with analyst instructions and a user message
 * containing the structure evaluation section and the narrative to evaluate.
 *
 * @param context - The analyst context containing narrative, structure, and state
 * @returns Array of ChatMessage with system and user messages
 */
export function buildAnalystPrompt(context: AnalystContext): ChatMessage[] {
  const structureEvaluation = buildAnalystStructureEvaluation(
    context.structure,
    context.accumulatedStructureState,
    context.activeState,
    context.threadsResolved,
    context.threadAges
  );

  const toneReminder = '';
  const activePromisesSection = buildActivePromisesSection(context);
  const npcAgendasSection = buildNpcAgendasSection(context);
  const npcRelationshipsSection = buildNpcRelationshipsSection(context);

  const spineSection = buildSpineSection(context.spine);

  const userContent = `${structureEvaluation}${toneReminder}${spineSection}${activePromisesSection}${npcAgendasSection}${npcRelationshipsSection}\nNARRATIVE TO EVALUATE:\n${context.narrative}`;

  const systemPrompt = buildAnalystSystemPrompt(
    context.tone,
    context.toneFeel,
    context.toneAvoid
  );

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
