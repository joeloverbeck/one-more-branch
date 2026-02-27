import { z } from 'zod';

const ThematicChargeSchema = z
  .enum(['THESIS_SUPPORTING', 'ANTITHESIS_SUPPORTING', 'AMBIGUOUS'])
  .catch('AMBIGUOUS')
  .default('AMBIGUOUS');

const NarrativeFocusSchema = z
  .enum(['DEEPENING', 'BROADENING', 'BALANCED'])
  .catch('BALANCED')
  .default('BALANCED');

const DetectedRelationshipShiftSchema = z.object({
  npcName: z.string().default(''),
  shiftDescription: z.string().default(''),
  suggestedValenceChange: z.number().default(0),
  suggestedNewDynamic: z.string().default(''),
});

const KnowledgeAsymmetrySchema = z.object({
  characterName: z.string().default(''),
  knownFacts: z.array(z.string()).catch([]).default([]),
  falseBeliefs: z.array(z.string()).catch([]).default([]),
  secrets: z.array(z.string()).catch([]).default([]),
});

export const SceneQualityResultSchema = z.object({
  toneAdherent: z.boolean().catch(true).default(true),
  toneDriftDescription: z.string().catch('').default(''),
  thematicCharge: ThematicChargeSchema,
  thematicChargeDescription: z.string().catch('').default(''),
  narrativeFocus: NarrativeFocusSchema,
  npcCoherenceAdherent: z.boolean().catch(true).default(true),
  npcCoherenceIssues: z.string().catch('').default(''),
  relationshipShiftsDetected: z.array(DetectedRelationshipShiftSchema).catch([]).default([]),
  knowledgeAsymmetryDetected: z.array(KnowledgeAsymmetrySchema).catch([]).default([]),
  dramaticIronyOpportunities: z.array(z.string()).catch([]).default([]),
});
