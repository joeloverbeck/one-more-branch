# SEMLBL-001: Replace numeric valence/tension with semantic text labels in LLM prompts

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None

## Problem

Valence and tension are presented to LLMs as bare numbers (e.g., `Valence: 7`, `Tension: 8`) without semantic context. Research shows LLMs reason poorly with plain numbers because they lack understanding of what a specific value means on the scale. This has already caused a concrete bug: the character context LLM outputs valence values outside the intended -5..+5 range (e.g., 7) because the JSON schema has no range description and the validation only checks `isFiniteNumber`, not range bounds. The prompt text gives the LLM no indication that 5 is the maximum or what each level means.

## Assumption Reassessment (2026-03-28)

1. **Valence range is -5..+5**: Confirmed via `chat-state-applier.ts:59` (`clamp(relationshipDelta.valence, -5, 5)`), and NPC relationships in `npc-relationship.ts` and `decomposed-character.ts` also use -5..+5. Verified.
2. **Tension range is 0..10**: Confirmed via `chat-state-applier.ts:60` (`clamp(relationshipDelta.tension, 0, 10)`). Verified.
3. **Delta range is -2..+2**: Confirmed via `chat-validation.ts:281-282` (`isNumberInRange(value['tensionDeltaHint'], -2, 2)`) and schema descriptions in `chat-state-updater-schema.ts:80-84`. Verified.
4. **`minimum`/`maximum` forbidden in Anthropic-compatible schemas**: Confirmed via `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` — the suite flags numeric `minimum`/`maximum` as unsupported for Anthropic-compatible schemas. Range enforcement must happen via schema descriptions + runtime validation.
5. **Story pipeline NPC tension is already prose**: Confirmed — `NpcRelationship.currentTension` is a string (1-2 sentences), not numeric. Only `valence` is numeric in the story pipeline.
6. **Chat pipeline tension is numeric**: Confirmed — `ChatRelationshipState.tension` is `number` (0..10).
7. **No range validation on LLM-generated relationship state**: Confirmed — `isChatRelationshipState` in `chat-validation.ts:127-131` only checks `isFiniteNumber(value['valence'])` and `isFiniteNumber(value['tension'])`, not range bounds. This is the clamping gap bug.
8. **Existing prompt/test surface has changed since the ticket was drafted**: Confirmed — prompt coverage now lives in `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts`, `test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts`, `test/unit/llm/prompts/lorekeeper-prompt.test.ts`, `test/unit/llm/prompts/agenda-resolver-prompt.test.ts`, and `test/unit/llm/char-presentation-generation.test.ts`. There is no existing dedicated `chat-validation.test.ts`; that test file must be created.
9. **NPC-intelligence uses a separate relationship-shift contract**: Confirmed — `npc-intelligence-prompt.ts` and `npc-intelligence-response-transformer.ts` still intentionally use `suggestedValenceChange` in the `-3..+3` domain. This ticket must not silently rewrite that pipeline.

## Architecture Check

1. **Display-layer conversion is still the right architecture**: Internal relationship state remains numeric for accumulation, clamping, persistence, and downstream logic; only LLM-facing prompt/schema surfaces gain semantic labels. This is cleaner than introducing parallel enum models or alias fields.
2. **Centralize the labeling logic once**: A single shared prompt helper is preferable to ad hoc inline mapping in each formatter. The helper should stay narrowly focused on prompt presentation, not become a generic domain model abstraction.
3. **No backwards-compatibility shims**: No model changes, no migration, no alias fields. If any tests or prompt expectations break, update them to the cleaner contract rather than preserving the old bare-number wording.

## What to Change

### 1. New utility: relationship label maps

Create `src/llm/prompts/relationship-label-maps.ts` with three pure functions:

- `valenceLabel(value: number): string` — Maps clamped integer -5..+5 to semantic label:
  - -5: `deeply hostile`
  - -4: `hostile`
  - -3: `cold and antagonistic`
  - -2: `wary and distrustful`
  - -1: `cool and guarded`
  - 0: `neutral`
  - +1: `cautiously warm`
  - +2: `warm and friendly`
  - +3: `trusting and close`
  - +4: `devoted`
  - +5: `unconditionally loyal`
  - Out-of-range or non-integer: clamp to nearest integer in range, then map.

