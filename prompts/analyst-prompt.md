# Analyst Prompt (Production Template)

- Source: `src/llm/prompts/analyst-prompt.ts`
- Structure evaluation section source: `src/llm/prompts/continuation/story-structure-section.ts`
- Output schema source: `src/llm/schemas/analyst-schema.ts`

## Pipeline Position

The analyst runs for **both opening and continuation pages** as part of the unified generation pipeline:

**Pipeline position**: Planner -> Lorekeeper -> Writer -> **Analyst** -> Agenda Resolver

The analyst is conditional on the story having a structure. If no structure exists, the analyst step is skipped.

## Messages Sent To Model

### 1) System Message

```text
You are a story structure analyst for interactive fiction. Your role is to evaluate a narrative passage against a planned story structure and determine:
1. Whether the current story beat has been concluded
2. Whether the narrative has deviated from the planned beats
3. Whether the narrative adheres to the target tone

TONE/GENRE IDENTITY:
Tone: {{tone}}
{{#if toneFeel}}Target feel: {{toneFeel joined by ', '}}{{/if}}
{{#if toneAvoid}}Avoid: {{toneAvoid joined by ', '}}{{/if}}

You analyze structure progression, deviation, and tone adherence. You do NOT write narrative or make creative decisions.

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

THEMATIC CHARGE CLASSIFICATION:
- If THEMATIC KERNEL context is present, classify scene-level thematic valence:
  - THESIS_SUPPORTING: scene consequences/actions support the thesis-direction answer to the thematic question.
  - ANTITHESIS_SUPPORTING: scene consequences/actions support the antithesis-direction answer.
  - AMBIGUOUS: evidence is mixed, unresolved, or equally supports both sides.
- Set thematicCharge to exactly one enum value.
- Set thematicChargeDescription to 1-2 sentences citing concrete scene evidence.
- If THEMATIC KERNEL context is absent, default to thematicCharge = AMBIGUOUS with a concise neutral description.

NARRATIVE FOCUS CLASSIFICATION:
- Classify scene focus as exactly one:
  - DEEPENING: primarily develops existing conflicts, promises, relationships, or known constraints.
  - BROADENING: primarily introduces new factions, mysteries, goals, locations, or major scope expansions.
  - BALANCED: meaningfully deepens existing threads while adding limited new elements.
- Prefer DEEPENING when uncertain between DEEPENING and BALANCED.
- Prefer BALANCED when uncertain between BALANCED and BROADENING.

MIDPOINT EVALUATION:
- If the active beat is midpoint-tagged, enforce midpoint delivery quality:
  - FALSE_VICTORY: apparent win with hidden structural cost or instability.
  - FALSE_DEFEAT: apparent loss that plants credible recovery potential.
- If beatConcluded is true without midpoint-grade reversal function, mark pacingIssueDetected true and explain the midpoint miss.

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

PREMISE PROMISE FULFILLMENT:
- PREMISE PROMISES are high-level audience expectations from concept verification.
- If this scene clearly delivers one pending premise promise, set `premisePromiseFulfilled` to the EXACT matching promise text.
- If no premise promise is fulfilled, set `premisePromiseFulfilled` to `null`.
- Never invent or paraphrase promise text; choose only from `PENDING PREMISE PROMISES`.
- Never mark an already-fulfilled premise promise again.

OBLIGATORY SCENE FULFILLMENT:
- If ACTIVE BEAT OBLIGATION context is present, evaluate whether this scene fulfills that exact obligatory scene tag.
- Set `obligatorySceneFulfilled` to the EXACT obligation tag only when scene events satisfy the active beat's obligation in substance.
- If the scene does not fulfill the active obligation, set `obligatorySceneFulfilled` to `null`.
- If no active beat obligation context is provided, always set `obligatorySceneFulfilled` to `null`.

DELAYED CONSEQUENCE TRIGGERING:
- Evaluate only consequences listed in `TRIGGER-ELIGIBLE DELAYED CONSEQUENCES`.
- Set `delayedConsequencesTriggered` to exact IDs from that list when their trigger condition is clearly satisfied in the scene.
- Return `delayedConsequencesTriggered: []` when no eligible consequence triggers.
- Never invent IDs and never include non-eligible consequences.

NPC AGENDA COHERENCE:
- If NPC agendas are provided, evaluate whether NPC behavior in the scene aligns with their stated goals and fears.
- Set npcCoherenceAdherent to true if all NPCs who appear or act in the scene behave consistently with their agendas.
- Set npcCoherenceAdherent to false if any NPC acts contrary to their stated goal or fear without narrative justification.
- When npcCoherenceAdherent is false, write a brief npcCoherenceIssues description naming the NPC and explaining the inconsistency.
- When npcCoherenceAdherent is true or no NPC agendas are provided, set npcCoherenceIssues to an empty string.

NPC RELATIONSHIP SHIFT DETECTION:
- If NPC-protagonist relationships are provided, evaluate whether any relationship shifted significantly during the scene.
- Only flag meaningful shifts — routine interactions are not shifts.
- For each detected shift, provide: the NPC name, a description of what changed, a suggested valence change (-3 to +3), and a new dynamic label if the relationship dynamic itself changed (empty string if unchanged).
- These signals are forwarded to the Agenda Resolver to materialize into relationship mutations.

SPINE INTEGRITY EVALUATION:
- If a STORY SPINE section is present, evaluate whether any spine element has been IRREVERSIBLY invalidated by the narrative.
- Set spineDeviationDetected to true ONLY when an element cannot be recovered or redirected. This should be extremely rare.
- dramatic_question: The central dramatic question has been definitively and unambiguously answered. The story can no longer meaningfully explore it.
- antagonistic_force: The primary antagonistic force has been permanently eliminated with no successor or transformation possible.
- need_want: The protagonist's inner need has been fully satisfied OR the need-want tension has been completely resolved prematurely, leaving no room for further character development.
- Be EXTREMELY conservative. Partial answers, temporary setbacks to the antagonist, or incremental growth do NOT constitute spine deviation. Only truly irreversible narrative events qualify.
- When spineDeviationDetected is false, set spineDeviationReason to empty string and spineInvalidatedElement to null.
- When no STORY SPINE section is present, always set spineDeviationDetected to false.
- Beyond checking for deviation, briefly assess whether this scene meaningfully advanced the protagonist's need/want arc — did it deepen, complicate, or clarify the tension between Need and Want? Report this in the narrativeSummary.

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
Be conservative about deviation - minor variations are acceptable. Only mark true deviation when future beats are genuinely invalidated.
```

