import { buildContentEvaluatorPrompt } from '../../../src/llm/prompts/content-evaluator-prompt';
import { parseContentEvaluatorResponse } from '../../../src/llm/content-evaluator-generation';
import { buildContentEvaluatorSchema } from '../../../src/llm/schemas/content-evaluator-schema';
import type {
  ContentEvaluatorContext,
  ContentPacket,
} from '../../../src/models/content-packet';

function makePacket(overrides: Partial<ContentPacket> = {}): ContentPacket {
  return {
    contentId: 'pkt-01',
    sourceSparkIds: ['spark-01'],
    contentKind: 'ENTITY',
    coreAnomaly: 'She cannot forget what the dead dreamed.',
    humanAnchor: 'The weight of inherited grief.',
    socialEngine: 'A black market trades in extracted final dreams.',
    choicePressure: 'Sell the dreams or carry the burden.',
    signatureImage: 'A jar of iridescent fluid labeled with a dead name.',
    escalationPath: 'The dreams start bleeding into her waking life.',
    wildnessInvariant: 'The intimacy of knowing a stranger through their last dream.',
    dullCollapse: 'Generic ghost story with no personal stakes.',
    interactionVerbs: ['extract', 'trade', 'confront', 'mourn'],
    ...overrides,
  };
}

function makeContext(overrides: Partial<ContentEvaluatorContext> = {}): ContentEvaluatorContext {
  return {
    packets: [makePacket()],
    ...overrides,
  };
}

function makeValidScores(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    imageCharge: 4,
    humanAche: 5,
    socialLoadBearing: 3,
    branchingPressure: 4,
    antiGenericity: 4,
    sceneBurst: 3,
    structuralIrony: 2,
    conceptUtility: 4,
    ...overrides,
  };
}

function makeValidEvaluation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contentId: 'pkt-01',
    scores: makeValidScores(),
    strengths: ['Vivid signature image', 'Strong human anchor'],
    weaknesses: ['Escalation path is vague'],
    recommendedRole: 'PRIMARY_SEED',
    ...overrides,
  };
}

describe('buildContentEvaluatorPrompt', () => {
  it('includes CONTENT_POLICY section in system prompt', () => {
    const messages = buildContentEvaluatorPrompt(makeContext());
    const systemMessage = messages.find((m) => m.role === 'system');
    expect(systemMessage).toBeDefined();
    expect(systemMessage!.content).toContain('CONTENT GUIDELINES:');
    expect(systemMessage!.content).toContain('NC-21');
  });

  it('injects packets into user prompt', () => {
    const packets = [makePacket()];
    const messages = buildContentEvaluatorPrompt(makeContext({ packets }));
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toContain('CONTENT PACKETS:');
    expect(userMessage!.content).toContain(JSON.stringify(packets, null, 2));
  });

  it('injects optional taste profile when provided', () => {
    const tasteProfile = {
      collisionPatterns: ['body horror meets bureaucracy'],
      favoredMechanisms: ['transformation'],
      humanAnchors: ['grieving parent'],
      socialEngines: ['black market'],
      toneBlend: ['dread'],
      sceneAppetites: ['confrontation'],
      antiPatterns: ['chosen one'],
      surfaceDoNotRepeat: ['sentient shadows'],
      riskAppetite: 'HIGH' as const,
    };
    const messages = buildContentEvaluatorPrompt(makeContext({ tasteProfile }));
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).toContain('TASTE PROFILE');
    expect(userMessage!.content).toContain(JSON.stringify(tasteProfile, null, 2));
  });

  it('omits taste profile when not provided', () => {
    const messages = buildContentEvaluatorPrompt(makeContext());
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).not.toContain('TASTE PROFILE');
  });
});

