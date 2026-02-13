import { z } from 'zod';
import { ChoiceType, PrimaryDelta } from '../../models/choice-enums.js';
import { ThreadType, Urgency } from '../../models/state/index.js';
import {
  STATE_ID_PREFIXES,
  validateIdOnlyField,
  validateNoIdLikeAdditions,
} from '../validation/state-id-prefixes.js';

const DUPLICATE_INTENT_RULE_KEY = 'planner.duplicate_intent';
const DUPLICATE_CHOICE_INTENT_RULE_KEY = 'planner.choice_intent.duplicate_type_delta';
const REQUIRED_TEXT_RULE_KEY = 'planner.required_text.empty_after_trim';

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function addDuplicateIssues(
  values: readonly string[],
  path: (string | number)[],
  ctx: z.RefinementCtx
): void {
  const seen = new Map<string, number>();
  values.forEach((value, index) => {
    const key = normalized(value);
    if (!key) {
      return;
    }

    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: DUPLICATE_INTENT_RULE_KEY,
        path: [...path, index],
        params: {
          ruleKey: DUPLICATE_INTENT_RULE_KEY,
          firstIndex: seen.get(key),
          normalizedValue: key,
        },
      });
      return;
    }

    seen.set(key, index);
  });
}

function addRequiredTrimmedTextIssue(
  value: string,
  path: (string | number)[],
  ctx: z.RefinementCtx
): void {
  if (value.trim()) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: REQUIRED_TEXT_RULE_KEY,
    path,
    params: {
      ruleKey: REQUIRED_TEXT_RULE_KEY,
    },
  });
}

function addIdPrefixIssues(
  values: readonly string[],
  field: string,
  prefix: (typeof STATE_ID_PREFIXES)[keyof typeof STATE_ID_PREFIXES],
  path: (string | number)[],
  ctx: z.RefinementCtx
): void {
  const issues = validateIdOnlyField(values, field, prefix);
  issues.forEach((issue) => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue.ruleKey,
      path: [...path, issue.index],
      params: {
        ruleKey: issue.ruleKey,
        field: issue.field,
        expectedPrefix: issue.expectedPrefix,
        value: issue.value,
      },
    });
  });
}

function addNoIdLikeAdditionIssues(
  values: readonly string[],
  field: string,
  path: (string | number)[],
  ctx: z.RefinementCtx
): void {
  const issues = validateNoIdLikeAdditions(values, field);
  issues.forEach((issue) => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue.ruleKey,
      path: [...path, issue.index],
      params: {
        ruleKey: issue.ruleKey,
        field: issue.field,
        value: issue.value,
      },
    });
  });
}

const ChoiceIntentSchema = z.object({
  hook: z.string(),
  choiceType: z.nativeEnum(ChoiceType),
  primaryDelta: z.nativeEnum(PrimaryDelta),
});

const ThreadIntentAddSchema = z.object({
  text: z.string(),
  threadType: z.nativeEnum(ThreadType),
  urgency: z.nativeEnum(Urgency),
});

const TextIntentMutationsSchema = z.object({
  add: z.array(z.string()),
  removeIds: z.array(z.string()),
});

const ThreadIntentMutationsSchema = z.object({
  add: z.array(ThreadIntentAddSchema),
  resolveIds: z.array(z.string()),
});

const CharacterStateIntentAddSchema = z.object({
  characterName: z.string(),
  states: z.array(z.string()),
});

const CharacterStateIntentMutationsSchema = z.object({
  add: z.array(CharacterStateIntentAddSchema),
  removeIds: z.array(z.string()),
});

const CanonIntentsSchema = z.object({
  worldAdd: z.array(z.string()),
  characterAdd: z.array(
    z.object({
      characterName: z.string(),
      facts: z.array(z.string()),
    })
  ),
});

