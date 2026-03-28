import type { ChatRelationshipState } from './chat-session.js';
import type { ChatStateUpdate } from './chat-state-update.js';
import type { ChatTurn } from './chat-turn.js';

export interface ChatRelationshipHistoryPoint {
  readonly turnNumber: number;
  readonly valence: number;
  readonly tension: number;
  readonly dynamic: string;
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

export function buildChatRelationshipHistory(
  turns: readonly ChatTurn[]
): ChatRelationshipHistoryPoint[] {
  const history: ChatRelationshipHistoryPoint[] = [
    {
      turnNumber: 0,
      valence: 0,
      tension: 0,
      dynamic: '',
    },
  ];

  let currentState: ChatRelationshipState = {
    dynamic: '',
    valence: 0,
    tension: 0,
    leverage: '',
  };

  for (const turn of turns) {
    if (turn.stateUpdate === undefined) {
      continue;
    }

    currentState = applyRelationshipStateUpdate(currentState, turn.stateUpdate);
    history.push({
      turnNumber: turn.turnNumber,
      valence: currentState.valence,
      tension: currentState.tension,
      dynamic: currentState.dynamic,
    });
  }

  return history;
}
