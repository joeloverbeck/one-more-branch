import {
  buildChatRelationshipPresentation,
  type ChatRelationshipTimelinePoint,
} from '@/models/chat';

describe('chat-relationship-presentation', () => {
  it('builds canonical semantic wording and aria labels from relationship history', () => {
    const relationshipTimeline: ChatRelationshipTimelinePoint[] = [
      {
        turnNumber: 2,
        snapshot: {
          dynamic: 'guarded detente',
          valence: 3,
          tension: 6,
          leverage: 'Shared leverage',
          whatCharacterBelievesAboutInterlocutor: ['He is stalling.'],
        },
      },
      {
        turnNumber: 4,
        snapshot: {
          dynamic: 'fragile alliance',
          valence: 5,
          tension: 8,
          leverage: 'Mutual leverage',
          whatCharacterBelievesAboutInterlocutor: ['He is buying time.'],
        },
      },
    ];

    const result = buildChatRelationshipPresentation(relationshipTimeline, {
      dynamic: 'stale state',
      valence: -3,
      tension: 1,
      leverage: 'Should not drive presentation',
    });

    expect(result.valence).toEqual({
      value: 5,
      delta: 2,
      summary: 'Loyal and warming',
      trend: 'warming',
      gaugeAriaLabel: 'Valence: Loyal and warming. Current value 5 on a scale from -5 to 5.',
      sparklineAriaLabel: 'Valence trend: Loyal and warming across 2 recorded turns.',
    });
    expect(result.tension).toEqual({
      value: 8,
      delta: 2,
      summary: 'Breaking and rising',
      trend: 'rising',
      gaugeAriaLabel: 'Tension: Breaking and rising. Current value 8 on a scale from 0 to 10.',
      sparklineAriaLabel: 'Tension trend: Breaking and rising across 2 recorded turns.',
    });
  });

  it('falls back to session state when the timeline is empty', () => {
    const result = buildChatRelationshipPresentation([], {
      dynamic: 'strained allies',
      valence: -1,
      tension: 6,
      leverage: 'Shared guilt',
    });

    expect(result.valence.summary).toBe('Frayed and steady');
    expect(result.valence.delta).toBe(0);
    expect(result.tension.summary).toBe('Strained and steady');
    expect(result.tension.delta).toBe(0);
  });
});