The tone block is injected between the role intro and the analysis rules. When tone is not available (shouldn't happen in practice), the tone block is omitted.

### 2) User Message

```text
=== STORY STRUCTURE ===
Overall Theme: {{structure.overallTheme}}
Premise: {{structure.premise}}

CURRENT ACT: {{currentAct.name}} (Act {{currentActIndex + 1}} of {{structure.acts.length}})
Objective: {{currentAct.objective}}
Stakes: {{currentAct.stakes}}

BEATS IN THIS ACT:
  [x] CONCLUDED ({{beat.role}}): {{beat.description}}
    Resolution: {{beatProgression.resolution}}
  [>] ACTIVE ({{beat.role}}): {{beat.description}}
    Objective: {{beat.objective}}
    {{#if beat.escalationType}}Escalation mechanism: {{beat.escalationType}}{{/if}}
    {{#if beat.crisisType}}Crisis type: {{beat.crisisType}}{{/if}}
    {{#if beat.uniqueScenarioHook}}Scenario hook: {{beat.uniqueScenarioHook}}{{/if}}
  [ ] PENDING ({{beat.role}}): {{beat.description}}
    Objective: {{beat.objective}}

REMAINING ACTS:
  - Act {{N}}: {{act.name}} - {{act.objective}}

CURRENT STATE (for beat evaluation):
- Location: {{activeState.currentLocation}}
- Active threats: {{activeState.activeThreats[*].text}}
- Constraints: {{activeState.activeConstraints[*].text}}
- Open threads:
  [{{thread.id}}] ({{thread.threadType}}/{{thread.urgency}}, {{threadAges[thread.id]}} pages old) {{thread.text}}
- Threads resolved this scene: {{threadsResolved}}
(Consider these when evaluating beat completion)

=== ACTIVE TRACKED PROMISES ===
(Only present when there are active promises)
ACTIVE TRACKED PROMISES:
- [{{promise.id}}] ({{promise.promiseType}}/{{promise.scope}}/{{promise.suggestedUrgency}}, {{promise.age}} pages old) {{promise.description}}
  Resolution criterion: {{promise.resolutionHint}}

Use these IDs for promisesResolved when the resolution criterion question has been ANSWERED in this scene.

=== PREMISE PROMISE TRACKING ===
(Only present when premise promises exist on story metadata)
PENDING PREMISE PROMISES:
- {{promise text}}

ALREADY FULFILLED PREMISE PROMISES:
- {{promise text}}

Set premisePromiseFulfilled to one exact pending promise string when fulfilled by this scene, otherwise null.

=== ACTIVE BEAT OBLIGATION ===
(Only present when active beat has an obligatorySceneTag)
ACTIVE BEAT OBLIGATION:
ACTIVE BEAT OBLIGATION TAG: {{obligatorySceneTag}}
Set obligatorySceneFulfilled to this exact tag only if this scene fulfills it; otherwise set obligatorySceneFulfilled to null.

=== TRIGGER-ELIGIBLE DELAYED CONSEQUENCES ===
TRIGGER-ELIGIBLE DELAYED CONSEQUENCES:
- [{{id}}] {{description}} (age {{currentAge}}, trigger window {{minPagesDelay}}-{{maxPagesDelay}})
  Trigger condition: {{triggerCondition}}

Set delayedConsequencesTriggered to IDs from this list only when their trigger condition is clearly satisfied in the scene.

=== THEMATIC KERNEL ===
(Only present when analyst context includes thematicQuestion or antithesis)
THEMATIC KERNEL:
Thematic question: {{thematicQuestion}}
Antithesis: {{antithesis}}

=== THREAD PAYOFF QUALITY ===
(Only present when threads were resolved this scene)
Threads were resolved this scene: {{threadsResolved}}
For each resolved thread, assess payoff quality:
- RUSHED: Resolved via exposition, off-screen action, or a single sentence without buildup
- ADEQUATE: Resolved through action but without significant dramatic development
- WELL_EARNED: Resolution developed through action, consequence, and emotional payoff

Populate threadPayoffAssessments for each resolved thread.

=== BEAT EVALUATION ===
Evaluate the following narrative against this structure to determine beat completion.

=== SCENE SIGNAL CLASSIFICATION ===
Classify the narrative before deciding beatConcluded:
- sceneMomentum: STASIS | INCREMENTAL_PROGRESS | MAJOR_PROGRESS | REVERSAL_OR_SETBACK | SCOPE_SHIFT
- objectiveEvidenceStrength: NONE | WEAK_IMPLICIT | CLEAR_EXPLICIT
- commitmentStrength: NONE | TENTATIVE | EXPLICIT_REVERSIBLE | EXPLICIT_IRREVERSIBLE
- structuralPositionSignal: WITHIN_ACTIVE_BEAT | BRIDGING_TO_NEXT_BEAT | CLEARLY_IN_NEXT_BEAT
- entryConditionReadiness: NOT_READY | PARTIAL | READY

=== COMPLETION GATE ===
Set beatConcluded: true only when the gate is satisfied.

Base gate for all beat roles (must satisfy at least one):
1. objectiveEvidenceStrength is CLEAR_EXPLICIT for the active beat objective
2. structuralPositionSignal is CLEARLY_IN_NEXT_BEAT AND there is explicit evidence that the active beat objective is no longer the primary unresolved objective

Additional gate for turning_point:
- commitmentStrength must be EXPLICIT_REVERSIBLE or EXPLICIT_IRREVERSIBLE
- If commitmentStrength is EXPLICIT_REVERSIBLE, require an explicit forward consequence that materially changes available next actions

Negative guards:
- Intensity/action escalation alone is insufficient without CLEAR_EXPLICIT objective evidence
- SCOPE_SHIFT alone cannot conclude a beat without objective resolution or explicit structural supersession evidence

If the completion gate is not satisfied, set beatConcluded: false.

PROGRESSION CHECK: Compare the narrative against PENDING beat descriptions and objectives when classifying structuralPositionSignal and alignedBeatId. If the narrative is truly in next-beat territory, use CLEARLY_IN_NEXT_BEAT and apply the completion gate. Also identify which specific pending beat the narrative aligns with via alignedBeatId.
(Only present when there are pending beats remaining.)

=== BEAT ALIGNMENT DETECTION ===
After classifying structuralPositionSignal, if the signal is NOT WITHIN_ACTIVE_BEAT, identify which PENDING beat the narrative most closely aligns with.

Compare the current narrative state against ALL pending beat objectives (shown above). Select the beat whose objective best describes what the narrative is currently delivering or has just delivered.

- alignedBeatId: The beat ID (e.g., "1.4", "2.1") that best matches the current narrative territory. null if WITHIN_ACTIVE_BEAT or no clear match.
- beatAlignmentConfidence:
  - HIGH: The narrative clearly satisfies or is actively delivering most conditions of the target beat's objective. Multiple objective elements are present.
  - MEDIUM: The narrative has elements that overlap with the target beat but also fits nearby beats. Ambiguous.
  - LOW: Weak or uncertain alignment. The narrative may have moved past the active beat but the target is unclear.
- beatAlignmentReason: One sentence explaining the alignment judgment.

If the aligned beat is the NEXT sequential beat (i.e., the one immediately after the active beat), this is normal progression — still report it but confidence assessment remains standard.

If the aligned beat is 2+ beats ahead of the active beat, this indicates a narrative leap. Be especially careful with HIGH confidence — only assign it when the evidence is unambiguous.

{{#if activeBeatRole === 'escalation'}}
=== ESCALATION QUALITY CHECK ===
The active beat role is "escalation". When evaluating this beat:
{{#if previousBeatResolution}}Previous beat resolved: "{{previousBeatResolution}}"{{/if}}
{{#if activeBeat.escalationType}}The expected escalation mechanism is {{activeBeat.escalationType}}. Assess whether the narrative delivered this specific type of escalation — not just any stakes increase.{{/if}}
{{#if activeBeat.crisisType}}The expected crisis type is {{activeBeat.crisisType}}. Assess whether choices created this dilemma shape.{{/if}}
{{#if activeBeat.uniqueScenarioHook}}The scene should reflect this unique scenario hook: "{{activeBeat.uniqueScenarioHook}}". Assess whether the scene leveraged this story's specific elements.{{/if}}
- Assess whether the narrative actually raised stakes beyond the previous beat
- Stakes are raised when new consequences, threats, or costs were introduced that did not exist before
- Stakes are NOT raised if the scene only added complexity without raising the cost of failure
- If beatConcluded is true but stakes were not genuinely raised, set pacingIssueDetected: true with pacingIssueReason: "Beat concluded without genuine escalation — scene added complexity but did not raise the cost of failure"
{{#if activeBeat.escalationType}}- If the escalation type does not match what actually happened (e.g., expected {{activeBeat.escalationType}} but got generic tension), note the mismatch in pacingIssueReason{{/if}}
{{#if activeBeat.crisisType}}- If choice pressure does not match crisis type {{activeBeat.crisisType}}, note the mismatch in pacingIssueReason{{/if}}
{{/if}}

{{#if activeBeatRole === 'turning_point'}}
=== TURNING POINT QUALITY CHECK ===
The active beat role is "turning_point". When evaluating this beat:
{{#if previousBeatResolution}}Previous beat resolved: "{{previousBeatResolution}}"{{/if}}
{{#if activeBeat.escalationType}}The expected turning point mechanism is {{activeBeat.escalationType}}. Assess whether the narrative delivered this specific type of shift — not just any irreversible change.{{/if}}
{{#if activeBeat.crisisType}}The expected crisis type is {{activeBeat.crisisType}}. Assess whether the turning-point decision pressure matched this dilemma shape.{{/if}}
{{#if activeBeat.uniqueScenarioHook}}The scene should reflect this unique scenario hook: "{{activeBeat.uniqueScenarioHook}}". Assess whether the scene leveraged this story's specific elements.{{/if}}
- Assess whether the narrative delivered an irreversible shift
- An irreversible shift means a decision, revelation, or consequence that permanently changes available options
- A scene that only adds complications without destroying the status quo is NOT a turning point
- If beatConcluded is true but no irreversible shift occurred, set pacingIssueDetected: true with pacingIssueReason: "Beat concluded without irreversible shift — status quo was not permanently altered"
{{#if activeBeat.escalationType}}- If the turning point type does not match what actually happened (e.g., expected {{activeBeat.escalationType}} but got generic change), note the mismatch in pacingIssueReason{{/if}}
{{#if activeBeat.crisisType}}- If turning-point choices do not reflect crisis type {{activeBeat.crisisType}}, note the mismatch in pacingIssueReason{{/if}}
{{/if}}

{{#if activeBeatRole === 'reflection'}}
=== REFLECTION QUALITY CHECK ===
The active beat role is "reflection". When evaluating this beat:
{{#if previousBeatResolution}}Previous beat resolved: "{{previousBeatResolution}}"{{/if}}
- Assess whether the narrative delivered thematic or internal deepening tied to the protagonist's current dilemma
- Reflection should produce a meaningful shift in interpretation, emotional commitment, or relational stance
- Reflection is NOT recap: repeating known facts or mood without new meaning does not satisfy this beat role
- If beatConcluded is true but no meaningful thematic/internal movement occurred, set pacingIssueDetected: true with pacingIssueReason: "Beat concluded without thematic/internal deepening — scene recapped prior material without changing interpretation or commitment"
{{/if}}
(Only present when active beat role is escalation, turning_point, or reflection.)

{{#if activeBeat.isMidpoint}}
=== MIDPOINT QUALITY CHECK ===
The active beat is midpoint-tagged. Evaluate whether this scene delivers a true structural midpoint reversal.
Expected midpoint type: {{activeBeat.midpointType}}
- FALSE_VICTORY: apparent win with hidden cost, instability, or misread consequence
- FALSE_DEFEAT: apparent loss that plants a credible seed of future success
- If beatConcluded is true but no midpoint-grade reversal occurs, set pacingIssueDetected: true and note midpoint underdelivery in pacingIssueReason
- Tie midpoint evaluation to structural function, not just emotional intensity
{{/if}}

=== BEAT DEVIATION EVALUATION ===
After evaluating beat completion, also evaluate whether the story has DEVIATED from remaining beats.

A deviation occurs when future beats are now impossible or nonsensical because:
- Story direction fundamentally changed
- Core assumptions of upcoming beats are invalid
- Required story elements/goals no longer exist

Evaluate ONLY beats that are not concluded. Never re-evaluate concluded beats.

Always provide narrativeSummary: a 1-2 sentence summary of the current narrative state (used for planner context and rewrite context).

If deviation is detected, mark:
- deviationDetected: true
- deviationReason: concise reason
- invalidatedBeatIds: invalid beat IDs only

If no deviation is detected, mark deviationDetected: false.
Be conservative. Minor variations are acceptable; only mark true deviation for genuine invalidation.

REMAINING BEATS TO EVALUATE FOR DEVIATION:
  - {{beat.id}}: {{beat.description}}
    Objective: {{beat.objective}}

=== PACING EVALUATION ===
Pages spent on current beat: {{state.pagesInCurrentBeat}}
Story pacing budget: {{pacingBudget.targetPagesMin}}-{{pacingBudget.targetPagesMax}} total pages
Total beats in structure: {{totalBeats}}
Average pages per beat (budget-based): ~{{avgPagesPerBeat}}

DETECT A PACING ISSUE (pacingIssueDetected: true) when EITHER applies:
1. BEAT STALL: pagesInCurrentBeat exceeds {{maxPagesPerBeat}} (roughly targetPagesMax / totalBeats, rounded up + 2) AND the beat objective has not been meaningfully advanced
2. MISSING MIDPOINT: The story has consumed more than 50% of its page budget (estimated from beat progression and pagesInCurrentBeat) without any turning_point beat being concluded

If pacingIssueDetected is true:
- pacingIssueReason: Explain what's stalling or missing
- recommendedAction:
  - "nudge" if a stronger directive in the next page could fix it (e.g., "this scene must deliver a reveal")
  - "rewrite" if the remaining structure needs to be pulled closer (e.g., turning points are too far away)

If no pacing issue: pacingIssueDetected: false, pacingIssueReason: "", recommendedAction: "none"

{{#if accumulatedNpcAgendas}}
NPC AGENDAS (evaluate behavior consistency):
[{{npc.npcName}}]
  Goal: {{npc.currentGoal}}
  Fear: {{npc.fear}}
{{/if}}

{{#if accumulatedNpcRelationships has entries}}
NPC-PROTAGONIST RELATIONSHIPS (evaluate for shifts):
[{{rel.npcName}}]
  Dynamic: {{rel.dynamic}} | Valence: {{rel.valence}}
  Tension: {{rel.currentTension}}
{{/if}}

TONE REMINDER: All output must fit the tone: {{tone}}.{{#if toneFeel}} Target feel: {{toneFeel joined by ', '}}.{{/if}}{{#if toneAvoid}} Avoid: {{toneAvoid joined by ', '}}.{{/if}}

{{#if spine}}
STORY SPINE (invariant narrative backbone — every scene must serve this):
Story Pattern: {{spine.storySpineType}}
Conflict Axis: {{spine.conflictAxis}}
Conflict Type: {{spine.conflictType}}
Character Arc: {{spine.characterArcType}}
Central Dramatic Question: {{spine.centralDramaticQuestion}}
Protagonist Need: {{spine.protagonistNeedVsWant.need}}
Protagonist Want: {{spine.protagonistNeedVsWant.want}}
Need–Want Dynamic: {{spine.protagonistNeedVsWant.dynamic}}
Antagonistic Force: {{spine.primaryAntagonisticForce.description}}
Pressure Mechanism: {{spine.primaryAntagonisticForce.pressureMechanism}}
Every act must advance or complicate the protagonist's relationship to the central dramatic question.
{{/if}}

NARRATIVE TO EVALUATE:
{{narrative}}
```

The tone reminder is injected into the user prompt (before the narrative) in addition to the tone block in the system prompt, exploiting recency attention for tone evaluation accuracy.

## JSON Response Shape

```json
{
  "beatConcluded": {{true|false}},
  "beatResolution": "{{string, required; may be empty when beatConcluded=false}}",
  "deviationDetected": {{true|false}},
  "deviationReason": "{{string, empty when no deviation}}",
  "invalidatedBeatIds": ["{{beatId like 2.1}}"],
  "narrativeSummary": "{{short state summary, empty when no deviation}}",
  "pacingIssueDetected": {{true|false}},
  "pacingIssueReason": "{{string, empty when no pacing issue}}",
  "recommendedAction": "{{none|nudge|rewrite}}",
  "sceneMomentum": "{{STASIS|INCREMENTAL_PROGRESS|MAJOR_PROGRESS|REVERSAL_OR_SETBACK|SCOPE_SHIFT}}",
  "objectiveEvidenceStrength": "{{NONE|WEAK_IMPLICIT|CLEAR_EXPLICIT}}",
  "commitmentStrength": "{{NONE|TENTATIVE|EXPLICIT_REVERSIBLE|EXPLICIT_IRREVERSIBLE}}",
  "structuralPositionSignal": "{{WITHIN_ACTIVE_BEAT|BRIDGING_TO_NEXT_BEAT|CLEARLY_IN_NEXT_BEAT}}",
  "entryConditionReadiness": "{{NOT_READY|PARTIAL|READY}}",
  "objectiveAnchors": ["{{anchor extracted from active beat objective}}"],
  "anchorEvidence": ["{{explicit evidence mapped to anchor}}"],
  "completionGateSatisfied": {{true|false}},
  "completionGateFailureReason": "{{string}}",
  "toneAdherent": {{true|false}},
  "toneDriftDescription": "{{string, empty when toneAdherent is true}}",
  "npcCoherenceAdherent": {{true|false}},
  "npcCoherenceIssues": "{{string, empty when coherent or no agendas}}",
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
      "threadId": "{{td-N}}",
      "threadText": "{{the thread text}}",
      "satisfactionLevel": "{{RUSHED|ADEQUATE|WELL_EARNED}}",
      "reasoning": "{{why this satisfaction level}}"
    }
  ],
  "relationshipShiftsDetected": [
    {
      "npcName": "{{exact NPC name}}",
      "shiftDescription": "{{what changed in the relationship, 1-2 sentences}}",
      "suggestedValenceChange": "{{-3 to +3, positive=warmer, negative=colder}}",
      "suggestedNewDynamic": "{{new dynamic label if changed, empty string if unchanged}}"
    }
  ],
  "pacingDirective": "{{1-3 sentence natural-language pacing briefing for the page planner}}",
  "spineDeviationDetected": {{true|false}},
  "spineDeviationReason": "{{string, empty when no spine deviation}}",
  "spineInvalidatedElement": "{{dramatic_question|antagonistic_force|need_want|null}}",
  "alignedBeatId": "{{beat ID like 1.4 or 2.1, null when WITHIN_ACTIVE_BEAT or no clear match}}",
  "beatAlignmentConfidence": "{{LOW|MEDIUM|HIGH}}",
  "beatAlignmentReason": "{{one sentence explaining alignment judgment, empty when alignedBeatId is null}}",
  "obligatorySceneFulfilled": "{{exact obligatorySceneTag or null}}",
  "premisePromiseFulfilled": "{{exact pending premise promise text or null}}"
}
```

- `toneAdherent`: Whether the narrative matches the target tone's mood, vocabulary, and emotional register. Defaults to `true`.
- `toneDriftDescription`: When `toneAdherent` is `false`, describes what feels off and what the tone should be. Empty string when adherent. This feedback propagates to the planner's continuation context for course correction.
- `npcCoherenceAdherent`: Whether NPCs in the scene acted consistently with their stated agendas. Defaults to `true` when no NPC agendas are provided.
- `npcCoherenceIssues`: When `npcCoherenceAdherent` is `false`, briefly names the NPC and explains the inconsistency. Empty string when coherent or no agendas. This feedback is forwarded to the agenda resolver to distinguish intentional NPC evolution from writer error.
- `promisesDetected`: Array of newly detected narrative promises (max 2). Empty array if none detected. Each promise must pass the litmus test: phrasable as a specific question the reader expects answered and would feel disappointed if never addressed. Each entry includes `description`, `promiseType` (CHEKHOV_GUN, FORESHADOWING, UNRESOLVED_TENSION, DRAMATIC_QUESTION, MYSTERY_HOOK, TICKING_CLOCK), `scope` (SCENE, BEAT, ACT, STORY — matching the weight of the setup), `resolutionHint` (a specific question), and `suggestedUrgency`. Promises with empty `resolutionHint` are filtered out by the response transformer.
- `promisesResolved`: Array of resolved promise IDs (`pr-N`) from active tracked promises. A promise is resolved when its `resolutionHint` question has been ANSWERED, not merely referenced. Empty array when no tracked promises were paid off.
- `promisePayoffAssessments`: Array of payoff quality assessments for resolved promises. Empty array when no promises were resolved.
- `threadPayoffAssessments`: Array of payoff quality assessments for threads resolved this scene. Empty array when no threads were resolved. Only populated when `threadsResolved` is non-empty in the analyst context.
- `relationshipShiftsDetected`: Array of NPC-protagonist relationship shifts observed in this scene. Empty array if no significant shifts detected. Only flag meaningful changes, not routine interactions. `suggestedValenceChange` is clamped to -3..+3 by the response transformer. These signals are forwarded to the Agenda Resolver to materialize into relationship mutations.
- `pacingDirective`: A holistic 1-3 sentence natural-language pacing briefing for the page planner. Synthesizes sceneMomentum, objectiveEvidenceStrength, commitmentStrength, structuralPositionSignal, entryConditionReadiness, and pacing budget context into a single actionable instruction. Addresses rhythm (breathe or accelerate?), structural position (how close is beat conclusion?), and what narrative movement the next page should deliver. Written as if briefing a fiction writer, not classifying signals. This field replaces the raw enum display in the planner's pacing briefing — enums are retained internally for beat-conclusion gating but no longer forwarded to the planner as raw labels.
- `spineDeviationDetected`: Whether a story spine element has been irreversibly invalidated. Defaults to `false`. This is distinct from the existing beat-level `deviationDetected` field, forming a **two-tier deviation system**: beat deviation triggers structure rewrites within the existing spine, while spine deviation signals that the narrative backbone itself needs regeneration.
- `spineDeviationReason`: When `spineDeviationDetected` is `true`, explains which element was invalidated and why. Empty string when no spine deviation.
- `spineInvalidatedElement`: The specific spine element that was invalidated: `"dramatic_question"` (central question definitively answered), `"antagonistic_force"` (permanently eliminated with no successor), or `"need_want"` (need-want tension fully resolved prematurely). `null` when no spine deviation detected. Only one element can be flagged per evaluation.
- `alignedBeatId`: When `structuralPositionSignal` is not `WITHIN_ACTIVE_BEAT`, identifies which pending beat (by ID, e.g., `"1.4"` or `"2.1"`) the narrative most closely aligns with. `null` when `WITHIN_ACTIVE_BEAT` or when no clear alignment exists. Invalid beat ID formats are normalized to `null` by the response transformer. When beat alignment detection identifies a HIGH-confidence skip to a beat 2+ positions ahead, the engine mechanically advances the structure state past intermediate beats, concluding each with a synthetic resolution ("Implicitly resolved by narrative advancement"). This is gated by the `enableBeatAlignmentSkip` config flag.
- `obligatorySceneFulfilled`: Exact active-beat `obligatorySceneTag` fulfilled by this scene, or `null` when no obligation was fulfilled.
- `beatAlignmentConfidence`: Confidence in the `alignedBeatId` judgment. `HIGH` means the narrative clearly satisfies most conditions of the target beat's objective. `MEDIUM` means the narrative has overlapping elements but is ambiguous. `LOW` means uncertain alignment. Only `HIGH` confidence triggers mechanical beat skipping; `MEDIUM` is logged but does not alter structure progression.
- `beatAlignmentReason`: One sentence explaining the alignment judgment. Empty string when `alignedBeatId` is `null`.
