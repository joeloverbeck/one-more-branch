# Content Packeter Prompt

- Source: `src/llm/prompts/content-packeter-prompt.ts`
- Orchestration: `src/llm/content-packeter-generation.ts`
- Output schema: `src/llm/schemas/content-packeter-schema.ts`
- Models: `src/models/content-generation-contracts.ts`

## Pipeline Position

Stage 3 in the content generation pipeline. Selects and expands the 12-16 strongest sparks into load-bearing content packets with explicit setup context plus the lean downstream packet fields. Each packet is built from exactly ONE primary spark (1:1 mapping).

**Pipeline**: Taste Distiller → Sparkstormer → **Content Packeter** → Content Evaluator

## System Message Template

```text
You are a content-packeting engine for branching interactive fiction. Given a taste profile and a set of raw sparks, you expand the best sparks into 12-16 load-bearing content packets.

Each packet is a fully fleshed-out content seed with explicit setup context and structure: premiseSummary, situationFrame, worldState, playerPosition, coreAnomaly, humanAnchor, socialEngine, choicePressure, signatureImage, escalationPath, wildnessInvariant, dullCollapse, and interactionVerbs. These packets will later be evaluated, ranked, and woven into story concepts.

{{CONTENT_POLICY}}
```

## User Message Template

```text
Expand the best 12-16 sparks into full content packets.

TASTE PROFILE:
{{tasteProfile JSON}}

SPARKS:
{{sparks array from sparkstormer}}

{{optional STORY KERNEL block}}

OUTPUT REQUIREMENTS:
- Return JSON matching exactly: { "packets": [ ... ] }
- Each packet object must have: `contentId`, `sourceSparkIds`, `contentKind`, `premiseSummary`, `situationFrame`, `worldState`, `playerPosition`, `coreAnomaly`, `humanAnchor`, `socialEngine`, `choicePressure`, `signatureImage`, `escalationPath`, `wildnessInvariant`, `dullCollapse`, `interactionVerbs`
- `playerPosition` is required in every packet and must describe who the player is, what they know or do not know, and why their position is inherently pressured
- `premiseSummary`, `situationFrame`, and `worldState` must carry setup explicitly rather than burying it all inside `coreAnomaly`
- `interactionVerbs`: exactly 4-6 story-specific action verbs per packet
- Generic verbs like `explore`, `fight`, or `talk` are not enough unless the packet makes them unusually concrete
- 12-16 packets total
```

## JSON Response Shape

```json
{
  "packets": [
    {
      "contentId": "pkt-01",
      "sourceSparkIds": ["spark-01"],
      "contentKind": "CONTENT_KIND_ENUM",
      "premiseSummary": "Plain-language causal setup",
      "situationFrame": "Immediate arrangement or trap",
      "worldState": "Relevant baseline reality",
      "playerPosition": "Who the player is, what they know, and why their position is pressured",
      "coreAnomaly": "What's wrong here? — central question",
      "humanAnchor": "emotional/relational truth",
      "socialEngine": "social mechanism driving conflict",
      "choicePressure": "what forces meaningful choices",
      "signatureImage": "single vivid concrete image",
      "escalationPath": "how it intensifies/spirals",
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
| tasteProfile | Taste Distiller output | Yes |
| sparks | Sparkstormer output | Yes |
| kernel | StoryKernel | No |

## Downstream Usage

Content packets are the primary semantic units consumed by concept stages:

- **Concept Seeder**: Each seed assigns a `primaryContentId` from packets
- **Concept Architect**: Operationalizes `coreAnomaly` in settingAxioms, derives keyInstitutions from `socialEngine`
- **Concept Engineer**: Uses `escalationPath` and `socialEngine` for pressureSource/ironicTwist
- **Concept Specificity**: Uses `wildnessInvariant` + `dullCollapse` for invariant-removal test
- **Concept Stress Tester**: Uses `wildnessInvariant` + `dullCollapse` for erosion check

## Notes

- `wildnessInvariant` is the most critical field — it carries the core strangeness that must survive all downstream stages
- `dullCollapse` describes the failure mode — what the packet becomes if its uniqueness is stripped away
- `playerPosition` is a required part of the packet contract and should name the player's pressured position rather than merely describing abstract tension
- `interactionVerbs` (4-6) provide concrete, story-specific player action vocabulary; generic verbs are only acceptable when the packet itself makes them unusually concrete
- `premiseSummary`, `situationFrame`, and `worldState` are generation-time context inputs for the saved asset candidate; they are not part of the lean downstream `ConceptSeedPacket` projection used by concept stages
- `sourceSparkIds` traces lineage back to sparkstormer output and should be treated as transient generation lineage rather than a persisted display alias
- Each packet expands exactly ONE spark — `sourceSparkIds` must contain exactly 1 entry (enforced at parse time, not in the JSON Schema — Anthropic rejects `maxItems`). Cross-packet uniqueness is also enforced: no two packets may reference the same sparkId
