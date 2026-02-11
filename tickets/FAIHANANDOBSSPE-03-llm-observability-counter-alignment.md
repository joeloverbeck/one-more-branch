# FAIHANANDOBSSPE-03: Align LLM Validation Counter Logging and Observability Context Propagation

## Summary
Standardize planner/writer/reconciler issue-counter log format and ensure `storyId`/`pageId`/`requestId` observability context is consistently propagated from LLM client calls into validation failure logs.

## Depends on
- `tickets/FAIHANANDOBSSPE-01-generation-pipeline-metrics-contract.md`

## Blocks
- `tickets/FAIHANANDOBSSPE-05-integration-observability-and-hard-failure-coverage.md`

## File list it expects to touch
- `src/llm/writer-generation.ts`
- `src/llm/planner-generation.ts`
- `src/llm/client.ts`
- `test/unit/llm/client.test.ts`
- `test/unit/llm/planner-generation.test.ts`

## Implementation checklist
1. Define a single counter-log shape for validation issue counts (rule key + count + observability identifiers).
2. Update writer validation counter emission to match that shape.
3. Ensure planner validation failure paths emit equivalent counter logs with the same keys for downstream metric aggregation.
4. Ensure `generatePagePlan()`, `generateOpeningPage()`, and `generatePageWriterOutput()` consistently preserve and pass `observability` context into generation/validation layers.
5. Add/adjust unit tests that assert counter log payload shape and observability identifiers for both planner and writer validation failures.

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

