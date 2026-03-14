import {
  buildDirectionalGuidanceSection,
  buildStructureGenerationCharacterSection,
  buildStructureGenerationConceptStakesSection,
  buildStructureGenerationKernelSection,
  buildStructureGenerationPremisePromiseSection,
  buildStructureGenerationStartingSituationSection,
  buildStructureGenerationToneSection,
  buildStructureGenerationWorldSection,
  type StructureContext,
} from '../../../../../../src/llm/prompts/sections/structure-generation/shared-context';

describe('structure-generation shared context builders', () => {
  const baseContext: StructureContext = {
    tone: 'stormy maritime thriller',
    startingSituation: 'A tribunal ship arrives with forged warrants.',
    decomposedCharacters: [
      {
        name: 'Captain Vale',
        speechFingerprint: {
          catchphrases: [],
          vocabularyProfile: 'clipped naval formality',
          sentencePatterns: 'measured commands',
          verbalTics: [],
          dialogueSamples: [],
          metaphorFrames: 'maritime',
          antiExamples: [],
          discourseMarkers: [],
          registerShifts: 'formal under pressure',
        },
        coreTraits: ['disciplined', 'defiant'],
        superObjective: 'Expose the tribunal and reclaim command',
        protagonistRelationship: 'self',
        knowledgeBoundaries: 'Knows fleet politics but not the conspiracy architect.',
        decisionPattern: 'Strategic until betrayed, then direct.',
        coreBeliefs: ['Duty outlasts fear.'],
        conflictPriority: 'justice',
        appearance: 'Salt-stained officer with a ceremonial scar.',
        rawDescription: 'A captain shaped by institutional betrayal.',
      },
    ],
    decomposedWorld: {
      facts: [
        {
          domain: 'institution',
          fact: 'Harbor tribunals can erase shipping records overnight.',
          scope: 'global',
        },
      ],
      rawWorldbuilding: 'Harbor tribunals can erase shipping records overnight.',
    },
    conceptSpec: {
      oneLineHook: 'A framed captain fights a corrupt harbor tribunal.',
      elevatorParagraph: 'A public law ritual turns into a hunt for proof and legitimacy.',
      genreFrame: 'MYSTERY',
      genreSubversion: 'The investigator helped build the corrupt system.',
      protagonistRole: 'Framed captain',
      coreCompetence: 'Command under pressure',
      coreFlaw: 'Faith in institutions',
      actionVerbs: ['investigate', 'command', 'infiltrate', 'expose', 'choose', 'survive'],
      coreConflictLoop: 'Truth versus civic stability',
      conflictAxis: 'TRUTH_VS_STABILITY',
      conflictType: 'PERSON_VS_SOCIETY',
      pressureSource: 'Tribunal suppression',
      stakesPersonal: 'Execution and dishonor',
      stakesSystemic: 'Permanent rule by the conspirators',
      deadlineMechanism: 'Evidence purge at dawn',
      settingAxioms: ['The harbor floods nightly'],
      constraintSet: ['No open violence in tribunal halls'],
      keyInstitutions: ['Harbor Tribunal'],
      settingScale: 'LOCAL',
      whatIfQuestion: 'What if justice requires exposing your own complicity?',
      ironicTwist: 'The only surviving evidence proves the captain once obeyed the tribunal.',
      playerFantasy: 'Outmaneuvering corrupt institutions',
      incitingDisruption: 'A public mutiny charge is staged',
      escapeValve: 'A smuggler route beneath the archive',
      protagonistLie: 'Institutions protect the innocent.',
      protagonistTruth: 'Power must be made accountable.',
      protagonistGhost: 'Signed an order that ruined an innocent crew.',
      wantNeedCollisionSketch: 'Clear her name without preserving the institution that framed her.',
    },
    conceptVerification: {
      conceptId: 'concept_1',
      signatureScenario: 'A harbor tribunal hearing collapses into ritual violence.',
      loglineCompressible: true,
      logline: 'A framed captain must weaponize tribunal ritual before the harbor courts burn the truth.',
      premisePromises: [
        'The tribunal itself becomes the battleground.',
        'An ally inside the system is morally compromised.',
      ],
      escalatingSetpieces: ['Dock chase', 'Archive theft', 'Rigged hearing', 'Mutiny lockdown'],
      setpieceCausalChainBroken: false,
      setpieceCausalLinks: ['1->2', '2->3', '3->4'],
      inevitabilityStatement: 'Public reckoning is unavoidable.',
      loadBearingCheck: {
        passes: true,
        reasoning: 'Grounded in harbor institutions.',
        genericCollapse: 'Without the tribunal ritual, the premise collapses.',
      },
      kernelFidelityCheck: {
        passes: true,
        reasoning: 'Aligned to the thesis.',
        kernelDrift: 'None.',
      },
      conceptIntegrityScore: 92,
    },
    storyKernel: {
      dramaticThesis: 'Truth without courage becomes complicity.',
      antithesis: 'Stability is worth moral compromise.',
      valueAtStake: 'justice',
      opposingForce: 'institutional secrecy',
      directionOfChange: 'IRONIC',
      conflictAxis: 'TRUTH_VS_STABILITY',
      dramaticStance: 'IRONIC',
      thematicQuestion: 'Can justice survive the system that enforces order?',
      moralArgument: 'Justice requires breaking the system that rewards silence.',
      valueSpectrum: {
        positive: 'Justice',
        contrary: 'Order',
        contradictory: 'Tyranny',
        negationOfNegation: 'Justice reborn through institutional collapse',
      },
    },
    spine: {
      centralDramaticQuestion: 'Can justice survive the institution that enforces order?',
      protagonistNeedVsWant: {
        need: 'Accept that the tribunal cannot be redeemed from inside.',
        want: 'Clear her own name and regain command.',
        dynamic: 'IRRECONCILABLE',
      },
      primaryAntagonisticForce: {
        description: 'A tribunal that converts public ritual into coercive legitimacy.',
        pressureMechanism: 'It punishes dissent by weaponizing public law and record control.',
      },
      storySpineType: 'MYSTERY',
      conflictAxis: 'TRUTH_VS_STABILITY',
      conflictType: 'PERSON_VS_SOCIETY',
      characterArcType: 'DISILLUSIONMENT',
      toneFeel: ['tense', 'salt-stung', 'ritualized'],
      toneAvoid: ['comic', 'detached'],
      wantNeedCollisionPoint:
        'Vale can only expose the tribunal by admitting she once helped it destroy innocent people.',
      protagonistDeepestFear: 'That the system was always exactly what she served.',
    },
  };

  it('renders shared world, character, starting situation, and tone sections', () => {
    expect(buildStructureGenerationWorldSection(baseContext)).toContain('Harbor tribunals');
    expect(buildStructureGenerationCharacterSection(baseContext)).toContain('Captain Vale');
    expect(buildStructureGenerationStartingSituationSection(baseContext)).toContain(
      'STARTING SITUATION'
    );
    expect(buildStructureGenerationToneSection(baseContext.spine)).toContain('TONE FEEL');
    expect(buildStructureGenerationToneSection(baseContext.spine)).toContain('TONE AVOID');
  });

  it('supports prompt-local headings and guidance without changing shared section structure', () => {
    const conceptStakes = buildStructureGenerationConceptStakesSection(
      baseContext.conceptSpec,
      'Use these stakes to calibrate act-level escalation.',
      'CONCEPT STAKES (use to ground your per-act stakes):'
    );
    const premisePromises = buildStructureGenerationPremisePromiseSection(
      baseContext.conceptVerification,
      'Every premise promise must be allocated to at least one act using promiseTargets.',
      'PREMISE PROMISE CONTRACT (from upstream concept verification):'
    );

    expect(conceptStakes).toContain('CONCEPT STAKES (use to ground your per-act stakes):');
    expect(conceptStakes).toContain('Use these stakes to calibrate act-level escalation.');
    expect(premisePromises).toContain(
      'PREMISE PROMISE CONTRACT (from upstream concept verification):'
    );
    expect(premisePromises).toContain(
      'Every premise promise must be allocated to at least one act using promiseTargets.'
    );
  });

  it('supports prompt-local kernel guidance and value spectrum headings', () => {
    const kernelSection = buildStructureGenerationKernelSection(baseContext.storyKernel, {
      valueSpectrumHeading: 'VALUE SPECTRUM (McKee — use to calibrate per-act value charge):',
      guidanceText: 'Use the kernel to differentiate act questions and ensure escalation.',
    });

    expect(kernelSection).toContain(
      'VALUE SPECTRUM (McKee — use to calibrate per-act value charge):'
    );
    expect(kernelSection).toContain(
      'Use the kernel to differentiate act questions and ensure escalation.'
    );
  });

  it('returns empty strings when optional shared sections have no usable data', () => {
    expect(
      buildStructureGenerationCharacterSection({ ...baseContext, decomposedCharacters: [] })
    ).toBe('');
    expect(
      buildStructureGenerationWorldSection({
        ...baseContext,
        decomposedWorld: { facts: [], rawWorldbuilding: '' },
      })
    ).toBe('');
    expect(buildStructureGenerationPremisePromiseSection(undefined)).toBe('');
  });

  it('keeps directional guidance centralized by story kernel direction', () => {
    expect(buildDirectionalGuidanceSection(baseContext.storyKernel)).toContain('Pyrrhic crossroads');
  });
});
