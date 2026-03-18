# SCEIDEDIVOVE-002: Expand scene ideator output contract and validation for lane-based slates

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — scene ideator model contract, schema, parser, validation
**Deps**: `tickets/SCEIDEDIVOVE-001-scene-ideation-contract-and-slate-builder.md`

## Problem

The structured scene ideator response does not include `diversityLane`, the schema is fixed at exactly 3 options, and the parser only validates `(scenePurpose, valuePolarityShift)` uniqueness. That leaves the core diversity contract unenforced.

## Assumption Reassessment (2026-03-18)

1. `src/models/scene-direction.ts` currently defines both `SceneDirectionOption` and `SelectedSceneDirection` without any lane metadata.
2. `src/llm/schemas/scene-ideator-schema.ts` exports a constant schema with no parameterization and no `minItems` / `maxItems`.
3. `src/llm/scene-ideator.ts` currently parses against a literal 3-option contract and has no validation for duplicate lanes or duplicate `(diversityLane, scenePurpose)` pairs.

## Architecture Check

1. The backend contract should become stricter before the prompt is rewritten, otherwise prompt changes can produce data the parser cannot explain or audit cleanly.
2. `diversityLane` belongs in the structured ideator output so the diversity contract is machine-verifiable. The selected direction payload can keep the lane or safely ignore it, but the backend should not hide the field in prompt prose only.

## What to Change

### 1. Expand scene direction types

Update scene direction types to carry `diversityLane` on `SceneDirectionOption`.

Decide explicitly whether `SelectedSceneDirection` also carries `diversityLane`:

- if yes, keep downstream planner behavior unchanged by ignoring the field
- if no, ensure the selection handoff strips it intentionally rather than by accident

### 2. Parameterize the scene ideator schema

Replace the fixed exported schema with a builder that accepts the slate target count and emits:

- `diversityLane` enum
- array count contract based on requested count
- updated description text that no longer says `Exactly 3`

Update any schema compatibility tests to use the new builder or default schema export pattern consistently.

### 3. Tighten parser and diversity validation

Update parsing and validation so they enforce:

- requested option count, not literal `3`
- valid `diversityLane`
- unique lanes within the slate
- unique `(scenePurpose, valuePolarityShift)` pairs
- unique `(diversityLane, scenePurpose)` pairs

Error messages should still be specific enough to diagnose which constraint failed.

## Files to Touch

- `src/models/scene-direction.ts` (modify)
- `src/models/scene-direction-taxonomy.ts` or `src/llm/scene-ideation-contract.ts` (modify, depending on lane-type ownership from ticket 001)
- `src/llm/schemas/scene-ideator-schema.ts` (modify)
- `src/llm/scene-ideator.ts` (modify)
- `test/unit/llm/scene-ideator.test.ts` (modify)
- `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` (modify)

## Out of Scope

- Prompt wording or slate block rendering
- Prompt markdown docs
- Client badge rendering or CSS
- Planner redesign

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/scene-ideator.test.ts` verifies `parseSceneDirectionOption()` accepts and returns `diversityLane`.
2. `test/unit/llm/scene-ideator.test.ts` verifies `parseSceneIdeatorResponse()` accepts the requested default count and rejects count mismatches with an explicit count error.
3. `test/unit/llm/scene-ideator.test.ts` verifies `validateDiversity()` rejects duplicate lanes and duplicate `(diversityLane, scenePurpose)` pairs.
4. `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` verifies the scene ideator schema remains strict and Anthropic-compatible after parameterization.
5. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideator.test.ts test/unit/llm/schemas/anthropic-schema-compatibility.test.ts`

### Invariants

1. The parser and schema must agree on the same requested option count and required field set for every scene ideation request.
2. Planner handoff remains backwards-compatible at behavior level: one selected scene direction still feeds the planner cleanly.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/scene-ideator.test.ts` — add coverage for lane parsing, count parameterization, and layered diversity validation.
2. `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` — verify the generated schema still satisfies provider constraints.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideator.test.ts test/unit/llm/schemas/anthropic-schema-compatibility.test.ts`
2. `npm run typecheck`

