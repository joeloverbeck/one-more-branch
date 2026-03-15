import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { SpineFoundation } from '../../models/spine-foundation.js';
import type { ConceptSpec, ConceptVerification } from '../../models/concept-generator.js';

export interface SpineArcEnginePromptContext {
  readonly characterConcept?: string;
  readonly protagonistSummary?: string;
  readonly tone: string;
  readonly foundations: readonly SpineFoundation[];
  readonly conceptSpec?: ConceptSpec;
  readonly conceptVerification?: ConceptVerification;
}

const ARC_ENGINE_ROLE_INTRO = `You are a story architect specializing in arc engine design for interactive branching fiction. You receive LOCKED thematic foundations (conflict axis, character arc type, protagonist's deepest fear, tone) and must elaborate each into a complete arc engine: story pattern, opposition source, and the protagonist's need/want/dynamic.

IMMUTABILITY CONSTRAINT: Do not rewrite, reinterpret, or alter any foundation field (conflictAxis, characterArcType, protagonistDeepestFear, toneFeel, toneAvoid, thematicPremise). Your job is to elaborate WITHIN the locked thematic frame.`;

const ARC_ENGINE_DESIGN_GUIDELINES = `ARC ENGINE DESIGN GUIDELINES:
- storySpineType: The primary narrative pattern — must be constrained by the foundation's conflictAxis and characterArcType. A FALL arc rarely fits a QUEST pattern; a FLAT arc works naturally with MYSTERY.
- conflictType: The primary source of opposition — must align with the conflictAxis. INDIVIDUAL_VS_SYSTEM suggests PERSON_VS_SOCIETY; DUTY_VS_DESIRE often implies PERSON_VS_SELF.
- need: The inner transformation. Work BACKWARD from characterArcType + protagonistDeepestFear. The need is what the character must face — the thing their fear prevents them from accepting.
- want: The outer goal. Driven BY the fear — the want is the avoidance strategy, what they pursue INSTEAD of facing their need.
- dynamic: How need and want relate. CONVERGENT (achieving want fulfills need), DIVERGENT (want leads away from need), SUBSTITUTIVE (need replaces want), IRRECONCILABLE (cannot satisfy both).

COHERENCE RULES:
- The need MUST address the protagonistDeepestFear (it's what they must face).
- The want MUST be driven by the fear (it's the avoidance strategy).
- The dynamic MUST accurately describe how need and want relate given the above.
- storySpineType and conflictType should create productive tension with the thematicPremise.`;

function formatFoundations(foundations: readonly SpineFoundation[]): string {
  return foundations.map((f, i) => {
    const lines = [
      `FOUNDATION ${i + 1}:`,
      `  conflictAxis: ${f.conflictAxis}`,
      `  characterArcType: ${f.characterArcType}`,
      `  protagonistDeepestFear: ${f.protagonistDeepestFear}`,
      `  toneFeel: ${f.toneFeel.join(', ')}`,
      `  toneAvoid: ${f.toneAvoid.join(', ')}`,
      `  thematicPremise: ${f.thematicPremise}`,
    ];
    return lines.join('\n');
  }).join('\n\n');
}

function buildConceptConstraints(conceptSpec?: ConceptSpec): string {
  if (!conceptSpec) {
    return '';
  }

  const lines: string[] = [
    'CONCEPT CONSTRAINTS (from upstream — use for coherence):',
    `Core conflict loop: ${conceptSpec.coreConflictLoop}`,
    `Protagonist role: ${conceptSpec.protagonistRole}`,
    `Core flaw: ${conceptSpec.coreFlaw}`,
    `Protagonist's lie: ${conceptSpec.protagonistLie}`,
    `Protagonist's truth: ${conceptSpec.protagonistTruth}`,
    '',
    'When concept provides protagonistLie/protagonistTruth:',
    '- need must address the Lie (the inner transformation IS learning the Truth)',
    '- want must be driven by the Lie (the outer goal IS the avoidance strategy the Lie enables)',
  ];

  return lines.join('\n') + '\n\n';
}

export function buildSpineArcEnginePrompt(context: SpineArcEnginePromptContext): ChatMessage[] {
  const systemSections: string[] = [
    ARC_ENGINE_ROLE_INTRO,
    CONTENT_POLICY,
    ARC_ENGINE_DESIGN_GUIDELINES,
  ];

  const conceptSection = buildConceptConstraints(context.conceptSpec);

  const characterSection = context.protagonistSummary
    ? `PROTAGONIST CHARACTER:\n${context.protagonistSummary}`
    : context.characterConcept
      ? `CHARACTER CONCEPT:\n${context.characterConcept}`
      : '';

  const userPrompt = `Elaborate arc engines for ALL ${context.foundations.length} locked foundations below.

${characterSection}

TONE/GENRE: ${context.tone}

${conceptSection}LOCKED FOUNDATIONS (DO NOT MODIFY — elaborate within each frame):

${formatFoundations(context.foundations)}

FIELD INSTRUCTIONS:
- storySpineType: Primary narrative pattern (QUEST, SURVIVAL, ESCAPE, REVENGE, RESCUE, RIVALRY, MYSTERY, TEMPTATION, TRANSFORMATION, FORBIDDEN_LOVE, SACRIFICE, FALL_FROM_GRACE, RISE_TO_POWER, COMING_OF_AGE, REBELLION). Must align with the foundation's conflictAxis + characterArcType.
- conflictType: Primary source of opposition (PERSON_VS_PERSON, PERSON_VS_SELF, PERSON_VS_SOCIETY, PERSON_VS_NATURE, PERSON_VS_TECHNOLOGY, PERSON_VS_SUPERNATURAL, PERSON_VS_FATE). Must align with conflictAxis.
- protagonistNeedVsWant.need: The inner transformation — backward from characterArcType + fear. One sentence.
- protagonistNeedVsWant.want: The outer goal — driven by fear, specific to THIS character. One sentence.
- protagonistNeedVsWant.dynamic: How need and want relate (CONVERGENT, DIVERGENT, SUBSTITUTIVE, IRRECONCILABLE).

OUTPUT SHAPE:
- elaborations: array of exactly ${context.foundations.length} objects (one per foundation, same order), each containing storySpineType, conflictType, protagonistNeedVsWant`;

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userPrompt },
  ];
}