describe('parseContentEvaluatorResponse', () => {
  it('validates each evaluation has contentId, scores, strengths, weaknesses, recommendedRole', () => {
    const evaluation = makeValidEvaluation();
    const result = parseContentEvaluatorResponse({ evaluations: [evaluation] });
    expect(result).toHaveLength(1);
    expect(result[0].contentId).toBe('pkt-01');
    expect(result[0].scores.imageCharge).toBe(4);
    expect(result[0].scores.humanAche).toBe(5);
    expect(result[0].scores.socialLoadBearing).toBe(3);
    expect(result[0].scores.branchingPressure).toBe(4);
    expect(result[0].scores.antiGenericity).toBe(4);
    expect(result[0].scores.sceneBurst).toBe(3);
    expect(result[0].scores.structuralIrony).toBe(2);
    expect(result[0].scores.conceptUtility).toBe(4);
    expect(result[0].strengths).toEqual(['Vivid signature image', 'Strong human anchor']);
    expect(result[0].weaknesses).toEqual(['Escalation path is vague']);
    expect(result[0].recommendedRole).toBe('PRIMARY_SEED');
  });

  it('validates recommendedRole is one of PRIMARY_SEED/SECONDARY_MUTAGEN/IMAGE_ONLY/REJECT', () => {
    for (const role of ['PRIMARY_SEED', 'SECONDARY_MUTAGEN', 'IMAGE_ONLY', 'REJECT']) {
      const evaluation = makeValidEvaluation({ recommendedRole: role });
      expect(() => parseContentEvaluatorResponse({ evaluations: [evaluation] })).not.toThrow();
    }

    const evaluation = makeValidEvaluation({ recommendedRole: 'INVALID_ROLE' });
    expect(() => parseContentEvaluatorResponse({ evaluations: [evaluation] })).toThrow(
      /recommendedRole must be one of/,
    );
  });

  it('validates all 8 score dimensions are present and numeric (0-5 range)', () => {
    const dimensions = [
      'imageCharge',
      'humanAche',
      'socialLoadBearing',
      'branchingPressure',
      'antiGenericity',
      'sceneBurst',
      'structuralIrony',
      'conceptUtility',
    ];

    for (const dim of dimensions) {
      const missingScores = makeValidScores();
      delete missingScores[dim];
      const evaluation = makeValidEvaluation({ scores: missingScores });
      expect(() => parseContentEvaluatorResponse({ evaluations: [evaluation] })).toThrow(
        new RegExp(`scores\\.${dim} must be a number between 0 and 5`),
      );
    }

    const negativeScores = makeValidScores({ imageCharge: -1 });
    const evalNeg = makeValidEvaluation({ scores: negativeScores });
    expect(() => parseContentEvaluatorResponse({ evaluations: [evalNeg] })).toThrow(
      /scores\.imageCharge must be a number between 0 and 5/,
    );

    const overScores = makeValidScores({ humanAche: 6 });
    const evalOver = makeValidEvaluation({ scores: overScores });
    expect(() => parseContentEvaluatorResponse({ evaluations: [evalOver] })).toThrow(
      /scores\.humanAche must be a number between 0 and 5/,
    );

    const stringScores = makeValidScores({ sceneBurst: 'three' });
    const evalStr = makeValidEvaluation({ scores: stringScores });
    expect(() => parseContentEvaluatorResponse({ evaluations: [evalStr] })).toThrow(
      /scores\.sceneBurst must be a number between 0 and 5/,
    );
  });

  it('rejects evaluations with missing fields', () => {
    const noContentId = makeValidEvaluation();
    delete noContentId['contentId'];
    expect(() => parseContentEvaluatorResponse({ evaluations: [noContentId] })).toThrow(
      /contentId must be a non-empty string/,
    );

    const noScores = makeValidEvaluation();
    delete noScores['scores'];
    expect(() => parseContentEvaluatorResponse({ evaluations: [noScores] })).toThrow(
      /scores must be an object/,
    );

    const noStrengths = makeValidEvaluation();
    delete noStrengths['strengths'];
    expect(() => parseContentEvaluatorResponse({ evaluations: [noStrengths] })).toThrow(
      /strengths must be a non-empty array/,
    );

    const noWeaknesses = makeValidEvaluation();
    delete noWeaknesses['weaknesses'];
    expect(() => parseContentEvaluatorResponse({ evaluations: [noWeaknesses] })).toThrow(
      /weaknesses must be a non-empty array/,
    );

    const noRole = makeValidEvaluation();
    delete noRole['recommendedRole'];
    expect(() => parseContentEvaluatorResponse({ evaluations: [noRole] })).toThrow(
      /recommendedRole must be one of/,
    );
  });

  it('rejects empty evaluations array', () => {
    expect(() => parseContentEvaluatorResponse({ evaluations: [] })).toThrow(
      /evaluations must be a non-empty array/,
    );
  });

  it('rejects non-object response', () => {
    expect(() => parseContentEvaluatorResponse('not an object')).toThrow(/must be an object/);
  });

  it('rejects response missing evaluations key', () => {
    expect(() => parseContentEvaluatorResponse({ notEvaluations: [] })).toThrow(
      /evaluations must be a non-empty array/,
    );
  });

  it('parses multiple evaluations correctly', () => {
    const evaluations = [
      makeValidEvaluation({ contentId: 'pkt-01', recommendedRole: 'PRIMARY_SEED' }),
      makeValidEvaluation({ contentId: 'pkt-02', recommendedRole: 'REJECT' }),
      makeValidEvaluation({ contentId: 'pkt-03', recommendedRole: 'SECONDARY_MUTAGEN' }),
    ];
    const result = parseContentEvaluatorResponse({ evaluations });
    expect(result).toHaveLength(3);
    expect(result[0].contentId).toBe('pkt-01');
    expect(result[0].recommendedRole).toBe('PRIMARY_SEED');
    expect(result[1].contentId).toBe('pkt-02');
    expect(result[1].recommendedRole).toBe('REJECT');
    expect(result[2].contentId).toBe('pkt-03');
    expect(result[2].recommendedRole).toBe('SECONDARY_MUTAGEN');
  });

  it('accepts boundary score values 0 and 5', () => {
    const scores = makeValidScores({ imageCharge: 0, humanAche: 5 });
    const evaluation = makeValidEvaluation({ scores });
    const result = parseContentEvaluatorResponse({ evaluations: [evaluation] });
    expect(result[0].scores.imageCharge).toBe(0);
    expect(result[0].scores.humanAche).toBe(5);
  });
});

