import type { PromiseTrackerContext } from '../promise-tracker-types.js';
import type { ChatMessage } from '../llm-client-types.js';

const PROMISE_TRACKER_ROLE = `You are a narrative promise and thread tracker for interactive fiction. Your SINGLE responsibility is to track all forward-looking narrative obligations and their lifecycle — detecting new promises, resolving existing ones, assessing payoff quality, and identifying delayed consequences.

You do NOT evaluate story structure, beat completion, deviation, tone, or NPC behavior. Those are handled by other evaluators.`;

const PROMISE_TRACKER_RULES = `PROMISE EVALUATION:
- A narrative promise is a forward-looking obligation the reader expects answered.
- LITMUS TEST: Can you phrase it as a specific question a reader expects answered? Would a reader feel disappointed if it was never addressed? If BOTH not clearly yes, do NOT detect it.
- NOT a promise: motifs, atmosphere, characterization, backstory, self-contained emotions, worldbuilding facts, mood-setting details.
- If you cannot write a clear resolutionHint question, it is NOT a promise.
- Before adding a new promise, check if an existing active promise already covers the territory. Expand the existing one rather than duplicating.
- Detect at most 2 new promises in promisesDetected.
- Each promise MUST include:
  - promiseType: CHEKHOV_GUN (concrete object/ability/rule with narrative emphasis), FORESHADOWING (hint at a specific future event), UNRESOLVED_TENSION (emotional/relational setup demanding closure), DRAMATIC_QUESTION (story/act-level question reader expects answered), MYSTERY_HOOK (deliberate information gap), TICKING_CLOCK (time-bound urgency constraint).
  - scope: SCENE (resolve within 1-3 pages), BEAT (resolve within current beat), ACT (resolve within current act), STORY (resolve at climax/ending). Match the weight of the setup.
  - resolutionHint: A specific question (e.g., "Will the attacker return?", "What is inside the locked box?").
- RESOLUTION: Only include a promise in promisesResolved when the resolutionHint question has been ANSWERED, not merely referenced.
- Use exact pr-N IDs from ACTIVE TRACKED PROMISES when populating promisesResolved.
- Only provide promisePayoffAssessments entries for promises that appear in promisesResolved.

THREAD PAYOFF ASSESSMENT:
- When threads were resolved in this scene, assess payoff quality for each:
  - RUSHED: Resolved via exposition, off-screen action, or a single sentence without buildup
  - ADEQUATE: Resolved through action but without significant dramatic development
  - WELL_EARNED: Resolution developed through action, consequence, and emotional payoff
- Populate threadPayoffAssessments for each resolved thread.
- If no threads were resolved, return threadPayoffAssessments as [].

PREMISE PROMISE FULFILLMENT:
- PREMISE PROMISES are high-level audience expectations from concept verification.
- If this scene clearly delivers one of the pending premise promises, set premisePromiseFulfilled to the EXACT matching promise text.
- If no premise promise is fulfilled, set premisePromiseFulfilled to null.
- Never invent or paraphrase promise text. Choose only from the provided PENDING PREMISE PROMISES list.
- Do not select a promise already listed as fulfilled.

OBLIGATORY SCENE FULFILLMENT:
- If ACTIVE BEAT OBLIGATION context is present, evaluate whether this scene fulfills that exact obligatory scene tag.
- Set obligatorySceneFulfilled to the EXACT obligation tag only when scene events satisfy the active beat's obligation in substance.
- If the scene does not fulfill the active obligation, set obligatorySceneFulfilled to null.
- If no active beat obligation context is provided, always set obligatorySceneFulfilled to null.

DELAYED CONSEQUENCE TRIGGERING:
- Evaluate only consequences listed in TRIGGER-ELIGIBLE DELAYED CONSEQUENCES.
- Add a consequence ID to delayedConsequencesTriggered only when scene events clearly satisfy its triggerCondition.
- Use exact IDs from the provided list (e.g., "dc-4").
- If no listed consequence is triggered, return delayedConsequencesTriggered as [].
- Do not invent IDs and do not include consequences not listed as trigger-eligible.

DELAYED CONSEQUENCE CREATION:
- Read the narrative carefully for setups that should pay off later: causal chains, ticking clocks, or seeds the writer planted that will bloom in future scenes.
- Identify at most 2 delayed consequences per page.
- Each must have a clear triggerCondition that can be evaluated against future narrative events.
- Set reasonable delay windows (typically minPagesDelay: 2-3, maxPagesDelay: 5-8).
- Do NOT create consequences for trivial details or routine narrative beats.
- Only flag consequences that would feel like a broken promise if they never materialized.`;

