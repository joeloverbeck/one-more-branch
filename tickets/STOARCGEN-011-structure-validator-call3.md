# STOARCGEN-011: Structure Validator (Call 3)

**Status**: TODO
**Depends on**: STOARCGEN-008, STOARCGEN-009, STOARCGEN-010
**Blocks**: STOARCGEN-012 (pipeline orchestration)

## Summary

Implement the Structure Validator — Call 3 of the 3-call pipeline. This performs code-side validation checks on the combined macro architecture + milestones output, and triggers targeted LLM repair only when checks fail.

## Files to Touch

### New files
- `src/llm/structure-validator.ts` — Code-side validation logic + LLM repair orchestration
- `src/llm/prompts/structure-repair-prompt.ts` — LLM prompt for targeted repair of failing milestones/acts
- `src/llm/schemas/structure-repair-schema.ts` — JSON Schema for repair output

### Modified files
- None (this is self-contained; pipeline wiring is STOARCGEN-012)

## Detailed Changes

### Code-side validation checks (`structure-validator.ts`)

Implement these 10 checks as pure functions:

1. **Midpoint uniqueness**: Exactly 1 milestone across all acts has `isMidpoint: true`
2. **Milestone count**: 2-4 milestones per act
3. **Escalation type required**: `escalationType` non-null for all escalation/turning_point milestones
4. **Setpiece coverage**: >= 4 unique traced setpieces (when `conceptVerification` provided)
5. **Genre obligation coverage**: All expected obligation tags present across milestones
6. **Exit condition non-empty**: `exitCondition` non-empty for every milestone
7. **Act question distinct**: `actQuestion` distinct across all acts
8. **Exit reversal present**: `exitReversal` non-empty for all non-final acts
9. **Promise target coverage**: `promiseTargets` across all acts cover all premise promises
10. **Obligation target coverage**: `obligationTargets` across all acts cover all genre obligations

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

### LLM repair (`structure-repair-prompt.ts`)

**Repair policy**:
- Only rewrite failing acts or milestone clusters
- Do NOT regenerate the whole structure unless macro architecture itself fails
- Receive the full structure + list of failing checks + affected indices
- Return only the repaired acts/milestones

**Repair schema** (`structure-repair-schema.ts`):
- Accepts targeted act/milestone rewrites
- Same milestone shape as Call 2 output

### Orchestration within validator

```typescript
async function validateAndRepair(
  macroResult: MacroArchitectureResult,
  milestones: GeneratedAct[],
  context: StructureContext,
  apiKey: string,
  options?: GenerationOptions
): Promise<{ acts: GeneratedAct[]; repaired: boolean; diagnostics: ValidationResult[] }>
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
- Pipeline wiring (STOARCGEN-012)
- Rewrite pipeline (STOARCGEN-013)

## Acceptance Criteria

### Tests that must pass
- New test: `test/unit/llm/structure-validator.test.ts` — Each of the 10 validation checks tested individually with passing and failing cases
- New test: `test/unit/llm/structure-validator.test.ts` — Full validation run with all-passing structure
- New test: `test/unit/llm/structure-validator.test.ts` — Repair flow triggered on validation failure (mocked LLM)
- New test: `test/unit/llm/prompts/structure-repair-prompt.test.ts` — Repair prompt builds valid messages
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Code-side checks are pure functions (no side effects, no LLM calls)
- LLM repair is targeted (only affected acts/milestones), never full regeneration
- Maximum 1 repair attempt per validation run (no infinite loops)
- Validation results include diagnostics for observability
- Repair prompt follows existing prompt builder patterns
- All 10 checks match the spec's acceptance criteria exactly
