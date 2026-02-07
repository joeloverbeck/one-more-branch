# STRSTOARCSYS-012: Update LLM Schemas

## Summary
Update the OpenRouter schema, validation schema, and response transformer to remove `storyArc` and add `beatConcluded`/`beatResolution` fields. Also create the structure generation schema.

## Files to Touch
- `src/llm/schemas/openrouter-schema.ts`
- `src/llm/schemas/validation-schema.ts`
- `src/llm/schemas/response-transformer.ts`
- `src/llm/schemas/structure-schema.ts` (NEW)
- `src/llm/schemas/index.ts` (add exports)
- `src/llm/types.ts` (update GenerationResult)

## Out of Scope
- DO NOT modify prompts (that's STRSTOARCSYS-004/005/006)
- DO NOT modify engine layer
- DO NOT modify persistence layer
- DO NOT create the structure generator function (that's STRSTOARCSYS-013)

## Implementation Details

### Create `src/llm/schemas/structure-schema.ts`

```typescript
import { JsonSchema } from '../types';

export const STRUCTURE_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'story_structure',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        overallTheme: {
          type: 'string',
          description: 'Central conflict or goal of the entire story',
        },
        acts: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Evocative title for the act',
              },
              objective: {
                type: 'string',
                description: 'Main goal of this act',
              },
              stakes: {
                type: 'string',
                description: 'What is at risk if protagonist fails',
              },
              entryCondition: {
                type: 'string',
                description: 'What triggers transition into this act',
              },
              beats: {
                type: 'array',
                minItems: 2,
                maxItems: 4,
                items: {
                  type: 'object',
                  properties: {
                    description: {
                      type: 'string',
                      description: 'What should happen in this beat',
                    },
                    objective: {
                      type: 'string',
                      description: 'Specific goal for the protagonist',
                    },
                  },
                  required: ['description', 'objective'],
                  additionalProperties: false,
                },
              },
            },
            required: ['name', 'objective', 'stakes', 'entryCondition', 'beats'],
            additionalProperties: false,
          },
        },
      },
      required: ['overallTheme', 'acts'],
      additionalProperties: false,
    },
  },
};
```

### Update `src/llm/schemas/openrouter-schema.ts`

Remove `storyArc` field:
```typescript
// REMOVE this from properties:
storyArc: {
  type: 'string',
  description: '...',
},
```

Add beat evaluation fields:
```typescript
// ADD these to properties:
beatConcluded: {
  type: 'boolean',
  description: 'True if current beat objective was fulfilled in this scene',
},
beatResolution: {
  type: 'string',
  description: 'If beatConcluded is true, briefly describe how the beat was resolved',
},
```

Update `required` array:
- Remove `'storyArc'` if present
- Add `'beatConcluded'`
- Add `'beatResolution'`

### Update `src/llm/schemas/validation-schema.ts`

Remove storyArc validation:
```typescript
// REMOVE:
storyArc: z.string().optional(),
```

Add beat evaluation validation:
```typescript
// ADD:
beatConcluded: z.boolean().default(false),
beatResolution: z.string().default(''),
```

### Update `src/llm/schemas/response-transformer.ts`

Remove storyArc transformation:
```typescript
// REMOVE any code handling storyArc
```

Add beat evaluation transformation:
```typescript
// ADD to the transformation:
beatConcluded: validated.beatConcluded,
beatResolution: validated.beatResolution,
```

### Update `src/llm/types.ts` - GenerationResult

```typescript
// BEFORE
export interface GenerationResult {
  // ... other fields ...
  storyArc?: string;  // REMOVE
  rawResponse: string;
}

// AFTER
export interface GenerationResult {
  // ... other fields ...
  beatConcluded: boolean;   // NEW
  beatResolution: string;   // NEW
  rawResponse: string;
}
```

## Acceptance Criteria

### Tests That Must Pass

Create/update `test/unit/llm/schemas.test.ts`:

1. Structure generation schema
   - Validates correct structure output
   - Rejects structure with fewer than 3 acts
   - Rejects acts with fewer than 2 beats
   - Rejects acts with more than 4 beats
   - Requires all act fields present
   - Requires all beat fields present

2. OpenRouter schema (generation)
   - Does NOT include `storyArc` field
   - Includes `beatConcluded` in schema
   - Includes `beatResolution` in schema

3. Validation schema
   - Validates `beatConcluded` as boolean
   - Validates `beatResolution` as string
   - Defaults `beatConcluded` to false when missing
   - Defaults `beatResolution` to empty string when missing
   - Does NOT validate `storyArc`

4. Response transformer
   - Transforms response with `beatConcluded: true`
   - Transforms response with `beatConcluded: false`
   - Includes `beatResolution` in transformed result
   - Does NOT include `storyArc` in output

### Invariants That Must Remain True
- All existing schema validation still works (narrative, choices, state, etc.)
- Schema is valid JSON Schema format
- Zod validation produces correct types
- TypeScript strict mode passes
- Response transformation is deterministic

## Dependencies
- None (can be developed early in parallel)

## Breaking Changes
- `GenerationResult.storyArc` removed
- `GenerationResult.beatConcluded` and `beatResolution` added
- Tests expecting `storyArc` will fail
- Tests not providing `beatConcluded`/`beatResolution` may fail

## Estimated Scope
~100 lines of schema code + ~150 lines of tests
