# Beat Conclusion Robustness Spec: Scene-Signal Gating for Analyst

**Status**: ✅ COMPLETED
**Date**: 2026-02-10
**Owner**: Story Engine / LLM Prompting

## 1. Problem Statement

We observed false-positive beat conclusions where a beat is marked complete before the fiction actually satisfies the beat objective, causing premature beat/act progression.

The current analyst guidance is permissive:
- `beatConcluded: true` is allowed when any broad condition is met.
- Prompt rules do not force explicit evidence mapping between current narrative state and the active beat objective.
- High-impact roles (especially `turning_point`) do not have stronger completion requirements.

This is especially risky in a general-purpose story engine where stories can be political, survival, romance, mystery, comedy, horror, etc.

## 2. Root Cause Hypothesis

The current analyst contract overweights broad progression signals and underweights objective-specific proof.

Primary weaknesses:
1. No role-aware completion gate (all beat roles are effectively evaluated with similar leniency).
2. No mandatory structured classification step before completion decision.
3. No required evidence traceability from scene/state to objective fulfillment.
4. No explicit negative guard for "intensity escalation without objective completion".

## 3. Design Goals

1. Story-agnostic gating: no world-specific or genre-specific hardcoded anchors.
2. Objective-grounded conclusions: `beatConcluded` should require explicit evidence tied to the active beat objective.
3. Role-aware strictness: `turning_point` beats require stronger proof than `setup`/`escalation`.
4. Auditability: analyst output should expose why a beat was or was not concluded.
5. Backward-safe rollout: prompt/schema evolution should degrade gracefully.

## 4. Proposed Solution

### 4.1 Add Story-Agnostic Scene-Signal Classification

Before deciding `beatConcluded`, analyst must classify the evaluated narrative with constrained, generic enums.

Proposed enums:

1. `sceneMomentum`
- `STASIS` (mostly reiterates existing situation)
- `INCREMENTAL_PROGRESS` (partial movement toward objective)
- `MAJOR_PROGRESS` (substantial movement toward objective)
- `REVERSAL_OR_SETBACK` (movement away from objective)
- `SCOPE_SHIFT` (narrative focus shifts into different beat territory)

2. `objectiveEvidenceStrength`
- `NONE`
- `WEAK_IMPLICIT`
- `CLEAR_EXPLICIT`

3. `commitmentStrength`
- `NONE`
- `TENTATIVE`
- `EXPLICIT_REVERSIBLE`
- `EXPLICIT_IRREVERSIBLE`

4. `structuralPositionSignal`
- `WITHIN_ACTIVE_BEAT`
- `BRIDGING_TO_NEXT_BEAT`
- `CLEARLY_IN_NEXT_BEAT`

5. `entryConditionReadiness`
- `NOT_READY`
- `PARTIAL`
- `READY`

Notes:
- These enums intentionally avoid story-specific labels (no domain entities like royalty/government/factions).
- `sceneMomentum` captures progression quality without assuming genre.

### 4.2 Role-Based Completion Gates

After classification, apply gate rules in prompt instructions:

1. Base gate for all beat roles:
- `objectiveEvidenceStrength` must be `CLEAR_EXPLICIT`, OR
- `structuralPositionSignal` must be `CLEARLY_IN_NEXT_BEAT` with explicit evidence that active objective is no longer the primary unresolved objective.

2. Additional gate for `turning_point` beats:
- Require `commitmentStrength` >= `EXPLICIT_REVERSIBLE`.
- If `commitmentStrength` is `EXPLICIT_REVERSIBLE`, require explicit forward consequence that materially alters available next actions.
- Prefer `EXPLICIT_IRREVERSIBLE` when objective wording implies point-of-no-return.

3. Negative guard:
- If scene shows heightened action/intensity but `objectiveEvidenceStrength` is not `CLEAR_EXPLICIT`, do not conclude.

4. Scope-shift guard:
- `SCOPE_SHIFT` alone is insufficient unless objective evidence shows active beat is functionally resolved or superseded.

### 4.3 Objective Anchor Extraction (Dynamic, Not Hardcoded)

Replace fixed anchor lists with dynamic objective anchors generated from the active beat objective text at evaluation time.

Contract:
1. Analyst extracts 1-3 objective anchors from `activeBeat.objective` (short phrases, not specific proper nouns unless objective itself requires them).
2. Analyst maps each claimed completion to concrete narrative/state evidence.
3. If fewer than one anchor is satisfied explicitly, default to `beatConcluded: false`.

This keeps behavior compatible with any story domain.

### 4.4 Two-Step Analyst Reasoning Contract

Prompt must enforce explicit sequencing:
1. Step A: classify scene signals (enums).
2. Step B: apply role-based gate against active beat objective and decide `beatConcluded`.

This mirrors the proven "classify first, decide second" pattern and reduces free-form drift.

### 4.5 Extend Analyst Output Schema (Diagnostics)

Add strict-schema fields for auditability:
- `sceneMomentum`
- `objectiveEvidenceStrength`
- `commitmentStrength`
- `structuralPositionSignal`
- `entryConditionReadiness`
- `objectiveAnchors`: string[] (1-3)
- `anchorEvidence`: string[] (same order as `objectiveAnchors`; empty string allowed when unsatisfied)
- `completionGateSatisfied`: boolean
- `completionGateFailureReason`: string

