# Prompt Report 4: Beat Analyst

## Purpose
Evaluate whether the current beat is concluded, detect structure deviation, and flag pacing issues.

## Source of Truth
- `src/llm/prompts/analyst-prompt.ts`
- `src/llm/prompts/continuation/story-structure-section.ts`
- `src/llm/schemas/analyst-schema.ts`
- `src/llm/analyst-generation.ts`

## Production Notes
- `response_format` uses `ANALYST_SCHEMA` (strict JSON schema).
- Analyst call uses `temperature: 0.3` and `max_tokens: 1024` defaults.

## Messages Sent To LLM (Production Template)

### Message 1 (`system`)
```text
You are a story structure analyst for interactive fiction. Your role is to evaluate a narrative passage against a planned story structure and determine:
1. Whether the current story beat has been concluded
2. Whether the narrative has deviated from the planned beats

You analyze ONLY structure progression and deviation. You do NOT write narrative or make creative decisions.

Use this strict sequence:
Step A: Classify scene signals using the provided enums.
Step B: Apply the completion gate against the active beat objective before deciding beatConcluded.

Before setting beatConcluded, extract 1-3 objective anchors from activeBeat.objective and map each anchor to concrete evidence.
Evidence is cumulative across the current narrative and active state.
If no anchor has explicit evidence, beatConcluded must be false.

Be analytical and precise. Evaluate cumulative progress, not just single scenes.
Be conservative about deviation - minor variations are acceptable. Only mark true deviation when future beats are genuinely invalidated.
```

### Message 2 (`user`)
```text
=== STORY STRUCTURE ===
Overall Theme: {{structure.overallTheme}}
Premise: {{structure.premise}}

CURRENT ACT: {{currentAct.name}} (Act {{currentActIndex+1}} of 3)
Objective: {{currentAct.objective}}
Stakes: {{currentAct.stakes}}

BEATS IN THIS ACT:
{{for each beat in currentAct.beats}}
{{if concluded}}  [x] CONCLUDED ({{beat.role}}): {{beat.description}}
    Resolution: {{resolutionOrDefault}}
{{if active}}  [>] ACTIVE ({{beat.role}}): {{beat.description}}
    Objective: {{beat.objective}}
{{if pending}}  [ ] PENDING ({{beat.role}}): {{beat.description}}
{{/for}}

REMAINING ACTS:
{{if any}}  - Act {{n}}: {{act.name}} - {{act.objective}}{{/if}}
{{if none}}  - None{{/if}}

{{#if active state has any values}}
CURRENT STATE (for beat evaluation):
- Location: {{currentLocation}}
- Active threats: {{thId1}}, {{thId2}}
- Constraints: {{cnId1}}, {{cnId2}}
- Open threads: {{tdId1}}, {{tdId2}}
(Consider these when evaluating beat completion)

{{/if}}
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

{{#if has pending beats}}
PROGRESSION CHECK: Compare the narrative against PENDING beat descriptions when classifying structuralPositionSignal. If the narrative is truly in next-beat territory, use CLEARLY_IN_NEXT_BEAT and apply the completion gate.
{{/if}}

=== BEAT DEVIATION EVALUATION ===
After evaluating beat completion, also evaluate whether the story has DEVIATED from remaining beats.

A deviation occurs when future beats are now impossible or nonsensical because:
- Story direction fundamentally changed
- Core assumptions of upcoming beats are invalid
- Required story elements/goals no longer exist

Evaluate ONLY beats that are not concluded. Never re-evaluate concluded beats.

If deviation is detected, mark:
- deviationDetected: true
- deviationReason: concise reason
- invalidatedBeatIds: invalid beat IDs only
- narrativeSummary: 1-2 sentence current-state summary for rewrite context

If no deviation is detected, mark deviationDetected: false.
Be conservative. Minor variations are acceptable; only mark true deviation for genuine invalidation.

REMAINING BEATS TO EVALUATE FOR DEVIATION:
- {{beatId1}}: {{beatDescription1}}
- {{beatId2}}: {{beatDescription2}}
{{...}}

=== PACING EVALUATION ===
Pages spent on current beat: {{pagesInCurrentBeat}}
Story pacing budget: {{targetPagesMin}}-{{targetPagesMax}} total pages
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

NARRATIVE TO EVALUATE:
{{narrative}}
```

## Expected Structured Output (`response_format`)
```json
{
  "beatConcluded": false,
  "beatResolution": "string",
  "deviationDetected": false,
  "deviationReason": "",
  "invalidatedBeatIds": [],
  "narrativeSummary": "",
  "pacingIssueDetected": false,
  "pacingIssueReason": "",
  "recommendedAction": "none",
  "sceneMomentum": "INCREMENTAL_PROGRESS",
  "objectiveEvidenceStrength": "WEAK_IMPLICIT",
  "commitmentStrength": "TENTATIVE",
  "structuralPositionSignal": "WITHIN_ACTIVE_BEAT",
  "entryConditionReadiness": "PARTIAL",
  "objectiveAnchors": ["string"],
  "anchorEvidence": ["string"],
  "completionGateSatisfied": false,
  "completionGateFailureReason": "string"
}
```

### Schema Constraints
- `recommendedAction` enum: `none | nudge | rewrite`.
- Scene-signal enums are strict (`sceneMomentum`, `objectiveEvidenceStrength`, `commitmentStrength`, `structuralPositionSignal`, `entryConditionReadiness`).
- All keys above are required.
- `additionalProperties: false`.
