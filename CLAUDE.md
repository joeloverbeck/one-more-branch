# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding Guidelines

- Follow the 1-3-1 rule: When stuck, provide 1 clearly defined problem, give 3 potential options for how to overcome it, and 1 recommendation. Do not proceed implementing any of the options until I confirm.
- DRY: Don't repeat yourself. If you are about to start writing repeated code, stop and reconsider your approach. Grep the codebase and refactor often.
- Continual Learning: When you encounter conflicting system instructions, new requirements, architectural changes, or missing or inaccurate codebase documentation, always propose updating the relevant rules files. Do not update anything until the user confirms. Ask clarifying questions if needed. For prompt pipeline changes (ownership/scope/schema changes between stages), update `prompts/*.md` docs in the same pass and verify no stale ownership statements remain (for example, planner vs accountant responsibilities).
- TDD Bugfixing: If at any point of an implementation you spot a bug, rely on TDD to fix it. Important: never adapt tests to bugs.

## Coding Style

- TypeScript with `strict` mode; prefer explicit types and avoid `any`.
- Indentation: 2 spaces; single quotes; semicolons; print width 100.
- ESLint enforces `no-explicit-any`, `prefer-optional-chain`, `prefer-nullish-coalescing`.
- Test files use `*.test.ts` naming.
- Commit messages: short, capitalized, imperative (e.g., "Implement ...", "Fix ...").

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
- **Testing**: Jest with `ts-jest` (coverage thresholds: 70% branches/functions/lines/statements)
- **Storage**: File-based JSON (granular per-page files)

## Build and Run Commands

```bash
# Install dependencies
npm install

# Build TypeScript (compiles to dist/, copies views and public assets)
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

# Formatting (src/**/*.ts and test/**/*.ts with Prettier)
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

# Coverage report (enforces 70% thresholds)
npm run test:coverage
```

Current integration and E2E suites run with mocked LLM/fetch flows and do not require `OPENROUTER_TEST_KEY`.

## Project Architecture

```
src/
├── config/             # Runtime configuration, Zod schemas, thread-pacing-config.ts
├── engine/             # Core story engine: page service, state reconciliation,
│   │                   #   structure progression, deviation handling, canon management
│   ├── page-service.ts       # Orchestrates the full generation pipeline
│   ├── page-builder.ts       # Constructs Page objects from generation results
│   ├── state-reconciler.ts   # Validates/reconciles writer output against active state
│   ├── structure-state.ts    # Beat/act progression state machine
│   ├── structure-rewriter.ts # Rewrites story structure on deviation
│   ├── deviation-handler.ts  # Detects and handles story deviations
│   ├── canon-manager.ts      # Global and character canon management
│   ├── ancestor-collector.ts # Collects ancestor context for prompts
│   └── story-engine.ts       # High-level API (startStory, makeChoice)
├── llm/                # OpenRouter client, 8-stage prompt system, response parsing
│   ├── prompts/              # Prompt builders (opening, continuation, planner,
│   │   │                     #   lorekeeper, analyst, structure, structure-rewrite, agenda-resolver)
│   │   └── sections/         # Shared prompt sections (opening/, continuation/,
│   │                         #   planner/, shared/)
│   ├── schemas/              # JSON Schema definitions for structured LLM output
│   ├── validation/           # Writer output validation and ID repair
│   ├── client.ts             # OpenRouter HTTP client
│   ├── structure-generator.ts    # Story structure generation
│   ├── planner-generation.ts     # Page plan generation
│   ├── writer-generation.ts      # Page narrative/choices generation
│   ├── analyst-generation.ts     # Post-write scene analysis
│   └── result-merger.ts          # Merges writer + reconciler + analyst results
├── logging/            # Structured logging: console, file-based prompt sink,
│   │                   #   browser injector
│   └── prompt-file-sink.ts   # JSONL prompt logging to logs/MM-DD-YYYY/
├── models/             # Data types: Story, Page, Choice, state, structure
│   ├── state/                # ActiveState, KeyedEntry, Inventory, Health,
│   │                         #   CharacterState, Canon types
│   ├── story-arc.ts          # StoryStructure, StoryAct, StoryBeat,
│   │                         #   AccumulatedStructureState
│   ├── protagonist-affect.ts # Emotional state snapshots per page
│   ├── choice-enums.ts       # ChoiceType and PrimaryDelta enums
│   ├── npc.ts                # NPC definitions
│   └── structure-version.ts  # Versioned structure tracking
├── persistence/        # File-based storage with atomic writes and locking
│   ├── converters/           # Serialization converters for complex state
│   ├── page-serializer.ts    # Page JSON serialization/deserialization
│   └── storage.ts            # Core file I/O operations
├── server/             # Express server
│   ├── routes/               # Route handlers (home, play, stories, progress)
│   ├── services/             # Generation progress tracking, story creation
│   ├── middleware/            # Error handler
│   ├── utils/                # Async route wrapper, view helpers, LLM error formatter
│   └── views/pages/          # EJS templates (home, new-story, play, error)
└── index.ts            # Application entry point

test/
├── unit/           # Fast isolated tests
├── integration/    # Multi-component tests
├── e2e/            # Full workflow tests
├── performance/    # Load/stress tests
├── memory/         # Leak detection
└── fixtures/       # Shared test data and setup

dist/               # Compiled output from tsc (gitignored)
stories/            # Runtime story data (gitignored)
specs/              # Implementation specifications (active and completed)
archive/specs/      # Archived completed specifications
```

