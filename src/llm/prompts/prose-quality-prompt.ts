import type { ProseQualityContext } from '../prose-quality-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

const PROSE_QUALITY_ROLE = `You are a prose quality evaluator for interactive fiction. Your SINGLE responsibility is to evaluate narrative quality, tone adherence, and thematic coherence.

You do NOT evaluate NPC behavior, relationship shifts, knowledge asymmetry, or dramatic irony. Those are handled by another evaluator.
You do NOT evaluate story structure, beat completion, deviation, pacing, or narrative promises. Those are handled by other evaluators.`;

const PROSE_QUALITY_RULES = `TONE EVALUATION:
- Set toneAdherent to true if the narrative's mood, vocabulary, and emotional register match the target tone.
- Set toneAdherent to false if the narrative drifts toward a different genre feel (e.g., grimdark when tone should be comedic).
- When toneAdherent is false, write a brief toneDriftDescription explaining what feels off and what the tone should be instead.
- When toneAdherent is true, set toneDriftDescription to an empty string.

THEMATIC CHARGE CLASSIFICATION:
- If THEMATIC KERNEL context is present, classify scene-level thematic valence:
  - THESIS_SUPPORTING: scene consequences/actions support the thesis-direction answer to the thematic question.
  - ANTITHESIS_SUPPORTING: scene consequences/actions support the antithesis-direction answer.
  - AMBIGUOUS: evidence is mixed, unresolved, or equally supports both sides.
- Set thematicCharge to exactly one enum value.
- Set thematicChargeDescription to 1-2 sentences citing concrete scene evidence.
- If THEMATIC KERNEL context is absent, default to thematicCharge = AMBIGUOUS with a concise neutral description.

NARRATIVE FOCUS CLASSIFICATION:
- Classify scene focus as exactly one:
  - DEEPENING: primarily develops existing conflicts, promises, relationships, or known constraints.
  - BROADENING: primarily introduces new factions, mysteries, goals, locations, or major scope expansions.
  - BALANCED: meaningfully deepens existing threads while adding limited new elements.
- Prefer DEEPENING when uncertain between DEEPENING and BALANCED.
- Prefer BALANCED when uncertain between BALANCED and BROADENING.`;

function buildThematicKernelSection(context: ProseQualityContext): string {
  const thematicQuestion = context.thematicQuestion.trim();
  const antithesis = context.antithesis.trim();
  if (thematicQuestion.length === 0 && antithesis.length === 0) {
    return '';
  }

  const lines = ['THEMATIC KERNEL:'];
  if (thematicQuestion.length > 0) {
    lines.push(`Thematic question: ${thematicQuestion}`);
  }
  if (antithesis.length > 0) {
    lines.push(`Antithesis: ${antithesis}`);
  }
  return `${lines.join('\n')}\n\n`;
}

export function buildProseQualityPrompt(context: ProseQualityContext): ChatMessage[] {
  const sections: string[] = [PROSE_QUALITY_ROLE, CONTENT_POLICY];

  if (context.tone) {
    sections.push(buildToneDirective(context.tone, context.toneFeel, context.toneAvoid));
  }

  sections.push(PROSE_QUALITY_RULES);
  const systemPrompt = sections.join('\n\n');

  const spineSection = buildSpineSection(context.spine);
  const genreConventionsSection = buildGenreConventionsSection(context.genreFrame);
  const thematicKernelSection = buildThematicKernelSection(context);

  const userContent = `${spineSection}${genreConventionsSection}${thematicKernelSection}
NARRATIVE TO EVALUATE:
${context.narrative}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
