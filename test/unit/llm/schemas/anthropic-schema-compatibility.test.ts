import { AGENDA_RESOLVER_SCHEMA } from '../../../../src/llm/schemas/agenda-resolver-schema';
import { ANALYST_SCHEMA } from '../../../../src/llm/schemas/analyst-schema';
import {
  CONCEPT_EVALUATION_DEEP_SCHEMA,
  CONCEPT_EVALUATION_SCORING_SCHEMA,
} from '../../../../src/llm/schemas/concept-evaluator-schema';
import { CONCEPT_EVOLUTION_SCHEMA } from '../../../../src/llm/schemas/concept-evolver-schema';
import { CONCEPT_IDEATION_SCHEMA } from '../../../../src/llm/schemas/concept-ideator-schema';
import { CONCEPT_STRESS_TEST_SCHEMA } from '../../../../src/llm/schemas/concept-stress-tester-schema';
import { ENTITY_DECOMPOSITION_SCHEMA } from '../../../../src/llm/schemas/entity-decomposer-schema';
import {
  KERNEL_EVALUATION_DEEP_SCHEMA,
  KERNEL_EVALUATION_SCORING_SCHEMA,
} from '../../../../src/llm/schemas/kernel-evaluator-schema';
import { KERNEL_IDEATION_SCHEMA } from '../../../../src/llm/schemas/kernel-ideator-schema';
import { LOREKEEPER_SCHEMA } from '../../../../src/llm/schemas/lorekeeper-schema';
import { PAGE_PLANNER_GENERATION_SCHEMA } from '../../../../src/llm/schemas/page-planner-schema';
import { SPINE_REWRITE_SCHEMA } from '../../../../src/llm/schemas/spine-rewrite-schema';
import { SPINE_GENERATION_SCHEMA } from '../../../../src/llm/schemas/spine-schema';
import { STATE_ACCOUNTANT_SCHEMA } from '../../../../src/llm/schemas/state-accountant-schema';
import { STRUCTURE_GENERATION_SCHEMA } from '../../../../src/llm/schemas/structure-schema';
import { WRITER_GENERATION_SCHEMA } from '../../../../src/llm/schemas/writer-schema';
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
  findEnumTypeIssues(schema.json_schema.schema, 'schema', issues);
  return issues;
}

describe('Anthropic schema compatibility', () => {
  const llmResponseSchemas: Array<{ name: string; schema: JsonSchema }> = [
    { name: 'WRITER_GENERATION_SCHEMA', schema: WRITER_GENERATION_SCHEMA },
    { name: 'ANALYST_SCHEMA', schema: ANALYST_SCHEMA },
    { name: 'STRUCTURE_GENERATION_SCHEMA', schema: STRUCTURE_GENERATION_SCHEMA },
    { name: 'PAGE_PLANNER_GENERATION_SCHEMA', schema: PAGE_PLANNER_GENERATION_SCHEMA },
    { name: 'STATE_ACCOUNTANT_SCHEMA', schema: STATE_ACCOUNTANT_SCHEMA },
    { name: 'LOREKEEPER_SCHEMA', schema: LOREKEEPER_SCHEMA },
    { name: 'AGENDA_RESOLVER_SCHEMA', schema: AGENDA_RESOLVER_SCHEMA },
    { name: 'SPINE_GENERATION_SCHEMA', schema: SPINE_GENERATION_SCHEMA },
    { name: 'SPINE_REWRITE_SCHEMA', schema: SPINE_REWRITE_SCHEMA },
    { name: 'ENTITY_DECOMPOSITION_SCHEMA', schema: ENTITY_DECOMPOSITION_SCHEMA },
    { name: 'CONCEPT_IDEATION_SCHEMA', schema: CONCEPT_IDEATION_SCHEMA },
    { name: 'CONCEPT_STRESS_TEST_SCHEMA', schema: CONCEPT_STRESS_TEST_SCHEMA },
    { name: 'KERNEL_IDEATION_SCHEMA', schema: KERNEL_IDEATION_SCHEMA },
    { name: 'KERNEL_EVALUATION_SCORING_SCHEMA', schema: KERNEL_EVALUATION_SCORING_SCHEMA },
    { name: 'KERNEL_EVALUATION_DEEP_SCHEMA', schema: KERNEL_EVALUATION_DEEP_SCHEMA },
    { name: 'CONCEPT_EVALUATION_SCORING_SCHEMA', schema: CONCEPT_EVALUATION_SCORING_SCHEMA },
    { name: 'CONCEPT_EVALUATION_DEEP_SCHEMA', schema: CONCEPT_EVALUATION_DEEP_SCHEMA },
    { name: 'CONCEPT_EVOLUTION_SCHEMA', schema: CONCEPT_EVOLUTION_SCHEMA },
  ];

  it.each(llmResponseSchemas)('%s should satisfy Anthropic schema compatibility checks', ({ schema }) => {
    expect(getIssues(schema)).toEqual([]);
  });
});
