import {
  applyRelationshipStateUpdate,
  type ChatRelationshipSnapshot,
  type ChatSession,
  type ChatStateUpdate,
} from '../../models/chat/index.js';

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
  updatedAt = new Date().toISOString(),
  relationshipSnapshot?: ChatRelationshipSnapshot
): ChatSession {
  const nextRelationshipState = applyRelationshipStateUpdate(session.relationshipState, stateUpdate);

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
    relationshipState:
      relationshipSnapshot === undefined
        ? {
            ...session.relationshipState,
            dynamic: nextRelationshipState.dynamic,
            valence: nextRelationshipState.valence,
            tension: nextRelationshipState.tension,
          }
        : {
            dynamic: relationshipSnapshot.dynamic,
            valence: relationshipSnapshot.valence,
            tension: relationshipSnapshot.tension,
            leverage: relationshipSnapshot.leverage,
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
