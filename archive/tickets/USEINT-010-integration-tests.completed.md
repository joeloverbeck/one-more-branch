# USEINT-010: Integration Tests (Mocked LLM)

## Status

Completed (2026-02-06)

## Summary

Add server integration coverage for route-driven play flow using real route handlers + engine/persistence with mocked LLM generation. No tests may call OpenRouter.

## Reassessed Assumptions (2026-02-06)

- Route unit coverage is already implemented in split files:
  - `test/unit/server/routes/home.test.ts`
  - `test/unit/server/routes/stories.test.ts`
  - `test/unit/server/routes/play.test.ts`
- `test/unit/server/routes.test.ts` does not exist and would duplicate existing route tests.
- Server integration coverage for route-driven play flow is currently missing (`test/integration/server/` does not exist yet).
- Existing integration style in this repository mocks `@/llm` exports (deterministic) rather than mocking `global.fetch` directly.
- In this execution environment, opening test sockets is restricted, so HTTP socket-based `supertest` flows are not viable.
- Existing server/public APIs already satisfy route behavior; this ticket should be test-focused unless a concrete failing scenario requires a minimal source fix.

## Files to Create

- `test/integration/server/play-flow.test.ts` - Integration tests covering server play flow with mocked LLM

## Files to Modify

- `tickets/USEINT-010-integration-tests.md` - Correct assumptions and scope

## Out of Scope

- **DO NOT** add duplicate combined route unit tests when split route unit tests already exist
- **DO NOT** create E2E tests with Playwright/Puppeteer
- **DO NOT** make actual OpenRouter API calls
- **DO NOT** add tests that require real LLM generation

## Implementation Details

### `test/integration/server/play-flow.test.ts`

Integration tests with mocked LLM generation exports and direct route handler invocation:

```typescript
import { storyEngine } from '@/engine';
import { StoryId } from '@/models';
import { generateContinuationPage, generateOpeningPage } from '@/llm';
import { storyRoutes } from '@/server/routes/stories';
import { playRoutes } from '@/server/routes/play';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generateContinuationPage: jest.fn(),
}));

describe('Play Flow Integration (Mocked LLM)', () => {
  const createdStoryIds = new Set<StoryId>();
  const createStoryHandler = getRouteHandler(storyRoutes, 'post', '/create');
  const chooseHandler = getRouteHandler(playRoutes, 'post', '/:storyId/choice');

  beforeEach(() => {
    jest.clearAllMocks();
    storyEngine.init();
  });

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      try {
        await storyEngine.deleteStory(storyId);
      } catch {}
    }

    createdStoryIds.clear();
  });

  it('should create story with mocked LLM response', async () => {
    (generateOpeningPage as jest.Mock).mockResolvedValueOnce({
      narrative: 'You find yourself in a dark forest...',
      choices: ['Enter the cave', 'Follow the path', 'Climb a tree'],
      stateChanges: ['Entered the forest'],
      canonFacts: ['The forest is ancient'],
      isEnding: false,
      storyArc: 'Find your way out',
      rawResponse: 'opening',
    });

    const response = createMockResponse();
    await createStoryHandler(
      {
        body: {
          characterConcept: 'A brave adventurer exploring the wilderness',
          tone: 'fantasy',
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      response.res,
    );

    const redirectLocation = response.redirect.mock.calls[0]?.[0] as string;
    expect(redirectLocation).toMatch(/\/play\/[a-f0-9-]+/);
    createdStoryIds.add(parseStoryIdFromRedirect(redirectLocation));
  });

  it('should make choice with mocked LLM response', async () => {
    (generateOpeningPage as jest.Mock).mockResolvedValueOnce({
      narrative: 'Initial narrative...',
      choices: ['Choice A', 'Choice B'],
      stateChanges: [],
      canonFacts: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'opening',
    });

    const createResponse = createMockResponse();
    await createStoryHandler(
      {
        body: {
          characterConcept: 'Test character for choice making',
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      createResponse.res,
    );

    const storyId = parseStoryIdFromRedirect(createResponse.redirect.mock.calls[0]?.[0]);
    createdStoryIds.add(storyId);

    (generateContinuationPage as jest.Mock).mockResolvedValueOnce({
      narrative: 'You chose wisely...',
      choices: ['Continue'],
      stateChanges: ['Made a choice'],
      canonFacts: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'continuation',
    });

    const choiceResponse = createMockResponse();
    await chooseHandler(
      {
        params: { storyId },
        body: {
          pageId: 1,
          choiceIndex: 0,
          apiKey: 'mock-api-key-12345',
        },
      } as unknown as Request,
      choiceResponse.res,
    );

    expect(choiceResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        wasGenerated: true,
        page: expect.objectContaining({ id: 2 }),
      })
    );
  });

  it('should return existing page without LLM call', async () => {
    (generateOpeningPage as jest.Mock).mockResolvedValueOnce({
      narrative: 'Start...',
      choices: ['Go'],
      stateChanges: [],
      canonFacts: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'opening',
    });

    const createResponse = createMockResponse();
    await createStoryHandler(
      {
        body: {
          characterConcept: 'Test character for replay',
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      createResponse.res,
    );

    const storyId = parseStoryIdFromRedirect(createResponse.redirect.mock.calls[0]?.[0]);
    createdStoryIds.add(storyId);

    (generateContinuationPage as jest.Mock).mockResolvedValueOnce({
      narrative: 'Page 2 content...',
      choices: ['Next'],
      stateChanges: [],
      canonFacts: [],
      isEnding: false,
      storyArc: 'Arc',
      rawResponse: 'continuation',
    });

    const firstChoiceResponse = createMockResponse();
    await chooseHandler(
      {
        params: { storyId },
        body: {
          pageId: 1,
          choiceIndex: 0,
          apiKey: 'mock-api-key-12345',
        },
      } as unknown as Request,
      firstChoiceResponse.res,
    );

    // Replay same choice - should NOT call continuation generator
    const replayResponse = createMockResponse();
    await chooseHandler(
      {
        params: { storyId },
        body: {
          pageId: 1,
          choiceIndex: 0,
          apiKey: 'mock-api-key-12345',
        },
      } as unknown as Request,
      replayResponse.res,
    );

    expect(replayResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        wasGenerated: false,
      })
    );
    expect(generateContinuationPage).toHaveBeenCalledTimes(1);
  });
});
```

