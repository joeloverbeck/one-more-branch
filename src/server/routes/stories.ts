import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';
import { LLMError } from '../../llm/types';
import { logger } from '../../logging/index.js';
import { StoryId } from '../../models';

function formatLLMError(error: LLMError): string {
  const httpStatus = error.context?.['httpStatus'] as number | undefined;
  const parsedError = error.context?.['parsedError'] as { message?: string; code?: string } | undefined;
  const rawErrorBody = error.context?.['rawErrorBody'] as string | undefined;

  // Extract provider-specific error message if available
  const providerMessage = parsedError?.message ?? '';

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
    // Include provider message for 400 errors if available
    if (providerMessage && providerMessage !== error.message) {
      return `API request error: ${providerMessage}`;
    }
    return `API request error: ${error.message}`;
  }
  if (httpStatus === 403) {
    return `Access denied: ${providerMessage || error.message}`;
  }
  if (httpStatus === 404) {
    return `Model not found: ${providerMessage || error.message}`;
  }
  if (httpStatus && httpStatus >= 500) {
    return 'OpenRouter service is temporarily unavailable. Please try again later.';
  }

  // Handle network errors (no httpStatus) - timeouts, DNS failures, etc.
  if (httpStatus === undefined) {
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return 'Request timed out. The AI service may be overloaded. Please try again.';
    }
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return 'Could not connect to AI service. Please check your internet connection.';
    }
    // Include provider message if available for clearer context
    if (providerMessage) {
      return `AI service error: ${providerMessage}`;
    }
  }

  // Final fallback: include raw error body if it's short and informative
  if (rawErrorBody && rawErrorBody.length < 200 && rawErrorBody.length > 0) {
    // Try to extract a meaningful message from the raw body
    try {
      const parsed = JSON.parse(rawErrorBody) as { error?: { message?: string } };
      if (typeof parsed.error?.message === 'string') {
        return `API error: ${parsed.error.message}`;
      }
    } catch {
      // Not JSON, use as-is if it doesn't look like HTML
      if (!rawErrorBody.includes('<html') && !rawErrorBody.includes('<!DOCTYPE')) {
        return `API error: ${rawErrorBody}`;
      }
    }
  }

  // Last resort: use the error message but make it clearer it's from the provider
  if (providerMessage) {
    return `Provider error: ${providerMessage}`;
  }

  return `API error: ${error.message}`;
}

type StoryFormBody = {
  title?: string;
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
  const { title, characterConcept, worldbuilding, tone, apiKey } = req.body as StoryFormBody;
  const trimmedTitle = title?.trim();
  const trimmedCharacterConcept = characterConcept?.trim();
  const trimmedWorldbuilding = worldbuilding?.trim();
  const trimmedTone = tone?.trim();
  const trimmedApiKey = apiKey?.trim();

  if (!trimmedTitle || trimmedTitle.length === 0) {
    return res.status(400).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: 'Story title is required',
      values: { title, characterConcept, worldbuilding, tone },
    });
  }

  if (!trimmedCharacterConcept || trimmedCharacterConcept.length < 10) {
    return res.status(400).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: 'Character concept must be at least 10 characters',
      values: { title, characterConcept, worldbuilding, tone },
    });
  }

  if (!trimmedApiKey || trimmedApiKey.length < 10) {
    return res.status(400).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: 'OpenRouter API key is required',
      values: { title, characterConcept, worldbuilding, tone },
    });
  }

  try {
    const result = await storyEngine.startStory({
      title: trimmedTitle,
      characterConcept: trimmedCharacterConcept,
      worldbuilding: trimmedWorldbuilding,
      tone: trimmedTone,
      apiKey: trimmedApiKey,
    });

    return res.redirect(`/play/${result.story.id}?page=1&newStory=true`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Log full LLMError context for debugging
    if (error instanceof LLMError) {
      logger.error('LLM error creating story:', {
        message: error.message,
        code: error.code,
        retryable: error.retryable,
        httpStatus: error.context?.['httpStatus'],
        model: error.context?.['model'],
        parsedError: error.context?.['parsedError'],
        rawErrorBody: error.context?.['rawErrorBody'],
      });
    } else {
      logger.error('Error creating story:', { error: err.message, stack: err.stack });
    }

    let errorMessage = 'Failed to create story';
    if (error instanceof LLMError) {
      errorMessage = formatLLMError(error);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: errorMessage,
      values: { title, characterConcept, worldbuilding, tone },
    });
  }
}));

storyRoutes.post('/create-ajax', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { title, characterConcept, worldbuilding, tone, apiKey } = req.body as StoryFormBody;
  const trimmedTitle = title?.trim();
  const trimmedCharacterConcept = characterConcept?.trim();
  const trimmedWorldbuilding = worldbuilding?.trim();
  const trimmedTone = tone?.trim();
  const trimmedApiKey = apiKey?.trim();

  if (!trimmedTitle || trimmedTitle.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Story title is required',
    });
  }

  if (!trimmedCharacterConcept || trimmedCharacterConcept.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Character concept must be at least 10 characters',
    });
  }

  if (!trimmedApiKey || trimmedApiKey.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'OpenRouter API key is required',
    });
  }

  try {
    const result = await storyEngine.startStory({
      title: trimmedTitle,
      characterConcept: trimmedCharacterConcept,
      worldbuilding: trimmedWorldbuilding,
      tone: trimmedTone,
      apiKey: trimmedApiKey,
    });

    return res.json({
      success: true,
      storyId: result.story.id,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Log full LLMError context for debugging
    if (error instanceof LLMError) {
      logger.error('LLM error creating story (AJAX):', {
        message: error.message,
        code: error.code,
        retryable: error.retryable,
        httpStatus: error.context?.['httpStatus'],
        model: error.context?.['model'],
        parsedError: error.context?.['parsedError'],
        rawErrorBody: error.context?.['rawErrorBody'],
      });
    } else {
      logger.error('Error creating story:', { error: err.message, stack: err.stack });
    }

    let errorMessage = 'Failed to create story';
    if (error instanceof LLMError) {
      errorMessage = formatLLMError(error);
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Build enhanced error response
    const errorResponse: {
      success: false;
      error: string;
      code?: string;
      retryable?: boolean;
      debug?: {
        httpStatus?: number;
        model?: string;
        rawError?: string;
      };
    } = {
      success: false,
      error: errorMessage,
    };

    if (error instanceof LLMError) {
      errorResponse.code = error.code;
      errorResponse.retryable = error.retryable;

      // Include debug info only in development
      if (process.env['NODE_ENV'] !== 'production') {
        errorResponse.debug = {
          httpStatus: error.context?.['httpStatus'] as number | undefined,
          model: error.context?.['model'] as string | undefined,
          rawError: error.context?.['rawErrorBody'] as string | undefined,
        };
      }
    }

    return res.status(500).json(errorResponse);
  }
}));

storyRoutes.post('/:storyId/delete', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { storyId } = req.params;

  try {
    await storyEngine.deleteStory(storyId as StoryId);
    return res.redirect('/');
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error deleting story:', { error: err.message, stack: err.stack });
    return res.redirect('/');
  }
}));
