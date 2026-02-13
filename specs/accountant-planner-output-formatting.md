**Status**: COMPLETED

# Accountant Planner Output Formatting

## Problem

The state accountant prompt (`src/llm/prompts/state-accountant-prompt.ts`) injected the planner's `ReducedPagePlanResult` via `JSON.stringify(reducedPlan, null, 2)`. This had two issues:

1. **rawResponse leak**: The runtime object is `ReducedPagePlanGenerationResult` (extends `ReducedPagePlanResult` with `rawResponse: string`). TypeScript's structural typing allows this subtype to pass, so `JSON.stringify` serialized the `rawResponse` field -- a massive JSON string duplicating all other fields, wasting tokens.

2. **Inconsistent format**: Other prompts (writer, lorekeeper) format the same planner data as human-readable structured text. The accountant was the only consumer using raw JSON.

## Solution

Added `formatReducedPlanForAccountant()` function in `state-accountant-prompt.ts` that formats the `ReducedPagePlanResult` as human-readable sections, matching existing codebase conventions. Replaced the `JSON.stringify` call with this formatter.

### Output format

```
Scene Intent: <sceneIntent>

Continuity Anchors:
- <anchor>

Writer Brief:
- Opening line directive: <directive>
- Must include beats:
  - <beat>
- Forbidden recaps:
  - <recap>

Dramatic Question: <dramaticQuestion>

Choice Intents:
1. [TYPE / DELTA] <hook>
```

## Files Changed

- `src/llm/prompts/state-accountant-prompt.ts` -- Added formatter function, replaced JSON.stringify
