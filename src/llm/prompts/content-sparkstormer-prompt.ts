import type { SparkstormerContext } from '../../models/content-packet.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO = `You are a divergent-imagination engine for branching interactive fiction. Given a taste profile, you generate 30-40 raw sparks -- compact blasts of story matter that imply desire, danger, social consequence, and branching play.

Each spark is 1-2 sentences max. A spark is NOT a plot summary -- it is a charged fragment: a person in a situation where something must give. Think of each spark as a seed that could grow into dozens of different stories depending on the choices a player makes.`;

const RULES = `RULES:
- Generate 30-40 sparks. Each spark must be unique and divergent from the others.
- Every spark must imply at least two of: desire, danger, social consequence, branching pressure.
- Honour the taste profile: lean into its collision patterns, favored mechanisms, tone blend, and scene appetites.
- Respect antiPatterns and surfaceDoNotRepeat -- avoid anything that matches those lists.
- Match the riskAppetite level: LOW = suggestive tension, MAXIMAL = explicit extremity.
- Each spark needs a contentKind from: ENTITY, INSTITUTION, RELATIONSHIP, TRANSFORMATION, WORLD_INTRUSION, RITUAL, POLICY, JOB, SUBCULTURE, ECONOMY.
- imageSeed: a single vivid image (object, gesture, tableau) that anchors the spark visually.
- collisionTags: 2-5 thematic tags that describe what this spark collides with (used for later cross-pollination).
- sparkId: a unique identifier in the format "spark-NN" (e.g., "spark-01", "spark-02").
- Do NOT write generic fantasy/sci-fi prompts. Every spark must feel specific, human, and charged.`;

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function buildSparkstormerPrompt(context: SparkstormerContext): ChatMessage[] {
  const kernelBlock = normalize(context.kernelBlock);
  const contentPreferences = normalize(context.contentPreferences);

  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, RULES];

  const userSections: string[] = [
    'Generate 30-40 divergent sparks from the taste profile below.',
    `TASTE PROFILE:\n${JSON.stringify(context.tasteProfile, null, 2)}`,
  ];

  if (kernelBlock) {
    userSections.push(`STORY KERNEL (use as gravitational anchor, not a constraint):\n${kernelBlock}`);
  }

  if (contentPreferences) {
    userSections.push(`CONTENT PREFERENCES:\n${contentPreferences}`);
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching exactly: { "sparks": [ ... ] }
- Each spark object must have: sparkId, contentKind, spark, imageSeed, collisionTags.
- sparkId format: "spark-01", "spark-02", etc.
- 30-40 sparks total.`,
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
