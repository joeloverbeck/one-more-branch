# Stateful Narrative Promises Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the transitory NarrativePromise system with a stateful TrackedPromise system that has server-assigned IDs, typed taxonomy, explicit add/remove lifecycle via the analyst, and age tracking.

**Architecture:** Promises are owned by the analyst (detection + resolution), accumulated on pages like threads, and presented to the planner as soft encouragement. The engine handles ID assignment and aging. No hard cap on promise count.

**Tech Stack:** TypeScript strict mode, Zod validation, JSON Schema for LLM structured output, Jest for testing.

**Design doc:** `docs/plans/2026-02-14-stateful-narrative-promises-design.md`

---

### Task 1: Add PromiseType enum and TrackedPromise types

**Files:**
- Modify: `src/models/state/keyed-entry.ts` (replace old PromiseType/NarrativePromise with new types)
- Test: `test/unit/models/state/keyed-entry.test.ts` (if exists, otherwise skip standalone type tests)

**Step 1: Replace types in keyed-entry.ts**

In `src/models/state/keyed-entry.ts`, replace lines 120-128 (the old PromiseType and NarrativePromise):

```typescript
// ── Narrative Promise types ────────────────────────────────────────

export enum PromiseType {
  CHEKHOV_GUN = 'CHEKHOV_GUN',
  FORESHADOWING = 'FORESHADOWING',
  DRAMATIC_IRONY = 'DRAMATIC_IRONY',
  UNRESOLVED_EMOTION = 'UNRESOLVED_EMOTION',
  SETUP_PAYOFF = 'SETUP_PAYOFF',
}

export const PROMISE_TYPE_VALUES: readonly PromiseType[] = Object.values(PromiseType);

export function isPromiseType(value: unknown): value is PromiseType {
  return typeof value === 'string' && Object.values(PromiseType).includes(value as PromiseType);
}

export interface TrackedPromise {
  readonly id: string;
  readonly description: string;
  readonly promiseType: PromiseType;
  readonly suggestedUrgency: Urgency;
  readonly age: number;
}

export interface PromisePayoffAssessment {
  readonly promiseId: string;
  readonly description: string;
  readonly satisfactionLevel: SatisfactionLevel;
  readonly reasoning: string;
}
```

Also add `'pr'` to the `StateIdPrefix` type:

```typescript
export type StateIdPrefix = 'inv' | 'hp' | 'cs' | 'th' | 'cn' | 'td' | 'pr';
```

**Step 2: Update barrel export in state/index.ts**

In `src/models/state/index.ts`, replace the narrative promise export block (lines 56-62):

