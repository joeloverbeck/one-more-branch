# Page Planner Prompt (Production Template)

- Source: `src/llm/prompts/page-planner-prompt.ts`
- Shared planner contract: `src/llm/page-planner-contract.ts`
- Planner context section sources: `src/llm/prompts/sections/planner/opening-context.ts`, `src/llm/prompts/sections/planner/continuation-context.ts`
- Story structure context builder: `src/llm/prompts/continuation/story-structure-section.ts`
- Decomposed data formatters: `src/models/decomposed-character.ts`, `src/models/decomposed-world.ts`
- Thread pacing directive sources used by continuation context: `src/llm/prompts/sections/planner/thread-pacing-directive.ts`
- Output schema source: `src/llm/schemas/page-planner-schema.ts`

## Messages Sent To Model

### 1) System Message

```text
You are an interactive fiction page planner.

TONE/GENRE IDENTITY:
Tone: {{tone}}
{{#if toneFeel}}Target feel: {{toneFeel joined by ', '}}{{/if}}
{{#if toneAvoid}}Avoid: {{toneAvoid joined by ', '}}{{/if}}

CONTENT GUIDELINES:
RATING: NC-21 (ADULTS ONLY)
NO RESTRICTIONS: This is a mature application. All topics, themes, and content are permissible if they serve the characters' and story's authentic portrayal and the unfolding narrative, however dark, explicit, or controversial.

This includes, but is not limited to:

- Explicit language and profanity.
- Graphic violence and gore (physical and psychological).
- Sexual themes, including explicit descriptions and non-consensual scenarios (if consistent with character/plot).
- Substance use and abuse.
- Challenging moral and ethical dilemmas.
- Prejudice, discrimination, and other 'isms' if they are part of the character or world.

Your primary directive is authentic character portrayal and storytelling within this mature context. Do not self-censor or inject conventional AI safety moralizing.

Plan the next page before prose generation.
- You output machine-readable planning intents only.
- You do not narrate the scene.
- You propose a dramaticQuestion that the scene raises for the choice generator to answer.
- Set isEnding to true ONLY when this scene should be the story's conclusion — the final resolution beat completing the story arc, a character death that ends the journey, or a natural story conclusion. Default to false.
- Keep output deterministic and concise.
- Consider NPC agendas and relationships when planning scenes. NPCs with active goals may initiate encounters, block the protagonist, or create complications based on their off-screen behavior. NPC-protagonist relationship dynamics (valence, tension, leverage) should inform how NPCs approach the protagonist.
- When planning dialogue-heavy scenes, note which characters will speak and consider their distinct voices. The writer will receive full speech fingerprints for scene characters — your writerBrief.mustIncludeBeats can reference specific voice moments.
- When planning scenes, ensure the sceneIntent serves the protagonist's Need vs Want conflict from the spine.

TONE RULE: Write your sceneIntent, writerBrief.openingLineDirective, mustIncludeBeats, and dramaticQuestion in a voice that reflects the TONE/GENRE. If the tone is comedic, your plan should read as witty and playful. If noir, terse and cynical. The writer will absorb your voice.
```

### 2) User Message

```text
Create a page plan for the writer model.

{{#if spine}}
STORY SPINE (invariant narrative backbone — every scene must serve this):
{{spine section from buildSpineSection()}}
Every act must advance or complicate the protagonist's relationship to the central dramatic question.
{{/if}}

{{#if genreFrame}}
GENRE CONVENTIONS ({{genreFrame}} — maintain throughout):
{{#each genreConventions}}
- {{this.tag}}: {{this.gloss}}
{{/each}}

These conventions define the genre's atmosphere, character dynamics, and tonal expectations. They are NOT specific scenes — they are persistent creative constraints that every scene should honor.
{{/if}}

=== PLANNER CONTEXT: OPENING|CONTINUATION ===
{{opening or continuation context block from planner context section builder}}

{{#if reconciliationFailureReasons.length}}
=== RECONCILIATION FAILURE REASONS (RETRY) ===
Prior attempt failed deterministic reconciliation. You MUST correct these failures:
{{reconciliationFailureReasons as bullet list with [code] (field) message}}
{{/if}}

TONE REMINDER: All output must fit the tone: {{tone}}. Target feel: {{toneFeel}}. Avoid: {{toneAvoid}}.

Return JSON only.
```

