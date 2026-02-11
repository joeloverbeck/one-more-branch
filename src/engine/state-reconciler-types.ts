import type { ThreadType, Urgency } from '../models/state/index.js';

export interface StateReconciliationDiagnostic {
  code: string;
  message: string;
  field?: string;
}

export interface ReconciledThreadAdd {
  text: string;
  threadType: ThreadType;
  urgency: Urgency;
}

export interface ReconciledCharacterStateAdd {
  characterName: string;
  states: string[];
}

export interface StateReconciliationResult {
  currentLocation: string;
  threatsAdded: string[];
  threatsRemoved: string[];
  constraintsAdded: string[];
  constraintsRemoved: string[];
  threadsAdded: ReconciledThreadAdd[];
  threadsResolved: string[];
  inventoryAdded: string[];
  inventoryRemoved: string[];
  healthAdded: string[];
  healthRemoved: string[];
  characterStateChangesAdded: ReconciledCharacterStateAdd[];
  characterStateChangesRemoved: string[];
  newCanonFacts: string[];
  newCharacterCanonFacts: Record<string, string[]>;
  reconciliationDiagnostics: StateReconciliationDiagnostic[];
}
