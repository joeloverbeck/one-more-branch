import { isGeneratedKernelBatch, isSavedKernel } from '../../../src/models/saved-kernel';
import type { EvaluatedKernel } from '../../../src/models/story-kernel';

describe('saved-kernel model guards', () => {
  const evaluatedKernel: EvaluatedKernel = {
    kernel: {
      dramaticThesis: 'Obsessive control destroys what it tries to protect.',
      valueAtStake: 'Trust',
      opposingForce: 'Fear of loss drives the need to control.',
      directionOfChange: 'IRONIC',
      thematicQuestion: 'Can protection exist without control?',
    },
    scores: {
      dramaticClarity: 4,
      thematicUniversality: 4,
      generativePotential: 4,
      conflictTension: 5,
      emotionalDepth: 3,
    },
    overallScore: 80,
    passes: true,
    strengths: ['Clear thesis', 'High conflict pressure'],
    weaknesses: ['Could be more emotionally specific'],
    tradeoffSummary: 'Very generative but risks abstraction.',
  };

  it('accepts a valid SavedKernel object', () => {
    const value = {
      id: 'kernel-1',
      name: 'Control vs Trust',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {
        thematicInterests: 'control, care, trust',
      },
      evaluatedKernel,
    };

    expect(isSavedKernel(value)).toBe(true);
  });

  it('rejects invalid SavedKernel shapes', () => {
    expect(
      isSavedKernel({
        id: '',
        name: 'Invalid',
        createdAt: '2026-02-19T00:00:00.000Z',
        updatedAt: '2026-02-19T00:00:00.000Z',
        seeds: {},
        evaluatedKernel,
      }),
    ).toBe(false);
    expect(
      isSavedKernel({
        id: 'kernel-1',
        name: 'Invalid',
        createdAt: 'not-a-date',
        updatedAt: '2026-02-19T00:00:00.000Z',
        seeds: null,
        evaluatedKernel,
      }),
    ).toBe(false);
    expect(
      isSavedKernel({
        id: 'kernel-1',
        name: 'Invalid',
        createdAt: '2026-02-19T00:00:00.000Z',
        updatedAt: '2026-02-19T00:00:00.000Z',
        seeds: {},
        evaluatedKernel: {
          ...evaluatedKernel,
          scores: {
            ...evaluatedKernel.scores,
            emotionalDepth: 6,
          },
        },
      }),
    ).toBe(false);
    expect(isSavedKernel(null)).toBe(false);
  });

  it('accepts a valid GeneratedKernelBatch object', () => {
    const value = {
      id: 'batch-1',
      generatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {
        emotionalCore: 'dread of becoming what you fear',
      },
      evaluatedKernels: [evaluatedKernel],
    };

    expect(isGeneratedKernelBatch(value)).toBe(true);
  });

  it('rejects invalid GeneratedKernelBatch shapes', () => {
    expect(
      isGeneratedKernelBatch({
        id: 'batch-1',
        seeds: {},
        evaluatedKernels: [],
      }),
    ).toBe(false);
    expect(
      isGeneratedKernelBatch({
        id: 'batch-1',
        generatedAt: '2026-02-19T00:00:00.000Z',
        seeds: [],
        evaluatedKernels: [],
      }),
    ).toBe(false);
    expect(
      isGeneratedKernelBatch({
        id: 'batch-1',
        generatedAt: '2026-02-19T00:00:00.000Z',
        seeds: {},
        evaluatedKernels: [{ ...evaluatedKernel, tradeoffSummary: '' }],
      }),
    ).toBe(false);
    expect(isGeneratedKernelBatch('nope')).toBe(false);
  });
});