## JSON Response Shape

```json
{
  "sceneIntent": "{{one-line scene direction}}",
  "continuityAnchors": ["{{fact to preserve in next page}}"],
  "writerBrief": {
    "openingLineDirective": "{{how writer should open next scene}}",
    "mustIncludeBeats": ["{{must include beat}}"],
    "forbiddenRecaps": ["{{things writer must not recap}}"]
  },
  "dramaticQuestion": "{{single sentence framing the core tension the choices answer}}",
  "isEnding": false
}
```

## Story Structure Context

When a story structure is present, the planner receives a STORY STRUCTURE block built by `buildSharedStructureContext()` in `src/llm/prompts/continuation/story-structure-section.ts`:

```text
=== STORY STRUCTURE ===
Overall Theme: {{structure.overallTheme}}
Premise: {{structure.premise}}
Opening image: {{structure.openingImage}}
Closing image: {{structure.closingImage}}

CURRENT ACT: {{act.name}} (Act {{actIndex + 1}} of {{structure.acts.length}})
Objective: {{act.objective}}
Stakes: {{act.stakes}}
{{#if act.actQuestion}}Act Question: {{act.actQuestion}}{{/if}}
{{#if act.exitReversal}}Expected Exit Reversal: {{act.exitReversal}}{{/if}}
{{#if act.promiseTargets}}Promise Targets: {{act.promiseTargets joined by ', '}}{{/if}}

BEATS IN THIS ACT:
  [x] CONCLUDED ({{beat.role}}): {{beat.description}}
    Resolution: {{beatProgression.resolution}}
  [>] ACTIVE ({{beat.role}}): {{beat.description}}
    Objective: {{beat.objective}}
    {{#if beat.exitCondition}}Exit condition: {{beat.exitCondition}}{{/if}}
    {{#if beat.escalationType}}Escalation mechanism: {{beat.escalationType}}{{/if}}
    {{#if beat.crisisType}}Crisis type: {{beat.crisisType}}{{/if}}
    {{#if beat.expectedGapMagnitude}}Expected gap magnitude: {{beat.expectedGapMagnitude}}{{/if}}
    {{#if beat.isMidpoint}}Midpoint: true ({{beat.midpointType}}){{/if}}
    {{#if beat.uniqueScenarioHook}}Scenario hook: {{beat.uniqueScenarioHook}}{{/if}}
    {{#if beat.approachVectors}}Approach vectors: {{beat.approachVectors joined by ', '}}{{/if}}
  [ ] PENDING ({{beat.role}}): {{beat.description}}
    Objective: {{beat.objective}}
    {{#if beat.exitCondition}}Exit condition: {{beat.exitCondition}}{{/if}}

REMAINING ACTS:
  - Act {{N}}: {{act.name}} - {{act.objective}}
```

Act-level fields `actQuestion`, `exitReversal`, and `promiseTargets` are rendered defensively — only when non-empty. Active milestones show all architecture v2 fields when present.

## Protagonist Identity Directive

A `PROTAGONIST IDENTITY` directive is always injected into the user message (both opening and continuation contexts), since decomposed characters are required on planner context types:

```text
PROTAGONIST IDENTITY: {{protagonistName}} is the protagonist.
```

This establishes who the protagonist is for scene planning purposes.

Source: `buildPlannerOpeningContextSection()` and `buildPlannerContinuationContextSection()` in `src/llm/prompts/sections/planner/`

## Suggested Protagonist Speech

When the player provides a `suggestedProtagonistSpeech` via the choice POST, the planner continuation context includes a directive section:

