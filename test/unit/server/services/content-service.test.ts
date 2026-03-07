import { createContentService } from '@/server/services/content-service';
import type {
  TasteProfile,
  ContentSpark,
  ContentPacket,
  ContentEvaluation,
  ContentOneShotPacket,
  ContentOneShotContext,
  TasteDistillerContext,
  SparkstormerContext,
  ContentPacketerContext,
  ContentEvaluatorContext,
} from '@/models/content-packet';
import type { GenerationStageEvent } from '@/engine/types';

function createTasteProfile(): TasteProfile {
  return {
    collisionPatterns: ['pattern-a'],
    favoredMechanisms: ['mechanism-a'],
    humanAnchors: ['anchor-a'],
    socialEngines: ['engine-a'],
    toneBlend: ['tone-a'],
    sceneAppetites: ['appetite-a'],
    antiPatterns: ['anti-a'],
    surfaceDoNotRepeat: ['surface-a'],
    riskAppetite: 'HIGH',
  };
}

function createSpark(id = 'spark_1'): ContentSpark {
  return {
    sparkId: id,
    contentKind: 'ENTITY',
    spark: 'A test spark',
    imageSeed: 'A vivid image',
    collisionTags: ['tag-a'],
  };
}

function createPacket(id = 'content_1'): ContentPacket {
  return {
    contentId: id,
    sourceSparkIds: ['spark_1'],
    contentKind: 'ENTITY',
    coreAnomaly: 'anomaly',
    humanAnchor: 'anchor',
    socialEngine: 'engine',
    choicePressure: 'pressure',
    signatureImage: 'image',
    escalationPath: 'path',
    wildnessInvariant: 'invariant',
    dullCollapse: 'collapse',
    interactionVerbs: ['verb1', 'verb2', 'verb3', 'verb4'],
  };
}

function createEvaluation(id = 'content_1'): ContentEvaluation {
  return {
    contentId: id,
    scores: {
      imageCharge: 4,
      humanAche: 3,
      socialLoadBearing: 4,
      branchingPressure: 3,
      antiGenericity: 5,
      sceneBurst: 4,
      structuralIrony: 3,
      conceptUtility: 4,
    },
    strengths: ['strong imagery'],
    weaknesses: ['needs more ache'],
    recommendedRole: 'PRIMARY_SEED',
  };
}

function createOneShotPacket(): ContentOneShotPacket {
  return {
    title: 'Test Packet',
    contentKind: 'ENTITY',
    coreAnomaly: 'anomaly',
    humanAnchor: 'anchor',
    socialEngine: 'engine',
    choicePressure: 'pressure',
    signatureImage: 'image',
    escalationHint: 'hint',
    wildnessInvariant: 'invariant',
    dullCollapse: 'collapse',
  };
}

const VALID_API_KEY = 'sk-test-key-1234567890';
const EXEMPLAR_IDEAS = ['A city where gravity reverses at midnight'];

function createMockDeps() {
  const tasteProfile = createTasteProfile();
  const sparks = [createSpark()];
  const packets = [createPacket()];
  const evaluations = [createEvaluation()];
  const oneShotPackets = [createOneShotPacket()];

  return {
    generateContentOneShot: jest.fn().mockResolvedValue({
      packets: oneShotPackets,
      rawResponse: '{}',
    }),
    generateTasteProfile: jest.fn().mockResolvedValue({
      tasteProfile,
      rawResponse: '{}',
    }),
    generateSparks: jest.fn().mockResolvedValue({
      sparks,
      rawResponse: '{}',
    }),
    generateContentPackets: jest.fn().mockResolvedValue({
      packets,
      rawResponse: '{}',
    }),
    evaluateContentPackets: jest.fn().mockResolvedValue({
      evaluations,
      rawResponse: '{}',
    }),
    fixtures: { tasteProfile, sparks, packets, evaluations, oneShotPackets },
  };
}

