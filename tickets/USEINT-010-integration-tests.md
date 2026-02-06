# USEINT-010: Integration Tests (Mocked LLM)

## Summary

Create comprehensive integration tests for the server routes that test the full request/response cycle with mocked story engine and LLM calls. All tests must avoid actual OpenRouter API calls.

## Files to Create

- `test/unit/server/routes.test.ts` - Combined route unit tests
- `test/integration/server/play-flow.test.ts` - Integration tests with mocked LLM

## Files to Modify

None.

## Out of Scope

- **DO NOT** modify any source files
- **DO NOT** create E2E tests with Playwright/Puppeteer
- **DO NOT** make actual OpenRouter API calls
- **DO NOT** create tests that require real LLM generation

## Implementation Details

### `test/unit/server/routes.test.ts`

Combined unit tests for all routes with fully mocked dependencies:

```typescript
import request from 'supertest';
import { createApp } from '../../../src/server/index.js';
import { storyEngine } from '../../../src/engine/index.js';

jest.mock('../../../src/engine/index.js', () => ({
  storyEngine: {
    init: jest.fn(),
    listStories: jest.fn(),
    getStoryStats: jest.fn(),
    loadStory: jest.fn(),
    getPage: jest.fn(),
    startStory: jest.fn(),
    makeChoice: jest.fn(),
    deleteStory: jest.fn(),
  },
}));

describe('Server Routes', () => {
  let app: Express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe('GET /', () => {
    it('should return home page with stories', async () => {
      (storyEngine.listStories as jest.Mock).mockResolvedValue([
        { id: 'story-1', characterConcept: 'Test Hero', createdAt: new Date().toISOString() }
      ]);
      (storyEngine.getStoryStats as jest.Mock).mockResolvedValue({
        pageCount: 5, exploredBranches: 2, totalBranches: 4, hasEnding: false
      });

      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('One More Branch');
    });

    it('should return home page with empty state', async () => {
      (storyEngine.listStories as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('No adventures yet');
    });
  });

  describe('GET /stories/new', () => {
    it('should return new story form', async () => {
      const response = await request(app).get('/stories/new');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Character Concept');
      expect(response.text).toContain('OpenRouter API Key');
    });
  });

  describe('POST /stories/create', () => {
    it('should reject empty character concept', async () => {
      const response = await request(app)
        .post('/stories/create')
        .send({ characterConcept: '', apiKey: 'test-key-12345' });

      expect(response.status).toBe(400);
      expect(response.text).toContain('at least 10 characters');
    });

    it('should reject missing API key', async () => {
      const response = await request(app)
        .post('/stories/create')
        .send({ characterConcept: 'A brave adventurer named Test' });

      expect(response.status).toBe(400);
      expect(response.text).toContain('API key is required');
    });

    it('should create story and redirect', async () => {
      (storyEngine.startStory as jest.Mock).mockResolvedValue({
        story: { id: 'new-story-id' },
        page: { id: 1 }
      });

      const response = await request(app)
        .post('/stories/create')
        .send({
          characterConcept: 'A brave adventurer named Test Hero',
          apiKey: 'test-api-key-12345'
        });

      expect(response.status).toBe(302);
      expect(response.headers['location']).toContain('/play/new-story-id');
    });
  });

  describe('GET /play/:storyId', () => {
    it('should return 404 for non-existent story', async () => {
      (storyEngine.loadStory as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/play/non-existent-id');
      expect(response.status).toBe(404);
    });

    it('should return play page for valid story', async () => {
      (storyEngine.loadStory as jest.Mock).mockResolvedValue({
        id: 'story-1',
        characterConcept: 'Test Hero'
      });
      (storyEngine.getPage as jest.Mock).mockResolvedValue({
        id: 1,
        narrativeText: 'Once upon a time...',
        choices: [{ text: 'Go left' }, { text: 'Go right' }],
        isEnding: false
      });

      const response = await request(app).get('/play/story-1?page=1');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Once upon a time');
    });
  });

  describe('POST /play/:storyId/choice', () => {
    it('should return 400 when pageId missing', async () => {
      const response = await request(app)
        .post('/play/story-1/choice')
        .send({ choiceIndex: 0, apiKey: 'key' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('pageId');
    });

    it('should process choice and return new page', async () => {
      (storyEngine.makeChoice as jest.Mock).mockResolvedValue({
        page: {
          id: 2,
          narrativeText: 'You went left...',
          choices: [{ text: 'Continue' }],
          stateChanges: ['Found a key'],
          isEnding: false
        },
        wasGenerated: true
      });

      const response = await request(app)
        .post('/play/story-1/choice')
        .send({ pageId: 1, choiceIndex: 0, apiKey: 'test-key' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.page.id).toBe(2);
      expect(response.body.wasGenerated).toBe(true);
    });
  });
});
```

### `test/integration/server/play-flow.test.ts`

Integration tests with mocked LLM at the fetch layer:

```typescript
import request from 'supertest';
import { createApp } from '../../../src/server/index.js';
import { storage } from '../../../src/persistence/index.js';
import { StoryId } from '../../../src/models/index.js';

// Mock the fetch function to avoid real API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Play Flow Integration (Mocked LLM)', () => {
  let app: Express.Application;
  let testStoryId: StoryId | null = null;

  beforeAll(() => {
    // Use test storage directory
    process.env['STORIES_DIR'] = 'test_stories_integration';
    storage.init();
  });

  beforeEach(() => {
    app = createApp();
    mockFetch.mockReset();
  });

  afterEach(async () => {
    // Clean up test stories
    if (testStoryId) {
      try {
        await storage.deleteStory(testStoryId);
      } catch {}
      testStoryId = null;
    }
  });

  afterAll(async () => {
    // Clean up test directory
    const fs = await import('fs/promises');
    try {
      await fs.rm('test_stories_integration', { recursive: true });
    } catch {}
  });

  it('should create story with mocked LLM response', async () => {
    // Mock successful LLM response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              narrative_text: 'You find yourself in a dark forest...',
              choices: [
                { text: 'Enter the cave' },
                { text: 'Follow the path' },
                { text: 'Climb a tree' }
              ],
              state_changes: ['Entered the forest'],
              canon_facts: ['The forest is ancient'],
              is_ending: false
            })
          }
        }]
      })
    });

    const response = await request(app)
      .post('/stories/create')
      .send({
        characterConcept: 'A brave adventurer exploring the wilderness',
        tone: 'fantasy',
        apiKey: 'mock-api-key-12345'
      });

    expect(response.status).toBe(302);
    const location = response.headers['location'];
    expect(location).toMatch(/\/play\/[a-f0-9-]+/);

    // Extract story ID for cleanup
    const match = location.match(/\/play\/([a-f0-9-]+)/);
    if (match) {
      testStoryId = match[1] as StoryId;
    }
  });

  it('should make choice with mocked LLM response', async () => {
    // First create a story with mocked response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              narrative_text: 'Initial narrative...',
              choices: [{ text: 'Choice A' }, { text: 'Choice B' }],
              state_changes: [],
              canon_facts: [],
              is_ending: false
            })
          }
        }]
      })
    });

    const createResponse = await request(app)
      .post('/stories/create')
      .send({
        characterConcept: 'Test character for choice making',
        apiKey: 'mock-api-key-12345'
      });

    const storyId = createResponse.headers['location'].match(/\/play\/([a-f0-9-]+)/)?.[1];
    testStoryId = storyId as StoryId;

    // Now make a choice with mocked response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              narrative_text: 'You chose wisely...',
              choices: [{ text: 'Continue' }],
              state_changes: ['Made a choice'],
              canon_facts: [],
              is_ending: false
            })
          }
        }]
      })
    });

    const choiceResponse = await request(app)
      .post(`/play/${storyId}/choice`)
      .send({
        pageId: 1,
        choiceIndex: 0,
        apiKey: 'mock-api-key-12345'
      });

    expect(choiceResponse.status).toBe(200);
    expect(choiceResponse.body.success).toBe(true);
    expect(choiceResponse.body.page.id).toBe(2);
    expect(choiceResponse.body.wasGenerated).toBe(true);
  });

  it('should return existing page without LLM call', async () => {
    // Create story
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              narrative_text: 'Start...',
              choices: [{ text: 'Go' }],
              state_changes: [],
              canon_facts: [],
              is_ending: false
            })
          }
        }]
      })
    });

    const createResponse = await request(app)
      .post('/stories/create')
      .send({
        characterConcept: 'Test character for replay',
        apiKey: 'mock-api-key-12345'
      });

    const storyId = createResponse.headers['location'].match(/\/play\/([a-f0-9-]+)/)?.[1];
    testStoryId = storyId as StoryId;

    // Generate page 2
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              narrative_text: 'Page 2 content...',
              choices: [{ text: 'Next' }],
              state_changes: [],
              canon_facts: [],
              is_ending: false
            })
          }
        }]
      })
    });

    await request(app)
      .post(`/play/${storyId}/choice`)
      .send({ pageId: 1, choiceIndex: 0, apiKey: 'mock-api-key-12345' });

    // Clear mock to verify no new calls
    mockFetch.mockClear();

    // Replay same choice - should NOT call LLM
    const replayResponse = await request(app)
      .post(`/play/${storyId}/choice`)
      .send({ pageId: 1, choiceIndex: 0, apiKey: 'mock-api-key-12345' });

    expect(replayResponse.status).toBe(200);
    expect(replayResponse.body.wasGenerated).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
```

## Acceptance Criteria

### Tests That Must Pass

All tests in both files must pass:

```bash
npm run test:unit -- --testPathPattern=test/unit/server/routes.test.ts
npm run test:integration -- --testPathPattern=test/integration/server/play-flow.test.ts
```

### Specific Test Coverage

**Unit Tests (routes.test.ts):**
1. Home page renders with stories
2. Home page renders empty state
3. New story form renders
4. Story creation validation (character concept, API key)
5. Story creation success redirects
6. Play page 404 for missing story
7. Play page renders for valid story
8. Choice endpoint validation
9. Choice endpoint success

**Integration Tests (play-flow.test.ts):**
1. Full story creation flow with mocked LLM
2. Choice making with mocked LLM
3. Replay returns cached page without LLM call
4. LLM mock is properly reset between tests

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
4. **Fast Execution**: No network delays (mocked fetch)
5. **Full Coverage**: All route handlers have test coverage

## Dependencies

- Depends on USEINT-001 through USEINT-009 for complete implementation
- Requires `supertest` package for HTTP testing

## Estimated Size

~300 LOC (tests only)
