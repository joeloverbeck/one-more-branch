# Content Taste Distiller Prompt

- Source: `src/llm/prompts/content-taste-distiller-prompt.ts`
- Orchestration: `src/llm/content-taste-distiller-generation.ts`
- Output schema: `src/llm/schemas/content-taste-distiller-schema.ts`
- Models: `src/models/content-packet.ts`

## Pipeline Position

Stage 1 in the content generation pipeline. Infers the user's deep creative appetites from exemplar ideas, distilling gustatory DNA beneath surface-level nouns and plots.

**Pipeline**: **Taste Distiller** → Sparkstormer → Content Packeter → Content Evaluator

## System Message Template

```text
You are a gustatory DNA extractor for interactive fiction taste. Given exemplar ideas, infer the user's deep creative appetites — what makes their taste unique beneath surface-level nouns and plots.

Do NOT praise the ideas. Do NOT copy surface nouns. Distill the generative DNA beneath them.

{{CONTENT_POLICY}}
```

## User Message Template

```text
Distill the creative taste profile from these exemplar ideas.

EXEMPLAR IDEAS:
{{exemplarIdeas array}}

{{optional MOOD/GENRE: moodOrGenre string}}
{{optional CONTENT PREFERENCES: contentPreferences string}}

OUTPUT REQUIREMENTS:
- Return JSON: { "tasteProfile": TasteProfile }
- collisionPatterns: 4-8 items (what incompatible things collide)
- favoredMechanisms: beloved systems (transformation, bureaucracy, etc.)
- humanAnchors: types of emotional grounding
- socialEngines: preferred power/social structures
- toneBlend: tonal mixing (ironic + earnest, etc.)
- sceneAppetites: scene types the user craves
- antiPatterns: what bores/betrays the taste
- surfaceDoNotRepeat: concrete nouns/creatures/jobs to avoid recycling
- riskAppetite: LOW | MEDIUM | HIGH | MAXIMAL
```

## JSON Response Shape

```json
{
  "tasteProfile": {
    "collisionPatterns": ["string"],
    "favoredMechanisms": ["string"],
    "humanAnchors": ["string"],
    "socialEngines": ["string"],
    "toneBlend": ["string"],
    "sceneAppetites": ["string"],
    "antiPatterns": ["string"],
    "surfaceDoNotRepeat": ["string"],
    "riskAppetite": "LOW | MEDIUM | HIGH | MAXIMAL"
  }
}
```

## Context Table

| Field | Source | Required |
|-------|--------|----------|
| exemplarIdeas | User input (3+ story concepts) | Yes |
| moodOrGenre | User input | No |
| contentPreferences | User input | No |

## Notes

- Entry point for the full content pipeline — all downstream stages receive the taste profile as gravitational anchor
- Taste profile is reusable: can seed multiple spark batches or different content generation runs
- `riskAppetite` is a first-class dimension controlling explicitness/taboo thresholds downstream
- The prompt explicitly forbids copying surface nouns from exemplars (e.g., "dragons", "spaceships") — only the generative patterns beneath them
