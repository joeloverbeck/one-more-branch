# Spec: Prose Golden Rule and Guidelines Audit

**Status**: COMPLETED

## Overview

Add a concrete prose golden rule to the shared narrative-core guidelines and audit existing directives for redundancy, tightening the set to eliminate overlap.

## Goals

1. Add a golden rule directive that anchors prose quality in concrete craft principles
2. Audit the existing 13 STORYTELLING_GUIDELINES directives for redundancy
3. Consolidate or remove directives that substantially duplicate each other
4. Ensure the final set is tight, non-overlapping, and actionable

## Dependencies

**None** - This spec is standalone and does not depend on other prompt improvement specs.

## Implementation Details

### File: `src/llm/prompts/sections/shared/narrative-core.ts`

**Add golden rule** as the first directive in `STORYTELLING_GUIDELINES`:

```
- GOLDEN RULE: Build narrative prose around vigorous verbs, specific nouns, and meaningful sensorial detail. Avoid adjective-heavy filler and abstract summaries.
```

**Audit existing directives** for overlap. Current directives to review:

| # | Directive | Assessment |
|---|-----------|------------|
| 1 | "Write vivid, evocative prose that brings the world to life." | Overlaps with golden rule; consider removing or merging |
| 2 | "Use second person perspective ('you'), but write as though the protagonist's own mind is narrating..." | Unique - keep |
| 3 | "Match diction, observations, and internal reactions to the protagonist's personality..." | Unique - keep |
| 4 | "What the protagonist NOTICES and HOW they describe it should reflect who they are..." | Extends #3 with concrete examples; consider merging with #3 |
| 5 | "Let emotional state color the prose naturally..." | Unique - keep |
| 6 | "Format narrative with blank lines between paragraphs for readability." | Unique (formatting) - keep |
| 7 | "Show character through action, not exposition..." | Partially covered by #3/#4; but distinct enough to keep as a constraint |
| 8 | "Keep scenes focused and forward-moving; avoid sprawling recaps." | Unique (pacing) - keep |
| 9 | "Maintain consistency with established facts and character personality." | State/continuity concern, not prose style; keep but note overlap with continuation rules |
| 10 | "Present meaningful choices that have genuine consequences." | Choice concern, not prose; covered by STRICT_CHOICE_GUIDELINES; **candidate for removal** |
| 11 | "Honor player agency while maintaining narrative coherence." | High-level design principle; keep but consider tightening |
| 12 | "Build tension and dramatic stakes naturally." | Unique (dramatic structure) - keep |
| 13 | "React believably to player choices." | Continuation concern; covered by continuation prompt REQUIREMENTS; **candidate for removal** |
| 14 | "Each choice should represent a genuinely different path." | Choice divergence; fully covered by STRICT_CHOICE_GUIDELINES; **candidate for removal** |

**Recommended consolidation:**

1. **Remove directives 10, 13, 14** - These are about choices, not prose. They are already covered by STRICT_CHOICE_GUIDELINES and the opening/continuation REQUIREMENTS sections.
2. **Merge directives 3 and 4** into a single directive about character-filtered perception.
3. **Tighten directive 1** to complement the golden rule rather than duplicate it, or remove it entirely since the golden rule supersedes it.

**Target: ~10 directives** (down from 13), each covering a distinct concern.

### Changes Required

1. `src/llm/prompts/sections/shared/narrative-core.ts` - Rewrite `STORYTELLING_GUIDELINES` with golden rule + consolidated directives.

### What NOT to Change

- `ENDING_GUIDELINES` - Unchanged
- `STRICT_CHOICE_GUIDELINES` in `system-prompt-builder.ts` - Unchanged (choice directives removed from narrative-core belong there already)
- System prompt composition logic - Unchanged

## Invariants

- `STORYTELLING_GUIDELINES` must contain the golden rule as its first or most prominent directive
- No guideline should substantially duplicate another after consolidation
- All prose-relevant directives from the original set must be preserved (only choice-related ones removed)
- `composeCreativeSystemPrompt()` still composes correctly (it uses `STORYTELLING_GUIDELINES` as-is)
- Exported constant name `STORYTELLING_GUIDELINES` unchanged

## Test Impact

- Any tests that snapshot or assert the exact content of `STORYTELLING_GUIDELINES` must be updated
- Any tests that assert prompt content containing narrative-core text must be updated
- `npm run typecheck` must pass
- `npm run test` must pass

## Verification

1. Read the final `STORYTELLING_GUIDELINES` and confirm golden rule is present
2. Confirm no two remaining directives cover the same concern
3. Confirm removed choice-related directives are already present in `STRICT_CHOICE_GUIDELINES`
4. Run `npm run typecheck && npm test`

## Outcome

- **Completion date**: 2026-02-12
- **Changes made**:
  - `src/llm/prompts/sections/shared/narrative-core.ts`: Rewrote STORYTELLING_GUIDELINES from 13 to 10 directives. Added golden rule as first directive. Removed directives 1 (vivid prose, superseded by golden rule), 10 (meaningful choices), 13 (react to choices), 14 (different paths). Merged directives 3+4 into single character-filtered perception directive.
  - `test/unit/llm/prompts/sections/shared/narrative-core.test.ts`: Updated assertions for golden rule, removed "meaningful choices" test.
  - `test/unit/llm/prompts/system-prompt.test.ts`: Updated assertion from "vivid prose" to "GOLDEN RULE".
  - `test/integration/llm/system-prompt-composition.test.ts`: Updated assertion from "vivid prose" to "GOLDEN RULE".
  - `prompts/opening-prompt.md`: Updated STORYTELLING GUIDELINES section to match new directives.
  - `prompts/continuation-prompt.md`: Updated STORYTELLING GUIDELINES section to match new directives.
- **Deviations**: None. Implementation followed spec exactly.
- **Verification**: `npm run typecheck` clean, 131/131 test suites, 1569/1569 tests pass.
