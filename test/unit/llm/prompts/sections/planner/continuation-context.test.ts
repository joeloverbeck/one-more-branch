import {
  ConstraintType,
  ThreatType,
  ThreadType,
  Urgency,
} from '../../../../../../src/models/state/index.js';
import type {
  AccumulatedStructureState,
  MilestoneRole,
  StoryStructure,
} from '../../../../../../src/models/story-arc.js';
import type { ContinuationPagePlanContext } from '../../../../../../src/llm/context-types.js';
import {
  buildAccountantContinuationContextSection,
  buildPlannerContinuationContextSection,
  buildEscalationDirective,
} from '../../../../../../src/llm/prompts/sections/planner/continuation-context.js';
import { buildMinimalDecomposedCharacter, MINIMAL_DECOMPOSED_WORLD } from '../../../../../fixtures/decomposed';

describe('planner continuation context section', () => {
  it('builds accountant continuation context without planner-only sections', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
      globalCanon: ['Emergency shutters lock by district'],
      globalCharacterCanon: {},
      previousNarrative: 'The alarm shifts from amber to red.',
      selectedChoice: 'Cut power to the lock grid',
      accumulatedInventory: [{ id: 'inv-1', text: 'Thermal keycard' }],
      accumulatedHealth: [{ id: 'hp-1', text: 'Fractured wrist' }],
      accumulatedCharacterState: {},
      activeState: {
        currentLocation: 'South lock corridor',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
      grandparentNarrative: 'A previous scene body that should not be present for accountant.',
      ancestorSummaries: [{ pageId: 5, summary: 'Bypassed two checkpoints.' }],
      parentPacingDirective: 'Escalate aggressively.',
      thematicValenceTrajectory: [
        { pageId: 6, thematicValence: 'THESIS_SUPPORTING' },
        { pageId: 7, thematicValence: 'THESIS_SUPPORTING' },
        { pageId: 8, thematicValence: 'THESIS_SUPPORTING' },
      ],
    };

    const result = buildAccountantContinuationContextSection(context);

    expect(result).toContain('=== ACCOUNTANT CONTEXT: CONTINUATION ===');
    expect(result).toContain('ESTABLISHED WORLD FACTS:');
    expect(result).toContain("PLAYER'S CHOICE:");
    expect(result).not.toContain('=== PACING BRIEFING (from story analyst) ===');
    expect(result).not.toContain('=== THEMATIC TRAJECTORY ===');
    expect(result).not.toContain('SCENE BEFORE LAST (full text for style continuity):');
    expect(result).not.toContain('TONE/GENRE:');
  });

  it('includes continuation state and previous scene context', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [
        buildMinimalDecomposedCharacter('A biotech smuggler'),
        buildMinimalDecomposedCharacter('Azra', { rawDescription: 'Ex-military fixer with a debt to the protagonist' }),
      ],
      decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'A quarantined coastal megacity.', scope: 'global' }], rawWorldbuilding: 'A quarantined coastal megacity.' },
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
    expect(result).not.toContain('CHARACTER CONCEPT:');
    expect(result).toContain('CHARACTERS (structured profiles):');
    expect(result).toContain('Azra');
    expect(result).toContain('ESTABLISHED WORLD FACTS:');
    expect(result).toContain('- [inv-1] Spoofed access token');
    expect(result).toContain('- [th-2] (ENVIRONMENTAL) Counterintrusion daemon active');
    expect(result).toContain('- [td-1] (MYSTERY/MEDIUM)');
    expect(result).toContain('EARLIER SCENE SUMMARIES:');
    expect(result).toContain('SCENE BEFORE LAST (full text for style continuity):');
    expect(result).toContain("PLAYER'S CHOICE:");
    expect(result).toContain('Trigger the blackout relay');
  });

  it('adds thematic trajectory warning on 3+ consecutive same-valence scenes', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [],
      thematicValenceTrajectory: [
        { pageId: 2, thematicValence: 'THESIS_SUPPORTING' },
        { pageId: 3, thematicValence: 'THESIS_SUPPORTING' },
        { pageId: 4, thematicValence: 'THESIS_SUPPORTING' },
      ],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('=== THEMATIC TRAJECTORY ===');
    expect(result).toContain('WARNING: The last 3 scenes all trend THESIS_SUPPORTING.');
    expect(result).toContain('opposing argument (ANTITHESIS_SUPPORTING)');
  });

  it('adds depth-vs-breadth warning on 3+ consecutive broadening scenes', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [],
      narrativeFocusTrajectory: [
        { pageId: 2, narrativeFocus: 'BROADENING' },
        { pageId: 3, narrativeFocus: 'BROADENING' },
        { pageId: 4, narrativeFocus: 'BROADENING' },
      ],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('=== DEPTH VS BREADTH TRAJECTORY ===');
    expect(result).toContain('WARNING: The last 3 scenes trend BROADENING.');
    expect(result).toContain('Plan should prioritize DEEPENING');
  });

  it('adds dramatic irony section when accumulated knowledge asymmetry exists', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [
        {
          characterName: 'Captain Voss',
          knownFacts: ['The reactor lock is unstable.'],
          falseBeliefs: ['The protagonist sabotaged the lock.'],
          secrets: ['Voss falsified the maintenance logs.'],
        },
      ],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('=== DRAMATIC IRONY OPPORTUNITIES ===');
    expect(result).toContain('Captain Voss');
    expect(result).toContain('False beliefs: The protagonist sabotaged the lock.');
    expect(result).toContain('Secrets: Voss falsified the maintenance logs.');
  });

  it('includes parent dramatic irony opportunity strings in the section', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [
        {
          characterName: 'Captain Voss',
          knownFacts: [],
          falseBeliefs: ['The protagonist sabotaged the lock.'],
          secrets: [],
        },
      ],
      parentDramaticIronyOpportunities: [
        'Voss will confront the protagonist about the sabotage, not knowing it was his own lieutenant.',
        'The protagonist can exploit Voss\'s false belief to gain access to the reactor.',
      ],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('=== DRAMATIC IRONY OPPORTUNITIES ===');
    expect(result).toContain('Analyst-identified opportunities from previous scene:');
    expect(result).toContain('Voss will confront the protagonist about the sabotage');
    expect(result).toContain('The protagonist can exploit Voss\'s false belief');
  });

  it('renders dramatic irony section when only opportunities exist without knowledge state', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [],
      parentDramaticIronyOpportunities: [
        'The merchant does not know the artifact is a fake.',
      ],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('=== DRAMATIC IRONY OPPORTUNITIES ===');
    expect(result).toContain('The merchant does not know the artifact is a fake.');
  });

  it('omits dramatic irony section when both knowledge state and opportunities are empty', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [],
      parentDramaticIronyOpportunities: [],
    };

    const result = buildPlannerContinuationContextSection(context);
    expect(result).not.toContain('=== DRAMATIC IRONY OPPORTUNITIES ===');
  });

  it('omits dramatic irony section when accumulated knowledge asymmetry is empty', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [],
    };

    const result = buildPlannerContinuationContextSection(context);
    expect(result).not.toContain('=== DRAMATIC IRONY OPPORTUNITIES ===');
  });

  it('adds late-act premise promise warning when promises remain unfulfilled', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [],
      premisePromises: [
        'A tribunal ritual is turned into a tactical weapon.',
        'The protagonist must expose the purge ledger in public.',
      ],
      fulfilledPremisePromises: ['A tribunal ritual is turned into a tactical weapon.'],
      structure: {
        overallTheme: 'Loyalty under impossible pressure',
        premise: 'A smuggler must expose corruption before a citywide purge.',
        openingImage: 'An opening image placeholder.',
        closingImage: 'A closing image placeholder.',
        pacingBudget: { targetPagesMin: 20, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Act 1',
            objective: 'Setup',
            stakes: 'Failure',
            entryCondition: 'Start',
            milestones: [{ id: '1.1', name: 'Milestone 1', description: 'Setup', objective: 'Setup', causalLink: 'Because setup.', role: 'setup', escalationType: null, secondaryEscalationType: null, crisisType: null, expectedGapMagnitude: null, isMidpoint: false, midpointType: null, uniqueScenarioHook: null, approachVectors: null, setpieceSourceIndex: null }],
          },
          {
            id: '2',
            name: 'Act 2',
            objective: 'Escalate',
            stakes: 'Failure',
            entryCondition: 'Escalate',
            milestones: [{ id: '2.1', name: 'Milestone 2', description: 'Escalate', objective: 'Escalate', causalLink: 'Because escalate.', role: 'escalation', escalationType: 'THREAT_ESCALATION', secondaryEscalationType: null, crisisType: 'BEST_BAD_CHOICE', expectedGapMagnitude: 'MODERATE', isMidpoint: false, midpointType: null, uniqueScenarioHook: null, approachVectors: ['DIRECT_FORCE', 'ANALYTICAL_REASONING'], setpieceSourceIndex: null }],
          },
          {
            id: '3',
            name: 'Act 3',
            objective: 'Resolve',
            stakes: 'Collapse',
            entryCondition: 'Final',
            milestones: [{ id: '3.1', name: 'Milestone 3', description: 'Resolve', objective: 'Resolve', causalLink: 'Because final.', role: 'turning_point', escalationType: 'REVELATION_SHIFT', secondaryEscalationType: null, crisisType: 'IRRECONCILABLE_GOODS', expectedGapMagnitude: 'WIDE', isMidpoint: false, midpointType: null, uniqueScenarioHook: null, approachVectors: ['ANALYTICAL_REASONING', 'PERSUASION_INFLUENCE'], setpieceSourceIndex: null }],
          },
        ],
      },
      accumulatedStructureState: {
        currentActIndex: 2,
        currentMilestoneIndex: 0,
        pagesInCurrentMilestone: 1,
        pacingNudge: null,
        milestoneProgressions: [{ milestoneId: '3.1', status: 'active' }],
      },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('=== PREMISE PROMISE WARNING (LATE ACT) ===');
    expect(result).toContain('The protagonist must expose the purge ledger in public.');
    expect(result).not.toContain('A tribunal ritual is turned into a tactical weapon.');
  });

  it('omits character concept and marks protagonist when structured characters are present', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
      decomposedCharacters: [
        {
          name: 'Rin',
          coreTraits: ['resourceful', 'stubborn'],
          superObjective: 'Expose station sabotage',
          protagonistRelationship: null,
          knowledgeBoundaries: 'Knows courier routes, not reactor internals',
          appearance: 'Lean, grease-stained uniform',
          rawDescription: 'A courier',
          speechFingerprint: {
            catchphrases: [],
            vocabularyProfile: 'Direct and technical',
            sentencePatterns: 'Short directives',
            verbalTics: [],
            dialogueSamples: [],
            metaphorFrames: '',
            antiExamples: [],
            discourseMarkers: [],
            registerShifts: '',
          },
          decisionPattern: '',
          coreBeliefs: [],
          conflictPriority: '',
        },
        {
          name: 'Voss',
          coreTraits: ['secretive'],
          superObjective: 'Contain evidence leak',
          protagonistRelationship: {
            valence: -2,
            dynamic: 'antagonist',
            history: 'Was Rin\'s station commander before the cover-up.',
            currentTension: 'Suspects Rin is gathering evidence against him.',
            leverage: 'Controls station security access.',
          },
          knowledgeBoundaries: 'Knows internal security systems',
          appearance: 'Tall in officer coat',
          rawDescription: 'A station officer',
          speechFingerprint: {
            catchphrases: [],
            vocabularyProfile: 'Formal command language',
            sentencePatterns: 'Measured statements',
            verbalTics: [],
            dialogueSamples: [],
            metaphorFrames: '',
            antiExamples: [],
            discourseMarkers: [],
            registerShifts: '',
          },
          decisionPattern: '',
          coreBeliefs: [],
          conflictPriority: '',
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
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
      structure: {
        overallTheme: 'Loyalty under impossible pressure',
        premise: 'A smuggler must expose corruption before a citywide purge.',
        openingImage: 'An opening image placeholder.',
        closingImage: 'A closing image placeholder.',
        pacingBudget: { targetPagesMin: 20, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
        anchorMoments: {
          incitingIncident: { actIndex: 0, description: 'The purge order hits the streets.' },
          midpoint: { actIndex: 0, milestoneSlot: 1, midpointType: 'FALSE_VICTORY' },
          climax: { actIndex: 1, description: 'The proof reaches the public.' },
          signatureScenarioPlacement: null,
        },
        acts: [
          {
            id: '1',
            name: 'Containment',
            objective: 'Escape initial crackdown',
            stakes: 'Capture means execution.',
            entryCondition: 'Purge starts',
            actQuestion: 'Can the smuggler keep the proof alive long enough to matter?',
            exitReversal: 'Escaping the crackdown exposes how high the conspiracy reaches.',
            promiseTargets: ['The citywide purge can be exposed'],
            obligationTargets: [],
            milestones: [
              {
                id: '1.1',
                name: 'Route secured',
                description: 'Secure route through lockdown',
                objective: 'Reach safe passage',
                causalLink: 'The purge seals normal routes.',
                exitCondition: 'A reliable path through the lockdown is secured.',
                role: 'setup',
                escalationType: null,
                secondaryEscalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                isMidpoint: false,
                midpointType: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
              {
                id: '1.2',
                name: 'Compromised ally',
                description: 'Confront compromised ally',
                objective: 'Prevent betrayal',
                causalLink: 'The ally controls the only covert route.',
                exitCondition: 'The ally either recommits or is neutralized before they can betray the route.',
                role: 'escalation',
                escalationType: null,
                secondaryEscalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                isMidpoint: false,
                midpointType: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
              {
                id: '1.3',
                name: 'Directive exposed',
                description: 'Expose the city directive',
                objective: 'Broadcast proof',
                causalLink: 'Proof of the directive changes what resistance cells can do.',
                exitCondition: 'The directive is public enough that the resistance can mobilize around it.',
                role: 'turning_point',
                escalationType: null,
                secondaryEscalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                isMidpoint: false,
                midpointType: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
          {
            id: '2',
            name: 'Counterstrike',
            objective: 'Take down purge command',
            stakes: 'City falls if command survives.',
            entryCondition: 'Proof reaches resistance',
            actQuestion: 'What does it take to turn survival into offense?',
            exitReversal: '',
            promiseTargets: ['The citywide purge can be exposed'],
            obligationTargets: [],
            milestones: [
              {
                id: '2.1',
                name: 'Command raid',
                description: 'Raid central command',
                objective: 'Neutralize command hub',
                causalLink: 'The proof reveals where command is vulnerable.',
                exitCondition: 'Purge command loses control of the city response grid.',
                role: 'resolution',
                escalationType: null,
                secondaryEscalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                isMidpoint: false,
                midpointType: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
        ],
      },
      accumulatedStructureState: {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        pagesInCurrentMilestone: 1,
        pacingNudge: null,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Route secured through maintenance' },
          { milestoneId: '1.2', status: 'active' },
          { milestoneId: '1.3', status: 'pending' },
          { milestoneId: '2.1', status: 'pending' },
        ],
      },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('=== STORY STRUCTURE ===');
    expect(result).toContain('CURRENT ACT: Containment (Act 1 of 2)');
    expect(result).toContain('[x] CONCLUDED (setup): Secure route through lockdown');
    expect(result).toContain('[>] ACTIVE (escalation): Confront compromised ally');
    expect(result).toContain('[ ] PENDING (turning_point): Expose the city directive');
    expect(result).toContain(
      'Act Question: Can the smuggler keep the proof alive long enough to matter?'
    );
    expect(result).toContain(
      'Expected Exit Reversal: Escaping the crackdown exposes how high the conspiracy reaches.'
    );
    expect(result).toContain('Promise Targets: The citywide purge can be exposed');
    expect(result).toContain(
      'Exit condition: The ally either recommits or is neutralized before they can betray the route.'
    );
    expect(result).toContain('REMAINING ACTS:');
    expect(result).not.toContain('Current Act Index:');
    expect(result).not.toContain('Current Milestone Index:');
  });

  it('omits empty structural guidance fields when they are unavailable', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [],
      structure: {
        overallTheme: 'Pressure reveals loyalties',
        premise: 'A courier runs proof through a siege.',
        openingImage: 'Lights die in a civic square.',
        closingImage: 'Emergency beacons rise over the city.',
        pacingBudget: { targetPagesMin: 12, targetPagesMax: 18 },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
        anchorMoments: {
          incitingIncident: { actIndex: 0, description: 'The siege begins.' },
          midpoint: { actIndex: 0, milestoneSlot: 0, midpointType: 'FALSE_DEFEAT' },
          climax: { actIndex: 0, description: 'The proof reaches the public archive.' },
          signatureScenarioPlacement: null,
        },
        acts: [
          {
            id: '1',
            name: 'Siege Run',
            objective: 'Carry proof across the district.',
            stakes: 'Capture means disappearance.',
            entryCondition: 'The courier is identified.',
            actQuestion: '',
            exitReversal: '',
            promiseTargets: [],
            obligationTargets: [],
            milestones: [
              {
                id: '1.1',
                name: 'Break contact',
                description: 'Get out of the marked street',
                objective: 'Break contact',
                causalLink: 'A checkpoint seals the main route.',
                exitCondition: '',
                role: 'setup',
                escalationType: null,
                secondaryEscalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                isMidpoint: false,
                midpointType: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
        ],
      },
      accumulatedStructureState: {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
        milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).not.toContain('Act Question:');
    expect(result).not.toContain('Expected Exit Reversal:');
    expect(result).not.toContain('Promise Targets:');
    expect(result).not.toContain('Exit condition:');
  });

  it('renders optional sections as (none) when state is empty', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
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
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
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

  it('includes pending consequences section when delayed consequences are present', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [],
      accumulatedDelayedConsequences: [
        {
          id: 'dc-2',
          description: 'A patrol ledger has flagged the protagonist.',
          triggerCondition: 'A checkpoint performs identity verification.',
          minPagesDelay: 1,
          maxPagesDelay: 4,
          currentAge: 2,
          triggered: false,
          sourcePageId: 1,
        },
      ],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('PENDING CONSEQUENCES:');
    expect(result).toContain('[dc-2]');
    expect(result).toContain('trigger window 1-4');
    expect(result).toContain('A checkpoint performs identity verification.');
  });

  it('includes protagonist affect section when parentProtagonistAffect is provided', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
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
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).not.toContain("PROTAGONIST'S CURRENT EMOTIONAL STATE:");
  });

  it('includes protagonist guidance speech subsection when provided', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
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
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).not.toContain('PROTAGONIST GUIDANCE');
  });

  it('omits protagonist guidance section when blank after trim', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
      protagonistGuidance: { suggestedSpeech: '   ' },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).not.toContain('PROTAGONIST GUIDANCE');
  });

  it('includes all guidance subsections when all fields are present', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
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
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
    accumulatedPromises: [],
    accumulatedKnowledgeState: [],
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).not.toContain('NPC AGENDAS');
  });

  it('excludes protagonist directive and guidance when includeProtagonistDirective is false', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [],
      protagonistGuidance: {
        suggestedEmotions: 'Furious but controlled.',
        suggestedThoughts: 'This deal is a setup.',
        suggestedSpeech: 'Drop the weapon.',
      },
    };

    const result = buildPlannerContinuationContextSection(context, {
      includeProtagonistDirective: false,
    });

    expect(result).not.toContain('PROTAGONIST IDENTITY');
    expect(result).not.toContain('PROTAGONIST GUIDANCE');
  });

  it('includes escalation directive when active milestone role is escalation', () => {
    const context: ContinuationPagePlanContext = {
      mode: 'continuation',
      tone: 'gritty cyberpunk',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A biotech smuggler')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
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
      accumulatedPromises: [],
      accumulatedKnowledgeState: [],
      structure: {
        overallTheme: 'Loyalty under pressure',
        premise: 'A smuggler must escape.',
        openingImage: 'An opening image placeholder.',
        closingImage: 'A closing image placeholder.',
        pacingBudget: { targetPagesMin: 20, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Act 1',
            objective: 'Escape',
            stakes: 'Death',
            entryCondition: 'Start',
            milestones: [
              {
                id: '1.1',
                name: 'Setup',
                description: 'Secure route',
                objective: 'Reach safe passage',
                role: 'setup',
              },
              {
                id: '1.2',
                name: 'Escalation',
                description: 'Confront ally',
                objective: 'Prevent betrayal',
                role: 'escalation',
              },
            ],
          },
        ],
      },
      accumulatedStructureState: {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        pagesInCurrentMilestone: 1,
        pacingNudge: null,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Route secured through maintenance' },
          { milestoneId: '1.2', status: 'active' },
        ],
      },
    };

    const result = buildPlannerContinuationContextSection(context);

    expect(result).toContain('=== ESCALATION DIRECTIVE ===');
    expect(result).toContain('MUST raise stakes beyond the previous milestone');
    expect(result).toContain('Route secured through maintenance');
    expect(result).toContain('"More complicated" is NOT escalation');
  });
});

