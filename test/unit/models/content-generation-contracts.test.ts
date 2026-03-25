import {
  cloneContentPacketContext,
  cloneContentPacketOrigin,
  formatContentExemplarId,
  isContentEvaluation,
  isContentPacketContext,
  isContentPacketOrigin,
  isContentPacketSourceArtifact,
} from '../../../src/models/content-generation-contracts';

function makeValidContext(): {
  premiseSummary: string;
  situationFrame: string;
  worldState: string;
  playerPosition: string;
} {
  return {
    premiseSummary: 'A living fog feeds on memory and is now regulated by the state.',
    situationFrame: 'An archivist must enter a licensed fog zone to recover a stolen memory.',
    worldState: 'The bureau treats memory erosion as routine civic infrastructure.',
    playerPosition:
      'You are an archivist who must enter the licensed fog zone to recover your family history.',
  };
}

function makeValidOrigin(): {
  generationMode: 'pipeline';
  sourceArtifacts: readonly [
    {
      artifactType: 'SPARK';
      sourceId: string;
      contentKind: 'ENTITY';
      summary: string;
      imageSeed: string;
      collisionTags: readonly string[];
    },
  ];
} {
  return {
    generationMode: 'pipeline' as const,
    sourceArtifacts: [
      {
        artifactType: 'SPARK' as const,
        sourceId: 'spark-01',
        contentKind: 'ENTITY' as const,
        summary: 'A sentient fog that eats memory',
        imageSeed: 'A child breathing silver mist from a jar',
        collisionTags: ['memory loss', 'bureaucracy'],
      },
    ],
  };
}

describe('content generation contracts', () => {
  it('validates context blocks', () => {
    expect(isContentPacketContext(makeValidContext())).toBe(true);
    expect(
      isContentPacketContext({
        premiseSummary: 'present',
        situationFrame: 'present',
      })
    ).toBe(false);
    expect(
      isContentPacketContext({
        premiseSummary: 'present',
        situationFrame: 'present',
        worldState: 'present',
        viewpointPressure: 'legacy',
      })
    ).toBe(false);
  });

  it('clones context blocks without reusing object identity', () => {
    const context = makeValidContext();

    expect(cloneContentPacketContext(context)).toEqual(context);
    expect(cloneContentPacketContext(context)).not.toBe(context);
  });

  it('validates source artifacts and origins', () => {
    expect(isContentPacketSourceArtifact(makeValidOrigin().sourceArtifacts[0])).toBe(true);
    expect(isContentPacketOrigin(makeValidOrigin())).toBe(true);
    expect(
      isContentPacketSourceArtifact({
        artifactType: 'SPARK',
        sourceId: 'spark-01',
        contentKind: 'INVALID',
        summary: 'bad kind',
      })
    ).toBe(false);
    expect(
      isContentPacketOrigin({
        generationMode: 'quick',
        sourceArtifacts: [],
      })
    ).toBe(false);
  });

  it('clones origins without reusing nested artifact arrays', () => {
    const origin = makeValidOrigin();
    const cloned = cloneContentPacketOrigin(origin);

    expect(cloned).toEqual(origin);
    expect(cloned).not.toBe(origin);
    expect(cloned.sourceArtifacts).not.toBe(origin.sourceArtifacts);
    expect(cloned.sourceArtifacts[0]).not.toBe(origin.sourceArtifacts[0]);
  });

  it('validates evaluation contracts', () => {
    expect(
      isContentEvaluation({
        contentId: 'pkt-01',
        scores: {
          imageCharge: 4,
          humanAche: 3,
          socialLoadBearing: 5,
          branchingPressure: 4,
          antiGenericity: 5,
          sceneBurst: 3,
          structuralIrony: 4,
          conceptUtility: 5,
        },
        strengths: ['vivid imagery'],
        weaknesses: ['narrow scope'],
        recommendedRole: 'PRIMARY_SEED',
      })
    ).toBe(true);
  });

  it('formats exemplar IDs with zero padding', () => {
    expect(formatContentExemplarId(0)).toBe('exemplar-01');
    expect(formatContentExemplarId(11)).toBe('exemplar-12');
  });
});
