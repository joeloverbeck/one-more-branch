import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { CharacterBrainstormerContext } from '../character-brainstormer-types.js';
import {
  buildConceptAnalysisSection,
  buildKernelGroundingSection,
} from './sections/shared/concept-kernel-sections.js';
import { buildWorldSectionForCharacterWeb } from './sections/shared/worldbuilding-sections.js';

const ROLE_INTRO = `You are a character concept brainstormer for interactive branching fiction. Your purpose is to generate a diverse set of 6-10 CHARACTER CONCEPTS that are unique, original, memorable, and distinct from each other. These are brainstorming sketches — rich enough to inspire, not full character sheets.`;

const DIAGNOSTIC_UNIQUENESS_MANDATE = `YOUR MANDATE: Every character you generate must pass the DIAGNOSTIC UNIQUENESS TEST — if the description could apply to ten other characters in fiction, it is not specific enough. Generic archetypes without subversion are forbidden. Characters that are merely functional ("the mentor," "the love interest") without distinctive personality are forbidden.`;

const NARRATIVE_THEORY_TOOLKIT = `NARRATIVE THEORY TOOLKIT — apply these techniques across the set:

1. CAUSAL CHAIN (Egri): Every psychological trait must trace to a physical or social cause. "She's stubborn" fails. "She refuses to change her mind because she interprets flexibility as betrayal — her mother's constant shifts in loyalty destroyed their family" passes. The causal explanation IS the engine of originality.

2. PRESSURE REVEAL (McKee): Define each character by what they would do under MAXIMUM pressure — not by surface traits. The gap between their public persona and their deep-pressure choice is where memorability lives. A generous person who hoards under extreme stress. A calm leader who becomes vicious when their family is threatened.

3. SPECIFIC WOUND (Weiland/Hurst): Each character's formative wound must be so particular that no other character in fiction shares it. Push through three levels: generic flaw → specific flaw → rooted flaw with a concrete backstory event.

4. PRODUCTIVE CONTRADICTION (Diaz/Seger): Every character must have at least one contradiction between their public persona and private reality. A warrior who secretly writes poetry. A healer who poisoned someone they loved. A truth-teller who built their reputation on one foundational lie.

5. ARCHETYPE + SUBVERSION: Start with a recognizable archetype, then apply ONE subversion method:
   - INVERSION: Flip the core trait (a chosen one who doesn't want to be chosen)
   - DECONSTRUCTION: Ask "what would this really be like?" (a superhero with PTSD)
   - COMBINATION: Merge two archetypes that don't coexist (trickster-mentor)
   - LAMPSHADING: The character acknowledges their archetype then defies it
   - IMPLICATION: Play the archetype straight but add one deeply unexpected detail

6. METAPHOR FAMILY (Matt Bird): Give each character a distinctive cognitive lens — the domain from which they draw all comparisons. A chef sees every situation in terms of recipes and timing. A gambler sees everything as odds and stakes. No two characters in the set share a metaphor family.

ENSEMBLE DIVERSITY RULES — the set as a whole must be diverse:

7. OPPOSITION MATRIX (Truby/McKee): Each character should represent a different answer to the concept's central thematic question. If the theme is "freedom vs. safety," one character embodies freedom-at-all-costs, another safety-at-all-costs, another the compromise, another the one who discovered the question is wrong.

8. TECHNIQUE ROTATION: Deliberately rotate which technique is PRIMARY for each character. One character's uniqueness comes mainly from their contradiction, another from cultural blending, another from wound specificity, another from archetype subversion. Do not use the same primary technique twice in a row.

9. WORLDVIEW FINGERPRINTING: Each character in the set would describe the same event DIFFERENTLY. If two characters would narrate the same scene identically, they are not differentiated enough.

10. FUNCTIONAL DIVERSITY: Vary story functions across the set. Don't generate 5 potential antagonists. Ensure the set includes characters suited for different dramatic roles.`;

