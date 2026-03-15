# Spine Synthesis Prompt (Production Template)

- Source: `src/llm/prompts/spine-synthesis-prompt.ts`
- Output schema source: `src/llm/schemas/spine-synthesis-schema.ts`
- Generator source: `src/llm/spine-generator.ts`
- Stage execution: `src/llm/spine-generator.ts` uses internal `fetchStage()` helper with `withRetry()` and `withModelFallback()`
- Model selection: Per-stage via `getStageModel('spineSynthesis')` from `src/config/stage-model.ts` (default: falls back to `config.llm.defaultModel`)

## Pipeline Position

This is **Stage 3 of 3** in the multi-stage spine pipeline. It receives LOCKED arc engines (foundation + story pattern + need/want from Stages 1-2) and synthesizes the capstone dramatic elements: antagonistic force, central dramatic question, and want-need collision point.

**Pipeline position**: Spine Foundation (Stage 1) -> Spine Arc Engine (Stage 2) -> **Spine Synthesis (Stage 3)** -> Entity Decomposer -> Structure -> ...

After synthesis, the generator assembles final `SpineOption` objects by merging foundation fields, arc engine fields, and synthesis fields. The user then selects one of the assembled options. The selected spine is stored on the `Story` model and injected into all downstream prompts via `buildSpineSection()`.

When a `storyKernel` is provided, the prompt includes THEMATIC KERNEL CONSTRAINTS binding the antagonistic force's pressure mechanism to the kernel's value spectrum and the central dramatic question to the kernel's thematic question. When a `conceptVerification` is provided, CONCEPT VERIFICATION CONSTRAINTS bind the dramatic question to the signature scenario and the pressure mechanism to the inevitability statement.

## Messages Sent To Model

### 1) System Message

```text
You are a story architect specializing in dramatic synthesis for interactive branching fiction. You receive LOCKED arc engines (thematic foundation + story pattern + need/want) and must synthesize the capstone elements: antagonistic force, central dramatic question, and want-need collision point.

IMMUTABILITY CONSTRAINT: Do not rewrite, reinterpret, or alter any locked field. Your job is to synthesize the final dramatic elements FROM the locked material.

CONTENT GUIDELINES:
[standard content policy]

SYNTHESIS DESIGN GUIDELINES:
- primaryAntagonisticForce.description: What opposes the protagonist. NOT necessarily a villain -- can be a system, environment, internal flaw, social pressure, or fate. Must exploit or reinforce the protagonistDeepestFear.
- primaryAntagonisticForce.pressureMechanism: HOW the force creates difficult choices. Must widen the gap between need and want -- forcing the protagonist to choose between what they pursue and what they truly need.
- centralDramaticQuestion: A single, specific question the story exists to answer. Ends with a question mark. Must be answerable by the story's events, not abstract. Must emerge from need/want + antagonistic force.
- wantNeedCollisionPoint: The specific moment or condition where pursuing the want actively blocks the need. Must be concrete and story-specific -- not abstract.

COHERENCE RULES:
- The antagonistic force MUST exploit the protagonistDeepestFear.
- The pressure mechanism MUST widen the gap between need and want.
- The central dramatic question MUST be specific to THIS character in THIS world.
- The collision point MUST describe a concrete story moment, not a philosophical abstraction.
```

### 2) User Message