## Acceptance Criteria

### Tests That Must Pass

All relevant server route/unit and integration tests must pass:

```bash
npm run test:unit -- --testPathPattern=test/unit/server/routes
npm run test:integration -- --testPathPattern=test/integration/server/play-flow.test.ts
```

### Specific Test Coverage

**Route Unit Tests (existing split files):**
1. Home page render and error handling
2. New story form render
3. Story creation validation + success + error
4. Play page happy path + 404s + page parsing behavior
5. Choice endpoint validation + success + error
6. Restart and delete behavior

**Integration Tests (play-flow.test.ts):**
1. Full story creation flow with mocked LLM
2. Choice making with mocked LLM
3. Replay returns cached page without LLM call
4. LLM mocks are reset between tests

### Verification Commands

```bash
npm run test:unit -- --testPathPattern=server
npm run test:integration -- --testPathPattern=server
npm run test:coverage -- --testPathPattern=server
```

## Invariants That Must Remain True

1. **No Real API Calls**: All tests mock LLM responses
2. **Isolated Tests**: Each test cleans up its own data
3. **Deterministic**: Tests produce same results on every run
4. **Fast Execution**: No network delays (mocked LLM generation)
5. **Coverage Direction**: Server route behavior is covered by unit + integration suites

## Dependencies

- Depends on USEINT-001 through USEINT-009 for complete implementation
- Uses Jest route-handler invocation plus existing engine/persistence modules

## Estimated Size

~300 LOC (tests only)

## Outcome

Originally planned:
- Add a new combined route unit test file and a socket-driven `supertest` integration flow.

Actually changed:
- Kept existing split route unit tests (`home/stories/play`) and did not add a duplicate combined route unit suite.
- Added `test/integration/server/play-flow.test.ts` to cover create/choice/replay flows using real route handlers + engine/persistence with deterministic mocked `@/llm` generation.
- Preserved all public APIs and made no `src/` source changes.
- Verified with:
  - `npm run test:unit -- --testPathPattern=test/unit/server/routes`
  - `npm run test:integration -- --testPathPattern=test/integration/server/play-flow.test.ts`
