import type { ContentOneShotContext } from '../../models/content-packet.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO = `You are a wild-content ideator for branching interactive fiction. Generate story matter, not finished concepts, not plots, and not lore summaries.

Story matter means concrete imaginative payloads: impossible beings, invasive social systems, grotesque transformations, forbidden relationships, uncanny jobs, public policies, rituals, rivalries, ecologies, and world intrusions that can later seed concepts.`;

const QUALITY_RULES = `QUALITY RULES:
- Every item must contain:
  1. a concrete impossible thing
  2. an ordinary human domain it violates
  3. a human ache or desire
  4. a social or institutional consequence
  5. a branching dilemma
  6. an escalation path
  7. an unforgettable image
- Weirdness must be load-bearing, not decorative.
- Prefer specific nouns and mechanisms over abstract adjectives.
- Dangerous sincerity beats glib parody.
- Do not output generic scaffolding: chosen one, secret order, ancient prophecy, dark lord, mysterious artifact, hidden conspiracy, save the world, magical empire, forbidden power.
- Do not copy the exemplar ideas' surface nouns, creatures, jobs, countries, or plot beats. Extrapolate the deeper taste behind them.
- At least half the items should contain structural irony.`;

const DIVERSITY_RULES = `DIVERSITY:
- Generate 18 items.
- Use at least 6 distinct content kinds.
- Mix intimate, civic, and civilizational scale.
- Mix mechanisms: transformation, bureaucracy, romance, medicine, labor, ecology, ritual, invasion, art, religion, reproduction.`;

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function buildContentOneShotPrompt(context: ContentOneShotContext): ChatMessage[] {
  const genreVibes = normalize(context.genreVibes);
  const moodKeywords = normalize(context.moodKeywords);
  const contentPreferences = normalize(context.contentPreferences);
  const kernelBlock = normalize(context.kernelBlock);

  const systemSections: string[] = [
    ROLE_INTRO,
    CONTENT_POLICY,
    QUALITY_RULES,
    DIVERSITY_RULES,
  ];

  const userSections: string[] = [
    'Infer my imaginative taste from the exemplar ideas below, but do not copy their surface elements. Generate content packets that belong to the same creative appetite while still feeling original.',
    `EXEMPLAR IDEAS:\n${context.exemplarIdeas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}`,
  ];

  const optionalParts: string[] = [];
  if (genreVibes) {
    optionalParts.push(`Genre vibes: ${genreVibes}`);
  }
  if (moodKeywords) {
    optionalParts.push(`Mood keywords: ${moodKeywords}`);
  }
  if (contentPreferences) {
    optionalParts.push(`Content preferences: ${contentPreferences}`);
  }
  if (optionalParts.length > 0) {
    userSections.push(optionalParts.join('\n'));
  }

  if (kernelBlock) {
    userSections.push(`KERNEL:\n${kernelBlock}`);
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return exactly 18 packets.
- Every packet must be strong enough to inspire a story concept by itself.
- No packet may feel like generic fantasy, generic sci-fi, or generic horror with a cosmetic gimmick.`,
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