- `tensionLabel(value: number): string` — Maps clamped integer 0..10 to semantic label:
  - 0: `no tension`
  - 1: `faint unease`
  - 2: `mild undercurrent`
  - 3: `noticeable friction`
  - 4: `growing strain`
  - 5: `significant pressure`
  - 6: `palpable stress`
  - 7: `high tension`
  - 8: `near breaking point`
  - 9: `critical volatility`
  - 10: `unbearable pressure`
  - Out-of-range or non-integer: clamp to nearest integer in range, then map.

- `valenceDeltaLabel(value: number): string` — Maps -2..+2:
  - -2: `large cooling`
  - -1: `slight cooling`
  - 0: `stable`
  - +1: `slight warming`
  - +2: `large warming`

- `tensionDeltaLabel(value: number): string` — Maps -2..+2:
  - -2: `major de-escalation`
  - -1: `slight de-escalation`
  - 0: `stable`
  - +1: `slight escalation`
  - +2: `major escalation`

All functions should round to nearest integer and clamp before lookup.

### 2. Chat pipeline prompt formatters (LLM reading)

**`src/llm/prompts/chat/chat-context-prompt-sections.ts`** (line 48-49):
- Replace `Valence: ${relationshipState.valence}` with `Valence: ${valenceLabel(relationshipState.valence)}`
- Replace `Tension: ${relationshipState.tension}` with `Tension: ${tensionLabel(relationshipState.tension)}`

**`src/llm/prompts/chat/chat-prompt-formatters.ts`** (lines 112-113):
- Replace `- Valence: ${chatBible.relationshipNow.valence}` with `- Valence: ${valenceLabel(chatBible.relationshipNow.valence)}`
- Replace `- Tension: ${chatBible.relationshipNow.tension}` with `- Tension: ${tensionLabel(chatBible.relationshipNow.tension)}`

**`src/llm/prompts/chat/chat-prompt-formatters.ts`** (lines 209-210):
- Replace `- Relationship Delta Hint: ${turnPlan.expectedImpact.relationshipDeltaHint}` with `- Relationship Delta Hint: ${valenceDeltaLabel(turnPlan.expectedImpact.relationshipDeltaHint)}`
- Replace `- Tension Delta Hint: ${turnPlan.expectedImpact.tensionDeltaHint}` with `- Tension Delta Hint: ${tensionDeltaLabel(turnPlan.expectedImpact.tensionDeltaHint)}`

### 3. Story pipeline prompt formatters (LLM reading)

**`src/llm/prompts/lorekeeper-prompt.ts`** (line 139):
- Replace `Valence: ${r.valence}` with `Valence: ${valenceLabel(r.valence)}`

**`src/llm/prompts/sections/shared/npc-state-sections.ts`** (line 42):
- Replace `Valence: ${r.valence}` with `Valence: ${valenceLabel(r.valence)}`

**`src/llm/prompts/agenda-resolver-prompt.ts`** (line 88):
- Replace `Valence: ${r.valence}` with `Valence: ${valenceLabel(r.valence)}`

**`src/llm/prompts/agenda-resolver-prompt.ts`** (line 119):
- Replace the numeric `suggestedValenceChange` display with `valenceDeltaLabel(s.suggestedValenceChange)`

**`src/llm/prompts/char-presentation-prompt.ts`** (line 44):
- Replace `(${relationship.valence}, ${relationship.numericValence})` with `(${relationship.valence}, ${valenceLabel(relationship.numericValence)})`
  - Note: `relationship.valence` here is already categorical (POSITIVE/NEGATIVE/AMBIVALENT); `numericValence` is the number that needs the label.

### 3a. Explicitly out of scope for this ticket

