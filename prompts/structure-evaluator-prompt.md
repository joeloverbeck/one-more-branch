# Structure Evaluator Prompt (Production Template)

- Source: `src/llm/prompts/structure-evaluator-prompt.ts`
- Output schema source: `src/llm/schemas/structure-evaluator-schema.ts`

## Pipeline Position

The Structure Evaluator runs as part of the parallel evaluation phase following the Writer stage:

**Pipeline position**: Planner -> Lorekeeper -> Writer -> **[Structure Evaluator | Promise Tracker | Scene Quality]** (parallel) -> Agenda Resolver

The Structure Evaluator is conditional on the story having a structure. If no structure exists, this step is skipped.

## Single Responsibility

The Structure Evaluator has ONE focused responsibility: evaluate beat completion, structural progression, pacing, and spine integrity.

The Structure Evaluator does NOT evaluate:
- Tone adherence
- NPC coherence (handled by Promise Tracker)
- Narrative promises (handled by Promise Tracker)
- Prose quality (handled by Scene Quality)

This split allows each evaluator to specialize on its domain without context pollution.

## Messages Sent To Model

### 1) System Message

```text
You are a story structure evaluator for interactive fiction. Your SINGLE responsibility is to evaluate whether the narrative satisfies structural objectives — beat completion, deviation, pacing, and spine integrity.

You do NOT evaluate tone, NPC coherence, narrative promises, or quality. Those are handled by other evaluators.

Use this strict sequence:
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

## JSON Response Shape

```json
{
  "beatConcluded": {{true|false}},
  "beatResolution": "{{string, required; may be empty when beatConcluded=false}}",
  "sceneMomentum": "{{STASIS|INCREMENTAL_PROGRESS|MAJOR_PROGRESS|REVERSAL_OR_SETBACK|SCOPE_SHIFT}}",
  "objectiveEvidenceStrength": "{{NONE|WEAK_IMPLICIT|CLEAR_EXPLICIT}}",
  "commitmentStrength": "{{NONE|TENTATIVE|EXPLICIT_REVERSIBLE|EXPLICIT_IRREVERSIBLE}}",
  "structuralPositionSignal": "{{WITHIN_ACTIVE_BEAT|BRIDGING_TO_NEXT_BEAT|CLEARLY_IN_NEXT_BEAT}}",
  "entryConditionReadiness": "{{NOT_READY|PARTIAL|READY}}",
  "objectiveAnchors": ["{{anchor extracted from active beat objective}}"],
  "anchorEvidence": ["{{explicit evidence mapped to anchor}}"],
  "completionGateSatisfied": {{true|false}},
  "completionGateFailureReason": "{{string}}",
  "deviationDetected": {{true|false}},
  "deviationReason": "{{string, empty when no deviation}}",
  "invalidatedBeatIds": ["{{beatId like 2.1}}"],
  "spineDeviationDetected": {{true|false}},
  "spineDeviationReason": "{{string, empty when no spine deviation}}",
  "spineInvalidatedElement": "{{dramatic_question|antagonistic_force|need_want|null}}",
  "alignedBeatId": "{{beat ID like 1.4 or 2.1, null when WITHIN_ACTIVE_BEAT or no clear match}}",
  "beatAlignmentConfidence": "{{LOW|MEDIUM|HIGH}}",
  "beatAlignmentReason": "{{one sentence explaining alignment judgment, empty when alignedBeatId is null}}",
  "pacingIssueDetected": {{true|false}},
  "pacingIssueReason": "{{string, empty when no pacing issue}}",
  "recommendedAction": "{{none|nudge|rewrite}}",
  "pacingDirective": "{{1-3 sentence natural-language pacing briefing for the page planner}}",
  "narrativeSummary": "{{short state summary, always populated}}"
}
```

## Output Field Reference

- `beatConcluded`: True when active beat objective is achieved or narrative has progressed beyond beat scope into later territory. Gated by `completionGateSatisfied`.
- `beatResolution`: Brief description of how beat was resolved. Required when `beatConcluded` is true.
- `sceneMomentum`: Classification of narrative momentum (STASIS, INCREMENTAL_PROGRESS, MAJOR_PROGRESS, REVERSAL_OR_SETBACK, SCOPE_SHIFT).
- `objectiveEvidenceStrength`: Strength of evidence that active beat objective was achieved (NONE, WEAK_IMPLICIT, CLEAR_EXPLICIT).
- `commitmentStrength`: Strength of protagonist commitment visible in the scene (NONE, TENTATIVE, EXPLICIT_REVERSIBLE, EXPLICIT_IRREVERSIBLE).
- `structuralPositionSignal`: Narrative position relative to beat boundaries (WITHIN_ACTIVE_BEAT, BRIDGING_TO_NEXT_BEAT, CLEARLY_IN_NEXT_BEAT).
- `entryConditionReadiness`: Readiness of next beat's entry condition (NOT_READY, PARTIAL, READY).
- `objectiveAnchors`: 1-3 distinct verifiable conditions extracted from the active beat objective. Each anchor represents one thing protagonist must accomplish.
- `anchorEvidence`: Corresponding evidence for each anchor mapped from narrative and active state.
- `completionGateSatisfied`: Boolean flag indicating whether completion gate requirements are met. `beatConcluded` is AND-ed with this flag.
- `completionGateFailureReason`: Explanation of why gate failed, if applicable.
- `deviationDetected`: True when future beats are now impossible or nonsensical due to narrative direction change.
- `deviationReason`: Explanation of deviation; empty when no deviation detected.
- `invalidatedBeatIds`: Beat IDs (format: X.Y) that were invalidated by deviation. Empty when no deviation.
- `spineDeviationDetected`: True ONLY when a spine element has been IRREVERSIBLY invalidated. Extremely rare — most narrative changes are beat-level deviations, not spine-level. This is distinct from beat-level `deviationDetected`, forming a two-tier deviation system.
- `spineDeviationReason`: Explanation of which spine element was invalidated and why; empty when no spine deviation.
- `spineInvalidatedElement`: Which spine element was invalidated: `"dramatic_question"` (CDQ definitively answered), `"antagonistic_force"` (permanently eliminated), `"need_want"` (need-want tension fully resolved prematurely), or `null`.
- `alignedBeatId`: When `structuralPositionSignal` is not WITHIN_ACTIVE_BEAT, identifies which pending beat (by ID, e.g., "1.4" or "2.1") the narrative aligns with. Null when WITHIN_ACTIVE_BEAT or no clear alignment.
- `beatAlignmentConfidence`: Confidence in `alignedBeatId` (LOW, MEDIUM, HIGH). Only HIGH confidence triggers mechanical beat skipping in the engine.
- `beatAlignmentReason`: One sentence explaining alignment judgment. Empty when `alignedBeatId` is null.
- `pacingIssueDetected`: True when beat is stalling beyond expected page count or story has passed midpoint without meaningful turning-point beat conclusion.
- `pacingIssueReason`: Explanation of pacing problem; empty when no issue detected.
- `recommendedAction`: Engine response to pacing issue. "none" if no issue. "nudge" to inject directive into next continuation prompt. "rewrite" to trigger structure rewrite pulling turning points closer.
- `pacingDirective`: Holistic 1-3 sentence natural-language pacing briefing for the page planner. Synthesizes all scene signals into actionable instruction. Addresses rhythm (breathe or accelerate?), structural position (how close to beat conclusion?), and what narrative movement next page should deliver. Written as if briefing a writer, not classifying signals.
- `narrativeSummary`: Short summary of current narrative state. Always populated — used for planner context compression and rewrite context.
