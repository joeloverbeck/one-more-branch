# CONPACASSOVE-02: Expand generation contracts for context-rich packets and persistable lineage

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — one-shot and packeter generation contracts, prompt schemas, pipeline result shapes
**Deps**: `specs/content-packet-asset-overhaul.md`, `tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.md`

## Problem

The LLM generation layer still emits packet bodies that are too narrow for persistence. Pipeline generation only surfaces `sourceSparkIds`, and one-shot generation emits no saved-asset context or explicit origin artifacts at all, so later save steps cannot persist intelligible assets without guessing.

## Assumption Reassessment (2026-03-19)

1. `src/llm/content-packeter-generation.ts` currently requires `sourceSparkIds` but not `premiseSummary`, `situationFrame`, or `worldState`.
2. `src/llm/content-one-shot-generation.ts` currently parses only canonical packet fields, which means quick generation has no saved-asset context contract today.
3. `prompts/content-packeter-prompt.md` and `prompts/content-one-shot-prompt.md` still document plain `ContentPacket[]` output, so the docs and runtime schemas are currently aligned on the wrong shape.

## Architecture Check

1. The generation layer should emit a complete save-ready candidate shape, because that is the last place where full lineage and context are still available without reconstruction.
2. No compatibility shim should let old packet-only generation outputs continue through parsing. Missing context or missing pipeline lineage must remain hard failures.

## What to Change

### 1. Expand packeter output

Update the packeter prompt, schema, and parser so each generated packet includes:

- `premiseSummary`
- `situationFrame`
- `worldState`
- optional `viewpointPressure`
- `sourceSparkIds`

Ensure parser failures are explicit when any required context field or pipeline lineage is missing.

### 2. Expand one-shot output

Update the one-shot prompt, schema, and parser so quick generation emits the same context block as pipeline generation. Introduce whatever quick-generation packet/result type is needed so later save logic can build exemplar-derived source artifacts without shape loss.

### 3. Keep spark data compact but save-ready

Keep the sparkstormer contract minimal, but ensure generation results retain the spark fields needed for `origin.sourceArtifacts`:

- `sparkId`
- `contentKind`
- `spark`
- `imageSeed`
- `collisionTags`

### 4. Update service-facing generation result plumbing

Update generation result types or service adapters so `/api/generate` can later return save-ready packet objects instead of canonical packet-only projections.

## Files to Touch

- `src/models/content-packet.ts` (modify)
- `src/llm/content-packeter-generation.ts` (modify)
- `src/llm/content-one-shot-generation.ts` (modify)
- `src/llm/content-sparkstormer-generation.ts` (modify)
- `src/llm/prompts/content-packeter-prompt.ts` (modify)
- `src/llm/prompts/content-one-shot-prompt.ts` (modify)
- `src/llm/prompts/content-sparkstormer-prompt.ts` (modify)
- `src/llm/schemas/content-packeter-schema.ts` (modify)
- `src/llm/schemas/content-one-shot-schema.ts` (modify)
- `src/llm/schemas/content-sparkstormer-schema.ts` (modify)
- `src/server/services/content-service.ts` (modify)
- `test/unit/llm/content-packeter.test.ts` (modify)
- `test/unit/llm/content-one-shot.test.ts` (modify)
- `test/unit/llm/content-sparkstormer.test.ts` (modify)
- `test/unit/server/services/content-service.test.ts` (modify)

## Out of Scope

- Save route validation or artifact assembly
- Persistence repository hardening or on-disk cleanup
- Saved card presenter and EJS layout changes
- Concept-stage prompt updates outside any type fallout required to compile

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/content-packeter.test.ts` proves packeter parsing accepts packets with context fields and rejects packets missing `premiseSummary`, `situationFrame`, `worldState`, or `sourceSparkIds`.
2. `test/unit/llm/content-one-shot.test.ts` proves one-shot parsing now requires the same context fields as pipeline generation.
3. `test/unit/server/services/content-service.test.ts` proves quick and pipeline generation results preserve enough source data for later save-time origin artifact construction.
4. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/llm/content-packeter.test.ts test/unit/llm/content-one-shot.test.ts test/unit/llm/content-sparkstormer.test.ts test/unit/server/services/content-service.test.ts`

### Invariants

1. Downstream evaluator and concept stages still receive the lean canonical packet fields they expect, not the full saved asset.
2. Pipeline generation never drops selected spark text or image metadata before the save flow has a chance to persist it.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-packeter.test.ts` — add schema, prompt, and parser coverage for context-rich packets and required spark lineage.
2. `test/unit/llm/content-one-shot.test.ts` — add parser coverage for quick packets with required context fields.
3. `test/unit/llm/content-sparkstormer.test.ts` — verify required spark fields remain available for persisted source artifacts.
4. `test/unit/server/services/content-service.test.ts` — verify service result plumbing preserves save-ready data in both modes.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/content-packeter.test.ts test/unit/llm/content-one-shot.test.ts test/unit/llm/content-sparkstormer.test.ts test/unit/server/services/content-service.test.ts`
2. `npm run typecheck`

