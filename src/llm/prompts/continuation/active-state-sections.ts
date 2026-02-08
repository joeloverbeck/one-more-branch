import type { ActiveState } from '../../../models/state/index.js';

/**
 * Builds the CURRENT LOCATION section for the prompt.
 * Only included when a location is set.
 */
export function buildLocationSection(activeState: ActiveState): string {
  if (!activeState.currentLocation) {
    return '';
  }
  return `CURRENT LOCATION:
${activeState.currentLocation}

`;
}

/**
 * Builds the ACTIVE THREATS section for the prompt.
 * Only included when there are active threats.
 */
export function buildThreatsSection(activeState: ActiveState): string {
  if (activeState.activeThreats.length === 0) {
    return '';
  }
  return `ACTIVE THREATS (dangers that exist NOW):
${activeState.activeThreats.map(t => `- ${t.raw}`).join('\n')}

`;
}

/**
 * Builds the ACTIVE CONSTRAINTS section for the prompt.
 * Only included when there are active constraints.
 */
export function buildConstraintsSection(activeState: ActiveState): string {
  if (activeState.activeConstraints.length === 0) {
    return '';
  }
  return `ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):
${activeState.activeConstraints.map(c => `- ${c.raw}`).join('\n')}

`;
}

/**
 * Builds the OPEN NARRATIVE THREADS section for the prompt.
 * Only included when there are open threads.
 */
export function buildThreadsSection(activeState: ActiveState): string {
  if (activeState.openThreads.length === 0) {
    return '';
  }
  return `OPEN NARRATIVE THREADS (unresolved hooks):
${activeState.openThreads.map(t => `- ${t.raw}`).join('\n')}

`;
}
