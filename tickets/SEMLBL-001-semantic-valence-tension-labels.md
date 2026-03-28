# SEMLBL-001: Replace numeric valence/tension with semantic text labels in LLM prompts

**Status**: PENDING
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
4. **`minimum`/`maximum` forbidden in schemas**: Confirmed via `anthropic-schema-compatibility.test.ts:150-164` — Anthropic rejects these constraints. Range enforcement must happen via schema descriptions + runtime validation.
5. **Story pipeline NPC tension is already prose**: Confirmed — `NpcRelationship.currentTension` is a string (1-2 sentences), not numeric. Only `valence` is numeric in the story pipeline.
6. **Chat pipeline tension is numeric**: Confirmed — `ChatRelationshipState.tension` is `number` (0..10).
7. **No range validation on LLM-generated relationship state**: Confirmed — `isChatRelationshipState` in `chat-validation.ts:127-131` only checks `isFiniteNumber(value['valence'])` and `isFiniteNumber(value['tension'])`, not range bounds. This is the clamping gap bug.

## Architecture Check

1. **Display-layer conversion**: Keeps internal model numeric (simple arithmetic for delta accumulation in `chat-state-applier.ts`), adds semantic text only where the LLM reads it. Avoids enum-to-ordinal conversion complexity. Consistent with how `ProtagonistAffect.primaryIntensity` already uses categorical labels (`mild|moderate|strong|overwhelming`).
2. **No backwards-compatibility shims**: No model changes, no migration needed. Label maps are additive utility functions.

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

**`src/llm/prompts/npc-intelligence-prompt.ts`** (line 66):
- Replace `Valence: ${r.valence}` with `Valence: ${valenceLabel(r.valence)}`

**`src/llm/prompts/char-presentation-prompt.ts`** (line 44):
- Replace `(${relationship.valence}, ${relationship.numericValence})` with `(${relationship.valence}, ${valenceLabel(relationship.numericValence)})`
  - Note: `relationship.valence` here is already categorical (POSITIVE/NEGATIVE/AMBIVALENT); `numericValence` is the number that needs the label.

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
- `src/llm/prompts/npc-intelligence-prompt.ts` (modify)
- `src/llm/prompts/char-presentation-prompt.ts` (modify)
- `src/llm/schemas/chat-character-context-schema.ts` (modify)
- `src/llm/schemas/chat-state-updater-schema.ts` (modify)
- `src/llm/schemas/chat-planner-schema.ts` (modify)
- `src/models/chat/chat-validation.ts` (modify)

## Out of Scope

- Changing the internal data model (valence/tension stay numeric in `ChatRelationshipState`, `NpcRelationship`, etc.)
- Changing the accumulation logic in `chat-state-applier.ts` (stays arithmetic)
- Converting story pipeline `currentTension` (already prose, not numeric)
- Changing the `content-evaluator-schema.ts` which uses `minimum: 0, maximum: 5` (separate concern, and that schema may not be Anthropic-routed)

## Acceptance Criteria

### Tests That Must Pass

1. `relationship-label-maps.test.ts`: All 11 valence labels map correctly for -5..+5
2. `relationship-label-maps.test.ts`: All 11 tension labels map correctly for 0..10
3. `relationship-label-maps.test.ts`: All 5 valence delta labels map correctly for -2..+2
4. `relationship-label-maps.test.ts`: All 5 tension delta labels map correctly for -2..+2
5. `relationship-label-maps.test.ts`: Out-of-range values clamp correctly (e.g., 7 -> `unconditionally loyal`, -8 -> `deeply hostile`)
6. `relationship-label-maps.test.ts`: Non-integer values round correctly (e.g., 2.7 -> 3 -> `trusting and close`)
7. `chat-validation.test.ts`: `isChatRelationshipState` rejects valence outside -5..+5
8. `chat-validation.test.ts`: `isChatRelationshipState` rejects tension outside 0..10
9. `chat-validation.test.ts`: `isChatRelationshipState` accepts valid values within range
10. Existing suite: `npm test` — no regressions

### Invariants

1. Internal data model stays numeric — no type changes to `ChatRelationshipState`, `NpcRelationship`, or related interfaces
2. All LLM-facing prompt text for valence/tension uses semantic labels, never bare numbers
3. All LLM-facing schema descriptions include semantic range guidance
4. Anthropic schema compatibility test continues to pass (no `minimum`/`maximum` keywords added)

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/relationship-label-maps.test.ts` — Full coverage of all label mapping functions including edge cases
2. `test/unit/models/chat/chat-validation.test.ts` — Add/update tests for range validation in `isChatRelationshipState`

### Commands

1. `npm run test:unit -- --testPathPattern="relationship-label-maps|chat-validation"`
2. `npm run test:unit -- --testPathPattern="anthropic-schema-compatibility"`
3. `npm test`
4. `npm run typecheck`
5. `npm run lint`
