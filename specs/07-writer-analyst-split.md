# Spec 07: Writer/Analyst Two-Call Split for Continuation Pages

## Problem Statement

The current continuation page generation asks the LLM to perform two fundamentally different cognitive tasks in a single prompt:

1. **Creative writing** - Generate narrative prose, choices, emotional state, state changes
2. **Analytical evaluation** - Evaluate story beat completion and detect narrative deviations from the planned story structure

Research confirms this multi-task approach degrades both outputs:
- Tam et al. (2024): Structured JSON output caused 26.7% accuracy drop on reasoning tasks (GSM8K: 75.99% → 49.25%)
- MDPI Electronics (2025): Multi-task prompting shows progressive degradation across all tested LLM families
- Anthropic documentation: Explicitly recommends prompt chaining over monolithic prompts for complex tasks
- LLM Review (Jan 2025): Separating generation from evaluation improved all five measured quality dimensions

The current `STORY_GENERATION_SCHEMA` has 20+ required fields mixing creative output (`narrative`, `choices`, `protagonistAffect`) with analytical output (`beatConcluded`, `deviationDetected`, `invalidatedBeatIds`). This forces the LLM to split focus between creative prose and structural analysis in a single pass, producing "checkbox-driven" writing.

## Solution

Split continuation page generation into two sequential LLM calls:

1. **Writer Call** (creative, temperature ~0.8) - Generates narrative, choices, and all state changes
2. **Analyst Call** (analytical, temperature ~0.3) - Evaluates the generated narrative against story structure for beat completion and deviation detection

Results are merged into the existing `ContinuationGenerationResult` type before downstream processing, preserving full backward compatibility with page building, deviation handling, and storage.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Writer sees structure? | Yes (context only, no evaluation instructions) | Helps writer naturally advance toward beat objectives without evaluation burden |
| Analyst failure mode | Graceful degradation (defaults + warning) | Page is saved, story continues, structure progression pauses for that page |
| Orchestration location | `page-service.ts` (explicit) | Transparent, debuggable, allows engine-level decisions like skipping analyst call |
| Temperature strategy | Writer ~0.8, Analyst ~0.3 (configurable) | Research shows different temperatures optimize creative vs analytical tasks |
| When analyst runs | Only when story has structure | No-structure stories skip the analyst call entirely (same as current behavior) |

## Architecture

### Current Flow (Single Call)
```
generateNextPage()
  → generateContinuationPage() [1 LLM call, 20+ field response]
  → validate + transform response
  → handle deviation if detected
  → apply structure progression
  → build page + save
```

### New Flow (Two Calls)
```
generateNextPage()
  → generateWriterPage() [Writer Call: narrative + choices + state]
  → generateAnalystEvaluation() [Analyst Call: beat eval + deviation] (if structure exists)
  → mergeWriterAndAnalystResults() → ContinuationGenerationResult
  → handle deviation if detected (unchanged)
  → apply structure progression (unchanged)
  → build page + save (unchanged)
```

## New Types

### `WriterResult` (in `src/llm/types.ts`)

```typescript
export interface WriterResult {
  narrative: string;
  choices: string[];
  currentLocation: string;
  threatsAdded: string[];
  threatsRemoved: string[];
  constraintsAdded: string[];
  constraintsRemoved: string[];
  threadsAdded: string[];
  threadsResolved: string[];
  newCanonFacts: string[];
  newCharacterCanonFacts: Record<string, string[]>;
  inventoryAdded: string[];
  inventoryRemoved: string[];
  healthAdded: string[];
  healthRemoved: string[];
  characterStateChangesAdded: Array<{ characterName: string; states: string[] }>;
  characterStateChangesRemoved: Array<{ characterName: string; states: string[] }>;
  protagonistAffect: ProtagonistAffect;
  isEnding: boolean;
  rawResponse: string;
}
```

### `AnalystResult` (in `src/llm/types.ts`)

```typescript
export interface AnalystResult {
  beatConcluded: boolean;
  beatResolution: string;
  deviationDetected: boolean;
  deviationReason: string;
  invalidatedBeatIds: string[];
  narrativeSummary: string;
  rawResponse: string;
}
```

