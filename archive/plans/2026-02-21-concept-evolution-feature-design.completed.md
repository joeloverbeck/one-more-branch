# Concept Evolution Feature Design

**Date**: 2026-02-21
**Status**: COMPLETED

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

## Outcome

**Completed on**: 2026-02-21

What was actually changed:
- Implemented standalone evolution pipeline (`concept-evolver` stage, `evolution-service`, `/evolve` routes, evolution page/controller wiring).
- Added and strengthened test coverage for evolver/service/routes/view/client and added dedicated evolution pipeline integration coverage.

Deviation notes:
- Prompt coverage is intentionally co-located in `test/unit/llm/concept-evolver.test.ts` rather than split into a separate prompt-specific test file.

Verification:
- Evolution-related unit and integration tests pass.
- Lint passes.
