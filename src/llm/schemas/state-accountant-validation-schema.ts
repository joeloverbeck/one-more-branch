import { z } from 'zod';
import { addStateIntentRefinements, StateIntentsSchema } from './shared-state-intent-schemas.js';

export const StateAccountantResultSchema = z
  .object({
    stateIntents: StateIntentsSchema,
  })
  .superRefine((data, ctx) => {
    addStateIntentRefinements(data.stateIntents, ctx);
  });

export type ValidatedStateAccountantResult = z.infer<typeof StateAccountantResultSchema>;
