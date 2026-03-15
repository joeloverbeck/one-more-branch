# Spine Arc Engine Prompt (Production Template)

- Source: `src/llm/prompts/spine-arc-engine-prompt.ts`
- Output schema source: `src/llm/schemas/spine-arc-engine-schema.ts`
- Generator source: `src/llm/spine-generator.ts`
- Stage execution: `src/llm/spine-generator.ts` uses internal `fetchStage()` helper with `withRetry()` and `withModelFallback()`
- Model selection: Per-stage via `getStageModel('spineArcEngine')` from `src/config/stage-model.ts` (default: falls back to `config.llm.defaultModel`)

## Pipeline Position

This is **Stage 2 of 3** in the multi-stage spine pipeline. It receives LOCKED thematic foundations from Stage 1 and elaborates each into a complete arc engine: story pattern, opposition source, and the protagonist's need/want/dynamic.

**Pipeline position**: Spine Foundation (Stage 1) -> **Spine Arc Engine (Stage 2)** -> Spine Synthesis (Stage 3) -> Entity Decomposer -> Structure -> ...

The arc engine operates with an IMMUTABILITY CONSTRAINT: it must not rewrite, reinterpret, or alter any foundation field (`conflictAxis`, `characterArcType`, `protagonistDeepestFear`, `toneFeel`, `toneAvoid`, `thematicPremise`). Its job is to elaborate WITHIN the locked thematic frame.

When a `conceptSpec` is provided, the prompt includes CONCEPT CONSTRAINTS with the concept's conflict loop, protagonist role/flaw, and lie/truth arc to ground the need/want elaboration.

## Messages Sent To Model

### 1) System Message

```text
You are a story architect specializing in arc engine design for interactive branching fiction. You receive LOCKED thematic foundations (conflict axis, character arc type, protagonist's deepest fear, tone) and must elaborate each into a complete arc engine: story pattern, opposition source, and the protagonist's need/want/dynamic.

IMMUTABILITY CONSTRAINT: Do not rewrite, reinterpret, or alter any foundation field (conflictAxis, characterArcType, protagonistDeepestFear, toneFeel, toneAvoid, thematicPremise). Your job is to elaborate WITHIN the locked thematic frame.

CONTENT GUIDELINES:
[standard content policy]

ARC ENGINE DESIGN GUIDELINES:
- storySpineType: The primary narrative pattern -- must be constrained by the foundation's conflictAxis and characterArcType. A FALL arc rarely fits a QUEST pattern; a FLAT arc works naturally with MYSTERY.
- conflictType: The primary source of opposition -- must align with the conflictAxis. INDIVIDUAL_VS_SYSTEM suggests PERSON_VS_SOCIETY; DUTY_VS_DESIRE often implies PERSON_VS_SELF.
- need: The inner transformation. Work BACKWARD from characterArcType + protagonistDeepestFear. The need is what the character must face -- the thing their fear prevents them from accepting.
- want: The outer goal. Driven BY the fear -- the want is the avoidance strategy, what they pursue INSTEAD of facing their need.
- dynamic: How need and want relate. CONVERGENT (achieving want fulfills need), DIVERGENT (want leads away from need), SUBSTITUTIVE (need replaces want), IRRECONCILABLE (cannot satisfy both).

COHERENCE RULES:
- The need MUST address the protagonistDeepestFear (it's what they must face).
- The want MUST be driven by the fear (it's the avoidance strategy).
- The dynamic MUST accurately describe how need and want relate given the above.
- storySpineType and conflictType should create productive tension with the thematicPremise.
```

### 2) User Message

```text
Elaborate arc engines for ALL {{foundations.length}} locked foundations below.

CHARACTER CONCEPT:
{{characterConcept}}

TONE/GENRE: {{tone}}

{{#if conceptSpec}}
CONCEPT CONSTRAINTS (from upstream -- use for coherence):
Core conflict loop: {{conceptSpec.coreConflictLoop}}
Protagonist role: {{conceptSpec.protagonistRole}}
Core flaw: {{conceptSpec.coreFlaw}}
Protagonist's lie: {{conceptSpec.protagonistLie}}
Protagonist's truth: {{conceptSpec.protagonistTruth}}

When concept provides protagonistLie/protagonistTruth:
- need must address the Lie (the inner transformation IS learning the Truth)
- want must be driven by the Lie (the outer goal IS the avoidance strategy the Lie enables)
{{/if}}

LOCKED FOUNDATIONS (DO NOT MODIFY -- elaborate within each frame):

FOUNDATION 1:
  conflictAxis: {{foundation.conflictAxis}}
  characterArcType: {{foundation.characterArcType}}
  protagonistDeepestFear: {{foundation.protagonistDeepestFear}}
  toneFeel: {{foundation.toneFeel joined by ', '}}
  toneAvoid: {{foundation.toneAvoid joined by ', '}}
  thematicPremise: {{foundation.thematicPremise}}

[... one per foundation ...]

FIELD INSTRUCTIONS:
- storySpineType: Primary narrative pattern (QUEST, SURVIVAL, ESCAPE, REVENGE, RESCUE, RIVALRY, MYSTERY, TEMPTATION, TRANSFORMATION, FORBIDDEN_LOVE, SACRIFICE, FALL_FROM_GRACE, RISE_TO_POWER, COMING_OF_AGE, REBELLION). Must align with the foundation's conflictAxis + characterArcType.
- conflictType: Primary source of opposition (PERSON_VS_PERSON, PERSON_VS_SELF, PERSON_VS_SOCIETY, PERSON_VS_NATURE, PERSON_VS_TECHNOLOGY, PERSON_VS_SUPERNATURAL, PERSON_VS_FATE). Must align with conflictAxis.
- protagonistNeedVsWant.need: The inner transformation -- backward from characterArcType + fear. One sentence.
- protagonistNeedVsWant.want: The outer goal -- driven by fear, specific to THIS character. One sentence.
- protagonistNeedVsWant.dynamic: How need and want relate (CONVERGENT, DIVERGENT, SUBSTITUTIVE, IRRECONCILABLE).

OUTPUT SHAPE:
- elaborations: array of exactly {{foundations.length}} objects (one per foundation, same order), each containing storySpineType, conflictType, protagonistNeedVsWant
```

## JSON Response Shape

```json
{
  "elaborations": [
    {
      "storySpineType": "{{QUEST|SURVIVAL|ESCAPE|REVENGE|RESCUE|RIVALRY|MYSTERY|TEMPTATION|TRANSFORMATION|FORBIDDEN_LOVE|SACRIFICE|FALL_FROM_GRACE|RISE_TO_POWER|COMING_OF_AGE|REBELLION}}",
      "conflictType": "{{PERSON_VS_PERSON|PERSON_VS_SELF|PERSON_VS_SOCIETY|PERSON_VS_NATURE|PERSON_VS_TECHNOLOGY|PERSON_VS_SUPERNATURAL|PERSON_VS_FATE}}",
      "protagonistNeedVsWant": {
        "need": "{{inner transformation the protagonist must undergo}}",
        "want": "{{outer goal the protagonist consciously pursues}}",
        "dynamic": "{{CONVERGENT|DIVERGENT|SUBSTITUTIVE|IRRECONCILABLE}}"
      }
    }
  ]
}
```

- The `elaborations` array must match the input foundations in count and order. The parser rejects mismatched counts.
- Each elaboration is merged with its corresponding foundation to form a `SpineArcEngine` (defined in `src/models/spine-foundation.ts`), which is then passed to Stage 3.
- The `SpineArcEngine` interface extends `SpineFoundation` with `storySpineType`, `conflictType`, and `protagonistNeedVsWant`.