```text
{{#if suggestedProtagonistSpeech (trimmed, non-empty)}}
=== SUGGESTED PROTAGONIST SPEECH (PLAYER INTENT) ===
The player wants the protagonist to say something like:
"{{suggestedProtagonistSpeech}}"

Incorporate this into your plan:
- Shape the sceneIntent so the scene creates a natural moment for this speech
- Include a must-include beat in writerBrief that reflects the protagonist voicing this intent
- Consider how NPCs and the situation would react to this kind of statement
- Let the speech intent influence the scene's dramatic direction

This is meaningful player input - plan around it, do not treat it as optional.
{{/if}}
```

This section is placed immediately before `PLAYER'S CHOICE:` in the planner context. The writer does **not** receive the suggested speech directly - instead, the planner shapes `sceneIntent` and `writerBrief.mustIncludeBeats` to incorporate the speech intent, and the writer follows those instructions.

## Pacing Briefing

When the parent page's analyst result includes a `pacingDirective`, the continuation context includes a pacing briefing section:

```text
{{#if parentPacingDirective OR parentPacingNudge OR trajectoryWarnings}}
=== PACING BRIEFING (from story analyst) ===
{{parentPacingDirective}}
{{#if parentPacingNudge}}URGENT: {{parentPacingNudge}}{{/if}}

{{trajectoryWarnings}}
{{/if}}
```

The pacing briefing is a natural-language directive synthesized by the analyst from all pacing signals (momentum, evidence strength, commitment, structural position, entry readiness, pacing budget). Raw enum labels (e.g., `Scene momentum: MAJOR_PROGRESS`) are no longer displayed to the planner.

Trajectory warnings are emitted when momentum data shows concerning patterns:
- **Stasis warning** (2+ consecutive): "The last N scenes showed no meaningful narrative progress. Plan MUST include a major advancement."
- **Weak evidence warning** (3+ consecutive): "The last N scenes produced no clear evidence of beat objective progress. Plan MUST make direct progress toward the current beat objective."

The briefing is omitted entirely when no directive, nudge, or trajectory warnings are present.

Source: `buildPacingBriefingSection()` in `src/llm/prompts/sections/planner/continuation-context.ts`

## Thematic Trajectory Warning

When continuation context includes thematic valence trajectory data and 3+ recent scenes trend in the same direction, the planner context includes:

```text
=== THEMATIC TRAJECTORY ===
Recent scene valence history:
- [{{pageId}}] {{thematicValence}}
...

WARNING: The last N scenes all trend {{THESIS_SUPPORTING|ANTITHESIS_SUPPORTING}}. Plan should pressure-test the opposing argument ({{opposing valence}}) through action and consequence to avoid thematic monotony.
```

This section is omitted when there are fewer than 3 trajectory points or when recent points are mixed instead of monotonous.

Source: `buildThematicTrajectoryWarningSection()` in `src/llm/prompts/sections/planner/continuation-context.ts`

## Depth Vs Breadth Warning

When continuation context includes narrative focus trajectory data and 3+ recent scenes are consecutive `BROADENING`, the planner context includes:

```text
=== DEPTH VS BREADTH TRAJECTORY ===
Recent scene focus history:
- [{{pageId}}] {{narrativeFocus}}
...

WARNING: The last N scenes trend BROADENING. Plan should prioritize DEEPENING: advance existing threads, intensify known relationships, or force consequence payoffs before introducing major new scope.
```

This section is omitted when there are fewer than 3 trajectory points or when recent focus is mixed/non-broadening.

Source: `buildNarrativeFocusWarningSection()` in `src/llm/prompts/sections/planner/continuation-context.ts`

## Dramatic Irony Opportunities

When continuation context includes accumulated knowledge asymmetry data, the planner context includes:

```text
=== DRAMATIC IRONY OPPORTUNITIES ===
Exploit information asymmetry to create tension where the protagonist and other characters act on conflicting beliefs.
- {{characterName}}
  False beliefs: {{...}}
  Secrets: {{...}}
  Known facts: {{...}}
```

This section is omitted when `accumulatedKnowledgeState` is empty.

Source: `buildDramaticIronyOpportunitiesSection()` in `src/llm/prompts/sections/planner/continuation-context.ts`

## Structural Directive

