import {
  AGENCY_PRINCIPLES,
  CHARACTER_ARRAY_FIELDS,
  CHARACTER_STRING_FIELDS,
  CHARACTER_REQUIRED_FIELDS,
  SPEECH_ARRAY_FIELDS,
  SPEECH_EXTRACTION_BULLETS,
  SPEECH_REQUIRED_FIELDS,
  SPEECH_STRING_FIELDS,
} from '../../../src/llm/entity-decomposition-contract';
import type { EntityDecomposerContext } from '../../../src/llm/entity-decomposer-types';
import { buildEntityDecomposerPrompt } from '../../../src/llm/prompts/entity-decomposer-prompt';
import { ENTITY_DECOMPOSITION_SCHEMA } from '../../../src/llm/schemas/entity-decomposer-schema';

function buildContext(): EntityDecomposerContext {
  return {
    characterConcept: 'A former bodyguard turned courier.',
    worldbuilding: 'A city-state split by factional debt wars.',
    tone: 'Neo-noir intrigue',
    npcs: [{ name: 'Iris', description: 'A fixer with contradictory loyalties.' }],
  };
}

describe('entity-decomposition-contract alignment', () => {
  it('keeps speech field sets aligned across parser/schema contract lists', () => {
    const speechSet = new Set([...SPEECH_STRING_FIELDS, ...SPEECH_ARRAY_FIELDS]);
    expect(speechSet).toEqual(new Set(SPEECH_REQUIRED_FIELDS));
  });

  it('keeps character field sets aligned across parser/schema contract lists', () => {
    const characterSet = new Set([...CHARACTER_ARRAY_FIELDS, ...CHARACTER_STRING_FIELDS]);
    expect(characterSet).toEqual(
      new Set(
        CHARACTER_REQUIRED_FIELDS.filter(
          (field) => field !== 'name' && field !== 'protagonistRelationship'
        )
      )
    );
  });

  it('projects contract-required fields into the JSON schema', () => {
    const schema = ENTITY_DECOMPOSITION_SCHEMA.json_schema.schema as Record<string, unknown>;
    const characters = (schema['properties'] as Record<string, unknown>)['characters'] as Record<
      string,
      unknown
    >;
    const characterItem = (characters['items'] as Record<string, unknown>);
    const characterRequired = characterItem['required'] as string[];
    const characterProps = characterItem['properties'] as Record<string, unknown>;
    const speech = characterProps['speechFingerprint'] as Record<string, unknown>;

    expect(characterRequired).toEqual([...CHARACTER_REQUIRED_FIELDS, 'speechFingerprint']);
    expect((speech['required'] as string[])).toEqual([...SPEECH_REQUIRED_FIELDS]);
    expect(Object.keys(speech['properties'] as Record<string, unknown>)).toEqual([
      ...SPEECH_REQUIRED_FIELDS,
    ]);
  });

  it('projects contract guidance into the system prompt', () => {
    const prompt = buildEntityDecomposerPrompt(buildContext());
    const system = prompt[0]?.content ?? '';

    for (const bullet of SPEECH_EXTRACTION_BULLETS) {
      expect(system).toContain(bullet);
    }

    for (const principle of AGENCY_PRINCIPLES) {
      expect(system).toContain(principle);
    }
  });
});
