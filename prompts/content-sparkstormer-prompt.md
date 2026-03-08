# Content Sparkstormer Prompt

- Source: `src/llm/prompts/content-sparkstormer-prompt.ts`
- Orchestration: `src/llm/content-sparkstormer-generation.ts`
- Output schema: `src/llm/schemas/content-sparkstormer-schema.ts`
- Models: `src/models/content-packet.ts`

## Pipeline Position

Stage 2 in the content generation pipeline. Generates 30-40 divergent "sparks" — compact charged fragments that imply desire, danger, social consequence, and branching pressure.

**Pipeline**: Taste Distiller → **Sparkstormer** → Content Packeter → Content Evaluator

## System Message Template

```text
You are a divergent idea engine for interactive fiction. Generate compact charged fragments — sparks — that imply desire, danger, social consequence, and branching pressure. Each spark is a seed that could grow into dozens of different stories.

Every spark must feel specific, human, and charged.

{{CONTENT_POLICY}}
```

## User Message Template

```text
Generate 30-40 divergent sparks guided by this taste profile.

TASTE PROFILE:
{{tasteProfile JSON}}

{{optional STORY KERNEL block}}
{{optional CONTENT PREFERENCES}}

OUTPUT REQUIREMENTS:
- Return JSON: { "sparks": ContentSpark[] }
- 30-40 unique sparks
- Each spark: sparkId (spark-01..spark-40), contentKind, spark (1-2 sentences), imageSeed (single vivid image), collisionTags (2-5)
- Respect taste profile's collisionPatterns and antiPatterns
- Match riskAppetite level
```

## JSON Response Shape

```json
{
  "sparks": [
    {
      "sparkId": "spark-01",
      "contentKind": "ENTITY | INSTITUTION | RELATIONSHIP | RITUAL | TECHNOLOGY | CONDITION | ECONOMY | ECOLOGY | TABOO | SECRET | TRANSFORMATION | GAME",
      "spark": "1-2 sentence charged fragment",
      "imageSeed": "single vivid concrete image",
      "collisionTags": ["tag1", "tag2"]
    }
  ]
}
```

## Context Table

| Field | Source | Required |
|-------|--------|----------|
| tasteProfile | Taste Distiller output | Yes |
| kernel | StoryKernel (gravitational anchor, not constraint) | No |
| contentPreferences | User input | No |

## Notes

- Generates 30-40 sparks (compressed 1-2 sentence fragments, not full concepts)
- `contentKind` enum: ENTITY, INSTITUTION, RELATIONSHIP, RITUAL, TECHNOLOGY, CONDITION, ECONOMY, ECOLOGY, TABOO, SECRET, TRANSFORMATION, GAME
- `collisionTags` enable cross-pollination when sparks are later fused into packets
- Spark count is intentionally high to provide diverse raw material for the packeter
- `riskAppetite` from taste profile controls explicitness: LOW = suggestive tension, MAXIMAL = explicit extremity
