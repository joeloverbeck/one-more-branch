import * as fs from 'fs';
import * as path from 'path';
import { AGENDA_RESOLVER_SCHEMA } from '../../../../src/llm/schemas/agenda-resolver-schema';
import { CHOICE_GENERATOR_SCHEMA } from '../../../../src/llm/schemas/choice-generator-schema';
import { CONCEPT_ARCHITECT_SCHEMA } from '../../../../src/llm/schemas/concept-architect-schema';
import { CONCEPT_ENGINEER_SCHEMA } from '../../../../src/llm/schemas/concept-engineer-schema';
import {
  CONCEPT_EVALUATION_DEEP_SCHEMA,
  CONCEPT_EVALUATION_SCORING_SCHEMA,
} from '../../../../src/llm/schemas/concept-evaluator-schema';
import { CONCEPT_EVOLUTION_SCHEMA } from '../../../../src/llm/schemas/concept-evolver-schema';
import { CONCEPT_IDEATION_SCHEMA } from '../../../../src/llm/schemas/concept-ideator-schema';
import { CONCEPT_SCENARIO_SCHEMA } from '../../../../src/llm/schemas/concept-scenario-schema';
import { CONCEPT_SEEDER_SCHEMA } from '../../../../src/llm/schemas/concept-seeder-schema';
import { CONCEPT_SINGLE_ENGINEER_SCHEMA } from '../../../../src/llm/schemas/concept-single-engineer-schema';
import {
  CONCEPT_SINGLE_SCORING_SCHEMA,
  CONCEPT_SINGLE_DEEP_EVAL_SCHEMA,
} from '../../../../src/llm/schemas/concept-single-evaluator-schema';
import { CONCEPT_SINGLE_SCENARIO_SCHEMA } from '../../../../src/llm/schemas/concept-single-scenario-schema';
import { CONCEPT_SINGLE_SPECIFICITY_SCHEMA } from '../../../../src/llm/schemas/concept-single-specificity-schema';
import { CONCEPT_SPECIFICITY_SCHEMA } from '../../../../src/llm/schemas/concept-specificity-schema';
import { CONCEPT_STRESS_TEST_SCHEMA } from '../../../../src/llm/schemas/concept-stress-tester-schema';
import { CHARACTER_CONTEXTUALIZATION_SCHEMA } from '../../../../src/llm/schemas/character-contextualizer-schema';
import { CHARACTER_DECOMPOSITION_SCHEMA } from '../../../../src/llm/schemas/character-decomposer-schema';
import { ENTITY_DECOMPOSITION_SCHEMA } from '../../../../src/llm/schemas/entity-decomposer-schema';
import { WORLDBUILDING_DECOMPOSITION_SCHEMA } from '../../../../src/llm/schemas/worldbuilding-decomposer-schema';
import {
  KERNEL_EVALUATION_DEEP_SCHEMA,
  KERNEL_EVALUATION_SCORING_SCHEMA,
} from '../../../../src/llm/schemas/kernel-evaluator-schema';
import { KERNEL_EVOLUTION_SCHEMA } from '../../../../src/llm/schemas/kernel-evolver-schema';
import { KERNEL_IDEATION_SCHEMA } from '../../../../src/llm/schemas/kernel-ideator-schema';
import { LOREKEEPER_SCHEMA } from '../../../../src/llm/schemas/lorekeeper-schema';
import { NPC_INTELLIGENCE_SCHEMA } from '../../../../src/llm/schemas/npc-intelligence-schema';
import { PAGE_PLANNER_GENERATION_SCHEMA } from '../../../../src/llm/schemas/page-planner-schema';
import { PROMISE_TRACKER_SCHEMA } from '../../../../src/llm/schemas/promise-tracker-schema';
import { PROSE_QUALITY_SCHEMA } from '../../../../src/llm/schemas/prose-quality-schema';
import { SCENE_IDEATOR_SCHEMA } from '../../../../src/llm/schemas/scene-ideator-schema';
import { SPINE_REWRITE_SCHEMA } from '../../../../src/llm/schemas/spine-rewrite-schema';
import { SPINE_GENERATION_SCHEMA } from '../../../../src/llm/schemas/spine-schema';
import { STATE_ACCOUNTANT_SCHEMA } from '../../../../src/llm/schemas/state-accountant-schema';
import { STRUCTURE_EVALUATOR_SCHEMA } from '../../../../src/llm/schemas/structure-evaluator-schema';
import { STRUCTURE_GENERATION_SCHEMA } from '../../../../src/llm/schemas/structure-schema';
import { WRITER_GENERATION_SCHEMA } from '../../../../src/llm/schemas/writer-schema';
import { CHARACTER_WEB_GENERATION_SCHEMA } from '../../../../src/llm/schemas/character-web-schema';
import { CHAR_KERNEL_GENERATION_SCHEMA } from '../../../../src/llm/schemas/char-kernel-schema';
import { CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA } from '../../../../src/llm/schemas/char-tridimensional-schema';
import { CHAR_AGENCY_GENERATION_SCHEMA } from '../../../../src/llm/schemas/char-agency-schema';
import { CHAR_RELATIONSHIPS_GENERATION_SCHEMA } from '../../../../src/llm/schemas/char-relationships-schema';
import { CHAR_PRESENTATION_GENERATION_SCHEMA } from '../../../../src/llm/schemas/char-presentation-schema';
import type { JsonSchema } from '../../../../src/llm/llm-client-types';

