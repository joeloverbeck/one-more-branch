import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';
import { LLMError } from '../../llm/types';
import { StoryId } from '../../models';

function formatLLMError(error: LLMError): string {
  const httpStatus = error.context?.['httpStatus'] as number | undefined;

  if (httpStatus === 401) {
    return 'Invalid API key. Please check your OpenRouter API key.';
  }
  if (httpStatus === 402) {
    return 'Insufficient credits. Please add credits to your OpenRouter account.';
  }
  if (httpStatus === 429) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  }
  if (httpStatus === 400) {
    // Check for schema validation errors that indicate internal configuration issues
    if (
      error.message.includes('additionalProperties') ||
      error.message.includes('schema') ||
      error.message.includes('output_format')
    ) {
      return 'Story generation failed due to a configuration error. Please try again or report this issue.';
    }
    return `API request error: ${error.message}`;
  }
  if (httpStatus && httpStatus >= 500) {
    return 'OpenRouter service is temporarily unavailable. Please try again later.';
  }
  return error.message;
}

type StoryFormBody = {
  characterConcept?: string;
  worldbuilding?: string;
  tone?: string;
  apiKey?: string;
};

export const storyRoutes = Router();

function wrapAsyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    void handler(req, res);
  };
}

storyRoutes.get('/new', (_req: Request, res: Response) => {
  res.render('pages/new-story', {
    title: 'New Adventure - One More Branch',
    error: null,
    values: {},
  });
});

storyRoutes.post('/create', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { characterConcept, worldbuilding, tone, apiKey } = req.body as StoryFormBody;
  const trimmedCharacterConcept = characterConcept?.trim();
  const trimmedWorldbuilding = worldbuilding?.trim();
  const trimmedTone = tone?.trim();
  const trimmedApiKey = apiKey?.trim();

  if (!trimmedCharacterConcept || trimmedCharacterConcept.length < 10) {
    return res.status(400).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: 'Character concept must be at least 10 characters',
      values: { characterConcept, worldbuilding, tone },
    });
  }

  if (!trimmedApiKey || trimmedApiKey.length < 10) {
    return res.status(400).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: 'OpenRouter API key is required',
      values: { characterConcept, worldbuilding, tone },
    });
  }

  try {
    const result = await storyEngine.startStory({
      characterConcept: trimmedCharacterConcept,
      worldbuilding: trimmedWorldbuilding,
      tone: trimmedTone,
      apiKey: trimmedApiKey,
    });

    return res.redirect(`/play/${result.story.id}?page=1&newStory=true`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating story:', error);

    let errorMessage = 'Failed to create story';
    if (error instanceof LLMError) {
      errorMessage = formatLLMError(error);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: errorMessage,
      values: { characterConcept, worldbuilding, tone },
    });
  }
}));

storyRoutes.post('/:storyId/delete', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { storyId } = req.params;

  try {
    await storyEngine.deleteStory(storyId as StoryId);
    return res.redirect('/');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error deleting story:', error);
    return res.redirect('/');
  }
}));
