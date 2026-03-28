# CHARFMT-001: Unify standalone character prompt formatter ownership

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: `archive/tickets/CHATDECAUD-001-chat-decomposition-audit-and-fix.md`

## Problem

Standalone character prompt formatting is currently split across multiple local formatter functions with overlapping field ownership:

- `formatStandaloneCharacterSummary()` in `src/models/standalone-decomposed-character.ts`
- `formatCharacterPsychologySummary()` in `src/llm/prompts/chat/chat-context-prompt-sections.ts`
- `formatCharacterIdentitySummary()` in `src/llm/prompts/chat/chat-context-prompt-sections.ts`

This duplication already caused real field drift: the chat psychology formatter silently fell behind the shared standalone formatter until `CHATDECAUD-001` corrected it. As long as summary field selection is duplicated across prompt-local helpers, the architecture remains brittle and prompt behavior can regress whenever the character schema evolves.

## Assumption Reassessment (2026-03-28)

1. `formatStandaloneCharacterSummary()` is currently reused by chat planner, spine foundation, spine generator, and character contextualizer prompt builders — CONFIRMED by direct import search.
2. Chat scene and chat character context prompts still own separate local identity and psychology formatting logic in `src/llm/prompts/chat/chat-context-prompt-sections.ts` — CONFIRMED.
3. The current duplication is semantic, not just cosmetic: the same `StandaloneDecomposedCharacter` fields are rendered by different helpers with different layouts and historically diverged in coverage — CONFIRMED by comparing the functions and the `CHATDECAUD-001` bug.
4. There is no existing shared “character summary schema” or formatter-spec module that defines which fields belong to which prompt detail level — CONFIRMED.

## Architecture Check

1. A single owned formatter seam for `StandaloneDecomposedCharacter` summaries is cleaner than prompt-local duplication because field coverage changes happen once and propagate intentionally to all consumers.
2. The right architecture is not “make every consumer use identical prose,” but “centralize field ownership and detail-level definitions, while allowing prompt-local headings/layout wrappers.”
3. No backwards-compatibility shims or alias APIs are needed. Existing callers can be migrated directly to the new shared formatter entry points and old local helpers removed.

## What to Change

### 1. Introduce a shared summary renderer for standalone character prompt views

Create a single shared rendering seam for `StandaloneDecomposedCharacter` that supports explicit detail levels such as:

- `identity`
- `psychology`
- `standalone` or equivalent shared full-summary mode

The shared seam should own:

- which fields appear at each level
- ordering of fields within each level
- exclusion of `rawDescription`
- rendering of composite fields like `stressVariants` and `focalizationFilter`

Prompt-local code may still wrap the output with section titles like `TARGET CHARACTER DECOMPOSITION`, but should not re-own field selection.

### 2. Migrate chat prompt builders off prompt-local field ownership

Update `src/llm/prompts/chat/chat-context-prompt-sections.ts` so that:

- scene-context identity summaries use the shared renderer
- psychology summaries use the shared renderer
- prompt-local helper code is reduced to section composition, not schema ownership

Remove redundant local formatter logic once callers are migrated.

### 3. Keep consumer-specific formatting differences explicit and narrow

If some consumers legitimately need different formatting shapes, encode those differences as explicit options in the shared renderer rather than forking field ownership into separate ad hoc functions.

The implementation should preserve the current architecture goal:

- chat scene context stays identity-focused
- chat psychology context gets the full structured psychology surface it needs
- planner/spine/contextualizer consumers can continue to use a stable shared standalone profile

## Files to Touch

- `src/models/standalone-decomposed-character.ts` (modify)
- `src/llm/prompts/chat/chat-context-prompt-sections.ts` (modify)
- `src/llm/prompts/chat/chat-scene-context-prompt.ts` (modify, if needed for API changes)
- `src/llm/prompts/chat/chat-character-context-prompt.ts` (modify, if needed for API changes)
- `src/llm/prompts/chat/chat-planner-prompt.ts` (modify, only if call shape changes)
- `src/llm/prompts/spine-foundation-prompt.ts` (modify, if call shape changes)
- `src/llm/prompts/character-contextualizer-prompt.ts` (modify, if call shape changes)
- `src/llm/spine-generator.ts` (modify, if call shape changes)

## Out of Scope

- Changing the `StandaloneDecomposedCharacter` interface itself
- Introducing compatibility aliases for old formatter names
- Rewriting unrelated prompt builders that do not consume standalone character summaries
- Changing prompt-stage responsibilities or prompt wording beyond what the formatter refactor requires

## Acceptance Criteria

### Tests That Must Pass

1. There is exactly one shared owner for standalone character summary field selection by detail level.
2. Chat scene, chat psychology, planner, and other standalone-summary consumers continue to receive the expected detail level without `rawDescription`.
3. Adding a new supported structured field to the shared formatter contract requires updating one shared definition, not multiple prompt-local field lists.
4. Existing suite: `npm test`

### Invariants

1. `rawDescription` must never re-enter chat prompt summaries through formatter drift.
2. `StandaloneDecomposedCharacter` prompt field ownership must be centralized rather than duplicated across chat and non-chat prompt modules.

## Test Plan

### New/Modified Tests

1. `test/unit/models/standalone-decomposed-character.test.ts` — expand coverage to assert shared detail-level rendering behavior directly.
2. `test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts` — verify scene-context still receives identity-only summaries after the refactor.
3. `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts` — verify chat psychology summaries still include the full structured psychology surface after migrating to the shared renderer.
4. `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts` — verify planner-visible standalone summaries still include the expected fields after the shared renderer change.
5. Additional consumer tests under `test/unit/llm/prompts/` or `test/unit/llm/` as needed — verify spine/contextualizer consumers continue to receive the intended shared profile.

### Commands

1. `npm run test:unit -- --runInBand test/unit/models/standalone-decomposed-character.test.ts test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts test/unit/llm/prompts/chat/chat-planner-prompt.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