type SchemaIssue = {
  path: string;
  message: string;
};

function getJsonType(value: unknown): 'null' | 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  return 'object';
}

function getDeclaredTypes(typeValue: unknown): string[] {
  if (typeof typeValue === 'string') {
    return [typeValue];
  }
  if (Array.isArray(typeValue)) {
    return typeValue.filter((type): type is string => typeof type === 'string');
  }
  return [];
}

function findAnthropicArrayConstraintIssues(node: unknown, path: string, issues: SchemaIssue[]): void {
  if (typeof node !== 'object' || node === null) {
    return;
  }

  const record = node as Record<string, unknown>;
  if (record['type'] === 'array') {
    const minItems = record['minItems'];
    if (typeof minItems === 'number' && minItems !== 0 && minItems !== 1) {
      issues.push({
        path,
        message: `minItems must be 0 or 1 for Anthropic-compatible schemas (received ${minItems})`,
      });
    }

    if ('maxItems' in record) {
      issues.push({
        path,
        message: 'maxItems is not supported for Anthropic-compatible schemas',
      });
    }
  }

  for (const [key, value] of Object.entries(record)) {
    findAnthropicArrayConstraintIssues(value, `${path}.${key}`, issues);
  }
}

function findAnthropicIntegerConstraintIssues(node: unknown, path: string, issues: SchemaIssue[]): void {
  if (typeof node !== 'object' || node === null) {
    return;
  }

  const record = node as Record<string, unknown>;
  if (record['type'] === 'integer') {
    if ('minimum' in record) {
      issues.push({
        path,
        message: 'minimum is not supported for integer type in Anthropic-compatible schemas',
      });
    }

    if ('maximum' in record) {
      issues.push({
        path,
        message: 'maximum is not supported for integer type in Anthropic-compatible schemas',
      });
    }
  }

  for (const [key, value] of Object.entries(record)) {
    findAnthropicIntegerConstraintIssues(value, `${path}.${key}`, issues);
  }
}

function findAnthropicStringConstraintIssues(node: unknown, path: string, issues: SchemaIssue[]): void {
  if (typeof node !== 'object' || node === null) {
    return;
  }

  const record = node as Record<string, unknown>;
  if (record['type'] === 'string') {
    const minLength = record['minLength'];
    if (typeof minLength === 'number' && minLength !== 0 && minLength !== 1) {
      issues.push({
        path,
        message: `minLength must be 0 or 1 for Anthropic-compatible schemas (received ${minLength})`,
      });
    }

    if ('maxLength' in record) {
      issues.push({
        path,
        message: 'maxLength is not supported for Anthropic-compatible schemas',
      });
    }
  }

  for (const [key, value] of Object.entries(record)) {
    findAnthropicStringConstraintIssues(value, `${path}.${key}`, issues);
  }
}

