import { z } from 'zod';
import { ChoiceType, PrimaryDelta } from '../../models/choice-enums.js';
import { ConstraintType, ThreatType, ThreadType, Urgency } from '../../models/state/index.js';
import {
  STATE_ID_PREFIXES,
  validateIdOnlyField,
  validateNoIdLikeAdditions,
} from '../validation/state-id-prefixes.js';

const DUPLICATE_INTENT_RULE_KEY = 'planner.duplicate_intent';
export const REQUIRED_TEXT_RULE_KEY = 'planner.required_text.empty_after_trim';

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

export function addDuplicateIssues(
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

export function addRequiredTrimmedTextIssue(
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

export function addIdPrefixIssues(
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

export function addNoIdLikeAdditionIssues(
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

export const ChoiceIntentSchema = z.object({
  hook: z.string(),
  choiceType: z.nativeEnum(ChoiceType),
  primaryDelta: z.nativeEnum(PrimaryDelta),
});

const ThreadIntentAddSchema = z.object({
  text: z.string(),
  threadType: z.nativeEnum(ThreadType),
  urgency: z.nativeEnum(Urgency),
});

const ThreatIntentAddSchema = z.object({
  text: z.string(),
  threatType: z.nativeEnum(ThreatType),
});

const ConstraintIntentAddSchema = z.object({
  text: z.string(),
  constraintType: z.nativeEnum(ConstraintType),
});

export const TextIntentMutationsSchema = z.object({
  add: z.array(z.string()),
  removeIds: z.array(z.string()),
});

export const ThreatIntentMutationsSchema = z.object({
  add: z.array(ThreatIntentAddSchema),
  removeIds: z.array(z.string()),
});

export const ConstraintIntentMutationsSchema = z.object({
  add: z.array(ConstraintIntentAddSchema),
  removeIds: z.array(z.string()),
});

export const ThreadIntentMutationsSchema = z.object({
  add: z.array(ThreadIntentAddSchema),
  resolveIds: z.array(z.string()),
});

const CharacterStateIntentAddSchema = z.object({
  characterName: z.string(),
  states: z.array(z.string()),
});

export const CharacterStateIntentMutationsSchema = z.object({
  add: z.array(CharacterStateIntentAddSchema),
  removeIds: z.array(z.string()),
});

export const CanonIntentsSchema = z.object({
  worldAdd: z.array(z.string()),
  characterAdd: z.array(
    z.object({
      characterName: z.string(),
      facts: z.array(z.string()),
    })
  ),
});

export const StateIntentsSchema = z.object({
  currentLocation: z.string(),
  threats: ThreatIntentMutationsSchema,
  constraints: ConstraintIntentMutationsSchema,
  threads: ThreadIntentMutationsSchema,
  inventory: TextIntentMutationsSchema,
  health: TextIntentMutationsSchema,
  characterState: CharacterStateIntentMutationsSchema,
  canon: CanonIntentsSchema,
});

export function addStateIntentRefinements(
  stateIntents: z.infer<typeof StateIntentsSchema>,
  ctx: z.RefinementCtx
): void {
  addRequiredTrimmedTextIssue(stateIntents.currentLocation, ['stateIntents', 'currentLocation'], ctx);

  addDuplicateIssues(
    stateIntents.threats.add.map((entry) => entry.text),
    ['stateIntents', 'threats', 'add'],
    ctx
  );
  addDuplicateIssues(
    stateIntents.constraints.add.map((entry) => entry.text),
    ['stateIntents', 'constraints', 'add'],
    ctx
  );
  addDuplicateIssues(stateIntents.inventory.add, ['stateIntents', 'inventory', 'add'], ctx);
  addDuplicateIssues(stateIntents.health.add, ['stateIntents', 'health', 'add'], ctx);
  addDuplicateIssues(stateIntents.canon.worldAdd, ['stateIntents', 'canon', 'worldAdd'], ctx);

  addNoIdLikeAdditionIssues(
    stateIntents.threats.add.map((entry) => entry.text),
    'stateIntents.threats.add',
    ['stateIntents', 'threats', 'add'],
    ctx
  );
  addNoIdLikeAdditionIssues(
    stateIntents.constraints.add.map((entry) => entry.text),
    'stateIntents.constraints.add',
    ['stateIntents', 'constraints', 'add'],
    ctx
  );
  addNoIdLikeAdditionIssues(
    stateIntents.inventory.add,
    'stateIntents.inventory.add',
    ['stateIntents', 'inventory', 'add'],
    ctx
  );
  addNoIdLikeAdditionIssues(
    stateIntents.health.add,
    'stateIntents.health.add',
    ['stateIntents', 'health', 'add'],
    ctx
  );
  addNoIdLikeAdditionIssues(
    stateIntents.canon.worldAdd,
    'stateIntents.canon.worldAdd',
    ['stateIntents', 'canon', 'worldAdd'],
    ctx
  );

  addIdPrefixIssues(
    stateIntents.threats.removeIds,
    'stateIntents.threats.removeIds',
    STATE_ID_PREFIXES.threats,
    ['stateIntents', 'threats', 'removeIds'],
    ctx
  );
  addIdPrefixIssues(
    stateIntents.constraints.removeIds,
    'stateIntents.constraints.removeIds',
    STATE_ID_PREFIXES.constraints,
    ['stateIntents', 'constraints', 'removeIds'],
    ctx
  );
  addIdPrefixIssues(
    stateIntents.threads.resolveIds,
    'stateIntents.threads.resolveIds',
    STATE_ID_PREFIXES.threads,
    ['stateIntents', 'threads', 'resolveIds'],
    ctx
  );
  addIdPrefixIssues(
    stateIntents.inventory.removeIds,
    'stateIntents.inventory.removeIds',
    STATE_ID_PREFIXES.inventory,
    ['stateIntents', 'inventory', 'removeIds'],
    ctx
  );
  addIdPrefixIssues(
    stateIntents.health.removeIds,
    'stateIntents.health.removeIds',
    STATE_ID_PREFIXES.health,
    ['stateIntents', 'health', 'removeIds'],
    ctx
  );
  addIdPrefixIssues(
    stateIntents.characterState.removeIds,
    'stateIntents.characterState.removeIds',
    STATE_ID_PREFIXES.characterState,
    ['stateIntents', 'characterState', 'removeIds'],
    ctx
  );

  stateIntents.threats.add.forEach((entry, index) => {
    addRequiredTrimmedTextIssue(entry.text, ['stateIntents', 'threats', 'add', index, 'text'], ctx);
    addNoIdLikeAdditionIssues(
      [entry.text],
      'stateIntents.threats.add[].text',
      ['stateIntents', 'threats', 'add', index, 'text'],
      ctx
    );
  });

  stateIntents.constraints.add.forEach((entry, index) => {
    addRequiredTrimmedTextIssue(
      entry.text,
      ['stateIntents', 'constraints', 'add', index, 'text'],
      ctx
    );
    addNoIdLikeAdditionIssues(
      [entry.text],
      'stateIntents.constraints.add[].text',
      ['stateIntents', 'constraints', 'add', index, 'text'],
      ctx
    );
  });

  stateIntents.threads.add.forEach((entry, index) => {
    addRequiredTrimmedTextIssue(entry.text, ['stateIntents', 'threads', 'add', index, 'text'], ctx);
    addNoIdLikeAdditionIssues(
      [entry.text],
      'stateIntents.threads.add[].text',
      ['stateIntents', 'threads', 'add', index, 'text'],
      ctx
    );
  });

  stateIntents.characterState.add.forEach((entry, index) => {
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

  stateIntents.canon.characterAdd.forEach((entry, index) => {
    addNoIdLikeAdditionIssues(
      entry.facts,
      'stateIntents.canon.characterAdd[].facts',
      ['stateIntents', 'canon', 'characterAdd', index, 'facts'],
      ctx
    );
  });
}
