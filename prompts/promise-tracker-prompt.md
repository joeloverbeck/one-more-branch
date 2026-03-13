# Promise Tracker Prompt (Production Template)

- Source: `src/llm/prompts/promise-tracker-prompt.ts`
- Output schema source: `src/llm/schemas/promise-tracker-schema.ts`

## Pipeline Position

The promise tracker runs for **both opening and continuation pages** as part of the parallel post-writer evaluation stages:

**Pipeline position**: Planner -> Lorekeeper -> Writer -> **[Structure Evaluator | Promise Tracker | Scene Quality]** (parallel) -> Agenda Resolver

The promise tracker runs in parallel with Structure Evaluator and Scene Quality stages. Its single responsibility is to track all forward-looking narrative obligations and their lifecycle, detecting new promises, resolving existing ones, assessing payoff quality, and identifying delayed consequences.

## Messages Sent To Model

### 1) System Message

```text
You are a narrative promise and thread tracker for interactive fiction. Your SINGLE responsibility is to track all forward-looking narrative obligations and their lifecycle — detecting new promises, resolving existing ones, assessing payoff quality, and identifying delayed consequences.

You do NOT evaluate story structure, beat completion, deviation, tone, or NPC behavior. Those are handled by other evaluators.

CONTENT GUIDELINES:
RATING: NC-21 (ADULTS ONLY)
{{... full content policy ...}}

PROMISE EVALUATION:
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
- Only flag consequences that would feel like a broken promise if they never materialized.
```

The system prompt is self-contained and does not require additional tone blocks or other dynamic injection.

### 2) User Message

```text
{{#if activeTrackedPromises.length > 0}}ACTIVE TRACKED PROMISES:
{{#each activeTrackedPromises}}
- [{{this.id}}] ({{this.promiseType}}/{{this.scope}}/{{this.suggestedUrgency}}, {{this.age}} pages old) {{this.description}}
  Resolution criterion: {{this.resolutionHint}}
{{/each}}

Use these IDs for promisesResolved when the resolution criterion question has been ANSWERED in this scene.

{{/if}}
{{#if premisePromises.length > 0}}PREMISE PROMISE TRACKING:
PENDING PREMISE PROMISES:
{{#each premisePromises}}
{{#unless this.isFulfilled}}- {{this}}
{{/unless}}
{{/each}}

ALREADY FULFILLED PREMISE PROMISES:
{{#each fulfilledPremisePromises}}- {{this}}
{{/each}}

Set premisePromiseFulfilled to one exact pending promise string when fulfilled by this scene, otherwise null.

{{/if}}
{{#if activeBeatObligationTag}}ACTIVE BEAT OBLIGATION:
ACTIVE BEAT OBLIGATION TAG: {{activeBeatObligationTag}}
Set obligatorySceneFulfilled to this exact tag only if this scene fulfills it; otherwise set obligatorySceneFulfilled to null.

{{/if}}
{{#if delayedConsequencesEligible.length > 0}}TRIGGER-ELIGIBLE DELAYED CONSEQUENCES:
{{#each delayedConsequencesEligible}}
- [{{this.id}}] {{this.description}} (age {{this.currentAge}}, trigger window {{this.minPagesDelay}}-{{this.maxPagesDelay}})
  Trigger condition: {{this.triggerCondition}}
{{/each}}

Set delayedConsequencesTriggered to IDs from this list only when their trigger condition is clearly satisfied in the scene.

{{/if}}
{{#if threadsResolved.length > 0}}THREADS RESOLVED THIS SCENE: {{threadsResolved joined by ', '}}

OPEN THREADS (for context):
{{#each openThreads}}
  [{{this.id}}]{{#if threadAges[this.id]}}, {{threadAges[this.id]}} pages old{{/if}} {{this.text}}
{{/each}}

For each resolved thread, assess payoff quality in threadPayoffAssessments.

{{/if}}SCENE SUMMARY: {{sceneSummary}}

NARRATIVE TO EVALUATE:
{{narrative}}
```

User content is modular: sections are conditionally included only when context data is present. The narrative and scene summary are always included.

## JSON Response Shape

