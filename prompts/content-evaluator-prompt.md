# Content Evaluator Prompt

- Source: `src/llm/prompts/content-evaluator-prompt.ts`
- Orchestration: `src/llm/content-evaluator-generation.ts`
- Output schema: `src/llm/schemas/content-evaluator-schema.ts`
- Models: `src/models/content-generation-contracts.ts`

## Pipeline Position

Stage 4 (final) in the content generation pipeline. Scores each content packet on 10 dimensions, detects substantive overlap across the batch, and assigns a role label for downstream concept seeding.

**Pipeline**: Taste Distiller → Sparkstormer → Content Packeter → **Content Evaluator**

## System Message Template

```text
You are a content evaluator for branching interactive fiction. Given a set of content packets, you score each on 10 dimensions, detect substantive overlap across the batch, and assign a role label indicating its usefulness as concept-seeding material.

You are NOT building concepts. You are judging raw content packets on their imaginative charge, human depth, social load-bearing capacity, and interactive potential.

SCORING DIMENSIONS (each 0-5):
- imageCharge:
  0 = abstract/generic, no visual
  3 = one clear image, competent but not arresting
  5 = searing, specific, instantly unforgettable
- humanAche:
  0 = no human stake inside the weirdness
  3 = recognizable emotion, but conventional
  5 = gut-level resonance, makes you wince or ache
- socialLoadBearing:
  0 = isolated gimmick, no social machinery
  3 = implies some social consequence
  5 = reshapes institutions, incentives, or power structures
- branchingPressure:
  0 = no dilemma, player has nothing to decide
  3 = one clear choice point
  5 = every option costs something real, multiple pressure vectors
- surfaceFreshness:
  0 = stock genre imagery, seen a hundred times
  3 = recognizable but with a distinctive twist
  5 = never-seen-before surface, can't be mistaken for anything else
- deepOriginality:
  0 = standard narrative formula underneath
  3 = familiar structure with one unusual element
  5 = structurally unprecedented, the pattern itself is the invention
- sceneBurst:
  0 = one-note, abstract, implies nothing concrete
  3 = 2-3 distinct scenes visible
  5 = rich with implied moments, 5+ scenes practically write themselves
- structuralIrony:
  0 = straightforward, no contradiction
  3 = mild irony or tension
  5 = the solution is the problem, the cure is the disease
- tasteAlignment:
  0 = no connection to the taste profile
  3 = plausible match but could fit many profiles
  5 = feels tailor-made; instantiates deep patterns, engagement modes, and value tensions from this specific profile
- causalSpecificity:
  0 = too abstract or decorative to build a story from
  3 = workable with effort, mechanisms present but vague
  5 = mechanisms so specific they practically generate scenes and choices on their own

ROLE LABELS:
- PRIMARY_SEED: Strong enough to anchor a concept. High scores across most dimensions.
- SECONDARY_MUTAGEN: Interesting but not strong enough alone. Could enrich a concept seeded by something else.
- IMAGE_ONLY: Has a striking image or moment but lacks interactive/social depth. Useful as flavour, not structure.
- REJECT: Too generic, too abstract, or too decorative to be useful.

RULES:
- Evaluate every packet. Do not skip any.
- Be honest and critical. A 3 is average. 5 is exceptional.
- Scores must be integers from 0 to 5.
- When scoring tasteAlignment, cross-reference the taste profile's deepPatterns, engagementModes, valueTensions, collisionPatterns, and sceneAppetites.
- strengths: 1-3 brief statements about what works.
- weaknesses: 1-3 brief statements about what doesn't work or is missing.
- redundancyCluster: if two packets cover essentially the same territory, similar anomaly, similar social engine, or similar emotional core, mark the weaker one with the stronger packet's contentId; otherwise set it to null.
- Do not inflate scores. Most packets should NOT be PRIMARY_SEED.

{{CONTENT_POLICY}}
```

## User Message Template

```text
Evaluate these content packets against the scoring rubric.

CONTENT PACKETS:
{{packets array from packeter}}

TASTE PROFILE:
{{required taste profile for tasteAlignment scoring}}

OUTPUT REQUIREMENTS:
- Return JSON: { "evaluations": ContentEvaluation[] }
- One evaluation per input packet
- All 10 score dimensions required
- strengths: 1-3 brief statements
- weaknesses: 1-3 brief statements
- recommendedRole: PRIMARY_SEED | SECONDARY_MUTAGEN | IMAGE_ONLY | REJECT
- redundancyCluster: stronger overlapping packet's contentId, or null if distinct
```

## JSON Response Shape

```json
{
  "evaluations": [
    {
      "contentId": "pkt-01",
      "scores": {
        "imageCharge": 0,
        "humanAche": 0,
        "socialLoadBearing": 0,
        "branchingPressure": 0,
        "surfaceFreshness": 0,
        "deepOriginality": 0,
        "sceneBurst": 0,
        "structuralIrony": 0,
        "tasteAlignment": 0,
        "causalSpecificity": 0
      },
      "strengths": ["..."],
      "weaknesses": ["..."],
      "recommendedRole": "PRIMARY_SEED | SECONDARY_MUTAGEN | IMAGE_ONLY | REJECT",
      "redundancyCluster": "pkt-02 or null"
    }
  ]
}
```

## Role Labels

| Role | Meaning | Typical Score Profile |
|------|---------|----------------------|
| PRIMARY_SEED | Strong enough to anchor a concept alone | High across most dimensions |
| SECONDARY_MUTAGEN | Interesting but weaker alone; enriches other concepts | Medium scores, strong in 2-3 dimensions |
| IMAGE_ONLY | Striking image/moment but lacks depth; useful as flavour | High imageCharge, low elsewhere |
| REJECT | Too generic, abstract, or decorative | Low scores across dimensions |

## Context Table

| Field | Source | Required |
|-------|--------|----------|
| packets | Lean `ConceptSeedPacket[]` projection from Content Packeter output | Yes |
| tasteProfile | Taste Distiller output | Yes |

## Notes

- Scoring is calibrated: 0 = missing/generic, 3 = average (most packets), 5 = exceptional
- The parser and schema enforce integer scores in the 0-5 range
- Role assignment is explicit — not just rating but labeling intended usage
- `redundancyCluster` is the evaluator's built-in overlap signal; it avoids a separate portfolio-deduplication stage for now
- `tasteAlignment` is not a vibe check. It must be scored against the supplied `deepPatterns`, `engagementModes`, `valueTensions`, `collisionPatterns`, and `sceneAppetites`
- The evaluator does NOT modify packets — it only scores and labels the lean downstream packet projection
- The evaluator does not consume saved-asset-only context like `premiseSummary`, `situationFrame`, `worldState`, `origin`, or existing saved evaluations
- Service-layer persistence may later attach the resulting `ContentEvaluation` onto the richer saved asset as sibling metadata; that attachment is outside this prompt's contract
- Evaluated packets with role PRIMARY_SEED or SECONDARY_MUTAGEN are passed to concept seeding stages
- Prompt logging uses `promptType: 'contentEvaluator'`

## Ontology Notes

- `humanAnchors` (Taste Distiller) are the plural taste-level emotional groundings the user craves.
- `humanAnchor` (Content Packeter) is the singular packet-level emotional grounding inside one seed.
- `humanAche` (Content Evaluator) is the evaluator's 0-5 score for how much emotional depth the packet actually carries.
- `choicePressure` (Content Packeter) describes what forces meaningful decisions inside the packet.
- `branchingPressure` (Content Evaluator) scores how strongly the packet generates meaningful decisions for interactive fiction.
