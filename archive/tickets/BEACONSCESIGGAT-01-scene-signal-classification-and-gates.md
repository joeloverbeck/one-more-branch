**Status**: ✅ COMPLETED

# BEACONSCESIGGAT-01: Add scene-signal classification and completion-gate rules to analyst structure evaluation prompt section

## Summary
Replace permissive beat-conclusion wording in the analyst evaluation section with a strict, story-agnostic classification-first gate. This ticket is intentionally limited to `buildAnalystStructureEvaluation()` prompt text and direct unit tests in `analyst-structure-evaluation.test.ts`.

## Reassessed assumptions and scope corrections
- The broader spec (`specs/beat-conclusion-scene-signal-gating.md`) proposes schema/runtime follow-ups and backward-safe rollout details. Those are explicitly out of scope for this ticket.
- This ticket does not introduce legacy handling, compatibility shims, schema additions, or runtime guardrails.
- The existing `PROGRESSION CHECK` guidance already exists in the prompt; this ticket must keep progression/deviation/pacing sections while removing permissive "ANY apply" beat-conclusion logic.
- Test expectations should validate required gating language presence and enum coverage without over-constraining non-functional wording details.

## Depends on
- None

## Blocks
- BEACONSCESIGGAT-02
- BEACONSCESIGGAT-04

## File list it expects to touch
- `src/llm/prompts/continuation/story-structure-section.ts`
- `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts`

## Implementation checklist
1. Add a `=== SCENE SIGNAL CLASSIFICATION ===` section in the analyst evaluation output with the following enums and labels:
   - `sceneMomentum`: `STASIS`, `INCREMENTAL_PROGRESS`, `MAJOR_PROGRESS`, `REVERSAL_OR_SETBACK`, `SCOPE_SHIFT`
   - `objectiveEvidenceStrength`: `NONE`, `WEAK_IMPLICIT`, `CLEAR_EXPLICIT`
   - `commitmentStrength`: `NONE`, `TENTATIVE`, `EXPLICIT_REVERSIBLE`, `EXPLICIT_IRREVERSIBLE`
   - `structuralPositionSignal`: `WITHIN_ACTIVE_BEAT`, `BRIDGING_TO_NEXT_BEAT`, `CLEARLY_IN_NEXT_BEAT`
   - `entryConditionReadiness`: `NOT_READY`, `PARTIAL`, `READY`
2. Replace current "CONCLUDE THE BEAT when ANY apply" language with `=== COMPLETION GATE ===` rules:
   - Base gate requires `CLEAR_EXPLICIT` objective evidence OR explicit structural supersession into next beat territory.
   - Add role-aware clause for `turning_point` requiring commitment threshold and forward consequence.
   - Add explicit negative guard: intensity/action escalation alone is insufficient.
   - Add explicit scope-shift guard: `SCOPE_SHIFT` alone cannot conclude.
3. Keep deviation and pacing sections present, but align beat-conclusion instructions so they do not conflict with gate logic.
4. Update/add prompt-text assertions so tests verify the new classification and gate language, including guards for intensity-only and scope-shift-only false positives.

## Out of scope
- Do not edit `src/llm/prompts/analyst-prompt.ts` system prompt text.
- Do not add or modify analyst schema fields in `src/llm/schemas/*`.
- Do not change runtime beat progression logic in `src/engine/page-service.ts`.
- Do not introduce domain-specific vocabulary in enums (no setting/genre-specific anchors).

## Acceptance criteria

### Specific tests that must pass
- `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts`
  - Includes `=== SCENE SIGNAL CLASSIFICATION ===`.
  - Includes all required enum values in prompt instructions.
  - Includes `=== COMPLETION GATE ===`.
  - Contains negative guard text for intensity-only escalation.
  - Contains guard text that `SCOPE_SHIFT` alone is insufficient.
  - Contains stricter `turning_point` clause requiring commitment strength.
- Existing assertions for:
  - `=== BEAT EVALUATION ===`
  - `REMAINING BEATS TO EVALUATE FOR DEVIATION`
  - `=== PACING EVALUATION ===`
  still pass in the same file.
- `npm run test:unit -- test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- `buildWriterStructureContext()` output remains unchanged.
- `DEVIATION_DETECTION_SECTION` remains present and semantically conservative.
- Prompt remains story-agnostic (no hardcoded domain entities).
- Existing active-state rendering (`CURRENT STATE (for beat evaluation)`) remains present.

## Outcome
- Completion date: 2026-02-10
- What changed:
  - Replaced permissive `CONCLUDE THE BEAT when ANY apply` language with explicit `=== SCENE SIGNAL CLASSIFICATION ===` and `=== COMPLETION GATE ===` sections in `buildAnalystStructureEvaluation()`.
  - Added strict base gate requirements, `turning_point` commitment requirements, and explicit negative guards for intensity-only and scope-shift-only cases.
  - Kept deviation evaluation, remaining-beats listing, pacing evaluation, and active-state rendering intact.
  - Updated analyst structure-evaluation unit tests to assert required classification enums and completion-gate language.
- Deviations from original plan:
  - No schema/runtime changes were made (explicitly out of scope for this ticket despite broader spec proposals).
  - Acceptance wording was tightened to require enum presence rather than "exactly once" to avoid coupling tests to incidental repetition in gate language.
- Verification:
  - `npm run test:unit -- test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts` (passes; command currently runs full unit suite due project jest config behavior)
  - `npm run typecheck` (passes)
