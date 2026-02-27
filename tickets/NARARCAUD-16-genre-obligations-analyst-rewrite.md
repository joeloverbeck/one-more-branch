# NARARCAUD-16: Genre Obligations — Analyst & Rewrite Wiring

**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: M
**Dependencies**: NARARCAUD-15
**Spec reference**: C1-C3 (part 3) — Genre Contract gaps

## Summary

Complete the genre obligations pipeline by wiring analyst evaluation (does this scene fulfill an obligatory scene tag?) and structure rewrite preservation (fulfilled tags preserved in completed beats, remaining tags required in new beats).

## Files to Touch

- `src/llm/analyst-types.ts` — add `obligatorySceneFulfilled: string | null` to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — add field (required, nullable)
- `src/llm/prompts/analyst-prompt.ts` — evaluate obligatory scene fulfillment
- `src/llm/prompts/structure-rewrite-prompt.ts` — preserve fulfilled tags, require remaining
- `prompts/analyst-prompt.md` — update doc
- `prompts/structure-rewrite-prompt.md` — update doc

## Out of Scope

- Genre registry creation (NARARCAUD-14)
- Structure prompt wiring (NARARCAUD-15)

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: analyst schema includes `obligatorySceneFulfilled`
- [ ] Unit test: `buildAnalystPrompt` includes obligatory scene evaluation when active beat has tag
- [ ] Unit test: `buildStructureRewritePrompt` preserves fulfilled tags in completed beats
- [ ] Invariant: All existing tests pass
