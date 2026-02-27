# NARARCAUD-08: Midpoint Mechanics

**Wave**: 2 (Beat Architecture Enrichment)
**Effort**: M
**Dependencies**: None (Wave 1 independent)
**Spec reference**: A2 — Beat Architecture gaps

## Summary

Add midpoint flagging to `StoryBeat` with `isMidpoint: boolean` and `midpointType: 'FALSE_VICTORY' | 'FALSE_DEFEAT' | null`. The structure prompt should require exactly one midpoint per story, and the analyst should evaluate midpoint delivery when reached.

## Files to Touch

- `src/models/story-arc.ts` — add `readonly isMidpoint: boolean`, `readonly midpointType: 'FALSE_VICTORY' | 'FALSE_DEFEAT' | null` to `StoryBeat`
- `src/llm/schemas/structure-schema.ts` — add both fields
- `src/llm/prompts/structure-prompt.ts` — add midpoint flagging requirement
- `src/llm/prompts/analyst-prompt.ts` — evaluate midpoint delivery when reached
- `src/engine/structure-types.ts` — add fields to duplicate result
- `src/engine/structure-factory.ts` — thread fields
- `prompts/structure-prompt.md` — update doc
- `prompts/analyst-prompt.md` — update doc

## Out of Scope

- Structure rewrite prompt (midpoint already in completed beats)
- Planner context

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: structure schema validates midpoint fields
- [ ] Unit test: `createStoryStructure` maps midpoint fields
- [ ] Unit test: `buildAnalystPrompt` includes midpoint evaluation when active beat is midpoint
- [ ] Invariant: All existing tests pass
