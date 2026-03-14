import { MILESTONE_GENERATION_SCHEMA } from '../../../../src/llm/schemas/milestone-generation-schema';

describe('MILESTONE_GENERATION_SCHEMA', () => {
  it('defines a strict OpenRouter json_schema response format', () => {
    expect(MILESTONE_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(MILESTONE_GENERATION_SCHEMA.json_schema.name).toBe('milestone_generation');
    expect(MILESTONE_GENERATION_SCHEMA.json_schema.strict).toBe(true);
  });

  it('avoids Anthropic-incompatible array cardinality keywords', () => {
    const schemaStr = JSON.stringify(MILESTONE_GENERATION_SCHEMA);

    expect(schemaStr).not.toMatch(/"minItems":\s*[2-9]/);
    expect(schemaStr).not.toMatch(/"maxItems"/);
  });

  it('requires actIndex plus all canonical milestone fields', () => {
    const schema = MILESTONE_GENERATION_SCHEMA.json_schema.schema as {
      required: string[];
      properties: {
        acts: {
          items: {
            required: string[];
            properties: {
              milestones: {
                items: {
                  required: string[];
                };
              };
            };
          };
        };
      };
    };

    expect(schema.required).toEqual(['acts']);
    expect(schema.properties.acts.items.required).toEqual(['actIndex', 'milestones']);
    expect(schema.properties.acts.items.properties.milestones.items.required).toEqual([
      'name',
      'description',
      'objective',
      'causalLink',
      'exitCondition',
      'role',
      'escalationType',
      'secondaryEscalationType',
      'crisisType',
      'expectedGapMagnitude',
      'isMidpoint',
      'midpointType',
      'uniqueScenarioHook',
      'approachVectors',
      'setpieceSourceIndex',
      'obligatorySceneTag',
    ]);
  });

  it('documents runtime-validated act and milestone cardinality constraints', () => {
    const schema = MILESTONE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          description: string;
          items: {
            properties: {
              milestones: {
                description: string;
              };
            };
          };
        };
      };
    };

    expect(schema.properties.acts.description).toContain('One item per macro act');
    expect(schema.properties.acts.items.properties.milestones.description).toContain('2-4 milestones');
  });
});
