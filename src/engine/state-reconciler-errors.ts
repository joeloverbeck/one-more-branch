import type { StateReconciliationDiagnostic } from './state-reconciler-types.js';

export type StateReconciliationErrorCode =
  | 'RECONCILIATION_FAILED'
  | 'INVALID_STATE_REFERENCE'
  | 'CONTRADICTORY_INTENT';

export interface StateReconciliationFailure {
  code: StateReconciliationErrorCode;
  message: string;
  diagnostics: StateReconciliationDiagnostic[];
  retryable: boolean;
}

export class StateReconciliationError extends Error {
  constructor(
    message: string,
    public readonly code: StateReconciliationErrorCode,
    public readonly diagnostics: StateReconciliationDiagnostic[] = [],
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'StateReconciliationError';
  }

  toFailure(): StateReconciliationFailure {
    return {
      code: this.code,
      message: this.message,
      diagnostics: this.diagnostics,
      retryable: this.retryable,
    };
  }
}
