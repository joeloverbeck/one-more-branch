export interface KnowledgeAsymmetry {
  readonly characterName: string;
  readonly knownFacts: readonly string[];
  readonly falseBeliefs: readonly string[];
  readonly secrets: readonly string[];
}

export function isKnowledgeAsymmetry(value: unknown): value is KnowledgeAsymmetry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['characterName'] === 'string' &&
    obj['characterName'].trim().length > 0 &&
    isReadonlyStringArray(obj['knownFacts']) &&
    isReadonlyStringArray(obj['falseBeliefs']) &&
    isReadonlyStringArray(obj['secrets'])
  );
}

function isReadonlyStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