describe('buildEscalationDirective', () => {
  const makeStructure = (
    milestoneRoles: Array<{
      id: string;
      role: MilestoneRole;
      escalationType?: string | null;
      secondaryEscalationType?: string | null;
      crisisType?: string | null;
      isMidpoint?: boolean;
      midpointType?: string | null;
    }>
  ): StoryStructure => ({
    overallTheme: 'Test',
    premise: 'Test',
    openingImage: 'A lone figure at a shattered gate.',
    closingImage: 'That figure returns through a rebuilt gate at dawn.',
    pacingBudget: { targetPagesMin: 10, targetPagesMax: 20 },
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Act 1',
        objective: 'Obj',
        stakes: 'Stakes',
        entryCondition: 'Start',
        milestones: milestoneRoles.map((b) => ({
          id: b.id,
          name: `Milestone ${b.id}`,
          description: `Desc for ${b.id}`,
          objective: `Obj for ${b.id}`,
          role: b.role,
          escalationType: b.escalationType ?? null,
          secondaryEscalationType: b.secondaryEscalationType ?? null,
          crisisType: b.crisisType ?? null,
          isMidpoint: b.isMidpoint ?? false,
          midpointType: b.midpointType ?? null,
        })),
      },
    ],
  });

  it('returns empty string when structure is undefined', () => {
    expect(buildEscalationDirective(undefined, undefined)).toBe('');
  });

  it('returns empty string when milestone role is setup', () => {
    const structure = makeStructure([{ id: '1.1', role: 'setup' }]);
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
    };

    expect(buildEscalationDirective(structure, state)).toBe('');
  });

  it('returns empty string for non-final resolution milestones', () => {
    const structure: StoryStructure = {
      overallTheme: 'Test',
      premise: 'Test',
      openingImage: 'A lone figure at a shattered gate.',
      closingImage: 'That figure returns through a rebuilt gate at dawn.',
      pacingBudget: { targetPagesMin: 10, targetPagesMax: 20 },
      generatedAt: new Date('2026-01-01T00:00:00.000Z'),
      acts: [
        {
          id: '1',
          name: 'Act 1',
          objective: 'Obj',
          stakes: 'Stakes',
          entryCondition: 'Start',
          milestones: [
            {
              id: '1.1',
              name: 'Milestone 1.1',
              description: 'Desc',
              objective: 'Obj',
              causalLink: 'Because setup.',
              role: 'resolution',
              escalationType: null,
              secondaryEscalationType: null,
              crisisType: null,
              expectedGapMagnitude: null,
              isMidpoint: false,
              midpointType: null,
              uniqueScenarioHook: null,
              approachVectors: null,
              setpieceSourceIndex: null,
            },
          ],
        },
        {
          id: '2',
          name: 'Act 2',
          objective: 'Obj 2',
          stakes: 'Stakes 2',
          entryCondition: 'Continue',
          milestones: [
            {
              id: '2.1',
              name: 'Milestone 2.1',
              description: 'Desc 2',
              objective: 'Obj 2',
              causalLink: 'Because continue.',
              role: 'resolution',
              escalationType: null,
              secondaryEscalationType: null,
              crisisType: null,
              expectedGapMagnitude: null,
              isMidpoint: false,
              midpointType: null,
              uniqueScenarioHook: null,
              approachVectors: null,
              setpieceSourceIndex: null,
            },
          ],
        },
      ],
    };
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
    };

    expect(buildEscalationDirective(structure, state)).toBe('');
  });

  it('returns final resolution image directive for last milestone of final act', () => {
    const structure = makeStructure([{ id: '1.1', role: 'resolution' }]);
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
    };

    const result = buildEscalationDirective(structure, state);
    expect(result).toContain('=== FINAL RESOLUTION IMAGE DIRECTIVE ===');
    expect(result).toContain('closing image');
    expect(result).toContain('mirrors or contrasts the opening image');
  });

  it('returns reflection directive when milestone role is reflection', () => {
    const structure = makeStructure([
      { id: '1.1', role: 'turning_point' },
      { id: '1.2', role: 'reflection' },
    ]);
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 1,
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
      milestoneProgressions: [
        { milestoneId: '1.1', status: 'concluded', resolution: 'Hard truth accepted' },
        { milestoneId: '1.2', status: 'active' },
      ],
    };

    const result = buildEscalationDirective(structure, state);

    expect(result).toContain('=== REFLECTION DIRECTIVE ===');
    expect(result).toContain('thematic or internal deepening');
    expect(result).toContain('Previous milestone resolved: "Hard truth accepted"');
    expect(result).toContain('Reflection is NOT recap');
  });

  it('returns escalation directive with previous milestone resolution', () => {
    const structure = makeStructure([
      { id: '1.1', role: 'setup' },
      { id: '1.2', role: 'escalation' },
    ]);
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 1,
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
      milestoneProgressions: [
        { milestoneId: '1.1', status: 'concluded', resolution: 'Safehouse secured' },
        { milestoneId: '1.2', status: 'active' },
      ],
    };

    const result = buildEscalationDirective(structure, state);

    expect(result).toContain('=== ESCALATION DIRECTIVE ===');
    expect(result).toContain('Previous milestone resolved: "Safehouse secured"');
    expect(result).toContain('more costly to fail');
  });

  it('returns turning point directive when milestone role is turning_point', () => {
    const structure = makeStructure([
      { id: '1.1', role: 'setup' },
      { id: '1.2', role: 'turning_point' },
    ]);
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 1,
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
      milestoneProgressions: [
        { milestoneId: '1.1', status: 'concluded', resolution: 'Route found' },
        { milestoneId: '1.2', status: 'active' },
      ],
    };

    const result = buildEscalationDirective(structure, state);

    expect(result).toContain('=== TURNING POINT DIRECTIVE ===');
    expect(result).toContain('irreversible shift');
    expect(result).toContain('Previous milestone resolved: "Route found"');
    expect(result).toContain('status quo is permanently destroyed');
  });

  it('includes crisis type guidance when present on active milestone', () => {
    const structure = makeStructure([
      { id: '1.1', role: 'setup' },
      {
        id: '1.2',
        role: 'turning_point',
        escalationType: 'REVELATION_SHIFT',
        crisisType: 'IRRECONCILABLE_GOODS',
      },
    ]);
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 1,
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
      milestoneProgressions: [
        { milestoneId: '1.1', status: 'concluded', resolution: 'Route found' },
        { milestoneId: '1.2', status: 'active' },
      ],
    };

    const result = buildEscalationDirective(structure, state);

    expect(result).toContain('Turning point mechanism: REVELATION_SHIFT');
    expect(result).toContain(
      'Crisis type: IRRECONCILABLE_GOODS — shape the scene so the pivotal decision matches this crisis form.'
    );
  });

  it('includes secondary escalation guidance when present on active milestone', () => {
    const structure = makeStructure([
      { id: '1.1', role: 'setup' },
      {
        id: '1.2',
        role: 'turning_point',
        escalationType: 'THREAT_ESCALATION',
        secondaryEscalationType: 'REVELATION_SHIFT',
      },
    ]);
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 1,
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
      milestoneProgressions: [
        { milestoneId: '1.1', status: 'concluded', resolution: 'Route found' },
        { milestoneId: '1.2', status: 'active' },
      ],
    };

    const result = buildEscalationDirective(structure, state);

    expect(result).toContain('Turning point mechanism: THREAT_ESCALATION');
    expect(result).toContain(
      'Secondary turning point mechanism: REVELATION_SHIFT — ensure the irreversible shift lands across both escalation axes.'
    );
  });

  it('handles first milestone in act with no previous resolution', () => {
    const structure = makeStructure([{ id: '1.1', role: 'escalation' }]);
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
    };

    const result = buildEscalationDirective(structure, state);

    expect(result).toContain('=== ESCALATION DIRECTIVE ===');
    expect(result).not.toContain('Previous milestone resolved:');
  });

  it('includes midpoint directive even when role is setup', () => {
    const structure = makeStructure([
      { id: '1.1', role: 'setup', isMidpoint: true, midpointType: 'FALSE_DEFEAT' },
    ]);
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
    };

    const result = buildEscalationDirective(structure, state);

    expect(result).toContain('=== MIDPOINT DIRECTIVE ===');
    expect(result).toContain('Midpoint type: FALSE_DEFEAT');
    expect(result).toContain('central reversal');
  });
});
