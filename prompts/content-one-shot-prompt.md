# Content One-Shot Prompt

- Source: `src/llm/prompts/content-one-shot-prompt.ts`
- Orchestration: `src/llm/content-one-shot-generation.ts`
- Output schema: `src/llm/schemas/content-one-shot-schema.ts`
- Models: `src/models/content-packet.ts`

## Pipeline Position

Alternative fast path that bypasses the full 4-stage pipeline. Generates 18 content packets directly from exemplar ideas in a single LLM call, inferring taste implicitly.

**Pipeline**: User exemplars → **Content One-Shot** → Content packets (ready for concept seeding)

## System Message Template

```text
You are a content seed generator for interactive fiction. Generate 18 strong content packets directly from exemplar ideas, inferring the user's taste implicitly. Each packet must feel specific, human, and charged.

Do not copy the exemplar ideas' surface nouns. Extract the generative DNA beneath them.

{{CONTENT_POLICY}}
```

## User Message Template

```text
Generate 18 content packets from these exemplar ideas.

EXEMPLAR IDEAS:
{{exemplarIdeas array}}

{{optional GENRE VIBES}}
{{optional MOOD KEYWORDS}}
{{optional CONTENT PREFERENCES}}
{{optional STORY KERNEL block}}

OUTPUT REQUIREMENTS:
- Return JSON: { "packets": ContentPacketOneShot[] }
- Exactly 18 packets
- Use 6+ distinct content kinds
- Mix intimate, civic, and civilizational scales
- Mix mechanisms (transformation, bureaucracy, romance, medicine, labor, ecology, ritual, etc.)
- At least half should contain structural irony
```

## JSON Response Shape

```json
{
  "packets": [
    {
      "title": "string",
      "contentKind": "CONTENT_KIND_ENUM",
      "coreAnomaly": "What's wrong here?",
      "humanAnchor": "emotional/relational truth",
      "socialEngine": "social mechanism driving conflict",
      "choicePressure": "what forces meaningful choices",
      "signatureImage": "single vivid concrete image",
      "escalationHint": "how it intensifies",
      "wildnessInvariant": "what stays strange no matter what",
      "dullCollapse": "failure mode — what would make it generic"
    }
  ]
}
```

## Context Table

| Field | Source | Required |
|-------|--------|----------|
| exemplarIdeas | User input | Yes |
| genreVibes | User input | No |
| moodKeywords | User input | No |
| contentPreferences | User input | No |
| kernel | StoryKernel | No |

## Differences from Full Pipeline

| Aspect | Full Pipeline | One-Shot |
|--------|--------------|----------|
| Stages | 4 (Taste → Sparks → Packets → Eval) | 1 |
| Taste profiling | Explicit TasteProfile | Implicit inference |
| Spark count | 30-40 | N/A (skipped) |
| Packet count | 12-16 | 18 |
| Evaluation | Separate scoring + role labels | None (all packets returned) |
| Field differences | `escalationPath`, `interactionVerbs`, `sourceSparkIds` | `title`, `escalationHint` (simpler fields) |

## Notes

- Speed-optimized path: single LLM call vs. 4 sequential calls
- No explicit taste profiling — taste is inferred from exemplar ideas
- No evaluation stage — all 18 packets are returned without scoring or role assignment
- Uses `escalationHint` instead of the full pipeline's `escalationPath`
- Includes `title` field (not present in full pipeline packets)
- Does not include `interactionVerbs` or `sourceSparkIds`
- Prompt logging uses `promptType: 'contentOneShot'`
