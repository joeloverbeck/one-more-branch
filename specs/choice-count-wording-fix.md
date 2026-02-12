# Spec: Choice Count Wording Fix

## Overview

Fix ambiguous "2-3" wording in STRICT_CHOICE_GUIDELINES divergence enforcement section. The current text creates confusion between the minimum threshold (2) and the target count (3).

## Goals

1. Remove ambiguity in the DIVERGENCE ENFORCEMENT fallback instruction
2. Clearly communicate the minimum threshold (2 choices) vs. the target (3 choices)

## Dependencies

**None** - This is a trivial, standalone wording fix.

## Implementation Details

### File: `src/llm/prompts/system-prompt-builder.ts`

**Line 73**, within `STRICT_CHOICE_GUIDELINES`, change:

```
If you cannot produce 2-3 choices with different tags, consider making this an ENDING.
```

To:

```
If you cannot produce at least 2 choices with different tags, consider making this an ENDING.
```

### Rationale

- The opening and continuation prompts already instruct the writer to produce "3 meaningful structured choice objects" (opening REQUIREMENTS #4) and "3 new meaningful structured choice objects" (continuation REQUIREMENTS #5), with a 4th "only when the situation truly warrants another distinct path."
- The JSON schema validates 2-5 choices (minItems: 2, maxItems: 5).
- The fallback instruction should only communicate the minimum threshold at which endings should be considered: 2. Writing "2-3" conflates the minimum with the target and could cause the LLM to aim for 2-3 instead of the intended 3.

### What NOT to Change

- Opening prompt REQUIREMENTS #4 (target of 3) - Unchanged
- Continuation prompt REQUIREMENTS #5 (target of 3) - Unchanged
- Writer schema choice array validation (2-5 items) - Unchanged
- Any other text in `STRICT_CHOICE_GUIDELINES` - Unchanged

## Invariants

- The fallback instruction clearly states "at least 2" as the minimum threshold
- The target count of 3 (with optional 4th) is still communicated by opening and continuation prompts
- Schema validation range (2-5) is unchanged

## Test Impact

- Any test asserting the exact text of `STRICT_CHOICE_GUIDELINES` or the DIVERGENCE ENFORCEMENT section must be updated to match the new wording
- `npm run typecheck` must pass
- `npm run test` must pass

## Verification

1. Grep for "2-3 choices" to confirm no other occurrences remain
2. Confirm opening/continuation prompts still say "3 meaningful structured choice objects"
3. Run `npm run typecheck && npm test`