function buildActivePromisesSection(context: PromiseTrackerContext): string {
  const activeTrackedPromises = context.activeTrackedPromises;
  if (activeTrackedPromises.length === 0) {
    return '';
  }

  const lines = [
    'ACTIVE TRACKED PROMISES:',
    ...activeTrackedPromises.map(
      (promise) =>
        `- [${promise.id}] (${promise.promiseType}/${promise.scope}/${promise.suggestedUrgency}, ${promise.age} pages old) ${promise.description}\n  Resolution criterion: ${promise.resolutionHint}`
    ),
    '',
    'Use these IDs for promisesResolved when the resolution criterion question has been ANSWERED in this scene.',
  ];

  return `${lines.join('\n')}\n`;
}

function buildPremisePromiseSection(context: PromiseTrackerContext): string {
  const allPromises = context.premisePromises;
  if (allPromises.length === 0) {
    return '';
  }

  const fulfilled = new Set(
    context.fulfilledPremisePromises.map((promise) => promise.trim())
  );
  const pending = allPromises.filter((promise) => !fulfilled.has(promise.trim()));

  const lines = ['PREMISE PROMISE TRACKING:'];
  lines.push('PENDING PREMISE PROMISES:');
  if (pending.length === 0) {
    lines.push('- (none)');
  } else {
    lines.push(...pending.map((promise) => `- ${promise}`));
  }
  lines.push('');
  lines.push('ALREADY FULFILLED PREMISE PROMISES:');
  if (fulfilled.size === 0) {
    lines.push('- (none)');
  } else {
    lines.push(...[...fulfilled].map((promise) => `- ${promise}`));
  }
  lines.push('');
  lines.push(
    'Set premisePromiseFulfilled to one exact pending promise string when fulfilled by this scene, otherwise null.'
  );
  return `${lines.join('\n')}\n\n`;
}

function buildObligatorySceneSection(context: PromiseTrackerContext): string {
  if (!context.activeBeatObligationTag) {
    return '';
  }

  return `ACTIVE BEAT OBLIGATION:
ACTIVE BEAT OBLIGATION TAG: ${context.activeBeatObligationTag}
Set obligatorySceneFulfilled to this exact tag only if this scene fulfills it; otherwise set obligatorySceneFulfilled to null.

`;
}

function buildDelayedConsequencesSection(context: PromiseTrackerContext): string {
  const eligible = context.delayedConsequencesEligible;

  const lines = ['TRIGGER-ELIGIBLE DELAYED CONSEQUENCES:'];
  if (eligible.length === 0) {
    lines.push('- (none)');
  } else {
    lines.push(
      ...eligible.map(
        (consequence) =>
          `- [${consequence.id}] ${consequence.description} ` +
          `(age ${consequence.currentAge}, trigger window ${consequence.minPagesDelay}-${consequence.maxPagesDelay})\n` +
          `  Trigger condition: ${consequence.triggerCondition}`
      )
    );
  }
  lines.push('');
  lines.push(
    'Set delayedConsequencesTriggered to IDs from this list only when their trigger condition is clearly satisfied in the scene.'
  );
  return `${lines.join('\n')}\n\n`;
}

function buildResolvedThreadsSection(context: PromiseTrackerContext): string {
  if (context.threadsResolved.length === 0) {
    return '';
  }

  const openThreadLines = context.openThreads
    .map((thread) => {
      const age = context.threadAges[thread.id];
      const ageStr = age !== undefined ? `, ${age} pages old` : '';
      return `  [${thread.id}]${ageStr} ${thread.text}`;
    })
    .join('\n');

  return `THREADS RESOLVED THIS SCENE: ${context.threadsResolved.join(', ')}

OPEN THREADS (for context):
${openThreadLines || '  (none)'}

For each resolved thread, assess payoff quality in threadPayoffAssessments.

`;
}

export function buildPromiseTrackerPrompt(context: PromiseTrackerContext): ChatMessage[] {
  const activePromisesSection = buildActivePromisesSection(context);
  const premisePromisesSection = buildPremisePromiseSection(context);
  const obligatorySceneSection = buildObligatorySceneSection(context);
  const delayedConsequencesSection = buildDelayedConsequencesSection(context);
  const resolvedThreadsSection = buildResolvedThreadsSection(context);

  const userContent = `${activePromisesSection}${premisePromisesSection}${obligatorySceneSection}${delayedConsequencesSection}${resolvedThreadsSection}SCENE SUMMARY: ${context.sceneSummary}

NARRATIVE TO EVALUATE:
${context.narrative}`;

  const systemPrompt = `${PROMISE_TRACKER_ROLE}\n\n${PROMISE_TRACKER_RULES}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
