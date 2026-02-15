# Stateful Narrative Promises
**Status**: COMPLETED
**Note**: This design doc includes historical problem framing of the legacy system; current runtime architecture uses `accumulatedPromises` with explicit analyst detect/resolve lifecycle.

## Problem

Narrative promises (Chekhov's guns, foreshadowing, dramatic irony, unresolved emotions) are currently transitory free-text blobs. They inherit from parent to child page, cap at 5, and filter via 30% word overlap heuristics. Important early-story plants silently fall off after ~5 pages, causing coherence drift: the system's primary quality problem.

The `PROMISE_AGE_OUT_PAGES` constant exists but is dead code. Promises have no age tracking, no IDs, no explicit resolution mechanism.

## Solution

Replace the transitory `NarrativePromise` / `inheritedNarrativePromises` system with a stateful `TrackedPromise` system that mirrors thread management: server-assigned IDs, typed taxonomy, explicit add/remove lifecycle, age tracking.

## Context: ChatGPT Proposals Assessment

This design originated from evaluating ChatGPT's proposals in `brainstorming/improvements-to-architect.md`. Assessment:

| Proposal | Verdict | Reason |
|----------|---------|--------|
| Protagonist Arc Track | Rejected | Inappropriate for player-controlled interactive fiction; player can subvert any planned arc at any choice |
| Antagonist/PressurePlan | Already exists | NPC agenda resolver provides `currentGoal`, `leverage`, `fear`, `offScreenBehavior` per NPC |
| Faction clocks | YAGNI | Adds complexity for all story types to serve niche genres |
| Causal beat dependencies | Deferred | Could revisit; promise enforcement is higher-impact |
| PlantedElements / OpenLoops / ReincorporationTargets | Already exists (poorly) | NarrativePromise system covers intent but implementation is lossy |
| ChoiceDesignBudget | Already exists | ChoiceType (9 types) + PrimaryDelta (10 types) + divergence enforcement |
| PerceivedAgencyTechniques checklist | Rejected | Risks formulaic prose; NPC agendas and state mutations already provide agency |

The one genuine gap: **promise lifecycle lacks rigor**. This design fixes that.

## Design

### Promise Taxonomy

```typescript
enum PromiseType {
  CHEKHOV_GUN = 'CHEKHOV_GUN',
  FORESHADOWING = 'FORESHADOWING',
  DRAMATIC_IRONY = 'DRAMATIC_IRONY',
  UNRESOLVED_EMOTION = 'UNRESOLVED_EMOTION',
  SETUP_PAYOFF = 'SETUP_PAYOFF',
}
```

### Tracked Promise Model

```typescript
interface TrackedPromise {
  id: string;                // Server-assigned: "pr-1", "pr-2", ...
  description: string;       // Concrete description of what was planted
  promiseType: PromiseType;
  suggestedUrgency: Urgency; // LOW / MEDIUM / HIGH
  age: number;               // Pages since detection (0 = detected this page)
}
```

### Payoff Assessment

```typescript
interface PromisePayoffAssessment {
  promiseId: string;
  description: string;
  satisfactionLevel: 'RUSHED' | 'ADEQUATE' | 'WELL_EARNED';
  reasoning: string;
}
```

### Lifecycle Rules

Promises flow through the **analyst**, not the accountant or writer.

| Action | Actor | Mechanism |
|--------|-------|-----------|
| Detect new promise | Analyst | Sees implicit foreshadowing/setup in narrative, outputs `promisesDetected[]` with description, type, urgency |
| Resolve promise | Analyst | Receives active promises with IDs, outputs `promisesResolved[]` with IDs of promises paid off |
| Assess payoff quality | Analyst | Outputs `promisePayoffAssessments[]` for resolved promises |
| Assign ID | Engine | Assigns sequential `pr-N` IDs to new detections |
| Age promises | Engine | Increments age of all surviving promises by 1 each page |
| Accumulate | Engine | Stores on page as `accumulatedPromises: TrackedPromise[]` |
| Encourage reincorporation | Planner prompt | Receives active promises sorted by age; oldest flagged as opportunities, not mandates |

### Analyst Changes

**New input**: `activeTrackedPromises: TrackedPromise[]`

**New output** (replaces `narrativePromises: NarrativePromise[]`):

```typescript
{
  promisesDetected: Array<{
    description: string;
    promiseType: PromiseType;
    suggestedUrgency: Urgency;
  }>;
  promisesResolved: string[];  // IDs: "pr-1", "pr-3"
  promisePayoffAssessments: PromisePayoffAssessment[];
}
```

### Engine Accumulation Flow

```
1. Parent page has accumulatedPromises: [pr-1 (age 3), pr-2 (age 1), pr-4 (age 0)]
2. Analyst runs on new page's narrative
3. Analyst outputs: promisesDetected: [{desc, CHEKHOV_GUN, HIGH}], promisesResolved: ["pr-1"]
4. Engine:
   a. Remove resolved: drop pr-1
   b. Age survivors: pr-2 -> age 2, pr-4 -> age 1
   c. Assign IDs to new: new detection -> pr-5 (age 0)
   d. Result: accumulatedPromises = [pr-2 (age 2), pr-4 (age 1), pr-5 (age 0)]
```

No hard cap. Promises persist as long as they're relevant. The analyst resolves them when paid off.

### Planner Integration

The continuation planner receives `activeTrackedPromises` (replacing `inheritedNarrativePromises`), sorted oldest-first.

Prompt language is soft encouragement, not mandate:

> "The following narrative promises have been active for several pages and represent opportunities for reincorporation. Consider whether any fit naturally into the upcoming scene."

The planner may weave them into `writerBrief.mustIncludeBeats` or ignore them if they don't fit the scene.

## Changes Inventory

### New types
- `PromiseType` enum (new file or alongside choice-enums)
- `TrackedPromise` interface
- `PromisePayoffAssessment` interface

### Analyst
- `analyst-types.ts`: New output fields (promisesDetected, promisesResolved, promisePayoffAssessments)
- `analyst-schema.ts`: Updated JSON Schema for structured output
- `analyst-validation-schema.ts`: Updated Zod validation
- `analyst-response-transformer.ts`: Updated transformer
- `analyst-generation.ts` / analyst prompt: Updated context input (activeTrackedPromises) and instructions

### Page model
- `page.ts`: `accumulatedPromises: TrackedPromise[]` replaces `inheritedNarrativePromises`
- `AnalystResult` type updated

### Page builder
- `page-builder.ts`: Replace `computeInheritedNarrativePromises()` with `computeAccumulatedPromises()` (remove resolved, age survivors, assign IDs)
- Remove word-overlap filtering logic entirely

### Planner
- `continuation-context.ts`: Pass `accumulatedPromises` instead of `inheritedNarrativePromises`
- Planner prompt section: Present oldest promises with soft encouragement

### Serialization
- `page-serializer.ts`: Serialize/deserialize `accumulatedPromises`
- `page-serializer-types.ts`: Updated serialized shape

### Page service
- `page-service.ts`: Pass `activeTrackedPromises` to analyst context

### Config
- `thread-pacing-config.ts`: Remove `MAX_INHERITED_PROMISES` and `PROMISE_AGE_OUT_PAGES`; optionally add configurable age threshold for planner encouragement messaging

### Removals
- `NarrativePromise` interface
- `inheritedNarrativePromises` field on Page
- `computeInheritedNarrativePromises()` function
- `MAX_INHERITED_PROMISES` constant
- `PROMISE_AGE_OUT_PAGES` constant
- 30% word-overlap filtering logic

### Unchanged
- Writer prompt (writer doesn't interact with promises)
- Accountant (not its concern)
- State reconciler (promises aren't state mutations)
- NPC agenda resolver (unrelated)
- Structure generator (unrelated)
- Deviation handler (unrelated)

## Breaking Change

Old stories with `inheritedNarrativePromises` on their pages will not load. New stories only. No migration or backward compatibility paths.

## Outcome

- **Completion date**: 2026-02-15
- **What was actually changed**:
  - The design was realized in runtime with tracked promise IDs (`pr-N`), explicit analyst detect/resolve outputs, and page-level `accumulatedPromises`.
  - Planner/accountant context and docs now reference tracked promises instead of legacy narrative promise blobs.
- **Deviations from original plan**:
  - None in architecture direction; no backward compatibility layer was introduced.
- **Verification results**:
  - Final verification suite executed at closeout with green tests, typecheck, lint, build, and coverage.
