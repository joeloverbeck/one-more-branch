import { type Request, type Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types.js';
import {
  buildChatRelationshipPresentation,
  buildChatRelationshipTimeline,
  ChatDomainError,
  DISTANCE_BAND_VALUES,
  PRIVACY_VALUES,
  TIME_OF_DAY_VALUES,
  type ChatLeadInContext,
  type ChatPhysicalContext,
  type ChatSession,
} from '../../models/chat/index.js';
import { logger } from '../../logging/index.js';
import { chatService } from '../services/index.js';
import {
  buildLlmRouteErrorResult,
  flattenParam,
  wrapAsyncRoute,
} from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const chatRoutes = Router();

const MAX_CHAT_MESSAGE_LENGTH = 2000;
const MIN_API_KEY_LENGTH = 10;

interface ChatCreateBody {
  readonly worldbuildingId?: unknown;
  readonly targetCharacterId?: unknown;
  readonly interlocutorCharacterId?: unknown;
  readonly location?: unknown;
  readonly microLocation?: unknown;
  readonly timeOfDay?: unknown;
  readonly privacy?: unknown;
  readonly distanceBand?: unknown;
  readonly characterActivity?: unknown;
  readonly interactableObjects?: unknown;
  readonly ambientConditions?: unknown;
  readonly leadInSummary?: unknown;
  readonly recentEvents?: unknown;
  readonly whyNow?: unknown;
}

interface ChatTurnBody {
  readonly message?: unknown;
  readonly apiKey?: unknown;
  readonly progressId?: unknown;
  readonly isSessionResume?: unknown;
}

interface ChatUiBootstrap {
  readonly chatBible: ChatSession['chatBible'];
  readonly rollingSummary: ChatSession['rollingSummary'];
  readonly knowledgeState: ChatSession['knowledgeState'];
  readonly relationshipTimeline: ReturnType<typeof buildChatRelationshipTimeline>;
  readonly relationshipPresentation: ReturnType<typeof buildChatRelationshipPresentation>;
}

function buildChatUiBootstrap(session: ChatSession, turns: Parameters<typeof buildChatRelationshipTimeline>[0]): ChatUiBootstrap {
  const relationshipTimeline = buildChatRelationshipTimeline(turns);
  return {
    chatBible: session.chatBible,
    rollingSummary: session.rollingSummary,
    knowledgeState: session.knowledgeState,
    relationshipTimeline,
    relationshipPresentation: buildChatRelationshipPresentation(
      relationshipTimeline,
      session.relationshipState
    ),
  };
}

class RouteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteValidationError';
  }
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCsvList(value: unknown): string[] {
  return trimString(value)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseLineList(value: unknown): string[] {
  return trimString(value)
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  return undefined;
}

function parseRequiredString(label: string, value: unknown): string {
  const trimmed = trimString(value);
  if (trimmed.length === 0) {
    throw new RouteValidationError(`${label} is required`);
  }

  return trimmed;
}

function parseEnumValue<TValue extends string>(
  label: string,
  value: unknown,
  candidates: readonly TValue[]
): TValue {
  const trimmed = trimString(value);
  if (candidates.includes(trimmed as TValue)) {
    return trimmed as TValue;
  }

  throw new RouteValidationError(`${label} is invalid`);
}

function parseChatCreateBody(body: ChatCreateBody): {
  worldbuildingId: string;
  targetCharacterId: string;
  interlocutorCharacterId: string;
  physicalContext: ChatPhysicalContext;
  leadInContext: ChatLeadInContext;
} {
  return {
    worldbuildingId: parseRequiredString('worldbuildingId', body.worldbuildingId),
    targetCharacterId: parseRequiredString('targetCharacterId', body.targetCharacterId),
    interlocutorCharacterId: parseRequiredString(
      'interlocutorCharacterId',
      body.interlocutorCharacterId
    ),
    physicalContext: {
      location: parseRequiredString('location', body.location),
      microLocation: parseRequiredString('microLocation', body.microLocation),
      timeOfDay: parseEnumValue('timeOfDay', body.timeOfDay, TIME_OF_DAY_VALUES),
      privacy: parseEnumValue('privacy', body.privacy, PRIVACY_VALUES),
      distanceBand: parseEnumValue('distanceBand', body.distanceBand, DISTANCE_BAND_VALUES),
      characterActivity: parseRequiredString('characterActivity', body.characterActivity),
      interactableObjects: parseCsvList(body.interactableObjects),
      ambientConditions: parseCsvList(body.ambientConditions),
    },
    leadInContext: {
      leadInSummary: parseRequiredString('leadInSummary', body.leadInSummary),
      recentEvents: parseLineList(body.recentEvents),
      whyNow: parseRequiredString('whyNow', body.whyNow),
    },
  };
}

function resolveStatusCode(error: Error): number {
  if (error instanceof RouteValidationError) {
    return 400;
  }

  if (error instanceof ChatDomainError) {
    switch (error.code) {
      case 'VALIDATION_FAILED':
        return 400;
      case 'RESOURCE_NOT_FOUND':
        return 404;
      case 'RESOURCE_CONFLICT':
        return 409;
      case 'INVALID_PERSISTED_DATA':
      case 'INVARIANT_VIOLATION':
        return 500;
      default:
        return 500;
    }
  }

  return 500;
}

function renderPageError(
  res: Response,
  error: unknown,
  operation: string
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const status = resolveStatusCode(err);
  logger.error(`Error during ${operation}`, { error: err.message, stack: err.stack });
  res.status(status).render('pages/error', {
    title: 'Error',
    message: err.message,
  });
}

function jsonRouteError(
  res: Response,
  error: unknown,
  operation: string
): Response {
  if (error instanceof LLMError) {
    const { response } = buildLlmRouteErrorResult(error);
    logger.error(`LLM error during ${operation}`, {
      code: error.code,
      retryable: error.retryable,
      message: error.message,
    });
    return res.status(500).json(response);
  }

  const err = error instanceof Error ? error : new Error(String(error));
  const status = resolveStatusCode(err);
  logger.error(`Error during ${operation}`, { error: err.message, stack: err.stack });
  return res.status(status).json({ success: false, error: err.message });
}

chatRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    try {
      const chats = await chatService.listChats();
      return res.render('pages/chat-list', {
        title: 'Character Chats - One More Branch',
        chats,
      });
    } catch (error) {
      renderPageError(res, error, 'chat list rendering');
      return;
    }
  })
);

