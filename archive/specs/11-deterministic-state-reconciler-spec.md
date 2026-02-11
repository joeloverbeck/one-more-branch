**Status**: ✅ COMPLETED

# Spec 11: Deterministic State Reconciler

## Objective

Implement a deterministic post-writer reconciliation stage that produces the final state deltas and rejects invalid state transitions.

## Module Design

### New files

- `src/engine/state-reconciler.ts`
- `src/engine/state-reconciler-types.ts`
- `src/engine/state-reconciler-errors.ts`

### Primary function

`reconcileState(plan, writerOutput, previousState): StateReconciliationResult`

## Inputs

1. `PagePlan` (state intents + writer brief)
2. `PageWriterResult` (narrative + summary + affect + choices)
3. Authoritative previous state snapshot:
   - active threats, constraints, threads
   - inventory
   - health
   - accumulated character state
   - global canon and character canon

## Output

`StateReconciliationResult` fields:

- `currentLocation: string`
- `threatsAdded: string[]`
- `threatsRemoved: string[]`
- `constraintsAdded: string[]`
- `constraintsRemoved: string[]`
- `threadsAdded: Array<{ text: string; threadType: ThreadType; urgency: Urgency }>`
- `threadsResolved: string[]`
- `inventoryAdded: string[]`
- `inventoryRemoved: string[]`
- `healthAdded: string[]`
- `healthRemoved: string[]`
- `characterStateChangesAdded: Array<{ characterName: string; states: string[] }>`
- `characterStateChangesRemoved: string[]`
- `newCanonFacts: string[]`
- `newCharacterCanonFacts: Record<string, string[]>`
- `reconciliationDiagnostics: Array<{ code: string; message: string; field?: string }>`

## Reconciliation Algorithm (Deterministic)

1. Normalize all planner intents (`trim`, whitespace collapse, casefold comparison key).
2. Validate all remove/resolve IDs exist in previous state.
3. Expand planner `replace` operations into remove+add operations.
4. Apply deterministic dedupe and contradiction checks (Spec 12).
5. Validate cross-field consistency:
   - inventory and health updates cannot reference unknown IDs
   - characterState removals must match existing branch state IDs
   - no duplicate new canon facts after normalization
6. Derive final deltas from valid normalized intents.

## Narrative Evidence Gate

Reconciler must verify planner intent is represented in writer output via deterministic checks:

1. Each added/removed/resolved intent must have at least one lexical anchor token appearing in either `narrative` or `sceneSummary`.
2. If evidence check fails for any required intent, reconciliation fails.
3. Failure returns machine-readable diagnostics.

Notes:
- Evidence gate is deterministic and heuristic-based; no semantic embedding or LLM calls.

## Failure Handling Contract

1. On first reconciliation failure, generation retries once with strict failure reasons injected into planner+writer context.
2. If second attempt fails, return hard error.
3. No legacy fallback path.

## Integration Points

- `src/engine/page-service.ts`: call reconciler after writer and before page builder.
- `src/engine/page-builder.ts`: consume merged `PageWriterResult + StateReconciliationResult`.
- `src/llm/result-merger.ts`: update merge contract for continuation result.

## Acceptance Criteria

1. Reconciler deterministically produces final deltas with no randomness.
2. Invalid IDs, contradictory updates, and duplicate additions are rejected.
3. Writer cannot mutate state except through planner->reconciler path.
4. Retry-once behavior executes and surfaces structured diagnostics.

## Required Tests

1. Unit: ID validation and unknown-ID rejection per category.
2. Unit: replace expansion semantics (remove old + add new).
3. Unit: narrative evidence gate pass/fail cases.
4. Unit: deterministic output stability across repeated runs.
5. Integration: retry-once then hard error path.

## Outcome
- Completion date: 2026-02-11
- Implemented in codebase:
  - Deterministic reconciler module with normalization, validation, contradiction checks, and lexical evidence gate.
  - Page-service integration path using reconciliation outputs as authoritative state deltas.
  - Retry-once reconciliation handling with strict failure reason propagation and hard typed failure on repeated reconciliation diagnostics.
  - Deterministic unit and integration tests covering core reconciler behavior and retry/hard-error engine flow.
- Notes:
  - Reconciliation failure semantics are enforced at `page-service` level based on non-empty deterministic diagnostics from `reconcileState`.
