# Content One-Shot Prompt

- Source: `src/llm/prompts/content-one-shot-prompt.ts`
- Orchestration: `src/llm/content-one-shot-generation.ts`
- Output schema: `src/llm/schemas/content-one-shot-schema.ts`
- Models: `src/models/content-generation-contracts.ts`

## Pipeline Position

Alternative fast path that bypasses the full 4-stage pipeline. Generates 18 context-rich content packets directly from exemplar ideas in a single LLM call, inferring taste implicitly.

**Pipeline**: User exemplars → **Content One-Shot** → Content packets (ready for concept seeding)

## System Message Template

```text
You are a wild-content ideator for branching interactive fiction. Generate story matter, not finished concepts, not plots, and not lore summaries.

Story matter means concrete imaginative payloads: impossible beings, invasive social systems, grotesque transformations, forbidden relationships, uncanny jobs, public policies, rituals, rivalries, ecologies, and world intrusions that can later seed concepts.

{{CONTENT_POLICY}}
```

## User Message Template

```text
Infer my imaginative taste from the exemplar ideas below, but do not copy their surface elements. Generate content packets that belong to the same creative appetite while still feeling original.

EXEMPLAR IDEAS:
{{exemplarIdeas array}}

{{optional GENRE VIBES}}
{{optional MOOD KEYWORDS}}
{{optional CONTENT PREFERENCES}}
{{optional STORY KERNEL block}}

OUTPUT REQUIREMENTS:
- Return exactly 18 packets
- Each packet must include `contentId`, `contentKind`, `sourceExemplarIds`, `premiseSummary`, `situationFrame`, `worldState`, `playerPosition`, `coreAnomaly`, `humanAnchor`, `socialEngine`, `choicePressure`, `signatureImage`, `escalationPath`, `wildnessInvariant`, `dullCollapse`, and `interactionVerbs`
- `playerPosition` is required and must describe who the player is, what they know or do not know, and why their position is inherently pressured
- `sourceExemplarIds` must cite one or more exemplar IDs that materially informed that packet
- `premiseSummary`, `situationFrame`, and `worldState` must carry setup explicitly rather than burying it all inside `coreAnomaly`
- `contentId` format: `pkt-NN`
- `interactionVerbs`: exactly 4-6 story-specific concrete verbs
- Generic verbs like `explore`, `fight`, or `talk` are not enough unless the packet makes them unusually concrete
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
      "contentId": "pkt-01",
      "contentKind": "CONTENT_KIND_ENUM",
      "sourceExemplarIds": ["exemplar-01"],
      "premiseSummary": "Plain-language causal setup",
      "situationFrame": "Immediate arrangement or trap",
      "worldState": "Relevant baseline reality",
      "playerPosition": "Who the player is, what they know, and why their position is pressured",
      "coreAnomaly": "What's wrong here?",
      "humanAnchor": "emotional/relational truth",
      "socialEngine": "social mechanism driving conflict",
      "choicePressure": "what forces meaningful choices",
      "signatureImage": "single vivid concrete image",
      "escalationPath": "how it intensifies",
      "wildnessInvariant": "what stays strange no matter what",
      "dullCollapse": "failure mode — what would make it generic",
      "interactionVerbs": ["verb1", "verb2", "verb3", "verb4"]
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
| Packet contract | Generated packet includes setup context and is later projected to lean `ConceptSeedPacket` fields | Generated packet includes setup context and is later projected to lean `ConceptSeedPacket` fields |

## Notes

- Speed-optimized path: single LLM call vs. 4 sequential calls
- No explicit taste profiling — taste is inferred from exemplar ideas
- No evaluation stage — all 18 packets are returned without scoring or role assignment
- The LLM emits flat context-rich packets; the service layer turns them into generated asset candidates with nested `context` and exemplar-derived `origin.sourceArtifacts`
- One-shot packets carry explicit exemplar lineage via `sourceExemplarIds`; the service layer maps those IDs into canonical `origin.sourceArtifacts`
- `playerPosition` is required because interactive fiction seeds need an explicit player-facing position from which meaningful choice pressure can operate
- `interactionVerbs` must stay story-specific; generic verbs are only acceptable when the packet itself makes them unusually concrete
- Prompt logging uses `promptType: 'contentOneShot'`