### `AnalystContext` (in `src/llm/types.ts`)

```typescript
export interface AnalystContext {
  narrative: string;
  structure: StoryStructure;
  accumulatedStructureState: AccumulatedStructureState;
  activeState: ActiveState;
}
```

## Writer Call Specification

### Schema: `WRITER_GENERATION_SCHEMA` (new file: `src/llm/schemas/writer-schema.ts`)

Identical to `STORY_GENERATION_SCHEMA` in `openrouter-schema.ts` but with these fields **removed**:
- `beatConcluded`
- `beatResolution`
- `deviationDetected`
- `deviationReason`
- `invalidatedBeatIds`
- `narrativeSummary`

The `required` array also removes these 6 fields. All other fields (including legacy `stateChangesAdded`/`stateChangesRemoved`) remain.

### Validation: `WriterResultSchema` (new file: `src/llm/schemas/writer-validation-schema.ts`)

Identical to `GenerationResultSchema` in `validation-schema.ts` but without the 6 analyst fields. The `superRefine` for choice count validation remains.

### Transformer: `validateWriterResponse()` (new file: `src/llm/schemas/writer-response-transformer.ts`)

Follows the same pattern as `validateGenerationResponse()` in `response-transformer.ts`:
- Normalizes malformed choices (reuse existing `normalizeRawResponse` logic)
- Parses via `WriterResultSchema`
- Trims all string fields, filters empty entries
- Returns `WriterResult` (no deviation construction, no beat fields)

### Prompt Changes

**File: `src/llm/prompts/continuation-prompt.ts`**

Change the `buildStoryStructureSection` call to `buildWriterStructureContext`:

```typescript
// Before:
const structureSection = buildStoryStructureSection(
  context.structure,
  context.accumulatedStructureState,
  context.activeState,
);

// After:
const structureSection = buildWriterStructureContext(
  context.structure,
  context.accumulatedStructureState,
);
```

The rest of the prompt remains identical.

### Structure Context for Writer

**New function in `src/llm/prompts/continuation/story-structure-section.ts`:**

```typescript
export function buildWriterStructureContext(
  structure: StoryStructure | undefined,
  accumulatedStructureState: AccumulatedStructureState | undefined,
): string
```

This function includes:
- Overall theme
- Current act: name, objective, stakes
- Beat lines with status (concluded/active/pending) - so the writer knows where in the story they are
- Remaining acts overview

This function does **NOT** include:
- `=== BEAT EVALUATION ===` section
- `DEVIATION_DETECTION_SECTION`
- Remaining beats for deviation evaluation
- Progression check hint
- Active state summary for beat evaluation

### Generation Strategy

**New file: `src/llm/writer-generation.ts`**

Follows the same pattern as `callOpenRouterStructured()` in `generation-strategy.ts`:
- Uses `WRITER_GENERATION_SCHEMA` instead of `STORY_GENERATION_SCHEMA`
- Uses `validateWriterResponse()` instead of `validateGenerationResponse()`
- Returns `WriterResult`

Includes a `generateWriterWithFallback()` export with the same structured-output-not-supported error handling.

### Client Function

**New function in `src/llm/client.ts`:**

```typescript
export async function generateWriterPage(
  context: ContinuationContext,
  options: GenerationOptions,
): Promise<WriterResult>
```

Follows the same pattern as `generateContinuationPage()`:
- Resolves prompt options
- Builds continuation prompt (which now uses writer structure context)
- Logs prompt
- Calls `withRetry(() => generateWriterWithFallback(messages, resolvedOptions))`

## Analyst Call Specification

### Schema: `ANALYST_SCHEMA` (new file: `src/llm/schemas/analyst-schema.ts`)

Minimal JSON schema with only the 6 analyst fields:

```typescript
export const ANALYST_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'analyst_evaluation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        beatConcluded: {
          type: 'boolean',
          description: 'True if the active beat objective was achieved OR if the narrative has progressed beyond the beat scope into later beat territory. Evaluate cumulative progress, not just this single page.',
        },
        beatResolution: {
          type: 'string',
          description: 'If beatConcluded is true, briefly describe how the beat was resolved. Required when beatConcluded is true.',
        },
        deviationDetected: {
          type: 'boolean',
          description: 'True when remaining planned beats are invalidated by the narrative direction.',
        },
        deviationReason: {
          type: 'string',
          description: 'Concise explanation for detected deviation; empty when no deviation.',
        },
        invalidatedBeatIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Beat IDs invalidated by deviation (format: X.Y); empty when no deviation.',
        },
        narrativeSummary: {
          type: 'string',
          description: 'Short summary of current narrative state for rewrite context; empty when no deviation.',
        },
      },
      required: ['beatConcluded', 'beatResolution', 'deviationDetected', 'deviationReason', 'invalidatedBeatIds', 'narrativeSummary'],
      additionalProperties: false,
    },
  },
};
```

### Validation: `AnalystResultSchema` (new file: `src/llm/schemas/analyst-validation-schema.ts`)

```typescript
export const AnalystResultSchema = z.object({
  beatConcluded: z.boolean().default(false),
  beatResolution: z.string().default(''),
  deviationDetected: z.boolean().default(false),
  deviationReason: z.string().default(''),
  invalidatedBeatIds: z.array(z.string()).optional().default([]),
  narrativeSummary: z.string().default(''),
});
```

### Transformer: `validateAnalystResponse()` (new file: `src/llm/schemas/analyst-response-transformer.ts`)

- Parses raw JSON
- Validates via `AnalystResultSchema`
- Trims all strings
- Filters `invalidatedBeatIds` to match `X.Y` pattern (regex: `/^\d+\.\d+$/`)
- Returns `AnalystResult`

### Analyst System Prompt

**New file: `src/llm/prompts/analyst-prompt.ts`**

System prompt:

```
You are a story structure analyst for interactive fiction. Your role is to evaluate a narrative passage against a planned story structure and determine:
1. Whether the current story beat has been concluded
2. Whether the narrative has deviated from the planned beats

You analyze ONLY structure progression and deviation. You do NOT write narrative or make creative decisions.

Be analytical and precise. Evaluate cumulative progress, not just single scenes.
Be conservative about deviation - minor variations are acceptable. Only mark true deviation when future beats are genuinely invalidated.
```

User prompt constructed from:
1. The story structure evaluation section (via `buildAnalystStructureEvaluation()`)
2. The generated narrative text: `NARRATIVE TO EVALUATE:\n${narrative}`

### Structure Evaluation for Analyst

**New function in `src/llm/prompts/continuation/story-structure-section.ts`:**

```typescript
export function buildAnalystStructureEvaluation(
  structure: StoryStructure,
  accumulatedStructureState: AccumulatedStructureState,
  activeState: ActiveState,
): string
```

Contains the same content as the current `buildStoryStructureSection()` but with reframed instructions:
- "Evaluate the following narrative against this structure" instead of "After writing the narrative"
- Includes the full `=== BEAT EVALUATION ===` section
- Includes the full `DEVIATION_DETECTION_SECTION`
- Includes remaining beats for deviation evaluation
- Includes active state summary for beat evaluation context
- Includes progression check hint

### Generation Strategy

**New file: `src/llm/analyst-generation.ts`**

Follows the `callOpenRouterStructured()` pattern:
- Uses `ANALYST_SCHEMA`
- Uses `validateAnalystResponse()`
- Returns `AnalystResult`
- Uses lower temperature (default 0.3) and smaller maxTokens (default 1024)

Includes `generateAnalystWithFallback()` with structured-output-not-supported error handling.

### Client Function

**New function in `src/llm/client.ts`:**

```typescript
export async function generateAnalystEvaluation(
  context: AnalystContext,
  options: GenerationOptions,
): Promise<AnalystResult>
```

- Builds analyst prompt from context
- Logs prompt
- Overrides temperature to 0.3 and maxTokens to 1024
- Calls `withRetry(() => generateAnalystWithFallback(messages, analystOptions))`

## Result Merger