Schema rules:
- Keep `strict: true`.
- New fields should be required in JSON schema.
- Validation layer should provide safe defaults/catches for robustness.

## 5. Prompt and Code Changes (Planned)

1. `src/llm/prompts/continuation/story-structure-section.ts`
- Replace permissive "ANY of these apply" language with gate-based logic.
- Add `=== SCENE SIGNAL CLASSIFICATION ===` and `=== COMPLETION GATE ===` sections.
- Add explicit negative guards (intensity-only and scope-shift-only).

2. `src/llm/prompts/analyst-prompt.ts`
- Require two-step reasoning contract and objective-anchor extraction.
- Emphasize cumulative evidence across current narrative + active state.

3. `src/llm/schemas/analyst-schema.ts`
- Add required diagnostic fields and enums.

4. `src/llm/schemas/analyst-validation-schema.ts`
- Add zod enums/defaults/catches for diagnostic fields.

5. `src/llm/schemas/analyst-response-transformer.ts`
- Pass through new diagnostic fields into `AnalystResult`.

6. `src/engine/page-service.ts` (Phase 2, optional)
- Add runtime guardrail for `turning_point`: if `beatConcluded=true` and `completionGateSatisfied=false`, treat as non-concluded and log warning.

## 6. Acceptance Criteria

1. Story-agnostic behavior:
- Same gate logic works across at least three distinct fixture domains (e.g., political thriller, wilderness survival, romance drama) with no domain-specific enum values.

2. Repro-case protection:
- On a page with high action/escalation but no explicit objective evidence, analyst returns:
  - `beatConcluded: false`
  - `objectiveEvidenceStrength != CLEAR_EXPLICIT`
  - `completionGateSatisfied: false`

3. True-positive turning point:
- On a page with explicit commitment satisfying objective anchors, `turning_point` may conclude.

4. Act transition discipline:
- Next beat/act progression does not occur unless completion gate is satisfied for the active beat.

5. Backward safety:
- If analyst omits new fields or produces invalid enum values, validator defaults avoid runtime crashes and preserve conservative behavior (`beatConcluded=false` unless evidence is clear).

## 7. Test Plan

### 7.1 Unit Tests

1. Prompt text tests:
- Verify classification enums, two-step contract, and negative guards are present.

2. Schema validation tests:
- Validate enum parsing, defaults/catches, required diagnostics behavior.

3. Transformer tests:
- Ensure new diagnostics survive transformation and typing.

4. Gate behavior tests (prompt-contract level):
- Construct mocked analyst outputs to verify guardrail behavior for `turning_point` (if Phase 2 is implemented).

### 7.2 Integration Tests

1. False-positive regression fixture:
- Action-heavy page without explicit objective evidence should not conclude beat.

2. True-positive fixture:
- Explicit commitment with objective-anchor evidence should conclude beat.

3. Cross-domain fixture set:
- At least 3 domain variants to confirm story-agnostic behavior.

## 8. Rollout Plan

1. Phase 1: Prompt + schema + tests
- Ship classification/gate diagnostics and conservative defaults.
- Monitor beat conclusion rate, especially `turning_point` beats.

2. Phase 2: Runtime guardrail (optional)
- Enforce `completionGateSatisfied` in engine for high-risk roles.

3. Phase 3: Calibration
- Tune enum descriptions/gate wording based on false-positive and false-negative logs.

## 9. Risks and Mitigations

1. Risk: Over-constraining delays valid progression.
- Mitigation: allow `EXPLICIT_REVERSIBLE` path with explicit forward consequence.

2. Risk: Expanded strict schema increases malformed responses.
- Mitigation: concise enum sets, clear prompt ordering, zod catches/defaults.

3. Risk: Prompt token growth.
- Mitigation: compact enum descriptions and short gate rules.

4. Risk: Model compliance variance.
- Mitigation: optional Phase 2 runtime guardrail for high-impact roles.

## 10. Open Questions

1. Should runtime guardrails apply only to `turning_point` or all beat roles?
2. Should objective-anchor extraction happen purely in analyst prompt, or partially precomputed in engine and injected as context?
3. Should we track a per-story calibration mode (strict vs balanced) for completion gating?

## Outcome

- Completion date: 2026-02-10
- What was actually changed:
  - Implemented scene-signal classification and completion-gate diagnostics in analyst prompt/schema/validation/transformer pipeline.
  - Added/updated page-service guardrail behavior for guarded completion progression checks.
  - Added focused unit/integration coverage for false-positive prevention, true-positive turning-point completion, and cross-domain story-agnostic gating.
  - Verified via focused test runs and typecheck in BEACONSCESIGGAT-06.
- Deviations from original plan:
  - Runtime guardrail remained targeted to guarded scenarios rather than broad role-wide enforcement.
  - Verification commands were normalized to deterministic `--runTestsByPath` invocation in the final verification ticket.
- Verification results:
  - Focused gating unit tests, integration page-service gating tests, and `tsc --noEmit` passed on 2026-02-10.
