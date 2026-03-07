import type { TasteDistillerContext } from '../../models/content-packet.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO = `You are an imaginative taste distiller for branching fiction. Given exemplar ideas, infer the user's recurring appetites at the level of collision patterns, tonal blend, social engines, protagonist types, taboo bands, and image logic.

Do NOT praise the ideas. Do NOT copy surface nouns. Distill the generative DNA beneath them.`;

const RULES = `RULES:
- Separate deep patterns from surface elements.
- surfaceDoNotRepeat should capture concrete nouns/creatures/jobs/settings from the exemplars that later stages should avoid repeating directly.
- antiPatterns should name the kinds of bland outputs that would betray this taste profile.
- riskAppetite reflects how far the examples lean toward dangerous, lurid, grotesque, taboo, or anti-heroic material.
- Keep every field specific and useful for downstream ideation.`;

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function buildContentTasteDistillerPrompt(
  context: TasteDistillerContext,
): ChatMessage[] {
  const moodOrGenre = normalize(context.moodOrGenre);
  const contentPreferences = normalize(context.contentPreferences);

  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, RULES];

  const userSections: string[] = [
    'Distill the user\'s imaginative taste from the exemplar ideas below.',
    `EXEMPLAR IDEAS:\n${context.exemplarIdeas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}`,
  ];

  const optionalParts: string[] = [];
  if (moodOrGenre) {
    optionalParts.push(`Mood / genre: ${moodOrGenre}`);
  }
  if (contentPreferences) {
    optionalParts.push(`Content preferences: ${contentPreferences}`);
  }
  if (optionalParts.length > 0) {
    userSections.push(optionalParts.join('\n'));
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching exactly: { "tasteProfile": { ... } }
- Do not repeat the exemplar ideas back in paraphrase.
- collisionPatterns, favoredMechanisms, humanAnchors, socialEngines, toneBlend, sceneAppetites, antiPatterns, and surfaceDoNotRepeat must each contain 4-8 specific items.`,
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
