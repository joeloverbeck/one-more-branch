# Concept Evolution Feature Design

**Date**: 2026-02-21
**Status**: APPROVED

## Summary

Add an evolutionary concept breeding feature that takes 2-3 existing saved concepts (sharing the same kernel) and generates 6 mutated/recombined offspring concepts. Offspring are evaluated and verified using the existing concept pipeline stages. The feature lives on a new `/evolve` page accessible from the site header.

## Motivation

A single ideation pass is a lottery. Evolutionary iteration (select promising parents, breed offspring, evaluate) reliably climbs toward better premises by recombining proven strengths and targeting known weaknesses. This adds an optional evolutionary loop to the existing pipeline: ideation -> evaluation -> verification -> **evolution** -> re-evaluation -> re-verification.

## Assessment of ChatGPT's Proposal

ChatGPT's core insight is valid: evolutionary iteration beats single-pass generation for premise quality. However, its specific mutation operators (swap settingScale, invert coreFlaw, change institution topology) are naive because they treat concept fields as independent knobs when they're deeply coupled. Changing `coreFlaw` cascades into `coreConflictLoop`, `pressureSource`, `stakesPersonal`, etc. The design below uses holistic mutation strategies instead.

## Architecture: Standalone Evolution Pipeline (Approach A)

New `concept-evolver.ts` LLM stage + new `evolution-service.ts` + new `/evolve` route + new EJS page. The evolver outputs `ConceptSpec[]` (same schema as ideator), then reuses the existing evaluator + verifier stages unchanged.

### Pipeline

```
User selects kernel -> filters concepts by sourceKernelId -> picks 2-3 parents
    |
    v
Evolver LLM (new: EVOLVING_CONCEPTS)
  Input: 2-3 EvaluatedConcept (with scores/strengths/weaknesses) + kernel
  Output: 6 ConceptSpec (same schema as ideator)
    |
    v
Evaluator LLM (existing: EVALUATING_CONCEPTS)
  Input: 6 ConceptSpec
  Output: ScoredConcept[] + EvaluatedConcept[]
    |
    v
Verifier LLM (existing: VERIFYING_CONCEPTS)
  Input: EvaluatedConcept[]
  Output: ConceptVerification[]
    |
    v
Results displayed with save buttons
  Save via existing /concepts/api/save (same SavedConcept format)
```

### Key Design Decisions

1. **Evolver outputs ConceptSpec[]** -- same schema as ideator, so evaluator/verifier work unchanged.
2. **Saved evolved concepts use same SavedConcept format** -- they appear in the concepts library naturally.
3. **Kernel required, shared across parents** -- ensures thematic coherence in offspring.
4. **Evaluation data passed to evolver** -- scores, strengths, weaknesses inform intelligent mutation.
5. **6 offspring per run** -- good balance between diversity and cost.

## New Files

| File | Purpose |
|------|---------|
| `src/llm/concept-evolver.ts` | LLM orchestrator: builds prompt, calls LLM, parses response |
| `src/llm/prompts/concept-evolver-prompt.ts` | Prompt builder for the evolver stage |
| `src/llm/schemas/concept-evolver-schema.ts` | JSON Schema for evolver response |
| `prompts/concept-evolver-prompt.md` | Prompt documentation |
| `src/server/services/evolution-service.ts` | Service: evolver -> evaluator -> verifier pipeline |
| `src/server/routes/evolution.ts` | Express routes: GET / (page), GET /api/concepts-by-kernel/:kernelId, POST /api/evolve |
| `src/server/views/pages/evolution.ejs` | EJS template |
| `public/js/src/12-evolution-controller.js` | Client-side JS |

## Modified Files

| File | Change |
|------|--------|
| `src/server/routes/index.ts` | Add `evolutionRoutes` import and mount at `/evolve` |
| `src/server/views/partials/header.ejs` | Add "Evolve" link next to "Concepts" |
| `src/config/stage-model.ts` | Add `conceptEvolver` stage model entry |
| `public/js/src/01-constants.js` | Add EVOLVING_CONCEPTS stage display name and phrases |

## Evolver Prompt Design

### System Message

The evolver receives:
- Role: concept evolution architect for branching interactive fiction
- Mutation strategies: recombine, invert, escalate, transplant, hybridize, radicalize
- Diversity constraints: no duplicate genreFrame+conflictAxis pairs, at least 3 distinct genreFrames
- Taxonomy guidance: same enum lists as ideator
- Quality anchors: same rules as ideator
- Kernel constraints: offspring must preserve kernel's dramatic thesis

### User Message

Receives:
- Story kernel fields
- 2-3 parent concepts with full evaluation data (ConceptSpec + scores + strengths + weaknesses + tradeoffSummary)
- Output requirements: `{ "concepts": ConceptSpec[] }` with exactly 6 concepts

### Output Schema

Same as concept ideator schema but enforcing exactly 6 concepts instead of 6-8.

## Service Layer

```typescript
interface EvolveConceptsInput {
  parentConcepts: readonly EvaluatedConcept[];  // 2-3 parents
  kernel: StoryKernel;
  apiKey: string;
  onGenerationStage?: GenerationStageCallback;
}

interface EvolveConceptsResult {
  evolvedConcepts: readonly ConceptSpec[];
  scoredConcepts: readonly ScoredConcept[];
  evaluatedConcepts: readonly EvaluatedConcept[];
  verifications: readonly ConceptVerification[];
}
```

Pipeline: evolveConceptIdeas() -> evaluateConcepts() -> verifyConcepts()

## Evolution Page UX

1. **Kernel selection** -- dropdown, shows kernel summary card
2. **Parent concept selection** -- filtered by kernel, selectable cards (2-3 max), shows name/hook/scores
3. **API key** -- password input (same pattern as concepts page)
4. **Evolve button** -- triggers pipeline, shows progress spinner
5. **Results** -- 6 offspring cards with scores, strengths/weaknesses, verification, save buttons
6. **Save** -- uses existing /concepts/api/save, concepts appear in library on next concepts page load

## Progress Stages

- `EVOLVING_CONCEPTS` (new) -- evolver LLM call
- `EVALUATING_CONCEPTS` (existing) -- evaluator LLM call
- `VERIFYING_CONCEPTS` (existing) -- verifier LLM call

## Route Structure

- `GET /evolve` -- renders evolution page
- `GET /evolve/api/concepts-by-kernel/:kernelId` -- returns concepts filtered by kernel
- `POST /evolve/api/evolve` -- runs evolution pipeline
- Progress polling reuses existing `/generation-progress/:progressId`
