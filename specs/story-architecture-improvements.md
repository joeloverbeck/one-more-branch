# Story Architecture Improvements

**Status**: PENDING
**Created**: 2026-02-09
**Branch**: feature/story-architecture-improvements

## Problem Statement

The current system generates story structures with minimal dramatic function guidance. Beats only have `description` and `objective` -- there's no awareness of dramatic roles (is this a setup beat or a crisis?), no pacing detection (a beat could stall for 20 pages unnoticed), and no mechanism to nudge the narrative when it loses momentum.

This leads to:
- Flat sequences of "stuff happens" beats even when tension nominally rises
- No structural awareness of midpoint reveals, points of no return, or crisis moments
- No early warning when pacing drifts (a single beat consuming half the story's pages)
- No corrective action when the narrative stalls

## Scope

### What This Spec Covers (8 Improvements)

1. Beat `role` field on `StoryBeat`
2. `premise` field on `StoryStructure`
3. `pacingBudget` field on `StoryStructure`
4. `pagesInCurrentBeat` counter on `AccumulatedStructureState`
5. Analyst pacing detection fields
6. Analyst prompt pacing instructions
7. Runtime pacing response in page-service
8. Structure prompt dramatic function guidance + writer/continuation prompt enhancements

### What This Spec Rejects

| Rejected Proposal | Reason |
|---|---|
| `protagonistArc` (want/need/lie/wound) | Railroads player agency -- forces a single character arc when branching fiction should allow the player to define their own transformation |
| `choiceMeta` (intent/cost/expectedBeatImpact per choice) | Unreliable self-classification by the LLM with no consumer -- nothing in the pipeline reads these fields to make decisions |
| `sceneTurning` (valueShift/newInformation/pressureEscalation) | Per-page metadata that doesn't improve the generated narrative -- it's bookkeeping for its own sake |
| `turningPoints` mapping (incitingIncidentBeatId, midpointBeatId, etc.) | Fragile cross-references between beat IDs and structural moments -- breaks on rewrite, adds complexity with no consumer |
| `structureMode` (three_act/five_act/story_circle) | YAGNI -- we only use three-act structure and have no plans to support alternatives |
| `valueShift` on beats | Linear-narrative concept incompatible with branching -- a beat's emotional trajectory depends on *which* branch the player took |
| `failureModes` on beats | Literal railroading -- "if player refuses, story does X" contradicts the core design principle of player agency |

## Implementation Phases

---

## Phase 1: Data Model Enrichment (Foundation)

All Phase 1 changes are data model additions. No prompt or runtime logic changes.

### 1.1 Add `role` to `StoryBeat`

**File**: `src/models/story-arc.ts`

Add a `BeatRole` type and a `role` field to `StoryBeat`:

```typescript
export type BeatRole = 'setup' | 'escalation' | 'turning_point' | 'resolution';

export interface StoryBeat {
  readonly id: string;
  readonly description: string;
  readonly objective: string;
  readonly role: BeatRole;
}
```

**Design rationale**: Four roles are sufficient to communicate dramatic function without over-constraining the LLM. The roles map naturally to three-act structure:
- `setup` -- establishing situations, characters, stakes (early Act 1 beats)
- `escalation` -- raising tension, complicating circumstances (mid-act beats)
- `turning_point` -- irreversible change, reveal, or reversal (act breaks, midpoint)
- `resolution` -- resolving threads, consequences, denouement (Act 3 beats)

A beat's role is descriptive guidance, not a constraint. The writer doesn't change behavior based on `role` -- it simply has more context about *why* this beat exists in the structure.

### 1.2 Add `premise` to `StoryStructure`

**File**: `src/models/story-arc.ts`

```typescript
export interface StoryStructure {
  readonly acts: readonly StoryAct[];
  readonly overallTheme: string;
  readonly premise: string;
  readonly generatedAt: Date;
}
```

**What `premise` is**: A 1-2 sentence hook that captures the core dramatic question of the story. Example: *"A disgraced guard must choose between exposing the tribunal's crimes and protecting the people who framed her."*

**Why it's separate from `overallTheme`**: `overallTheme` is abstract ("redemption through sacrifice"). `premise` is concrete and actionable -- it tells the LLM what the story is *about* at a plot level.

### 1.3 Add `pacingBudget` to `StoryStructure`

**File**: `src/models/story-arc.ts`

```typescript
export interface PacingBudget {
  readonly targetPagesMin: number;
  readonly targetPagesMax: number;
}

export interface StoryStructure {
  readonly acts: readonly StoryAct[];
  readonly overallTheme: string;
  readonly premise: string;
  readonly pacingBudget: PacingBudget;
  readonly generatedAt: Date;
}
```

**Purpose**: Gives the analyst a reference frame for pacing detection. Without a budget, the analyst can't know whether 15 pages on one beat is normal (in a 50-page story) or a red flag (in a 20-page story).

**Constraints**:
- `targetPagesMin` must be >= 10
- `targetPagesMax` must be <= 80
- `targetPagesMin` must be <= `targetPagesMax`

The structure prompt already says "15-50 page interactive story" -- `pacingBudget` makes this explicit and per-story.

### 1.4 Add `pagesInCurrentBeat` to `AccumulatedStructureState`

**File**: `src/models/story-arc.ts`

```typescript
export interface AccumulatedStructureState {
  readonly currentActIndex: number;
  readonly currentBeatIndex: number;
  readonly beatProgressions: readonly BeatProgression[];
  readonly pagesInCurrentBeat: number;
}
```

**File**: `src/models/story-arc.ts` -- update `createEmptyAccumulatedStructureState`:

```typescript
export function createEmptyAccumulatedStructureState(): AccumulatedStructureState {
  return {
    currentActIndex: 0,
    currentBeatIndex: 0,
    beatProgressions: [],
    pagesInCurrentBeat: 0,
  };
}
```

**Behavior**:
- Starts at 0 when a beat becomes active
- Increments by 1 every page that does NOT conclude the beat
- Resets to 0 when a beat is concluded (and the next beat becomes active)

This counter is the primary input for pacing detection in Phase 2.

### 1.5 Schema Changes for Phase 1

**File**: `src/llm/schemas/structure-schema.ts`

Add `premise`, `pacingBudget`, and beat `role` to the JSON schema:

```typescript
export const STRUCTURE_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'story_structure_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['overallTheme', 'premise', 'pacingBudget', 'acts'],
      properties: {
        overallTheme: { type: 'string' },
        premise: {
          type: 'string',
          description: '1-2 sentence story hook capturing the core dramatic question.',
        },
        pacingBudget: {
          type: 'object',
          additionalProperties: false,
          required: ['targetPagesMin', 'targetPagesMax'],
          properties: {
            targetPagesMin: {
              type: 'number',
              description: 'Minimum target page count for the full story (10-80).',
            },
            targetPagesMax: {
              type: 'number',
              description: 'Maximum target page count for the full story (10-80).',
            },
          },
        },
        acts: {
          type: 'array',
          description: 'Exactly 3 acts following setup, confrontation, and resolution.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'objective', 'stakes', 'entryCondition', 'beats'],
            properties: {
              name: { type: 'string' },
              objective: { type: 'string' },
              stakes: { type: 'string' },
              entryCondition: { type: 'string' },
              beats: {
                type: 'array',
                description: '2-4 beats per act that function as flexible milestones.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['description', 'objective', 'role'],
                  properties: {
                    description: { type: 'string' },
                    objective: { type: 'string' },
                    role: {
                      type: 'string',
                      enum: ['setup', 'escalation', 'turning_point', 'resolution'],
                      description: 'Dramatic function of this beat in the story structure.',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
```

### 1.6 Parser Changes for Phase 1

**File**: `src/llm/structure-generator.ts`

Update `StructureGenerationResult` and `parseStructureResponse`:

```typescript
export interface StructureGenerationResult {
  overallTheme: string;
  premise: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      description: string;
      objective: string;
      role: string;
    }>;
  }>;
  rawResponse: string;
}
```

In `parseStructureResponse`, add:

1. Validate `data['premise']` is a non-empty string (throw `STRUCTURE_PARSE_ERROR` if missing)
2. Validate `data['pacingBudget']` is an object with numeric `targetPagesMin` and `targetPagesMax`
3. Validate each beat has a `role` field that is one of the four valid values
4. Include `role` in the returned beat objects

**Fallback behavior**: If `premise` is missing, default to `overallTheme` value. If `pacingBudget` is missing, default to `{ targetPagesMin: 15, targetPagesMax: 50 }`. If beat `role` is missing, default to `'escalation'`.

### 1.7 Structure State Tracking

**File**: `src/engine/structure-state.ts`

Update `createInitialStructureState` to initialize `pagesInCurrentBeat: 0`.

Update `advanceStructureState` to reset `pagesInCurrentBeat: 0` in the returned state (since a new beat is becoming active).

Update `applyStructureProgression`:
- If `beatConcluded` is false, return state with `pagesInCurrentBeat: parentState.pagesInCurrentBeat + 1`
- If `beatConcluded` is true, the call to `advanceStructureState` already resets to 0

```typescript
export function applyStructureProgression(
  structure: StoryStructure,
  parentState: AccumulatedStructureState,
  beatConcluded: boolean,
  beatResolution: string,
): AccumulatedStructureState {
  if (!beatConcluded) {
    return {
      ...parentState,
      pagesInCurrentBeat: parentState.pagesInCurrentBeat + 1,
    };
  }

  const result = advanceStructureState(structure, parentState, beatResolution);
  return result.updatedState;
}
```

### 1.8 Structure Rewrite Support

**File**: `src/engine/structure-rewrite-support.ts`

Update `extractCompletedBeats` to include `role` in `CompletedBeat`:

**File**: `src/llm/types.ts`

```typescript
export interface CompletedBeat {
  readonly actIndex: number;
  readonly beatIndex: number;
  readonly beatId: string;
  readonly description: string;
  readonly objective: string;
  readonly role: string;
  readonly resolution: string;
}
```

In `extractCompletedBeats`, add `role: beat.role` to the pushed object.

### 1.9 Few-Shot Examples

Update the few-shot assistant response in `structure-prompt.ts` and `structure-rewrite-prompt.ts` to include `premise`, `pacingBudget`, and beat `role` fields.

Example structure few-shot update (abbreviated):

```json
{
  "overallTheme": "Redeem a stained name by exposing the city tribunal's crimes",
  "premise": "A disgraced guard must infiltrate the tribunal that framed her to uncover proof of their corruption before they execute her as a scapegoat.",
  "pacingBudget": { "targetPagesMin": 20, "targetPagesMax": 40 },
  "acts": [
    {
      "name": "Ashes of Trust",
      "objective": "Force the protagonist into a dangerous comeback",
      "stakes": "Failure means execution as a convenient scapegoat",
      "entryCondition": "The protagonist is blamed for a public murder",
      "beats": [
        {
          "description": "A former ally offers proof of a frame-up in exchange for protection",
          "objective": "Decide whether to trust an ally tied to the tribunal",
          "role": "setup"
        },
        {
          "description": "The protagonist steals sealed court ledgers from a guarded archive",
          "objective": "Secure evidence before the tribunal can destroy it",
          "role": "turning_point"
        }
      ]
    }
  ]
}
```

---

## Phase 2: Analyst Pacing Detection (Core Feature)

Phase 2 extends the analyst to detect pacing issues and introduces runtime response logic.

### 2.1 Analyst Type Extensions

**File**: `src/llm/types.ts`

Extend `AnalystResult`:

```typescript
export type PacingRecommendedAction = 'none' | 'nudge' | 'rewrite';

export interface AnalystResult {
  beatConcluded: boolean;
  beatResolution: string;
  deviationDetected: boolean;
  deviationReason: string;
  invalidatedBeatIds: string[];
  narrativeSummary: string;
  pacingIssueDetected: boolean;
  pacingIssueReason: string;
  recommendedAction: PacingRecommendedAction;
  rawResponse: string;
}
```

Extend `AnalystContext`:

```typescript
export interface AnalystContext {
  narrative: string;
  structure: StoryStructure;
  accumulatedStructureState: AccumulatedStructureState;
  activeState: ActiveState;
}
```

Note: `pagesInCurrentBeat` is already available through `accumulatedStructureState.pagesInCurrentBeat` -- no need for a separate field on `AnalystContext`.

### 2.2 Analyst Schema Extension

**File**: `src/llm/schemas/analyst-schema.ts`

Add three new fields to the JSON schema:

```typescript
pacingIssueDetected: {
  type: 'boolean',
  description:
    'True if the narrative shows pacing problems: a beat stalling beyond expected page count, or the story passing through its midpoint without a meaningful reveal or reversal.',
},
pacingIssueReason: {
  type: 'string',
  description:
    'If pacingIssueDetected is true, explains the pacing problem. Empty when no issue.',
},
recommendedAction: {
  type: 'string',
  enum: ['none', 'nudge', 'rewrite'],
  description:
    'Recommended response to pacing issue. "none" if no issue. "nudge" to inject a directive into the next continuation prompt. "rewrite" to trigger a structure rewrite pulling turning points closer.',
},
```

Add `'pacingIssueDetected'`, `'pacingIssueReason'`, `'recommendedAction'` to the `required` array.

### 2.3 Analyst Validation Schema Extension

**File**: `src/llm/schemas/analyst-validation-schema.ts`

```typescript
export const AnalystResultSchema = z.object({
  beatConcluded: z.boolean().default(false),
  beatResolution: z.string().default(''),
  deviationDetected: z.boolean().default(false),
  deviationReason: z.string().default(''),
  invalidatedBeatIds: z.array(z.string()).optional().default([]),
  narrativeSummary: z.string().default(''),
  pacingIssueDetected: z.boolean().default(false),
  pacingIssueReason: z.string().default(''),
  recommendedAction: z.enum(['none', 'nudge', 'rewrite']).default('none'),
});
```

### 2.4 Analyst Response Transformer Extension

**File**: `src/llm/schemas/analyst-response-transformer.ts`

Add the three new fields to the returned `AnalystResult`:

```typescript
return {
  beatConcluded: validated.beatConcluded,
  beatResolution: validated.beatResolution.trim(),
  deviationDetected: validated.deviationDetected,
  deviationReason: validated.deviationReason.trim(),
  invalidatedBeatIds: validated.invalidatedBeatIds
    .map((id: string) => id.trim())
    .filter((id: string) => BEAT_ID_PATTERN.test(id)),
  narrativeSummary: validated.narrativeSummary.trim(),
  pacingIssueDetected: validated.pacingIssueDetected,
  pacingIssueReason: validated.pacingIssueReason.trim(),
  recommendedAction: validated.recommendedAction,
  rawResponse,
};
```

### 2.5 Analyst Prompt Pacing Instructions

**File**: `src/llm/prompts/continuation/story-structure-section.ts`

In `buildAnalystStructureEvaluation`, inject `pagesInCurrentBeat` and pacing budget context:

After the existing `=== BEAT EVALUATION ===` section and before `DEVIATION_DETECTION_SECTION`, add a new pacing evaluation section:

```
=== PACING EVALUATION ===
Pages spent on current beat: ${state.pagesInCurrentBeat}
Story pacing budget: ${structure.pacingBudget.targetPagesMin}-${structure.pacingBudget.targetPagesMax} total pages
Total beats in structure: ${totalBeats}
Average pages per beat (budget-based): ~${avgPagesPerBeat}

DETECT A PACING ISSUE (pacingIssueDetected: true) when EITHER applies:
1. BEAT STALL: pagesInCurrentBeat exceeds ${maxPagesPerBeat} (roughly targetPagesMax / totalBeats, rounded up) AND the beat objective has not been meaningfully advanced
2. MISSING MIDPOINT: The story has consumed more than 50% of its page budget (estimated from beat progression and pagesInCurrentBeat) without any turning_point beat being concluded

If pacingIssueDetected is true:
- pacingIssueReason: Explain what's stalling or missing
- recommendedAction:
  - "nudge" if a stronger directive in the next page could fix it (e.g., "this scene must deliver a reveal")
  - "rewrite" if the remaining structure needs to be pulled closer (e.g., turning points are too far away)

If no pacing issue: pacingIssueDetected: false, pacingIssueReason: "", recommendedAction: "none"
```

The values `totalBeats`, `avgPagesPerBeat`, and `maxPagesPerBeat` are computed in the function:

```typescript
const totalBeats = structure.acts.reduce((sum, act) => sum + act.beats.length, 0);
const avgPagesPerBeat = Math.round(structure.pacingBudget.targetPagesMax / totalBeats);
const maxPagesPerBeat = Math.ceil(structure.pacingBudget.targetPagesMax / totalBeats) + 2;
```

The `+2` buffer prevents false positives on early beats that naturally need more setup.

### 2.6 Result Merger Extension

**File**: `src/llm/result-merger.ts`

Pass through pacing fields from analyst:

```typescript
export function mergeWriterAndAnalystResults(
  writer: WriterResult,
  analyst: AnalystResult | null,
): ContinuationGenerationResult {
  // ... existing deviation logic ...

  return {
    ...writer,
    beatConcluded,
    beatResolution,
    deviation,
    pacingIssueDetected: analyst?.pacingIssueDetected ?? false,
    pacingIssueReason: analyst?.pacingIssueReason ?? '',
    recommendedAction: analyst?.recommendedAction ?? 'none',
    rawResponse: writer.rawResponse,
  };
}
```

Update `ContinuationGenerationResult` in `types.ts`:

```typescript
export interface ContinuationGenerationResult extends GenerationResult {
  readonly deviation: DeviationResult;
  readonly pacingIssueDetected: boolean;
  readonly pacingIssueReason: string;
  readonly recommendedAction: PacingRecommendedAction;
}
```

### 2.7 Runtime Pacing Response

**File**: `src/engine/page-service.ts`

After the existing deviation handling block in `generateNextPage`, add pacing response logic:

```typescript
// Handle pacing issue (only when no deviation was triggered)
if (
  !deviationInfo &&
  result.pacingIssueDetected &&
  result.recommendedAction === 'rewrite' &&
  activeStructure &&
  parentState.structureState
) {
  // Log warning for observability
  logger.warn('Pacing issue detected, recommended action: rewrite', {
    reason: result.pacingIssueReason,
    pagesInCurrentBeat: parentState.structureState.pagesInCurrentBeat,
  });
  // NOTE: Structure rewrite for pacing is deferred to a future iteration.
  // For now, pacing rewrite is logged but not acted upon.
  // When implemented, this would trigger handleDeviation with a synthetic
  // deviation reason derived from pacingIssueReason.
}

if (
  !deviationInfo &&
  result.pacingIssueDetected &&
  result.recommendedAction === 'nudge'
) {
  logger.info('Pacing nudge recommended', {
    reason: result.pacingIssueReason,
    pagesInCurrentBeat: parentState.structureState?.pagesInCurrentBeat,
  });
  // The nudge is applied in the NEXT page generation via Phase 3 prompt changes.
  // The pacing fields are persisted on the page for the next generation cycle to read.
}
```

**Important**: The `recommendedAction: 'rewrite'` path does NOT trigger an immediate structure rewrite in this phase. That would require the analyst to also produce `invalidatedBeatIds` and `narrativeSummary` for the rewrite context, which conflates two different evaluation modes. Instead, pacing-triggered rewrites are logged and deferred. The `nudge` path is the primary corrective mechanism, implemented in Phase 3.

### 2.8 Page Model Extension

The pacing fields from the analyst need to be accessible for the next page's generation. Two options:

**Option A (recommended)**: Store pacing state on `AccumulatedStructureState` by adding an optional `pacingNudge` field:

```typescript
export interface AccumulatedStructureState {
  readonly currentActIndex: number;
  readonly currentBeatIndex: number;
  readonly beatProgressions: readonly BeatProgression[];
  readonly pagesInCurrentBeat: number;
  readonly pacingNudge: string | null;
}
```

When `recommendedAction === 'nudge'`, set `pacingNudge` to `pacingIssueReason`. Otherwise `null`. The continuation prompt reads this field (Phase 3).

**Option B**: Store on the `Page` model as a new field. This is less clean because it puts prompt-generation concerns on a persistence model.

**Decision**: Option A. The nudge is structure state -- it's about where the story *is* relative to where it should be.

---

## Phase 3: Prompt Quality Improvements

Phase 3 enhances prompts to leverage the new data model fields and pacing detection.

### 3.1 Structure Prompt Dramatic Function Guidance

**File**: `src/llm/prompts/structure-prompt.ts`

Add dramatic function requirements to the `REQUIREMENTS` section of the user prompt:

```
8. Design beats with clear dramatic roles:
   - At least one beat in Act 1 should be a "turning_point" representing a point of no return
   - The midpoint of the story (typically late Act 1 or mid Act 2) should include a reveal or reversal that reframes prior events
   - Act 3 should include a "turning_point" beat representing a crisis -- an impossible choice or sacrifice
   - Use "setup" for establishing beats, "escalation" for rising tension, "turning_point" for irreversible changes, "resolution" for denouement
9. Write a premise: a 1-2 sentence hook capturing the core dramatic question the story explores.
10. Set a pacing budget (targetPagesMin and targetPagesMax) appropriate for the story's scope.
```

Update the `OUTPUT SHAPE` section:

```
OUTPUT SHAPE:
- overallTheme: string
- premise: string (1-2 sentence story hook)
- pacingBudget: { targetPagesMin: number, targetPagesMax: number }
- acts: exactly 3 items
- each act has:
  - name: evocative act title
  - objective: main goal for the act
  - stakes: consequence of failure
  - entryCondition: what triggers transition into this act
  - beats: 2-4 items
    - each beat has:
      - description: what should happen in this beat
      - objective: specific protagonist goal for the beat
      - role: "setup" | "escalation" | "turning_point" | "resolution"
```

### 3.2 Structure Rewrite Prompt Update

**File**: `src/llm/prompts/structure-rewrite-prompt.ts`

Update `formatCompletedBeats` to include role:

```typescript
function formatCompletedBeats(completedBeats: StructureRewriteContext['completedBeats']): string {
  if (completedBeats.length === 0) {
    return '  - None (story is at the beginning)';
  }

  return completedBeats
    .map(
      beat => `  - Act ${beat.actIndex + 1}, Beat ${beat.beatIndex + 1} (${beat.beatId}) [${beat.role}]: "${beat.description}"
    Objective: ${beat.objective}
    Resolution: ${beat.resolution}`,
    )
    .join('\n');
}
```

Add `premise`, `pacingBudget`, and `role` to the OUTPUT SHAPE section (matching structure-prompt.ts).

Add requirement: "Preserve beat roles from completed beats. New beats must include appropriate roles."

Update the rewrite few-shot examples to include `premise`, `pacingBudget`, and beat `role`.

### 3.3 Writer Context Enhancement

**File**: `src/llm/prompts/continuation/story-structure-section.ts`

In `buildWriterStructureContext`, show beat role alongside beat status:

Update the beat line formatting to include role:

```typescript
if (progression?.status === 'active') {
  return `  [>] ACTIVE (${beat.role}): ${beat.description}
    Objective: ${beat.objective}`;
}
return `  [ ] PENDING (${beat.role}): ${beat.description}`;
```

This gives the writer awareness of the dramatic function of the current beat without adding any new instructions. The writer naturally writes differently when it sees "ACTIVE (turning_point)" vs "ACTIVE (setup)".

Also add the premise to the writer structure context:

```typescript
return `=== STORY STRUCTURE ===
Overall Theme: ${structure.overallTheme}
Premise: ${structure.premise}

CURRENT ACT: ${currentAct.name} (Act ${state.currentActIndex + 1} of 3)
...
```

### 3.4 Analyst Structure Evaluation Enhancement

**File**: `src/llm/prompts/continuation/story-structure-section.ts`

In `buildAnalystStructureEvaluation`, also show beat roles in the beat lines (same format as writer context). This helps the analyst evaluate whether a `turning_point` beat was actually resolved with a meaningful turning point.

### 3.5 Pacing Nudge Injection

**File**: `src/llm/prompts/continuation-prompt.ts`

Add support for pacing nudge injection in `buildContinuationPrompt`:

```typescript
export function buildContinuationPrompt(
  context: ContinuationContext,
  options?: PromptOptions,
): ChatMessage[] {
  // ... existing sections ...

  // Pacing nudge injection (from analyst's previous evaluation)
  const pacingNudgeSection = context.accumulatedStructureState?.pacingNudge
    ? `=== PACING DIRECTIVE ===
The story analyst detected a pacing issue: ${context.accumulatedStructureState.pacingNudge}
This page MUST advance the narrative toward resolving the current beat or deliver a meaningful story event.
Do not repeat setup or exposition -- push the story forward with action, revelation, or irreversible change.

`
    : '';

  const userPrompt = `Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}TONE/GENRE: ${context.tone}

${structureSection}${pacingNudgeSection}${canonSection}...`;
```

The nudge is injected between the structure section and the canon section, so the writer sees it as a priority directive while still having full context.

### 3.6 ContinuationContext Extension

**File**: `src/llm/types.ts`

No additional fields needed on `ContinuationContext` -- the `pacingNudge` is already available through `accumulatedStructureState.pacingNudge`.

---

## Files Modified (Summary)

| File | Phase | Changes |
|---|---|---|
| `src/models/story-arc.ts` | 1 | Add `BeatRole`, `PacingBudget`, `StoryBeat.role`, `StoryStructure.premise`, `StoryStructure.pacingBudget`, `AccumulatedStructureState.pagesInCurrentBeat`, `AccumulatedStructureState.pacingNudge` |
| `src/llm/schemas/structure-schema.ts` | 1 | Add `premise`, `pacingBudget`, beat `role` to JSON schema |
| `src/llm/structure-generator.ts` | 1 | Parse `premise`, `pacingBudget`, beat `role`; update `StructureGenerationResult` |
| `src/engine/structure-state.ts` | 1 | Track `pagesInCurrentBeat` (increment/reset); initialize `pacingNudge` |
| `src/engine/structure-rewrite-support.ts` | 1 | Include `role` in `CompletedBeat` extraction |
| `src/llm/types.ts` | 1+2 | Add `role` to `CompletedBeat`; add `PacingRecommendedAction`; extend `AnalystResult`, `ContinuationGenerationResult` |
| `src/llm/schemas/analyst-schema.ts` | 2 | Add `pacingIssueDetected`, `pacingIssueReason`, `recommendedAction` |
| `src/llm/schemas/analyst-validation-schema.ts` | 2 | Add pacing fields to Zod schema |
| `src/llm/schemas/analyst-response-transformer.ts` | 2 | Pass through pacing fields |
| `src/llm/result-merger.ts` | 2 | Pass through pacing fields |
| `src/engine/page-service.ts` | 2 | Add pacing response logic (log + nudge propagation) |
| `src/llm/prompts/structure-prompt.ts` | 3 | Add dramatic function requirements, update OUTPUT SHAPE, update few-shot |
| `src/llm/prompts/structure-rewrite-prompt.ts` | 3 | Include role in completed beats, update OUTPUT SHAPE, update few-shot |
| `src/llm/prompts/continuation/story-structure-section.ts` | 3 | Show beat role in writer context and analyst context; add premise; inject pacing evaluation section |
| `src/llm/prompts/continuation-prompt.ts` | 3 | Add pacing nudge injection |

---

## Invariants

These invariants must hold after implementation:

1. **Page immutability**: Generated pages never change after creation
2. **No retcons**: Established canon, inventory, health, active state are never contradicted
3. **Branch isolation**: `pagesInCurrentBeat` and `pacingNudge` are per-branch (inherited from parent state, not global)
4. **Structure rewrite preservation**: Rewritten structures include completed beats with unchanged descriptions, objectives, and roles
5. **Ending consistency**: `isEnding === true` iff `choices.length === 0`
6. **Beat role consistency**: Every beat in a generated or rewritten structure has a valid `role`
7. **Pacing budget validity**: `targetPagesMin <= targetPagesMax`, both within 10-80 range
8. **Backward-incompatible by design**: No migration support for existing stories -- this is a breaking change

---

## Testing Requirements

### Unit Tests

**Beat role serialization**:
- `StoryBeat` with `role` field serializes/deserializes correctly
- Invalid `role` values are rejected by the structure parser

**`pagesInCurrentBeat` counter**:
- Starts at 0 in initial structure state
- Increments by 1 when `applyStructureProgression` is called with `beatConcluded: false`
- Resets to 0 when `applyStructureProgression` is called with `beatConcluded: true`
- Counter is per-branch (child inherits from parent, sibling branches independent)

**Analyst pacing detection parsing**:
- `validateAnalystResponse` correctly parses `pacingIssueDetected`, `pacingIssueReason`, `recommendedAction`
- Missing pacing fields default to `false`/`''`/`'none'`
- Invalid `recommendedAction` values default to `'none'`

**Pacing nudge injection**:
- When `pacingNudge` is non-null on `AccumulatedStructureState`, `buildContinuationPrompt` includes the `=== PACING DIRECTIVE ===` section
- When `pacingNudge` is null, no pacing section is included

**Structure rewrite preserves roles**:
- `extractCompletedBeats` includes `role` in output
- `formatCompletedBeats` includes `[role]` in formatted string
- `validatePreservedBeats` checks that preserved beats retain their role

**Structure parser new fields**:
- `parseStructureResponse` extracts `premise` (falls back to `overallTheme` if missing)
- `parseStructureResponse` extracts `pacingBudget` (falls back to defaults if missing)
- `parseStructureResponse` extracts beat `role` (falls back to `'escalation'` if missing)

### Integration Tests

**Full page generation flow with pacing detection**:
- Generate a continuation page where the analyst returns `pacingIssueDetected: true`
- Verify the `ContinuationGenerationResult` includes pacing fields
- Verify `pagesInCurrentBeat` is correctly incremented on the resulting page's structure state
- Verify `pacingNudge` is set when `recommendedAction === 'nudge'`

**Structure rewrite with enriched schema**:
- Generate a structure with premise, pacingBudget, and beat roles
- Trigger a deviation + rewrite
- Verify rewritten structure preserves completed beat roles
- Verify rewritten structure includes new premise-compatible beats with roles

### Manual Verification

- Generate a new story and observe:
  - Structure includes `premise`, `pacingBudget`, and beat `role` fields
  - Writer context shows beat roles in the `=== STORY STRUCTURE ===` section
  - After multiple pages in one beat, analyst reports `pagesInCurrentBeat` context
  - If a pacing nudge fires, the next page's prompt includes the `=== PACING DIRECTIVE ===` section

---

## Migration Notes

This is a **breaking change** by design. Existing stories in `stories/` will fail to load because:

1. `StoryBeat` now requires `role`
2. `StoryStructure` now requires `premise` and `pacingBudget`
3. `AccumulatedStructureState` now requires `pagesInCurrentBeat` and `pacingNudge`

**Resolution**: Delete existing story data and regenerate. This is acceptable because we're early in development and the brainstorming document explicitly states: "We don't want backward compatibility nor legacy handling: prioritize a clean, robust architecture."

---

## Open Questions (For Implementation)

1. **Pacing rewrite trigger**: Should `recommendedAction: 'rewrite'` eventually trigger an actual structure rewrite? If so, should the analyst produce the same deviation fields (`invalidatedBeatIds`, `narrativeSummary`) or should there be a separate pacing-rewrite code path? **Recommendation**: Defer to a future spec. Nudging is the 80/20 solution.

2. **Pacing nudge persistence**: Should `pacingNudge` clear itself after one page (fire-once) or persist until the beat concludes? **Recommendation**: Fire-once. Set to `null` after being consumed by one continuation prompt. If the beat still stalls, the analyst will fire another nudge.

3. **Beat role in opening page prompt**: Should `buildOpeningPrompt` also receive beat role context? **Recommendation**: No. The opening page always targets beat 1.1 which is always `setup` -- adding role context adds nothing for the first page.
