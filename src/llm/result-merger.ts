import { createBeatDeviation, createNoDeviation } from '../models/story-arc.js';
import type { AnalystResult, ContinuationGenerationResult, WriterResult } from './types.js';

export function mergeWriterAndAnalystResults(
  writer: WriterResult,
  analyst: AnalystResult | null,
): ContinuationGenerationResult {
  const beatConcluded = analyst?.beatConcluded ?? false;
  const beatResolution = analyst?.beatResolution ?? '';
  const deviationReason = analyst?.deviationReason?.trim() ?? '';
  const narrativeSummary = analyst?.narrativeSummary?.trim() ?? '';
  const invalidatedBeatIds = analyst?.invalidatedBeatIds ?? [];

  const deviation =
    analyst?.deviationDetected && deviationReason && narrativeSummary && invalidatedBeatIds.length > 0
      ? createBeatDeviation(deviationReason, invalidatedBeatIds, narrativeSummary)
      : createNoDeviation();

  return {
    ...writer,
    beatConcluded,
    beatResolution,
    deviation,
    rawResponse: writer.rawResponse,
  };
}
