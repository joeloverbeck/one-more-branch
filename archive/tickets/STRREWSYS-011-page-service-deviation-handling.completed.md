# STRREWSYS-011: Handle Deviation Detection in Page Service

## Status
Completed

## Summary
Integrate currently-available deviation and structure-version signals in `page-service` without introducing new rewrite orchestration. This ticket establishes safe behavior and version linkage in generated pages while STRREWSYS-012/013 are still pending.

## Dependencies
- STRREWSYS-005 (deviation types)
- STRREWSYS-006 (ContinuationGenerationResult)
- STRREWSYS-008 (deviation parsing)
- STRREWSYS-003 (story model structure versions)
- STRREWSYS-004 (page structure version reference)

## Reassessed Assumptions
1. `src/engine/structure-rewriter.ts` does not exist yet in this branch.
2. `src/engine/structure-manager.ts` does not expose rewrite-context/deviation helpers assumed by the original ticket.
3. Full rewrite-trigger behavior (new version creation on deviation) is blocked by STRREWSYS-012/013 implementation.
4. `generateNextPage` currently ignores deviation payload entirely and does not assign `structureVersionId` on generated pages.

## Scope Update
- Keep this ticket focused on implementable `page-service` behavior now:
  - preserve existing generation flow and deviation no-op behavior
  - set generated page `structureVersionId` to the latest story structure version when present
  - add tests that lock this behavior in place
- Defer structure rewrite orchestration (`handleDeviation`, rewrite context creation, version mutation) to STRREWSYS-013 follow-up integration.

## Files to Touch

### Modified Files
- `src/engine/page-service.ts`
- `test/unit/engine/page-service.test.ts`

## Out of Scope
- Do NOT modify generateFirstPage (opening pages can't have deviation)
- Do NOT implement structure-rewriter orchestration here (handled in STRREWSYS-013)
- Do NOT modify UI or routes
- Do NOT mutate story structure versions in this ticket

## Implementation Details

### `src/engine/page-service.ts` Changes

- Add `getLatestStructureVersion` import.
- In `generateNextPage`, resolve `currentStructureVersion` before page creation.
- Set `createPage({ structureVersionId: currentStructureVersion?.id ?? null })`.
- Keep deviation behavior as no-op for now (no rewrite call in this ticket).

### `test/unit/engine/page-service.test.ts` Updates

```typescript
describe('generateNextPage structure version linkage', () => {
  it('should set structureVersionId to latest story structure version when present');
  it('should leave structureVersionId null when story has no structure versions');
});

describe('generateNextPage deviation behavior (current scope)', () => {
  it('should keep existing generation flow when deviation is present');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/engine/page-service.test.ts`
- Run with: `npm test -- test/unit/engine/page-service.test.ts`

### Invariants That Must Remain True
1. **I3: Page References Valid Version** - Generated next pages reference latest version ID when available.
2. **Existing functionality preserved** - Generation and structure progression continue to work without rewrite orchestration.
3. **Deviation is non-breaking pre-rewriter** - Presence of deviation payload does not break page generation.
4. **Existing tests pass** - `npm run test:unit` passes.

## Technical Notes
- This ticket intentionally does not trigger structure rewrites because dependencies are not yet implemented in code.
- Full rewrite integration remains in STRREWSYS-013 follow-up once `structure-rewriter` and related helpers exist.

## Outcome
- **Originally planned:** Trigger rewrite orchestration from `page-service` on detected deviation, create rewritten structure versions, and progress using rewritten structure.
- **Actually changed:** Implemented the currently feasible integration in `page-service` by attaching the latest structure version ID to generated next pages (`structureVersionId`), and validated deviation remains non-breaking no-op until STRREWSYS-013 lands.
- **Test hardening added:** Added/updated unit tests in `test/unit/engine/page-service.test.ts` to lock in structure-version linkage behavior and explicit deviation no-op behavior.
