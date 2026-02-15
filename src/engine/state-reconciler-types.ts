import type {
  CanonFact,
  ConstraintAddition,
  ConstraintEntry,
  ThreatAddition,
  ThreatEntry,
  ThreadType,
  Urgency,
} from '../models/state/index.js';
import type { KeyedEntry, ThreadEntry } from '../models/state/index.js';

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

export interface StateReconciliationPreviousState {
  currentLocation: string;
  threats: readonly ThreatEntry[];
  constraints: readonly ConstraintEntry[];
  threads: readonly ThreadEntry[];
  inventory: readonly KeyedEntry[];
  health: readonly KeyedEntry[];
  characterState: readonly KeyedEntry[];
}

export interface StateReconciliationResult {
  currentLocation: string;
  threatsAdded: ThreatAddition[];
  threatsRemoved: string[];
  constraintsAdded: ConstraintAddition[];
  constraintsRemoved: string[];
  threadsAdded: ReconciledThreadAdd[];
  threadsResolved: string[];
  inventoryAdded: string[];
  inventoryRemoved: string[];
  healthAdded: string[];
  healthRemoved: string[];
  characterStateChangesAdded: ReconciledCharacterStateAdd[];
  characterStateChangesRemoved: string[];
  newCanonFacts: CanonFact[];
  newCharacterCanonFacts: Record<string, string[]>;
  reconciliationDiagnostics: StateReconciliationDiagnostic[];
}