## Core Data Flow

1. **Story Creation**: User provides title + character concept + worldbuilding + tone + NPCs + starting situation + spine (with toneKeywords/toneAntiKeywords) + API key
2. **Entity Decomposition**: LLM decomposes raw worldbuilding and NPCs into structured character profiles and world facts, guided by spine's tone keywords
3. **Structure Generation**: LLM generates a StoryStructure using spine + decomposed data (acts, beats, pacing budget, theme, NPC agendas)
4. **Page Planning** (Planner prompt): LLM creates a PagePlan with scene intent, continuity anchors, state intents, writer brief, dramatic question, and choice intents. Continuation planner also receives thread ages, overdue-thread pressure directives, accumulated tracked promises (`accumulatedPromises`, oldest-first opportunities), and payoff quality feedback
5. **Context Curation** (Lorekeeper prompt): LLM curates a scene-focused Story Bible from full story context, filtering worldbuilding, characters, canon, and history to only what's relevant for the upcoming scene
6. **Page Writing** (Writer prompt): LLM generates narrative + typed choices (ChoiceType/PrimaryDelta) + scene summary + protagonist affect + raw state mutations
7. **State Reconciliation**: Engine validates writer's state mutations against active state, assigns keyed IDs, resolves conflicts
8. **Scene Analysis** (Analyst prompt): LLM evaluates beat conclusion, deviation, pacing, structural position, promise lifecycle (detect via `promisesDetected`, resolve by ID via `promisesResolved`, quality via `promisePayoffAssessments`), and thread payoff quality (`threadPayoffAssessments`)
9. **Structure Rewrite** (conditional): If deviation detected, LLM rewrites remaining story structure
10. **Page Assembly**: Engine builds immutable Page from writer output + reconciled state + structure progression + computed thread ages + accumulated tracked promises
11. **Choice Selection**: Either load existing page (if explored) or run pipeline for new page
12. **State Accumulation**: Each page's state = parent's accumulated state + own changes
13. **Canon Management**: Global and character-specific canon facts persist across all branches

## Generation Pipeline Stages

The engine reports progress through these stages (used by the spinner UI):

Story preparation stages (run once on story creation):
- `GENERATING_SPINE` - Spine option generation LLM call (separate pre-creation step)
- `DECOMPOSING_ENTITIES` - Entity decomposition LLM call (characters + world facts)
- `STRUCTURING_STORY` - Story structure generation LLM call (uses spine + decomposed data)

Per-page generation stages:
- `PLANNING_PAGE` - Page planner LLM call
- `CURATING_CONTEXT` - Lorekeeper story bible generation
- `WRITING_OPENING_PAGE` - Opening page writer LLM call
- `WRITING_CONTINUING_PAGE` - Continuation page writer LLM call
- `ANALYZING_SCENE` - Analyst LLM call (beat conclusion, deviation, pacing, foreshadowing, payoff quality)
- `RESOLVING_AGENDAS` - NPC agenda resolver LLM call (when NPCs exist)
- `RESTRUCTURING_STORY` - Structure rewrite LLM call (on deviation)