**New file: `src/llm/result-merger.ts`**

```typescript
import { createBeatDeviation, createNoDeviation } from '../models/story-arc.js';
import type { AnalystResult, ContinuationGenerationResult, WriterResult } from './types.js';

export function mergeWriterAndAnalystResults(
  writer: WriterResult,
  analyst: AnalystResult | null,
): ContinuationGenerationResult {
  const beatConcluded = analyst?.beatConcluded ?? false;
  const beatResolution = analyst?.beatResolution ?? '';
  const deviationReason = analyst?.deviationReason?.trim() ?? '';
  const narrativeSummary = analyst?.narrativeSummary?.trim() ?? '';
  const invalidatedBeatIds = analyst?.invalidatedBeatIds ?? [];

  const deviation =
    analyst?.deviationDetected && deviationReason && narrativeSummary && invalidatedBeatIds.length > 0
      ? createBeatDeviation(deviationReason, invalidatedBeatIds, narrativeSummary)
      : createNoDeviation();

  return {
    ...writer,
    beatConcluded,
    beatResolution,
    deviation,
    rawResponse: writer.rawResponse,
  };
}
```

When `analyst` is `null` (no structure), all beat/deviation fields default to their zero values - identical to current behavior for structureless stories.

## Orchestration Change

**File: `src/engine/page-service.ts` - `generateNextPage()` function**

Replace the single LLM call:

```typescript
// BEFORE (single call):
const result = await generateContinuationPage(context, { apiKey });

// AFTER (two calls):
const writerResult = await generateWriterPage(
  {
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    npcs: story.npcs,
    globalCanon: story.globalCanon,
    globalCharacterCanon: story.globalCharacterCanon,
    structure: currentStructureVersion?.structure ?? story.structure ?? undefined,
    accumulatedStructureState: parentState.structureState,
    previousNarrative: parentPage.narrativeText,
    selectedChoice: choice.text,
    accumulatedInventory: parentState.accumulatedInventory,
    accumulatedHealth: parentState.accumulatedHealth,
    accumulatedCharacterState: parentState.accumulatedCharacterState,
    parentProtagonistAffect: parentPage.protagonistAffect,
    activeState: parentState.accumulatedActiveState,
    grandparentNarrative: grandparentPage?.narrativeText ?? null,
  },
  { apiKey },
);

// Analyst call only when structure exists
let analystResult: AnalystResult | null = null;
const activeStructure = currentStructureVersion?.structure ?? story.structure;
if (activeStructure && parentState.structureState) {
  try {
    analystResult = await generateAnalystEvaluation(
      {
        narrative: writerResult.narrative,
        structure: activeStructure,
        accumulatedStructureState: parentState.structureState,
        activeState: parentState.accumulatedActiveState,
      },
      { apiKey },
    );
  } catch (error) {
    // Graceful degradation: log warning, continue without analyst data
    logger.warn('Analyst evaluation failed, continuing with defaults', { error });
  }
}

const result = mergeWriterAndAnalystResults(writerResult, analystResult);
```

Everything downstream of `result` remains **completely unchanged**: deviation handling, structure progression, page building, canon update, storage.

## Export Updates

### `src/llm/index.ts`
Add exports:
- `generateWriterPage`, `generateAnalystEvaluation` from `./client.js`
- `WriterResult`, `AnalystResult`, `AnalystContext` types from `./types.js`
- `mergeWriterAndAnalystResults` from `./result-merger.js`

### `src/llm/schemas/index.ts`
Add exports:
- `WRITER_GENERATION_SCHEMA` from `./writer-schema.js`
- `ANALYST_SCHEMA` from `./analyst-schema.js`
- `validateWriterResponse` from `./writer-response-transformer.js`
- `validateAnalystResponse` from `./analyst-response-transformer.js`

### `src/llm/prompts/index.ts`
Add export:
- `buildAnalystPrompt` from `./analyst-prompt.js`

### `src/llm/prompts/continuation/index.ts`
Add exports:
- `buildWriterStructureContext` from `./story-structure-section.js`
- `buildAnalystStructureEvaluation` from `./story-structure-section.js`

