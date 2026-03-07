# WILCONPIP-10: Concept Seeder/Architect/Engineer Content Packet Context

**Effort**: M
**Dependencies**: WILCONPIP-01
**Spec reference**: "Concept Seeder Changes", "Concept Architect Changes", "Concept Engineer Changes"

## Summary

Extend the concept pipeline's seeder, architect, and engineer stages to accept optional content packets as context. When content packets are provided, the prompts include a `CONTENT PACKETS` section instructing the LLM to ground its output in the packet's material (wildnessInvariant, socialEngine, signatureImage, etc.).

This is a context-only change -- content packet fields are passed to prompts but NOT added to `ConceptSeedFields`, `ConceptCharacterWorldFields`, or `ConceptEngineFields` (which are `Pick<ConceptSpec, ...>` types).

## Files to Touch

- `src/models/concept-generator.ts` — add `contentPackets?: readonly ContentPacket[]` to `ConceptSeederContext`, `ConceptArchitectContext`, `ConceptEngineerContext`
- `src/llm/prompts/concept-seeder-prompt.ts` — add optional `CONTENT PACKETS` section when packets provided
- `src/llm/prompts/concept-architect-prompt.ts` — add optional content packet grounding instructions
- `src/llm/prompts/concept-engineer-prompt.ts` — add optional content packet grounding instructions

## Out of Scope

- Changes to `ConceptSeedFields`, `ConceptCharacterWorldFields`, or `ConceptEngineFields` types
- Changes to `ConceptSpec` type
- Changes to concept evaluator — WILCONPIP-12
- Changes to concept verifier — WILCONPIP-13
- Changes to concept evolver — WILCONPIP-14
- Changes to concept stress tester — WILCONPIP-15
- Prompt schema changes (no new output fields required)
- Routes or service layer

## Acceptance Criteria

### Tests

- [ ] Unit test: `ConceptSeederContext` accepts `contentPackets` field
- [ ] Unit test: `ConceptArchitectContext` accepts `contentPackets` field
- [ ] Unit test: `ConceptEngineerContext` accepts `contentPackets` field
- [ ] Unit test: `buildConceptSeederPrompt` includes `CONTENT PACKETS` section when packets provided
- [ ] Unit test: `buildConceptSeederPrompt` omits `CONTENT PACKETS` section when packets undefined
- [ ] Unit test: seeder `CONTENT PACKETS` section includes each packet's coreAnomaly, wildnessInvariant, socialEngine, signatureImage
- [ ] Unit test: `buildConceptArchitectPrompt` includes content packet grounding instructions when packets provided
- [ ] Unit test: architect prompt instructs at least one keyInstitution from packet's socialEngine
- [ ] Unit test: `buildConceptEngineerPrompt` includes content packet grounding instructions when packets provided
- [ ] Unit test: engineer prompt instructs elevatorParagraph to preserve packet's signature image

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged (existing callers pass `undefined` for `contentPackets`)
- [ ] `ConceptSeedFields` type is unchanged (still `Pick<ConceptSpec, ...>`)
- [ ] `ConceptSpec` type is unchanged
- [ ] Prompt output schemas are unchanged