Progress is tracked in-memory by `GenerationProgressService` and polled via `GET /play/:storyId/progress/:progressId`.

## Key Data Models

### Page
Each page stores: narrative text, scene summary, typed choices, protagonist affect, active state changes, accumulated state snapshots (active state, inventory, health, character state, structure state), structure version ID, thread ages (`threadAges: Record<string, number>`), accumulated tracked promises (`accumulatedPromises: TrackedPromise[]`), and parent linkage.

### ActiveState
Tracks current truths: `currentLocation`, `activeThreats`, `activeConstraints`, `openThreads`. Each entry is a `KeyedEntry` with a server-assigned ID (e.g., `th-1`, `cn-2`). Threads are `ThreadEntry` with `threadType` (MYSTERY, QUEST, RELATIONSHIP, DANGER, INFORMATION, RESOURCE, MORAL) and `urgency` (LOW, MEDIUM, HIGH).

### TrackedPromise & Payoff Assessments
`TrackedPromise` represents a server-owned narrative promise with lifecycle state: `id`, `description`, `promiseType` (CHEKHOV_GUN, FORESHADOWING, DRAMATIC_IRONY, UNRESOLVED_EMOTION, SETUP_PAYOFF), `suggestedUrgency` (LOW, MEDIUM, HIGH), `age` (pages since detection). `ThreadPayoffAssessment` evaluates resolved thread quality: `threadId`, `threadText`, `satisfactionLevel` (RUSHED, ADEQUATE, WELL_EARNED), `reasoning`. `PromisePayoffAssessment` evaluates resolved promise quality with the same satisfaction rubric. Promises are explicitly resolved by analyst-provided IDs (no heuristic conversion and no hard cap).

### Choice
Each choice has `text`, `choiceType` (9 types: TACTICAL_APPROACH, MORAL_DILEMMA, etc.), `primaryDelta` (10 types: LOCATION_CHANGE, GOAL_SHIFT, etc.), and `nextPageId`.

### ProtagonistAffect
Per-page emotional snapshot (not accumulated): `primaryEmotion`, `primaryIntensity` (mild/moderate/strong/overwhelming), `primaryCause`, `secondaryEmotions`, `dominantMotivation`.

### StoryStructure
Multi-act story arc with beats. Each act has an objective, stakes, entry condition, and beats. Each beat has a name, description, objective, and role (setup/escalation/turning_point/resolution). `AccumulatedStructureState` tracks progression through acts/beats with `BeatProgression` records.

### Story
Metadata plus mutable fields: `globalCanon`, `globalCharacterCanon`, `structure`, `structureVersions`. Supports NPCs and starting situation.

## Prompt Logging

- Prompt payload logging is file-based only.
- `logPrompt(...)` appends JSONL entries to `logs/MM-DD-YYYY/prompts.jsonl`.
- Prompt payloads are not emitted to server terminal output.
- Prompt payloads are not injected into browser console output.
- Prompt logging failures are non-fatal to generation flow.

## Play Page Contract

- `GET /play/:storyId?page=:n` renders `pages/play` with `openThreadPanelRows` already sorted for display.
- Open thread panel rows expose `id`, `text`, `threadType`, `urgency`, and `displayLabel`.
- `POST /play/:storyId/choice` JSON includes `page.openThreads` with `id`, `text`, `threadType`, `urgency`, and `displayLabel`.
- `POST /play/:storyId/choice` accepts optional `suggestedProtagonistSpeech` field for player-suggested dialogue.
- Client-side play updates (`public/js/app.js`) must re-render the open-threads panel from AJAX response data after each successful choice without full page reload.

## Client-Side JavaScript (CRITICAL)

**`public/js/app.js` is a generated file. NEVER edit it directly.**

The client JS is split into numbered source files in `public/js/src/`:

```
public/js/
├── app.js              ← GENERATED by concat script. Do not edit.
└── src/
    ├── 01-constants.js       # Config, STAGE_PHRASE_POOLS, STAGE_DISPLAY_NAMES, enums
    ├── 02-utils.js           # Shared utility functions
    ├── 03-loading-progress.js # Spinner and progress polling
    ├── 04-thread-renderers.js # Open threads panel rendering
    ├── 05-choice-renderers.js # Choice button rendering
    ├── 06-state-renderers.js  # State panel rendering
    ├── 07-error-display.js    # Error display logic
    ├── 08-npc-manager.js      # NPC management UI
    └── 09-controllers.js      # Page controllers and initialization
```

**Workflow**: Edit files in `public/js/src/`, then regenerate `app.js`:

```bash
node scripts/concat-client-js.js
```

The script concatenates all `src/*.js` files in alphabetical order (hence the numeric prefixes) into a single IIFE in `app.js`. Client tests (`npm run test:client`) run against the generated `app.js`.

## Storage Structure

```
stories/
└── {storyId}/
    ├── story.json      # Metadata, global canon, story structure, structure versions
    ├── page_1.json     # First page (full state snapshot)
    ├── page_2.json     # Subsequent pages...
    └── page_N.json
```

Page JSON includes serialized active state, inventory, health, character state, structure state, protagonist affect, and typed choices. Complex types use converters in `persistence/converters/`.

## Key Invariants

- **Page Immutability**: Generated content never changes
- **Deterministic Replay**: Same choice -> same content
- **Acyclic Graph**: No page links create cycles
- **Branch Isolation**: State changes don't leak across branches
- **Ending Consistency**: `isEnding === true` <=> `choices.length === 0`
- **Choice Minimum**: Non-ending pages have 2-5 choices
- **API Key Security**: Never persisted to disk, only in browser session storage
- **Keyed State IDs**: Server-assigned sequential IDs (e.g., `inv-1`, `hp-2`, `th-3`) - LLM never invents IDs
- **Structure Versioning**: Structure rewrites create new versions; pages reference their version via `structureVersionId`

## Implementation Status

Core specs (01-06) plus extensive post-core development:

| Spec | Description | Status |
|------|-------------|--------|
| 01-project-foundation | TypeScript/Jest setup | Done |
| 02-data-models | Story, Page, Choice types | Done |
| 03-persistence-layer | File storage with locking | Done |
| 04-llm-integration | OpenRouter client and prompts | Done |
| 05-story-engine | Core orchestration logic | Done |
| 06-user-interface | Express server and EJS views | Done |
| 07-writer-analyst-split | Separate writer and analyst LLM roles | Done |
| 08-writing-prompts-split-architecture | Multi-prompt system architecture | Done |
| 09-page-planner-spec | Page planning LLM step | Done |
| 10-page-writer-spec | Dedicated page writer prompt | Done |
| 11-deterministic-state-reconciler | State reconciliation pipeline | Done |
| 12-thread-contract-and-dedup | Thread types, urgency, deduplication | Done |
| 13-failure-handling-and-observability | Error handling and pipeline metrics | Done |
| 14-prompt-file-logging | JSONL prompt logging system | Done |
| active-state-architecture | ActiveState model (location, threats, constraints, threads) | Done |
| structured-story-arc-system | StoryStructure with acts/beats/pacing | Done |
| structure-rewriting-system | Deviation-triggered structure rewrites | Done |
| keyed-state-entries | Server-assigned IDs for state entries | Done |
| open-threads-floating-panel | Open threads UI panel | Done |
| beat-name-structure-and-play-display | Beat names in UI display | Done |
| prompt-system-improvements | Prompt quality improvements | Done |
| spinner-stage-progress | Generation progress spinner stages | Done |
| suggested-protagonist-speech | Player-suggested dialogue input | Done |
| beat-conclusion-scene-signal-gating | Beat conclusion gating via analyst signals | Done |
| planner-choice-intents-and-dramatic-question | Planner choice intents and dramatic question | Done |

Completed specs are archived in `archive/specs/`.

## LLM Integration Notes