```json
{
  "promisesDetected": [
    {
      "description": "{{what was planted with emphasis}}",
      "promiseType": "{{CHEKHOV_GUN|FORESHADOWING|UNRESOLVED_TENSION|DRAMATIC_QUESTION|MYSTERY_HOOK|TICKING_CLOCK}}",
      "scope": "{{SCENE|BEAT|ACT|STORY}}",
      "resolutionHint": "{{specific question this promise asks, e.g. 'Will the attacker return?'}}",
      "suggestedUrgency": "{{LOW|MEDIUM|HIGH}}"
    }
  ],
  "promisesResolved": ["{{pr-N}}"],
  "promisePayoffAssessments": [
    {
      "promiseId": "{{pr-N}}",
      "description": "{{the resolved promise description}}",
      "satisfactionLevel": "{{RUSHED|ADEQUATE|WELL_EARNED}}",
      "reasoning": "{{why this satisfaction level}}"
    }
  ],
  "threadPayoffAssessments": [
    {
      "threadId": "{{th-N}}",
      "threadText": "{{the thread text}}",
      "satisfactionLevel": "{{RUSHED|ADEQUATE|WELL_EARNED}}",
      "reasoning": "{{why this satisfaction level}}"
    }
  ],
  "premisePromiseFulfilled": "{{exact promise text or null}}",
  "obligatorySceneFulfilled": "{{exact obligatorySceneTag or null}}",
  "delayedConsequencesTriggered": ["{{dc-N}}"],
  "delayedConsequencesCreated": [
    {
      "description": "{{what will happen when this consequence triggers}}",
      "triggerCondition": "{{what narrative condition causes this to fire}}",
      "minPagesDelay": {{number}},
      "maxPagesDelay": {{number}}
    }
  ]
}
```

## Field Descriptions

- `promisesDetected`: Array of newly detected narrative promises (max 2). Each promise must pass the litmus test: can you phrase it as a specific question the reader expects answered, and would they feel disappointed if never addressed? Each entry includes `description`, `promiseType` (CHEKHOV_GUN, FORESHADOWING, UNRESOLVED_TENSION, DRAMATIC_QUESTION, MYSTERY_HOOK, TICKING_CLOCK), `scope` (SCENE, BEAT, ACT, STORY — matching the weight of the setup), `resolutionHint` (a specific question), and `suggestedUrgency`. Promises with empty `resolutionHint` are filtered out.

- `promisesResolved`: Array of resolved promise IDs (`pr-N`) from active tracked promises. A promise is resolved when its `resolutionHint` question has been ANSWERED, not merely referenced. Empty array when no tracked promises were paid off.

- `promisePayoffAssessments`: Array of payoff quality assessments for resolved promises. Empty array when no promises were resolved. Only populated when `promisesResolved` is non-empty.

- `threadPayoffAssessments`: Array of payoff quality assessments for threads resolved in this scene. Each entry includes `threadId`, `threadText`, `satisfactionLevel` (RUSHED, ADEQUATE, WELL_EARNED), and `reasoning`. Empty array when no threads were resolved.

- `premisePromiseFulfilled`: Exact premise promise text fulfilled by this scene, or `null` when no premise promise was fulfilled. Never invent or paraphrase — select only from the provided PENDING PREMISE PROMISES list.

- `obligatorySceneFulfilled`: Exact active-beat `obligatorySceneTag` fulfilled by this scene, or `null` when no obligation was fulfilled. Only populated when ACTIVE BEAT OBLIGATION context is present.

- `delayedConsequencesTriggered`: Array of IDs of trigger-eligible delayed consequences that this scene clearly triggers (e.g., `"dc-2"`). Empty array when none are triggered. Use exact IDs from the provided list — never invent IDs.

- `delayedConsequencesCreated`: Array of delayed consequences planted by the writer in this scene. Identify setups that should pay off later — causal chains, ticking clocks, or seeds the narrative planted that will bloom in future scenes. Max 2 per page. Each entry includes `description` (what will happen when triggered), `triggerCondition` (what narrative condition causes this to fire), `minPagesDelay` (typically 2-3), and `maxPagesDelay` (typically 5-8). Only flag consequences that would feel like a broken promise if they never materialized.

## Scope and Boundaries

The promise tracker operates independently from the Structure Evaluator and Scene Quality stages. It does NOT:
- Evaluate story structure or beat completion
- Assess narrative deviation
- Check tone adherence
- Evaluate NPC behavior or coherence

These responsibilities remain with their respective evaluators. The promise tracker's sole focus is tracking the lifecycle of narrative obligations.

## Integration with Engine

Promise tracker output is merged into the final analysis result via `result-merger.ts`. Tracked promises are accumulated across pages and forwarded to the planner's continuation context as `accumulatedPromises` for awareness of potentially overdue promises. Payoff assessments (`promisePayoffAssessments`, `threadPayoffAssessments`) are persisted to the page object for UI display and future reference.
