# STRSTOARCSYS-013: Structure Generator

## Summary
Create the structure generator that orchestrates calling the LLM with the structure prompt and parsing the response. This is the bridge between prompts/schemas and the engine layer.

## Files to Touch
- `src/llm/structure-generator.ts` (NEW)
- `src/llm/index.ts` (add export)

## Out of Scope
- DO NOT modify prompts (that's STRSTOARCSYS-004)
- DO NOT modify schemas (that's STRSTOARCSYS-012)
- DO NOT modify engine layer (that's STRSTOARCSYS-008)
- DO NOT modify the OpenRouter client

## Implementation Details

### Create `src/llm/structure-generator.ts`

```typescript
import { callOpenRouter, OpenRouterCallOptions } from './client';
import { buildStructurePrompt, StructureContext } from './prompts/structure-prompt';
import { STRUCTURE_GENERATION_SCHEMA } from './schemas/structure-schema';
import { GenerationOptions } from './types';

export interface StructureGenerationResult {
  overallTheme: string;
  acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      description: string;
      objective: string;
    }>;
  }>;
  rawResponse: string;
}

export async function generateStoryStructure(
  context: StructureContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<StructureGenerationResult> {
  const messages = buildStructurePrompt(context, options?.promptOptions);

  const callOptions: OpenRouterCallOptions = {
    apiKey,
    model: options?.model,
    temperature: options?.temperature ?? 0.8,  // Slightly creative for structure
    maxTokens: options?.maxTokens ?? 2000,    // Structure is relatively small
    responseFormat: STRUCTURE_GENERATION_SCHEMA,
  };

  const response = await callOpenRouter(messages, callOptions);

  // Parse the JSON response
  const parsed = parseStructureResponse(response);

  return {
    ...parsed,
    rawResponse: response,
  };
}

function parseStructureResponse(response: string): Omit<StructureGenerationResult, 'rawResponse'> {
  try {
    const data = JSON.parse(response);

    // Validate structure
    validateStructureData(data);

    return {
      overallTheme: data.overallTheme,
      acts: data.acts,
    };
  } catch (error) {
    throw new LLMError(
      `Failed to parse structure response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'STRUCTURE_PARSE_ERROR',
      false,
      { response },
    );
  }
}

function validateStructureData(data: unknown): asserts data is StructureGenerationResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not an object');
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.overallTheme !== 'string') {
    throw new Error('Missing or invalid overallTheme');
  }

  if (!Array.isArray(obj.acts) || obj.acts.length !== 3) {
    throw new Error('Must have exactly 3 acts');
  }

  for (const [index, act] of obj.acts.entries()) {
    validateActData(act, index);
  }
}

function validateActData(act: unknown, actIndex: number): void {
  if (!act || typeof act !== 'object') {
    throw new Error(`Act ${actIndex + 1} is not an object`);
  }

  const obj = act as Record<string, unknown>;

  const requiredStrings = ['name', 'objective', 'stakes', 'entryCondition'];
  for (const field of requiredStrings) {
    if (typeof obj[field] !== 'string') {
      throw new Error(`Act ${actIndex + 1} missing or invalid ${field}`);
    }
  }

  if (!Array.isArray(obj.beats)) {
    throw new Error(`Act ${actIndex + 1} beats must be an array`);
  }

  if (obj.beats.length < 2 || obj.beats.length > 4) {
    throw new Error(`Act ${actIndex + 1} must have 2-4 beats, got ${obj.beats.length}`);
  }

  for (const [beatIndex, beat] of obj.beats.entries()) {
    validateBeatData(beat, actIndex, beatIndex);
  }
}

function validateBeatData(beat: unknown, actIndex: number, beatIndex: number): void {
  if (!beat || typeof beat !== 'object') {
    throw new Error(`Act ${actIndex + 1} Beat ${beatIndex + 1} is not an object`);
  }

  const obj = beat as Record<string, unknown>;

  if (typeof obj.description !== 'string') {
    throw new Error(`Act ${actIndex + 1} Beat ${beatIndex + 1} missing description`);
  }

  if (typeof obj.objective !== 'string') {
    throw new Error(`Act ${actIndex + 1} Beat ${beatIndex + 1} missing objective`);
  }
}
```

### Update `src/llm/index.ts`

```typescript
export { generateStoryStructure } from './structure-generator';
export type { StructureGenerationResult } from './structure-generator';
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/llm/structure-generator.test.ts`:

1. `generateStoryStructure` successful call
   - Calls `callOpenRouter` with correct messages
   - Uses structure schema for response format
   - Returns parsed structure result
   - Includes rawResponse in result

2. `generateStoryStructure` with options
   - Passes custom temperature when provided
   - Passes custom model when provided
   - Uses default values when options not provided

3. `parseStructureResponse` valid input
   - Parses valid JSON structure
   - Returns all required fields
   - Handles all 3 acts with beats

4. `parseStructureResponse` invalid input
   - Throws on non-JSON response
   - Throws on missing overallTheme
   - Throws on wrong number of acts
   - Throws on acts with wrong number of beats
   - Throws on missing act fields
   - Throws on missing beat fields

5. Validation functions
   - `validateStructureData` accepts valid structure
   - `validateActData` catches missing fields
   - `validateBeatData` catches missing fields

### Invariants That Must Remain True
- Exactly 3 acts required (INV-6 from spec)
- 2-4 beats per act required (INV-5 from spec)
- All required fields must be present
- Response is always valid JSON
- LLMError thrown with appropriate code on failure
- TypeScript strict mode passes

## Dependencies
- STRSTOARCSYS-004 (structure prompt)
- STRSTOARCSYS-012 (structure schema)

## Integration Points
- Called by `story-service.ts` in STRSTOARCSYS-008
- Uses existing `callOpenRouter` client
- Uses existing retry logic

## Estimated Scope
~120 lines of code + ~150 lines of tests
