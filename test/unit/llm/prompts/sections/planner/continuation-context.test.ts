import { ThreadType, Urgency } from '../../../../../../src/models/state/index.js';
import type { ContinuationPagePlanContext } from '../../../../../../src/llm/types.js';
import { buildPlannerContinuationContextSection } from '../../../../../../src/llm/prompts/sections/planner/continuation-context.js';

describe('planner continuation context section', () => {
  it('includes continuation state and previous scene context', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: 'A quarantined coastal megacity.',
      tone: 'gritty cyberpunk',
      globalCanon: ['Drone patrols scan thermal signatures nightly'],
      globalCharacterCanon: {
        azra: ['Azra speaks in clipped military phrases'],
      },
      previousNarrative: 'The server rack hums as sparks spit from a cut conduit.',
      selectedChoice: 'Trigger the blackout relay',
      accumulatedInventory: [{ id: 'inv-1', text: 'Spoofed access token' }],
      accumulatedHealth: [{ id: 'hp-1', text: 'Concussion symptoms' }],
      accumulatedCharacterState: {
        azra: [{ id: 'cs-2', text: 'Waiting at extraction point' }],
      },
      activeState: {
        currentLocation: 'Harbor datacenter',
        activeThreats: [{ id: 'th-2', text: 'Counterintrusion daemon active' }],
        activeConstraints: [{ id: 'cn-1', text: 'Blackout window lasts under 2 minutes' }],
        openThreads: [
          {
            id: 'td-1',
            text: 'Whether the daemon has mirrored the stolen payload',
            threadType: ThreadType.MYSTERY,
            urgency: Urgency.MEDIUM,
          },
        ],
      },
      grandparentNarrative: 'You bribed a dock mechanic for a service ladder route.',
      ancestorSummaries: [{ pageId: 3, summary: 'Reached the harbor perimeter unseen.' }],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('=== PLANNER CONTEXT: CONTINUATION ===');
    expect(result).toContain('ESTABLISHED WORLD FACTS:');
    expect(result).toContain('- [inv-1] Spoofed access token');
    expect(result).toContain('- [th-2] Counterintrusion daemon active');
    expect(result).toContain('- [td-1] (MYSTERY/MEDIUM)');
    expect(result).toContain('EARLIER SCENE SUMMARIES:');
    expect(result).toContain('SCENE BEFORE LAST (full text for style continuity):');
    expect(result).toContain("PLAYER'S CHOICE:");
    expect(result).toContain('Trigger the blackout relay');
  });

  it('renders optional sections as (none) when state is empty', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance to the elevator shaft',
      accumulatedInventory: [],
      accumulatedHealth: [],
      accumulatedCharacterState: {},
      activeState: {
        currentLocation: '',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
      grandparentNarrative: null,
      ancestorSummaries: [],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('ESTABLISHED WORLD FACTS:\n(none)');
    expect(result).toContain('CHARACTER INFORMATION (permanent traits):\n(none)');
    expect(result).toContain('NPC CURRENT STATE (branch-specific events):\n(none)');
    expect(result).toContain('YOUR INVENTORY:\n(none)');
    expect(result).toContain('YOUR HEALTH:\n(none)');
    expect(result).toContain('ACTIVE THREATS:\n(none)');
    expect(result).toContain('ACTIVE CONSTRAINTS:\n(none)');
    expect(result).toContain('OPEN NARRATIVE THREADS:\n(none)');
    expect(result).not.toContain('SCENE BEFORE LAST (full text for style continuity):');
  });
});
