**Status**: Draft

# Writing Prompts Split: Implementation Priority Order

## Priority Table

| Priority | Spec | Why First | Dependencies |
|---|---|---|---|
| 1 | `specs/08-writing-prompts-split-architecture.md` | Locks breaking contracts before module work starts | None |
| 2 | `specs/09-page-planner-spec.md` | Planner contract must exist before writer/reconciler integration | 08 |
| 3 | `specs/10-page-writer-spec.md` | Writer schema/prompt refactor is required before reconciler becomes sole state authority | 08, 09 |
| 4 | `specs/12-thread-contract-and-dedup-spec.md` | Thread taxonomy and dedup rules must be defined before reconciler finalization | 08, 09 |
| 5 | `specs/11-deterministic-state-reconciler-spec.md` | Deterministic state output layer depends on planner contract and thread rules | 08, 09, 10, 12 |
| 6 | `specs/13-failure-handling-and-observability-spec.md` | Failure semantics/metrics finalize the production-ready pipeline | 08, 09, 10, 11, 12 |

## Implementation Gates

Each priority must satisfy its gate before moving to next:

1. Contract Gate: all types/schemas compile and are referenced in orchestration code.
2. Test Gate: unit tests for changed module pass.
3. Integration Gate: opening and continuation generation flow pass with mocked LLM responses.
4. Regression Gate: no replay/branch-isolation invariant breaks.

## Milestone Checklist

- [ ] M1: Architecture contracts merged (`08`)
- [ ] M2: Planner generation + schema + tests merged (`09`)
- [ ] M3: Writer creative-only refactor merged (`10`)
- [ ] M4: Thread contract + dedup rules merged (`12`)
- [ ] M5: Deterministic reconciler merged and wired (`11`)
- [ ] M6: Retry/error/metrics instrumentation merged (`13`)

## Rollout Validation Sequence

1. `npm run typecheck`
2. `npm run test:unit`
3. `npm run test:integration`
4. `npm run test:e2e`

## Exit Criteria

The initiative is complete only when:

1. Writer no longer emits any state mutation fields.
2. Reconciler is sole source of final state deltas.
3. Retry-once then hard-error behavior is active.
4. Thread dedup and replacement rules are enforced deterministically.
