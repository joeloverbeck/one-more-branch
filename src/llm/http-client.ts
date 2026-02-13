import { LLMError, type OpenRouterResponse } from './llm-client-types.js';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ErrorDetails {
  message: string;
  rawBody: string;
  parsedError?: { code?: string; message?: string };
}

type JsonRoot = Record<string, unknown> | unknown[];

function truncateForContext(value: string, maxLength = 200): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function describeContentShape(content: unknown): string {
  if (typeof content === 'string') {
    return 'string';
  }
  if (Array.isArray(content)) {
    return 'array';
  }
  if (content === null) {
    return 'null';
  }
  return typeof content;
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    const textParts = content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (typeof part !== 'object' || part === null) {
          return '';
        }

        const partRecord = part as Record<string, unknown>;
        if (typeof partRecord['text'] === 'string') {
          return partRecord['text'];
        }
        if (typeof partRecord['content'] === 'string') {
          return partRecord['content'];
        }

        return '';
      })
      .filter((part) => part.trim().length > 0);

    if (textParts.length > 0) {
      return textParts.join('\n');
    }
  }

  if (typeof content === 'object' && content !== null) {
    return JSON.stringify(content);
  }

  return String(content);
}

function stripMarkdownCodeFence(input: string): string {
  const trimmed = input.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  return input;
}

function extractLikelyJsonSubstring(input: string): string | null {
  const trimmed = input.trim();
  const startCurly = trimmed.indexOf('{');
  const startSquare = trimmed.indexOf('[');
  const starts = [startCurly, startSquare].filter((index) => index >= 0);
  if (starts.length === 0) {
    return null;
  }

  const start = Math.min(...starts);
  const firstChar = trimmed[start];
  const endChar = firstChar === '[' ? ']' : '}';
  const end = trimmed.lastIndexOf(endChar);
  if (end <= start) {
    return null;
  }

  return trimmed.slice(start, end + 1).trim();
}

function parseJsonWithFallbacks(jsonText: string): JsonRoot | null {
  const repaired = repairMalformedJson(jsonText);
  const candidates = [
    jsonText,
    stripMarkdownCodeFence(jsonText),
    extractLikelyJsonSubstring(stripMarkdownCodeFence(jsonText)) ?? '',
    repaired ?? '',
  ].filter(
    (candidate, index, all) => candidate.trim().length > 0 && all.indexOf(candidate) === index
  );

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as JsonRoot;
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

function appendMissingClosingDelimiters(input: string): string | null {
  const expectedClosers: string[] = [];
  let inString = false;
  let escaped = false;

  for (const char of input) {
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      expectedClosers.push('}');
      continue;
    }

    if (char === '[') {
      expectedClosers.push(']');
      continue;
    }

    if (char === '}' || char === ']') {
      const expected = expectedClosers.pop();
      if (expected !== char) {
        return null;
      }
    }
  }

  if (inString || escaped) {
    return null;
  }

  return input + expectedClosers.reverse().join('');
}

function repairMalformedJson(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const base = stripMarkdownCodeFence(trimmed);
  const extracted = extractLikelyJsonSubstring(base) ?? base;
  const withoutTrailingCommas = extracted.replace(/,\s*([}\]])/g, '$1');

  return appendMissingClosingDelimiters(withoutTrailingCommas);
}

export function parseMessageJsonContent(content: unknown): { parsed: JsonRoot; rawText: string } {
  const rawText = normalizeMessageContent(content);
  const parsed = parseJsonWithFallbacks(rawText);

  if (parsed !== null) {
    return { parsed, rawText };
  }

  throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true, {
    parseStage: 'message_content',
    contentShape: describeContentShape(content),
    contentPreview: truncateForContext(rawText.trim()),
    rawContent: rawText,
  });
}

export async function readJsonResponse(response: Response): Promise<OpenRouterResponse> {
  let rawBody = '';

  if (typeof response.text === 'function') {
    try {
      rawBody = await response.text();
    } catch {
      if (typeof response.json === 'function') {
        try {
          return (await response.json()) as OpenRouterResponse;
        } catch {
          // Fall through to standardized INVALID_JSON below.
        }
      }

      throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true, {
        parseStage: 'response_body',
        contentPreview: '',
      });
    }
  } else if (typeof response.json === 'function') {
    try {
      return (await response.json()) as OpenRouterResponse;
    } catch {
      throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true, {
        parseStage: 'response_body',
        contentPreview: '',
      });
    }
  } else {
    throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true, {
      parseStage: 'response_body',
      contentPreview: '',
    });
  }

  const parsed = parseJsonWithFallbacks(rawBody);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true, {
      parseStage: 'response_body',
      contentShape: describeContentShape(parsed),
      contentPreview: truncateForContext(rawBody.trim()),
    });
  }

  return parsed as unknown as OpenRouterResponse;
}

export async function readErrorMessage(response: Response): Promise<string> {
  let errorText = '';

  try {
    errorText = await response.text();
  } catch {
    return `OpenRouter request failed with status ${response.status}`;
  }

  if (!errorText) {
    return `OpenRouter request failed with status ${response.status}`;
  }

  try {
    const parsed = JSON.parse(errorText) as { error?: { message?: string } };
    return parsed.error?.message ?? errorText;
  } catch {
    return errorText;
  }
}

export async function readErrorDetails(response: Response): Promise<ErrorDetails> {
  let rawBody = '';

  try {
    rawBody = await response.text();
  } catch {
    return {
      message: `OpenRouter request failed with status ${response.status}`,
      rawBody: '',
    };
  }

  if (!rawBody) {
    return {
      message: `OpenRouter request failed with status ${response.status}`,
      rawBody: '',
    };
  }

  try {
    const parsed = JSON.parse(rawBody) as { error?: { message?: string; code?: string } };
    const parsedError = parsed.error
      ? { message: parsed.error.message, code: parsed.error.code }
      : undefined;

    return {
      message: parsed.error?.message ?? rawBody,
      rawBody,
      parsedError,
    };
  } catch {
    return {
      message: rawBody,
      rawBody,
    };
  }
}
