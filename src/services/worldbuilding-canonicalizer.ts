import type { DecomposedWorld, WorldFact } from '../models/decomposed-world.js';

/**
 * Deterministic canonicalization layer for world facts.
 * Runs after LLM stages to validate IDs, coerce missing arrays,
 * reject broken references, and sort facts deterministically.
 */
export function canonicalizeDecomposedWorld(world: DecomposedWorld): DecomposedWorld {
  const factIds = new Set<string>();
  let nextId = 1;

  const canonicalFacts: WorldFact[] = world.facts.map((fact) => {
    let id = fact.id;
    if (!id || factIds.has(id)) {
      while (factIds.has(`wf-${nextId}`)) {
        nextId++;
      }
      id = `wf-${nextId}`;
      nextId++;
    }
    factIds.add(id);

    const tensionWithIds = (fact.tensionWithIds ?? []).filter((refId) =>
      refId !== id,
    );
    const implicationOfIds = (fact.implicationOfIds ?? []).filter((refId) =>
      refId !== id,
    );

    return {
      id,
      domain: fact.domain,
      fact: fact.fact,
      scope: fact.scope,
      ...(fact.factType ? { factType: fact.factType } : {}),
      ...(fact.narrativeWeight ? { narrativeWeight: fact.narrativeWeight } : {}),
      ...(fact.thematicTag ? { thematicTag: fact.thematicTag } : {}),
      ...(fact.sensoryHook ? { sensoryHook: fact.sensoryHook } : {}),
      ...(fact.exampleEvidence ? { exampleEvidence: fact.exampleEvidence } : {}),
      ...(tensionWithIds.length > 0 ? { tensionWithIds } : {}),
      ...(implicationOfIds.length > 0 ? { implicationOfIds } : {}),
      ...(fact.storyFunctions && fact.storyFunctions.length > 0
        ? { storyFunctions: [...fact.storyFunctions] }
        : {}),
      ...(fact.sceneAffordances && fact.sceneAffordances.length > 0
        ? { sceneAffordances: [...fact.sceneAffordances] }
        : {}),
    };
  });

  // Second pass: remove references to non-existent IDs
  const validatedFacts: WorldFact[] = canonicalFacts.map((fact) => {
    const validTensionWithIds = fact.tensionWithIds?.filter((refId) => factIds.has(refId));
    const validImplicationOfIds = fact.implicationOfIds?.filter((refId) => factIds.has(refId));

    return {
      ...fact,
      ...(validTensionWithIds && validTensionWithIds.length > 0
        ? { tensionWithIds: validTensionWithIds }
        : fact.tensionWithIds
          ? { tensionWithIds: undefined }
          : {}),
      ...(validImplicationOfIds && validImplicationOfIds.length > 0
        ? { implicationOfIds: validImplicationOfIds }
        : fact.implicationOfIds
          ? { implicationOfIds: undefined }
          : {}),
    };
  });

  return {
    ...(world.worldLogline ? { worldLogline: world.worldLogline } : {}),
    facts: validatedFacts,
    ...(world.openQuestions && world.openQuestions.length > 0
      ? { openQuestions: [...world.openQuestions] }
      : {}),
    ...(world.rawWorldbuilding ? { rawWorldbuilding: world.rawWorldbuilding } : {}),
  };
}
