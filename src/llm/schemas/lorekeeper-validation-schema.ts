import { z } from 'zod';

const StoryBibleCharacterSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  relevantProfile: z.string().min(1),
  speechPatterns: z.string().default(''),
  protagonistRelationship: z.string().default(''),
  interCharacterDynamics: z.string().default(''),
  currentState: z.string().default(''),
});

export const LorekeeperResultSchema = z.object({
  sceneWorldContext: z.string().default(''),
  relevantCharacters: z.array(StoryBibleCharacterSchema).default([]),
  relevantCanonFacts: z.array(z.string()).default([]),
  relevantHistory: z.string().default(''),
});