- Uses OpenRouter API exclusively via `src/llm/client.ts`
- Default model: `anthropic/claude-sonnet-4.5`
- **Story preparation** (run once at story creation, 3 LLM calls):
  1. **Spine prompt** (`spine-generator.ts`): Generates spine options with tone keywords (separate pre-creation step)
  2. **Entity decomposition prompt** (`entity-decomposer.ts`): Decomposes raw worldbuilding/NPCs into structured profiles and world facts
  3. **Structure prompt** (`structure-generator.ts`): Generates story arc using spine + decomposed data
- **Per-page generation** (up to 6 stages: 4 LLM calls + 2 engine-side):
  1. **Planner prompt** (`planner-generation.ts`): Creates page plan with scene intent, state intents, dramatic question, and choice intents
  2. **Lorekeeper prompt** (`lorekeeper-generation.ts`): Curates a scene-focused Story Bible from full context
  3. **Writer prompt** (`writer-generation.ts`): Generates narrative, choices, state mutations
  4. **Reconciler** (engine-side, not LLM): Validates/fixes writer state output
  5. **Analyst prompt** (`analyst-generation.ts`): Evaluates beat conclusion, deviation, pacing
  6. **Agenda resolver prompt** (`agenda-resolver-generation.ts`): Updates NPC agendas based on scene events
- **Conditional**: **Structure rewrite prompt** (`structure-generator.ts`): Rewrites structure on deviation
- All prompts use JSON Schema structured output via OpenRouter's `response_format`
- Response transformers in `schemas/` convert raw LLM JSON to typed results
- Validation pipeline in `validation/` repairs malformed writer output (e.g., ID prefix repair)
- Few-shot examples available via `few-shot-builder.ts` and `few-shot-data.ts`
- Retry with exponential backoff on transient failures (429, 5xx)
- Content policy sections injected via `content-policy.ts`
- System prompts assembled by `system-prompt-builder.ts` with shared sections

## Content Policy

All prompts include NC-21 mature content guidelines permitting explicit content, violence, and controversial themes without self-censorship, as this is an adults-only application.

## Skill Invocation (MANDATORY)

When a slash command (e.g., `/superpowers:execute-plan`) expands to an instruction like "Invoke the superpowers:executing-plans skill", you MUST call the `Skill` tool with the referenced skill name BEFORE taking any other action. The `<command-name>` tag means the *command wrapper* was loaded, NOT the skill itself. The skill content is only available after you call the Skill tool.

Do NOT skip the Skill tool invocation. Do NOT interpret the command body as the skill content. Do NOT start implementation before the skill is loaded and its methodology followed.

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
   - `**Status**: COMPLETED` - Fully implemented
   - `**Status**: REJECTED` - Decided not to implement
   - `**Status**: DEFERRED` - Postponed for later
   - `**Status**: NOT IMPLEMENTED` - Started but abandoned

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

When LLM interfaces change, all test mocks must include every required field. The generation pipeline now produces `FinalPageGenerationResult = PageWriterResult & StateReconciliationResult`. Key mock shapes:

```typescript
// PageWriterResult fields (from writer generation)
{
  narrative: '...',
  choices: [{ text: '...', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: PrimaryDelta.GOAL_SHIFT }],
  sceneSummary: '...',
  protagonistAffect: {
    primaryEmotion: '...',
    primaryIntensity: 'moderate',
    primaryCause: '...',
    secondaryEmotions: [],
    dominantMotivation: '...',
  },
  isEnding: false,
  rawResponse: '...',
}

// StateReconciliationResult fields (from state reconciler)
{
  currentLocation: '...',
  threatsAdded: [],
  threatsRemoved: [],
  constraintsAdded: [],
  constraintsRemoved: [],
  threadsAdded: [],       // Array of { text, threadType, urgency }
  threadsResolved: [],
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  characterStateChangesAdded: [],   // Array of { characterName, states }
  characterStateChangesRemoved: [],
  newCanonFacts: [],
  newCharacterCanonFacts: {},
  reconciliationDiagnostics: [],
}
```

### Interface Changes and Mock Updates

When modifying interfaces like `PageWriterResult`, `StateReconciliationResult`, or `AnalystResult`, search all test files for mocks that need the new fields. Missing required fields cause runtime errors like `TypeError: Cannot convert undefined or null to object`.
