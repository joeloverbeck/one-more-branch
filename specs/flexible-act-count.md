# Flexible Act Count (3-5 Acts)

**Status**: COMPLETED

## Problem

Story creation crashes with `STRUCTURE_PARSE_ERROR` when the LLM returns 4 acts instead of exactly 3. The validation in `parseStructureResponse()` hard-rejects anything != 3 acts, but the JSON schema has no structural enforcement (`minItems`/`maxItems`), so the LLM has no constraint beyond prompt text. Retries fail identically. The engine already iterates acts dynamically (except one hardcoded loop in the merge function), making this a low-risk change.

## Solution

Accept 3-5 acts as valid story structures.

### Changes Made

1. **JSON Schema** (`src/llm/schemas/structure-schema.ts`): Added `minItems: 3, maxItems: 5` to the `acts` array definition. Updated description from "Exactly 3 acts" to "3-5 acts".

2. **Structure validation - initial generation** (`src/llm/structure-generator.ts`): Changed `data['acts'].length !== 3` to `data['acts'].length < 3 || data['acts'].length > 5`. Updated error message.

3. **Structure validation - rewrite** (`src/engine/structure-rewriter.ts`): Same range validation change. Also fixed the hardcoded `for (let actIndex = 0; actIndex < 3; ...)` merge loop to use `regeneratedStructure.acts.length`.

4. **Prompts**: Updated "exactly 3 acts" references to "3-5 acts" in both `structure-prompt.ts` and `structure-rewrite-prompt.ts`. Added guidance: "Use 3 acts for simpler stories, 4-5 for more complex narratives."

5. **Tests**: Updated assertions and fixtures across unit, integration, E2E, and performance tests. Added a test verifying 4-act structures are accepted.

## Invariants

- 3-act structures remain fully valid (existing stories unaffected)
- The few-shot example remains a 3-act structure (within valid range)
- Beats per act still constrained to 2-4
- Page immutability and branch isolation unchanged
