# NARARCAUD-05: Causal Linkage Between Beats

**Wave**: 1 (Quick Wins)
**Effort**: S
**Dependencies**: None
**Spec reference**: E1 — Causal Chain gaps

## Summary

Add a `causalLink` field to `StoryBeat` that captures the "because of that" relationship between consecutive beats. This enforces narrative causality rather than episodic "and then" sequencing.

## Files to Touch

- `src/models/story-arc.ts` — add `readonly causalLink: string | null` to `StoryBeat` (null for first beat only)
- `src/llm/schemas/structure-schema.ts` — add `causalLink` (nullable string)
- `src/llm/prompts/structure-prompt.ts` — add "because of that" instruction
- `src/llm/prompts/structure-rewrite-prompt.ts` — same instruction for regenerated beats
- `src/engine/structure-types.ts` — add `causalLink` to duplicate result type
- `src/engine/structure-factory.ts` — thread `causalLink`
- `prompts/structure-prompt.md` — update doc
- `prompts/structure-rewrite-prompt.md` — update doc

## Out of Scope

- Retrospective coherence check (NARARCAUD-25)
- Analyst evaluation of causal chain

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: `createStoryStructure` maps `causalLink`
- [ ] Unit test: `buildStructurePrompt` includes causal linkage instruction
- [ ] Unit test: `buildStructureRewritePrompt` includes causal linkage instruction
- [ ] Invariant: All existing tests pass
