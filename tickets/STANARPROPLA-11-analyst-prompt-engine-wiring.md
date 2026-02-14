# STANARPROPLA-11: Wire tracked promises through analyst prompt and page-service

**Status**: PENDING
**Depends on**: STANARPROPLA-03, STANARPROPLA-05, STANARPROPLA-07, STANARPROPLA-09
**Blocks**: STANARPROPLA-12

## Summary

Update the analyst prompt to display active tracked promises so the LLM can detect resolutions. Update `AnalystEvaluationContext` in `continuation-post-processing.ts` to include tracked promises. Wire everything through `page-service.ts`: pass tracked promises to the analyst, and pass analyst promise results to `buildPage`.

## File list

- **Modify**: `src/llm/prompts/analyst-prompt.ts`
  - Add import: `TrackedPromise` from `'../../models/state/keyed-entry.js'`
  - Add `buildActivePromisesSection(promises: readonly TrackedPromise[]): string` function
  - Call it in `buildAnalystPrompt` using `context.activeTrackedPromises`
  - Append the section to the user content before the narrative
  - Add promise detection/resolution instructions to `ANALYST_RULES` (max 3 detections per page, only flag deliberate narrative weight, mark resolved with exact `pr-N` IDs, assess payoff quality)

- **Modify**: `src/engine/continuation-post-processing.ts`
  - Add import: `TrackedPromise` from `'../models/state/keyed-entry'`
  - Add `activeTrackedPromises: readonly TrackedPromise[]` to `AnalystEvaluationContext`
  - Pass `activeTrackedPromises` through to the analyst generation call

- **Modify**: `src/engine/page-service.ts`
  - In the analyst evaluation call: pass `activeTrackedPromises: parentPage?.accumulatedPromises ?? []`
  - In the `buildPage` context construction: replace old promise fields with:
    - `parentAccumulatedPromises: parentPage?.accumulatedPromises ?? []`
    - `analystPromisesDetected: analystResult?.promisesDetected ?? []`
    - `analystPromisesResolved: analystResult?.promisesResolved ?? []`
  - Remove any references to `parentInheritedNarrativePromises` or `parentAnalystNarrativePromises`

## Out of scope

- Do NOT modify `analyst-types.ts` (STANARPROPLA-03)
- Do NOT modify `analyst-schema.ts` or `analyst-validation-schema.ts` (STANARPROPLA-04)
- Do NOT modify `analyst-response-transformer.ts` (STANARPROPLA-05)
- Do NOT modify `page-builder.ts` (STANARPROPLA-07)
- Do NOT modify `page-serializer.ts` (STANARPROPLA-08)
- Do NOT modify planner prompts (STANARPROPLA-10)
- Do NOT modify writer or accountant prompts
- Do NOT modify any test files yet (STANARPROPLA-12)

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` must pass on all modified files (assuming all dependencies are complete)

### Invariants that must remain true

- The analyst prompt includes an `ACTIVE NARRATIVE PROMISES` section listing each promise with `[pr-N]`, type, urgency, age, and description
- The section instructs the LLM to check if any active promises were "paid off or addressed" in the narrative
- Promise detection instructions say "max 3 per page" and "only flag items introduced with deliberate narrative weight, not incidental details"
- Resolution instructions say "only mark a promise as resolved when it has been meaningfully addressed, not merely referenced"
- For opening pages (no parent), `activeTrackedPromises` is `[]` - the section is omitted
- The analyst prompt structure is otherwise unchanged (beat conclusion, deviation, pacing, tone, thread payoff assessments all stay)
- `page-service.ts` passes analyst results to `buildPage` which calls `computeAccumulatedPromises` (from STANARPROPLA-07) to produce the final `accumulatedPromises` on the page
