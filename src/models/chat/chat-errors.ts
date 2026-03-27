export type ChatDomainErrorCode =
  | 'VALIDATION_FAILED'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_CONFLICT'
  | 'INVALID_PERSISTED_DATA'
  | 'INVARIANT_VIOLATION';

export class ChatDomainError extends Error {
  constructor(
    message: string,
    public readonly code: ChatDomainErrorCode
  ) {
    super(message);
    this.name = 'ChatDomainError';
  }
}

export function isChatDomainError(error: unknown): error is ChatDomainError {
  return error instanceof ChatDomainError;
}
