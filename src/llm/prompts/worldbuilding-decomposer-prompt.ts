import type { StorySpine } from '../../models/story-spine.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

export interface WorldbuildingDecomposerContext {
  readonly worldbuilding: string;
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly spine?: StorySpine;
}

const WORLDBUILDING_DECOMPOSER_SYSTEM_PROMPT = `You are a Worldbuilding Decomposer for an interactive branching story engine. Your job is to convert raw worldbuilding prose into structured, atomic facts with domain tags, scope annotations, and epistemic status.

${CONTENT_POLICY}

WORLDBUILDING ATOMIZATION PRINCIPLES:

1. Break worldbuilding prose into atomic facts. Each fact should be a single, self-contained proposition.

2. Available domains: geography (terrain, locations, climate), ecology (flora, fauna, agriculture), history (past events, eras), society (social structure, class, family), culture (customs, traditions, arts, daily life, education), religion (faiths, mythology, cosmology), governance (government, law, politics, military), economy (commerce, professions, labor, wealth), faction (organizations, guilds, alliances), technology (inventions, infrastructure, medicine), magic (supernatural systems, spells), language (languages, dialects, scripts).

3. Epistemic status (factType) for each fact:
   - LAW: Fundamental world truths that simply ARE (magic rules, physics, cosmology). E.g. "Iron disrupts magical fields."
   - NORM: Cultural or regional standard practices. E.g. "Merchants bow before entering the Exchange."
   - BELIEF: Held as true by specific groups but may or may not be objectively true. Embed the holder in the fact text. E.g. "The northern clans believe the old gods sleep beneath the ice."
   - DISPUTED: Multiple contradictory versions exist. E.g. "Historians disagree whether the Sundering was caused by divine wrath or arcane experimentation."
   - RUMOR: Unverified hearsay circulating in the world. E.g. "Tavern talk claims the duke poisoned his brother."
   - MYSTERY: Intentionally unresolved unknowns. Preserve the unknown quality. E.g. "No one knows what lies beyond the Veil."

4. PRESERVE NUANCE: Do not discard implied or subtle worldbuilding. If the prose suggests something indirectly, capture it as a BELIEF or RUMOR.

5. SCOPE PRECISION: Assign scopes that reflect where and when each fact applies. Use specific scopes when the text provides them.`;

function buildSpineSection(spine?: StorySpine): string {
  if (!spine) {
    return '';
  }

  return `\n\nSTORY SPINE (decompose worldbuilding in light of this):
Central dramatic question: ${spine.centralDramaticQuestion}
Antagonistic force: ${spine.primaryAntagonisticForce.description}`;
}

export function buildWorldbuildingDecomposerPrompt(
  context: WorldbuildingDecomposerContext
): ChatMessage[] {
  const toneSection = context.tone
    ? `\n\n${buildToneDirective(context.tone, context.toneFeel, context.toneAvoid)}`
    : '';

  const spineSection = buildSpineSection(context.spine);

  const userPrompt = `Decompose the following worldbuilding prose into atomic, structured facts.

WORLDBUILDING:
${context.worldbuilding}${toneSection}${spineSection}

INSTRUCTIONS:
1. Decompose into atomic propositions — each fact should be a single, self-contained statement
2. Assign appropriate domain tags from the available domain list
3. Assign scope annotations reflecting where/when each fact applies
4. Assign epistemic status (factType) reflecting certainty level
5. If no worldbuilding is provided or the text is empty, return an empty worldFacts array`;

  return [
    { role: 'system', content: WORLDBUILDING_DECOMPOSER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
