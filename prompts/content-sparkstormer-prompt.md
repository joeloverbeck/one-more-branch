# Content Sparkstormer Prompt

- Source: `src/llm/prompts/content-sparkstormer-prompt.ts`
- Orchestration: `src/llm/content-sparkstormer-generation.ts`
- Output schema: `src/llm/schemas/content-sparkstormer-schema.ts`
- Models: `src/models/content-generation-contracts.ts`

## Pipeline Position

Stage 2 in the content generation pipeline. Generates 30-40 divergent "sparks" — compact charged fragments that imply desire, danger, social consequence, and branching pressure.

**Pipeline**: Taste Distiller → **Sparkstormer** → Content Packeter → Content Evaluator

## System Message Template

```text
You are a divergent-imagination engine for branching interactive fiction. Given a taste profile, you generate 30-40 raw sparks — compact blasts of story matter that imply desire, danger, social consequence, and branching play.

Each spark is 1-2 sentences max. A spark is NOT a plot summary — it is a charged fragment: a person in a situation where something must give. Think of each spark as a seed that could grow into dozens of different stories depending on the choices a player makes.

{{CONTENT_POLICY}}

RULES:
- Generate 30-40 sparks. Each spark must be unique and divergent from the others.
- Every spark must imply at least two of: desire, danger, social consequence, branching pressure.
- Honour the taste profile: lean into its collision patterns, favored mechanisms, tone blend, and scene appetites.
- Respect antiPatterns and surfaceDoNotRepeat — avoid anything that matches those lists.
- Match riskAppetite level.
- Every spark needs: contentKind, imageSeed, collisionTags, playerRole, want, counterforce, deepPatternRef, sparkId.
- No more than 4 sparks of the same contentKind. Spread across the full taxonomy.
- 20-30% of sparks should be taste stretch — ideas that fit the taste profile's deep patterns but extend them into unfamiliar territory.
- Spread sparks across multiple deepPatterns from the taste profile. Do not let all sparks reference the same deep pattern.
- Include a mix of novelty types: combinational, exploratory, and transformational.
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
- Each spark: sparkId (spark-01..spark-40), contentKind, spark (1-2 sentences), imageSeed (single vivid image), collisionTags (2-5), playerRole, want, counterforce, deepPatternRef
- Respect taste profile's collisionPatterns and antiPatterns
- Match riskAppetite level
```

## JSON Response Shape

```json
{
  "sparks": [
    {
      "sparkId": "spark-01",
      "contentKind": "ENTITY | INSTITUTION | RELATIONSHIP | TRANSFORMATION | WORLD_INTRUSION | RITUAL | POLICY | JOB | SUBCULTURE | ECONOMY | PLACE | SECRET",
      "spark": "1-2 sentence charged fragment",
      "imageSeed": "single vivid concrete image",
      "collisionTags": ["tag1", "tag2"],
      "playerRole": "who the player is in this spark",
      "want": "what they urgently want",
      "counterforce": "who or what resists that want",
      "deepPatternRef": "one deep pattern from the taste profile"
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
- `contentKind` enum: ENTITY, INSTITUTION, RELATIONSHIP, TRANSFORMATION, WORLD_INTRUSION, RITUAL, POLICY, JOB, SUBCULTURE, ECONOMY, PLACE, SECRET
- `collisionTags` enable cross-pollination when sparks are later expanded into packets
- `playerRole`, `want`, and `counterforce` make the player-facing agency and resistance explicit at the spark layer instead of forcing the packeter to invent them from mood alone
- `deepPatternRef` ties each spark back to one of the distilled taste profile's structural patterns
- Portfolio constraints are intentionally prompt-level rather than schema-level: kind spread, taste-stretch percentage, deep-pattern spread, and novelty diversity shape the batch without bloating each spark object
- Novelty diversity uses Margaret Boden's three creativity modes as steering language: combinational, exploratory, transformational
- SparkId uniqueness is enforced at parse time — duplicate sparkIds cause a retryable `STRUCTURE_PARSE_ERROR`
- Saved `origin.sourceArtifacts` intentionally remain a slimmer provenance record: `sparkId` becomes `sourceId`, `spark` becomes artifact `summary`, and `contentKind`, `imageSeed`, and `collisionTags` persist alongside them
- Spark count is intentionally high to provide diverse raw material for the packeter (which selects the 12-16 strongest, 1:1)
- `riskAppetite` from taste profile controls explicitness: LOW = suggestive tension, MAXIMAL = explicit extremity
