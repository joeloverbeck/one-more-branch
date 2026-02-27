# NARARCAUD-06: Reflection Beat Role

**Wave**: 2 (Beat Architecture Enrichment)
**Effort**: M
**Dependencies**: None (Wave 1 independent)
**Spec reference**: A3 — Beat Architecture gaps

## Summary

Add `'reflection'` as a new `BeatRole` value. Reflection beats allow the narrative to pause for thematic deepening without requiring escalation. The analyst should not penalize lack of escalation during reflection beats.

## Files to Touch

- `src/models/story-arc.ts` — add `'reflection'` to `BeatRole` type
- `src/llm/schemas/structure-schema.ts` — add `'reflection'` to role enum
- `src/llm/prompts/structure-prompt.ts` — add reflection beat description
- `src/llm/prompts/structure-rewrite-prompt.ts` — same
- `src/engine/structure-state.ts` — handle `reflection` role (no escalation expected in progression)
- `src/llm/prompts/analyst-prompt.ts` — no escalation evaluation for reflection beats; evaluate thematic deepening
- `src/llm/prompts/sections/planner/continuation-context.ts` — add reflection directive in `buildEscalationDirective`
- `prompts/structure-prompt.md` — update doc
- `prompts/structure-rewrite-prompt.md` — update doc
- `prompts/analyst-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc

## Out of Scope

- New fields on StoryBeat
- Crisis type
- Midpoint mechanics
- Gap magnitude

## Acceptance Criteria

- [ ] `npm run typecheck` passes with `'reflection'` in BeatRole
- [ ] Unit test: structure schema accepts `reflection` role
- [ ] Unit test: `buildEscalationDirective` emits reflection-specific directive
- [ ] Unit test: `applyStructureProgression` handles reflection beats (no escalation assertion)
- [ ] Invariant: Existing beat progression tests still pass
