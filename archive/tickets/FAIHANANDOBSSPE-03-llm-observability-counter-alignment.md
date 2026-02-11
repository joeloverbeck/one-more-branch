# FAIHANANDOBSSPE-03: Align LLM Validation Counter Logging and Observability Context Propagation

**Status**: ✅ COMPLETED

## Summary
Standardize planner/writer/reconciler issue-counter log format and ensure `storyId`/`pageId`/`requestId` observability context is consistently propagated from LLM client calls into validation failure logs.

## Assumption Reassessment (2026-02-11)
- `generatePagePlan()`, `generateOpeningPage()`, and `generatePageWriterOutput()` already preserve `options.observability`; no additional propagation change is required in `src/llm/client.ts`.
- Writer validation already emits per-rule counter logs with `{ ruleKey, count, storyId, pageId, requestId }`.
- Planner validation currently attaches `validationIssues`/`ruleKeys` in `LLMError.context`, but does not emit matching per-rule counter logs yet.
- Spec 13 requires structured stage logs with observability identifiers; this ticket should focus on planner/writer counter-shape parity and test coverage, not retry/orchestration semantics.

## Depends on
- `tickets/FAIHANANDOBSSPE-01-generation-pipeline-metrics-contract.md`

## Blocks
- `tickets/FAIHANANDOBSSPE-05-integration-observability-and-hard-failure-coverage.md`

## File list it expects to touch
- `src/llm/planner-generation.ts`
- `src/llm/writer-generation.ts` (verification only; no behavior change expected)
- `test/unit/llm/planner-generation.test.ts`
- `test/unit/llm/client.test.ts` (verification only; no behavior change expected)

## Implementation checklist
1. Define a single counter-log shape for validation issue counts (rule key + count + observability identifiers).
2. Confirm writer validation counter emission remains on that shape.
3. Ensure planner validation failure paths emit equivalent counter logs with the same keys for downstream metric aggregation.
4. Confirm `generatePagePlan()`, `generateOpeningPage()`, and `generatePageWriterOutput()` preserve and pass `observability` context into generation/validation layers.
5. Add/adjust unit tests that assert counter log payload shape and observability identifiers for planner validation failures, while keeping existing writer assertions passing.

## Out of scope
- Page-service retry orchestration changes.
- Engine hard error code mapping.
- Server route error response body changes.
- Non-validation log formatting unrelated to pipeline observability.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/planner-generation.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Existing OpenRouter request payload contract (model/temperature/max_tokens/response_format) is unchanged except for observability plumbing.
- Structured-output validation still fails closed (invalid payloads do not silently pass).
- Writer remains creative-output generator in the split architecture and does not regain ownership of final reconciled state.

## Outcome
- Completion date: 2026-02-11
- Actually changed:
  - Added planner-side validation counter logs in `src/llm/planner-generation.ts` using the same payload shape as writer (`ruleKey`, `count`, `storyId`, `pageId`, `requestId`).
  - Extended planner unit coverage in `test/unit/llm/planner-generation.test.ts` to assert:
    - observability identifiers are included on planner counter logs for validation failures,
    - counter payload includes `ruleKey` and `count`,
    - missing observability context produces explicit `null` identifiers.
- Deviations from original plan:
  - No code change was required in `src/llm/client.ts`; observability propagation there was already correct.
  - No writer behavior changes were required; existing writer counter-shape assertions already covered that side.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/planner-generation.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts` passed.
  - `npm run typecheck` passed.
