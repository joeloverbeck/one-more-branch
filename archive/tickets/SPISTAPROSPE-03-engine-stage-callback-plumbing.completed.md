# SPISTAPROSPE-03: Thread stage callbacks through engine prompt boundaries

## Status
**Status**: ✅ COMPLETED

## Summary
Add optional progress callback plumbing through engine generation paths and emit stage start/complete events immediately around prompt call boundaries, including retry attempt metadata.

## Depends on
- `specs/spinner-stage-progress-spec.md`

## Blocks
- `tickets/SPISTAPROSPE-04-route-progress-lifecycle-wiring.md`

## File list it expects to touch
- `src/engine/page-service.ts`
- `src/engine/story-engine.ts`
- `src/engine/story-service.ts`
- `src/engine/types.ts`
- `src/engine/index.ts` (if type exports are extended)
- `test/unit/engine/page-service.test.ts`
- `test/unit/engine/story-service.test.ts`
- `test/unit/engine/story-engine.test.ts`
- `test/unit/engine/index.test.ts` (if type exports change)

## Implementation checklist
1. Add optional callback signature in generation orchestration contracts (no required-callsite breakage).
2. Emit stage start immediately before each prompt call.
3. Emit stage complete immediately after successful parse/transform of each prompt response.
4. Emit repeated start/complete events for retries with incremented `attempt` values.
5. Map new-story structure generation period to existing MVP stage `RESTRUCTURING_STORY`.
6. Do not emit non-prompt internal stages (for example, reconciler-only processing).
7. Keep callback fully optional and backward compatible for all existing callsites.

## Out of scope
- HTTP route parsing for `progressId`.
- Polling endpoint and frontend spinner rendering.
- Prompt content/schema changes.
- Any persistence/model migration.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/story-engine.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/story-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Generation output behavior is unchanged when no callback is provided.
- Retry semantics remain identical to current behavior; only observability signals are added.
- Reconciler/non-prompt internal steps are not exposed as prompt stages.
- Branching invariants remain intact (ending pages zero choices, non-ending pages at least two choices).

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Added optional generation-stage callback contracts in engine types and exports.
  - Threaded callback plumbing through `StoryEngine` -> `story-service` -> `page-service` without breaking existing callsites.
  - Emitted prompt-boundary stage events (start/complete + attempt) for planner, opening/continuation writer, analyst, and new-story structure generation (`RESTRUCTURING_STORY`).
  - Kept non-prompt internal reconciler steps out of callback stage events.
  - Added/updated unit tests covering callback propagation, retry attempt emission, and prompt-boundary stage semantics.
- Deviations from original plan:
  - Dependency and scope assumptions were corrected first to match the current repository state (missing ticket dependency replaced with spec reference; test/file list aligned).
  - No LLM module signature changes were required.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/story-engine.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/story-service.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/types.test.ts`
  - `npm run typecheck`
