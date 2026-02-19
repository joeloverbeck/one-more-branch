# Concept Ideator Prompt (Production Template)

- Source: `src/llm/prompts/concept-ideator-prompt.ts`
- Orchestration: `src/llm/concept-ideator.ts`
- Shared stage runner: `src/llm/llm-stage-runner.ts`
- Output schema source: `src/llm/schemas/concept-ideator-schema.ts`
- Concept model + enums: `src/models/concept-generator.ts`, `src/models/story-spine.ts`

## Pipeline Position

The concept ideator is the first LLM call in the `/concepts` generation flow. It expands user seed inputs into a diverse candidate set of concept engines.

**Pipeline position**: **Concept Ideator** -> Concept Evaluator -> (optional per-concept) Concept Stress Tester

Generation stage emitted by `conceptService`: `GENERATING_CONCEPTS`.

## Messages Sent To Model

### 1) System Message

```text
You are a narrative concept architect for branching interactive fiction. Generate concept engines that create repeatable player-facing decision pressure, not linear plot outlines.

{{optional tone block from buildToneDirective(...) when genreVibes and/or moodKeywords exist}}

CONTENT GUIDELINES:
{{CONTENT_POLICY}}

TAXONOMY GUIDANCE:
genreFrame:
- HORROR: Fear, dread, and destabilization.
- THRILLER: Sustained danger and tightening pressure.
- MYSTERY: Investigation and hidden truth recovery.
- FANTASY: Mythic or magical rule-bound worlds.
- SCI_FI: Speculative systems and technological consequences.
- LITERARY: Character interiority and social nuance focus.
- ROMANCE: Intimacy, attachment, and relational stakes.
- DRAMA: Interpersonal and social conflict realism.
- WESTERN: Frontier law, territory, and legacy conflict.
- NOIR: Moral ambiguity, corruption, and fatalism.
- SATIRE: Societal critique through exaggeration or irony.
- FABLE: Moral allegory with symbolic clarity.
- GOTHIC: Decay, obsession, and oppressive atmosphere.
- SURREAL: Dream-logic, symbolic dislocation, altered reality.
- DYSTOPIAN: Systemic collapse and controlled oppression.
- MYTHIC: Archetypal struggle and legend-scale stakes.

conflictAxis:
- INDIVIDUAL_VS_SYSTEM: Personal agency against institutions.
- TRUTH_VS_STABILITY: Revealing truth versus preserving order.
- DUTY_VS_DESIRE: Obligation clashing with personal longing.
- FREEDOM_VS_SAFETY: Autonomy versus protective constraints.
- KNOWLEDGE_VS_INNOCENCE: Understanding versus protective ignorance.
- POWER_VS_MORALITY: Capability gain versus ethical limits.
- LOYALTY_VS_SURVIVAL: Commitments versus self-preservation.
- IDENTITY_VS_BELONGING: Self-definition versus group acceptance.

conflictType:
- PERSON_VS_PERSON: Direct human antagonist opposition.
- PERSON_VS_SELF: Internal psychological struggle.
- PERSON_VS_SOCIETY: Individual against societal structures.
- PERSON_VS_NATURE: Environmental or natural forces opposition.
- PERSON_VS_TECHNOLOGY: Technology-driven opposition or consequence.
- PERSON_VS_SUPERNATURAL: Otherworldly or inexplicable forces.
- PERSON_VS_FATE: Destiny, prophecy, or inevitable forces.

branchingPosture:
- TREE: Pure branch divergence with no reconvergence.
- RECONVERGE: Branches split but meet at major junctions.
- STORYLETS: Modular episodes gated by world state.
- HUB_AND_SPOKE: Central base with radial branch excursions.

settingScale:
- INTIMATE: Single place or tightly bounded area.
- LOCAL: Neighborhood, district, or small town scope.
- REGIONAL: City, territory, or regional theater.
- GLOBAL: World-scale or multi-realm implications.

stateComplexity:
- LOW: 5-8 core variables; light state load.
- MEDIUM: 9-14 core variables; moderate coordination.
- HIGH: 15-20 core variables; heavy state coupling.

QUALITY ANCHORS:
- A concept is a generative engine, not a plot summary.
- oneLineHook must be graspable without proper nouns.
- coreConflictLoop must describe a recurring decision pattern.
- settingAxioms and constraints must be concrete and enforceable by an LLM.
- actionVerbs must imply strategy diversity, not synonyms.

DIVERSITY CONSTRAINTS:
- Return 6-8 concepts.
- No two concepts may share the same pair of genreFrame + conflictAxis.
- Use at least 3 distinct genreFrame values.
- Use at least 3 distinct conflictAxis values.
- Each concept should feel materially different in play, not cosmetic variants.
```

### 2) User Message

```text
Generate 6-8 concept candidates that satisfy the taxonomy and diversity constraints.

{{#if genreVibes}}
GENRE VIBES:
{{genreVibes}}
{{/if}}

{{#if moodKeywords}}
MOOD KEYWORDS:
{{moodKeywords}}
{{/if}}

{{#if thematicInterests}}
THEMATIC INTERESTS:
{{thematicInterests}}
{{/if}}

{{#if sparkLine}}
SPARK LINE:
{{sparkLine}}
{{/if}}

{{#if contentPreferences}}
CONTENT PREFERENCES:
{{contentPreferences}}
{{/if}}

OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "concepts": [ConceptSpec, ...] }.
- Populate every required field for each concept.
- actionVerbs must contain at least 6 concise, distinct verbs.
- conflictType must be structurally coherent with conflictAxis (e.g., INDIVIDUAL_VS_SYSTEM pairs naturally with PERSON_VS_SOCIETY).
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
      "branchingPosture": "{{TREE|RECONVERGE|STORYLETS|HUB_AND_SPOKE}}",
      "stateComplexity": "{{LOW|MEDIUM|HIGH}}"
    }
  ]
}
```

- The parser in `src/llm/concept-ideator.ts` rejects responses outside 6-8 concepts.
- Each concept is validated by `parseConceptSpec(...)` in `src/llm/concept-spec-parser.ts` (enum correctness, non-empty strings, and bounded arrays).

## Context Provided

| Context Field | Description |
|---|---|
| `genreVibes` | Optional genre guidance text |
| `moodKeywords` | Optional tone keyword list/text |
| `contentPreferences` | Optional content boundaries/preferences |
| `thematicInterests` | Optional theme interests |
| `sparkLine` | Optional seed hook sentence |

## Notes

- Tone block injection is conditional: it is included only when `genreVibes` and/or `moodKeywords` is non-empty after trimming.
- Prompt logging uses `promptType: 'conceptIdeator'` via `runLlmStage(...)`.
- Model routing uses stage key `conceptIdeator` in `getStageModel(...)`.