```typescript
// Narrative promise types
export {
  PromiseType,
  PROMISE_TYPE_VALUES,
  isPromiseType,
  SatisfactionLevel,
  ThreadPayoffAssessment,
} from './keyed-entry.js';

export type {
  TrackedPromise,
  PromisePayoffAssessment,
} from './keyed-entry.js';
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: Errors in files that still import `NarrativePromise` - this is expected and will be fixed in subsequent tasks.

**Step 4: Commit**

```bash
git add src/models/state/keyed-entry.ts src/models/state/index.ts
git commit -m "feat: replace NarrativePromise with TrackedPromise types and PromiseType enum"
```

---

### Task 2: Update config - remove old promise constants

**Files:**
- Modify: `src/config/thread-pacing-config.ts`

**Step 1: Remove dead promise constants, add new threshold**

Replace the entire file:

```typescript
export const THREAD_PACING = {
  HIGH_URGENCY_OVERDUE_PAGES: 4,
  MEDIUM_URGENCY_OVERDUE_PAGES: 7,
  LOW_URGENCY_OVERDUE_PAGES: 10,
  PROMISE_AGING_NOTICE_PAGES: 3,
} as const;
```

`PROMISE_AGING_NOTICE_PAGES` is the age threshold at which the planner starts seeing a promise as an opportunity for reincorporation.

**Step 2: Fix any references to removed constants**

Run: `grep -r 'MAX_INHERITED_PROMISES\|PROMISE_AGE_OUT_PAGES' src/ test/`

Fix any references found. The main one is in `page-builder.ts` which will be rewritten in Task 5.

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: Errors in `page-builder.ts` referencing `THREAD_PACING.MAX_INHERITED_PROMISES` - will be fixed in Task 5.

**Step 4: Commit**

```bash
git add src/config/thread-pacing-config.ts
git commit -m "refactor: remove dead promise constants, add PROMISE_AGING_NOTICE_PAGES"
```

---

### Task 3: Update AnalystResult and AnalystContext types

**Files:**
- Modify: `src/llm/analyst-types.ts`
- Test: existing analyst tests will need mock updates (Task 9)

**Step 1: Update AnalystContext to receive tracked promises**

Add import and new field to `AnalystContext` in `src/llm/analyst-types.ts`:

```typescript
import type {
  ActiveState,
  TrackedPromise,
  PromisePayoffAssessment,
  ThreadPayoffAssessment,
} from '../models/state/index.js';
import type { PromiseType } from '../models/state/keyed-entry.js';
import type { Urgency } from '../models/state/keyed-entry.js';
import type { AccumulatedStructureState, StoryStructure } from '../models/story-arc.js';
```

Update `AnalystContext`:

```typescript
export interface AnalystContext {
  narrative: string;
  structure: StoryStructure;
  accumulatedStructureState: AccumulatedStructureState;
  activeState: ActiveState;
  threadsResolved: readonly string[];
  threadAges: Readonly<Record<string, number>>;
  tone: string;
  toneKeywords?: readonly string[];
  toneAntiKeywords?: readonly string[];
  activeTrackedPromises: readonly TrackedPromise[];
}
```

**Step 2: Update AnalystResult to use new promise output fields**

Replace `narrativePromises` field in `AnalystResult`:

```typescript
export interface DetectedPromise {
  readonly description: string;
  readonly promiseType: PromiseType;
  readonly suggestedUrgency: Urgency;
}

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
  sceneMomentum: SceneMomentum;
  objectiveEvidenceStrength: ObjectiveEvidenceStrength;
  commitmentStrength: CommitmentStrength;
  structuralPositionSignal: StructuralPositionSignal;
  entryConditionReadiness: EntryConditionReadiness;
  objectiveAnchors: string[];
  anchorEvidence: string[];
  completionGateSatisfied: boolean;
  completionGateFailureReason: string;
  toneAdherent: boolean;
  toneDriftDescription: string;
  promisesDetected: DetectedPromise[];
  promisesResolved: string[];
  promisePayoffAssessments: PromisePayoffAssessment[];
  threadPayoffAssessments: ThreadPayoffAssessment[];
  rawResponse: string;
}
```

**Step 3: Commit**

```bash
git add src/llm/analyst-types.ts
git commit -m "feat: update AnalystResult/AnalystContext for tracked promises"
```

---

### Task 4: Update analyst JSON Schema and Zod validation

**Files:**
- Modify: `src/llm/schemas/analyst-schema.ts`
- Modify: `src/llm/schemas/analyst-validation-schema.ts`

**Step 1: Update JSON Schema in analyst-schema.ts**

Replace the `narrativePromises` property block (lines 106-131) with three new properties:

```typescript
        promisesDetected: {
          type: 'array',
          description:
            "New narrative promises detected in this page's prose. Only flag items introduced with deliberate narrative weight, not incidental details. Max 3 per page.",
          items: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'Brief, concrete description of the narrative promise or foreshadowed element.',
              },
              promiseType: {
                type: 'string',
                enum: ['CHEKHOV_GUN', 'FORESHADOWING', 'DRAMATIC_IRONY', 'UNRESOLVED_EMOTION', 'SETUP_PAYOFF'],
                description: 'The type of narrative promise.',
              },
              suggestedUrgency: {
                type: 'string',
                enum: ['LOW', 'MEDIUM', 'HIGH'],
                description: 'How urgently this promise should be addressed in upcoming pages.',
              },
            },
            required: ['description', 'promiseType', 'suggestedUrgency'],
            additionalProperties: false,
          },
        },
        promisesResolved: {
          type: 'array',
          description:
            'IDs of active tracked promises that were paid off or addressed in this page\'s narrative. Use the exact pr-N IDs from the ACTIVE NARRATIVE PROMISES section. Empty array if none were resolved.',
          items: { type: 'string' },
        },
        promisePayoffAssessments: {
          type: 'array',
          description:
            'Quality assessment of promise resolutions. One entry per resolved promise.',
          items: {
            type: 'object',
            properties: {
              promiseId: {
                type: 'string',
                description: 'The ID of the resolved promise (e.g., "pr-1").',
              },
              description: {
                type: 'string',
                description: 'The description of the resolved promise.',
              },
              satisfactionLevel: {
                type: 'string',
                enum: ['RUSHED', 'ADEQUATE', 'WELL_EARNED'],
                description:
                  'How satisfying the promise payoff was. RUSHED = resolved via exposition or off-screen. ADEQUATE = resolved through action but without buildup. WELL_EARNED = resolution developed through action and consequence.',
              },
              reasoning: {
                type: 'string',
                description: 'Brief explanation of the satisfaction assessment.',
              },
            },
            required: ['promiseId', 'description', 'satisfactionLevel', 'reasoning'],
            additionalProperties: false,
          },
        },
