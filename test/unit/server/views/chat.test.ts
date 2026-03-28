import fs from 'fs';
import path from 'path';
import { render as renderEjs } from 'ejs';

describe('chat page template', () => {
  const templatePath = path.join(__dirname, '../../../../src/server/views/pages/chat.ejs');
  const renderTemplate = renderEjs as (
    source: string,
    data: {
      title: string;
      session: {
        id: string;
        targetCharacterName: string;
        interlocutorCharacterName: string;
        physicalContext: {
          location: string;
          microLocation: string;
          timeOfDay: string;
          privacy: string;
          distanceBand: string;
          characterActivity: string;
          interactableObjects: string[];
          ambientConditions: string[];
        };
        leadInContext: {
          leadInSummary: string;
          recentEvents: string[];
          whyNow: string;
        };
        relationshipState: {
          dynamic: string;
          valence: number;
          tension: number;
          leverage: string;
        };
      };
      turns: Array<{
        turnNumber: number;
        speaker: 'USER' | 'CHARACTER';
        timestamp: string;
        blocks: Array<{
          type: 'ACTION' | 'SPEECH';
          text: string;
          delivery?: string;
        }>;
      }>;
      chatUiBootstrap: {
        chatBible: Record<string, unknown> | null;
        knowledgeState: {
          knownFacts: string[];
          suspicions: string[];
          falseBeliefs: string[];
          secretsRevealed: string[];
        };
        relationshipHistory: Array<{
          turnNumber: number;
          valence: number;
          tension: number;
          dynamic: string;
        }>;
      };
    },
    options: { filename: string }
  ) => string;

  it('renders prior turns with action and speech blocks', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    const html = renderTemplate(
      template,
      {
        title: 'Chat with Mara - One More Branch',
        session: {
          id: 'chat-1',
          targetCharacterName: 'Mara',
          interlocutorCharacterName: 'Iven',
          physicalContext: {
            location: 'Archive',
            microLocation: 'Reading alcove',
            timeOfDay: 'EVENING',
            privacy: 'PRIVATE',
            distanceBand: 'CONVERSATIONAL',
            characterActivity: 'Cataloguing ledgers',
            interactableObjects: ['ledger', 'lamp'],
            ambientConditions: ['rain', 'dust'],
          },
          leadInContext: {
            leadInSummary: 'They meet after the raid.',
            recentEvents: ['A witness vanished.'],
            whyNow: 'The ledger must be found before dawn.',
          },
          relationshipState: {
            dynamic: 'strained allies',
            valence: -1,
            tension: 6,
            leverage: 'Shared guilt',
          },
        },
        turns: [
          {
            turnNumber: 1,
            speaker: 'USER',
            timestamp: '2026-03-27T09:01:00.000Z',
            blocks: [
              { type: 'ACTION', text: 'He sets the ledger on the table.' },
              { type: 'SPEECH', text: 'Tell me what happened.' },
            ],
          },
          {
            turnNumber: 2,
            speaker: 'CHARACTER',
            timestamp: '2026-03-27T09:02:00.000Z',
            blocks: [{ type: 'SPEECH', text: 'You already know enough.', delivery: 'dryly' }],
          },
        ],
        chatUiBootstrap: {
          chatBible: null,
          knowledgeState: {
            knownFacts: [],
            suspicions: [],
            falseBeliefs: [],
            secretsRevealed: [],
          },
          relationshipHistory: [
            { turnNumber: 0, valence: 0, tension: 0, dynamic: '' },
            { turnNumber: 2, valence: 0, tension: 0, dynamic: '' },
          ],
        },
      },
      { filename: templatePath }
    );

    expect(html).toContain('id="chat-page"');
    expect(html).toContain('class="chat-page-body"');
    expect(html).toContain('class="chat-layout"');
    expect(html).toContain('data-chat-id="chat-1"');
    expect(html).toContain('data-chat-turn');
    expect(html).toContain('data-chat-speaker="USER"');
    expect(html).toContain('data-chat-speaker="CHARACTER"');
    expect(html).toContain('class="chat-conversation"');
    expect(html).toContain('class="chat-sidebar"');
    expect(html).toContain('class="chat-input-bar"');
    expect(html).toContain('<em>He sets the ledger on the table.</em>');
    expect(html).toContain('&ldquo;Tell me what happened.&rdquo;');
    expect(html).toContain('dryly:');
    expect(html).toContain('&ldquo;You already know enough.&rdquo;');
  });

  it('renders scene-state and composer hooks for client enhancement', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    const html = renderTemplate(
      template,
      {
        title: 'Chat with Mara - One More Branch',
        session: {
          id: 'chat-1',
          targetCharacterName: 'Mara',
          interlocutorCharacterName: 'Iven',
          physicalContext: {
            location: 'Archive',
            microLocation: 'Reading alcove',
            timeOfDay: 'EVENING',
            privacy: 'PRIVATE',
            distanceBand: 'CONVERSATIONAL',
            characterActivity: 'Cataloguing ledgers',
            interactableObjects: [],
            ambientConditions: [],
          },
          leadInContext: {
            leadInSummary: 'They meet after the raid.',
            recentEvents: [],
            whyNow: 'The ledger must be found before dawn.',
          },
          relationshipState: {
            dynamic: '',
            valence: 0,
            tension: 0,
            leverage: '',
          },
        },
        turns: [],
        chatUiBootstrap: {
          chatBible: null,
          knowledgeState: {
            knownFacts: [],
            suspicions: [],
            falseBeliefs: [],
            secretsRevealed: [],
          },
          relationshipHistory: [{ turnNumber: 0, valence: 0, tension: 0, dynamic: '' }],
        },
      },
      { filename: templatePath }
    );

    expect(html).toContain('id="chat-physical-context"');
    expect(html).toContain('data-chat-turn-count');
    expect(html).toContain('Hide Scene State');
    expect(html).toContain('data-chat-sidebar-toggle');
    expect(html).toContain('EVENING');
    expect(html).toContain('PRIVATE');
    expect(html).toContain('CONVERSATIONAL');
    expect(html).toContain('data-chat-field="location"');
    expect(html).toContain('data-chat-field="dynamic"');
    expect(html).toContain('id="chat-turn-form"');
    expect(html).toContain('data-chat-turn-form');
    expect(html).toContain('id="chat-apikey-toggle"');
    expect(html).toContain('id="chat-apikey-popover"');
    expect(html).toContain('name="apiKey"');
    expect(html).toContain('name="message"');
    expect(html).toContain('rows="1"');
    expect(html).toContain('maxlength="2000"');
    expect(html).toContain('class="btn btn-primary chat-send-btn"');
    expect(html).toContain('id="chat-loading-indicator"');
    expect(html).toContain('data-chat-progress');
    expect(html).toContain('<script type="application/json" id="chat-ui-bootstrap">');
    expect(html).toContain('"relationshipHistory":[{"turnNumber":0,"valence":0,"tension":0,"dynamic":""}]');
    expect(html).toContain('No turns yet. Start the conversation below.');
    expect(html).toContain('None');
    expect(html).toContain('Unformed');
  });
});