## Backward Compatibility

- `GenerationResult` and `ContinuationGenerationResult` types are **unchanged**
- `mergeWriterAndAnalystResults()` produces the exact same `ContinuationGenerationResult` shape
- All downstream code (deviation handler, structure progression, page builder, canon manager, storage) remains **unchanged**
- The existing `generateContinuationPage()` function in `client.ts` is **preserved** (deprecated, not removed) for any code that still references it
- The existing `STORY_GENERATION_SCHEMA` is **preserved** (deprecated) for any code that references it
- The existing `buildStoryStructureSection()` is **preserved** (deprecated) for existing tests

## Files Summary

### New Files (10)
| File | Purpose |
|------|---------|
| `src/llm/schemas/writer-schema.ts` | JSON schema for writer LLM call |
| `src/llm/schemas/writer-validation-schema.ts` | Zod validation for writer response |
| `src/llm/schemas/writer-response-transformer.ts` | Transform/validate writer response |
| `src/llm/schemas/analyst-schema.ts` | JSON schema for analyst LLM call |
| `src/llm/schemas/analyst-validation-schema.ts` | Zod validation for analyst response |
| `src/llm/schemas/analyst-response-transformer.ts` | Transform/validate analyst response |
| `src/llm/prompts/analyst-prompt.ts` | Analyst prompt builder |
| `src/llm/writer-generation.ts` | Writer LLM call strategy |
| `src/llm/analyst-generation.ts` | Analyst LLM call strategy |
| `src/llm/result-merger.ts` | Merge writer + analyst results |

### Modified Files (6)
| File | Change |
|------|--------|
| `src/llm/types.ts` | Add WriterResult, AnalystResult, AnalystContext interfaces |
| `src/llm/client.ts` | Add generateWriterPage(), generateAnalystEvaluation() |
| `src/llm/prompts/continuation-prompt.ts` | Use buildWriterStructureContext instead of buildStoryStructureSection |
| `src/llm/prompts/continuation/story-structure-section.ts` | Add buildWriterStructureContext(), buildAnalystStructureEvaluation() |
| `src/engine/page-service.ts` | Two-call orchestration with merge |
| Various index.ts files | Export new modules |

### New Test Files (6)
| File | Tests |
|------|-------|
| `test/unit/llm/schemas/writer-response-transformer.test.ts` | Writer response parsing, trimming, malformed choices |
| `test/unit/llm/schemas/analyst-response-transformer.test.ts` | Analyst response parsing, beat ID filtering |
| `test/unit/llm/result-merger.test.ts` | Merge logic, null analyst handling, deviation construction |
| `test/unit/llm/prompts/analyst-prompt.test.ts` | Analyst prompt construction |
| `test/unit/llm/prompts/continuation/writer-structure-context.test.ts` | Writer structure context (no eval instructions) |
| Updated: `test/unit/engine/page-service.test.ts` | Mock two calls instead of one |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Double API cost | ~15-25% increase (analyst payload is small) | Analyst uses smaller maxTokens (1024), smaller input (no worldbuilding/NPCs/grandparent) |
| Increased latency | ~1-2 seconds per page | Analyst call is fast due to small payload. Acceptable for interactive fiction |
| Analyst call failure | Beat/deviation data lost for one page | Graceful degradation: defaults used, warning logged, story continues |
| Schema drift | Writer/analyst schemas diverge from main types | Type-safe merger function is the single integration point |
| Test maintenance | More mocks to maintain | Clear separation makes each mock simpler and more focused |

## Verification Plan

1. `npm run build` - TypeScript compiles
2. `npm run typecheck` - All types resolve
3. `npm run lint` - No lint errors
4. `npm run test:unit` - All tests pass (existing + new)
5. `npm run test:integration` - Flow works end-to-end
6. Manual: Generate continuation pages and verify:
   - Narrative quality maintained or improved
   - Beat progression works (beats conclude appropriately)
   - Deviation detection triggers when story diverges
   - Stories without structure work (analyst call skipped)
   - Analyst failure doesn't crash page generation