chatRoutes.get(
  '/new',
  (_req: Request, res: Response) => {
    return res.render('pages/chat-new', {
      title: 'New Character Chat - One More Branch',
    });
  }
);

chatRoutes.post(
  '/',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    try {
      const session = await chatService.createChat(parseChatCreateBody(req.body as ChatCreateBody));
      return res.redirect(`/chat/${session.id}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const status = resolveStatusCode(err);
      logger.error('Error creating chat', { error: err.message, stack: err.stack });
      return res.status(status).render('pages/error', {
        title: 'Error',
        message: err.message,
      });
    }
  })
);

chatRoutes.get(
  '/:chatId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    try {
      const chatId = flattenParam(req.params['chatId']) ?? '';
      const { session, turns } = await chatService.resumeChat(chatId);
      const chatUiBootstrap = buildChatUiBootstrap(session, turns);
      return res.render('pages/chat', {
        title: `Chat with ${session.targetCharacterName} - One More Branch`,
        session,
        turns,
        chatUiBootstrap,
      });
    } catch (error) {
      renderPageError(res, error, 'chat rendering');
      return;
    }
  })
);

chatRoutes.post(
  '/:chatId/turn',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as ChatTurnBody;
    const chatId = flattenParam(req.params['chatId']) ?? '';
    const message = trimString(body.message);
    const apiKey = trimString(body.apiKey);

    if (message.length === 0) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    if (message.length > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `message must be ${MAX_CHAT_MESSAGE_LENGTH} characters or fewer`,
      });
    }

    if (apiKey.length < MIN_API_KEY_LENGTH) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'chat-turn-generation');

    try {
      const result = await chatService.sendTurn({
        chatId,
        userMessage: message,
        apiKey,
        isSessionResume: parseBoolean(body.isSessionResume),
        onGenerationStage: progress.onGenerationStage,
      });

      progress.complete();
      return res.json({
        success: true,
        ...result,
        ...(progress.progressId ? { progressId: progress.progressId } : {}),
      });
    } catch (error) {
      if (error instanceof LLMError) {
        const { publicMessage, response } = buildLlmRouteErrorResult(error);
        progress.fail(publicMessage);
        logger.error('LLM error during chat turn generation', {
          code: error.code,
          retryable: error.retryable,
          message: error.message,
        });
        return res.status(500).json(response);
      }

      const err = error instanceof Error ? error : new Error(String(error));
      progress.fail(err.message);
      return jsonRouteError(res, err, 'chat turn generation');
    }
  })
);

chatRoutes.delete(
  '/:chatId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    try {
      const chatId = flattenParam(req.params['chatId']) ?? '';
      await chatService.deleteChat(chatId);
      return res.json({ success: true });
    } catch (error) {
      return jsonRouteError(res, error, 'chat deletion');
    }
  })
);
