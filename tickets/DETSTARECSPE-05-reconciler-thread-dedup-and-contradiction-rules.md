# DETSTARECSPE-05: Reconciler Thread Dedup and Contradiction Rules

**Status**: Draft

## Summary
Implement deterministic thread dedup and replacement enforcement using Spec 12 similarity thresholds, including threat-vs-danger misclassification checks.

## Depends on
- DETSTARECSPE-02
- `specs/12-thread-contract-and-dedup-spec.md`

## Blocks
- DETSTARECSPE-07

## File list it expects to touch
- `src/engine/state-reconciler.ts`
- `src/engine/state-reconciler-types.ts`
- `test/unit/engine/state-reconciler.test.ts`
- `test/integration/llm/active-state-pipeline.test.ts`

## Implementation checklist
1. Add deterministic thread normalization/tokenization for similarity checks.
2. Implement per-`ThreadType` Jaccard thresholds from Spec 12.
3. Reject near-duplicate add intents that do not resolve the existing equivalent thread.
4. Enforce replace path: equivalent loops must be `resolve old td-* + add refined successor`.
5. Reject `DANGER` threads that describe immediate present-scene hazards.
6. Emit diagnostic rule codes for duplicate-like add, missing resolve, and misclassification.

## Out of scope
- Prompt-side contract wording updates from Spec 12.
- Non-thread state dedup beyond rules already in earlier reconciler tickets.
- Retry policy and hard failure behavior.
- UI or persistence schema changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/llm/active-state-pipeline.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Thread dedup outcome is deterministic and threshold-driven by `ThreadType`.
- Equivalent unresolved loops cannot be added twice without explicit replacement semantics.
- Existing non-thread state categories are unaffected by thread-specific checks.
