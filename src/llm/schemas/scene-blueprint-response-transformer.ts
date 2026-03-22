import { z } from 'zod';
import type { SceneBlueprintResult } from '../scene-blueprint-types.js';
import { LLMError } from '../llm-client-types.js';
import { SCENE_FUNCTION_VALUES, MRU_TYPE_VALUES } from '../scene-blueprint-contract.js';

const NarrativeUnitSchema = z.object({
  action: z.string().min(1),
  emotionalRegister: z.string().min(1),
  sceneFunction: z.enum(SCENE_FUNCTION_VALUES),
  mruType: z.enum(MRU_TYPE_VALUES),
  sensoryAnchor: z.string().min(1),
  paragraphWeight: z.number().int().min(1).max(3),
  speakingCharacters: z.array(z.string()).nullable().optional(),
});

const MandateMappingSchema = z.object({
  mandate: z.string().min(1),
  unitIndex: z.number().int().min(0),
});

const SceneBlueprintSchema = z.object({
  units: z.array(NarrativeUnitSchema).min(2).max(8),
  emotionalArc: z.string().min(1),
  mandateMapping: z.array(MandateMappingSchema),
});

export function validateSceneBlueprintResponse(
  rawJson: unknown,
  rawResponse: string
): SceneBlueprintResult {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true, {
        rawResponse,
      });
    }
  }

  let validated: z.infer<typeof SceneBlueprintSchema>;
  try {
    validated = SceneBlueprintSchema.parse(parsed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to validate scene blueprint response';
    throw new LLMError(message, 'VALIDATION_ERROR', true, { rawResponse });
  }

  return {
    units: validated.units.map((u) => ({
      action: u.action.trim(),
      emotionalRegister: u.emotionalRegister.trim(),
      sceneFunction: u.sceneFunction,
      mruType: u.mruType,
      sensoryAnchor: u.sensoryAnchor.trim(),
      paragraphWeight: u.paragraphWeight,
      ...(u.speakingCharacters && u.speakingCharacters.length > 0
        ? { speakingCharacters: u.speakingCharacters.map((c) => c.trim()).filter(Boolean) }
        : {}),
    })),
    emotionalArc: validated.emotionalArc.trim(),
    mandateMapping: validated.mandateMapping.map((m) => ({
      mandate: m.mandate.trim(),
      unitIndex: m.unitIndex,
    })),
    rawResponse,
  };
}
