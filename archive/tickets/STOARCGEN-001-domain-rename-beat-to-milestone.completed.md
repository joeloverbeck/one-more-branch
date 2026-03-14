# STOARCGEN-001: Domain Rename — beat to milestone

**Status**: COMPLETED
**Depends on**: None
**Blocks**: STOARCGEN-008 and any downstream work that builds on the renamed story-architecture vocabulary

## Summary

Rename the story-architecture domain term `beat` to `milestone` across the active codebase in one coherent pass.

This ticket originally assumed a models-only foundation rename that could be completed before engine, LLM, persistence, UI, and tests were updated. That assumption does not match the current repository. `beat` is a cross-layer term used in model types, engine utilities, prompt/schema contracts, persistence, server/view helpers, client rendering, and tests. A partial rename would leave the tree uncompilable, create mixed vocabulary, and force temporary aliases or compatibility glue.

The corrected scope is an **atomic, end-to-end vocabulary migration** with **no backward compatibility layer and no aliasing**. Existing consumers should be updated to the new terminology directly. If persisted data or fixtures break, they should be migrated in code/tests rather than translated through fallback paths.

## Reassessed Assumptions

### What the original ticket got wrong

- `beat` is not isolated to `src/models/*`; it is deeply coupled to engine, LLM, persistence, UI, and test code.
- `pageBeatIndex` is not merely \"if present\"; it exists in the runtime `Page` model and downstream consumers/tests.
- Splitting the rename across STOARCGEN-002 through STOARCGEN-007 assumes the repository can tolerate mixed terminology between layers. It cannot, at least not while keeping `typecheck`, lint, and relevant tests green.
- The earlier plan assumed backward compatibility in persistence. That conflicts with current direction. This rename must not introduce upcasters, alias fields, or dual-read logic.
- “Pure rename” is directionally right, but some parser/schema/prompt contract changes are architecturally necessary because the serialized and LLM-facing keys are part of the domain model, not incidental internals.

### Architecture judgment

This rename is more beneficial than the current architecture because `beat` is semantically misleading in this codebase. The object behaves like a planning milestone, not a scene-level dramatic beat. Keeping the wrong term leaks conceptual confusion into prompts, schemas, evaluator logic, UI labels, and future model design. The clean architecture move is a single canonical vocabulary: `milestone` everywhere.

The rename itself should remain surgical. Do not bundle the 3-call pipeline or new data-model fields into this ticket. Those are separate architectural changes.

## Scope

### In scope

- Runtime model renames in `src/models/*`
- Engine file renames and consumer updates in `src/engine/*`
- LLM prompt/schema/parser/type updates in `src/llm/*`
- Persistence shape/key renames in `src/persistence/*`
- Server/view/client terminology updates in `src/server/*`, `src/views/*`, and `public/js/src/*`
- Test and fixture updates required to keep the repository green
- Generated client bundle regeneration after editing `public/js/src/*`

### Out of scope

- The 3-call structure-generation pipeline
- New runtime fields such as `exitCondition`, `actQuestion`, `exitReversal`, `promiseTargets`, `obligationTargets`, or `anchorMoments`
- Any intentional behavior changes unrelated to the vocabulary migration
- Compatibility shims, alias exports, or fallback parsing of old `beat` keys

## Target Rename Map

### Core model symbols

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
| `BeatDeviation` | `MilestoneDeviation` |
| `BeatDeviation.invalidatedBeatIds` | `MilestoneDeviation.invalidatedMilestoneIds` |
| `GeneratedBeat` | `GeneratedMilestone` |
| `GeneratedAct.beats` | `GeneratedAct.milestones` |
| `Page.pageBeatIndex` | `Page.pageMilestoneIndex` |
| `CreatePageData.pageBeatIndex` | `CreatePageData.pageMilestoneIndex` |

### Core function/file renames

