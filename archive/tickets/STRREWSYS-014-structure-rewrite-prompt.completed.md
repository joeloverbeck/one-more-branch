# STRREWSYS-014: Create Structure Rewrite Prompt

## Status
Completed (2026-02-07)

## Summary
Added a dedicated structure-rewrite prompt builder for regeneration after deviation, aligned to the repository's message-based prompt architecture.

## Dependencies
- STRREWSYS-006 (StructureRewriteContext type)

## Reassessed Assumptions
1. Prompt modules return `ChatMessage[]` (`system` + `user`), not a raw string.
2. Content policy inclusion is handled via `buildSystemPrompt(...)` in the system message.
3. `CompletedBeat` includes required `beatId`; examples/tests must include it.
4. Prompt-specific tests are organized under `test/unit/llm/prompts/`.
5. Prompt barrel exports in `src/llm/prompts/index.ts` use `.js`-suffixed paths.

## Scope Update
- Implement `buildStructureRewritePrompt(context, options?)` as a prompt builder returning `ChatMessage[]`.
- Keep changes limited to prompt construction, prompt barrel export, and prompt unit tests.
- Preserve existing prompt APIs and system-prompt behavior.

## Files Touched

### New Files
- `src/llm/prompts/structure-rewrite-prompt.ts`
- `test/unit/llm/prompts/structure-rewrite-prompt.test.ts`

### Modified Files
- `src/llm/prompts/index.ts`

## Out of Scope (Preserved)
- No changes to `src/llm/prompts/continuation-prompt.ts`
- No changes to `src/llm/prompts/structure-prompt.ts`
- No rewrite orchestration implementation
- No system prompt modifications

## Implementation Details

### `src/llm/prompts/structure-rewrite-prompt.ts`
Implemented `buildStructureRewritePrompt(context, options?)` with:
- system message from `buildSystemPrompt(options)`
- story context (character, world, tone, original theme)
- canon completed-beat section including act/beat numbers, `beatId`, objective, resolution
- explicit fallback text when no completed beats exist
- deviation location/reason and current narrative summary
- regeneration scope text derived from `currentActIndex`
- explicit required output format sections:
  - `REGENERATED_ACTS:`
  - `ACT_N:` templates with `NAME`, `OBJECTIVE`, `STAKES`, `ENTRY_CONDITION`, `BEATS`
  - `THEME_EVOLUTION:`

### `src/llm/prompts/index.ts`
Added export:
```typescript
export { buildStructureRewritePrompt } from './structure-rewrite-prompt.js';
```

### `test/unit/llm/prompts/structure-rewrite-prompt.test.ts`
Added coverage for:
- system message content policy presence (`NC-21` + `CONTENT_POLICY`)
- required context fields in user prompt
- canon completed-beat formatting and empty-state fallback
- act-dependent regeneration scope (Act 1/2/3 cases)
- required output sections and act field instructions
- preserved-beat do-not-regenerate instructions

## Validation
- `npm test -- test/unit/llm/prompts/structure-rewrite-prompt.test.ts` passed
- `npm run test:unit` passed

## Outcome
- **Originally planned:** Add a structure rewrite prompt returning a raw string and a standalone prompt test.
- **Actually changed:** Implemented the prompt using existing `ChatMessage[]` conventions with system+user messages, preserving repository prompt architecture and content-policy handling.
- **Additional alignment:** Included required `CompletedBeat.beatId` usage and added tests in the existing `test/unit/llm/prompts/` test organization.
