import type { NpcIntelligenceContext } from '../npc-intelligence-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';

const NPC_INTELLIGENCE_ROLE = `You are an NPC intelligence evaluator for interactive fiction. Your SINGLE responsibility is to evaluate NPC behavioral consistency, relationship shifts, knowledge asymmetry, and dramatic irony opportunities.

You do NOT evaluate tone, thematic charge, narrative focus, or prose quality. Those are handled by another evaluator.
You do NOT evaluate story structure, milestone completion, deviation, pacing, or narrative promises. Those are handled by other evaluators.`;

const NPC_INTELLIGENCE_RULES = `NPC AGENDA COHERENCE:
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
- Use the protagonist's actual name (provided above) as characterName, NEVER use generic labels like "Protagonist" or "the protagonist".
- Use [] for knownFacts/falseBeliefs/secrets when no evidence exists for that bucket.
- Only include characters with meaningful updates or clearly evidenced knowledge state in this scene.
- Emit dramaticIronyOpportunities as concrete opportunities created by knowledge gaps in this scene.
- Return dramaticIronyOpportunities as [] when no clear dramatic irony opportunity is present.`;

function buildNpcAgendasSection(context: NpcIntelligenceContext): string {
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

function buildNpcRelationshipsSection(context: NpcIntelligenceContext): string {
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

export function buildNpcIntelligencePrompt(context: NpcIntelligenceContext): ChatMessage[] {
  const systemPrompt = [NPC_INTELLIGENCE_ROLE, CONTENT_POLICY, NPC_INTELLIGENCE_RULES].join('\n\n');

  const spineSection = buildSpineSection(context.spine);
  const genreConventionsSection = buildGenreConventionsSection(context.genreFrame);
  const npcAgendasSection = buildNpcAgendasSection(context);
  const npcRelationshipsSection = buildNpcRelationshipsSection(context);

  const userContent = `${spineSection}${genreConventionsSection}${npcAgendasSection}${npcRelationshipsSection}PROTAGONIST: ${context.protagonistName}

NARRATIVE TO EVALUATE:
${context.narrative}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