| Old | New |
|-----|-----|
| `getCurrentBeat()` | `getCurrentMilestone()` |
| `getBeatProgression()` | `getMilestoneProgression()` |
| `isLastBeatOfAct()` | `isLastMilestoneOfAct()` |
| `createBeatDeviation()` | `createMilestoneDeviation()` |
| `parseBeatIndices()` | `parseMilestoneIndices()` |
| `getBeatOrThrow()` | `getMilestoneOrThrow()` |
| `upsertBeatProgression()` | `upsertMilestoneProgression()` |
| `src/engine/beat-utils.ts` | `src/engine/milestone-utils.ts` |
| `src/engine/beat-conclusion.ts` | `src/engine/milestone-conclusion.ts` |
| `src/engine/beat-alignment.ts` | `src/engine/milestone-alignment.ts` |

### Contract/key renames

- LLM schema keys and parser expectations should use `milestones`, not `beats`.
- Prompt text should consistently use `milestone` language when referring to the structure object.
- Serialized story/page/state data written by persistence should use only `milestone` keys.

## Files Expected To Change

This is intentionally grouped by subsystem instead of pretending the change is model-local.

### Models

- `src/models/story-arc.ts`
- `src/models/structure-generation.ts`
- `src/models/page.ts`
- `src/models/index.ts`
- Any additional `src/models/*` consumers surfaced by `typecheck`

### Engine

- `src/engine/beat-utils.ts` -> `src/engine/milestone-utils.ts`
- `src/engine/beat-conclusion.ts` -> `src/engine/milestone-conclusion.ts`
- `src/engine/beat-alignment.ts` -> `src/engine/milestone-alignment.ts`
- Remaining `src/engine/*` consumers of the renamed types/functions/fields

### LLM

- Structure prompts, rewrite prompts, continuation/context prompts, schemas, response parsers, generation helpers, and related types under `src/llm/*`

### Persistence

- Story/page/state serializers and converters under `src/persistence/*`

### Server/UI

- View helpers, route-adjacent data mappers, EJS templates, and `public/js/src/*`

### Tests/fixtures

- All affected tests and fixtures that reference renamed symbols, paths, object keys, or user-facing labels

## Implementation Rules

- Keep the migration atomic: no temporary aliases, no deprecated exports, no dual-key persistence/parsing.
- Prefer narrow edits. Rename the vocabulary without opportunistic refactors unless they are required to keep the architecture clean.
- If a broader structural cleanup becomes clearly justified while doing the rename, document it in this ticket before implementing it.
- Update generated artifacts only from their source files. For client JS, edit `public/js/src/*` and regenerate `public/js/app.js`.

## Acceptance Criteria

### Required verification

- `npm run typecheck` passes
- `npm run lint` passes
- Relevant renamed test suites pass, including model, engine, LLM, persistence, server, and client surfaces touched by the rename
- Any renamed generated artifact is regenerated from source
- No `beat`-named story-architecture symbols remain in active code paths except for natural-language uses unrelated to the structure domain

### Invariants

- Runtime behavior remains the same aside from the terminology change
- The story-architecture model uses a single canonical term: `milestone`
- Persistence writes only the renamed keys
- LLM schemas, prompts, and parsers agree on the renamed contract
- UI displays the renamed term consistently

## Testing Expectations

This ticket must leave the repository green. Do not rely on “expected temporary failures.”

At minimum, run:

- `npm run typecheck`
- `npm run lint`
- Relevant Jest suites covering the touched areas
- `npm run test:client` if client-rendering or bundled JS changes

If the rename exposes weak coverage around renamed invariants, add or strengthen tests in the same pass.

## Outcome

- Completed on: 2026-03-14
- Actual change: executed the rename as a single end-to-end migration across models, engine, LLM contracts, persistence, server/view helpers, client JS, fixtures, and tests.
- Deviation from original plan: the original staged “models first, downstream later” split was not viable. The work was collapsed into one coherent migration so the repository never relied on mixed terminology, aliases, or backward-compat parsing.
- Backward compatibility: none added. Persistence, prompt/schema contracts, and runtime types now write/read only `milestone` terminology.
- Verification:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:client`
  - `npm run test:unit -- --coverage=false`
  - `npm run test:integration`
