import type { ProseQualityResult } from '../prose-quality-types.js';
import { ProseQualityResultSchema } from './prose-quality-validation-schema.js';

export function validateProseQualityResponse(
  rawJson: unknown,
  rawResponse: string
): ProseQualityResult & { rawResponse: string } {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const validated = ProseQualityResultSchema.parse(parsed);

  return {
    toneAdherent: validated.toneAdherent,
    toneDriftDescription: validated.toneDriftDescription.trim(),
    thematicCharge: validated.thematicCharge,
    thematicChargeDescription: validated.thematicChargeDescription.trim(),
    narrativeFocus: validated.narrativeFocus,
    rawResponse,
  };
}
