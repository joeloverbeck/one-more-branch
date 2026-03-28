import { isChatRelationshipState } from '../../../../src/models/chat/chat-validation';

describe('isChatRelationshipState', () => {
  it('accepts values within the canonical valence and tension ranges', () => {
    expect(
      isChatRelationshipState({
        dynamic: 'brittle allies',
        valence: -1,
        tension: 7,
        leverage: 'Each knows one ruinous fact about the other',
      })
    ).toBe(true);
  });

  it('rejects valence outside -5..+5', () => {
    expect(
      isChatRelationshipState({
        dynamic: 'brittle allies',
        valence: 6,
        tension: 7,
        leverage: 'Each knows one ruinous fact about the other',
      })
    ).toBe(false);
  });

  it('rejects tension outside 0..10', () => {
    expect(
      isChatRelationshipState({
        dynamic: 'brittle allies',
        valence: -1,
        tension: 11,
        leverage: 'Each knows one ruinous fact about the other',
      })
    ).toBe(false);
  });
});
