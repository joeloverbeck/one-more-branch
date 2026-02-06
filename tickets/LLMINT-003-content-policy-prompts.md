# LLMINT-003: Content Policy and Prompt Templates

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
- `npm run lint` passes
- `npm run build` succeeds
- `npm run test:unit -- --testPathPattern=prompts` passes

## Estimated Size

~180 lines of TypeScript + ~150 lines of tests