```

Update the `required` array: replace `'narrativePromises'` with `'promisesDetected'`, `'promisesResolved'`, `'promisePayoffAssessments'`.

**Step 2: Update Zod validation in analyst-validation-schema.ts**

Replace `NarrativePromiseSchema` and the `narrativePromises` field:

```typescript
const PromiseTypeSchema = z
  .enum(['CHEKHOV_GUN', 'FORESHADOWING', 'DRAMATIC_IRONY', 'UNRESOLVED_EMOTION', 'SETUP_PAYOFF'])
  .catch('FORESHADOWING');

const DetectedPromiseSchema = z.object({
  description: z.string().default(''),
  promiseType: PromiseTypeSchema,
  suggestedUrgency: UrgencySchema,
});

const PromisePayoffAssessmentSchema = z.object({
  promiseId: z.string().default(''),
  description: z.string().default(''),
  satisfactionLevel: SatisfactionLevelSchema,
  reasoning: z.string().default(''),
});
```

In `AnalystResultSchema`, replace the `narrativePromises` field with:

```typescript
  promisesDetected: z.array(DetectedPromiseSchema).catch([]).default([]),
  promisesResolved: z.array(z.string()).catch([]).default([]),
  promisePayoffAssessments: z.array(PromisePayoffAssessmentSchema).catch([]).default([]),
```

**Step 3: Commit**

```bash
git add src/llm/schemas/analyst-schema.ts src/llm/schemas/analyst-validation-schema.ts
git commit -m "feat: update analyst schema and validation for tracked promises"
```

---

### Task 5: Update analyst response transformer

**Files:**
- Modify: `src/llm/schemas/analyst-response-transformer.ts`

**Step 1: Replace normalizeNarrativePromises with new normalizers**

Remove `normalizeNarrativePromises` function. Add:

```typescript
import type { PromisePayoffAssessment } from '../../models/state/index.js';
import type { DetectedPromise } from '../analyst-types.js';
```

```typescript
const MAX_PROMISES_DETECTED = 3;

function normalizeDetectedPromises(
  value: readonly { description: string; promiseType: string; suggestedUrgency: string }[]
): DetectedPromise[] {
  return value
    .filter((p) => p.description.trim().length > 0)
    .slice(0, MAX_PROMISES_DETECTED)
    .map((p) => ({
      description: p.description.trim(),
      promiseType: p.promiseType as DetectedPromise['promiseType'],
      suggestedUrgency: p.suggestedUrgency as DetectedPromise['suggestedUrgency'],
    }));
}

const PROMISE_ID_PATTERN = /^pr-\d+$/;

function normalizePromisesResolved(value: readonly string[]): string[] {
  return value
    .map((id) => id.trim())
    .filter((id) => PROMISE_ID_PATTERN.test(id));
}

function normalizePromisePayoffAssessments(
  value: readonly {
    promiseId: string;
    description: string;
    satisfactionLevel: string;
    reasoning: string;
  }[]
): PromisePayoffAssessment[] {
  return value
    .filter((a) => a.promiseId.trim().length > 0 && PROMISE_ID_PATTERN.test(a.promiseId.trim()))
    .map((a) => ({
      promiseId: a.promiseId.trim(),
      description: a.description.trim(),
      satisfactionLevel: a.satisfactionLevel as PromisePayoffAssessment['satisfactionLevel'],
      reasoning: a.reasoning.trim(),
    }));
}
```

**Step 2: Update validateAnalystResponse return object**

Replace `narrativePromises: normalizeNarrativePromises(validated.narrativePromises),` with:

```typescript
    promisesDetected: normalizeDetectedPromises(validated.promisesDetected),
    promisesResolved: normalizePromisesResolved(validated.promisesResolved),
    promisePayoffAssessments: normalizePromisePayoffAssessments(validated.promisePayoffAssessments),
