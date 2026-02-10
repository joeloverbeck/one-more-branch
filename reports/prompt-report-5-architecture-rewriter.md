# Prompt Report 5: Architecture Rewriter

## Purpose
Regenerate invalidated future beats after deviation, while preserving completed canon beats.

## Source of Truth
- `src/llm/prompts/structure-rewrite-prompt.ts`
- `src/engine/structure-rewriter.ts`
- `src/llm/prompts/system-prompt.ts`
- `src/llm/schemas/structure-schema.ts`

## Production Notes
- Uses the same structure `system` prompt as initial architecture generation.
- Uses same strict `response_format`: `STRUCTURE_GENERATION_SCHEMA`.
- Default call path currently invokes `buildStructureRewritePrompt(context)` without prompt options, so no rewrite few-shot messages are added in runtime.

## Messages Sent To LLM (Production Template)

### Message 1 (`system`)
Same as story architecture report (`STRUCTURE_SYSTEM_PROMPT`).

### Message 2 (`user`)
```text
Regenerate story structure for an interactive branching narrative.

The story has deviated from its original plan. Generate replacement beats for invalidated future structure while preserving completed canon.

## STORY CONTEXT
Character: {{characterConcept}}
{{#if worldbuilding}}World: {{worldbuilding}}{{/if}}
Tone: {{tone}}
Original Theme: {{originalTheme}}

## WHAT HAS ALREADY HAPPENED (CANON - DO NOT CHANGE)
The following beats have been completed. Their resolutions are permanent and must be respected.

{{#if completedBeats.length === 0}}
  - None (story is at the beginning)
{{else}}
  - Act {{actIndex+1}}, Beat {{beatIndex+1}} ({{beatId}}) [{{role}}] "{{name}}": "{{description}}"
    Objective: {{objective}}
    Resolution: {{resolution}}
  {{...}}
{{/if}}

## CURRENT SITUATION
Deviation occurred at: Act {{currentActIndex+1}}, Beat {{currentBeatIndex+1}}
Reason for deviation: {{deviationReason}}

Current narrative state:
{{narrativeSummary}}

## YOUR TASK
Generate NEW beats to replace invalidated ones. You are regenerating: {{actsToRegenerateText}}.

REQUIREMENTS (follow ALL):
1. Preserve completed beats exactly—include them in the output with unchanged names, descriptions, objectives, and roles
2. Maintain thematic coherence with: "{{originalTheme}}"
3. Build naturally from the current narrative state
4. Follow three-act structure principles (setup, confrontation, resolution)
5. Keep 2-4 beats per act total (including preserved beats)
6. Beats should be flexible milestones, not rigid gates
7. Account for branching narrative paths
8. Design beats with clear dramatic roles:
   - Use "setup" for establishing beats, "escalation" for rising tension, "turning_point" for irreversible changes, "resolution" for denouement
   - Preserve beat roles from completed beats unchanged
9. Write a premise: a 1-2 sentence hook capturing the core dramatic question (may evolve from original)
10. Set a pacing budget (targetPagesMin and targetPagesMax) appropriate for the story's remaining scope

OUTPUT SHAPE (same as original structure):
- overallTheme: string (may evolve slightly from original, or stay the same)
- premise: string (1-2 sentence story hook)
- pacingBudget: { targetPagesMin: number, targetPagesMax: number }
- acts: exactly 3 items
- each act has:
  - name: evocative act title
  - objective: main goal for the act
  - stakes: consequence of failure
  - entryCondition: what triggers transition into this act
  - beats: 2-4 items (including any preserved beats)
    - each beat has:
      - name: short evocative beat title
      - description: what should happen in this beat
      - objective: specific protagonist goal for the beat
      - role: "setup" | "escalation" | "turning_point" | "resolution"
```

### `actsToRegenerateText` Resolution Logic
- If `currentActIndex === 0`: `remaining beats in Act 1, plus all of Acts 2 and 3`
- If `currentActIndex === 1`: `remaining beats in Act 2, plus all of Act 3`
- Else: `remaining beats in Act 3`

## Expected Structured Output (`response_format`)
Same schema as story architecture prompt:
```json
{
  "overallTheme": "string",
  "premise": "string",
  "pacingBudget": {
    "targetPagesMin": 20,
    "targetPagesMax": 40
  },
  "acts": [
    {
      "name": "string",
      "objective": "string",
      "stakes": "string",
      "entryCondition": "string",
      "beats": [
        {
          "name": "string",
          "description": "string",
          "objective": "string",
          "role": "turning_point"
        }
      ]
    }
  ]
}
```
