export interface AccountantShapeRepairResult {
  readonly repairedJson: unknown;
  readonly repairedEntries: readonly CharacterStateShapeRepair[];
}

export interface CharacterStateShapeRepair {
  readonly index: number;
  readonly fromFields: readonly string[];
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function repairAccountantLegacyShapeMismatches(rawJson: unknown): AccountantShapeRepairResult {
  if (!hasObject(rawJson)) {
    return { repairedJson: rawJson, repairedEntries: [] };
  }

  const cloned = JSON.parse(JSON.stringify(rawJson)) as Record<string, unknown>;
  const stateIntents = cloned['stateIntents'];
  if (!hasObject(stateIntents)) {
    return { repairedJson: cloned, repairedEntries: [] };
  }

  const characterState = stateIntents['characterState'];
  if (!hasObject(characterState)) {
    return { repairedJson: cloned, repairedEntries: [] };
  }

  const add = characterState['add'];
  if (!Array.isArray(add) || add.length === 0) {
    return { repairedJson: cloned, repairedEntries: [] };
  }

  const repairedEntries: CharacterStateShapeRepair[] = [];

  add.forEach((entry, index) => {
    if (!hasObject(entry)) {
      return;
    }

    const fromFields: string[] = [];

    if (!('characterName' in entry)) {
      const legacyCharacter = normalizeString(entry['character']);
      if (legacyCharacter) {
        entry['characterName'] = legacyCharacter;
        fromFields.push('character');
      }
    }

    if (!('states' in entry)) {
      const legacyText = normalizeString(entry['text']);
      if (legacyText) {
        entry['states'] = [legacyText];
        fromFields.push('text');
      }
    }

    if (fromFields.length > 0) {
      repairedEntries.push({ index, fromFields });
    }
  });

  return { repairedJson: cloned, repairedEntries };
}
