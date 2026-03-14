# STOARCGEN-008: New Data Model Fields — AnchorMoments, Act Fields, Milestone exitCondition

**Status**: TODO
**Depends on**: STOARCGEN-001 (models rename complete)
**Blocks**: STOARCGEN-009 through STOARCGEN-015

## Summary

Add the 7 new high-signal fields to the data models as specified in the architecture spec. This ticket only adds the types, interfaces, and persistence backward-compat defaults — it does NOT implement the prompts or pipeline that populate them.

## Files to Touch

- `src/models/story-arc.ts` — Add new fields to `StoryMilestone`, `StoryAct`, `StoryStructure`; add `AnchorMoments` interface
- `src/models/structure-generation.ts` — Add new fields to `GeneratedMilestone`, `GeneratedAct`, `StructureGenerationResult`; add `MacroArchitectureResult` and `MacroAct` interfaces
- `src/models/index.ts` — Export new types
- `src/persistence/converters/structure-state-converter.ts` — Default missing new fields on load
- `src/persistence/story-serializer.ts` — Default missing `anchorMoments`, act fields on load
- `src/persistence/page-serializer.ts` — Default missing `pageMilestoneIndex`-related fields (if not already handled)

## Detailed Changes

### New type: `AnchorMoments`

```typescript
interface AnchorMoments {
  readonly incitingIncident: { readonly actIndex: number; readonly description: string };
  readonly midpoint: { readonly actIndex: number; readonly milestoneSlot: number; readonly midpointType: MidpointType };
  readonly climax: { readonly actIndex: number; readonly description: string };
  readonly signatureScenarioPlacement: { readonly actIndex: number; readonly description: string } | null;
}
```

### New fields on `StoryMilestone`
| Field | Type | Default for old data |
|-------|------|---------------------|
| `exitCondition` | `string` | `''` |

### New fields on `StoryAct`
| Field | Type | Default for old data |
|-------|------|---------------------|
| `actQuestion` | `string` | `''` |
| `exitReversal` | `string` | `''` |
| `promiseTargets` | `readonly string[]` | `[]` |
| `obligationTargets` | `readonly string[]` | `[]` |

### New fields on `StoryStructure`
| Field | Type | Default for old data |
|-------|------|---------------------|
| `anchorMoments` | `AnchorMoments` | Sensible default (see below) |

### Default `AnchorMoments` for old stories
```typescript
{
  incitingIncident: { actIndex: 0, description: '' },
  midpoint: { actIndex: 1, milestoneSlot: 0, midpointType: 'FALSE_DEFEAT' },
  climax: { actIndex: acts.length - 1, description: '' },
  signatureScenarioPlacement: null,
}
```

### New types for pipeline (in `structure-generation.ts`)
- `MacroArchitectureResult` — output of Call 1
- `MacroAct` — act-level output from Call 1
- Add new fields to `GeneratedMilestone`: `exitCondition: string`
- Add new fields to `GeneratedAct`: `actQuestion`, `exitReversal`, `promiseTargets`, `obligationTargets`
- Add `anchorMoments` to `StructureGenerationResult`

### Persistence backward compatibility
In `parseEntity` hooks / converters:
- Missing `exitCondition` on milestones → defaults to `''`
- Missing `actQuestion` on acts → defaults to `''`
- Missing `exitReversal` on acts → defaults to `''`
- Missing `promiseTargets` on acts → defaults to `[]`
- Missing `obligationTargets` on acts → defaults to `[]`
- Missing `anchorMoments` on structure → generate sensible default based on act count

## Out of Scope

- Prompts that produce these fields (STOARCGEN-009, STOARCGEN-010)
- Validation logic (STOARCGEN-011)
- Pipeline orchestration (STOARCGEN-012)
- Downstream consumers that read these fields (STOARCGEN-014)
- UI display of these fields (STOARCGEN-015)
- Rewrite pipeline changes (STOARCGEN-013)

## Acceptance Criteria

### Tests that must pass
- `npm run typecheck` passes
- `test/unit/models/story-arc.test.ts` — New tests for `AnchorMoments` type, new fields on `StoryAct` and `StoryMilestone`
- `test/unit/persistence/page-serializer.test.ts` — Backward compat tests for missing `exitCondition`
- `test/integration/persistence/page-serializer-converters.test.ts` — Backward compat tests for missing act fields and `anchorMoments`
- New test: Loading a story JSON blob missing `anchorMoments` produces a valid default
- New test: Loading a story JSON blob missing `actQuestion`/`exitReversal`/`promiseTargets`/`obligationTargets` produces correct defaults

### Invariants that must remain true
- All existing stories continue to load without errors
- New fields are readonly on runtime types
- `MacroArchitectureResult` type matches spec interface exactly
- Default values are non-breaking (empty strings, empty arrays, sensible anchor defaults)
- No existing field semantics change
