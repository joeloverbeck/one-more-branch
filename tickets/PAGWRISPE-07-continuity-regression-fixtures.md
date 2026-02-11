# PAGWRISPE-07: Continuity Regression Coverage for Creative-Only Writer
**Status**: Draft

## Summary
Add/update fixture-based continuation quality tests to ensure creative-only writer refactor does not degrade continuity quality.

## File list it expects to touch
- `test/unit/llm/prompts/continuation/context-sections.test.ts`
- `test/unit/llm/prompts/continuation/writer-structure-context.test.ts`
- `test/integration/engine/story-engine.test.ts`
- `test/integration/engine/page-service.test.ts`
- `test/fixtures/` (only if new fixture data is necessary)

## Implementation checklist
1. Add assertions that continuation prompts still preserve:
   - recent scene continuity
   - ancestor summary continuity
   - structure-beat continuity hints.
2. Add regression tests that compare expected continuity-critical prompt fragments.
3. Add/update integration assertions proving continuation pages still reference immediate prior context correctly after writer contract changes.
4. Use deterministic fixtures only; avoid brittle LLM-text exact-match expectations.

## Out of scope
- Do not score prose quality subjectively.
- Do not add new non-deterministic snapshot tests.
- Do not modify production prompt behavior solely to satisfy fragile assertions.
- Do not expand test runtime substantially with broad end-to-end suites.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/continuation/context-sections.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/continuation/writer-structure-context.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/story-engine.test.ts`

### Invariants that must remain true
- Continuation prompt context ordering remains chronological.
- Story structure guidance remains available when structure state exists.
- Continuity context is preserved without reintroducing writer-owned state mutation instructions.
