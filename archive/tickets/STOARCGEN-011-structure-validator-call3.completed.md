# STOARCGEN-011: Structure Validator (Call 3)

**Status**: COMPLETED
**Depends on**: `specs/story-architecture-generation-spec-v2.md`, current macro-architecture + milestone-generation implementation in `src/llm/structure-generator.ts`
**Blocks**: STOARCGEN-012 (pipeline orchestration)

## Summary

Implement the Structure Validator as the semantic validation and targeted repair stage for the current split structure pipeline. The validator must operate on the merged structure result produced from Call 1 + Call 2, surface diagnostics for whole-structure contract failures, and trigger targeted LLM repair only when those semantic checks fail.

This ticket is not a fresh greenfield stage. The codebase already has:
- hard prompt constraints in `macro-architecture-prompt.ts` and `milestone-generation-prompt.ts`
- hard parse validation in `macro-architecture-response-parser.ts` and `milestone-generation-response-parser.ts`
- runtime normalization/materialization in `story-structure-normalization.ts` and `structure-factory.ts`
- soft warning helpers in `structure-generator.ts`

Call 3 should complement those seams, not duplicate or replace them.

## Assumption Reassessment

- `STOARCGEN-008`, `STOARCGEN-009`, and `STOARCGEN-010` are not live implementation tickets in `tickets/`. The foundational data-model and split-generation work already exists in code, and `STOARCGEN-008` is archived.
- The ticket's original “self-contained; modified files: none” assumption is incorrect. A validator that is not wired into generation would be dead code and a poor architectural fit.
- Several listed checks are already enforced earlier than Call 3:
  - milestone count 2-4 per act
  - exactly one midpoint
  - non-empty `exitCondition`
  - non-null `escalationType` for escalation / turning-point milestones
  - act count / anchor midpoint consistency
- Call 3 still needs those checks exposed through a single diagnostic interface for defense in depth and observability, but it must reuse existing parser/normalization seams instead of re-implementing divergent rules.
- The current soft helpers `countUniqueSetpieceIndices()` and `collectTaggedObligations()` belong conceptually to Call 3 and should be absorbed or delegated into the validator so generation has one semantic validation surface.

## Architectural Decision

Implement Call 3 as a merged-structure semantic validator with optional targeted repair, not as a second parser:
- Keep parser/normalization layers responsible for shape correctness and field-level hard constraints.
- Move whole-structure semantic checks into a dedicated validator module.
- Invoke the validator from `generateStoryStructure()` immediately after Call 2 is merged with Call 1 output.
- If repair is needed, repair only the affected acts/milestones and then re-run the semantic validator once.
- Do not introduce compatibility aliases, duplicate normalization paths, or a dead “validator library” that is not part of generation.

## Files to Touch

### New files
- `src/llm/structure-validator.ts` — Code-side validation logic + LLM repair orchestration
- `src/llm/prompts/structure-repair-prompt.ts` — LLM prompt for targeted repair of failing milestones/acts
- `src/llm/schemas/structure-repair-schema.ts` — JSON Schema for repair output

### Modified files
- `src/llm/structure-generator.ts` — Invoke Call 3 on the merged result and reuse validator diagnostics instead of ad hoc soft warnings
- `src/config/llm-stage-registry.ts` and related config/tests — Add a dedicated repair stage only if the implementation uses distinct model/token selection
- Prompt docs/tests that must stay aligned if a new production prompt file is added

## Detailed Changes

### Validator seam (`structure-validator.ts`)

Export pure semantic validation helpers plus a single orchestration entry point. The validator should accept the already-merged structure shape so it sees act metadata and milestones together.

Prefer a split such as:

```typescript
function validateStructureSemantics(
  result: Omit<StructureGenerationResult, 'rawResponse'>,
  context: StructureContext
): ValidationResult[]

async function validateAndRepairStructure(
  result: StructureGenerationResult,
  context: StructureContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<{ result: StructureGenerationResult; repaired: boolean; diagnostics: ValidationResult[] }>
```

The validator may internally reuse extracted helpers for setpiece and obligation coverage, but all semantic checks should report through a consistent diagnostic shape.

### Code-side semantic checks

Implement these 10 checks as pure functions / pure helpers:

1. **Midpoint uniqueness**: Exactly 1 milestone across all acts has `isMidpoint: true`
2. **Milestone count**: 2-4 milestones per act
3. **Escalation type required**: `escalationType` non-null for all escalation/turning_point milestones
4. **Setpiece coverage**: >= 4 unique traced setpieces (when `conceptVerification` provided)
5. **Genre obligation coverage**: All allocated obligation tags present across milestones, with fallback to the full genre list only when no obligations were allocated
6. **Exit condition non-empty**: `exitCondition` non-empty for every milestone
7. **Act question distinct**: `actQuestion` distinct across all acts
8. **Exit reversal present**: `exitReversal` non-empty for all non-final acts
9. **Promise target coverage**: `promiseTargets` across all acts cover all premise promises
10. **Obligation target coverage**: `obligationTargets` define the structure's active genre-obligation coverage contract

