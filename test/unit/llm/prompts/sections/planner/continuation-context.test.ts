import {
  ConstraintType,
  ThreatType,
  ThreadType,
  Urgency,
} from '../../../../../../src/models/state/index.js';
import type { ContinuationPagePlanContext } from '../../../../../../src/llm/context-types.js';
import { buildPlannerContinuationContextSection } from '../../../../../../src/llm/prompts/sections/planner/continuation-context.js';

describe('planner continuation context section', () => {
  it('includes continuation state and previous scene context', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: 'A quarantined coastal megacity.',
      tone: 'gritty cyberpunk',
      npcs: [
        {
          name: 'Azra',
          description: 'Ex-military fixer with a debt to the protagonist',
          archetype: 'Ally',
        },
      ],
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
        activeThreats: [
          {
            id: 'th-2',
            text: 'Counterintrusion daemon active',
            threatType: ThreatType.ENVIRONMENTAL,
          },
        ],
        activeConstraints: [
          {
            id: 'cn-1',
            text: 'Blackout window lasts under 2 minutes',
            constraintType: ConstraintType.TEMPORAL,
          },
        ],
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
    expect(result).toContain('CHARACTER CONCEPT:');
    expect(result).toContain('NPCS (Available Characters):');
    expect(result).toContain('NPC: Azra');
    expect(result).toContain('ESTABLISHED WORLD FACTS:');
    expect(result).toContain('- [inv-1] Spoofed access token');
    expect(result).toContain('- [th-2] (ENVIRONMENTAL) Counterintrusion daemon active');
    expect(result).toContain('- [td-1] (MYSTERY/MEDIUM)');
    expect(result).toContain('EARLIER SCENE SUMMARIES:');
    expect(result).toContain('SCENE BEFORE LAST (full text for style continuity):');
    expect(result).toContain("PLAYER'S CHOICE:");
    expect(result).toContain('Trigger the blackout relay');
  });

  it('omits character concept and marks protagonist when structured characters are present', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'Should not render when structured characters exist',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance',
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
      decomposedCharacters: [
        {
          name: 'Rin',
          coreTraits: ['resourceful', 'stubborn'],
          motivations: 'Expose station sabotage',
          relationships: ['Former mentor: Voss'],
          knowledgeBoundaries: 'Knows courier routes, not reactor internals',
          appearance: 'Lean, grease-stained uniform',
          rawDescription: 'A courier',
          speechFingerprint: {
            catchphrases: [],
            vocabularyProfile: 'Direct and technical',
            sentencePatterns: 'Short directives',
            verbalTics: [],
            dialogueSamples: [],
          },
        },
        {
          name: 'Voss',
          coreTraits: ['secretive'],
          motivations: 'Contain evidence leak',
          relationships: [],
          knowledgeBoundaries: 'Knows internal security systems',
          appearance: 'Tall in officer coat',
          rawDescription: 'A station officer',
          speechFingerprint: {
            catchphrases: [],
            vocabularyProfile: 'Formal command language',
            sentencePatterns: 'Measured statements',
            verbalTics: [],
            dialogueSamples: [],
          },
        },
      ],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).not.toContain('CHARACTER CONCEPT:');
    expect(result).toContain('CHARACTERS (structured profiles):');
    expect(result).toContain('CHARACTER: Rin\nPROTAGONIST');
    expect(result).not.toContain('CHARACTER: Voss\nPROTAGONIST');
  });

  it('renders rich structure context from accumulated structure state', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance',
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
      structure: {
        overallTheme: 'Loyalty under impossible pressure',
        premise: 'A smuggler must expose corruption before a citywide purge.',
        pacingBudget: { targetPagesMin: 20, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Containment',
            objective: 'Escape initial crackdown',
            stakes: 'Capture means execution.',
            entryCondition: 'Purge starts',
            beats: [
              {
                id: '1.1',
                description: 'Secure route through lockdown',
                objective: 'Reach safe passage',
                role: 'setup',
              },
              {
                id: '1.2',
                description: 'Confront compromised ally',
                objective: 'Prevent betrayal',
                role: 'escalation',
              },
              {
                id: '1.3',
                description: 'Expose the city directive',
                objective: 'Broadcast proof',
                role: 'turning_point',
              },
            ],
          },
          {
            id: '2',
            name: 'Counterstrike',
            objective: 'Take down purge command',
            stakes: 'City falls if command survives.',
            entryCondition: 'Proof reaches resistance',
            beats: [
              {
                id: '2.1',
                description: 'Raid central command',
                objective: 'Neutralize command hub',
                role: 'resolution',
              },
            ],
          },
        ],
      },
      accumulatedStructureState: {
        currentActIndex: 0,
        currentBeatIndex: 1,
        pagesInCurrentBeat: 1,
        pacingNudge: null,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Route secured through maintenance' },
          { beatId: '1.2', status: 'active' },
          { beatId: '1.3', status: 'pending' },
          { beatId: '2.1', status: 'pending' },
        ],
      },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('=== STORY STRUCTURE ===');
    expect(result).toContain('CURRENT ACT: Containment (Act 1 of 3)');
    expect(result).toContain('[x] CONCLUDED (setup): Secure route through lockdown');
    expect(result).toContain('[>] ACTIVE (escalation): Confront compromised ally');
    expect(result).toContain('[ ] PENDING (turning_point): Expose the city directive');
    expect(result).toContain('REMAINING ACTS:');
    expect(result).not.toContain('Current Act Index:');
    expect(result).not.toContain('Current Beat Index:');
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

  it('includes NPC agendas section when agendas are present', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance',
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
      accumulatedNpcAgendas: {
        Azra: {
          npcName: 'Azra',
          currentGoal: 'Ensure the smuggler escapes alive',
          leverage: 'Knows the patrol schedule',
          fear: 'Being captured herself',
          offScreenBehavior: 'Disabling surveillance cameras',
        },
      },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('NPC AGENDAS');
    expect(result).toContain('[Azra]');
    expect(result).toContain('Goal: Ensure the smuggler escapes alive');
    expect(result).toContain('Leverage: Knows the patrol schedule');
    expect(result).toContain('Fear: Being captured herself');
    expect(result).toContain('Off-screen: Disabling surveillance cameras');
  });

  it('includes protagonist affect section when parentProtagonistAffect is provided', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance',
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
      parentProtagonistAffect: {
        primaryEmotion: 'dread',
        primaryIntensity: 'strong',
        primaryCause: 'The sound of boots echoing closer',
        secondaryEmotions: [{ emotion: 'resolve', cause: 'No other option left' }],
        dominantMotivation: 'Survival at any cost',
      },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain("PROTAGONIST'S CURRENT EMOTIONAL STATE:");
    expect(result).toContain('DREAD');
    expect(result).toContain('strong');
    expect(result).toContain('Survival at any cost');
  });

  it('omits protagonist affect section when parentProtagonistAffect is undefined', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance',
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

    expect(result).not.toContain("PROTAGONIST'S CURRENT EMOTIONAL STATE:");
  });

  it('includes protagonist guidance speech subsection when provided', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance',
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
      protagonistGuidance: {
        suggestedSpeech: 'Get lost, I never want to see you again.',
      },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('PROTAGONIST GUIDANCE (PLAYER INTENT)');
    expect(result).toContain('SPEECH the player wants the protagonist to say');
    expect(result).toContain('Get lost, I never want to see you again.');
    expect(result).toContain('do not treat it as optional');
  });

  it('omits protagonist guidance section when not provided', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance',
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

    expect(result).not.toContain('PROTAGONIST GUIDANCE');
  });

  it('omits protagonist guidance section when blank after trim', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance',
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
      protagonistGuidance: { suggestedSpeech: '   ' },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).not.toContain('PROTAGONIST GUIDANCE');
  });

  it('includes all guidance subsections when all fields are present', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance',
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
      protagonistGuidance: {
        suggestedEmotions: 'Furious but controlled.',
        suggestedThoughts: 'This deal is a setup.',
        suggestedSpeech: 'Drop the weapon.',
      },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('EMOTIONAL STATE the player wants the protagonist to feel:');
    expect(result).toContain('INNER THOUGHTS the player wants the protagonist to have:');
    expect(result).toContain('SPEECH the player wants the protagonist to say:');
  });

  it('omits NPC agendas section when no agendas exist', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      characterConcept: 'A biotech smuggler',
      worldbuilding: '',
      tone: 'gritty cyberpunk',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'A silent corridor stretches ahead.',
      selectedChoice: 'Advance',
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

    expect(result).not.toContain('NPC AGENDAS');
  });
});
