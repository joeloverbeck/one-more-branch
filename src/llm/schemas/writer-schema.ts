import type { JsonSchema } from '../llm-client-types.js';

export const WRITER_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'writer_generation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        narrative: {
          type: 'string',
          description:
            'Vivid prose describing scene, action, dialogue, and outcomes. Minimum 100 words. Write in second person.',
        },
        choices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description:
                  'The choice text the player sees. Start with a verb. 3-300 characters.',
              },
              choiceType: {
                type: 'string',
                enum: [
                  'TACTICAL_APPROACH',
                  'MORAL_DILEMMA',
                  'IDENTITY_EXPRESSION',
                  'RELATIONSHIP_SHIFT',
                  'RESOURCE_COMMITMENT',
                  'INVESTIGATION',
                  'PATH_DIVERGENCE',
                  'CONFRONTATION',
                  'AVOIDANCE_RETREAT',
                ],
                description:
                  'What this choice is ABOUT. TACTICAL_APPROACH=method/tactic, MORAL_DILEMMA=value conflict, IDENTITY_EXPRESSION=self-definition, RELATIONSHIP_SHIFT=changing a relationship, RESOURCE_COMMITMENT=spending/risking something scarce, INVESTIGATION=examining/learning/revealing, PATH_DIVERGENCE=fundamentally different direction, CONFRONTATION=engaging/fighting, AVOIDANCE_RETREAT=fleeing/hiding/de-escalating.',
              },
              primaryDelta: {
                type: 'string',
                enum: [
                  'LOCATION_CHANGE',
                  'GOAL_SHIFT',
                  'RELATIONSHIP_CHANGE',
                  'URGENCY_CHANGE',
                  'ITEM_CONTROL',
                  'EXPOSURE_CHANGE',
                  'CONDITION_CHANGE',
                  'INFORMATION_REVEALED',
                  'THREAT_SHIFT',
                  'CONSTRAINT_CHANGE',
                ],
                description:
                  'What this choice primarily CHANGES in the world. LOCATION_CHANGE=protagonist moves, GOAL_SHIFT=objective changes, RELATIONSHIP_CHANGE=NPC stance shifts, URGENCY_CHANGE=time pressure shifts, ITEM_CONTROL=significant object changes hands, EXPOSURE_CHANGE=attention/suspicion changes, CONDITION_CHANGE=physical condition changes, INFORMATION_REVEALED=new knowledge gained, THREAT_SHIFT=danger introduced/neutralized, CONSTRAINT_CHANGE=limitation imposed/lifted.',
              },
            },
            required: ['text', 'choiceType', 'primaryDelta'],
            additionalProperties: false,
          },
          description:
            'Array of 2-4 structured choice objects. Each choice MUST have a different choiceType OR primaryDelta from all other choices. INVARIANT: 2-4 choices if isEnding=false; exactly 0 if isEnding=true. Typically 3 choices; add a 4th only when truly warranted.',
        },
        protagonistAffect: {
          type: 'object',
          properties: {
            primaryEmotion: {
              type: 'string',
              description:
                'The dominant feeling driving the protagonist at the END of this scene (e.g., "fear", "attraction", "guilt", "determination").',
            },
            primaryIntensity: {
              type: 'string',
              enum: ['mild', 'moderate', 'strong', 'overwhelming'],
              description: 'How intensely the protagonist feels the primary emotion.',
            },
            primaryCause: {
              type: 'string',
              description: 'What is causing this emotion (brief, specific to this scene).',
            },
            secondaryEmotions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  emotion: { type: 'string' },
                  cause: { type: 'string' },
                },
                required: ['emotion', 'cause'],
                additionalProperties: false,
              },
              description: 'Optional background feelings with their causes.',
            },
            dominantMotivation: {
              type: 'string',
              description: 'What the protagonist most wants right now.',
            },
          },
          required: [
            'primaryEmotion',
            'primaryIntensity',
            'primaryCause',
            'secondaryEmotions',
            'dominantMotivation',
          ],
          additionalProperties: false,
          description:
            'Snapshot of protagonist emotional state at END of this scene. NOT accumulated - fresh snapshot each page.',
        },
        sceneSummary: {
          type: 'string',
          description:
            'A 2-3 sentence factual summary of what happened in this scene. Focus on key events, decisions made, and consequences. This will be used as context for future scenes, so emphasize plot-relevant facts over atmospheric details.',
        },
        isEnding: {
          type: 'boolean',
          description: 'True only when the story concludes and choices is empty.',
        },
      },
      required: ['narrative', 'choices', 'protagonistAffect', 'sceneSummary', 'isEnding'],
      additionalProperties: false,
    },
  },
};
