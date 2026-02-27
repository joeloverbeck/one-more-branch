# NARARCAUD-07: Crisis Type Per Beat

**Status**: COMPLETED
**Wave**: 2 (Beat Architecture Enrichment)
**Effort**: M
**Dependencies**: None (Wave 1 independent)
**Spec reference**: A1 — Beat Architecture gaps

## Reassessed Assumptions

1. `StoryBeat` currently carries `escalationType`, `uniqueScenarioHook`, and `approachVectors`; adding `crisisType` belongs in the same beat-level contract, not as an analyst-only concern.
2. Analyst and planner structural evaluation text is composed in `src/llm/prompts/continuation/story-structure-section.ts` and consumed by `analyst-prompt.ts` / planner context builders. Updating only `analyst-prompt.ts` would be incomplete.
3. Beat schema contracts flow through multiple layers, not just `story-arc` and structure schema:
   - `src/models/structure-generation.ts`
   - `src/llm/structure-rewrite-types.ts`
   - `src/engine/structure-factory.ts`
   - `src/engine/structure-rewriter.ts`
   - `src/engine/structure-rewrite-support.ts`
   - `src/persistence/story-serializer-types.ts`
   - `src/persistence/story-serializer.ts`
4. Prompt docs must track runtime prompt ownership. For this ticket that includes generated docs under `prompts/*.md` for structure, rewrite, analyst, and page planner guidance.

## Architectural Decision

Implement `crisisType` as a required nullable beat field (`CrisisType | null`) across all structure contracts.

Why this is better than current architecture:
- It elevates dilemma framing to a first-class structural invariant rather than inferring it later from prose.
- It gives planner/analyst deterministic intent to evaluate against.
- It stays extensible: future crisis families can be added in one enum and propagated through existing typed boundaries.

Out-of-scope alternatives rejected:
- Inferring crisis type only in analyst stage (too late and non-deterministic).
- Storing crisis type only in prompt text without schema/model fields (not enforceable).

## Implementation Scope

### Models and Contracts
- `src/models/story-arc.ts`
  - Add `CrisisType = 'BEST_BAD_CHOICE' | 'IRRECONCILABLE_GOODS'`
  - Add `readonly crisisType: CrisisType | null` to `StoryBeat`
- `src/models/structure-generation.ts`
  - Add `crisisType?: string | null` to `GeneratedBeat`
- `src/llm/structure-rewrite-types.ts`
  - Add `crisisType: string | null` to `CompletedBeat` and `PlannedBeat`

### Schema + Parsing + Mapping
- `src/llm/schemas/structure-schema.ts`
  - Add nullable enum `crisisType` to beat schema and required list
- `src/llm/structure-generator.ts`
  - Parse `crisisType` from model response
- `src/engine/structure-factory.ts`
  - Add `parseCrisisType`
  - Map beat `crisisType`
- `src/engine/structure-rewriter.ts`
  - Preserve and map `crisisType` for completed/regenerated beats
- `src/engine/structure-rewrite-support.ts`
  - Include `crisisType` in rewrite context payloads
- `src/persistence/story-serializer-types.ts`
  - Include beat `crisisType` field in serialized shape
- `src/persistence/story-serializer.ts`
  - Round-trip `crisisType` across serialize/deserialize

### Prompt Runtime + Prompt Docs
- Runtime prompts:
  - `src/llm/prompts/structure-prompt.ts`
  - `src/llm/prompts/structure-rewrite-prompt.ts`
  - `src/llm/prompts/continuation/story-structure-section.ts`
  - `src/llm/prompts/sections/planner/continuation-context.ts`
- Prompt docs:
  - `prompts/structure-prompt.md`
  - `prompts/structure-rewrite-prompt.md`
  - `prompts/analyst-prompt.md`
  - `prompts/page-planner-prompt.md`

## Out of Scope

- Writer prompt changes
- Choice generation algorithm changes
- Backward compatibility shims or alias fields

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Relevant unit/integration suites pass (`npm run test:unit -- --coverage=false`)
- [x] Unit tests cover:
  - `CrisisType` type/export and beat model usage
  - Structure schema includes required nullable `crisisType`
  - `createStoryStructure` maps/parses `crisisType`
  - Planner escalation directive includes crisis-type framing when present
  - Analyst structure evaluation includes crisis-type alignment checks when present
- [x] Prompt docs reflect runtime prompt ownership and crisis-type instructions
- [x] No aliasing/back-compat fields introduced

## Outcome

**Completion date**: 2026-02-27

**What changed vs originally planned**:
- Implemented `crisisType` as a first-class nullable beat field across generation schema, structure mapping, rewrite context, serialization, planner directives, analyst checks, runtime prompts, and prompt docs.
- Expanded ticket scope beyond initial file list to include actual architecture ownership surfaces (`structure-generation` models, rewrite types/support, serializer types, and shared continuation prompt sections).
- Added/updated tests to lock in crisis-type behavior and updated existing persistence/rewrite/generator expectations for stricter beat shape.

**Deviations from original plan**:
- No backward compatibility path was added; strict field propagation was enforced as the architectural invariant.
- Analyst crisis checks were implemented in shared structure-evaluation prompt builder (the real runtime owner), not only in `analyst-prompt.ts`.

**Verification results**:
- `npm run typecheck` passed
- `npm run test:unit -- --coverage=false` passed
- `npm run lint` passed
