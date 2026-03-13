import {
  buildCharacterWebPrompt,
  type CharacterWebPromptContext,
} from './prompts/character-web-prompt.js';
import { CHARACTER_WEB_GENERATION_SCHEMA } from './schemas/character-web-schema.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type {
  AllianceFaultLine,
  CastRoleAssignment,
  ConflictTriangle,
  RelationshipArchetype,
} from '../models/character-pipeline-types.js';
import {
  isStoryFunction,
  isCharacterDepth,
} from '../models/character-enums.js';
import { isRelationshipArchetype } from '../models/character-pipeline-types.js';
import { runLlmStage } from './llm-stage-runner.js';

export interface CharacterWebGenerationResult {
  readonly assignments: readonly CastRoleAssignment[];
  readonly relationshipArchetypes: readonly RelationshipArchetype[];
  readonly castDynamicsSummary: string;
  readonly conflictTriangles: readonly ConflictTriangle[];
  readonly allianceFaultLines: readonly AllianceFaultLine[];
  readonly rawResponse: string;
}

function parseAssignment(raw: unknown, index: number): CastRoleAssignment {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(
      `Assignment ${index + 1} must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = raw as Record<string, unknown>;

  if (typeof data['characterName'] !== 'string' || data['characterName'].trim().length === 0) {
    throw new LLMError(
      `Assignment ${index + 1} missing characterName`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['isProtagonist'] !== 'boolean') {
    throw new LLMError(
      `Assignment ${index + 1} missing isProtagonist`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isStoryFunction(data['storyFunction'])) {
    throw new LLMError(
      `Assignment ${index + 1} invalid storyFunction: ${String(data['storyFunction'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!isCharacterDepth(data['characterDepth'])) {
    throw new LLMError(
      `Assignment ${index + 1} invalid characterDepth: ${String(data['characterDepth'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['narrativeRole'] !== 'string') {
    throw new LLMError(
      `Assignment ${index + 1} missing narrativeRole`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['conflictRelationship'] !== 'string') {
    throw new LLMError(
      `Assignment ${index + 1} missing conflictRelationship`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const privateAgenda = typeof data['privateAgenda'] === 'string'
    ? data['privateAgenda'].trim()
    : '';

  return {
    characterName: data['characterName'].trim(),
    isProtagonist: data['isProtagonist'],
    storyFunction: data['storyFunction'],
    characterDepth: data['characterDepth'],
    narrativeRole: data['narrativeRole'],
    conflictRelationship: data['conflictRelationship'],
    privateAgenda,
  };
}

function parseRelationshipArchetype(raw: unknown, index: number): RelationshipArchetype {
  if (!isRelationshipArchetype(raw)) {
    throw new LLMError(
      `Relationship archetype ${index + 1} is invalid or has invalid enum values`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return raw;
}

function parseCharacterWebResponse(
  parsed: unknown
): Omit<CharacterWebGenerationResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Character web response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;

  if (!Array.isArray(data['assignments'])) {
    throw new LLMError(
      'Character web response missing assignments array',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (data['assignments'].length === 0) {
    throw new LLMError(
      'Character web must have at least one assignment',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (!Array.isArray(data['relationshipArchetypes'])) {
    throw new LLMError(
      'Character web response missing relationshipArchetypes array',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['castDynamicsSummary'] !== 'string' || data['castDynamicsSummary'].trim().length === 0) {
    throw new LLMError(
      'Character web response missing castDynamicsSummary',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const assignments = data['assignments'].map((a, i) => parseAssignment(a, i));
  const relationshipArchetypes = data['relationshipArchetypes'].map((r, i) =>
    parseRelationshipArchetype(r, i)
  );

  const rawTriangles = Array.isArray(data['conflictTriangles']) ? data['conflictTriangles'] : [];
  const conflictTriangles: ConflictTriangle[] = rawTriangles
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => ({
      characters: Array.isArray(t['characters'])
        ? (t['characters'].filter((c): c is string => typeof c === 'string').slice(0, 3) as [string, string, string])
        : ([] as unknown as [string, string, string]),
      incompatibility: typeof t['incompatibility'] === 'string' ? t['incompatibility'].trim() : '',
    }))
    .filter((t) => t.characters.length === 3 && t.incompatibility.length > 0);

  const rawFaultLines = Array.isArray(data['allianceFaultLines']) ? data['allianceFaultLines'] : [];
  const allianceFaultLines: AllianceFaultLine[] = rawFaultLines
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .map((f) => ({
      allies: Array.isArray(f['allies'])
        ? (f['allies'].filter((a): a is string => typeof a === 'string').slice(0, 2) as [string, string])
        : ([] as unknown as [string, string]),
      faultLine: typeof f['faultLine'] === 'string' ? f['faultLine'].trim() : '',
    }))
    .filter((f) => f.allies.length === 2 && f.faultLine.length > 0);

  return {
    assignments,
    relationshipArchetypes,
    castDynamicsSummary: data['castDynamicsSummary'].trim(),
    conflictTriangles,
    allianceFaultLines,
  };
}

export async function generateCharacterWeb(
  context: CharacterWebPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharacterWebGenerationResult> {
  const messages = buildCharacterWebPrompt(context);
  const result = await runLlmStage({
    stageModel: 'characterWeb',
    promptType: 'characterWeb',
    apiKey,
    options,
    schema: CHARACTER_WEB_GENERATION_SCHEMA,
    messages,
    parseResponse: parseCharacterWebResponse,
  });

  return {
    ...result.parsed,
    rawResponse: result.rawResponse,
  };
}
