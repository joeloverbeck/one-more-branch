import type { ChatSession, ChatStateUpdate } from '../../models/chat/index.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mergeUnique(existing: readonly string[], additions: readonly string[]): string[] {
  const seen = new Set(existing);
  const merged = [...existing];

  for (const item of additions) {
    if (!seen.has(item)) {
      seen.add(item);
      merged.push(item);
    }
  }

  return merged;
}

export function applyChatStateUpdate(
  session: ChatSession,
  stateUpdate: ChatStateUpdate,
  updatedAt = new Date().toISOString()
): ChatSession {
  const relationshipDelta = stateUpdate.relationshipShifts.reduce(
    (accumulator, shift) => ({
      valence: accumulator.valence + shift.suggestedValenceChange,
      tension: accumulator.tension + shift.suggestedTensionChange,
      dynamic: shift.suggestedNewDynamic ?? accumulator.dynamic,
    }),
    {
      valence: session.relationshipState.valence,
      tension: session.relationshipState.tension,
      dynamic: session.relationshipState.dynamic,
    }
  );

  const correctedFalseBeliefs = new Set(stateUpdate.knowledgeChanges.falseBeliefsCorrected);
  const nextPhysicalContext = stateUpdate.physicalStateUpdate.locationChanged
    ? {
        ...session.physicalContext,
        location: stateUpdate.physicalStateUpdate.newLocation ?? session.physicalContext.location,
        microLocation:
          stateUpdate.physicalStateUpdate.newMicroLocation ?? session.physicalContext.microLocation,
        distanceBand:
          stateUpdate.physicalStateUpdate.newDistanceBand ?? session.physicalContext.distanceBand,
      }
    : session.physicalContext;

  return {
    ...session,
    updatedAt,
    turnCount: session.turnCount + 1,
    physicalContext: nextPhysicalContext,
    relationshipState: {
      ...session.relationshipState,
      dynamic: relationshipDelta.dynamic,
      valence: clamp(relationshipDelta.valence, -5, 5),
      tension: clamp(relationshipDelta.tension, 0, 10),
    },
    knowledgeState: {
      knownFacts: mergeUnique(
        session.knowledgeState.knownFacts,
        stateUpdate.knowledgeChanges.newKnownFacts
      ),
      suspicions: mergeUnique(
        session.knowledgeState.suspicions,
        stateUpdate.knowledgeChanges.newSuspicions
      ),
      falseBeliefs: session.knowledgeState.falseBeliefs.filter(
        (belief) => !correctedFalseBeliefs.has(belief)
      ),
      secretsRevealed: mergeUnique(
        session.knowledgeState.secretsRevealed,
        stateUpdate.knowledgeChanges.secretsRevealed
      ),
    },
  };
}
