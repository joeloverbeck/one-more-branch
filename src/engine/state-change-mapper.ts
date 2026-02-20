import type { ActiveStateChanges } from '../models';
import type { PageWriterResult } from '../llm/writer-types';
import type { StateReconciliationResult } from './state-reconciler-types';

export type PageBuildResult = PageWriterResult &
  Pick<
    StateReconciliationResult,
    | 'currentLocation'
    | 'threatsAdded'
    | 'threatsRemoved'
    | 'constraintsAdded'
    | 'constraintsRemoved'
    | 'threadsAdded'
    | 'threadsResolved'
    | 'inventoryAdded'
    | 'inventoryRemoved'
    | 'healthAdded'
    | 'healthRemoved'
    | 'characterStateChangesAdded'
    | 'characterStateChangesRemoved'
  >;

/**
 * Maps reconciled state fields to ActiveStateChanges.
 * Handles the conversion from LLM output format to the typed change structure.
 */
export function mapToActiveStateChanges(
  result: PageBuildResult,
  effectiveThreadsResolved: readonly string[]
): ActiveStateChanges {
  return {
    newLocation: result.currentLocation || null,
    threatsAdded: result.threatsAdded,
    threatsRemoved: result.threatsRemoved,
    constraintsAdded: result.constraintsAdded,
    constraintsRemoved: result.constraintsRemoved,
    threadsAdded: result.threadsAdded.map((thread) => ({
      text: thread.text,
      threadType: thread.threadType,
      urgency: thread.urgency,
    })),
    threadsResolved: effectiveThreadsResolved,
  };
}
