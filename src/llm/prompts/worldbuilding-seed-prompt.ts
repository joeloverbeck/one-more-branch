import type { ConceptSpec } from '../../models/concept-generator.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

export interface WorldSeedPromptContext {
  readonly userNotes?: string;
  readonly contentPreferences?: string;
  readonly startingSituation?: string;
  readonly tone?: string;
  readonly conceptSpec?: ConceptSpec;
  readonly storyKernel?: StoryKernel;
}

const SEED_SYSTEM_PROMPT = `You are a World Seed Architect for an interactive branching story engine. Your job is to generate the deep logic and dramatic engines of a world — not a finished encyclopedia, but the invariants, pressures, fault lines, and lived textures that make a world demand stories.

${CONTENT_POLICY}

WORLD SEED DESIGN PRINCIPLES:

1. MEANINGFUL DEPARTURE, NOT NOVELTY SPAM: Specify only what meaningfully departs from ordinary reality. State what each departure enables, forbids, and costs. Unmarked assumptions may remain inferable.

2. WORLDBUILDING IS A PRESSURE SYSTEM: The world must generate pressure, friction, asymmetry, taboo, opportunity, scarcity, and mistaken belief. A world without pressure cannot produce meaningful choices.

3. LIVED WORLD BEATS ENCYCLOPEDIA: Privilege what daily life feels like, how institutions touch bodies and habits, what people believe publicly, what is hidden or misread, and what a protagonist can actually notice or act on.

4. PRESERVE STRATEGIC INCOMPLETENESS: Not everything should be canonized. Some areas should remain open on purpose so later stories can discover rather than contradict. Track open questions explicitly.

5. EVERY MAJOR SYSTEM MUST AFFORD CHOICES: If a world detail cannot plausibly shape a page-level decision, scene conflict, or interpretive tension, it should not be prioritized.

6. COVERAGE IS SUBORDINATE TO DRAMATIC UTILITY: Do not aim for equal coverage of all domains. Expand only the domains that bear conflict, atmosphere, perception, or choice.

BAD OUTCOMES TO EXPLICITLY AVOID:
- Generic fantasy/sci-fi boilerplate
- Pure lore accumulation without consequence
- Novelty without cost or constraint
- Heavy macro-history with no lived effect
- Worlds that only support one obvious story`;

function buildConceptSection(conceptSpec?: ConceptSpec): string {
  if (!conceptSpec) return '';

  return `\nCONCEPT ANALYSIS (use as grounding, not constraint):
One-line hook: ${conceptSpec.oneLineHook}
Player fantasy: ${conceptSpec.playerFantasy}
Core conflict loop: ${conceptSpec.coreConflictLoop}
Conflict axis: ${conceptSpec.conflictAxis}
Setting axioms: ${conceptSpec.settingAxioms.join('; ')}
Key institutions: ${conceptSpec.keyInstitutions.join('; ')}
Setting scale: ${conceptSpec.settingScale}\n`;
}

function buildKernelSection(kernel?: StoryKernel): string {
  if (!kernel) return '';

  return `\nTHEMATIC KERNEL (philosophical foundation):
Dramatic thesis: ${kernel.dramaticThesis}
Antithesis: ${kernel.antithesis}
Value at stake: ${kernel.valueAtStake}
Conflict axis: ${kernel.conflictAxis}
Thematic question: ${kernel.thematicQuestion}\n`;
}

export function buildWorldSeedPrompt(context: WorldSeedPromptContext): ChatMessage[] {
  const systemSections: string[] = [SEED_SYSTEM_PROMPT];

  if (context.tone) {
    systemSections.push(buildToneDirective(context.tone));
  }

  const parts: string[] = ['Generate a World Seed for the following story world.\n'];

  if (context.userNotes) {
    parts.push(`USER NOTES:\n${context.userNotes}\n`);
  }

  if (context.contentPreferences) {
    parts.push(`CONTENT PREFERENCES:\n${context.contentPreferences}\n`);
  }

  if (context.startingSituation) {
    parts.push(`STARTING SITUATION:\n${context.startingSituation}\n`);
  }

  parts.push(buildConceptSection(context.conceptSpec));
  parts.push(buildKernelSection(context.storyKernel));

  parts.push(`INSTRUCTIONS:
1. Specify only meaningful departures from default reality.
2. Every invariant must include consequence AND human cost.
3. Build from conflict axis and value-at-stake outward if concept/kernel provided.
4. Generate multiple story vectors, not a single corridor.
5. Create anchor locations where scenes can happen, not abstract institutions.
6. Show daily-life practices, not only macro lore.
7. Include public misunderstandings/mysteries where useful.
8. Produce naming and idiom guidance for cultural coherence.
9. Do NOT attempt full domain coverage — optimize for dramatic utility.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: parts.filter(Boolean).join('\n') },
  ];
}
