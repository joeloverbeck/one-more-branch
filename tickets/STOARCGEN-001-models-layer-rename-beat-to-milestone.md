# STOARCGEN-001: Models Layer Rename — beat to milestone

**Status**: TODO
**Depends on**: None (this is the foundation ticket)
**Blocks**: STOARCGEN-002 through STOARCGEN-007

## Summary

Rename all `beat`-related types, interfaces, functions, and constants in the models layer from `beat` to `milestone`. This is the foundational rename that all other rename tickets depend on.

## Files to Touch

- `src/models/story-arc.ts` — All type/interface/function renames
- `src/models/structure-generation.ts` — `GeneratedBeat` → `GeneratedMilestone`, `GeneratedAct.beats` → `GeneratedAct.milestones`
- `src/models/page.ts` — `pageBeatIndex` → `pageMilestoneIndex` (if present)
- `src/models/index.ts` — Update re-exports

## Detailed Changes

### `src/models/story-arc.ts`

| Old | New |
|-----|-----|
| `BeatStatus` | `MilestoneStatus` |
| `BEAT_ROLES` | `MILESTONE_ROLES` |
| `BeatRole` | `MilestoneRole` |
| `StoryBeat` | `StoryMilestone` |
| `StoryAct.beats` | `StoryAct.milestones` |
| `BeatProgression` | `MilestoneProgression` |
| `BeatProgression.beatId` | `MilestoneProgression.milestoneId` |
| `AccumulatedStructureState.currentBeatIndex` | `AccumulatedStructureState.currentMilestoneIndex` |
| `AccumulatedStructureState.beatProgressions` | `AccumulatedStructureState.milestoneProgressions` |
| `AccumulatedStructureState.pagesInCurrentBeat` | `AccumulatedStructureState.pagesInCurrentMilestone` |
| `createEmptyAccumulatedStructureState()` | Update field names in return value |
| `createInitialStructureState()` | Update all beat refs to milestone |
| `getCurrentBeat()` | `getCurrentMilestone()` |
| `getBeatProgression()` | `getMilestoneProgression()` |
| `isLastBeatOfAct()` | `isLastMilestoneOfAct()` |
| `BeatDeviation` | `MilestoneDeviation` |
| `BeatDeviation.invalidatedBeatIds` | `MilestoneDeviation.invalidatedMilestoneIds` |
| `createBeatDeviation()` | `createMilestoneDeviation()` |
| `validateDeviationTargets()` | Update internal variable names |
| `isDeviation()` / `isNoDeviation()` | Keep names (they're generic), update type refs |

### `src/models/structure-generation.ts`

| Old | New |
|-----|-----|
| `GeneratedBeat` | `GeneratedMilestone` |
| `GeneratedAct.beats` | `GeneratedAct.milestones` |

### `src/models/page.ts`

| Old | New |
|-----|-----|
| `pageBeatIndex` | `pageMilestoneIndex` |

### `src/models/index.ts`

Update all re-exports to use new names.

## Out of Scope

- Engine files (STOARCGEN-002, STOARCGEN-003)
- LLM files (STOARCGEN-004)
- Persistence files (STOARCGEN-005)
- UI files (STOARCGEN-006)
- Test files (STOARCGEN-007)
- New fields (STOARCGEN-008)
- Any logic changes — this is purely a rename

## Acceptance Criteria

### Tests that must pass
- `npm run typecheck` passes (will fail until downstream consumers are updated — expected during this ticket's window)
- `test/unit/models/story-arc.test.ts` passes after updating its imports/references

### Invariants that must remain true
- All existing type semantics preserved — only names change
- `createEmptyAccumulatedStructureState()` returns the same shape (with renamed fields)
- `createInitialStructureState()` produces identical logical output
- `getCurrentMilestone()` behaves identically to old `getCurrentBeat()`
- `isLastMilestoneOfAct()` behaves identically to old `isLastBeatOfAct()`
- `MilestoneDeviation` enforces same constraint (at least one invalidated ID)
- No runtime behavior changes whatsoever
