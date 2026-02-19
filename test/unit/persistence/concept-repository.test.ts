import { randomUUID } from 'crypto';
import type { SavedConcept } from '@/models/saved-concept';
import { getConceptFilePath, writeJsonFile } from '@/persistence/file-utils';
import {
  deleteConcept,
  listConcepts,
  loadConcept,
  saveConcept,
  updateConcept,
} from '@/persistence/concept-repository';

const TEST_PREFIX = 'TEST: PERLAY-CONCEPT-001';

function createValidConceptSpec(): SavedConcept['evaluatedConcept']['concept'] {
  return {
    oneLineHook: 'A courier smuggles forbidden memories through a fractured city.',
    elevatorParagraph: 'A courier must choose who gets the truth when every faction edits history.',
    genreFrame: 'NOIR' as const,
    genreSubversion: 'The detective story is run by the evidence runner.',
    protagonistRole: 'Memory courier',
    coreCompetence: 'Pattern-based recall and route planning',
    coreFlaw: 'Compulsive secrecy',
    actionVerbs: ['investigate', 'bargain', 'infiltrate', 'deceive', 'protect', 'expose'],
    coreConflictLoop: 'Trade immediate safety for long-term truth integrity.',
    conflictAxis: 'TRUTH_VS_STABILITY' as const,
    conflictType: 'PERSON_VS_SOCIETY' as const,
    pressureSource: 'Competing cartels erase witnesses and records.',
    stakesPersonal: 'Losing her identity and remaining allies.',
    stakesSystemic: 'Civic memory collapse and institutional capture.',
    deadlineMechanism: 'A citywide record purge begins at dawn.',
    settingAxioms: ['Memories can be extracted.', 'Memories can be traded as legal evidence.'],
    constraintSet: [
      'Unlicensed extraction causes permanent neurological damage.',
      'Tampered memories cannot be restored once audited.',
      'Public memory ledgers update only once per day.',
    ],
    keyInstitutions: ['Ledger Court', 'Memory Cartel'],
    settingScale: 'LOCAL' as const,
    branchingPosture: 'RECONVERGE' as const,
    stateComplexity: 'MEDIUM' as const,
  };
}

function createSavedConcept(id: string): SavedConcept {
  const now = new Date().toISOString();
  return {
    id,
    name: `${TEST_PREFIX} concept`,
    createdAt: now,
    updatedAt: now,
    seeds: {
      genreVibes: 'noir',
    },
    evaluatedConcept: {
      concept: createValidConceptSpec(),
      scores: {
        hookStrength: 4,
        conflictEngine: 5,
        agencyBreadth: 4,
        noveltyLeverage: 3,
        branchingFitness: 4,
        llmFeasibility: 4,
      },
      overallScore: 82,
      strengths: ['Clear dramatic loop', 'High replay potential'],
      weaknesses: ['Could sharpen novelty hooks'],
      tradeoffSummary: 'Strong system-level stakes with moderate accessibility risk.',
    },
  };
}

describe('concept-repository persisted payload validation', () => {
  const createdConceptIds = new Set<string>();

  afterEach(async () => {
    for (const conceptId of createdConceptIds) {
      await deleteConcept(conceptId);
    }
    createdConceptIds.clear();
  });

  it('loads a valid saved concept payload', async () => {
    const conceptId = `${TEST_PREFIX}-${randomUUID()}`;
    createdConceptIds.add(conceptId);

    const concept = createSavedConcept(conceptId);
    await saveConcept(concept);

    const loaded = await loadConcept(conceptId);
    expect(loaded).toEqual(concept);
  });

  it('throws when loading a persisted concept with invalid shape', async () => {
    const conceptId = `${TEST_PREFIX}-${randomUUID()}`;
    createdConceptIds.add(conceptId);

    await writeJsonFile(getConceptFilePath(conceptId), {
      id: conceptId,
      name: `${TEST_PREFIX} invalid`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      seeds: {},
      evaluatedConcept: {
        concept: { oneLineHook: 'Only one field' },
      },
    });

    await expect(loadConcept(conceptId)).rejects.toThrow(
      `Invalid SavedConcept payload at ${getConceptFilePath(conceptId)}`,
    );
  });

  it('throws when listing concepts includes an invalid persisted payload', async () => {
    const validConceptId = `${TEST_PREFIX}-${randomUUID()}`;
    const invalidConceptId = `${TEST_PREFIX}-${randomUUID()}`;
    createdConceptIds.add(validConceptId);
    createdConceptIds.add(invalidConceptId);

    await saveConcept(createSavedConcept(validConceptId));
    await writeJsonFile(getConceptFilePath(invalidConceptId), {
      id: invalidConceptId,
      name: `${TEST_PREFIX} invalid list entry`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      seeds: {},
      evaluatedConcept: {
        concept: { oneLineHook: 'Only one field' },
      },
    });

    await expect(listConcepts()).rejects.toThrow(
      `Invalid SavedConcept payload at ${getConceptFilePath(invalidConceptId)}`,
    );
  });

  it('throws when updating an invalid persisted concept payload', async () => {
    const conceptId = `${TEST_PREFIX}-${randomUUID()}`;
    createdConceptIds.add(conceptId);

    await writeJsonFile(getConceptFilePath(conceptId), {
      id: conceptId,
      name: `${TEST_PREFIX} invalid update`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      seeds: {},
      evaluatedConcept: {
        concept: { oneLineHook: 'Only one field' },
      },
    });

    await expect(
      updateConcept(conceptId, (existing) => ({
        ...existing,
        name: `${TEST_PREFIX} updated`,
      })),
    ).rejects.toThrow(`Invalid SavedConcept payload at ${getConceptFilePath(conceptId)}`);
  });
});
