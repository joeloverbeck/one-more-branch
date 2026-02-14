import { z } from 'zod';
import {
  ChoiceIntentSchema,
  addDuplicateIssues,
  addRequiredTrimmedTextIssue,
} from './shared-state-intent-schemas.js';

export const PagePlannerResultSchema = z
  .object({
    sceneIntent: z.string(),
    continuityAnchors: z.array(z.string()),
    writerBrief: z.object({
      openingLineDirective: z.string(),
      mustIncludeBeats: z.array(z.string()),
      forbiddenRecaps: z.array(z.string()),
    }),
    dramaticQuestion: z.string(),
    choiceIntents: z.array(ChoiceIntentSchema).min(2).max(4),
  })
  .superRefine((data, ctx) => {
    addRequiredTrimmedTextIssue(data.sceneIntent, ['sceneIntent'], ctx);
    addRequiredTrimmedTextIssue(
      data.writerBrief.openingLineDirective,
      ['writerBrief', 'openingLineDirective'],
      ctx
    );

    addDuplicateIssues(data.continuityAnchors, ['continuityAnchors'], ctx);
    addDuplicateIssues(data.writerBrief.mustIncludeBeats, ['writerBrief', 'mustIncludeBeats'], ctx);
    addDuplicateIssues(data.writerBrief.forbiddenRecaps, ['writerBrief', 'forbiddenRecaps'], ctx);

    addRequiredTrimmedTextIssue(data.dramaticQuestion, ['dramaticQuestion'], ctx);

    data.choiceIntents.forEach((intent, index) => {
      addRequiredTrimmedTextIssue(intent.hook, ['choiceIntents', index, 'hook'], ctx);
    });

  });

export type ValidatedPagePlannerResult = z.infer<typeof PagePlannerResultSchema>;
