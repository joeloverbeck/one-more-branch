import { STRUCTURE_GENERATION_SCHEMA } from '../../../../src/llm/schemas/structure-schema';

describe('STRUCTURE_GENERATION_SCHEMA', () => {
  it('should define strict OpenRouter json_schema response format', () => {
    expect(STRUCTURE_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(STRUCTURE_GENERATION_SCHEMA.json_schema.name).toBe('story_structure_generation');
    expect(STRUCTURE_GENERATION_SCHEMA.json_schema.strict).toBe(true);
  });

  it('should not use minItems > 1 or maxItems (unsupported by Anthropic)', () => {
    const schemaStr = JSON.stringify(STRUCTURE_GENERATION_SCHEMA);
    // Anthropic only supports minItems: 0 or 1
    expect(schemaStr).not.toMatch(/"minItems":\s*[2-9]/);
    expect(schemaStr).not.toMatch(/"maxItems"/);
  });

  it('should document array constraints in descriptions (runtime validated)', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          description: string;
          items: { properties: { beats: { description: string } } };
        };
      };
    };

    expect(schema.properties.acts.description).toContain('3-5 acts');
    expect(schema.properties.acts.items.properties.beats.description).toContain('2-4');
  });

  it('should require all act and beat fields', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            required: string[];
            properties: { beats: { items: { required: string[] } } };
          };
        };
      };
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'overallTheme',
      'premise',
      'openingImage',
      'closingImage',
      'pacingBudget',
      'acts',
      'initialNpcAgendas',
    ]);
    expect(schema.properties.acts.items.required).toEqual([
      'name',
      'objective',
      'stakes',
      'entryCondition',
      'beats',
    ]);
    expect(schema.properties.acts.items.properties.beats.items.required).toEqual([
      'name',
      'description',
      'objective',
      'causalLink',
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
    expect(schema.additionalProperties).toBe(false);
  });

  it('should include premise as a string property', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        premise: { type: string; description: string };
        openingImage: { type: string };
        closingImage: { type: string };
      };
    };

    expect(schema.properties.premise.type).toBe('string');
    expect(schema.properties.premise.description).toContain('dramatic question');
    expect(schema.properties.openingImage.type).toBe('string');
    expect(schema.properties.closingImage.type).toBe('string');
  });

  it('should include pacingBudget as an object with targetPagesMin and targetPagesMax', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        pacingBudget: {
          type: string;
          required: string[];
          properties: {
            targetPagesMin: { type: string };
            targetPagesMax: { type: string };
          };
        };
      };
    };

    expect(schema.properties.pacingBudget.type).toBe('object');
    expect(schema.properties.pacingBudget.required).toEqual(['targetPagesMin', 'targetPagesMax']);
    expect(schema.properties.pacingBudget.properties.targetPagesMin.type).toBe('number');
    expect(schema.properties.pacingBudget.properties.targetPagesMax.type).toBe('number');
  });

  it('should include beat role as an enum of dramatic function values', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    role: { type: string; enum: string[] };
                  };
                };
              };
            };
          };
        };
      };
    };

    const roleSchema = schema.properties.acts.items.properties.beats.items.properties.role;
    expect(roleSchema.type).toBe('string');
    expect(roleSchema.enum).toEqual([
      'setup',
      'escalation',
      'turning_point',
      'reflection',
      'resolution',
    ]);
  });

  it('should define causalLink as a required string', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    causalLink: { type: string; description: string };
                  };
                };
              };
            };
          };
        };
      };
    };

    const causalLinkSchema =
      schema.properties.acts.items.properties.beats.items.properties.causalLink;
    expect(causalLinkSchema.type).toBe('string');
    expect(causalLinkSchema.description).toContain('cause');
  });

  it('should define escalationType with a nullable anyOf enum for provider compatibility', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    escalationType: {
                      anyOf: Array<{ type: string; enum?: string[] }>;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const escalationTypeSchema =
      schema.properties.acts.items.properties.beats.items.properties.escalationType;
    expect(escalationTypeSchema.anyOf).toEqual([
      {
        type: 'string',
        enum: [
          'THREAT_ESCALATION',
          'REVELATION_SHIFT',
          'REVERSAL_OF_FORTUNE',
          'BETRAYAL_OR_ALLIANCE_SHIFT',
          'RESOURCE_OR_CAPABILITY_LOSS',
          'MORAL_OR_ETHICAL_PRESSURE',
          'TEMPORAL_OR_ENVIRONMENTAL_PRESSURE',
          'COMPLICATION_CASCADE',
          'COMPETENCE_DEMAND_SPIKE',
        ],
      },
      { type: 'null' },
    ]);
  });

  it('should define secondaryEscalationType with a nullable anyOf enum', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    secondaryEscalationType: {
                      anyOf: Array<{ type: string; enum?: string[] }>;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const secondaryEscalationTypeSchema =
      schema.properties.acts.items.properties.beats.items.properties.secondaryEscalationType;
    expect(secondaryEscalationTypeSchema.anyOf).toEqual([
      {
        type: 'string',
        enum: [
          'THREAT_ESCALATION',
          'REVELATION_SHIFT',
          'REVERSAL_OF_FORTUNE',
          'BETRAYAL_OR_ALLIANCE_SHIFT',
          'RESOURCE_OR_CAPABILITY_LOSS',
          'MORAL_OR_ETHICAL_PRESSURE',
          'TEMPORAL_OR_ENVIRONMENTAL_PRESSURE',
          'COMPLICATION_CASCADE',
          'COMPETENCE_DEMAND_SPIKE',
        ],
      },
      { type: 'null' },
    ]);
  });

  it('should define setpieceSourceIndex as nullable integer enum 0-5', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    setpieceSourceIndex: {
                      anyOf: Array<{ type: string; enum?: number[] }>;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const setpieceSourceIndexSchema =
      schema.properties.acts.items.properties.beats.items.properties.setpieceSourceIndex;

    expect(setpieceSourceIndexSchema.anyOf).toEqual([
      { type: 'integer', enum: [0, 1, 2, 3, 4, 5] },
      { type: 'null' },
    ]);
  });

  it('should define obligatorySceneTag as nullable string', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    obligatorySceneTag: {
                      anyOf: Array<{ type: string }>;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const obligatorySceneTagSchema =
      schema.properties.acts.items.properties.beats.items.properties.obligatorySceneTag;
    expect(obligatorySceneTagSchema.anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
  });

  it('should define crisisType with a nullable anyOf enum', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    crisisType: {
                      anyOf: Array<{ type: string; enum?: string[] }>;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const crisisTypeSchema =
      schema.properties.acts.items.properties.beats.items.properties.crisisType;
    expect(crisisTypeSchema.anyOf).toEqual([
      {
        type: 'string',
        enum: ['BEST_BAD_CHOICE', 'IRRECONCILABLE_GOODS'],
      },
      { type: 'null' },
    ]);
  });

  it('should define expectedGapMagnitude with a nullable anyOf enum', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    expectedGapMagnitude: {
                      anyOf: Array<{ type: string; enum?: string[] }>;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const expectedGapMagnitudeSchema =
      schema.properties.acts.items.properties.beats.items.properties.expectedGapMagnitude;
    expect(expectedGapMagnitudeSchema.anyOf).toEqual([
      {
        type: 'string',
        enum: ['NARROW', 'MODERATE', 'WIDE', 'CHASM'],
      },
      { type: 'null' },
    ]);
  });

  it('should define isMidpoint as a required boolean', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    isMidpoint: { type: string; description: string };
                  };
                };
              };
            };
          };
        };
      };
    };

    const isMidpointSchema =
      schema.properties.acts.items.properties.beats.items.properties.isMidpoint;
    expect(isMidpointSchema.type).toBe('boolean');
    expect(isMidpointSchema.description).toContain('midpoint');
  });

  it('should define midpointType with a nullable anyOf enum', () => {
    const schema = STRUCTURE_GENERATION_SCHEMA.json_schema.schema as {
      properties: {
        acts: {
          items: {
            properties: {
              beats: {
                items: {
                  properties: {
                    midpointType: {
                      anyOf: Array<{ type: string; enum?: string[] }>;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const midpointTypeSchema =
      schema.properties.acts.items.properties.beats.items.properties.midpointType;
    expect(midpointTypeSchema.anyOf).toEqual([
      {
        type: 'string',
        enum: ['FALSE_VICTORY', 'FALSE_DEFEAT'],
      },
      { type: 'null' },
    ]);
  });
});
