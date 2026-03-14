# STOARCGEN-008: New Data Model Fields — AnchorMoments, Act Fields, Milestone exitCondition

**Status**: COMPLETED
**Depends on**: STOARCGEN-001 (models rename complete)
**Blocks**: STOARCGEN-009 through STOARCGEN-015

## Summary

Add the 7 new high-signal fields to the structure data model as specified in the architecture spec. This ticket is a schema-extension/migration ticket: it must keep the current single-call structure pipeline, runtime structure construction, and story persistence internally coherent while deferring the later prompt and pipeline redesign work.

This ticket does **not** implement the 3-call macro-architecture pipeline. It also does **not** make the new fields mandatory in the current structure prompt. Until the later tickets land, the current generator may omit them and the system must materialize canonical defaults without introducing aliases or dual schemas.

## Files to Touch

- `src/models/story-arc.ts` — Add new fields to `StoryMilestone`, `StoryAct`, `StoryStructure`; add `AnchorMoments` interface
- `src/models/structure-generation.ts` — Add new fields to `GeneratedMilestone`, `GeneratedAct`, `StructureGenerationResult`; add `MacroArchitectureResult` and `MacroAct` interfaces
- `src/models/index.ts` — Export new types
- `src/engine/structure-factory.ts` — Materialize runtime defaults when creating `StoryStructure`
- `src/llm/structure-response-parser.ts` — Accept optional new fields from the current one-shot structure response and default them when absent
- `src/llm/schemas/structure-schema.ts` — Extend the current structure response schema so the parser/factory contract stays coherent
- `src/persistence/story-serializer.ts` — Persist canonical fields and default missing `anchorMoments`, act fields, and milestone fields on load
- `src/persistence/story-serializer-types.ts` — Extend the persisted story structure file shape with the new canonical fields

## Files Explicitly Out of Scope

- `src/persistence/converters/structure-state-converter.ts` — structure progression state does not own `StoryStructure` schema
- `src/persistence/page-serializer.ts` — page serialization only stores page-local indices and state snapshots, not structure definitions
- Prompt orchestration files for the future multi-call redesign (`STOARCGEN-009` through `STOARCGEN-012`)

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

### Current-pipeline compatibility rule

The current codebase still generates structure in a single LLM call. Therefore this ticket must keep that flow valid:

- The current schema/parser may treat the new fields as optional for now.
- The runtime/domain model must always expose canonical values for the new fields.
- Defaulting belongs at the boundaries that own `StoryStructure` creation/deserialization:
  - `parseStructureResponseObject()` for current LLM output
  - `createStoryStructure()` for runtime materialization
  - `deserializeStory()` for persisted story loading

Do **not** add page-level compatibility shims or alternate legacy key names.

### Persistence backward compatibility
On story deserialization:
- Missing `exitCondition` on milestones → defaults to `''`
- Missing `actQuestion` on acts → defaults to `''`
- Missing `exitReversal` on acts → defaults to `''`
- Missing `promiseTargets` on acts → defaults to `[]`
- Missing `obligationTargets` on acts → defaults to `[]`
- Missing `anchorMoments` on structure → generate sensible default based on act count

The persisted file format should remain canonical `milestone` terminology only. Do not add `beat` aliases, dual reads, or alternate writer formats.

## Out of Scope

- Prompts that produce these fields (STOARCGEN-009, STOARCGEN-010)
- Validation logic (STOARCGEN-011)
- Pipeline orchestration (STOARCGEN-012)
- Downstream consumers that read these fields (STOARCGEN-014)
- UI display of these fields (STOARCGEN-015)
- Rewrite pipeline changes (STOARCGEN-013)
- Making the new fields hard-required in the current structure prompt/schema before the later prompt tickets land

## Acceptance Criteria

### Tests that must pass
- `npm run typecheck` passes
- `npm run lint` passes
- `test/unit/models/story-arc.test.ts` — New tests covering the expanded runtime shape
- `test/unit/engine/structure-factory.test.ts` — New tests that `createStoryStructure()` materializes canonical defaults for absent fields and preserves provided values
- `test/unit/llm/structure-response-parser.test.ts` — New tests that the current one-shot parser accepts/normalizes optional new fields without making them required yet
- `test/unit/persistence/story-serializer.test.ts` — Round-trip and backward-compat tests for missing `anchorMoments`, missing act fields, and missing milestone `exitCondition`
- Update any impacted typed fixtures/mocks used by structure-generation, story-service, structure-rewriter, or related tests so the expanded interfaces remain valid
- New test: Loading a story JSON blob missing `anchorMoments` produces a valid default
- New test: Loading a story JSON blob missing `actQuestion` / `exitReversal` / `promiseTargets` / `obligationTargets` produces correct defaults
- New test: Loading a story JSON blob missing milestone `exitCondition` produces correct defaults

### Invariants that must remain true
- All existing stories continue to load without errors
- New fields are readonly on runtime types
- `MacroArchitectureResult` type matches spec interface exactly
- Default values are non-breaking (empty strings, empty arrays, sensible anchor defaults)
- No existing field semantics change
- The current one-shot structure generator remains functional until later tickets replace it

## Architectural Notes

This ticket is beneficial relative to the current architecture only if it is implemented as a **single canonical schema extension** across:

1. generated structure result
2. runtime `StoryStructure`
3. persisted story structure

That is cleaner than postponing the model change or scattering compatibility into page/state serializers, because it keeps ownership local to the structure domain and avoids temporary aliasing debt.

The cleaner long-term direction after this ticket remains:

- one shared source of truth for structure defaults/migrations
- later prompt/pipeline tickets making these fields produced intentionally rather than backfilled
- no backwards-compat aliases once old stories have been migrated through canonical deserialization/re-save

## Outcome

- Completion date: 2026-03-14
- What actually changed:
  - Added canonical `anchorMoments`, act-level fields, and milestone `exitCondition` to the runtime and generation models.
  - Extended the current one-shot structure schema/parser so these fields can be accepted when present and defaulted when absent.
  - Materialized the new fields in `createStoryStructure()` and preserved them through rewrite support/rewriter flows.
  - Extended story persistence file types and `story-serializer` round-tripping/defaulting for legacy saved stories.
  - Updated the affected unit tests and typed fixtures across structure parsing, structure construction, story persistence, and structure rewrite support.
- Deviations from the original plan:
  - Removed `page-serializer` and `structure-state-converter` from scope because they do not own story structure schema.
  - Added `structure-factory`, `structure-response-parser`, `structure-schema`, `story-repository` tests, and rewrite-support/rewriter tests because they are part of the real blast radius.
  - Kept the current single-call structure generator architecture intact; this ticket did not implement the later 3-call redesign.
- Verification results:
  - `npm run typecheck`
  - `npm run test:unit -- --runInBand`
  - `npm run lint`