function findEnumTypeIssues(node: unknown, path: string, issues: SchemaIssue[]): void {
  if (typeof node !== 'object' || node === null) {
    return;
  }

  const record = node as Record<string, unknown>;
  const declaredTypes = getDeclaredTypes(record['type']);
  const enumValues = Array.isArray(record['enum']) ? record['enum'] : null;

  if (declaredTypes.length > 0 && enumValues) {
    for (const enumValue of enumValues) {
      const enumType = getJsonType(enumValue);
      const matchesType =
        declaredTypes.includes(enumType) || (enumType === 'integer' && declaredTypes.includes('number'));
      if (!matchesType) {
        issues.push({
          path,
          message: `enum value ${JSON.stringify(enumValue)} does not match declared type(s) [${declaredTypes.join(', ')}]`,
        });
      }
    }

    const hasNullInEnum = enumValues.some((enumValue) => enumValue === null);
    const hasNonNullInEnum = enumValues.some((enumValue) => enumValue !== null);
    const isNullableUnion = declaredTypes.includes('null') && declaredTypes.length > 1;
    if (isNullableUnion && hasNullInEnum && hasNonNullInEnum) {
      issues.push({
        path,
        message:
          'nullable enums should use anyOf/oneOf branches instead of mixed enum values for Anthropic/Bedrock compatibility',
      });
    }
  }

  for (const [key, value] of Object.entries(record)) {
    findEnumTypeIssues(value, `${path}.${key}`, issues);
  }
}

function getIssues(schema: JsonSchema): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  findAnthropicArrayConstraintIssues(schema.json_schema.schema, 'schema', issues);
  findAnthropicIntegerConstraintIssues(schema.json_schema.schema, 'schema', issues);
  findAnthropicStringConstraintIssues(schema.json_schema.schema, 'schema', issues);
  findEnumTypeIssues(schema.json_schema.schema, 'schema', issues);
  return issues;
}

function isJsonSchemaShape(value: unknown): value is JsonSchema {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>)['type'] === 'json_schema' &&
    typeof (value as Record<string, unknown>)['json_schema'] === 'object' &&
    (value as Record<string, unknown>)['json_schema'] !== null
  );
}

