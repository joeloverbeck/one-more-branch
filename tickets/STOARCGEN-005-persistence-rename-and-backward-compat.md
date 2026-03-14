# STOARCGEN-005: Persistence Layer Rename + Backward Compatibility

**Status**: TODO
**Depends on**: STOARCGEN-001
**Blocks**: STOARCGEN-007

## Summary

Update all persistence files to use `milestone` terminology and add backward compatibility hooks so that stories saved with the old `beat` schema keys can still be loaded. This is critical for not breaking existing saved stories.

## Files to Touch

- `src/persistence/page-serializer.ts` — Rename beat refs, add `beats` → `milestones` key mapping on load
- `src/persistence/page-serializer-types.ts` — Rename serialized type fields
- `src/persistence/story-serializer.ts` — Rename beat refs, add backward compat on load
- `src/persistence/story-serializer-types.ts` — Rename serialized type fields (if exists)
- `src/persistence/converters/structure-state-converter.ts` — Rename beat refs, add backward compat
- `src/persistence/converters/analyst-result-converter.ts` — Rename beat refs (if any)

## Detailed Changes

### Backward Compatibility Mapping (in `parseEntity` hooks)

When loading serialized JSON, the following old keys must be transparently mapped:

| Old JSON key | New internal field |
|---|---|
| `"beats"` (in act objects) | `milestones` |
| `"currentBeatIndex"` | `currentMilestoneIndex` |
| `"pagesInCurrentBeat"` | `pagesInCurrentMilestone` |
| `"beatProgressions"` | `milestoneProgressions` |
| `"beatProgressions[].beatId"` | `milestoneProgressions[].milestoneId` |
| `"invalidatedBeatIds"` | `invalidatedMilestoneIds` |
| `"pageBeatIndex"` | `pageMilestoneIndex` |

### Serialization (writing)
New stories are always written with the new key names (`milestones`, `currentMilestoneIndex`, etc.).

### `structure-state-converter.ts`
- Rename internal variable names
- Add upcasting: if incoming JSON has `currentBeatIndex`, map to `currentMilestoneIndex`
- If incoming JSON has `beatProgressions`, map to `milestoneProgressions`
- If progression entries have `beatId`, map to `milestoneId`

### `page-serializer.ts`
- Handle `pageBeatIndex` → `pageMilestoneIndex` on load
- Write `pageMilestoneIndex` on save

### `story-serializer.ts`
- Handle `acts[].beats` → `acts[].milestones` on load
- Write `acts[].milestones` on save

## Out of Scope

- Engine files (STOARCGEN-002, STOARCGEN-003)
- LLM files (STOARCGEN-004)
- UI files (STOARCGEN-006)
- Test files (STOARCGEN-007)
- New field defaults (exitCondition, actQuestion, etc.) — that's STOARCGEN-008
- Any logic changes beyond the rename + compat mapping

## Acceptance Criteria

### Tests that must pass
- `test/unit/persistence/page-serializer.test.ts` passes
- `test/integration/persistence/page-serializer-converters.test.ts` passes
- `test/integration/persistence/page-repository.test.ts` passes
- New backward compat test: loading a JSON blob with old `beats` key produces correct `milestones` field
- New backward compat test: loading a JSON blob with old `currentBeatIndex` produces correct `currentMilestoneIndex`
- New backward compat test: loading a JSON blob with old `beatProgressions[].beatId` produces correct `milestoneProgressions[].milestoneId`

### Invariants that must remain true
- Existing saved stories (with `beats` keys) load without errors
- Newly saved stories use `milestones` keys
- Round-trip: save → load → save produces consistent output (always new key names)
- No data loss during upcasting
- `parseEntity` hooks are non-destructive (unknown keys are preserved)
