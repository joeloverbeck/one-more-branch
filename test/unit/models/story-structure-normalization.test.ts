import { createStoryStructure, mergePreservedWithRegenerated } from '../../../src/engine';
import { parseStructureResponseObject } from '../../../src/llm/structure-response-parser';
import { generateStoryId } from '../../../src/models';
import {
  normalizeAnchorMoments,
  normalizeGeneratedMilestoneFields,
} from '../../../src/models/story-structure-normalization';
import { deserializeStory } from '../../../src/persistence/story-serializer';
import type { StoryFileData } from '../../../src/persistence/story-serializer-types';

function createParsedStructure(): Record<string, unknown> {
  return {
    overallTheme: 'Trust must survive betrayal.',
    premise: 'A captain must outlast the tribunal that framed her.',
    openingImage: 'The captain alone before the tribunal chamber.',
    closingImage: 'The captain at dawn with the fleet restored.',
    pacingBudget: { targetPagesMin: 18, targetPagesMax: 36 },
    acts: [
      {
        name: 'Act I',
        objective: 'Survive the framing.',
        stakes: 'Execution follows failure.',
        entryCondition: 'The tribunal names the captain a traitor.',
        milestones: [
          {
            name: 'Harbor escape',
            description: 'Escape the tribunal harbor blockade.',
            objective: 'Reach the hidden safehouse.',
            causalLink: 'Because the tribunal locks every official route.',
            role: 'INVALID_ROLE',
            expectedGapMagnitude: 'IMPOSSIBLE',
            approachVectors: ['DIRECT_FORCE', 'NOT_REAL'],
            isMidpoint: false,
            midpointType: null,
          },
          {
            name: 'Smuggler accord',
            description: 'Secure a route through the reefs.',
            objective: 'Earn the smugglers’ cooperation.',
            causalLink: 'Because the escape exposes the only viable route.',
            exitCondition: 'The smugglers agree to guide the fleet.',
            role: 'turning_point',
            isMidpoint: false,
            midpointType: null,
          },
        ],
      },
      {
        name: 'Act II',
        objective: 'Turn suspicion into leverage.',
        stakes: 'Martial law becomes permanent.',
        entryCondition: 'The captain reaches hidden allies.',
        actQuestion: 'Can proof of corruption fracture the tribunal?',
        exitReversal: 'The tribunal survives exposure and seizes the docks.',
        promiseTargets: ['The tribunal can be exposed'],
        obligationTargets: ['key_clue_recontextualized'],
        milestones: [
          {
            name: 'Cipher intercept',
            description: 'Steal the tribunal signal cipher.',
            objective: 'Map the loyalist courier chain.',
            causalLink: 'Because the smugglers reveal a signaling window.',
            exitCondition: 'The courier chain is exposed.',
            role: 'escalation',
            isMidpoint: false,
            midpointType: null,
          },
          {
            name: 'False triumph',
            description: 'Expose one corrupt admiral in public.',
            objective: 'Force the fleet to question the tribunal.',
            causalLink: 'Because the cipher reveals the admiral’s payments.',
            exitCondition: 'The admiral is exposed before the fleet.',
            role: 'turning_point',
            isMidpoint: true,
            midpointType: 'FALSE_VICTORY',
          },
        ],
      },
      {
        name: 'Act III',
        objective: 'End tribunal rule.',
        stakes: 'The fleet collapses into tyranny.',
        entryCondition: 'The tribunal fortifies the capital harbor.',
        actQuestion: 'What new order replaces the tribunal?',
        exitReversal: '',
        promiseTargets: ['The tribunal can be exposed'],
        obligationTargets: ['culprit_unmasked'],
        milestones: [
          {
            name: 'Storm breach',
            description: 'Break the harbor chain in a storm.',
            objective: 'Open the capital to allied ships.',
            causalLink: 'Because exposed corruption isolates the loyalists.',
            exitCondition: 'The harbor chain is broken.',
            role: 'turning_point',
            isMidpoint: false,
            midpointType: null,
          },
          {
            name: 'Tribunal reckoning',
            description: 'Force the tribunal to answer before the fleet.',
            objective: 'Transfer command away from the conspirators.',
            causalLink: 'Because the breach strands the tribunal leadership.',
            exitCondition: 'Command transfers to the restored fleet council.',
            role: 'resolution',
            isMidpoint: false,
            midpointType: null,
          },
        ],
      },
    ],
  };
}

function createLegacyStoryFileData(): StoryFileData {
  return {
    id: generateStoryId(),
    title: 'Normalization Test Story',
    characterConcept: 'A disgraced captain',
    worldbuilding: 'A storm-lashed archipelago',
    tone: 'tense nautical intrigue',
    npcs: null,
    startingSituation: null,
    globalCanon: [],
    globalCharacterCanon: {},
    structure: {
      acts: [
        {
          id: '1',
          name: 'Act I',
          objective: 'Survive the framing.',
          stakes: 'Execution follows failure.',
          entryCondition: 'The tribunal names the captain a traitor.',
          milestones: [
            {
              id: '1.1',
              name: 'Harbor escape',
              description: 'Escape the tribunal harbor blockade.',
              objective: 'Reach the hidden safehouse.',
              causalLink: 'Because the tribunal locks every official route.',
              role: 'INVALID_ROLE',
              expectedGapMagnitude: 'IMPOSSIBLE',
              approachVectors: ['DIRECT_FORCE', 'NOT_REAL'],
              isMidpoint: false,
              midpointType: null,
            },
          ],
        },
      ],
      overallTheme: 'Trust must survive betrayal.',
      premise: 'A captain must outlast the tribunal that framed her.',
      openingImage: 'The captain alone before the tribunal chamber.',
      closingImage: 'The captain at dawn with the fleet restored.',
      pacingBudget: { targetPagesMin: 18, targetPagesMax: 36 },
      generatedAt: '2026-03-14T00:00:00.000Z',
    },
    structureVersions: [],
    premisePromises: [],
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z',
  };
}

