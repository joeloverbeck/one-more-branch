# LLMINT-003: Content Policy and Prompt Templates

## Status

- [x] In progress
- [x] Completed

## Summary

Create the NC-21 content policy constant and prompt builder functions for opening and continuation pages.

## Dependencies

- **LLMINT-001**: Requires `OpeningContext`, `ContinuationContext`, `ChatMessage` types

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/llm/content-policy.ts` | Create |
| `src/llm/prompts.ts` | Create |
| `test/unit/llm/prompts.test.ts` | Create |
| `jest.config.js` | Modify (test resolver compatibility for `.js` specifiers) |

## Reassessed Assumptions and Scope

### Confirmed

- `LLMINT-001` is complete and `src/llm/types.ts` exports `OpeningContext`, `ContinuationContext`, and `ChatMessage` needed by this ticket.
- `src/llm/content-policy.ts`, `src/llm/prompts.ts`, and `test/unit/llm/prompts.test.ts` do not exist yet.
- `specs/04-llm-integration.md` requires prompt templates without structured text-output instructions (`OUTPUT FORMAT`, `NARRATIVE`, `CHOICES` markers).

### Corrected

- `OpeningContext.worldbuilding` and `ContinuationContext.worldbuilding` are currently required `string` fields (not optional); this ticket should treat empty string as "not provided" when conditionally rendering worldbuilding sections.
- The original build gate required repository-wide `npm run lint`, but current baseline may contain unrelated lint issues. Verification for this ticket should run scoped lint on touched files while keeping typecheck, build, and focused unit tests as required gates.
- The original ticket did not account for runtime imports in Jest using Node16-style `.js` specifiers. This ticket includes a minimal `jest.config.js` mapper update so new prompt runtime imports resolve from TypeScript sources during tests.

## Scope

### In Scope

- Create `src/llm/content-policy.ts` with `CONTENT_POLICY`.
- Create `src/llm/prompts.ts` with `buildOpeningPrompt`, `buildContinuationPrompt`, and an internal truncation helper.
- Create `test/unit/llm/prompts.test.ts` covering prompt content, message structure, and truncation behavior via public functions.

### Out of Scope for This Ticket

- Any client/network logic (`src/llm/client.ts`) or fallback text parser work (`src/llm/fallback-parser.ts`).
- Any changes to `src/llm/types.ts` and `src/llm/schemas.ts`.

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify `src/llm/types.ts` or `src/llm/schemas.ts`
- **DO NOT** create `src/llm/client.ts` (that's LLMINT-005)
- **DO NOT** include OUTPUT FORMAT instructions in prompts (structured output handles this)

## Implementation Details

### Content Policy (`content-policy.ts`)

Create `CONTENT_POLICY` constant string containing:
- Rating: NC-21 (ADULTS ONLY)
- No restrictions statement
- Permitted content list (explicit language, violence, sexual themes, etc.)
- Primary directive about authentic portrayal without self-censorship

### Prompt Templates (`prompts.ts`)

**System Prompt (internal constant)**:
- Role: expert interactive fiction storyteller and Dungeon Master
- Include `CONTENT_POLICY`
- Storytelling guidelines (vivid prose, second person, consistency, meaningful choices)
- Ending guidance
- **NO OUTPUT FORMAT section** (this is critical - structured outputs handle formatting)

**buildOpeningPrompt(context: OpeningContext): ChatMessage[]**:
- System message with system prompt
- User message requesting opening scene with:
  - CHARACTER CONCEPT section
  - WORLDBUILDING section (if provided)
  - TONE/GENRE
  - Instructions for compelling opening, atmosphere, hook, choices
  - Request for story arc determination

**buildContinuationPrompt(context: ContinuationContext): ChatMessage[]**:
- System message with system prompt
- User message with:
  - CHARACTER CONCEPT
  - WORLDBUILDING (if provided)
  - TONE/GENRE
  - STORY ARC (if established)
  - ESTABLISHED WORLD FACTS (globalCanon)
  - CURRENT STATE (accumulatedState)
  - PREVIOUS SCENE (truncated if needed)
  - PLAYER'S CHOICE
  - Instructions for consequences, consistency, new choices

**truncateText(text: string, maxLength: number): string** (internal helper):
- If text ≤ maxLength, return as-is
- Otherwise, truncate at sentence boundary (., ?, !)
- If no good boundary found in last 50% of text, truncate with "..."

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/llm/prompts.test.ts`:

**buildOpeningPrompt tests:**
1. `it('should include character concept in user message')`
2. `it('should include content policy in system message')`
3. `it('should include worldbuilding if provided')`
4. `it('should NOT include OUTPUT FORMAT instructions')`
5. `it('should request story arc determination')`
6. `it('should include tone in user message')`
7. `it('should return exactly 2 messages (system, user)')`

**buildContinuationPrompt tests:**
8. `it('should include selected choice in user message')`
9. `it('should include accumulated state when present')`
10. `it('should include global canon when present')`
11. `it('should include story arc when present')`
12. `it('should include previous narrative')`
13. `it('should include content policy in system message')`
14. `it('should NOT include OUTPUT FORMAT instructions')`
15. `it('should return exactly 2 messages (system, user)')`

**truncateText tests (if exported or tested indirectly):**
16. `it('should not truncate text under maxLength')`
17. `it('should truncate at sentence boundary when possible')`
18. `it('should add ellipsis when no good boundary found')`

### Invariants That Must Remain True

1. **Content policy always included**: Every prompt must contain NC-21 content policy
2. **No OUTPUT FORMAT section**: Prompts must NOT contain "OUTPUT FORMAT:", "NARRATIVE:", "CHOICES:" markers
3. **Context integrity**: All provided context (character, world, state) must be included
4. **Truncation safety**: Long text truncated at sentence boundaries when possible
5. **Message structure**: Always return [system, user] message array

### Build Requirements

- `npm run typecheck` passes
- `npx eslint src/llm/content-policy.ts src/llm/prompts.ts test/unit/llm/prompts.test.ts` passes
- `npm run build` succeeds
- `npm run test:unit -- --testPathPattern=prompts` passes

## Estimated Size

~180 lines of TypeScript + ~150 lines of tests

## Outcome

- Implemented `src/llm/content-policy.ts` with the NC-21 `CONTENT_POLICY` constant.
- Implemented `src/llm/prompts.ts` with `buildOpeningPrompt`, `buildContinuationPrompt`, shared system prompt content, and internal sentence-aware truncation.
- Added `test/unit/llm/prompts.test.ts` with all acceptance tests plus indirect truncation coverage through continuation prompt generation.
- Applied one supporting test-harness change in `jest.config.js` to map relative `.js` import specifiers to TypeScript modules for Jest execution.
- Verification run: `npm run test:unit -- --testPathPattern=prompts`, `npx eslint src/llm/content-policy.ts src/llm/prompts.ts test/unit/llm/prompts.test.ts`, `npm run typecheck`, and `npm run build` all passed.