- `src/llm/prompts/npc-intelligence-prompt.ts` and the NPC-intelligence response transformer/schema. That pipeline has its own `-3..+3` contract and should only be revisited in a separate ticket if we decide to redesign it.
- `formatDecomposedCharacterForPrompt()` in `src/models/decomposed-character.ts`. It does contain a numeric protagonist relationship valence, but changing that shared model formatter would broaden the blast radius across many non-ticket prompt surfaces. Keep this ticket focused on the directly identified relationship prompt surfaces above.

### 4. Schema descriptions (LLM writing guidance)

Since `minimum`/`maximum` are forbidden (Anthropic compatibility), add semantic range descriptions to the `description` field:

**`src/llm/schemas/chat-character-context-schema.ts`** (lines 78-84):
- Valence description: `'Numeric relationship valence, integer from -5 (deeply hostile) to +5 (unconditionally loyal). 0 = neutral.'`
- Tension description: `'Numeric current relationship tension, integer from 0 (no tension) to 10 (unbearable pressure).'`

**`src/llm/schemas/chat-state-updater-schema.ts`** (lines 78-84):
- suggestedValenceChange description: `'Suggested relationship valence delta, integer from -2 (large cooling) to +2 (large warming). 0 = no change.'`
- suggestedTensionChange description: `'Suggested tension delta, integer from -2 (major de-escalation) to +2 (major escalation). 0 = no change.'`

**`src/llm/schemas/chat-planner-schema.ts`** (lines 154-160):
- relationshipDeltaHint description: `'Expected near-term relationship valence delta, integer from -2 (large cooling) to +2 (large warming).'`
- tensionDeltaHint description: `'Expected near-term tension delta, integer from -2 (major de-escalation) to +2 (major escalation).'`

### 5. Validation fix (clamping gap)

**`src/models/chat/chat-validation.ts`** (lines 127-131):
- Replace `isFiniteNumber(value['valence'])` with `isFiniteNumber(value['valence']) && isNumberInRange(value['valence'], -5, 5)`
- Replace `isFiniteNumber(value['tension'])` with `isFiniteNumber(value['tension']) && isNumberInRange(value['tension'], 0, 10)`

Note: `isNumberInRange` is already used elsewhere in this file (line 281-282). If the LLM generates out-of-range values, the validation will reject them, triggering the normal retry/fallback flow.

## Files to Touch

- `src/llm/prompts/relationship-label-maps.ts` (new)
- `src/llm/prompts/chat/chat-context-prompt-sections.ts` (modify)
- `src/llm/prompts/chat/chat-prompt-formatters.ts` (modify)
- `src/llm/prompts/lorekeeper-prompt.ts` (modify)
- `src/llm/prompts/sections/shared/npc-state-sections.ts` (modify)
- `src/llm/prompts/agenda-resolver-prompt.ts` (modify)
- `src/llm/prompts/char-presentation-prompt.ts` (modify)
- `src/llm/schemas/chat-character-context-schema.ts` (modify)
- `src/llm/schemas/chat-state-updater-schema.ts` (modify)
- `src/llm/schemas/chat-planner-schema.ts` (modify)
- `src/models/chat/chat-validation.ts` (modify)
- `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-writer-prompt.test.ts` (modify)
- `test/unit/llm/prompts/lorekeeper-prompt.test.ts` (modify)
- `test/unit/llm/prompts/agenda-resolver-prompt.test.ts` (modify)
- `test/unit/llm/char-presentation-generation.test.ts` (modify)
- `test/unit/llm/schemas/chat-character-context-schema.test.ts` (modify)
- `test/unit/llm/schemas/chat-state-updater-schema.test.ts` (modify)
- `test/unit/llm/schemas/chat-planner-schema.test.ts` (modify)
- `test/unit/models/chat/chat-validation.test.ts` (new)

## Out of Scope

- Changing the internal data model (valence/tension stay numeric in `ChatRelationshipState`, `NpcRelationship`, etc.)
- Changing the accumulation logic in `chat-state-applier.ts` (stays arithmetic)
- Converting story pipeline `currentTension` (already prose, not numeric)
- Changing the `content-evaluator-schema.ts` which uses `minimum: 0, maximum: 5` (separate concern, and that schema may not be Anthropic-routed)
- Changing NPC-intelligence relationship-shift bounds or normalization (`-3..+3`) in this same pass