describe('Anthropic schema compatibility', () => {
  const llmResponseSchemas: Array<{ name: string; schema: JsonSchema }> = [
    { name: 'WRITER_GENERATION_SCHEMA', schema: WRITER_GENERATION_SCHEMA },
    { name: 'STRUCTURE_GENERATION_SCHEMA', schema: STRUCTURE_GENERATION_SCHEMA },
    { name: 'PAGE_PLANNER_GENERATION_SCHEMA', schema: PAGE_PLANNER_GENERATION_SCHEMA },
    { name: 'STATE_ACCOUNTANT_SCHEMA', schema: STATE_ACCOUNTANT_SCHEMA },
    { name: 'LOREKEEPER_SCHEMA', schema: LOREKEEPER_SCHEMA },
    { name: 'AGENDA_RESOLVER_SCHEMA', schema: AGENDA_RESOLVER_SCHEMA },
    { name: 'CHOICE_GENERATOR_SCHEMA', schema: CHOICE_GENERATOR_SCHEMA },
    { name: 'SPINE_GENERATION_SCHEMA', schema: SPINE_GENERATION_SCHEMA },
    { name: 'SPINE_REWRITE_SCHEMA', schema: SPINE_REWRITE_SCHEMA },
    { name: 'ENTITY_DECOMPOSITION_SCHEMA', schema: ENTITY_DECOMPOSITION_SCHEMA },
    { name: 'CHARACTER_DECOMPOSITION_SCHEMA', schema: CHARACTER_DECOMPOSITION_SCHEMA },
    { name: 'CHARACTER_CONTEXTUALIZATION_SCHEMA', schema: CHARACTER_CONTEXTUALIZATION_SCHEMA },
    { name: 'WORLDBUILDING_DECOMPOSITION_SCHEMA', schema: WORLDBUILDING_DECOMPOSITION_SCHEMA },
    { name: 'CONCEPT_IDEATION_SCHEMA', schema: CONCEPT_IDEATION_SCHEMA },
    { name: 'CONCEPT_STRESS_TEST_SCHEMA', schema: CONCEPT_STRESS_TEST_SCHEMA },
    { name: 'KERNEL_IDEATION_SCHEMA', schema: KERNEL_IDEATION_SCHEMA },
    { name: 'KERNEL_EVALUATION_SCORING_SCHEMA', schema: KERNEL_EVALUATION_SCORING_SCHEMA },
    { name: 'KERNEL_EVALUATION_DEEP_SCHEMA', schema: KERNEL_EVALUATION_DEEP_SCHEMA },
    { name: 'CONCEPT_EVALUATION_SCORING_SCHEMA', schema: CONCEPT_EVALUATION_SCORING_SCHEMA },
    { name: 'CONCEPT_EVALUATION_DEEP_SCHEMA', schema: CONCEPT_EVALUATION_DEEP_SCHEMA },
    { name: 'CONCEPT_EVOLUTION_SCHEMA', schema: CONCEPT_EVOLUTION_SCHEMA },
    { name: 'CONCEPT_ARCHITECT_SCHEMA', schema: CONCEPT_ARCHITECT_SCHEMA },
    { name: 'CONCEPT_ENGINEER_SCHEMA', schema: CONCEPT_ENGINEER_SCHEMA },
    { name: 'CONCEPT_SINGLE_ENGINEER_SCHEMA', schema: CONCEPT_SINGLE_ENGINEER_SCHEMA },
    { name: 'CONCEPT_SINGLE_SCORING_SCHEMA', schema: CONCEPT_SINGLE_SCORING_SCHEMA },
    { name: 'CONCEPT_SINGLE_DEEP_EVAL_SCHEMA', schema: CONCEPT_SINGLE_DEEP_EVAL_SCHEMA },
    { name: 'CONCEPT_SINGLE_SCENARIO_SCHEMA', schema: CONCEPT_SINGLE_SCENARIO_SCHEMA },
    { name: 'CONCEPT_SINGLE_SPECIFICITY_SCHEMA', schema: CONCEPT_SINGLE_SPECIFICITY_SCHEMA },
    { name: 'CONCEPT_SCENARIO_SCHEMA', schema: CONCEPT_SCENARIO_SCHEMA },
    { name: 'CONCEPT_SPECIFICITY_SCHEMA', schema: CONCEPT_SPECIFICITY_SCHEMA },
    { name: 'CONCEPT_SEEDER_SCHEMA', schema: CONCEPT_SEEDER_SCHEMA },
    { name: 'KERNEL_EVOLUTION_SCHEMA', schema: KERNEL_EVOLUTION_SCHEMA },
    { name: 'NPC_INTELLIGENCE_SCHEMA', schema: NPC_INTELLIGENCE_SCHEMA },
    { name: 'PROMISE_TRACKER_SCHEMA', schema: PROMISE_TRACKER_SCHEMA },
    { name: 'PROSE_QUALITY_SCHEMA', schema: PROSE_QUALITY_SCHEMA },
    { name: 'SCENE_IDEATOR_SCHEMA', schema: SCENE_IDEATOR_SCHEMA },
    { name: 'STRUCTURE_EVALUATOR_SCHEMA', schema: STRUCTURE_EVALUATOR_SCHEMA },
    { name: 'CHARACTER_WEB_GENERATION_SCHEMA', schema: CHARACTER_WEB_GENERATION_SCHEMA },
    { name: 'CHAR_KERNEL_GENERATION_SCHEMA', schema: CHAR_KERNEL_GENERATION_SCHEMA },
    { name: 'CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA', schema: CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA },
    { name: 'CHAR_AGENCY_GENERATION_SCHEMA', schema: CHAR_AGENCY_GENERATION_SCHEMA },
    { name: 'CHAR_RELATIONSHIPS_GENERATION_SCHEMA', schema: CHAR_RELATIONSHIPS_GENERATION_SCHEMA },
    { name: 'CHAR_PRESENTATION_GENERATION_SCHEMA', schema: CHAR_PRESENTATION_GENERATION_SCHEMA },
  ];

  it.each(llmResponseSchemas)('%s should satisfy Anthropic schema compatibility checks', ({ schema }) => {
    expect(getIssues(schema)).toEqual([]);
  });

  it('should include every static JsonSchema export from src/llm/schemas/', () => {
    const schemasDir = path.resolve(__dirname, '../../../../src/llm/schemas');
    const schemaFiles = fs.readdirSync(schemasDir).filter(
      (f) => f.endsWith('-schema.ts') && !f.endsWith('-validation-schema.ts'),
    );

    const registeredNames = new Set(llmResponseSchemas.map((entry) => entry.name));
    const missingSchemas: string[] = [];

    for (const file of schemaFiles) {
      const filePath = path.join(schemasDir, file);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(filePath) as Record<string, unknown>;

      for (const [exportName, exportValue] of Object.entries(mod)) {
        if (isJsonSchemaShape(exportValue) && !registeredNames.has(exportName)) {
          missingSchemas.push(`${exportName} (from ${file})`);
        }
      }
    }

    expect(missingSchemas).toEqual([]);
  });
});
