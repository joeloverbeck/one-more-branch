import {
  LOREKEEPER_CURATION_PRINCIPLES,
  LOREKEEPER_CHARACTER_REQUIRED_FIELDS,
  LOREKEEPER_REQUIRED_FIELDS,
} from '../../../src/llm/lorekeeper-contract';
import {
  PAGE_PLANNER_CHOICE_INTENT_REQUIRED_FIELDS,
  PAGE_PLANNER_CHOICE_TYPE_ENUM,
  PAGE_PLANNER_PRIMARY_DELTA_ENUM,
  PAGE_PLANNER_PROMPT_RULES,
  PAGE_PLANNER_REQUIRED_FIELDS,
  PAGE_PLANNER_WRITER_BRIEF_REQUIRED_FIELDS,
} from '../../../src/llm/page-planner-contract';
import { buildLorekeeperPrompt } from '../../../src/llm/prompts/lorekeeper-prompt';
import { buildPagePlannerPrompt } from '../../../src/llm/prompts/page-planner-prompt';
import { LOREKEEPER_SCHEMA } from '../../../src/llm/schemas/lorekeeper-schema';
import { PAGE_PLANNER_GENERATION_SCHEMA } from '../../../src/llm/schemas/page-planner-schema';
import { WRITER_GENERATION_SCHEMA } from '../../../src/llm/schemas/writer-schema';
import {
  WRITER_CHOICE_REQUIRED_FIELDS,
  WRITER_CHOICE_TYPE_ENUM,
  WRITER_EMOTION_INTENSITY_ENUM,
  WRITER_PRIMARY_DELTA_ENUM,
  WRITER_PROTAGONIST_AFFECT_REQUIRED_FIELDS,
  WRITER_REQUIRED_FIELDS,
  WRITER_SECONDARY_EMOTION_REQUIRED_FIELDS,
} from '../../../src/llm/writer-contract';
import { createEmptyActiveState } from '../../../src/models';

describe('contract centralization alignment', () => {
  it('keeps planner contract aligned with planner schema and prompt', () => {
    const schema = PAGE_PLANNER_GENERATION_SCHEMA.json_schema.schema as Record<string, unknown>;
    const props = schema['properties'] as Record<string, unknown>;
    const writerBrief = props['writerBrief'] as Record<string, unknown>;
    const choiceIntents = props['choiceIntents'] as Record<string, unknown>;
    const choiceItem = choiceIntents['items'] as Record<string, unknown>;
    const choiceProps = choiceItem['properties'] as Record<string, unknown>;

    expect(schema['required']).toEqual([...PAGE_PLANNER_REQUIRED_FIELDS]);
    expect(writerBrief['required']).toEqual([...PAGE_PLANNER_WRITER_BRIEF_REQUIRED_FIELDS]);
    expect(choiceItem['required']).toEqual([...PAGE_PLANNER_CHOICE_INTENT_REQUIRED_FIELDS]);
    expect((choiceProps['choiceType'] as Record<string, unknown>)['enum']).toEqual(
      PAGE_PLANNER_CHOICE_TYPE_ENUM
    );
    expect((choiceProps['primaryDelta'] as Record<string, unknown>)['enum']).toEqual(
      PAGE_PLANNER_PRIMARY_DELTA_ENUM
    );

    const messages = buildPagePlannerPrompt({
      mode: 'opening',
      characterConcept: 'A veteran courier with a debt.',
      worldbuilding: 'A fractured harbor city.',
      tone: 'Noir thriller',
    });
    const system = messages[0]?.content ?? '';
    for (const rule of PAGE_PLANNER_PROMPT_RULES) {
      expect(system).toContain(rule);
    }
  });

  it('keeps writer contract aligned with writer schema', () => {
    const schema = WRITER_GENERATION_SCHEMA.json_schema.schema as Record<string, unknown>;
    const props = schema['properties'] as Record<string, unknown>;
    const choices = props['choices'] as Record<string, unknown>;
    const choiceItem = choices['items'] as Record<string, unknown>;
    const choiceProps = choiceItem['properties'] as Record<string, unknown>;
    const protagonistAffect = props['protagonistAffect'] as Record<string, unknown>;
    const affectProps = protagonistAffect['properties'] as Record<string, unknown>;
    const secondaryEmotions = affectProps['secondaryEmotions'] as Record<string, unknown>;
    const secondaryItem = secondaryEmotions['items'] as Record<string, unknown>;
    const intensity = affectProps['primaryIntensity'] as Record<string, unknown>;

    expect(schema['required']).toEqual([...WRITER_REQUIRED_FIELDS]);
    expect(choiceItem['required']).toEqual([...WRITER_CHOICE_REQUIRED_FIELDS]);
    expect((choiceProps['choiceType'] as Record<string, unknown>)['enum']).toEqual(
      WRITER_CHOICE_TYPE_ENUM
    );
    expect((choiceProps['primaryDelta'] as Record<string, unknown>)['enum']).toEqual(
      WRITER_PRIMARY_DELTA_ENUM
    );
    expect(protagonistAffect['required']).toEqual([...WRITER_PROTAGONIST_AFFECT_REQUIRED_FIELDS]);
    expect(secondaryItem['required']).toEqual([...WRITER_SECONDARY_EMOTION_REQUIRED_FIELDS]);
    expect(intensity['enum']).toEqual([...WRITER_EMOTION_INTENSITY_ENUM]);
  });

  it('keeps lorekeeper contract aligned with lorekeeper schema and prompt', () => {
    const schema = LOREKEEPER_SCHEMA.json_schema.schema as Record<string, unknown>;
    const props = schema['properties'] as Record<string, unknown>;
    const characters = props['relevantCharacters'] as Record<string, unknown>;
    const characterItem = characters['items'] as Record<string, unknown>;

    expect(schema['required']).toEqual([...LOREKEEPER_REQUIRED_FIELDS]);
    expect(characterItem['required']).toEqual([...LOREKEEPER_CHARACTER_REQUIRED_FIELDS]);

    const messages = buildLorekeeperPrompt({
      characterConcept: 'A grifter detective.',
      worldbuilding: 'A city under permanent curfew.',
      tone: 'Neo-noir',
      globalCanon: [],
      globalCharacterCanon: {},
      accumulatedCharacterState: {},
      activeState: createEmptyActiveState(),
      ancestorSummaries: [],
      grandparentNarrative: null,
      previousNarrative: 'You enter the station lobby.',
      pagePlan: {
        sceneIntent: 'Interrogate the dock clerk.',
        continuityAnchors: [],
        dramaticQuestion: 'Will the clerk reveal the shipment route?',
        writerBrief: {
          openingLineDirective: 'Start with flickering lights.',
          mustIncludeBeats: [],
          forbiddenRecaps: [],
        },
        stateIntents: {
          currentLocation: '',
          threats: { add: [], removeIds: [] },
          constraints: { add: [], removeIds: [] },
          threads: { add: [], resolveIds: [] },
          inventory: { add: [], removeIds: [] },
          health: { add: [], removeIds: [] },
          characterState: { add: [], removeIds: [] },
          canon: { worldAdd: [], characterAdd: [] },
        },
        choiceIntents: [],
      },
    });
    const system = messages[0]?.content ?? '';
    for (const principle of LOREKEEPER_CURATION_PRINCIPLES) {
      expect(system).toContain(principle);
    }
  });
});
