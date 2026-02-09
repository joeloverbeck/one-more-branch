# Prompt 5: Beat Conclusion and Deviation Analysis

## Purpose

Evaluates a generated narrative passage against the planned story structure to determine:
1. Whether the current story beat has been **concluded** (objective achieved)
2. Whether the narrative has **deviated** from the planned beats (future beats invalidated)
3. Whether there is a **pacing issue** (beat stalling or missing midpoint)

This is a pure analytical prompt -- it does NOT write narrative or make creative decisions. It runs **after** the writer prompt generates a page, evaluating that page's impact on story structure.

## When It Fires

Called after every continuation page generation when structured stories are enabled. The writer generates the narrative first, then the analyst evaluates it.

---

## System Prompt

```
You are a story structure analyst for interactive fiction. Your role is to evaluate a narrative passage against a planned story structure and determine:
1. Whether the current story beat has been concluded
2. Whether the narrative has deviated from the planned beats

You analyze ONLY structure progression and deviation. You do NOT write narrative or make creative decisions.

Be analytical and precise. Evaluate cumulative progress, not just single scenes.
Be conservative about deviation - minor variations are acceptable. Only mark true deviation when future beats are genuinely invalidated.
```

---

## User Prompt

The user message is composed entirely from the `buildAnalystStructureEvaluation()` function output plus the narrative to evaluate. There are no few-shot examples for the analyst.

### Composed Sections

#### 1. Story Structure Overview

```
=== STORY STRUCTURE ===
Overall Theme: {overallTheme}
Premise: {premise}

CURRENT ACT: {actName} (Act {N} of 3)
Objective: {actObjective}
Stakes: {actStakes}

BEATS IN THIS ACT:
  [x] CONCLUDED (role): description
    Resolution: how it was resolved
  [>] ACTIVE (role): description
    Objective: what the protagonist should achieve
  [ ] PENDING (role): description

REMAINING ACTS:
  - Act N: Name - Objective
```

#### 2. Active State Summary (for beat evaluation context)

```
CURRENT STATE (for beat evaluation):
- Location: {currentLocation}
- Active threats: THREAT_A, THREAT_B
- Constraints: CONSTRAINT_A
- Open threads: THREAD_A, THREAD_B
(Consider these when evaluating beat completion)
```

#### 3. Beat Evaluation Instructions

```
=== BEAT EVALUATION ===
Evaluate the following narrative against this structure to determine beat completion.

CONCLUDE THE BEAT (beatConcluded: true) when ANY of these apply:
1. The beat's objective has been substantively achieved (even if not perfectly)
2. The narrative has moved beyond this beat's scope into territory that matches a PENDING beat
3. Key events from later beats have already occurred (compare against PENDING beats below)
4. The current state shows the beat's goal has been reached

DO NOT CONCLUDE only if:
- This scene is still squarely within the active beat's scope AND
- The objective hasn't been meaningfully advanced

Evaluate cumulative progress across all scenes, not just this single page.
Look at the CURRENT STATE above - if the situation has moved past the active beat's description, it should be concluded.

If concluding, provide beatResolution: a brief summary of how the beat was resolved.
```

#### 4. Remaining Beats for Deviation Check

```
REMAINING BEATS TO EVALUATE FOR DEVIATION:
  - 1.3: Description of beat
  - 2.1: Description of beat
  - 2.2: Description of beat
```

#### 5. Progression Check Hint

When there are pending beats:
```
PROGRESSION CHECK: If the current narrative situation more closely matches a PENDING beat's description than the ACTIVE beat's description, the ACTIVE beat should be marked concluded.
```

#### 6. Deviation Detection Instructions

```
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
```

#### 7. Pacing Evaluation

```
=== PACING EVALUATION ===
Pages spent on current beat: {pagesInCurrentBeat}
Story pacing budget: {targetPagesMin}-{targetPagesMax} total pages
Total beats in structure: {totalBeats}
Average pages per beat (budget-based): ~{avgPagesPerBeat}

DETECT A PACING ISSUE (pacingIssueDetected: true) when EITHER applies:
1. BEAT STALL: pagesInCurrentBeat exceeds {maxPagesPerBeat} AND the beat objective has not been meaningfully advanced
2. MISSING MIDPOINT: The story has consumed more than 50% of its page budget without any turning_point beat being concluded

If pacingIssueDetected is true:
- pacingIssueReason: Explain what's stalling or missing
- recommendedAction:
  - "nudge" if a stronger directive in the next page could fix it
  - "rewrite" if the remaining structure needs to be pulled closer

If no pacing issue: pacingIssueDetected: false, pacingIssueReason: "", recommendedAction: "none"
```

