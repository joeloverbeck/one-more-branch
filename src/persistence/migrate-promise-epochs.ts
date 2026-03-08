/**
 * Migrates legacy promise data from the old `age` field format to the new
 * `detectedAtPromiseEpoch` + `promiseAgeEpoch` format.
 *
 * Mutates pageData in place.
 */
export function migratePagePromiseEpochs(
  pageData: Record<string, unknown>,
  parentMigratedPromises?: Map<string, number>
): void {
  const pageId = pageData['id'] as number;
  const promiseAgeEpoch = pageId - 1;
  pageData['promiseAgeEpoch'] = promiseAgeEpoch;

  const promises = pageData['accumulatedPromises'] as
    | Array<Record<string, unknown>>
    | undefined;
  if (!promises) return;

  for (const p of promises) {
    if (typeof p['detectedAtPromiseEpoch'] === 'number') continue;

    if (typeof p['age'] === 'number') {
      p['detectedAtPromiseEpoch'] = promiseAgeEpoch - p['age'];
    } else if (parentMigratedPromises?.has(p['id'] as string)) {
      p['detectedAtPromiseEpoch'] = parentMigratedPromises.get(p['id'] as string)!;
    } else {
      p['detectedAtPromiseEpoch'] = 0;
    }
    delete p['age'];
  }
}