```

Remove the import of `NarrativePromise` from `'../../models/state/index.js'`.

**Step 3: Commit**

```bash
git add src/llm/schemas/analyst-response-transformer.ts
git commit -m "feat: update analyst response transformer for tracked promises"
```

---

### Task 6: Update Page model

**Files:**
- Modify: `src/models/page.ts`

**Step 1: Replace inheritedNarrativePromises with accumulatedPromises**

Update imports - remove `NarrativePromise` import, add `TrackedPromise`:

```typescript
import type { TrackedPromise } from './state/keyed-entry';
```

In the `Page` interface, replace:
```typescript
  readonly inheritedNarrativePromises: readonly NarrativePromise[];
```
with:
```typescript
  readonly accumulatedPromises: readonly TrackedPromise[];
```

In `CreatePageData`, replace:
```typescript
  inheritedNarrativePromises?: readonly NarrativePromise[];
```
with:
```typescript
  accumulatedPromises?: readonly TrackedPromise[];
```

In `createPage()`, replace:
```typescript
    inheritedNarrativePromises: data.inheritedNarrativePromises ?? [],
```
with:
```typescript
    accumulatedPromises: data.accumulatedPromises ?? [],
```

**Step 2: Commit**

```bash
git add src/models/page.ts
git commit -m "feat: replace inheritedNarrativePromises with accumulatedPromises on Page"
```

---

### Task 7: Update page builder - new promise accumulation logic

**Files:**
- Modify: `src/engine/page-builder.ts`
- Test: `test/unit/engine/page-builder.test.ts`

**Step 1: Write failing tests for computeAccumulatedPromises**

Add to `test/unit/engine/page-builder.test.ts`:

```typescript
import { PromiseType } from '../../src/models/state/keyed-entry';
import { Urgency } from '../../src/models/state/keyed-entry';

