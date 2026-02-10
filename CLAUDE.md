# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"One More Branch" is an interactive branching storytelling application where users play AI-generated choose-your-own-adventure stories. The LLM acts as a Dungeon Master, generating narrative segments with meaningful choices that branch into different story paths.

**Key characteristics:**
- Stories are generated via OpenRouter API (user provides their own API key at runtime)
- Pages are immutable once generated - replay always yields identical content
- No undo/back functionality - choices are permanent per playthrough
- Branch isolation - state changes only affect downstream pages in same branch
- NC-21 mature content policy (no censorship)

## Tech Stack

- **Runtime**: Node.js (>=18.0.0)
- **Language**: TypeScript (strict mode)
- **Server**: Express.js with EJS templating
- **Testing**: Jest with separate test categories
- **Storage**: File-based JSON (granular per-page files)

## Build and Run Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run production
npm start

# Development with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

## Testing Commands

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance
npm run test:memory

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Project Architecture

```
src/
├── models/         # Data types: Story, Page, Choice, state management
├── persistence/    # File-based storage with atomic writes and locking
├── llm/            # OpenRouter client, prompts, response parsing
├── engine/         # Core story engine orchestrating all operations
├── server/         # Express routes and EJS views
└── index.ts        # Application entry point

test/
├── unit/           # Fast isolated tests
├── integration/    # Multi-component tests
├── e2e/            # Full workflow tests
├── performance/    # Load/stress tests
├── memory/         # Leak detection
└── fixtures/       # Shared test data

stories/            # Runtime story data (gitignored)
```

## Core Data Flow

1. **Story Creation**: User provides character concept + worldbuilding + tone + API key
2. **Page Generation**: LLM generates narrative + choices + state changes + canon facts
3. **Choice Selection**: Either load existing page (if explored) or generate new one
4. **State Accumulation**: Each page's state = parent's accumulated state + own changes
5. **Canon Management**: Global facts persist across all branches

## Storage Structure

```
stories/
└── {storyId}/
    ├── story.json      # Metadata, global canon, story arc
    ├── page_1.json     # First page
    ├── page_2.json     # Subsequent pages...
    └── page_N.json
```

## Key Invariants

- **Page Immutability**: Generated content never changes
- **Deterministic Replay**: Same choice → same content
- **Acyclic Graph**: No page links create cycles
- **Branch Isolation**: State changes don't leak across branches
- **Ending Consistency**: `isEnding === true` ⟺ `choices.length === 0`
- **Choice Minimum**: Non-ending pages have 2-5 choices
- **API Key Security**: Never persisted to disk, only in browser session storage

## Implementation Status

All core specs have been implemented:
1. `01-project-foundation` - TypeScript/Jest setup ✅
2. `02-data-models` - Story, Page, Choice types ✅
3. `03-persistence-layer` - File storage with locking ✅
4. `04-llm-integration` - OpenRouter client and prompts ✅
5. `05-story-engine` - Core orchestration logic ✅
6. `06-user-interface` - Express server and EJS views ✅

Completed specs are archived in `archive/specs/`.

## LLM Integration Notes

- Uses OpenRouter API exclusively
- Default model: `anthropic/claude-sonnet-4.5`
- Prompts enforce structured output format: NARRATIVE/CHOICES/STATE_CHANGES/CANON_FACTS
- Response parser has fallbacks for various formatting styles
- Retry with exponential backoff on transient failures (429, 5xx)

## Content Policy

All prompts include NC-21 mature content guidelines permitting explicit content, violence, and controversial themes without self-censorship, as this is an adults-only application.

## Skill Invocation (MANDATORY)

When a slash command (e.g., `/superpowers:execute-plan`) expands to an instruction like "Invoke the superpowers:executing-plans skill", you MUST call the `Skill` tool with the referenced skill name BEFORE taking any other action. The `<command-name>` tag means the *command wrapper* was loaded, NOT the skill itself. The skill content is only available after you call the Skill tool.

Do NOT skip the Skill tool invocation. Do NOT interpret the command body as the skill content. Do NOT start implementation before the skill is loaded and its methodology followed.

## Coding Guidelines

- Follow the 1-3-1 rule: When stuck, provide 1 clearly defined problem, give 3 potential options for how to overcome it, and 1 recommendation. Do not proceed implementing any of the options until I confirm.
- DRY: Don't repeat yourself. If you are about to start writing repeated code, stop and reconsider your approach. Grep the codebase and refactor often.

## MCP Server Usage

When using Serena MCP for semantic code operations (symbol navigation, project memory, session persistence), it must be activated first:

```
mcp__plugin_serena_serena__activate_project with project: "one-more-branch"
```

Serena provides:
- Symbol-level code navigation and refactoring
- Project memory for cross-session context
- Semantic search across the codebase
- LSP-powered code understanding

## Archiving Tickets and Specs

When asked to archive a ticket, spec, or brainstorming document:

1. **Edit the document** to mark its final status at the top:
   - `**Status**: ✅ COMPLETED` - Fully implemented
   - `**Status**: ❌ REJECTED` - Decided not to implement
   - `**Status**: ⏸️ DEFERRED` - Postponed for later
   - `**Status**: 🚫 NOT IMPLEMENTED` - Started but abandoned

2. **Add an Outcome section** at the bottom (for completed tickets):
   - Completion date
   - What was actually changed
   - Any deviations from the original plan
   - Verification results

3. **Move to appropriate archive subfolder**:
   - `archive/tickets/` - Implementation tickets
   - `archive/specs/` - Design specifications
   - `archive/brainstorming/` - Brainstorming documents
   - `archive/reports/` - Reports

4. **Delete the original** from `tickets/`, `specs/`, `brainstorming/`, or `reports/`

## Testing Patterns

### Fire-and-Forget Route Handlers

Express routes use `wrapAsyncRoute()` which fire-and-forgets async handlers via `void handler(req, res)`. This means:

- **`await handler(req, res)` does NOT wait** - the wrapper detaches the promise
- **Unit tests**: Use `flushPromises()` helper with `setImmediate` after calling the handler
- **Integration tests**: Use `waitForMock()` polling helper that waits until response mocks are called

```typescript
// Unit test pattern
function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

handler(req, res);  // Don't await - it won't work
await flushPromises();
expect(render).toHaveBeenCalled();

// Integration test pattern (for complex async chains)
async function waitForMock(mock: jest.Mock, timeout = 1000): Promise<void> {
  const start = Date.now();
  while (mock.mock.calls.length === 0) {
    if (Date.now() - start > timeout) throw new Error('Timeout');
    await new Promise(resolve => setImmediate(resolve));
  }
}

handler(req, res);
await waitForMock(redirectMock);
```

### Mock Object Completeness

When `GenerationResult` or other LLM interfaces change, all test mocks must include every required field:

```typescript
// Required fields for GenerationResult mocks
mockedGenerateOpeningPage.mockResolvedValueOnce({
  narrative: '...',
  choices: ['...'],
  stateChanges: [],
  canonFacts: [],
  characterCanonFacts: {},  // Required - don't forget!
  isEnding: false,
  storyArc: '...',
  rawResponse: '...',
});
```
