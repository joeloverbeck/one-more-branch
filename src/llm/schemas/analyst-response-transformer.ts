import type { AnalystResult } from '../types.js';
import { AnalystResultSchema } from './analyst-validation-schema.js';

const BEAT_ID_PATTERN = /^\d+\.\d+$/;

export function validateAnalystResponse(rawJson: unknown, rawResponse: string): AnalystResult {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const validated = AnalystResultSchema.parse(parsed);

  return {
    beatConcluded: validated.beatConcluded,
    beatResolution: validated.beatResolution.trim(),
    deviationDetected: validated.deviationDetected,
    deviationReason: validated.deviationReason.trim(),
    invalidatedBeatIds: validated.invalidatedBeatIds
      .map((id: string) => id.trim())
      .filter((id: string) => BEAT_ID_PATTERN.test(id)),
    narrativeSummary: validated.narrativeSummary.trim(),
    pacingIssueDetected: validated.pacingIssueDetected,
    pacingIssueReason: validated.pacingIssueReason.trim(),
    recommendedAction: validated.recommendedAction,
    rawResponse,
  };
}