Each check returns a `ValidationResult`:
```typescript
interface ValidationResult {
  passed: boolean;
  check: string;
  details?: string;
  affectedActIndices?: number[];
  affectedMilestoneIndices?: Array<{ actIndex: number; milestoneIndex: number }>;
}
```

Notes:
- Checks that already fail at parse-time should still be diagnosable here when the validator is called on an in-memory structure, but the validator must defer to the existing parser/normalization definitions of correctness rather than inventing slightly different rules.
- Coverage checks should use canonical sources:
  - premise promises from `context.conceptVerification?.premisePromises`
  - genre obligations from `getGenreObligationTags(context.conceptSpec?.genreFrame)`
  - traced setpieces from milestone `setpieceSourceIndex`

### LLM repair (`structure-repair-prompt.ts`)

**Repair policy**:
- Only rewrite failing acts or milestone clusters
- Do NOT regenerate the whole structure unless macro architecture itself fails
- Receive the full structure + list of failing checks + affected indices
- Return only the repaired acts/milestones

**Repair schema** (`structure-repair-schema.ts`):
- Accepts targeted act and/or milestone rewrites keyed by act index
- Uses the same act/milestone field contracts as the current split generation output
- Must be mergeable back into the existing merged structure without introducing a second normalization path

### Orchestration within validator

```typescript
async function validateAndRepairStructure(
  result: StructureGenerationResult,
  context: StructureContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<{ result: StructureGenerationResult; repaired: boolean; diagnostics: ValidationResult[] }>
```

1. Run all 10 code-side checks
2. If all pass → return as-is
3. If any fail → build repair prompt targeting affected acts/milestones
4. Run LLM repair call
5. Merge repaired milestones into structure
6. Re-run checks (max 1 repair attempt)
7. If still failing → log warnings, return best-effort result

## Out of Scope

- Macro architecture prompt (STOARCGEN-009)
- Milestone generation prompt (STOARCGEN-010)
- UI/progress-stage expansion (STOARCGEN-012)
- Rewrite pipeline (STOARCGEN-013)

## Acceptance Criteria

### Tests that must pass
- New test: `test/unit/llm/structure-validator.test.ts` — Each of the 10 validation checks tested with passing and failing cases, with emphasis on whole-structure semantic coverage
- New test: `test/unit/llm/structure-validator.test.ts` — Full validation run with all-passing structure
- New test: `test/unit/llm/structure-validator.test.ts` — Repair flow triggered on validation failure (mocked LLM)
- New test: `test/unit/llm/prompts/structure-repair-prompt.test.ts` — Repair prompt builds valid messages
- Updated test: `test/unit/llm/structure-generator.test.ts` — `generateStoryStructure()` invokes Call 3 and returns repaired diagnostics/result when needed
- Add or update prompt doc alignment coverage if `structure-repair-prompt.ts` is treated as a production prompt with a doc contract
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Code-side semantic checks are pure functions (no side effects, no LLM calls)
- Parser/normalization layers remain the source of truth for field-level validity
- LLM repair is targeted (only affected acts/milestones), never full regeneration
- Maximum 1 repair attempt per validation run (no infinite loops)
- Validation results include diagnostics for observability
- Repair prompt follows existing prompt builder patterns
- `generateStoryStructure()` remains the entry point that owns generation + validation as one coherent pipeline
- All 10 checks match the current validator contract exactly, including obligation-target-driven genre coverage

## Outcome

- Completed on 2026-03-14.
- Corrected the ticket before implementation to reflect the real architecture: Call 3 now complements existing prompt/parser/normalization seams instead of duplicating them, and it is wired directly into `generateStoryStructure()` rather than shipped as dead code.
- Implemented `src/llm/structure-validator.ts` with 10 semantic checks, targeted repair orchestration, merged-act repair parsing, and one-pass revalidation.
- Added `src/llm/prompts/structure-repair-prompt.ts`, `src/llm/schemas/structure-repair-schema.ts`, and prompt documentation in `prompts/structure-repair-prompt.md`.
- Updated generator orchestration to invoke Call 3 after Call 2 and to preserve repair raw response output.
- Added/updated tests covering semantic validation, prompt construction, generator repair orchestration, and prompt-doc alignment.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/structure-validator.test.ts test/unit/llm/prompts/structure-repair-prompt.test.ts test/unit/llm/structure-generator.test.ts test/unit/llm/prompt-doc-alignment.test.ts`
  - `npm run typecheck`
  - `npm run lint`
