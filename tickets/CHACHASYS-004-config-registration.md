# CHACHASYS-004: Chat LLM Stage Configuration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — llm-stage-registry.ts, configs/default.json
**Deps**: None

## Problem

The 5 new chat LLM stages (chatBible, chatPlanner, chatWriter, chatStateUpdater, chatSummarizer) must be registered in the stage registry and configured with model, maxTokens, and temperature settings. This must happen before any LLM generation tickets can be implemented.

## Assumption Reassessment (2026-03-27)

1. `src/config/llm-stage-registry.ts` exports `LLM_STAGE_KEYS` as a const array and `LlmStage` type — confirmed.
2. `configs/default.json` contains `llm.models`, `llm.stageMaxTokens`, `llm.stageTemperatures` sections — need to verify structure.
3. Adding new keys to the const array automatically extends the `LlmStage` union type.

## Architecture Check

1. Append new keys at the end of the array (alphabetical within chat group).
2. Config values exactly as specified in the spec.

## What to Change

### 1. Modify `src/config/llm-stage-registry.ts`

Add 5 new stage keys to the `LLM_STAGE_KEYS` array:
```typescript
'chatBible',
'chatPlanner',
'chatWriter',
'chatStateUpdater',
'chatSummarizer',
```

### 2. Modify `configs/default.json`

Add to `llm.models`:
```json
"chatBible": "anthropic/claude-sonnet-4.6",
"chatPlanner": "anthropic/claude-sonnet-4.6",
"chatWriter": "anthropic/claude-sonnet-4.6",
"chatStateUpdater": "x-ai/grok-4.20-beta",
"chatSummarizer": "x-ai/grok-4.20-beta"
```

Add to `llm.stageMaxTokens`:
```json
"chatBible": 3000,
"chatPlanner": 1000,
"chatWriter": 2000,
"chatStateUpdater": 2000,
"chatSummarizer": 1500
```

Add to `llm.stageTemperatures`:
```json
"chatBible": 0.3,
"chatPlanner": 0.3,
"chatWriter": 0.7,
"chatStateUpdater": 0.2,
"chatSummarizer": 0.2
```

## Files to Touch

- `src/config/llm-stage-registry.ts` (modify)
- `configs/default.json` (modify)

## Out of Scope

- LLM schemas, prompts, or generation code
- Any new files
- Persistence layer
- Server routes or UI
- Modifying any other config files

## Acceptance Criteria

### Tests That Must Pass

1. Typecheck: `LlmStage` type includes `'chatBible' | 'chatPlanner' | 'chatWriter' | 'chatStateUpdater' | 'chatSummarizer'`
2. Unit test: `LLM_STAGE_KEYS` array contains all 5 new keys
3. Existing suite: `npm test` passes (no regressions)
4. `npm run typecheck` passes

### Invariants

1. Existing stage keys are unchanged
2. `LlmStage` union type is derived from the array (no manual type duplication)
3. Config values match spec exactly

## Test Plan

### New/Modified Tests

1. `test/unit/config/llm-stage-registry.test.ts` — if it exists, verify new keys are present; if not, add a simple assertion

### Commands

1. `npm run typecheck`
2. `npm test`
