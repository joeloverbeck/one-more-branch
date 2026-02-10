import { validateWriterResponse } from '../../../src/llm/schemas/writer-response-transformer';
import { buildFirstPage, createEmptyStructureContext } from '../../../src/engine/page-builder';

/**
 * Integration test: verifies that LLM responses with populated active state fields
 * flow through Zod validation -> response transformation -> page builder
 * and result in non-empty activeStateChanges and accumulatedActiveState on the page.
 */
describe('Active state pipeline integration', () => {
  const rawLlmResponse = {
    narrative: 'You step into the burning tavern. Flames lick the wooden beams above as the innkeeper screams for help. The heat is unbearable.',
    choices: [
      { text: 'Rush to save the innkeeper', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      { text: 'Flee through the back door', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
      { text: 'Search for water', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ],
    currentLocation: 'Burning tavern',
    threatsAdded: ['THREAT_FIRE: The tavern is engulfed in flames and could collapse at any moment'],
    threatsRemoved: [],
    constraintsAdded: ['CONSTRAINT_SMOKE: Thick smoke limits visibility to a few feet'],
    constraintsRemoved: [],
    threadsAdded: ['THREAD_INNKEEPER: The innkeeper is trapped behind the bar'],
    threadsResolved: [],
    newCanonFacts: ['The Golden Flagon tavern is the oldest building in Millhaven'],
    newCharacterCanonFacts: [{ characterName: 'Innkeeper Bram', facts: ['Elderly man with a limp'] }],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: ['Your lungs burn from smoke inhalation'],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    protagonistAffect: {
      primaryEmotion: 'fear',
      primaryIntensity: 'strong',
      primaryCause: 'The building is collapsing around you',
      secondaryEmotions: [{ emotion: 'determination', cause: 'Someone needs your help' }],
      dominantMotivation: 'Save the innkeeper before the roof caves in',
    },
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: false,
  };

  it('should populate activeStateChanges and accumulatedActiveState through the full pipeline', () => {
    // Step 1: Validate + transform through writer-response-transformer
    const generationResult = validateWriterResponse(rawLlmResponse, JSON.stringify(rawLlmResponse));

    // Verify transformer output has populated active state fields
    expect(generationResult.currentLocation).toBe('Burning tavern');
    expect(generationResult.threatsAdded).toEqual([
      'THREAT_FIRE: The tavern is engulfed in flames and could collapse at any moment',
    ]);
    expect(generationResult.constraintsAdded).toEqual([
      'CONSTRAINT_SMOKE: Thick smoke limits visibility to a few feet',
    ]);
    expect(generationResult.threadsAdded).toEqual([
      'THREAD_INNKEEPER: The innkeeper is trapped behind the bar',
    ]);

    // Step 2: Build page via page-builder
    const context = createEmptyStructureContext();
    const page = buildFirstPage(generationResult, context);

    // Step 3: Verify page has populated activeStateChanges
    expect(page.activeStateChanges.newLocation).toBe('Burning tavern');
    expect(page.activeStateChanges.threatsAdded).toEqual([
      'THREAT_FIRE: The tavern is engulfed in flames and could collapse at any moment',
    ]);
    expect(page.activeStateChanges.constraintsAdded).toEqual([
      'CONSTRAINT_SMOKE: Thick smoke limits visibility to a few feet',
    ]);
    expect(page.activeStateChanges.threadsAdded).toEqual([
      'THREAD_INNKEEPER: The innkeeper is trapped behind the bar',
    ]);

    // Step 4: Verify accumulated active state was computed (applied to empty parent)
    expect(page.accumulatedActiveState.currentLocation).toBe('Burning tavern');
    expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
    expect(page.accumulatedActiveState.activeThreats[0]?.id).toBe('th-1');
    expect(page.accumulatedActiveState.activeThreats[0]?.text).toContain('THREAT_FIRE:');
    expect(page.accumulatedActiveState.activeConstraints).toHaveLength(1);
    expect(page.accumulatedActiveState.activeConstraints[0]?.id).toBe('cn-1');
    expect(page.accumulatedActiveState.activeConstraints[0]?.text).toContain('CONSTRAINT_SMOKE:');
    expect(page.accumulatedActiveState.openThreads).toHaveLength(1);
    expect(page.accumulatedActiveState.openThreads[0]?.id).toBe('td-1');
    expect(page.accumulatedActiveState.openThreads[0]?.text).toContain('THREAD_INNKEEPER:');
  });

  it('should populate active state through the writer pipeline', () => {
    // Writer responses don't include beat/deviation fields
    const writerLlmResponse = {
      narrative: 'You step into the burning tavern. Flames lick the wooden beams above as the innkeeper screams for help. The heat is unbearable.',
      choices: [
        { text: 'Rush to save the innkeeper', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Flee through the back door', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
        { text: 'Search for water', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ],
      currentLocation: 'Burning tavern',
      threatsAdded: ['THREAT_FIRE: The tavern is engulfed in flames'],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: ['THREAD_INNKEEPER: The innkeeper is trapped'],
      threadsResolved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'fear',
        primaryIntensity: 'strong',
        primaryCause: 'Fire everywhere',
        secondaryEmotions: [],
        dominantMotivation: 'Survive',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
    };

    const writerResult = validateWriterResponse(writerLlmResponse, JSON.stringify(writerLlmResponse));

    expect(writerResult.currentLocation).toBe('Burning tavern');
    expect(writerResult.threatsAdded).toEqual(['THREAT_FIRE: The tavern is engulfed in flames']);
    expect(writerResult.threadsAdded).toEqual(['THREAD_INNKEEPER: The innkeeper is trapped']);
  });

  it('should default to empty active state when LLM returns empty arrays', () => {
    const emptyActiveStateResponse = {
      ...rawLlmResponse,
      currentLocation: '',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const generationResult = validateWriterResponse(
      emptyActiveStateResponse,
      JSON.stringify(emptyActiveStateResponse),
    );

    const context = createEmptyStructureContext();
    const page = buildFirstPage(generationResult, context);

    expect(page.activeStateChanges.newLocation).toBeNull();
    expect(page.activeStateChanges.threatsAdded).toEqual([]);
    expect(page.accumulatedActiveState.activeThreats).toEqual([]);
    expect(page.accumulatedActiveState.activeConstraints).toEqual([]);
    expect(page.accumulatedActiveState.openThreads).toEqual([]);
  });
});
