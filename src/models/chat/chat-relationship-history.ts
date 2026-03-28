import type { ChatRelationshipState } from './chat-session.js';
import type { ChatStateUpdate } from './chat-state-update.js';
import type { ChatRelationshipSnapshot, ChatTurn } from './chat-turn.js';

export interface ChatRelationshipTimelinePoint {
  readonly turnNumber: number;
  readonly snapshot: ChatRelationshipSnapshot;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applyRelationshipStateUpdate(
  relationshipState: ChatRelationshipState,
  stateUpdate: Pick<ChatStateUpdate, 'relationshipShifts'>
): ChatRelationshipState {
  return stateUpdate.relationshipShifts.reduce(
    (currentState, shift) => ({
      ...currentState,
      valence: clamp(currentState.valence + shift.suggestedValenceChange, -5, 5),
      tension: clamp(currentState.tension + shift.suggestedTensionChange, 0, 10),
      dynamic: shift.suggestedNewDynamic ?? currentState.dynamic,
    }),
    relationshipState
  );
}

export function buildChatRelationshipTimeline(
  turns: readonly ChatTurn[]
): ChatRelationshipTimelinePoint[] {
  return turns.flatMap((turn) => {
    if (turn.speaker !== 'CHARACTER' || turn.relationshipSnapshot === undefined) {
      return [];
    }

    return [
      {
        turnNumber: turn.turnNumber,
        snapshot: turn.relationshipSnapshot,
      },
    ];
  });
}