describe('buildContentEvaluatorSchema', () => {
  it('matches spec output shape with evaluations array', () => {
    const schema = buildContentEvaluatorSchema();
    expect(schema.type).toBe('json_schema');
    expect(schema.json_schema.name).toBe('content_evaluator');

    const rootSchema = schema.json_schema.schema as Record<string, unknown>;
    expect(rootSchema['required']).toEqual(['evaluations']);

    const properties = rootSchema['properties'] as Record<string, unknown>;
    const evaluations = properties['evaluations'] as Record<string, unknown>;
    expect(evaluations['type']).toBe('array');

    const items = evaluations['items'] as Record<string, unknown>;
    expect(items['type']).toBe('object');

    const required = items['required'] as string[];
    expect(required).toContain('contentId');
    expect(required).toContain('scores');
    expect(required).toContain('strengths');
    expect(required).toContain('weaknesses');
    expect(required).toContain('recommendedRole');

    const evalProps = items['properties'] as Record<string, Record<string, unknown>>;
    expect(evalProps['recommendedRole']['enum']).toEqual([
      'PRIMARY_SEED',
      'SECONDARY_MUTAGEN',
      'IMAGE_ONLY',
      'REJECT',
    ]);

    const scoresSchema = evalProps['scores'] as Record<string, unknown>;
    const scoresRequired = scoresSchema['required'] as string[];
    expect(scoresRequired).toContain('imageCharge');
    expect(scoresRequired).toContain('humanAche');
    expect(scoresRequired).toContain('socialLoadBearing');
    expect(scoresRequired).toContain('branchingPressure');
    expect(scoresRequired).toContain('antiGenericity');
    expect(scoresRequired).toContain('sceneBurst');
    expect(scoresRequired).toContain('structuralIrony');
    expect(scoresRequired).toContain('conceptUtility');
  });
});
