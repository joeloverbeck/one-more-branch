# STOARCGEN-017: Shared Structure Prompt Context Builders

**Status**: TODO
**Depends on**: STOARCGEN-009
**Blocks**: STOARCGEN-010, STOARCGEN-013

## Summary

Extract the duplicated structure-generation context formatting from the current one-shot structure prompt and the new macro architecture prompt into shared, prompt-domain builders.

This is not a generic "architecture brief compiler" stage. It is a code-level consolidation ticket whose job is to keep Call 1, Call 2, and rewrite prompt variants aligned without copy-pasting the same world/character/spine/kernel/premise-promise formatting logic across multiple prompt files.

## Problem

`src/llm/prompts/structure-prompt.ts` and `src/llm/prompts/macro-architecture-prompt.ts` now duplicate substantial `StructureContext` rendering logic:
- decomposed character formatting
- decomposed world formatting
- `startingSituation`
- spine section injection
- tone feel / tone avoid rendering
- concept stakes
- premise promise / concept verification sections
- kernel section
- genre obligation context

If Call 2 and rewrite variants are implemented directly on top of this state, the duplication will spread again into:
- `milestone-generation-prompt.ts`
- macro rewrite prompt variant
- milestone rewrite prompt variant

That is the wrong architecture. Prompt-local policy should differ, but shared structure-context rendering should have one canonical home.

## Desired Architecture

Create a shared prompt-context builder layer for structure-generation prompts.

That layer should:
- stay in the prompt domain, not the runtime structure domain
- own reusable `StructureContext` rendering sections
- make call-specific prompt files compose shared sections plus their unique requirements/output contracts
- keep the shared pieces data-oriented and easy to test individually

This is distinct from `STOARCGEN-016`:
- `STOARCGEN-016` owns structure normalization/defaulting/migration semantics
- `STOARCGEN-017` owns prompt-context rendering reuse for structure-generation prompts

## Files to Touch

### New files
- `src/llm/prompts/sections/structure-generation/shared-context.ts` — shared builders for common structure-generation prompt sections

### Modified files
- `src/llm/prompts/structure-prompt.ts` — delegate shared section rendering to the new helper
- `src/llm/prompts/macro-architecture-prompt.ts` — delegate shared section rendering to the new helper
- `src/llm/prompts/structure-rewrite-prompt.ts` — reuse the shared helper where rewrite prompt context overlaps with initial generation
- `src/llm/prompts/index.ts` — only if new exports are warranted

Future consumers expected to use this seam once implemented:
- `src/llm/prompts/milestone-generation-prompt.ts` (STOARCGEN-010)
- macro-rewrite + milestone-rewrite prompt variants (STOARCGEN-013)

## Detailed Changes

### Shared builder API

Create explicit, narrowly-scoped builders rather than one giant string factory. For example:

```typescript
buildStructureGenerationWorldSection(context)
buildStructureGenerationCharacterSection(context)
buildStructureGenerationToneSection(context)
buildStructureGenerationConceptStakesSection(context)
buildStructureGenerationPremisePromiseSection(context)
buildStructureGenerationSignatureScenarioSection(context)
buildStructureGenerationKernelSection(context)
buildStructureGenerationSharedContext(context)
```

Exact names may differ, but the split must support:
- reuse across Call 1 / Call 2 / rewrite prompts
- selective inclusion of sections without if/else sprawl
- easy unit testing of shared section output

### Constraints

- Do not introduce a new intermediate runtime data model
- Do not create a new pipeline stage
- Do not move prompt-specific requirements/output-shape text into the shared helper
- Do not make the helper responsible for content policy or system prompt composition
- Keep `StructureContext` as the input contract

### Design standard

The shared helper should separate:
- shared context rendering
- call-specific instructions
- call-specific output contract

That keeps the prompt architecture extensible when future structure-related prompts are added.

## Out of Scope

- Structure normalization/defaulting (`STOARCGEN-016`)
- 3-call orchestration itself (`STOARCGEN-012`)
- Milestone schema/parser implementation (`STOARCGEN-010`)
- UI and downstream consumer updates

## Acceptance Criteria

### Tests that must pass

- New test: `test/unit/llm/prompts/sections/structure-generation/shared-context.test.ts`
- Updated test: `test/unit/llm/prompts/structure-prompt.test.ts`
- Updated test: `test/unit/llm/prompts/macro-architecture-prompt.test.ts`
- Rewrite prompt tests still pass if shared helpers are adopted there
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true

- Shared context formatting has one canonical implementation
- Call-specific prompt behavior remains local to each prompt file
- No change to prompt semantics beyond consolidation
- No aliasing, no duplicate helper forks, no stage abstraction creep
