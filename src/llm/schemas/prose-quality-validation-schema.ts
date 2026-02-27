import { z } from 'zod';

const ThematicChargeSchema = z
  .enum(['THESIS_SUPPORTING', 'ANTITHESIS_SUPPORTING', 'AMBIGUOUS'])
  .catch('AMBIGUOUS')
  .default('AMBIGUOUS');

const NarrativeFocusSchema = z
  .enum(['DEEPENING', 'BROADENING', 'BALANCED'])
  .catch('BALANCED')
  .default('BALANCED');

export const ProseQualityResultSchema = z.object({
  toneAdherent: z.boolean().catch(true).default(true),
  toneDriftDescription: z.string().catch('').default(''),
  thematicCharge: ThematicChargeSchema,
  thematicChargeDescription: z.string().catch('').default(''),
  narrativeFocus: NarrativeFocusSchema,
});
