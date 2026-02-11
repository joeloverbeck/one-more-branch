import type { OpeningPagePlanContext } from '../../../../../../src/llm/types.js';
import { buildPlannerOpeningContextSection } from '../../../../../../src/llm/prompts/sections/planner/opening-context.js';

describe('planner opening context section', () => {
  it('includes required opening fields', () => {
    const context: OpeningPagePlanContext = {
      mode: 'opening',
      characterConcept: 'A stranded deep-space courier',
      worldbuilding: 'A decaying orbital trade ring.',
      tone: 'sci-fi suspense',
      globalCanon: [],
      globalCharacterCanon: {},
      accumulatedInventory: [],
      accumulatedHealth: [],
      accumulatedCharacterState: {},
      activeState: {
        currentLocation: '',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
    };

    const result = buildPlannerOpeningContextSection(context);

    expect(result).toContain('=== PLANNER CONTEXT: OPENING ===');
    expect(result).toContain('CHARACTER CONCEPT:');
    expect(result).toContain('A stranded deep-space courier');
    expect(result).toContain('WORLDBUILDING:');
    expect(result).toContain('TONE/GENRE: sci-fi suspense');
    expect(result).toContain('OPENING STATE SNAPSHOT:');
  });

  it('includes optional starting situation and structure details when present', () => {
    const context: OpeningPagePlanContext = {
      mode: 'opening',
      characterConcept: 'A stranded deep-space courier',
      worldbuilding: '',
      tone: 'sci-fi suspense',
      startingSituation: 'An airlock alarm starts as oxygen drops.',
      structure: {
        overallTheme: 'Truth survives only if transmitted in time.',
        premise: 'A courier must publish evidence before the station implodes.',
        pacingBudget: { targetPagesMin: 20, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Lockdown',
            objective: 'Reach the relay core',
            stakes: 'Failure buries the evidence forever.',
            entryCondition: 'The station enters hard lockdown.',
            beats: [
              {
                id: '1.1',
                description: 'Break through maintenance sectors',
                objective: 'Get to a functioning uplink',
                role: 'setup',
              },
            ],
          },
        ],
      },
      globalCanon: [],
      globalCharacterCanon: {},
      accumulatedInventory: [],
      accumulatedHealth: [],
      accumulatedCharacterState: {},
      activeState: {
        currentLocation: '',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
    };

    const result = buildPlannerOpeningContextSection(context);

    expect(result).toContain('STARTING SITUATION:');
    expect(result).toContain('airlock alarm');
    expect(result).toContain('=== STORY STRUCTURE (if provided) ===');
    expect(result).toContain('Current Act: Lockdown');
    expect(result).toContain('Current Beat: Break through maintenance sectors');
  });
});
