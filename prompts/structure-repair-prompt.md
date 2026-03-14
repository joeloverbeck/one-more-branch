# Structure Repair Prompt (Production Template)

- Source: `src/llm/prompts/structure-repair-prompt.ts`
- System prompt source: `buildStructureSystemPrompt()` from `src/llm/prompts/system-prompt.ts`
- Output schema source: `src/llm/schemas/structure-repair-schema.ts`
- Model selection: Per-stage via `getStageModel('structureRepair')` / `getStageMaxTokens('structureRepair')` from `src/config/stage-model.ts`

## Purpose

Call 3 repair prompt for the split structure pipeline. It receives:
- the merged structure produced by macro architecture + milestone generation
- failing validator diagnostics
- the specific act indices that may be rewritten

It must return only targeted act rewrites, not a full regenerated structure.

## Contract Highlights

- Non-target acts are preserved by omission.
- Each repaired act must include full act metadata plus a complete 2-4 milestone list.
- The prompt reiterates whole-structure semantic invariants:
  - exactly one midpoint
  - distinct `actQuestion` values
  - non-final `exitReversal` coverage
  - premise promise / genre obligation target coverage
  - milestone obligation-tag coverage
  - minimum traced setpiece coverage when verified setpieces exist
- `obligationTargets` define the active genre-obligation coverage contract for the structure being repaired.
- Milestone `obligatorySceneTag` coverage must satisfy the obligations allocated via `obligationTargets`. If no obligations are allocated anywhere, the full genre obligation list is the fallback contract.

## Output Shape

```json
{
  "repairedActs": [
    {
      "actIndex": 1,
      "act": {
        "name": "Act II",
        "objective": "Recover leverage inside the hearing ritual.",
        "stakes": "Failure cements tribunal control.",
        "entryCondition": "The ledger reveals who must testify next.",
        "actQuestion": "Can ritual law be turned against the tribunal?",
        "exitReversal": "The public turns, but protection vanishes.",
        "promiseTargets": ["Public ritual becomes a weapon"],
        "obligationTargets": ["key_clue_recontextualized"],
        "milestones": [
          {
            "name": "Ritual breach",
            "description": "The guard interrupts the oath sequence.",
            "objective": "Force the judge onto the record.",
            "causalLink": "Because the decoded bell code identifies the judge who must speak.",
            "exitCondition": "A public statement is made or the ritual collapses.",
            "role": "turning_point",
            "escalationType": "REVERSAL_OF_FORTUNE",
            "secondaryEscalationType": null,
            "crisisType": "BEST_BAD_CHOICE",
            "expectedGapMagnitude": "WIDE",
            "isMidpoint": true,
            "midpointType": "FALSE_DEFEAT",
            "uniqueScenarioHook": "The oath itself becomes the trap.",
            "approachVectors": ["PERSUASION_INFLUENCE", "SELF_EXPRESSION"],
            "setpieceSourceIndex": 2,
            "obligatorySceneTag": null
          }
        ]
      }
    }
  ]
}
```