#### 8. Narrative to Evaluate

```
NARRATIVE TO EVALUATE:
{the writer's generated narrative text}
```

---

## Expected JSON Output

### Schema Name: `analyst_evaluation`

Strict mode enabled (`additionalProperties: false`). All fields required.

```json
{
  "beatConcluded": "boolean - true if the active beat's objective was achieved or narrative moved beyond its scope",
  "beatResolution": "string - Brief description of how the beat was resolved. Required when beatConcluded is true. Empty string when false.",

  "deviationDetected": "boolean - true when remaining planned beats are invalidated by narrative direction",
  "deviationReason": "string - Concise explanation. Empty when no deviation.",
  "invalidatedBeatIds": ["string[] - Beat IDs invalidated (format: X.Y). Empty when no deviation."],
  "narrativeSummary": "string - Short summary of current state for rewrite context. Empty when no deviation.",

  "pacingIssueDetected": "boolean - true if beat is stalling or story passed midpoint without turning_point",
  "pacingIssueReason": "string - Explains the pacing problem. Empty when no issue.",
  "recommendedAction": "string - 'none' | 'nudge' | 'rewrite'"
}
```

### Field Details

| Field | Type | When Populated |
|---|---|---|
| `beatConcluded` | boolean | Always |
| `beatResolution` | string | Non-empty when `beatConcluded: true` |
| `deviationDetected` | boolean | Always |
| `deviationReason` | string | Non-empty when `deviationDetected: true` |
| `invalidatedBeatIds` | string[] | Non-empty when `deviationDetected: true` |
| `narrativeSummary` | string | Non-empty when `deviationDetected: true` |
| `pacingIssueDetected` | boolean | Always |
| `pacingIssueReason` | string | Non-empty when `pacingIssueDetected: true` |
| `recommendedAction` | enum | Always. `"none"` / `"nudge"` / `"rewrite"` |

### Recommended Action Values

- **`"none"`**: No pacing issue detected. Normal operation.
- **`"nudge"`**: A stronger directive should be injected into the next continuation prompt (e.g., "this scene must deliver a reveal"). The engine injects this as a `pacingNudge` in the writer's context.
- **`"rewrite"`**: The remaining story structure should be regenerated with turning points pulled closer. Triggers the structure rewrite prompt (Prompt 2).

### Pacing Calculations

- `avgPagesPerBeat` = `Math.round(targetPagesMax / totalBeats)`
- `maxPagesPerBeat` = `Math.ceil(targetPagesMax / totalBeats) + 2`
- Beat stall threshold: `pagesInCurrentBeat > maxPagesPerBeat`
- Midpoint check: >50% of page budget consumed without a `turning_point` beat concluded

---

## Downstream Effects

The analyst's output drives engine decisions:

| Analyst Output | Engine Action |
|---|---|
| `beatConcluded: true` | Advance to next beat (or next act). Record resolution. |
| `deviationDetected: true` | Trigger structure rewrite (Prompt 2) with deviation context. |
| `pacingIssueDetected: true, recommendedAction: "nudge"` | Inject `pacingNudge` into next continuation prompt. |
| `pacingIssueDetected: true, recommendedAction: "rewrite"` | Trigger structure rewrite to pull turning points closer. |

---

## Message Structure

```
[
  { role: "system", content: <analyst system prompt> },
  { role: "user",   content: <structure evaluation + narrative to evaluate> }
]
```

No few-shot examples are used for the analyst prompt.

---

## Source Files

- Prompt builder: `src/llm/prompts/analyst-prompt.ts`
- Structure evaluation builder: `src/llm/prompts/continuation/story-structure-section.ts` (`buildAnalystStructureEvaluation`, `DEVIATION_DETECTION_SECTION`)
- Active state summary: `src/llm/prompts/continuation/story-structure-section.ts` (`buildActiveStateForBeatEvaluation`)
- JSON schema: `src/llm/schemas/analyst-schema.ts`
- Types: `src/llm/types.ts` (`AnalystContext`, `AnalystResult`, `PacingRecommendedAction`)
- Story arc models: `src/models/story-arc.ts` (`StoryStructure`, `AccumulatedStructureState`, `DeviationResult`)
