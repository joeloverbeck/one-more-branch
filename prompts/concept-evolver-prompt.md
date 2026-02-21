# Concept Evolver Prompt (Production Template)

- Source: `src/llm/prompts/concept-evolver-prompt.ts`
- Orchestration: `src/llm/concept-evolver.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/concept-evolver-schema.ts`
- Shared concept prompt blocks: `src/llm/prompts/concept-prompt-shared.ts`
- Concept model + enums: `src/models/concept-generator.ts`, `src/models/story-spine.ts`

## Pipeline Position

The concept evolver is the first LLM call in the `/evolve` flow. It mutates and recombines 2-3 evaluated parent concepts that share a selected story kernel.

**Pipeline position**: **Concept Evolver** -> Concept Evaluator -> Concept Verifier

Generation stage emitted by evolution flow: `EVOLVING_CONCEPTS`.

## Messages Sent To Model

### 1) System Message

```text
You are a concept evolution architect for branching interactive fiction. Recombine proven strengths, mutate weak points, and generate novel but producible concept engines.

CONTENT GUIDELINES:
{{CONTENT_POLICY}}

MUTATION STRATEGIES:
- recombine
- invert
- escalate
- transplant
- hybridize
- radicalize

TAXONOMY GUIDANCE:
{{buildConceptTaxonomyGuidance()}}

QUALITY ANCHORS:
{{CONCEPT_QUALITY_ANCHORS}}

DIVERSITY CONSTRAINTS:
- Return exactly 6 concepts.
- No two concepts may share the same pair of genreFrame + conflictAxis.
- Use at least 3 distinct genreFrame values.
- Use at least 3 distinct conflictAxis values.
- Avoid superficial variants. Every concept must imply a different decision texture in play.

KERNEL CONSTRAINTS:
- The offspring MUST operationalize the provided story kernel's dramatic thesis.
- valueAtStake and opposingForce must remain structurally visible in each concept's conflict engine.
- Offspring can mutate form, but must stay thematically coherent with the kernel.
```

### 2) User Message

```text
Evolve the provided parents into exactly 6 offspring concepts.

STORY KERNEL:
- dramaticThesis: {{kernel.dramaticThesis}}
- valueAtStake: {{kernel.valueAtStake}}
- opposingForce: {{kernel.opposingForce}}
- directionOfChange: {{kernel.directionOfChange}}
- thematicQuestion: {{kernel.thematicQuestion}}

PARENT CONCEPTS INPUT:
[
  {
    "parentId": "parent_1",
    "overallScore": {{number}},
    "passes": {{boolean}},
    "scores": {{ConceptDimensionScores}},
    "strengths": ["{{string}}"],
    "weaknesses": ["{{string}}"],
    "tradeoffSummary": "{{string}}",
    "concept": {{ConceptSpec}}
  }
]

OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "concepts": [ConceptSpec, ...] }.
- concepts array must contain exactly 6 items.
- Every concept must be complete and schema-valid.
- Do not copy any parent unchanged.
- Preserve useful parent strengths while directly addressing parent weaknesses.
- actionVerbs must contain at least 6 concise, distinct verbs.
- conflictType must be structurally coherent with conflictAxis.
- settingAxioms must contain 2-5 enforceable rules.
- constraintSet must contain 3-5 meaningful limits.
- keyInstitutions must contain 2-4 pressure-producing institutions.
```

## JSON Response Shape

```json
{
  "concepts": [
    {
      "oneLineHook": "{{single-line hook}}",
      "elevatorParagraph": "{{expanded pitch paragraph}}",
      "genreFrame": "{{HORROR|THRILLER|MYSTERY|FANTASY|SCI_FI|LITERARY|ROMANCE|DRAMA|WESTERN|NOIR|SATIRE|FABLE|GOTHIC|SURREAL|DYSTOPIAN|MYTHIC}}",
      "genreSubversion": "{{how it bends the frame}}",
      "protagonistRole": "{{who the player-character is}}",
      "coreCompetence": "{{primary capability}}",
      "coreFlaw": "{{load-bearing weakness}}",
      "actionVerbs": ["{{verb}}"],
      "coreConflictLoop": "{{repeatable dilemma loop}}",
      "conflictAxis": "{{INDIVIDUAL_VS_SYSTEM|TRUTH_VS_STABILITY|DUTY_VS_DESIRE|FREEDOM_VS_SAFETY|KNOWLEDGE_VS_INNOCENCE|POWER_VS_MORALITY|LOYALTY_VS_SURVIVAL|IDENTITY_VS_BELONGING}}",
      "conflictType": "{{PERSON_VS_PERSON|PERSON_VS_SELF|PERSON_VS_SOCIETY|PERSON_VS_NATURE|PERSON_VS_TECHNOLOGY|PERSON_VS_SUPERNATURAL|PERSON_VS_FATE}}",
      "pressureSource": "{{source of pressure escalation}}",
      "stakesPersonal": "{{what the protagonist loses}}",
      "stakesSystemic": "{{what broader systems lose}}",
      "deadlineMechanism": "{{time/clock pressure}}",
      "settingAxioms": ["{{world rule}}"],
      "constraintSet": ["{{limiting rule}}"],
      "keyInstitutions": ["{{institution imposing pressure}}"],
      "settingScale": "{{INTIMATE|LOCAL|REGIONAL|GLOBAL}}",
      "whatIfQuestion": "{{single dramatic question ending in ?}}",
      "ironicTwist": "{{1-2 sentence irony}}",
      "playerFantasy": "{{1 sentence player fantasy}}",
      "incitingDisruption": "{{event/revelation that shatters status quo}}",
      "escapeValve": "{{structural mechanism that re-engages conflict when player stalls}}"
    }
  ]
}
```

- The parser in `src/llm/concept-evolver.ts` rejects responses that are not exactly 6 items.
- Each concept is validated by `parseConceptSpec(...)` in `src/llm/concept-spec-parser.ts`.
- The parser rejects duplicate `genreFrame+conflictAxis` combinations across offspring.

## Context Provided

| Context Field | Description |
|---|---|
| `parentConcepts` | Required array of 2-3 `EvaluatedConcept` parents |
| `kernel` | Required `StoryKernel` shared by all parent concepts |

## Notes

- Prompt logging uses `promptType: 'conceptEvolver'` via `runLlmStage(...)`.
- Model routing uses stage key `conceptEvolver` in `getStageModel(...)`.
