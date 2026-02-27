import type { SceneQualityContext } from '../scene-quality-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

const SCENE_QUALITY_ROLE = `You are a scene quality evaluator for interactive fiction. Your SINGLE responsibility is to evaluate narrative quality, tone adherence, thematic coherence, and NPC consistency.

You do NOT evaluate story structure, beat completion, deviation, pacing, or narrative promises. Those are handled by other evaluators.`;

const SCENE_QUALITY_RULES = `TONE EVALUATION:
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
- Prefer BALANCED when uncertain between BALANCED and BROADENING.

NPC AGENDA COHERENCE:
- If NPC agendas are provided, evaluate whether NPC behavior in the scene aligns with their stated goals and fears.
- Set npcCoherenceAdherent to true if all NPCs who appear or act in the scene behave consistently with their agendas.
- Set npcCoherenceAdherent to false if any NPC acts contrary to their stated goal or fear without narrative justification.
- When npcCoherenceAdherent is false, write a brief npcCoherenceIssues description naming the NPC and explaining the inconsistency.
- When npcCoherenceAdherent is true or no NPC agendas are provided, set npcCoherenceIssues to an empty string.

NPC-PROTAGONIST RELATIONSHIP SHIFTS:
- If NPC relationships are provided, evaluate whether the scene caused any significant relationship changes.
- Only flag shifts that are meaningful — not every interaction is a shift.
- For each detected shift, provide the NPC name, a 1-2 sentence description of the change, a suggested valence change (-3 to +3), and a new dynamic label if the dynamic itself changed (empty string if unchanged).
- Empty array when no significant relationship shifts occurred or no relationships are provided.

INFORMATION ASYMMETRY DETECTION:
- Emit knowledgeAsymmetryDetected as an array of per-character observations grounded in scene evidence.
- Each entry must include: characterName, knownFacts, falseBeliefs, secrets.
- Use [] for knownFacts/falseBeliefs/secrets when no evidence exists for that bucket.
- Only include characters with meaningful updates or clearly evidenced knowledge state in this scene.
- Emit dramaticIronyOpportunities as concrete opportunities created by knowledge gaps in this scene.
- Return dramaticIronyOpportunities as [] when no clear dramatic irony opportunity is present.`;

function buildNpcAgendasSection(context: SceneQualityContext): string {
  const agendas = context.accumulatedNpcAgendas;
  if (!agendas) {
    return '';
  }
  const entries = Object.values(agendas);
  if (entries.length === 0) {
    return '';
  }

  const lines = [
    'NPC AGENDAS (evaluate behavior consistency):',
    ...entries.map(
      (a) => `[${a.npcName}]\n  Goal: ${a.currentGoal}\n  Fear: ${a.fear}`
    ),
  ];

  return `${lines.join('\n')}\n\n`;
}

function buildNpcRelationshipsSection(context: SceneQualityContext): string {
  const relationships = context.accumulatedNpcRelationships;
  if (!relationships) {
    return '';
  }
  const entries = Object.values(relationships);
  if (entries.length === 0) {
    return '';
  }

  const lines = [
    'NPC-PROTAGONIST RELATIONSHIPS (evaluate for shifts):',
    ...entries.map(
      (r) =>
        `[${r.npcName}] Dynamic: ${r.dynamic} | Valence: ${r.valence} | Tension: ${r.currentTension}`
    ),
  ];

  return `${lines.join('\n')}\n\n`;
}

function buildThematicKernelSection(context: SceneQualityContext): string {
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

export function buildSceneQualityPrompt(context: SceneQualityContext): ChatMessage[] {
  const sections: string[] = [SCENE_QUALITY_ROLE];

  if (context.tone) {
    sections.push(buildToneDirective(context.tone, context.toneFeel, context.toneAvoid));
  }

  sections.push(SCENE_QUALITY_RULES);
  const systemPrompt = sections.join('\n\n');

  const spineSection = buildSpineSection(context.spine);
  const genreConventionsSection = buildGenreConventionsSection(context.genreFrame);
  const thematicKernelSection = buildThematicKernelSection(context);
  const npcAgendasSection = buildNpcAgendasSection(context);
  const npcRelationshipsSection = buildNpcRelationshipsSection(context);

  const userContent = `${spineSection}${genreConventionsSection}${thematicKernelSection}${npcAgendasSection}${npcRelationshipsSection}
NARRATIVE TO EVALUATE:
${context.narrative}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
