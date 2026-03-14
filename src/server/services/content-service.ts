import { generateTasteProfile } from '../../llm/content-taste-distiller-generation.js';
import { generateSparks } from '../../llm/content-sparkstormer-generation.js';
import { generateContentPackets } from '../../llm/content-packeter-generation.js';
import { evaluateContentPackets } from '../../llm/content-evaluator-generation.js';
import { generateContentOneShot } from '../../llm/content-one-shot-generation.js';
import { runGenerationStage } from '../../engine/generation-pipeline-helpers.js';
import type { GenerationStageCallback } from '../../engine/types.js';
import type {
  ContentEvaluation,
  ContentOneShotContext,
  ContentOneShotPacket,
  ContentPacket,
  ContentSpark,
  SparkstormerContext,
  TasteDistillerContext,
  TasteProfile,
  ContentPacketerContext,
  ContentEvaluatorContext,
} from '../../models/content-packet.js';

// --- Input types ---

export interface ContentQuickInput {
  readonly exemplarIdeas: readonly string[];
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly kernelBlock?: string;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface ContentPipelineInput {
  readonly exemplarIdeas: readonly string[];
  readonly moodOrGenre?: string;
  readonly contentPreferences?: string;
  readonly kernelBlock?: string;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface DistillTasteInput {
  readonly exemplarIdeas: readonly string[];
  readonly moodOrGenre?: string;
  readonly contentPreferences?: string;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface GenerateSparksInput {
  readonly tasteProfile: TasteProfile;
  readonly kernelBlock?: string;
  readonly contentPreferences?: string;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface PackageContentInput {
  readonly tasteProfile: TasteProfile;
  readonly sparks: readonly ContentSpark[];
  readonly kernelBlock?: string;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface EvaluatePacketsInput {
  readonly packets: readonly ContentPacket[];
  readonly tasteProfile?: TasteProfile;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

// --- Result types ---

export interface ContentQuickResult {
  readonly packets: readonly ContentOneShotPacket[];
  readonly rawResponse: string;
}

export interface ContentPipelineResult {
  readonly tasteProfile: TasteProfile;
  readonly sparks: readonly ContentSpark[];
  readonly packets: readonly ContentPacket[];
  readonly evaluations: readonly ContentEvaluation[];
}

export interface DistillTasteResult {
  readonly tasteProfile: TasteProfile;
}

export interface GenerateSparksResult {
  readonly sparks: readonly ContentSpark[];
}

export interface PackageContentResult {
  readonly packets: readonly ContentPacket[];
}

export interface EvaluatePacketsResult {
  readonly evaluations: readonly ContentEvaluation[];
}

// --- Service interface ---

export interface ContentService {
  generateContentQuick(input: ContentQuickInput): Promise<ContentQuickResult>;
  generateContentPipeline(input: ContentPipelineInput): Promise<ContentPipelineResult>;
  distillTaste(input: DistillTasteInput): Promise<DistillTasteResult>;
  generateSparks(input: GenerateSparksInput): Promise<GenerateSparksResult>;
  packageContent(input: PackageContentInput): Promise<PackageContentResult>;
  evaluatePackets(input: EvaluatePacketsInput): Promise<EvaluatePacketsResult>;
}

// --- Dependencies ---

interface ContentServiceDeps {
  readonly generateContentOneShot: typeof generateContentOneShot;
  readonly generateTasteProfile: typeof generateTasteProfile;
  readonly generateSparks: typeof generateSparks;
  readonly generateContentPackets: typeof generateContentPackets;
  readonly evaluateContentPackets: typeof evaluateContentPackets;
}

const defaultDeps: ContentServiceDeps = {
  generateContentOneShot,
  generateTasteProfile,
  generateSparks,
  generateContentPackets,
  evaluateContentPackets,
};

// --- Validation ---

function requireApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 10) {
    throw new Error('OpenRouter API key is required');
  }
  return trimmed;
}

function requireExemplarIdeas(ideas: readonly string[]): readonly string[] {
  if (!Array.isArray(ideas) || ideas.length === 0) {
    throw new Error('At least one exemplar idea is required');
  }
  const filtered = ideas
    .filter((idea): idea is string => typeof idea === 'string')
    .map((idea) => idea.trim())
    .filter((idea) => idea.length > 0);
  if (filtered.length === 0) {
    throw new Error('At least one non-empty exemplar idea is required');
  }
  return filtered;
}

// --- Factory ---

export function createContentService(deps: ContentServiceDeps = defaultDeps): ContentService {
  return {
    async generateContentQuick(input: ContentQuickInput): Promise<ContentQuickResult> {
      const apiKey = requireApiKey(input.apiKey);
      const exemplarIdeas = requireExemplarIdeas(input.exemplarIdeas);
      const onGenerationStage = input.onGenerationStage;

      const context: ContentOneShotContext = {
        exemplarIdeas,
        genreVibes: input.genreVibes?.trim() ?? undefined,
        moodKeywords: input.moodKeywords?.trim() ?? undefined,
        contentPreferences: input.contentPreferences?.trim() ?? undefined,
        kernelBlock: input.kernelBlock?.trim() ?? undefined,
      };

      const result = await runGenerationStage(onGenerationStage, 'GENERATING_CONTENT', () =>
        deps.generateContentOneShot(context, apiKey),
      );

      return { packets: result.packets, rawResponse: result.rawResponse };
    },

    async generateContentPipeline(input: ContentPipelineInput): Promise<ContentPipelineResult> {
      const apiKey = requireApiKey(input.apiKey);
      const exemplarIdeas = requireExemplarIdeas(input.exemplarIdeas);
      const onGenerationStage = input.onGenerationStage;

      // Stage 1: Taste Distiller
      const tasteContext: TasteDistillerContext = {
        exemplarIdeas,
        moodOrGenre: input.moodOrGenre?.trim() ?? undefined,
        contentPreferences: input.contentPreferences?.trim() ?? undefined,
      };

      const tasteResult = await runGenerationStage(onGenerationStage, 'DISTILLING_TASTE', () =>
        deps.generateTasteProfile(tasteContext, apiKey),
      );

      // Stage 2: Sparkstormer
      const sparkContext: SparkstormerContext = {
        tasteProfile: tasteResult.tasteProfile,
        kernelBlock: input.kernelBlock?.trim() ?? undefined,
        contentPreferences: input.contentPreferences?.trim() ?? undefined,
      };

      const sparkResult = await runGenerationStage(onGenerationStage, 'GENERATING_SPARKS', () =>
        deps.generateSparks(sparkContext, apiKey),
      );

      // Stage 3: Content Packeter
      const packeterContext: ContentPacketerContext = {
        tasteProfile: tasteResult.tasteProfile,
        sparks: sparkResult.sparks,
        kernelBlock: input.kernelBlock?.trim() ?? undefined,
      };

      const packeterResult = await runGenerationStage(onGenerationStage, 'PACKAGING_CONTENT', () =>
        deps.generateContentPackets(packeterContext, apiKey),
      );

      // Stage 4: Content Evaluator
      const evaluatorContext: ContentEvaluatorContext = {
        packets: packeterResult.packets,
        tasteProfile: tasteResult.tasteProfile,
      };

      const evaluatorResult = await runGenerationStage(onGenerationStage, 'EVALUATING_CONTENT', () =>
        deps.evaluateContentPackets(evaluatorContext, apiKey),
      );

      return {
        tasteProfile: tasteResult.tasteProfile,
        sparks: sparkResult.sparks,
        packets: packeterResult.packets,
        evaluations: evaluatorResult.evaluations,
      };
    },

    async distillTaste(input: DistillTasteInput): Promise<DistillTasteResult> {
      const apiKey = requireApiKey(input.apiKey);
      const exemplarIdeas = requireExemplarIdeas(input.exemplarIdeas);
      const onGenerationStage = input.onGenerationStage;

      const context: TasteDistillerContext = {
        exemplarIdeas,
        moodOrGenre: input.moodOrGenre?.trim() ?? undefined,
        contentPreferences: input.contentPreferences?.trim() ?? undefined,
      };

      const result = await runGenerationStage(onGenerationStage, 'DISTILLING_TASTE', () =>
        deps.generateTasteProfile(context, apiKey),
      );

      return { tasteProfile: result.tasteProfile };
    },

    async generateSparks(input: GenerateSparksInput): Promise<GenerateSparksResult> {
      const apiKey = requireApiKey(input.apiKey);
      const onGenerationStage = input.onGenerationStage;

      const context: SparkstormerContext = {
        tasteProfile: input.tasteProfile,
        kernelBlock: input.kernelBlock?.trim() ?? undefined,
        contentPreferences: input.contentPreferences?.trim() ?? undefined,
      };

      const result = await runGenerationStage(onGenerationStage, 'GENERATING_SPARKS', () =>
        deps.generateSparks(context, apiKey),
      );

      return { sparks: result.sparks };
    },

    async packageContent(input: PackageContentInput): Promise<PackageContentResult> {
      const apiKey = requireApiKey(input.apiKey);
      const onGenerationStage = input.onGenerationStage;

      const context: ContentPacketerContext = {
        tasteProfile: input.tasteProfile,
        sparks: input.sparks,
        kernelBlock: input.kernelBlock?.trim() ?? undefined,
      };

      const result = await runGenerationStage(onGenerationStage, 'PACKAGING_CONTENT', () =>
        deps.generateContentPackets(context, apiKey),
      );

      return { packets: result.packets };
    },

    async evaluatePackets(input: EvaluatePacketsInput): Promise<EvaluatePacketsResult> {
      const apiKey = requireApiKey(input.apiKey);
      const onGenerationStage = input.onGenerationStage;

      const context: ContentEvaluatorContext = {
        packets: input.packets,
        tasteProfile: input.tasteProfile,
      };

      const result = await runGenerationStage(onGenerationStage, 'EVALUATING_CONTENT', () =>
        deps.evaluateContentPackets(context, apiKey),
      );

      return { evaluations: result.evaluations };
    },
  };
}

export const contentService = createContentService();
