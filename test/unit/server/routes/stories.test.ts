import type { Request, Response } from 'express';
import { storyEngine } from '@/engine';
import { LLMError } from '@/llm/types';
import { createChoice, createPage, createStory, parseStoryId } from '@/models';
import { storyRoutes } from '@/server/routes/stories';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getRouteHandler(
  method: 'get' | 'post',
  path: string,
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (storyRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on storyRoutes`);
  }

  return handler;
}

describe('storyRoutes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /new', () => {
    it('returns 200 and renders pages/new-story with default values', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      await getRouteHandler('get', '/new')({} as Request, { status, render } as unknown as Response);

      expect(status).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: null,
        values: {},
      });
    });
  });

  describe('POST /create validation', () => {
    it('returns 400 for empty character concept', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create')(
        {
          body: { title: 'Test Title', characterConcept: '', worldbuilding: 'World', tone: 'Epic', apiKey: 'valid-key-12345' },
        } as Request,
        { status, render } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'Character concept must be at least 10 characters',
        values: { title: 'Test Title', characterConcept: '', worldbuilding: 'World', tone: 'Epic', npcs: [], startingSituation: undefined },
      });
    });

    it('returns 400 for short character concept after trim', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: '   too short   ',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'Character concept must be at least 10 characters',
        values: { title: 'Test Title', characterConcept: '   too short   ', worldbuilding: 'World', tone: 'Epic', npcs: [], startingSituation: undefined },
      });
    });

    it('returns 400 for missing API key', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create')(
        {
          body: { title: 'Test Title', characterConcept: 'A long enough character concept', worldbuilding: 'World', tone: 'Epic' },
        } as Request,
        { status, render } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'OpenRouter API key is required',
        values: { title: 'Test Title', characterConcept: 'A long enough character concept', worldbuilding: 'World', tone: 'Epic', npcs: [], startingSituation: undefined },
      });
    });

    it('returns 400 for short API key after trim and preserves non-secret values only', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: '    short    ',
          },
        } as Request,
        { status, render } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'OpenRouter API key is required',
        values: { title: 'Test Title', characterConcept: 'A long enough character concept', worldbuilding: 'World', tone: 'Epic', npcs: [], startingSituation: undefined },
      });

      const renderCalls = render.mock.calls as unknown[][];
      const firstRenderPayload = renderCalls[0]?.[1] as { values?: Record<string, unknown> } | undefined;
      expect(firstRenderPayload?.values).toBeDefined();
      expect(firstRenderPayload?.values?.apiKey).toBeUndefined();
    });
  });

  describe('POST /create success', () => {
    it('calls startStory with trimmed values and redirects to first play page', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');
      const story = createStory({
        title: 'Trimmed Title',
        characterConcept: 'Trimmed Concept',
        worldbuilding: 'Trimmed World',
        tone: 'Trimmed Tone',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'Page text',
        choices: [createChoice('Go left'), createChoice('Go right')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const startStorySpy = jest.spyOn(storyEngine, 'startStory').mockResolvedValue({
        story: { ...story, id: storyId },
        page,
      });

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: '  Trimmed Title  ',
            characterConcept: '  Trimmed Concept  ',
            worldbuilding: '  Trimmed World  ',
            tone: '  Trimmed Tone  ',
            apiKey: '  valid-key-12345  ',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).not.toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
      expect(startStorySpy).toHaveBeenCalledWith({
        title: 'Trimmed Title',
        characterConcept: 'Trimmed Concept',
        worldbuilding: 'Trimmed World',
        tone: 'Trimmed Tone',
        apiKey: 'valid-key-12345',
      });
      expect(redirect).toHaveBeenCalledWith('/play/550e8400-e29b-41d4-a716-446655440000?page=1&newStory=true');
    });
  });

  describe('POST /create error', () => {
    it('returns 500 and re-renders form with error message from Error instance', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(new Error('generation failed'));

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(redirect).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(500);
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'generation failed',
        values: {
          title: 'Test Title',
          characterConcept: 'A long enough character concept',
          worldbuilding: 'World',
          tone: 'Epic',
          npcs: [],
          startingSituation: undefined,
        },
      });
    });

    it('displays user-friendly message for HTTP 401 LLMError', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const llmError = new LLMError('Invalid API key provided', 'HTTP_401', false, {
        httpStatus: 401,
        model: 'anthropic/claude-sonnet-4.5',
        rawErrorBody: '{"error":{"message":"Invalid API key"}}',
      });
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'invalid-key',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'Invalid API key. Please check your OpenRouter API key.',
        values: {
          title: 'Test Title',
          characterConcept: 'A long enough character concept',
          worldbuilding: 'World',
          tone: 'Epic',
          npcs: [],
          startingSituation: undefined,
        },
      });
    });

    it('displays user-friendly message for HTTP 402 LLMError', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const llmError = new LLMError('Payment required', 'HTTP_402', false, {
        httpStatus: 402,
        model: 'anthropic/claude-sonnet-4.5',
      });
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'Insufficient credits. Please add credits to your OpenRouter account.',
        values: {
          title: 'Test Title',
          characterConcept: 'A long enough character concept',
          worldbuilding: 'World',
          tone: 'Epic',
          npcs: [],
          startingSituation: undefined,
        },
      });
    });

    it('displays user-friendly message for HTTP 429 LLMError', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const llmError = new LLMError('Rate limit exceeded', 'HTTP_429', true, {
        httpStatus: 429,
        model: 'anthropic/claude-sonnet-4.5',
      });
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'Rate limit exceeded. Please wait a moment and try again.',
        values: {
          title: 'Test Title',
          characterConcept: 'A long enough character concept',
          worldbuilding: 'World',
          tone: 'Epic',
          npcs: [],
          startingSituation: undefined,
        },
      });
    });

    it('displays API error details for HTTP 400 LLMError', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const llmError = new LLMError('Invalid request: missing required field', 'HTTP_400', false, {
        httpStatus: 400,
        model: 'anthropic/claude-sonnet-4.5',
        rawErrorBody: '{"error":{"message":"Invalid request: missing required field"}}',
      });
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'API request error: Invalid request: missing required field',
        values: {
          title: 'Test Title',
          characterConcept: 'A long enough character concept',
          worldbuilding: 'World',
          tone: 'Epic',
          npcs: [],
          startingSituation: undefined,
        },
      });
    });

    it('displays user-friendly message for HTTP 400 schema validation errors (additionalProperties)', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const llmError = new LLMError(
        "output_format.schema: For 'object' type, 'additionalProperties: object' is not supported",
        'HTTP_400',
        false,
        { httpStatus: 400, model: 'anthropic/claude-sonnet-4.5' },
      );
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'Story generation failed due to a configuration error. Please try again or report this issue.',
        values: {
          title: 'Test Title',
          characterConcept: 'A long enough character concept',
          worldbuilding: 'World',
          tone: 'Epic',
          npcs: [],
          startingSituation: undefined,
        },
      });
    });

    it('displays user-friendly message for HTTP 400 schema validation errors (output_format)', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const llmError = new LLMError(
        'output_format.json_schema: Invalid schema definition',
        'HTTP_400',
        false,
        { httpStatus: 400, model: 'anthropic/claude-sonnet-4.5' },
      );
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'Story generation failed due to a configuration error. Please try again or report this issue.',
        values: {
          title: 'Test Title',
          characterConcept: 'A long enough character concept',
          worldbuilding: 'World',
          tone: 'Epic',
          npcs: [],
          startingSituation: undefined,
        },
      });
    });

    it('displays user-friendly message for HTTP 5xx LLMError', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const llmError = new LLMError('Internal server error', 'HTTP_503', true, {
        httpStatus: 503,
        model: 'anthropic/claude-sonnet-4.5',
      });
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'OpenRouter service is temporarily unavailable. Please try again later.',
        values: {
          title: 'Test Title',
          characterConcept: 'A long enough character concept',
          worldbuilding: 'World',
          tone: 'Epic',
          npcs: [],
          startingSituation: undefined,
        },
      });
    });

    it('displays formatted message for LLMError without httpStatus context', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const llmError = new LLMError('Some parsing error', 'PARSE_ERROR', false);
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(render).toHaveBeenCalledWith('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: 'API error: Some parsing error',
        values: {
          title: 'Test Title',
          characterConcept: 'A long enough character concept',
          worldbuilding: 'World',
          tone: 'Epic',
          npcs: [],
          startingSituation: undefined,
        },
      });
    });
  });

  describe('POST /create-ajax validation', () => {
    it('returns 400 JSON for missing title', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        success: false,
        error: 'Story title is required',
      });
    });

    it('returns 400 JSON for empty title', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: '   ',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        success: false,
        error: 'Story title is required',
      });
    });

    it('returns 400 JSON for empty character concept', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create-ajax')(
        {
          body: { title: 'Test Title', characterConcept: '', worldbuilding: 'World', tone: 'Epic', apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        success: false,
        error: 'Character concept must be at least 10 characters',
      });
    });

    it('returns 400 JSON for short character concept after trim', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: 'Test Title',
            characterConcept: '   too short   ',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        success: false,
        error: 'Character concept must be at least 10 characters',
      });
    });

    it('returns 400 JSON for missing API key', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create-ajax')(
        {
          body: { title: 'Test Title', characterConcept: 'A long enough character concept', worldbuilding: 'World', tone: 'Epic' },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        success: false,
        error: 'OpenRouter API key is required',
      });
    });

    it('returns 400 JSON for short API key after trim', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const startStorySpy = jest.spyOn(storyEngine, 'startStory');

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: '    short    ',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(400);
      expect(startStorySpy).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        success: false,
        error: 'OpenRouter API key is required',
      });
    });
  });

  describe('POST /create-ajax success', () => {
    it('calls startStory with trimmed values and returns JSON with storyId', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');
      const story = createStory({
        title: 'Trimmed Title',
        characterConcept: 'Trimmed Concept',
        worldbuilding: 'Trimmed World',
        tone: 'Trimmed Tone',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'Page text',
        choices: [createChoice('Go left'), createChoice('Go right')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const startStorySpy = jest.spyOn(storyEngine, 'startStory').mockResolvedValue({
        story: { ...story, id: storyId },
        page,
      });

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: '  Trimmed Title  ',
            characterConcept: '  Trimmed Concept  ',
            worldbuilding: '  Trimmed World  ',
            tone: '  Trimmed Tone  ',
            apiKey: '  valid-key-12345  ',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).not.toHaveBeenCalled();
      expect(startStorySpy).toHaveBeenCalledWith({
        title: 'Trimmed Title',
        characterConcept: 'Trimmed Concept',
        worldbuilding: 'Trimmed World',
        tone: 'Trimmed Tone',
        apiKey: 'valid-key-12345',
      });
      expect(json).toHaveBeenCalledWith({
        success: true,
        storyId: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('passes npcs and startingSituation through to startStory when provided', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');
      const story = createStory({
        title: 'Test Title',
        characterConcept: 'Test Concept Here',
        worldbuilding: 'World',
        tone: 'Epic',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'Page text',
        choices: [createChoice('Go left'), createChoice('Go right')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const startStorySpy = jest.spyOn(storyEngine, 'startStory').mockResolvedValue({
        story: { ...story, id: storyId },
        page,
      });

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'Test Concept Here',
            worldbuilding: 'World',
            tone: 'Epic',
            npcs: [{ name: '  Gandalf the Grey  ', description: '  wise wizard  ' }],
            startingSituation: '  You awaken in a dark cave  ',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(startStorySpy).toHaveBeenCalledWith({
        title: 'Test Title',
        characterConcept: 'Test Concept Here',
        worldbuilding: 'World',
        tone: 'Epic',
        npcs: [{ name: 'Gandalf the Grey', description: 'wise wizard' }],
        startingSituation: 'You awaken in a dark cave',
        apiKey: 'valid-key-12345',
      });
      expect(json).toHaveBeenCalledWith({
        success: true,
        storyId: '550e8400-e29b-41d4-a716-446655440000',
      });
    });
  });

  describe('POST /create-ajax error', () => {
    it('returns 500 JSON with error message from Error instance', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(new Error('generation failed'));

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        success: false,
        error: 'generation failed',
      });
    });

    it('returns 500 JSON with user-friendly message for HTTP 401 LLMError', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const llmError = new LLMError('Invalid API key provided', 'HTTP_401', false, {
        httpStatus: 401,
        model: 'anthropic/claude-sonnet-4.5',
        rawErrorBody: '{"error":{"message":"Invalid API key"}}',
      });
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'invalid-key',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid API key. Please check your OpenRouter API key.',
          code: 'HTTP_401',
          retryable: false,
        }),
      );
    });

    it('returns 500 JSON with user-friendly message for HTTP 402 LLMError', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const llmError = new LLMError('Payment required', 'HTTP_402', false, {
        httpStatus: 402,
        model: 'anthropic/claude-sonnet-4.5',
      });
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Insufficient credits. Please add credits to your OpenRouter account.',
          code: 'HTTP_402',
          retryable: false,
        }),
      );
    });

    it('returns 500 JSON with user-friendly message for HTTP 429 LLMError', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const llmError = new LLMError('Rate limit exceeded', 'HTTP_429', true, {
        httpStatus: 429,
        model: 'anthropic/claude-sonnet-4.5',
      });
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Rate limit exceeded. Please wait a moment and try again.',
          code: 'HTTP_429',
          retryable: true,
        }),
      );
    });

    it('returns 500 JSON with user-friendly message for HTTP 5xx LLMError', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const llmError = new LLMError('Internal server error', 'HTTP_503', true, {
        httpStatus: 503,
        model: 'anthropic/claude-sonnet-4.5',
      });
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'OpenRouter service is temporarily unavailable. Please try again later.',
          code: 'HTTP_503',
          retryable: true,
        }),
      );
    });

    it('returns 500 JSON with formatted message for LLMError without httpStatus context', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();
      const llmError = new LLMError('Some parsing error', 'PARSE_ERROR', false);
      jest.spyOn(storyEngine, 'startStory').mockRejectedValue(llmError);

      await getRouteHandler('post', '/create-ajax')(
        {
          body: {
            title: 'Test Title',
            characterConcept: 'A long enough character concept',
            worldbuilding: 'World',
            tone: 'Epic',
            apiKey: 'valid-key-12345',
          },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'API error: Some parsing error',
          code: 'PARSE_ERROR',
          retryable: false,
        }),
      );
    });
  });

  describe('POST /:storyId/delete', () => {
    it('calls deleteStory and redirects to / on success', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const deleteStorySpy = jest.spyOn(storyEngine, 'deleteStory').mockResolvedValue(undefined);

      await getRouteHandler('post', '/:storyId/delete')(
        { params: { storyId: '550e8400-e29b-41d4-a716-446655440000' } } as unknown as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).not.toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
      expect(deleteStorySpy).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(redirect).toHaveBeenCalledWith('/');
    });

    it('redirects to / when deleteStory throws', async () => {
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();
      const deleteStorySpy = jest.spyOn(storyEngine, 'deleteStory').mockRejectedValue(new Error('boom'));

      await getRouteHandler('post', '/:storyId/delete')(
        { params: { storyId: '550e8400-e29b-41d4-a716-446655440000' } } as unknown as Request,
        { status, render, redirect } as unknown as Response,
      );

      expect(status).not.toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
      expect(deleteStorySpy).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      expect(redirect).toHaveBeenCalledWith('/');
    });
  });
});
