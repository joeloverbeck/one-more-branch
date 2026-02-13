import type { StoryStructure } from '../models/story-arc.js';

export interface CompletedBeat {
  readonly actIndex: number;
  readonly beatIndex: number;
  readonly beatId: string;
  readonly name: string;
  readonly description: string;
  readonly objective: string;
  readonly role: string;
  readonly resolution: string;
}

export interface StructureRewriteContext {
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: string;
  readonly toneKeywords?: readonly string[];
  readonly toneAntiKeywords?: readonly string[];
  readonly completedBeats: readonly CompletedBeat[];
  readonly narrativeSummary: string;
  readonly currentActIndex: number;
  readonly currentBeatIndex: number;
  readonly deviationReason: string;
  readonly originalTheme: string;
}

export interface StructureRewriteResult {
  readonly structure: StoryStructure;
  readonly preservedBeatIds: readonly string[];
  readonly rawResponse: string;
}
