import type { ActiveState } from '../../../models/state/index.js';

export function buildLocationSection(activeState: ActiveState): string {
  if (!activeState.currentLocation) {
    return '';
  }
  return `CURRENT LOCATION:
${activeState.currentLocation}

`;
}

export function buildThreatsSection(activeState: ActiveState): string {
  if (activeState.activeThreats.length === 0) {
    return '';
  }
  return `ACTIVE THREATS (dangers that exist NOW):
${activeState.activeThreats.map(t => `- [${t.id}] ${t.text}`).join('\n')}

`;
}

export function buildConstraintsSection(activeState: ActiveState): string {
  if (activeState.activeConstraints.length === 0) {
    return '';
  }
  return `ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):
${activeState.activeConstraints.map(c => `- [${c.id}] ${c.text}`).join('\n')}

`;
}

export function buildThreadsSection(activeState: ActiveState): string {
  if (activeState.openThreads.length === 0) {
    return '';
  }
  return `OPEN NARRATIVE THREADS (unresolved hooks):
${activeState.openThreads.map(t => `- [${t.id}] ${t.text}`).join('\n')}

`;
}
