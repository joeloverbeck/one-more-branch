# STANARPROPLA-11: Align analyst prompt instructions with tracked-promise runtime wiring

**Status**: COMPLETED
**Depends on**: STANARPROPLA-03, STANARPROPLA-05, STANARPROPLA-07, STANARPROPLA-09
**Blocks**: STANARPROPLA-12

## Reassessed current state (2026-02-15)

Compared against current code and `docs/plans/2026-02-14-stateful-narrative-promises-{design,plan}.md`:

- Already implemented:
  - `activeTrackedPromises` is already plumbed through `runAnalystEvaluation` and `page-service`.
  - `buildPage` already receives `parentAccumulatedPromises`, `analystPromisesDetected`, and `analystPromisesResolved`.
  - Legacy fields (`parentInheritedNarrativePromises`, `parentAnalystNarrativePromises`) are already absent in these paths.
  - `analyst-prompt.ts` already renders an active promise section (currently titled `ACTIVE TRACKED PROMISES`).

- Not yet complete:
  - `ANALYST_RULES` does not yet explicitly instruct promise detection/resolution behavior (max 3 detections, deliberate narrative weight only, strict resolution criteria, payoff assessment linkage to resolved IDs).
  - Tests do not currently verify tracked-promise prompt instructions and end-to-end promise forwarding into analyst generation input.

## Why this scope is architecturally better

Keeping promise policy in both schema and system prompt is more robust than schema-only enforcement:

- The schema constrains shape; the prompt constrains model judgment quality.
- Explicit ID- and payoff-coupling rules reduce false-positive resolutions and drift in long-running stories.
- Additional tests lock contract behavior at boundary seams (prompt construction + page-service orchestration), improving extensibility without introducing aliases or backward-compatibility branches.

## Corrected implementation scope

- **Modify**: `src/llm/prompts/analyst-prompt.ts`
  - Keep active promises section rendering; do not introduce new aliases or legacy naming.
  - Add explicit tracked-promise detection/resolution/payoff instructions to `ANALYST_RULES`, aligned with stateful promise design.

- **Modify tests**:
  - `test/unit/llm/prompts/analyst-prompt.test.ts`
    - Verify active promise section content and omission behavior.
    - Verify system prompt includes required promise-policy instructions.
  - `test/unit/engine/page-service.test.ts`
    - Verify continuation analyst call receives `activeTrackedPromises` sourced from `parentPage.accumulatedPromises`.
    - Verify opening page analyst call receives `activeTrackedPromises: []`.

## Out of scope

- Do not alter analyst schema/validation/transformer unless a failing test proves mismatch.
- Do not alter page-builder accumulation algorithm (`computeAccumulatedPromises`) in this ticket.
- Do not reintroduce legacy promise fields, aliases, or migration shims.
- Do not rewrite unrelated prompts (writer/accountant/planner) in this ticket.

## Acceptance criteria

### Must pass

- `npm run typecheck`
- `npm run test:unit -- test/unit/llm/prompts/analyst-prompt.test.ts test/unit/engine/page-service.test.ts`

### Required invariants

- Analyst user prompt includes `ACTIVE TRACKED PROMISES` with each item formatted using `[pr-N]`, type, urgency, age, and description when promises exist.
- Analyst user prompt omits that section when `activeTrackedPromises` is empty.
- System prompt explicitly includes:
  - max 3 promise detections per page,
  - deliberate narrative weight threshold (not incidental details),
  - strict resolution rule (meaningfully addressed, not mere reference),
  - exact `pr-N` ID usage in `promisesResolved`,
  - payoff quality assessments only for resolved promises.
- `page-service` passes `parentPage?.accumulatedPromises ?? []` to analyst generation context as `activeTrackedPromises`.

## Outcome

- Completion date: 2026-02-15
- What was actually changed:
  - Added explicit tracked-promise policy instructions to `ANALYST_RULES` in `src/llm/prompts/analyst-prompt.ts`.
  - Added unit coverage for active tracked-promise section rendering/omission and promise-policy rule presence in `test/unit/llm/prompts/analyst-prompt.test.ts`.
  - Added unit coverage for `activeTrackedPromises` forwarding in `test/unit/engine/page-service.test.ts` for both opening (`[]`) and continuation (parent `accumulatedPromises`) flows.
- Deviations from original ticket:
  - The original ticket assumed core wiring work remained, but reassessment found that wiring had already been implemented; scope was corrected to instruction-layer completeness and verification hardening.
  - Test changes were included in this ticket to lock behavior now, rather than deferring all tests.
- Verification:
  - `npm run test:unit -- test/unit/llm/prompts/analyst-prompt.test.ts test/unit/engine/page-service.test.ts` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
