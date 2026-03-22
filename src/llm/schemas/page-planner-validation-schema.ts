import { z } from 'zod';
import { addDuplicateIssues, addRequiredTrimmedTextIssue } from './shared-state-intent-schemas.js';

export const PagePlannerResultSchema = z
  .object({
    sceneIntent: z.string(),
    continuityAnchors: z.array(z.string()),
    sceneMandates: z.array(z.string()),
    forbiddenRecaps: z.array(z.string()),
    dramaticQuestion: z.string(),
    isEnding: z.boolean(),
  })
  .superRefine((data, ctx) => {
    addRequiredTrimmedTextIssue(data.sceneIntent, ['sceneIntent'], ctx);

    addDuplicateIssues(data.continuityAnchors, ['continuityAnchors'], ctx);
    addDuplicateIssues(data.sceneMandates, ['sceneMandates'], ctx);
    addDuplicateIssues(data.forbiddenRecaps, ['forbiddenRecaps'], ctx);

    addRequiredTrimmedTextIssue(data.dramaticQuestion, ['dramaticQuestion'], ctx);
  });

export type ValidatedPagePlannerResult = z.infer<typeof PagePlannerResultSchema>;