describe('story-structure-normalization', () => {
  it('fills missing anchor moment fields from canonical defaults', () => {
    expect(
      normalizeAnchorMoments(
        {
          midpoint: { actIndex: 2, milestoneSlot: 1, midpointType: 'FALSE_VICTORY' },
        },
        3
      )
    ).toEqual({
      incitingIncident: { actIndex: 0, description: '' },
      midpoint: { actIndex: 2, milestoneSlot: 1, midpointType: 'FALSE_VICTORY' },
      climax: { actIndex: 2, description: '' },
      signatureScenarioPlacement: null,
    });
  });

  it('normalizes generated milestone metadata and enforces midpoint invariants', () => {
    expect(
      normalizeGeneratedMilestoneFields(
        {
          role: 'INVALID_ROLE',
          expectedGapMagnitude: 'IMPOSSIBLE',
          approachVectors: ['DIRECT_FORCE', 'NOT_REAL'],
          isMidpoint: false,
          midpointType: null,
        },
        '1.1'
      )
    ).toMatchObject({
      exitCondition: '',
      role: 'escalation',
      expectedGapMagnitude: null,
      approachVectors: ['DIRECT_FORCE'],
    });

    expect(() =>
      normalizeGeneratedMilestoneFields(
        {
          isMidpoint: true,
          midpointType: null,
        },
        '1.2'
      )
    ).toThrow('Structure milestone 1.2 is midpoint-tagged but missing midpointType');
  });

  it('keeps parser, factory, serializer, and rewrite merge on the same canonical defaults', () => {
    const parsed = createParsedStructure();
    const normalizedGenerated = parseStructureResponseObject(parsed);
    const runtimeFromGeneration = createStoryStructure({
      ...normalizedGenerated,
      rawResponse: '{"mock":true}',
    });
    const runtimeFromPersistence = deserializeStory(createLegacyStoryFileData()).structure!;
    const merged = mergePreservedWithRegenerated(
      [
        {
          actIndex: 0,
          milestoneIndex: 0,
          milestoneId: '1.1',
          name: 'Harbor escape',
          description: 'Escape the tribunal harbor blockade.',
          objective: 'Reach the hidden safehouse.',
          causalLink: 'Because the tribunal locks every official route.',
          role: 'INVALID_ROLE',
          expectedGapMagnitude: 'IMPOSSIBLE',
          approachVectors: ['DIRECT_FORCE', 'NOT_REAL'],
          isMidpoint: false,
          midpointType: null,
          exitCondition: undefined as unknown as string,
          escalationType: undefined,
          secondaryEscalationType: undefined,
          crisisType: undefined,
          uniqueScenarioHook: undefined,
          setpieceSourceIndex: undefined,
          obligatorySceneTag: undefined,
          resolution: 'The captain escapes with proof intact.',
        },
      ],
      runtimeFromGeneration,
      'Original theme'
    );

    expect(normalizedGenerated.anchorMoments).toEqual({
      incitingIncident: { actIndex: 0, description: '' },
      midpoint: { actIndex: 1, milestoneSlot: 0, midpointType: 'FALSE_DEFEAT' },
      climax: { actIndex: 2, description: '' },
      signatureScenarioPlacement: null,
    });

    expect(runtimeFromGeneration.acts[0]).toMatchObject({
      actQuestion: '',
      exitReversal: '',
      promiseTargets: [],
      obligationTargets: [],
    });
    expect(runtimeFromPersistence.acts[0]).toMatchObject({
      actQuestion: '',
      exitReversal: '',
      promiseTargets: [],
      obligationTargets: [],
    });

    const expectedMilestoneShape = {
      exitCondition: '',
      role: 'escalation',
      escalationType: null,
      secondaryEscalationType: null,
      crisisType: null,
      expectedGapMagnitude: null,
      isMidpoint: false,
      midpointType: null,
      uniqueScenarioHook: null,
      approachVectors: ['DIRECT_FORCE'],
      setpieceSourceIndex: null,
      obligatorySceneTag: null,
    };

    expect(normalizedGenerated.acts[0]?.milestones[0]).toMatchObject(expectedMilestoneShape);
    expect(runtimeFromGeneration.acts[0]?.milestones[0]).toMatchObject(expectedMilestoneShape);
    expect(runtimeFromPersistence.acts[0]?.milestones[0]).toMatchObject(expectedMilestoneShape);
    expect(merged.acts[0]?.milestones[0]).toMatchObject(expectedMilestoneShape);
  });
});
