# STOARCIMP-04: Add role to CompletedBeat and update structure rewrite support

**Phase**: 1 (Data Model Enrichment)
**Spec sections**: 1.7 (structure-state tracking already done in STOARCIMP-02), 1.8, 3.2
**Depends on**: STOARCIMP-01, STOARCIMP-02, STOARCIMP-03
**Blocks**: STOARCIMP-07

## Description

Ensure the structure rewrite pipeline is aware of beat roles:

1. **`CompletedBeat` type** (`types.ts`): Add `role: string` field.
2. **`extractCompletedBeats`** (`structure-rewrite-support.ts`): Include `role: beat.role` in extracted beats.
3. **`formatCompletedBeats`** (`structure-rewrite-prompt.ts`): Include `[role]` in the formatted output string for each beat.
4. **`validatePreservedBeats`** (`structure-rewrite-support.ts`): Verify that preserved beats retain their `role` field unchanged.
5. **Structure rewrite prompt** (`structure-rewrite-prompt.ts`): Update OUTPUT SHAPE to include `premise`, `pacingBudget`, and `role`. Update few-shot example to include these fields. Add requirement "Preserve beat roles from completed beats."
6. **Structure rewrite schema** (`structure-schema.ts`): If the rewrite uses the same schema as generation, this is already handled by STOARCIMP-03. If it uses a separate schema, update it here.

## Files to touch

| File | Change |
|------|--------|
| `src/llm/types.ts` | Add `role: string` to `CompletedBeat` interface. |
| `src/engine/structure-rewrite-support.ts` | In `extractCompletedBeats`, add `role: beat.role` to pushed objects. In `validatePreservedBeats`, check `role` matches. |
| `src/llm/prompts/structure-rewrite-prompt.ts` | Update `formatCompletedBeats` to include `[${beat.role}]`. Update OUTPUT SHAPE section. Update few-shot example. Add preservation requirement. |
| `test/unit/engine/structure-rewrite-support.test.ts` | Test that `extractCompletedBeats` includes `role`. Test that `validatePreservedBeats` fails if role changes. |
| `test/unit/llm/prompts/structure-rewrite-prompt.test.ts` | Test that `formatCompletedBeats` output includes role string. Verify few-shot includes new fields. |
| `test/unit/llm/types.test.ts` | If `CompletedBeat` has dedicated tests, update them to include `role`. |

## Out of scope

- `BeatRole` type definition -- STOARCIMP-01.
- `AccumulatedStructureState` fields -- STOARCIMP-02.
- Structure generation schema/parser -- STOARCIMP-03.
- Analyst types or schemas -- STOARCIMP-05.
- Continuation prompt changes -- STOARCIMP-08.
- Runtime pacing logic in `page-service.ts` -- STOARCIMP-06.

## Acceptance criteria

### Tests that must pass

1. **`extractCompletedBeats` includes `role`**: Given a structure with concluded beats that have `role` values, the returned `CompletedBeat[]` includes `role` on each item.
2. **`formatCompletedBeats` includes `[role]`**: The formatted string for each beat contains the role in brackets (e.g., `[setup]`, `[turning_point]`).
3. **`validatePreservedBeats` checks role**: If a rewritten structure changes a preserved beat's `role`, validation fails.
4. **`validatePreservedBeats` passes when role matches**: If role is unchanged, validation passes.
5. **Few-shot example includes `premise`, `pacingBudget`, and `role`**: The assistant message in `buildStructureRewritePrompt` contains these fields.
6. **OUTPUT SHAPE mentions `premise`, `pacingBudget`, and `role`**: The user message includes these in the output shape description.
7. **All existing structure-rewrite-support and structure-rewrite-prompt tests pass**.
8. **TypeScript build (`npm run typecheck`) passes**.

### Invariants that must remain true

- **Structure rewrite preservation**: Rewritten structures include completed beats with unchanged descriptions, objectives, and now also roles.
- **Acyclic graph**: No page links create cycles -- untouched.
- **All existing tests pass**.
