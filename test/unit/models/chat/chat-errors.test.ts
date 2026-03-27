import { ChatDomainError, isChatDomainError } from '@/models/chat';

describe('chat-errors', () => {
  it('creates a named error with a stable code', () => {
    const error = new ChatDomainError('Missing chat', 'RESOURCE_NOT_FOUND');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ChatDomainError');
    expect(error.code).toBe('RESOURCE_NOT_FOUND');
    expect(error.message).toBe('Missing chat');
  });

  it('identifies chat domain errors with the type guard', () => {
    expect(isChatDomainError(new ChatDomainError('Invalid', 'VALIDATION_FAILED'))).toBe(true);
    expect(isChatDomainError(new Error('Invalid'))).toBe(false);
    expect(isChatDomainError('nope')).toBe(false);
  });
});
