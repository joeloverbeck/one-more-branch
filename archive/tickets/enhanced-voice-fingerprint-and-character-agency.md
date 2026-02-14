# Ticket: Enhanced Voice Fingerprint and Character Agency

**Status**: COMPLETED
**Priority**: Enhancement
**Source Spec**: `specs/enhanced-voice-fingerprint-and-character-agency.md`

## Reassessed Assumptions and Scope Corrections

1. **Ticket source-of-truth correction**: the original work exists only in `specs/`; implementation must be driven by this ticket in `tickets/`.
2. **Backward-compatibility correction**: do **not** preserve legacy decomposed-character wire shapes for newly added fields. The schema/model contract is upgraded and canonical; missing new fields are treated as invalid data that should be repaired at source rather than silently tolerated in persistence.
3. **Prompt/docs ownership correction**: because entity-decomposer output shape changes, prompt docs (`prompts/entity-decomposer-prompt.md`) must be updated in the same pass to avoid stale ownership/schema statements.
4. **Test-scope correction**: impacted tests are broader than entity decomposer alone. Any typed `DecomposedCharacter`/`SpeechFingerprint` fixtures across unit/integration tests must be updated.

## Architectural Decision

Adopt a stricter canonical decomposition contract:
- Extend `SpeechFingerprint` and `DecomposedCharacter` with explicit, first-class fields for voice and agency.
- Keep formatting/prompt projection logic centralized in model formatters (single propagation point).
- Keep entity-decomposer parsing defensive for malformed LLM responses, but do not add persistence-level legacy aliasing/fallback branches for old stored shapes.

Rationale:
- Improves long-term extensibility by modeling decision-making and voice boundaries directly instead of relying on ad hoc prompt inference.
- Reduces drift by creating explicit negative/contrastive voice constraints and conflict-resolution priors.
- Preserves clean architecture by avoiding compatibility clutter in core persistence paths.

## Implementation Scope

1. **Model updates** (`src/models/decomposed-character.ts`)
- Add speech fields: `metaphorFrames`, `antiExamples`, `discourseMarkers`, `registerShifts`.
- Add character agency fields: `decisionPattern`, `coreBeliefs`, `conflictPriority`.
- Update:
  - `formatSpeechFingerprintForWriter()` to emit new voice fields when non-empty.
  - `formatDecomposedCharacterForPrompt()` to emit new voice fields and agency fields when non-empty.

2. **Schema updates** (`src/llm/schemas/entity-decomposer-schema.ts`)
- Add the 4 speech fields and 3 agency fields to properties and `required` arrays.

3. **Parser updates** (`src/llm/entity-decomposer.ts`)
- Parse the 4 new speech fields and 3 new agency fields with defensive type-checked defaults for malformed responses.

4. **Prompt updates** (`src/llm/prompts/entity-decomposer-prompt.ts`)
- Add extraction guidance for metaphor frames, anti-examples, discourse markers, register shifts.
- Add decomposition principles for decision pattern, core beliefs, conflict priority.
- Update user instructions to reinforce inference quality for agency fields.

5. **Persistence updates** (`src/persistence/story-repository.ts`)
- Serialize and deserialize new canonical fields directly for decomposed characters.
- Do not introduce backward-compat alias branches for missing new fields in decomposed payloads.

6. **Prompt documentation update** (`prompts/entity-decomposer-prompt.md`)
- Align system/user instructions and JSON response shape with new fields.
- Remove stale statements that conflict with the new contract.

7. **Tests**
- Extend/repair:
  - `test/unit/llm/entity-decomposer.test.ts`
  - `test/unit/models/decomposed-models.test.ts`
  - `test/unit/server/utils/briefing-helpers.test.ts`
  - Any additional tests with strict typed decomposed fixtures.
- Add parser coverage for new fields and defaults.
- Run relevant suites plus hard checks.

## Verification Gates

1. `npm run typecheck`
2. `npm run test:unit -- --testPathPattern entity-decomposer|decomposed-models|briefing-helpers|story-repository`
3. `npm run test:integration -- --testPathPattern story-repository` (if supported by current jest config)
4. `npm run lint`

## Completion and Archival

After implementation + passing checks:
1. Set `**Status**: COMPLETED` in this ticket.
2. Add an `## Outcome` section summarizing what changed vs planned and verification run.
3. Move ticket to `archive/tickets/`.

## Outcome

**Completion date**: 2026-02-14

### What was changed

- Extended canonical decomposition models:
  - `SpeechFingerprint`: `metaphorFrames`, `antiExamples`, `discourseMarkers`, `registerShifts`
  - `DecomposedCharacter`: `decisionPattern`, `coreBeliefs`, `conflictPriority`
- Updated projection formatters in `src/models/decomposed-character.ts` so new fields flow to writer/planner/lorekeeper/agenda prompts via existing central formatter hooks.
- Extended entity decomposition JSON schema with all 7 new fields and required constraints.
- Updated parser in `src/llm/entity-decomposer.ts` to parse and normalize new fields defensively.
- Updated entity decomposer prompt (`src/llm/prompts/entity-decomposer-prompt.ts`) to instruct extraction of new voice and agency dimensions.
- Updated persistence mapping in `src/persistence/story-repository.ts` to serialize/deserialize the expanded canonical field set directly.
- Updated prompt documentation (`prompts/entity-decomposer-prompt.md`) to reflect the new schema and guidance.
- Updated and expanded tests across unit suites that construct `SpeechFingerprint`/`DecomposedCharacter` fixtures.

### Deviations from original spec

- Removed persistence-level backward-compat branches for newly added decomposed fields, per corrected ticket scope (strict canonical contract, no aliasing/backward-compat layer).
- Kept parser-side defensive normalization for malformed LLM payload values to maintain runtime robustness.

### Verification

- `npm run typecheck`
- `npm run test:unit -- --testPathPattern \"entity-decomposer|decomposed-models|briefing-helpers|story-repository|lorekeeper-prompt|agenda-resolver-prompt|opening-context|continuation-context\"`
  - Includes the targeted unit suites and matching `story-repository` integration coverage.
- `npm run lint`