describe('computeAccumulatedPromises', () => {
  it('returns empty array for opening pages', () => {
    const result = computeAccumulatedPromises([], [], [], 0);
    expect(result).toEqual([]);
  });

  it('ages surviving promises by 1', () => {
    const parent = [
      { id: 'pr-1', description: 'a gun on the wall', promiseType: PromiseType.CHEKHOV_GUN, suggestedUrgency: Urgency.HIGH, age: 2 },
    ];
    const result = computeAccumulatedPromises(parent, [], [], 1);
    expect(result).toEqual([
      { id: 'pr-1', description: 'a gun on the wall', promiseType: PromiseType.CHEKHOV_GUN, suggestedUrgency: Urgency.HIGH, age: 3 },
    ]);
  });

  it('removes resolved promises', () => {
    const parent = [
      { id: 'pr-1', description: 'gun', promiseType: PromiseType.CHEKHOV_GUN, suggestedUrgency: Urgency.HIGH, age: 2 },
      { id: 'pr-2', description: 'hint', promiseType: PromiseType.FORESHADOWING, suggestedUrgency: Urgency.LOW, age: 1 },
    ];
    const result = computeAccumulatedPromises(parent, ['pr-1'], [], 2);
    expect(result).toEqual([
      { id: 'pr-2', description: 'hint', promiseType: PromiseType.FORESHADOWING, suggestedUrgency: Urgency.LOW, age: 2 },
    ]);
  });

  it('assigns sequential IDs to new detections', () => {
    const parent = [
      { id: 'pr-2', description: 'existing', promiseType: PromiseType.FORESHADOWING, suggestedUrgency: Urgency.LOW, age: 1 },
    ];
    const newDetections = [
      { description: 'new thing', promiseType: PromiseType.SETUP_PAYOFF, suggestedUrgency: Urgency.MEDIUM },
    ];
    const result = computeAccumulatedPromises(parent, [], newDetections, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'pr-2', description: 'existing', promiseType: PromiseType.FORESHADOWING, suggestedUrgency: Urgency.LOW, age: 2 });
    expect(result[1]).toEqual({ id: 'pr-3', description: 'new thing', promiseType: PromiseType.SETUP_PAYOFF, suggestedUrgency: Urgency.MEDIUM, age: 0 });
  });

  it('handles resolve + detect in same page', () => {
    const parent = [
      { id: 'pr-1', description: 'old', promiseType: PromiseType.CHEKHOV_GUN, suggestedUrgency: Urgency.HIGH, age: 5 },
    ];
    const newDetections = [
      { description: 'fresh', promiseType: PromiseType.DRAMATIC_IRONY, suggestedUrgency: Urgency.LOW },
    ];
    const result = computeAccumulatedPromises(parent, ['pr-1'], newDetections, 1);
    expect(result).toEqual([
      { id: 'pr-2', description: 'fresh', promiseType: PromiseType.DRAMATIC_IRONY, suggestedUrgency: Urgency.LOW, age: 0 },
    ]);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest test/unit/engine/page-builder.test.ts --testNamePattern="computeAccumulatedPromises" --no-coverage`
Expected: FAIL (function not exported yet)

**Step 3: Implement computeAccumulatedPromises in page-builder.ts**

Replace `computeInheritedNarrativePromises` with:

```typescript
import type { TrackedPromise } from '../models/state/keyed-entry';
import type { DetectedPromise } from '../llm/analyst-types';

export function computeAccumulatedPromises(
  parentPromises: readonly TrackedPromise[],
  resolvedIds: readonly string[],
  detected: readonly DetectedPromise[],
  maxExistingId: number
): readonly TrackedPromise[] {
  const resolvedSet = new Set(resolvedIds);

  // 1. Remove resolved, age survivors
  const surviving: TrackedPromise[] = parentPromises
    .filter((p) => !resolvedSet.has(p.id))
    .map((p) => ({ ...p, age: p.age + 1 }));

  // 2. Assign IDs to new detections
  let nextIdNum = maxExistingId;
  const newPromises: TrackedPromise[] = detected
    .filter((d) => d.description.trim().length > 0)
    .map((d) => {
      nextIdNum += 1;
      return {
        id: `pr-${nextIdNum}`,
        description: d.description.trim(),
        promiseType: d.promiseType,
        suggestedUrgency: d.suggestedUrgency,
        age: 0,
      };
    });

  return [...surviving, ...newPromises];
}
```

Remove the old `computeInheritedNarrativePromises` function and the `THREAD_PACING` import (if only used for `MAX_INHERITED_PROMISES`).

**Step 4: Update PageBuildContext and buildPage**

In `PageBuildContext`, replace:
```typescript
  readonly parentInheritedNarrativePromises: readonly NarrativePromise[];
  readonly parentAnalystNarrativePromises: readonly NarrativePromise[];
```
with:
```typescript
  readonly parentAccumulatedPromises: readonly TrackedPromise[];
  readonly analystPromisesDetected: readonly DetectedPromise[];
  readonly analystPromisesResolved: readonly string[];
```

Update `buildPage` to use `computeAccumulatedPromises`:
```typescript
  const accumulatedPromises = isOpening
    ? []
    : computeAccumulatedPromises(
        context.parentAccumulatedPromises,
        context.analystPromisesResolved,
        context.analystPromisesDetected,
        getMaxPromiseIdNumber(context.parentAccumulatedPromises)
      );
```

Add a helper:
```typescript
function getMaxPromiseIdNumber(promises: readonly TrackedPromise[]): number {
  let max = 0;
  for (const p of promises) {
    const match = /^pr-(\d+)$/.exec(p.id);
    if (match?.[1]) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  return max;
}
```

In the `createPage` call, replace `inheritedNarrativePromises` with `accumulatedPromises`.

**Step 5: Update deprecated contexts**

Update `ContinuationPageBuildContext` and `buildFirstPage`/`buildContinuationPage` to use the new field names. In `buildFirstPage`, pass empty arrays for promise fields.

**Step 6: Run tests**

Run: `npx jest test/unit/engine/page-builder.test.ts --no-coverage`
Expected: New tests PASS. Existing tests may need mock updates.

**Step 7: Commit**

```bash
git add src/engine/page-builder.ts test/unit/engine/page-builder.test.ts
git commit -m "feat: implement computeAccumulatedPromises with ID assignment and aging"
```

---

### Task 8: Update serialization layer

**Files:**
- Modify: `src/persistence/page-serializer-types.ts`
- Modify: `src/persistence/page-serializer.ts`

**Step 1: Update serializer types**

In `page-serializer-types.ts`, replace `NarrativePromiseFileData` with:

```typescript
export interface TrackedPromiseFileData {
  id: string;
  description: string;
  promiseType: string;
  suggestedUrgency: string;
  age: number;
}

export interface PromisePayoffAssessmentFileData {
  promiseId: string;
  description: string;
  satisfactionLevel: string;
  reasoning: string;
}
```

In `AnalystResultFileData`, replace `narrativePromises` with:
```typescript
  promisesDetected?: NarrativePromiseFileData[];  // Keep same shape for detected (no ID/age)
  promisesResolved?: string[];
  promisePayoffAssessments?: PromisePayoffAssessmentFileData[];
```

Note: `promisesDetected` can reuse `NarrativePromiseFileData` shape (description, promiseType, suggestedUrgency) since detected promises don't have IDs yet.

In `PageFileData`, replace `inheritedNarrativePromises` with:
```typescript
  accumulatedPromises?: TrackedPromiseFileData[];
```

**Step 2: Update serializer functions**

In `page-serializer.ts`:

Update `serializeAnalystResult` - replace `narrativePromises` with:
```typescript
    promisesDetected: (analystResult.promisesDetected ?? []).map((p) => ({
      description: p.description,
      promiseType: p.promiseType,
      suggestedUrgency: p.suggestedUrgency,
    })),
    promisesResolved: [...(analystResult.promisesResolved ?? [])],
    promisePayoffAssessments: (analystResult.promisePayoffAssessments ?? []).map((a) => ({
      promiseId: a.promiseId,
      description: a.description,
      satisfactionLevel: a.satisfactionLevel,
      reasoning: a.reasoning,
    })),
```

Update `deserializeAnalystResult` - replace `narrativePromises` with:
```typescript
    promisesDetected: (data.promisesDetected ?? []).map((p) => ({
      description: p.description,
      promiseType: p.promiseType as AnalystResult['promisesDetected'][number]['promiseType'],
      suggestedUrgency: p.suggestedUrgency as AnalystResult['promisesDetected'][number]['suggestedUrgency'],
    })),
    promisesResolved: [...(data.promisesResolved ?? [])],
    promisePayoffAssessments: (data.promisePayoffAssessments ?? []).map((a) => ({
      promiseId: a.promiseId,
      description: a.description,
      satisfactionLevel: a.satisfactionLevel as PromisePayoffAssessment['satisfactionLevel'],
      reasoning: a.reasoning,
    })),
```

Update `serializePage` - replace `inheritedNarrativePromises` block with:
```typescript
    accumulatedPromises: page.accumulatedPromises.map((p) => ({
      id: p.id,
      description: p.description,
      promiseType: p.promiseType,
      suggestedUrgency: p.suggestedUrgency,
      age: p.age,
    })),
```

Update `deserializePage` - replace `inheritedNarrativePromises` block with:
```typescript
    accumulatedPromises: (data.accumulatedPromises ?? []).map((p) => ({
      id: p.id,
      description: p.description,
      promiseType: p.promiseType as TrackedPromise['promiseType'],
      suggestedUrgency: p.suggestedUrgency as TrackedPromise['suggestedUrgency'],
      age: p.age,
    })),
```

Update imports accordingly (add `TrackedPromise`, `PromisePayoffAssessment`; remove `NarrativePromise`).

**Step 3: Commit**

```bash
git add src/persistence/page-serializer-types.ts src/persistence/page-serializer.ts
git commit -m "feat: update serialization for tracked promises"
```

---

### Task 9: Update continuation context builder and ContinuationContext type

**Files:**
- Modify: `src/llm/context-types.ts`
- Modify: `src/engine/continuation-context-builder.ts`

**Step 1: Update ContinuationContext type**

In `src/llm/context-types.ts`, replace the promise-related fields (lines 75-78):

```typescript
  accumulatedPromises?: readonly TrackedPromise[];
  parentThreadPayoffAssessments?: readonly ThreadPayoffAssessment[];
```

Remove `inheritedNarrativePromises`, `parentAnalystNarrativePromises`. Add import for `TrackedPromise`.

**Step 2: Update continuation context builder**

In `src/engine/continuation-context-builder.ts`, replace lines 56-58:

```typescript
    accumulatedPromises: parentPage.accumulatedPromises,
    parentThreadPayoffAssessments: parentPage.analystResult?.threadPayoffAssessments ?? [],
```

Remove `inheritedNarrativePromises` and `parentAnalystNarrativePromises` lines.

**Step 3: Commit**

```bash
git add src/llm/context-types.ts src/engine/continuation-context-builder.ts
git commit -m "feat: update ContinuationContext for tracked promises"
```

---

### Task 10: Update planner prompt section for promise display

**Files:**
- Modify: `src/llm/prompts/sections/planner/thread-pacing-directive.ts`
- Modify: `src/llm/prompts/sections/planner/continuation-context.ts`
- Test: `test/unit/llm/prompts/sections/planner/thread-pacing-directive.test.ts`

**Step 1: Write failing test for new buildTrackedPromisesSection**

```typescript
describe('buildTrackedPromisesSection', () => {
  it('returns empty string when no promises', () => {
    expect(buildTrackedPromisesSection([])).toBe('');
  });

  it('sorts promises oldest-first and formats with IDs', () => {
    const promises = [
      { id: 'pr-2', description: 'a hint', promiseType: PromiseType.FORESHADOWING, suggestedUrgency: Urgency.LOW, age: 1 },
      { id: 'pr-1', description: 'gun on wall', promiseType: PromiseType.CHEKHOV_GUN, suggestedUrgency: Urgency.HIGH, age: 5 },
    ];
    const result = buildTrackedPromisesSection(promises);
    expect(result).toContain('pr-1');
    expect(result).toContain('gun on wall');
    expect(result).toContain('5 pages');
    expect(result.indexOf('pr-1')).toBeLessThan(result.indexOf('pr-2'));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest test/unit/llm/prompts/sections/planner/thread-pacing-directive.test.ts --testNamePattern="buildTrackedPromisesSection" --no-coverage`
Expected: FAIL

**Step 3: Implement buildTrackedPromisesSection**

In `thread-pacing-directive.ts`, replace `buildNarrativePromisesSection`:

```typescript
import type { TrackedPromise } from '../../../../models/state/keyed-entry.js';
import { THREAD_PACING } from '../../../../config/thread-pacing-config.js';

export function buildTrackedPromisesSection(
  promises: readonly TrackedPromise[]
): string {
  if (promises.length === 0) {
    return '';
  }

  const sorted = [...promises].sort((a, b) => b.age - a.age);
  const aging = sorted.filter((p) => p.age >= THREAD_PACING.PROMISE_AGING_NOTICE_PAGES);
  const recent = sorted.filter((p) => p.age < THREAD_PACING.PROMISE_AGING_NOTICE_PAGES);

  const lines: string[] = ['=== ACTIVE NARRATIVE PROMISES ==='];

  if (aging.length > 0) {
    lines.push(
      'The following promises have been active for several pages and represent opportunities for reincorporation.',
      'Consider whether any fit naturally into the upcoming scene:'
    );
    for (const p of aging) {
      lines.push(`- [${p.id}] (${p.promiseType}/${p.suggestedUrgency}, ${p.age} pages): ${p.description}`);
    }
  }

  if (recent.length > 0) {
    if (aging.length > 0) {
      lines.push('');
      lines.push('Recently planted:');
    }
    for (const p of recent) {
      lines.push(`- [${p.id}] (${p.promiseType}/${p.suggestedUrgency}, ${p.age} pages): ${p.description}`);
    }
  }

  lines.push('');
  return lines.join('\n') + '\n';
}
```

**Step 4: Update continuation-context.ts to use new function**

Replace the call to `buildNarrativePromisesSection` with `buildTrackedPromisesSection`:

```typescript
  const trackedPromisesSection = buildTrackedPromisesSection(
    context.accumulatedPromises ?? []
  );
```

Update the template string to use `trackedPromisesSection` instead of `narrativePromisesSection`.

**Step 5: Run tests**

Run: `npx jest test/unit/llm/prompts/sections/planner/thread-pacing-directive.test.ts --no-coverage`
Expected: PASS

**Step 6: Commit**

```bash
git add src/llm/prompts/sections/planner/thread-pacing-directive.ts src/llm/prompts/sections/planner/continuation-context.ts test/unit/llm/prompts/sections/planner/thread-pacing-directive.test.ts
git commit -m "feat: update planner prompt to show tracked promises with soft encouragement"
```

---

### Task 11: Update analyst prompt to receive and handle tracked promises

**Files:**
- Modify: `src/llm/prompts/analyst-prompt.ts`
- Modify: `src/engine/continuation-post-processing.ts`
- Modify: `src/engine/page-service.ts`

**Step 1: Update analyst prompt to include active promises context**

In `analyst-prompt.ts`, update `buildAnalystPrompt` to include tracked promises in the user message:

```typescript
import type { TrackedPromise } from '../../models/state/keyed-entry.js';

function buildActivePromisesSection(promises: readonly TrackedPromise[]): string {
  if (promises.length === 0) {
    return '';
  }
  const lines = ['\nACTIVE NARRATIVE PROMISES (check if any were paid off in this page):'];
  for (const p of promises) {
    lines.push(`- [${p.id}] (${p.promiseType}/${p.suggestedUrgency}, age ${p.age}): ${p.description}`);
  }
  lines.push('');
  return lines.join('\n');
}
```

Update `buildAnalystPrompt` to use `context.activeTrackedPromises`:
```typescript
  const promisesSection = buildActivePromisesSection(context.activeTrackedPromises);
  const userContent = `${structureEvaluation}${toneReminder}${promisesSection}\nNARRATIVE TO EVALUATE:\n${context.narrative}`;
```

Update `ANALYST_RULES` to include promise instructions:
```
NARRATIVE PROMISES:
- Detect new implicit foreshadowing or Chekhov's guns planted with deliberate narrative weight (max 3 per page).
- Check whether any ACTIVE NARRATIVE PROMISES listed above were paid off or addressed in this page's narrative.
- If a promise was paid off, include its pr-N ID in promisesResolved and assess the payoff quality.
- Only mark a promise as resolved when it has been meaningfully addressed, not merely referenced.
```

**Step 2: Update AnalystEvaluationContext to include tracked promises**

In `continuation-post-processing.ts`, add `activeTrackedPromises` to `AnalystEvaluationContext`:

```typescript
import type { TrackedPromise } from '../models/state/keyed-entry';

export interface AnalystEvaluationContext {
  // ... existing fields ...
  readonly activeTrackedPromises: readonly TrackedPromise[];
}
```

Pass it through to `generateAnalystEvaluation`:

```typescript
    const analystResult = await generateAnalystEvaluation(
      {
        // ... existing fields ...
        activeTrackedPromises: context.activeTrackedPromises,
      },
```

**Step 3: Update page-service.ts to pass tracked promises**

In the analyst evaluation call in `page-service.ts`, pass tracked promises from the parent page:

```typescript
          activeTrackedPromises: parentPage?.accumulatedPromises ?? [],
```

**Step 4: Commit**

```bash
git add src/llm/prompts/analyst-prompt.ts src/engine/continuation-post-processing.ts src/engine/page-service.ts
git commit -m "feat: pass tracked promises to analyst for detection and resolution"
```

---

### Task 12: Update page-service buildPage call with analyst results

**Files:**
- Modify: `src/engine/page-service.ts`

**Step 1: Update the buildPage context construction**

Where `page-service.ts` constructs the `PageBuildContext` for `buildPage`, update the promise fields:

```typescript
    parentAccumulatedPromises: parentPage?.accumulatedPromises ?? [],
    analystPromisesDetected: analystResult?.promisesDetected ?? [],
    analystPromisesResolved: analystResult?.promisesResolved ?? [],
```

Remove any references to `parentInheritedNarrativePromises` or `parentAnalystNarrativePromises`.

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (or close to - may reveal remaining references)

**Step 3: Commit**

```bash
git add src/engine/page-service.ts
git commit -m "feat: wire tracked promise accumulation through page-service"
```

---

### Task 13: Clean up remaining references and fix tests

**Files:**
- Search all `src/` and `test/` for `NarrativePromise`, `inheritedNarrativePromises`, `parentAnalystNarrativePromises`, `narrativePromises`
- Fix all remaining references

**Step 1: Find all remaining old references**

Run: `grep -r 'NarrativePromise\|inheritedNarrativePromises\|parentAnalystNarrativePromises\|narrativePromises' src/ test/ --include='*.ts' -l`

Fix each file found. Common patterns:
- Test mocks that include `narrativePromises` on analyst results -> change to `promisesDetected`, `promisesResolved`, `promisePayoffAssessments`
- Test mocks that include `inheritedNarrativePromises` on pages -> change to `accumulatedPromises`
- Any remaining imports of `NarrativePromise` -> change to `TrackedPromise`

**Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Run lint**

Run: `npm run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: clean up all NarrativePromise references, update test mocks"
```

---

### Task 14: Final verification

**Step 1: Full test suite with coverage**

Run: `npm run test:coverage`
Expected: Coverage thresholds met (70%)

**Step 2: Full typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Lint**

Run: `npm run lint`
Expected: PASS

**Step 4: Build**

Run: `npm run build`
Expected: PASS

**Step 5: Verify no old references remain**

Run: `grep -r 'NarrativePromise\|inheritedNarrativePromises\|MAX_INHERITED_PROMISES\|PROMISE_AGE_OUT_PAGES\|computeInheritedNarrativePromises' src/ --include='*.ts'`
Expected: No matches
