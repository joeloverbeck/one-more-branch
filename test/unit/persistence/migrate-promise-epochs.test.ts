import { migratePagePromiseEpochs } from '../../../src/persistence/migrate-promise-epochs.js';

function makePromise(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'pr-1',
    description: 'A promise',
    promiseType: 'FORESHADOWING',
    scope: 'BEAT',
    resolutionHint: 'hint',
    suggestedUrgency: 'MEDIUM',
    ...overrides,
  };
}

describe('migratePagePromiseEpochs', () => {
  it('adds promiseAgeEpoch = pageId - 1', () => {
    const pageData: Record<string, unknown> = {
      id: 3,
      accumulatedPromises: [makePromise({ id: 'pr-1', age: 1 })],
    };

    migratePagePromiseEpochs(pageData);

    expect(pageData.promiseAgeEpoch).toBe(2);
  });

  it('computes detectedAtPromiseEpoch from age and removes age field', () => {
    const pageData: Record<string, unknown> = {
      id: 5,
      accumulatedPromises: [makePromise({ id: 'pr-1', age: 2 })],
    };

    migratePagePromiseEpochs(pageData);

    const promise = (pageData.accumulatedPromises as Array<Record<string, unknown>>)[0];
    // epoch = 4, age = 2 → detectedAtPromiseEpoch = 2
    expect(promise.detectedAtPromiseEpoch).toBe(2);
    expect(promise).not.toHaveProperty('age');
  });

  it('handles page 1 with age=0 promises correctly', () => {
    const pageData: Record<string, unknown> = {
      id: 1,
      accumulatedPromises: [
        makePromise({ id: 'pr-1', age: 0 }),
        makePromise({ id: 'pr-2', age: 0 }),
      ],
    };

    migratePagePromiseEpochs(pageData);

    expect(pageData.promiseAgeEpoch).toBe(0);
    const promises = pageData.accumulatedPromises as Array<Record<string, unknown>>;
    expect(promises[0].detectedAtPromiseEpoch).toBe(0);
    expect(promises[1].detectedAtPromiseEpoch).toBe(0);
  });

  it('resolves transition promises (no age, no detectedAtPromiseEpoch) from parent', () => {
    const parentPromises = new Map<string, number>();
    parentPromises.set('pr-7', 3);
    parentPromises.set('pr-8', 5);

    const pageData: Record<string, unknown> = {
      id: 6,
      accumulatedPromises: [
        makePromise({ id: 'pr-7' }), // no age, no detectedAtPromiseEpoch
        makePromise({ id: 'pr-8' }),
        makePromise({ id: 'pr-9' }), // not in parent → default 0
      ],
    };

    migratePagePromiseEpochs(pageData, parentPromises);

    const promises = pageData.accumulatedPromises as Array<Record<string, unknown>>;
    expect(promises[0].detectedAtPromiseEpoch).toBe(3);
    expect(promises[1].detectedAtPromiseEpoch).toBe(5);
    expect(promises[2].detectedAtPromiseEpoch).toBe(0);
  });

  it('is idempotent — skips promises already in new format', () => {
    const pageData: Record<string, unknown> = {
      id: 3,
      promiseAgeEpoch: 2,
      accumulatedPromises: [makePromise({ id: 'pr-1', detectedAtPromiseEpoch: 1 })],
    };

    migratePagePromiseEpochs(pageData);

    const promise = (pageData.accumulatedPromises as Array<Record<string, unknown>>)[0];
    expect(promise.detectedAtPromiseEpoch).toBe(1);
    expect(pageData.promiseAgeEpoch).toBe(2);
  });

  it('handles page with no promises gracefully', () => {
    const pageData: Record<string, unknown> = {
      id: 2,
      accumulatedPromises: [],
    };

    migratePagePromiseEpochs(pageData);

    expect(pageData.promiseAgeEpoch).toBe(1);
    expect(pageData.accumulatedPromises).toEqual([]);
  });

  it('handles page missing accumulatedPromises field', () => {
    const pageData: Record<string, unknown> = { id: 1 };

    migratePagePromiseEpochs(pageData);

    expect(pageData.promiseAgeEpoch).toBe(0);
  });

  it('corrects page 7 with promiseAgeEpoch but promises lacking detectedAtPromiseEpoch', () => {
    const parentPromises = new Map<string, number>();
    parentPromises.set('pr-7', 3);

    const pageData: Record<string, unknown> = {
      id: 7,
      promiseAgeEpoch: 1, // wrong value from old code
      accumulatedPromises: [
        makePromise({ id: 'pr-7' }), // no age, no detectedAt → from parent
        makePromise({ id: 'pr-10', detectedAtPromiseEpoch: 1 }), // already correct
      ],
    };

    migratePagePromiseEpochs(pageData, parentPromises);

    expect(pageData.promiseAgeEpoch).toBe(6); // corrected to pageId - 1
    const promises = pageData.accumulatedPromises as Array<Record<string, unknown>>;
    expect(promises[0].detectedAtPromiseEpoch).toBe(3); // from parent
    expect(promises[1].detectedAtPromiseEpoch).toBe(1); // unchanged
  });
});