When the active beat role is `escalation`, `turning_point`, or `reflection` (or when the active beat is midpoint-tagged), the continuation context includes structural directive sections (placed after the pacing briefing and before thread aging):

```text
{{#if activeBeatRole === 'escalation'}}
=== ESCALATION DIRECTIVE ===
The active beat role is "escalation". This scene MUST raise stakes beyond the previous beat.
{{#if previousBeatResolution}}Previous beat resolved: "{{previousBeatResolution}}"{{/if}}
{{#if activeBeat.escalationType}}Escalation mechanism: {{activeBeat.escalationType}} — plan a scene that delivers this specific type of escalation.{{/if}}
{{#if activeBeat.secondaryEscalationType}}Secondary escalation mechanism: {{activeBeat.secondaryEscalationType}} — layer this as an additional pressure axis in the same scene.{{/if}}
{{#if activeBeat.crisisType}}Crisis type: {{activeBeat.crisisType}} — shape the scene so the dilemma matches this crisis form.{{/if}}
{{#if activeBeat.uniqueScenarioHook}}Unique scenario hook: {{activeBeat.uniqueScenarioHook}}{{/if}}
{{#if activeBeat.approachVectors}}Approach vectors: {{activeBeat.approachVectors joined by ', '}} — consider these when designing the scene's dramatic question.{{/if}}
Requirements:
- Introduce a new consequence, threat, or irreversible change not present before
- The protagonist's situation must be measurably worse, more constrained, or more costly than before
- "More complicated" is NOT escalation — escalation means "more costly to fail"
{{/if}}

{{#if activeBeatRole === 'turning_point'}}
=== TURNING POINT DIRECTIVE ===
The active beat role is "turning_point". This scene MUST deliver an irreversible shift.
{{#if previousBeatResolution}}Previous beat resolved: "{{previousBeatResolution}}"{{/if}}
{{#if activeBeat.escalationType}}Turning point mechanism: {{activeBeat.escalationType}} — plan a scene that delivers this specific type of shift.{{/if}}
{{#if activeBeat.secondaryEscalationType}}Secondary turning point mechanism: {{activeBeat.secondaryEscalationType}} — ensure the irreversible shift lands across both escalation axes.{{/if}}
{{#if activeBeat.crisisType}}Crisis type: {{activeBeat.crisisType}} — shape the scene so the pivotal decision matches this crisis form.{{/if}}
{{#if activeBeat.uniqueScenarioHook}}Unique scenario hook: {{activeBeat.uniqueScenarioHook}}{{/if}}
{{#if activeBeat.approachVectors}}Approach vectors: {{activeBeat.approachVectors joined by ', '}} — consider these when designing the scene's dramatic question.{{/if}}
Requirements:
- Create a point of no return — a decision, revelation, or consequence that cannot be undone
- The protagonist's available options must fundamentally change after this scene
- "More complicated" is NOT a turning point — a turning point means the status quo is permanently destroyed
{{/if}}

{{#if activeBeatRole === 'reflection'}}
=== REFLECTION DIRECTIVE ===
The active beat role is "reflection". This scene MUST deliver thematic or internal deepening without forced escalation.
{{#if previousBeatResolution}}Previous beat resolved: "{{previousBeatResolution}}"{{/if}}
Requirements:
- Deepen the protagonist's understanding, conviction, fear, or value conflict tied to the current dramatic question
- Produce a meaningful internal or relational shift that changes how the next conflict will be approached
- Reflection is NOT recap: avoid merely restating known facts without new interpretation or commitment
{{/if}}

{{#if activeBeat.isMidpoint}}
=== MIDPOINT DIRECTIVE ===
This beat is the structural midpoint. The scene should deliver a central reversal that reorients the trajectory of the story.
Midpoint type: {{activeBeat.midpointType}}
- FALSE_VICTORY: apparent success that conceals cost, instability, or strategic error
- FALSE_DEFEAT: apparent failure that plants leverage or insight for later recovery
- The scene should force the protagonist to commit under the new understanding created by the midpoint turn
{{/if}}

{{#if activeBeat.role === 'resolution' && isFinalBeatInFinalAct}}
=== FINAL RESOLUTION IMAGE DIRECTIVE ===
This is the final resolution beat. Plan the scene so its climactic visual lands on or clearly sets up this closing image: "{{structure.closingImage}}"
Ensure the closing image meaningfully mirrors or contrasts the opening image: "{{structure.openingImage}}".
- The scene should create pathways that can all credibly converge to this ending visual.
{{/if}}
```