describe('ContentService', () => {
  describe('generateContentQuick', () => {
    it('calls generateContentOneShot with correct context', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);

      const result = await service.generateContentQuick({
        exemplarIdeas: EXEMPLAR_IDEAS,
        genreVibes: 'dark fantasy',
        moodKeywords: 'grim',
        contentPreferences: 'violent',
        kernelBlock: 'some kernel',
        apiKey: VALID_API_KEY,
      });

      expect(deps.generateContentOneShot).toHaveBeenCalledTimes(1);
      expect(deps.generateContentOneShot).toHaveBeenCalledWith(
        expect.objectContaining<ContentOneShotContext>({
          exemplarIdeas: EXEMPLAR_IDEAS,
          genreVibes: 'dark fantasy',
          moodKeywords: 'grim',
          contentPreferences: 'violent',
          kernelBlock: 'some kernel',
        }),
        VALID_API_KEY,
      );
      expect(result.packets).toEqual(deps.fixtures.oneShotPackets);
    });

    it('requires apiKey (throws on missing)', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);

      await expect(
        service.generateContentQuick({
          exemplarIdeas: EXEMPLAR_IDEAS,
          apiKey: '',
        }),
      ).rejects.toThrow('OpenRouter API key is required');
    });

    it('fires onGenerationStage callbacks for GENERATING_CONTENT stage', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);
      const stages: GenerationStageEvent[] = [];

      await service.generateContentQuick({
        exemplarIdeas: EXEMPLAR_IDEAS,
        apiKey: VALID_API_KEY,
        onGenerationStage: (event: GenerationStageEvent) => stages.push(event),
      });

      expect(stages).toEqual([
        { stage: 'GENERATING_CONTENT', status: 'started', attempt: 1 },
        { stage: 'GENERATING_CONTENT', status: 'completed', attempt: 1 },
      ]);
    });
  });

  describe('generateContentPipeline', () => {
    it('calls all 4 stages in order: distillTaste -> generateSparks -> packageContent -> evaluatePackets', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);
      const callOrder: string[] = [];

      deps.generateTasteProfile.mockImplementation(() => {
        callOrder.push('taste');
        return Promise.resolve({ tasteProfile: deps.fixtures.tasteProfile, rawResponse: '{}' });
      });
      deps.generateSparks.mockImplementation(() => {
        callOrder.push('sparks');
        return Promise.resolve({ sparks: deps.fixtures.sparks, rawResponse: '{}' });
      });
      deps.generateContentPackets.mockImplementation(() => {
        callOrder.push('packeter');
        return Promise.resolve({ packets: deps.fixtures.packets, rawResponse: '{}' });
      });
      deps.evaluateContentPackets.mockImplementation(() => {
        callOrder.push('evaluator');
        return Promise.resolve({ evaluations: deps.fixtures.evaluations, rawResponse: '{}' });
      });

      await service.generateContentPipeline({
        exemplarIdeas: EXEMPLAR_IDEAS,
        apiKey: VALID_API_KEY,
      });

      expect(callOrder).toEqual(['taste', 'sparks', 'packeter', 'evaluator']);
    });

    it('passes taste profile output as input to sparkstormer', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);

      await service.generateContentPipeline({
        exemplarIdeas: EXEMPLAR_IDEAS,
        apiKey: VALID_API_KEY,
      });

      expect(deps.generateSparks).toHaveBeenCalledWith(
        expect.objectContaining<Partial<SparkstormerContext>>({
          tasteProfile: deps.fixtures.tasteProfile,
        }),
        VALID_API_KEY,
      );
    });

    it('passes sparks output as input to packeter', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);

      await service.generateContentPipeline({
        exemplarIdeas: EXEMPLAR_IDEAS,
        apiKey: VALID_API_KEY,
      });

      expect(deps.generateContentPackets).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ContentPacketerContext>>({
          sparks: deps.fixtures.sparks,
          tasteProfile: deps.fixtures.tasteProfile,
        }),
        VALID_API_KEY,
      );
    });

    it('passes packets output as input to evaluator', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);

      await service.generateContentPipeline({
        exemplarIdeas: EXEMPLAR_IDEAS,
        apiKey: VALID_API_KEY,
      });

      expect(deps.evaluateContentPackets).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ContentEvaluatorContext>>({
          packets: deps.fixtures.packets,
          tasteProfile: deps.fixtures.tasteProfile,
        }),
        VALID_API_KEY,
      );
    });

    it('fires onGenerationStage callbacks for all 4 stages', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);
      const stages: GenerationStageEvent[] = [];

      await service.generateContentPipeline({
        exemplarIdeas: EXEMPLAR_IDEAS,
        apiKey: VALID_API_KEY,
        onGenerationStage: (event: GenerationStageEvent) => stages.push(event),
      });

      expect(stages).toEqual([
        { stage: 'DISTILLING_TASTE', status: 'started', attempt: 1 },
        { stage: 'DISTILLING_TASTE', status: 'completed', attempt: 1 },
        { stage: 'GENERATING_SPARKS', status: 'started', attempt: 1 },
        { stage: 'GENERATING_SPARKS', status: 'completed', attempt: 1 },
        { stage: 'PACKAGING_CONTENT', status: 'started', attempt: 1 },
        { stage: 'PACKAGING_CONTENT', status: 'completed', attempt: 1 },
        { stage: 'EVALUATING_CONTENT', status: 'started', attempt: 1 },
        { stage: 'EVALUATING_CONTENT', status: 'completed', attempt: 1 },
      ]);
    });

    it('returns combined result from all stages', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);

      const result = await service.generateContentPipeline({
        exemplarIdeas: EXEMPLAR_IDEAS,
        apiKey: VALID_API_KEY,
      });

      expect(result.tasteProfile).toEqual(deps.fixtures.tasteProfile);
      expect(result.sparks).toEqual(deps.fixtures.sparks);
      expect(result.packets).toEqual(deps.fixtures.packets);
      expect(result.evaluations).toEqual(deps.fixtures.evaluations);
    });
  });

  describe('distillTaste', () => {
    it('calls taste distiller generation with correct context', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);

      await service.distillTaste({
        exemplarIdeas: EXEMPLAR_IDEAS,
        moodOrGenre: 'cosmic horror',
        contentPreferences: 'body horror',
        apiKey: VALID_API_KEY,
      });

      expect(deps.generateTasteProfile).toHaveBeenCalledTimes(1);
      expect(deps.generateTasteProfile).toHaveBeenCalledWith(
        expect.objectContaining<TasteDistillerContext>({
          exemplarIdeas: EXEMPLAR_IDEAS,
          moodOrGenre: 'cosmic horror',
          contentPreferences: 'body horror',
        }),
        VALID_API_KEY,
      );
    });

    it('fires onGenerationStage callbacks for DISTILLING_TASTE', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);
      const stages: GenerationStageEvent[] = [];

      await service.distillTaste({
        exemplarIdeas: EXEMPLAR_IDEAS,
        apiKey: VALID_API_KEY,
        onGenerationStage: (event: GenerationStageEvent) => stages.push(event),
      });

      expect(stages).toEqual([
        { stage: 'DISTILLING_TASTE', status: 'started', attempt: 1 },
        { stage: 'DISTILLING_TASTE', status: 'completed', attempt: 1 },
      ]);
    });
  });

  describe('generateSparks', () => {
    it('calls sparkstormer generation with correct context', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);
      const tasteProfile = createTasteProfile();

      await service.generateSparks({
        tasteProfile,
        kernelBlock: 'kernel info',
        contentPreferences: 'dark',
        apiKey: VALID_API_KEY,
      });

      expect(deps.generateSparks).toHaveBeenCalledTimes(1);
      expect(deps.generateSparks).toHaveBeenCalledWith(
        expect.objectContaining<SparkstormerContext>({
          tasteProfile,
          kernelBlock: 'kernel info',
          contentPreferences: 'dark',
        }),
        VALID_API_KEY,
      );
    });

    it('fires onGenerationStage callbacks for GENERATING_SPARKS', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);
      const stages: GenerationStageEvent[] = [];

      await service.generateSparks({
        tasteProfile: createTasteProfile(),
        apiKey: VALID_API_KEY,
        onGenerationStage: (event: GenerationStageEvent) => stages.push(event),
      });

      expect(stages).toEqual([
        { stage: 'GENERATING_SPARKS', status: 'started', attempt: 1 },
        { stage: 'GENERATING_SPARKS', status: 'completed', attempt: 1 },
      ]);
    });
  });

  describe('packageContent', () => {
    it('fires onGenerationStage callbacks for PACKAGING_CONTENT', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);
      const stages: GenerationStageEvent[] = [];

      await service.packageContent({
        tasteProfile: createTasteProfile(),
        sparks: [createSpark()],
        apiKey: VALID_API_KEY,
        onGenerationStage: (event: GenerationStageEvent) => stages.push(event),
      });

      expect(stages).toEqual([
        { stage: 'PACKAGING_CONTENT', status: 'started', attempt: 1 },
        { stage: 'PACKAGING_CONTENT', status: 'completed', attempt: 1 },
      ]);
    });
  });

  describe('evaluatePackets', () => {
    it('fires onGenerationStage callbacks for EVALUATING_CONTENT', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);
      const stages: GenerationStageEvent[] = [];

      await service.evaluatePackets({
        packets: [createPacket()],
        apiKey: VALID_API_KEY,
        onGenerationStage: (event: GenerationStageEvent) => stages.push(event),
      });

      expect(stages).toEqual([
        { stage: 'EVALUATING_CONTENT', status: 'started', attempt: 1 },
        { stage: 'EVALUATING_CONTENT', status: 'completed', attempt: 1 },
      ]);
    });
  });

  describe('validation', () => {
    it('throws when exemplarIdeas is empty', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);

      await expect(
        service.generateContentQuick({ exemplarIdeas: [], apiKey: VALID_API_KEY }),
      ).rejects.toThrow('At least one exemplar idea is required');
    });

    it('throws when exemplarIdeas contains only whitespace', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);

      await expect(
        service.generateContentQuick({ exemplarIdeas: ['  ', ''], apiKey: VALID_API_KEY }),
      ).rejects.toThrow('At least one non-empty exemplar idea is required');
    });

    it('throws when apiKey is too short', async () => {
      const deps = createMockDeps();
      const service = createContentService(deps);

      await expect(
        service.generateContentQuick({ exemplarIdeas: EXEMPLAR_IDEAS, apiKey: 'short' }),
      ).rejects.toThrow('OpenRouter API key is required');
    });
  });
});