const QUALITY_GATES = `QUALITY GATES:
- Each character must have at least one trait that SURPRISES — that you wouldn't predict from the rest of their description.
- Names must fit the worldbuilding context (cultural naming conventions, era, setting).
- The highConceptPitch must contain an inherent TENSION or SURPRISE — not just a role description.
- coreWound must be a specific EVENT or EXPERIENCE, not an abstract condition.
- centralContradiction must name both the public trait AND the contradicting private reality.
- archetypeAndSubversion must name the base archetype AND the specific subversion method applied.`;

const OUTPUT_REQUIREMENTS = `OUTPUT REQUIREMENTS:
- Return JSON matching the schema exactly.
- Generate between 6 and 10 characters.
- Every character must pass the diagnostic uniqueness test.
- The diversityNote should briefly explain which techniques you rotated across the set and how you ensured distinctiveness.`;

function buildExistingCharactersSection(
  characters: CharacterBrainstormerContext['existingCharacterNames']
): string {
  if (characters.length === 0) {
    return '';
  }

  const lines = characters.map((c) => {
    const parts = [`- ${c.name}`];
    if (c.storyFunction) {
      parts[0] += ` (${c.storyFunction})`;
    }
    if (c.narrativeRole) {
      parts[0] += `: ${c.narrativeRole}`;
    }
    if (c.superObjective) {
      parts[0] += ` — drives toward: ${c.superObjective}`;
    }
    return parts[0];
  });

  return `EXISTING CHARACTERS — DO NOT duplicate or closely resemble these. Generate characters that are DELIBERATELY DIFFERENT in function, personality, wound, contradiction, and archetype:\n${lines.join('\n')}`;
}

function buildUserNotesSection(userNotes: string): string {
  if (!userNotes || userNotes.trim().length === 0) {
    return '';
  }

  return `USER CREATIVE DIRECTION:\n${userNotes.trim()}\n\nIMPORTANT: The user's notes may contain character ideas they've already developed or are interested in. Use these as ANCHORING CONSTRAINTS — generate characters that complement, contrast with, or fill gaps around these ideas. Do NOT simply repeat or rephrase what the user wrote. Diversify.`;
}

export function buildCharacterBrainstormerMessages(
  context: CharacterBrainstormerContext
): ChatMessage[] {
  const systemSections: string[] = [
    ROLE_INTRO,
    CONTENT_POLICY,
    DIAGNOSTIC_UNIQUENESS_MANDATE,
    NARRATIVE_THEORY_TOOLKIT,
    QUALITY_GATES,
  ];

  const userSections: string[] = [
    'Generate 6-10 unique, original, memorable character concepts for this story context.',
  ];

  const conceptSection = buildConceptAnalysisSection(context.conceptSpec);
  if (conceptSection.length > 0) {
    userSections.push(`CONCEPT ANALYSIS:\n${conceptSection.trim()}`);
  }

  const kernelSection = buildKernelGroundingSection(context.storyKernel);
  if (kernelSection.length > 0) {
    userSections.push(`THEMATIC KERNEL:\n${kernelSection.trim()}`);
  }

  if (context.decomposedWorld) {
    const worldSection = buildWorldSectionForCharacterWeb(context.decomposedWorld);
    if (worldSection.length > 0) {
      userSections.push(`WORLD CONTEXT:\n${worldSection.trim()}`);
    }
  } else if (context.rawWorldbuilding && context.rawWorldbuilding.trim().length > 0) {
    userSections.push(`WORLD CONTEXT:\n${context.rawWorldbuilding.trim()}`);
  }

  const existingCharsSection = buildExistingCharactersSection(context.existingCharacterNames);
  if (existingCharsSection.length > 0) {
    userSections.push(existingCharsSection);
  }

  const notesSection = buildUserNotesSection(context.userNotes);
  if (notesSection.length > 0) {
    userSections.push(notesSection);
  }

  userSections.push(OUTPUT_REQUIREMENTS);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
