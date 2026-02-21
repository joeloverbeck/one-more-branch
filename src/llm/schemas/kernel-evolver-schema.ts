import type { JsonSchema } from '../llm-client-types.js';
import { KERNEL_SCHEMA } from './kernel-ideator-schema.js';

export const KERNEL_EVOLUTION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'kernel_evolution',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['kernels'],
      properties: {
        kernels: {
          type: 'array',
          description:
            'Generate exactly 6 evolved kernels. Count is enforced by runtime validation.',
          items: KERNEL_SCHEMA,
        },
      },
    },
  },
};
