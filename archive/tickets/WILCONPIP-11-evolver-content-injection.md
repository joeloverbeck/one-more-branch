# WILCONPIP-11: Concept Evolver Content Injection Strategy

**Status**: COMPLETED
**Effort**: M
**Dependencies**: WILCONPIP-01, WILCONPIP-10
**Spec reference**: "Concept Evolver Integration"

## Summary

Extend the concept evolver to support content packet injection as a mutation strategy. Add `contentPackets` to `ConceptEvolverSeederContext` and `ConceptEvolverContext`. Add a `WILDNESS INVARIANTS` section to the evolver-seeder prompt that lists invariants from parent concepts and instructs evolved seeds to preserve or intensify them.

## Files to Touch

- `src/models/concept-generator.ts` — add `contentPackets?: readonly ContentPacket[]` to `ConceptEvolverSeederContext` and `ConceptEvolverContext`
- `src/llm/prompts/concept-evolver-seeder-prompt.ts` — add optional `CONTENT PACKETS` section and `WILDNESS INVARIANTS` section when packets/invariants provided
- `src/llm/concept-evolver.ts` — pass `contentPackets` through to architect and engineer contexts
- `src/llm/concept-evolver-seeder.ts` — pass `contentPackets` through to prompt builder

## Out of Scope

- Changes to `ConceptSeedFields` or `ConceptSpec`
- Evolver-seeder output schema changes (seeds are still `ConceptSeedFields[]`)
- ContentService changes
- Routes or UI
- Stress tester integration — WILCONPIP-15
- Concept evaluator changes — WILCONPIP-12

## Acceptance Criteria

### Tests

- [ ] Unit test: `ConceptEvolverSeederContext` accepts `contentPackets` field
- [ ] Unit test: `ConceptEvolverContext` accepts `contentPackets` field
- [ ] Unit test: `buildConceptEvolverSeederPrompt` includes `CONTENT PACKETS` section when packets provided
- [ ] Unit test: `buildConceptEvolverSeederPrompt` includes `WILDNESS INVARIANTS` section listing invariants from packets
- [ ] Unit test: `buildConceptEvolverSeederPrompt` omits both sections when packets undefined
- [ ] Unit test: evolver-seeder prompt instructs "preserve or intensify" wildness invariants
- [ ] Unit test: `evolveConceptIdeas` passes `contentPackets` to architect and engineer contexts
- [ ] Unit test: existing evolver calls (without contentPackets) still work unchanged

### Invariants

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All existing tests pass unchanged
- [x] Evolver-seeder output schema is unchanged (6 seeds, same fields)
- [x] `ConceptSeedFields` type is unchanged

## Outcome

- **Completion date**: 2026-03-07
- **Changes made**:
  - Added `contentPackets?: readonly ContentPacket[]` to `ConceptEvolverSeederContext` and `ConceptEvolverContext` in `src/models/concept-generator.ts`
  - Added `buildContentPacketsBlock()` and `buildWildnessInvariantsBlock()` to `src/llm/prompts/concept-evolver-seeder-prompt.ts`, conditionally included in user message
  - Added `contentPackets` passthrough to architect and engineer contexts in `src/llm/concept-evolver.ts`
  - Added 8 new tests across evolver-seeder-prompt and concept-evolver test files
- **Deviations**: None. `concept-evolver-seeder.ts` required no changes since it already passes the full context object to the prompt builder.
- **Verification**: typecheck passes, lint passes, 3002/3002 unit tests pass (241 suites)
