import type { ContentPipelineInput, DistillTasteInput } from '../services/content-service.js';

type ParseSuccess<T> = {
  readonly ok: true;
  readonly value: T;
};

type ParseFailure = {
  readonly ok: false;
  readonly error: string;
};

type ParseResult<T> = ParseSuccess<T> | ParseFailure;

type RouteBody = Record<string, unknown>;

export interface ParsedGenerateContentRequest {
  readonly command: Omit<ContentPipelineInput, 'onGenerationStage'>;
  readonly progressId: unknown;
}

export interface ParsedGenerateTasteProfileRequest {
  readonly command: Omit<DistillTasteInput, 'onGenerationStage'>;
  readonly progressId: unknown;
}

function isRouteBody(value: unknown): value is RouteBody {
  return typeof value === 'object' && value !== null;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseApiKey(value: unknown): ParseResult<string> {
  const apiKey = normalizeOptionalString(value);
  if (!apiKey || apiKey.length < 10) {
    return { ok: false, error: 'OpenRouter API key is required' };
  }

  return { ok: true, value: apiKey };
}

function parseExemplarIdeas(value: unknown): ParseResult<readonly string[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: 'At least one exemplar idea is required' };
  }

  const exemplarIdeas = value
    .filter((idea): idea is string => typeof idea === 'string')
    .map((idea) => idea.trim())
    .filter((idea) => idea.length > 0);

  if (exemplarIdeas.length === 0) {
    return { ok: false, error: 'At least one non-empty exemplar idea is required' };
  }

  return { ok: true, value: exemplarIdeas };
}

function parseRouteInputs(body: unknown): ParseResult<{
  readonly apiKey: string;
  readonly exemplarIdeas: readonly string[];
  readonly moodOrGenre?: string;
  readonly contentPreferences?: string;
  readonly progressId: unknown;
}> {
  const routeBody = isRouteBody(body) ? body : {};

  const apiKey = parseApiKey(routeBody['apiKey']);
  if (!apiKey.ok) {
    return apiKey;
  }

  const exemplarIdeas = parseExemplarIdeas(routeBody['exemplarIdeas']);
  if (!exemplarIdeas.ok) {
    return exemplarIdeas;
  }

  return {
    ok: true,
    value: {
      apiKey: apiKey.value,
      exemplarIdeas: exemplarIdeas.value,
      moodOrGenre: normalizeOptionalString(routeBody['moodOrGenre']),
      contentPreferences: normalizeOptionalString(routeBody['contentPreferences']),
      progressId: routeBody['progressId'],
    },
  };
}

export function parseGenerateContentRequest(body: unknown): ParseResult<ParsedGenerateContentRequest> {
  const parsed = parseRouteInputs(body);
  if (!parsed.ok) {
    return parsed;
  }

  const routeBody = isRouteBody(body) ? body : {};

  return {
    ok: true,
    value: {
      command: {
        exemplarIdeas: parsed.value.exemplarIdeas,
        moodOrGenre: parsed.value.moodOrGenre,
        contentPreferences: parsed.value.contentPreferences,
        kernelBlock: normalizeOptionalString(routeBody['kernelBlock']),
        apiKey: parsed.value.apiKey,
      },
      progressId: parsed.value.progressId,
    },
  };
}

export function parseGenerateTasteProfileRequest(
  body: unknown
): ParseResult<ParsedGenerateTasteProfileRequest> {
  const parsed = parseRouteInputs(body);
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    value: {
      command: {
        exemplarIdeas: parsed.value.exemplarIdeas,
        moodOrGenre: parsed.value.moodOrGenre,
        contentPreferences: parsed.value.contentPreferences,
        apiKey: parsed.value.apiKey,
      },
      progressId: parsed.value.progressId,
    },
  };
}