```text
Synthesize dramatic capstone elements for ALL {{arcEngines.length}} locked arc engines below.

CHARACTER CONCEPT:
{{characterConcept}}

TONE/GENRE: {{tone}}

{{#if storyKernel}}
THEMATIC KERNEL CONSTRAINTS:
Dramatic thesis: {{storyKernel.dramaticThesis}}
Value at stake: {{storyKernel.valueAtStake}}
Opposing force: {{storyKernel.opposingForce}}

VALUE SPECTRUM:
Positive: {{storyKernel.valueSpectrum.positive}}
Contradictory: {{storyKernel.valueSpectrum.contradictory}}
Negation of negation: {{storyKernel.valueSpectrum.negationOfNegation}}

The antagonistic force's pressure mechanism should push the value toward the contradictory or negation-of-negation levels.
The central dramatic question should operationalize the kernel's thematic question.
{{/if}}

{{#if conceptVerification}}
CONCEPT VERIFICATION CONSTRAINTS:
Signature scenario: {{conceptVerification.signatureScenario}}
Narrative inevitability: {{conceptVerification.inevitabilityStatement}}

The centralDramaticQuestion should make the signature scenario inevitable.
The antagonistic force's pressure mechanism should logically produce the conditions described in the inevitability statement.
{{/if}}

LOCKED ARC ENGINES (DO NOT MODIFY -- synthesize from this material):

ARC ENGINE 1:
  conflictAxis: {{arcEngine.conflictAxis}}
  characterArcType: {{arcEngine.characterArcType}}
  protagonistDeepestFear: {{arcEngine.protagonistDeepestFear}}
  toneFeel: {{arcEngine.toneFeel joined by ', '}}
  toneAvoid: {{arcEngine.toneAvoid joined by ', '}}
  thematicPremise: {{arcEngine.thematicPremise}}
  storySpineType: {{arcEngine.storySpineType}}
  conflictType: {{arcEngine.conflictType}}
  need: {{arcEngine.protagonistNeedVsWant.need}}
  want: {{arcEngine.protagonistNeedVsWant.want}}
  dynamic: {{arcEngine.protagonistNeedVsWant.dynamic}}

[... one per arc engine ...]

FIELD INSTRUCTIONS:
- primaryAntagonisticForce.description: What opposes the protagonist. Can be a person, system, environment, or internal force. Must exploit the protagonistDeepestFear. One sentence.
- primaryAntagonisticForce.pressureMechanism: HOW it creates difficult choices that widen the need-want gap. One sentence.
- centralDramaticQuestion: A single sentence ending with a question mark. Specific to THIS character and world.
- wantNeedCollisionPoint: The specific moment where pursuing the want actively blocks the need. One sentence.

OUTPUT SHAPE:
- syntheses: array of exactly {{arcEngines.length}} objects (one per arc engine, same order), each containing primaryAntagonisticForce, centralDramaticQuestion, wantNeedCollisionPoint
```

## JSON Response Shape

```json
{
  "syntheses": [
    {
      "primaryAntagonisticForce": {
        "description": "{{what opposes the protagonist}}",
        "pressureMechanism": "{{how the force creates difficult choices widening the need-want gap}}"
      },
      "centralDramaticQuestion": "{{single dramatic question ending with ?}}",
      "wantNeedCollisionPoint": "{{specific moment where pursuing want blocks need}}"
    }
  ]
}
```

- The `syntheses` array must match the input arc engines in count and order. The parser rejects mismatched counts.
- After parsing, each synthesis is merged with its corresponding foundation + arc engine to produce a final `SpineOption` with all fields: `centralDramaticQuestion`, `protagonistNeedVsWant`, `primaryAntagonisticForce`, `storySpineType`, `conflictAxis`, `conflictType`, `characterArcType`, `toneFeel`, `toneAvoid`, `wantNeedCollisionPoint`, `protagonistDeepestFear`.
- The assembled options are returned as a `SpineGenerationResult` with `options` (5-6 spine options) and `rawResponse` (concatenated raw responses from all 3 stages, joined by `---`).

## Assembly Logic

The final `SpineOption` is assembled from all 3 stages:

| Field | Source Stage |
|-------|-------------|
| `conflictAxis` | Stage 1 (Foundation) |
| `characterArcType` | Stage 1 (Foundation) |
| `protagonistDeepestFear` | Stage 1 (Foundation) |
| `toneFeel` | Stage 1 (Foundation) |
| `toneAvoid` | Stage 1 (Foundation) |
| `storySpineType` | Stage 2 (Arc Engine) |
| `conflictType` | Stage 2 (Arc Engine) |
| `protagonistNeedVsWant` | Stage 2 (Arc Engine) |
| `primaryAntagonisticForce` | Stage 3 (Synthesis) |
| `centralDramaticQuestion` | Stage 3 (Synthesis) |
| `wantNeedCollisionPoint` | Stage 3 (Synthesis) |

Note: `thematicPremise` from Stage 1 is used as scaffolding in Stages 2-3 but is NOT included in the final `SpineOption`.
