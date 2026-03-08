# Content Packeter Prompt

- Source: `src/llm/prompts/content-packeter-prompt.ts`
- Orchestration: `src/llm/content-packeter-generation.ts`
- Output schema: `src/llm/schemas/content-packeter-schema.ts`
- Models: `src/models/content-packet.ts`

## Pipeline Position

Stage 3 in the content generation pipeline. Selects and expands the 12-16 strongest sparks into load-bearing content packets — fully structured content seeds with rich metadata.

**Pipeline**: Taste Distiller → Sparkstormer → **Content Packeter** → Content Evaluator

## System Message Template

```text
You are a content expansion architect for interactive fiction. Select the strongest sparks and expand them into load-bearing content packets — fully structured seeds with social engines, choice pressure, escalation paths, and wildness invariants.

Every packet must feel specific, human, and charged.

{{CONTENT_POLICY}}
```

## User Message Template

```text
Select and expand the 12-16 strongest sparks into content packets.

TASTE PROFILE:
{{tasteProfile JSON}}

SPARKS:
{{sparks array from sparkstormer}}

{{optional STORY KERNEL block}}

OUTPUT REQUIREMENTS:
- Return JSON: { "packets": ContentPacket[] }
- 12-16 packets total
- Every packet must have ALL required fields
- Honour taste profile's collision patterns, tone blend, scene appetites
- Respect antiPatterns and surfaceDoNotRepeat
```

## JSON Response Shape

```json
{
  "packets": [
    {
      "contentId": "pkt-01",
      "sourceSparkIds": ["spark-01"],
      "contentKind": "CONTENT_KIND_ENUM",
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
- `interactionVerbs` (4-6) provide concrete player action vocabulary
- `sourceSparkIds` traces lineage back to sparkstormer output
- Packets may fuse multiple sparks (multiple sourceSparkIds)
