# NARARCAUD-23: Information Asymmetry — Model & Analyst

**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: None
**Spec reference**: F3 (part 1) — Subsystem gaps

## Summary

Create the `KnowledgeAsymmetry` data model tracking what each character knows, believes falsely, and keeps secret. Wire analyst detection so the analyst identifies asymmetry changes per scene.

## Files to Create

- `src/models/state/knowledge-state.ts` — `KnowledgeAsymmetry` interface: `characterName`, `knownFacts: readonly string[]`, `falseBeliefs: readonly string[]`, `secrets: readonly string[]` (all required)

## Files to Touch

- `src/models/state/index.ts` — export new types
- `src/llm/analyst-types.ts` — add asymmetry detection fields to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — add knowledge asymmetry output fields
- `src/llm/prompts/analyst-prompt.ts` — add information asymmetry detection instruction
- `prompts/analyst-prompt.md` — update doc

## Out of Scope

- Page storage (NARARCAUD-24)
- Planner context
- Serialization

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: `KnowledgeAsymmetry` interface validates
- [ ] Unit test: analyst schema includes asymmetry fields
- [ ] Invariant: All existing tests pass