The previous beat resolution is found by walking backward through concluded beats in the current act. If the escalation/turning-point/reflection beat is the first beat in the act, the previous resolution line is omitted. The escalation mechanism(s), crisis type, unique scenario hook, and approach vectors lines are emitted only when those fields are present on the active beat. The final-resolution image directive is emitted only for the last beat of the last act when that beat role is `resolution`.

Source: `buildEscalationDirective()` in `src/llm/prompts/sections/planner/continuation-context.ts`

## Late-Act Premise Promise Warning

When continuation context includes story-level `premisePromises`, page-level `fulfilledPremisePromises`, and the current act is in the late window (last two acts), the planner context adds:

```text
=== PREMISE PROMISE WARNING (LATE ACT) ===
The story is in a late act and these premise promises remain unfulfilled. This plan should advance or pay off at least one when narratively viable.
- {{unfulfilled premise promise}}
```

This section is omitted when there are no premise promises, none are pending, or the story is not in a late act.

## Continuation Context: NPC Relationship Data

When `accumulatedNpcRelationships` has entries, the continuation context includes:

```text
NPC-PROTAGONIST RELATIONSHIPS (current dynamics):
[CharacterName]
  Dynamic: {{relationship.dynamic}} | Valence: {{relationship.valence}}
  Tension: {{relationship.currentTension}}
```

This section appears after `NPC AGENDAS` and before `YOUR INVENTORY:`. It provides the planner with structured relationship context to inform scene planning — e.g., leveraging hostile dynamics for confrontation scenes or warm dynamics for trust-building moments.

Source: `buildNpcRelationshipsSection()` in `src/llm/prompts/sections/planner/continuation-context.ts`

## Continuation Context: Pending Consequences

Continuation context now includes pending delayed consequences to surface deferred-payoff opportunities:

```text
PENDING CONSEQUENCES:
- [{{id}}] {{description}} (age {{currentAge}}, trigger window {{minPagesDelay}}-{{maxPagesDelay}})
  Trigger condition: {{triggerCondition}}
```

Only untriggered consequences are listed. When none are pending, the section renders `(none)`.

Source: `buildPendingConsequencesSection()` in `src/llm/prompts/sections/planner/continuation-context.ts`

## Notes

- When `genreFrame` is present on `PagePlanContext`, a **GENRE CONVENTIONS** block is injected into the user prompt between the spine section and the planner context section. The conventions come from `buildGenreConventionsSection(context.genreFrame)` in `src/llm/prompts/sections/shared/genre-conventions-section.ts`.
- Planner output no longer includes `stateIntents`; state mutation planning is handled by the state accountant stage.
- Planner continuation context still includes active state, canon (with epistemic type tags when available, rendered via `formatCanonForPrompt()` as `• [TYPE] text`), thread aging, pacing briefing (natural-language directive from analyst, not raw enums), thematic trajectory warnings, NPC agendas, NPC relationships, and payoff feedback to inform scene and choice planning.
- The planner and accountant share the same context builders (`buildPlannerOpeningContextSection`, `buildPlannerContinuationContextSection`) but with different options. The planner uses default options (protagonist directive and guidance included). The accountant passes `{ includeProtagonistDirective: false }` to exclude protagonist-specific sections. The `PlannerContextOptions` interface in `continuation-context.ts` controls this behavior.
- Planner system-rule bullets and required output fields are centralized in `src/llm/page-planner-contract.ts` and consumed by both prompt + schema layers.
- Decomposed character and world data are required on both opening and continuation planner contexts. Raw `characterConcept`, `worldbuilding`, and `npcs` fallbacks have been removed from planner context builders.