## Acceptance Criteria

### Tests That Must Pass

1. `relationship-label-maps.test.ts`: All 11 valence labels map correctly for -5..+5
2. `relationship-label-maps.test.ts`: All 11 tension labels map correctly for 0..10
3. `relationship-label-maps.test.ts`: All 5 valence delta labels map correctly for -2..+2
4. `relationship-label-maps.test.ts`: All 5 tension delta labels map correctly for -2..+2
5. `relationship-label-maps.test.ts`: Out-of-range values clamp correctly (for example, `7 -> unconditionally loyal`, `-8 -> deeply hostile`)
6. `relationship-label-maps.test.ts`: Non-integer values round correctly (for example, `2.7 -> 3 -> trusting and close`)
7. `chat-validation.test.ts`: `isChatRelationshipState` rejects valence outside -5..+5
8. `chat-validation.test.ts`: `isChatRelationshipState` rejects tension outside 0..10
9. Prompt tests confirm LLM-facing relationship surfaces now emit semantic labels instead of bare numbers in the touched formatters/prompts
10. Schema tests confirm descriptions now carry semantic range guidance without introducing forbidden numeric constraints
11. Existing suite: targeted chat/prompt/schema tests, then `npm test`, `npm run typecheck`, and `npm run lint` all pass

### Invariants

1. Internal data model stays numeric — no type changes to `ChatRelationshipState`, `NpcRelationship`, or related interfaces
2. All touched LLM-facing prompt text for valence/tension uses semantic labels instead of bare numbers
3. All touched LLM-facing schema descriptions include semantic range guidance
4. Anthropic schema compatibility test continues to pass (no `minimum`/`maximum` keywords added)
5. The NPC-intelligence pipeline remains unchanged in this ticket

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/relationship-label-maps.test.ts` — Full coverage of all label mapping functions including edge cases
2. `test/unit/models/chat/chat-validation.test.ts` — New direct tests for range validation in `isChatRelationshipState`
3. Existing prompt/schema tests listed above — updated expectations for semantic labels and schema descriptions

### Commands

1. `npm run test:unit -- --testPathPatterns="relationship-label-maps|chat-validation|chat-character-context-prompt|chat-prompt-formatters|chat-writer-prompt|lorekeeper-prompt|agenda-resolver-prompt|char-presentation-generation|chat-character-context-schema|chat-state-updater-schema|chat-planner-schema|anthropic-schema-compatibility|scene-ideator-prompt|npc-state-sections"`
2. `npm test`
3. `npm run typecheck`
4. `npm run lint`

## Outcome

- Completion date: `2026-03-28`
- What actually changed:
  - Added a shared prompt-only relationship label helper for valence, tension, and chat delta hints.
  - Updated the targeted chat/story prompt formatters to emit semantic labels instead of bare numeric relationship values.
  - Updated chat schema descriptions to encode semantic range guidance without introducing unsupported numeric schema constraints.
  - Tightened `isChatRelationshipState()` to reject out-of-range valence/tension values.
  - Added direct unit coverage for the new label helper and the relationship-state validation gap, and updated affected prompt/schema tests to assert the new contract.
- Deviations from the original plan:
  - Kept the NPC-intelligence pipeline out of scope after reassessment; its separate `-3..+3` contract was not rewritten in this ticket.
  - Updated additional shared prompt tests (`scene-ideator-prompt` and `npc-state-sections`) because the semantic-label helper flows through shared relationship sections those prompts already consume.
  - Corrected the unit-test CLI command to use the current Jest `--testPathPatterns` flag rather than the stale `--testPathPattern` form.
- Verification results:
  - `npm run test:unit -- --testPathPatterns="relationship-label-maps|chat-validation|chat-character-context-prompt|chat-prompt-formatters|chat-writer-prompt|lorekeeper-prompt|agenda-resolver-prompt|char-presentation-generation|chat-character-context-schema|chat-state-updater-schema|chat-planner-schema|anthropic-schema-compatibility|scene-ideator-prompt|npc-state-sections"` passed.
  - `npm test` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