export const PagePlannerResultSchema = z
  .object({
    sceneIntent: z.string(),
    continuityAnchors: z.array(z.string()),
    stateIntents: z.object({
      currentLocation: z.string(),
      threats: TextIntentMutationsSchema,
      constraints: TextIntentMutationsSchema,
      threads: ThreadIntentMutationsSchema,
      inventory: TextIntentMutationsSchema,
      health: TextIntentMutationsSchema,
      characterState: CharacterStateIntentMutationsSchema,
      canon: CanonIntentsSchema,
    }),
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
      data.stateIntents.currentLocation,
      ['stateIntents', 'currentLocation'],
      ctx
    );
    addRequiredTrimmedTextIssue(
      data.writerBrief.openingLineDirective,
      ['writerBrief', 'openingLineDirective'],
      ctx
    );

    addDuplicateIssues(data.continuityAnchors, ['continuityAnchors'], ctx);
    addDuplicateIssues(data.writerBrief.mustIncludeBeats, ['writerBrief', 'mustIncludeBeats'], ctx);
    addDuplicateIssues(data.writerBrief.forbiddenRecaps, ['writerBrief', 'forbiddenRecaps'], ctx);

    addDuplicateIssues(data.stateIntents.threats.add, ['stateIntents', 'threats', 'add'], ctx);
    addDuplicateIssues(
      data.stateIntents.constraints.add,
      ['stateIntents', 'constraints', 'add'],
      ctx
    );
    addDuplicateIssues(data.stateIntents.inventory.add, ['stateIntents', 'inventory', 'add'], ctx);
    addDuplicateIssues(data.stateIntents.health.add, ['stateIntents', 'health', 'add'], ctx);
    addDuplicateIssues(
      data.stateIntents.canon.worldAdd,
      ['stateIntents', 'canon', 'worldAdd'],
      ctx
    );

    addNoIdLikeAdditionIssues(
      data.stateIntents.threats.add,
      'stateIntents.threats.add',
      ['stateIntents', 'threats', 'add'],
      ctx
    );
    addNoIdLikeAdditionIssues(
      data.stateIntents.constraints.add,
      'stateIntents.constraints.add',
      ['stateIntents', 'constraints', 'add'],
      ctx
    );
    addNoIdLikeAdditionIssues(
      data.stateIntents.inventory.add,
      'stateIntents.inventory.add',
      ['stateIntents', 'inventory', 'add'],
      ctx
    );
    addNoIdLikeAdditionIssues(
      data.stateIntents.health.add,
      'stateIntents.health.add',
      ['stateIntents', 'health', 'add'],
      ctx
    );
    addNoIdLikeAdditionIssues(
      data.stateIntents.canon.worldAdd,
      'stateIntents.canon.worldAdd',
      ['stateIntents', 'canon', 'worldAdd'],
      ctx
    );

    addIdPrefixIssues(
      data.stateIntents.threats.removeIds,
      'stateIntents.threats.removeIds',
      STATE_ID_PREFIXES.threats,
      ['stateIntents', 'threats', 'removeIds'],
      ctx
    );
    addIdPrefixIssues(
      data.stateIntents.constraints.removeIds,
      'stateIntents.constraints.removeIds',
      STATE_ID_PREFIXES.constraints,
      ['stateIntents', 'constraints', 'removeIds'],
      ctx
    );
    addIdPrefixIssues(
      data.stateIntents.threads.resolveIds,
      'stateIntents.threads.resolveIds',
      STATE_ID_PREFIXES.threads,
      ['stateIntents', 'threads', 'resolveIds'],
      ctx
    );
    addIdPrefixIssues(
      data.stateIntents.inventory.removeIds,
      'stateIntents.inventory.removeIds',
      STATE_ID_PREFIXES.inventory,
      ['stateIntents', 'inventory', 'removeIds'],
      ctx
    );
    addIdPrefixIssues(
      data.stateIntents.health.removeIds,
      'stateIntents.health.removeIds',
      STATE_ID_PREFIXES.health,
      ['stateIntents', 'health', 'removeIds'],
      ctx
    );
    addIdPrefixIssues(
      data.stateIntents.characterState.removeIds,
      'stateIntents.characterState.removeIds',
      STATE_ID_PREFIXES.characterState,
      ['stateIntents', 'characterState', 'removeIds'],
      ctx
    );

    data.stateIntents.threads.add.forEach((entry, index) => {
      addRequiredTrimmedTextIssue(
        entry.text,
        ['stateIntents', 'threads', 'add', index, 'text'],
        ctx
      );
      addNoIdLikeAdditionIssues(
        [entry.text],
        'stateIntents.threads.add[].text',
        ['stateIntents', 'threads', 'add', index, 'text'],
        ctx
      );
    });

    data.stateIntents.characterState.add.forEach((entry, index) => {
      addRequiredTrimmedTextIssue(
        entry.characterName,
        ['stateIntents', 'characterState', 'add', index, 'characterName'],
        ctx
      );
      if (entry.states.map((state) => state.trim()).filter(Boolean).length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: REQUIRED_TEXT_RULE_KEY,
          path: ['stateIntents', 'characterState', 'add', index, 'states'],
          params: { ruleKey: REQUIRED_TEXT_RULE_KEY },
        });
      }
      addNoIdLikeAdditionIssues(
        entry.states,
        'stateIntents.characterState.add[].states',
        ['stateIntents', 'characterState', 'add', index, 'states'],
        ctx
      );
    });

    data.stateIntents.canon.characterAdd.forEach((entry, index) => {
      addNoIdLikeAdditionIssues(
        entry.facts,
        'stateIntents.canon.characterAdd[].facts',
        ['stateIntents', 'canon', 'characterAdd', index, 'facts'],
        ctx
      );
    });

    addRequiredTrimmedTextIssue(data.dramaticQuestion, ['dramaticQuestion'], ctx);

    data.choiceIntents.forEach((intent, index) => {
      addRequiredTrimmedTextIssue(intent.hook, ['choiceIntents', index, 'hook'], ctx);
    });

    const seenPairs = new Set<string>();
    data.choiceIntents.forEach((intent, index) => {
      const key = `${intent.choiceType}:${intent.primaryDelta}`;
      if (seenPairs.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: DUPLICATE_CHOICE_INTENT_RULE_KEY,
          path: ['choiceIntents', index],
          params: {
            ruleKey: DUPLICATE_CHOICE_INTENT_RULE_KEY,
            choiceType: intent.choiceType,
            primaryDelta: intent.primaryDelta,
          },
        });
      }
      seenPairs.add(key);
    });
  });

export type ValidatedPagePlannerResult = z.infer<typeof PagePlannerResultSchema>;
