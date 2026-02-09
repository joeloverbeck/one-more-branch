import { z } from 'zod';

export const AnalystResultSchema = z.object({
  beatConcluded: z.boolean().default(false),
  beatResolution: z.string().default(''),
  deviationDetected: z.boolean().default(false),
  deviationReason: z.string().default(''),
  invalidatedBeatIds: z.array(z.string()).optional().default([]),
  narrativeSummary: z.string().default(''),
  pacingIssueDetected: z.boolean().default(false),
  pacingIssueReason: z.string().default(''),
  recommendedAction: z.enum(['none', 'nudge', 'rewrite']).catch('none').default('none'),
});
