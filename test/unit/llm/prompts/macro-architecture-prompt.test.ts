import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildMacroArchitecturePrompt } from '../../../../src/llm/prompts/macro-architecture-prompt';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'user')?.content ?? '';
}

describe('buildMacroArchitecturePrompt', () => {
  const baseContext = {
    tone: 'stormy maritime thriller',
    startingSituation: 'A decorated captain is framed during a public tribunal.',
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
          domain: 'institution' as const,
          fact: 'Harbor tribunals control shipping law and can erase records overnight.',
          scope: 'global',
        },
      ],
      rawWorldbuilding: 'Harbor tribunals control shipping law and can erase records overnight.',
    },
    conceptSpec: {
      oneLineHook: 'A framed captain fights a corrupt harbor tribunal.',
      elevatorParagraph: 'A public law ritual turns into a hunt for proof and legitimacy.',
      genreFrame: 'MYSTERY' as const,
      genreSubversion: 'The investigator helped build the corrupt system.',
      protagonistRole: 'Framed captain',
      coreCompetence: 'Command under pressure',
      coreFlaw: 'Faith in institutions',
      actionVerbs: ['investigate', 'command', 'infiltrate', 'expose', 'choose', 'survive'],
      coreConflictLoop: 'Truth versus civic stability',
      conflictAxis: 'TRUTH_VS_STABILITY' as const,
      conflictType: 'PERSON_VS_SOCIETY' as const,
      pressureSource: 'Tribunal suppression',
      stakesPersonal: 'Execution and dishonor',
      stakesSystemic: 'Permanent rule by the conspirators',
      deadlineMechanism: 'Evidence purge at dawn',
      settingAxioms: ['The harbor floods nightly'],
      constraintSet: ['No open violence in tribunal halls'],
      keyInstitutions: ['Harbor Tribunal'],
      settingScale: 'LOCAL' as const,
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
      directionOfChange: 'IRONIC' as const,
      conflictAxis: 'TRUTH_VS_STABILITY' as const,
      dramaticStance: 'IRONIC' as const,
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
        dynamic: 'IRRECONCILABLE' as const,
      },
      primaryAntagonisticForce: {
        description: 'A tribunal that converts public ritual into coercive legitimacy.',
        pressureMechanism: 'It punishes dissent by weaponizing public law and record control.',
      },
      storySpineType: 'MYSTERY' as const,
      conflictAxis: 'TRUTH_VS_STABILITY' as const,
      conflictType: 'PERSON_VS_SOCIETY' as const,
      characterArcType: 'DISILLUSIONMENT' as const,
      toneFeel: ['tense', 'salt-stung', 'ritualized'],
      toneAvoid: ['comic', 'detached'],
      wantNeedCollisionPoint:
        'Vale can only expose the tribunal by admitting she once helped it destroy innocent people.',
      protagonistDeepestFear: 'That the system was always exactly what she served.',
    },
  };

  it('returns system and user messages', () => {
    const messages = buildMacroArchitecturePrompt(baseContext);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('includes content policy in the system prompt', () => {
    const messages = buildMacroArchitecturePrompt(baseContext);

    expect(getSystemMessage(messages)).toContain(CONTENT_POLICY);
  });

  it('requests macro architecture without asking for milestones', () => {
    const messages = buildMacroArchitecturePrompt(baseContext);
    const userMessage = getUserMessage(messages);

    expect(userMessage).toContain('Do not generate milestones');
    expect(userMessage).toContain('actQuestion');
    expect(userMessage).toContain('exitReversal');
    expect(userMessage).toContain('promiseTargets');
    expect(userMessage).toContain('obligationTargets');
    expect(userMessage).toContain('signatureScenarioPlacement');
    expect(userMessage).not.toContain('causalLink');
  });

  it('includes concept verification and premise promise constraints when provided', () => {
    const messages = buildMacroArchitecturePrompt(baseContext);
    const userMessage = getUserMessage(messages);

    expect(userMessage).toContain('Signature scenario: A harbor tribunal hearing collapses into ritual violence.');
    expect(userMessage).toContain('The tribunal itself becomes the battleground.');
    expect(userMessage).toContain('Every premise promise must be allocated to at least one act');
  });
});
