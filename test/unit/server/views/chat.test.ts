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
        turnMeta?: {
          expectsReply?: boolean;
          endsWithQuestion?: boolean;
          visibleEmotion: string;
          finalPressure?: string | null;
        };
        plannerOutput?: {
          internalSelfCheck?: {
            whatDoIWant: string;
            whatDoIKnow: string;
            whatAmIHiding: string;
            howHonestAmI: string;
          };
          responseGoal?: string;
          speechAct?: string;
          honestyMode?: string;
          surfaceEmotion?: string;
          suppressedEmotion?: string | null;
          subtext?: string;
          mustAddress?: string[];
          mustAvoid?: string[];
          targetLength?: string;
          actionPlan?: Array<{
            kind: string;
            text: string;
            changesPhysicalState: boolean;
          }>;
          expectedImpact?: {
            relationshipDeltaHint: number;
            tensionDeltaHint: number;
            revealsSecret: boolean;
          };
        };
        stateUpdate?: {
          summaryDelta?: string;
          relationshipShifts?: Array<{
            shiftDescription: string;
            suggestedValenceChange: number;
            suggestedTensionChange: number;
            suggestedNewDynamic: string | null;
          }>;
          knowledgeChanges?: {
            newKnownFacts: string[];
            newSuspicions: string[];
            falseBeliefsCorrected: string[];
            secretsRevealed: string[];
          };
          conversationUpdate?: {
            commitmentsMade: string[];
            threatsMade: string[];
            questionsOpened: string[];
            questionsResolved: string[];
          };
          physicalStateUpdate?: {
            locationChanged: boolean;
            newLocation: string | null;
            newMicroLocation: string | null;
            newDistanceBand: string | null;
            objectStateChanges: string[];
          };
        };
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
            turnMeta: {
              expectsReply: true,
              endsWithQuestion: false,
              visibleEmotion: 'guarded',
              finalPressure: 'Keep him defensive.',
            },
            plannerOutput: {
              internalSelfCheck: {
                whatDoIWant: 'An admission I can use later.',
                whatDoIKnow: 'He is hiding the second ledger.',
                whatAmIHiding: 'I know where the copy is.',
                howHonestAmI: 'Only as honest as leverage requires.',
              },
              responseGoal: 'Corner him without losing composure.',
              speechAct: 'DEFLECT',
              honestyMode: 'PARTIAL',
              surfaceEmotion: 'cold focus',
              suppressedEmotion: 'fear',
              subtext: 'If he pushes harder, I will expose him first.',
              mustAddress: ['the missing ledger'],
              mustAvoid: ['the copied ledger'],
              targetLength: 'MEDIUM',
              actionPlan: [
                {
                  kind: 'GESTURE',
                  text: 'Fold my hands to look calm.',
                  changesPhysicalState: false,
                },
                {
                  kind: 'MOVEMENT',
                  text: 'Take one step toward the lamp.',
                  changesPhysicalState: true,
                },
              ],
              expectedImpact: {
                relationshipDeltaHint: -1,
                tensionDeltaHint: 2,
                revealsSecret: false,
              },
            },
            stateUpdate: {
              summaryDelta: 'The conversation hardens into suspicion.',
              relationshipShifts: [
                {
                  shiftDescription: 'Trust frays further.',
                  suggestedValenceChange: -1,
                  suggestedTensionChange: 2,
                  suggestedNewDynamic: 'escalating standoff',
                },
              ],
              knowledgeChanges: {
                newKnownFacts: ['He recognizes the ledger seal.'],
                newSuspicions: ['He hid the copy intentionally.'],
                falseBeliefsCorrected: [],
                secretsRevealed: [],
              },
              conversationUpdate: {
                commitmentsMade: ['He will answer before dawn.'],
                threatsMade: [],
                questionsOpened: ['Who moved the copy?'],
                questionsResolved: [],
              },
              physicalStateUpdate: {
                locationChanged: false,
                newLocation: null,
                newMicroLocation: null,
                newDistanceBand: 'ARM_REACH',
                objectStateChanges: ['The lamp guttered lower.'],
              },
            },
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
    expect(html).toContain('data-chat-section="physical"');
    expect(html).toContain('data-chat-section="relationship"');
    expect(html).toContain('class="chat-accordion-summary"');
    expect(html).toContain('class="chat-block chat-block--action"');
    expect(html).toContain('<em>He sets the ledger on the table.</em>');
    expect(html).toContain('class="chat-block chat-block--speech"');
    expect(html).toContain('&ldquo;Tell me what happened.&rdquo;');
    expect(html).toContain('<span class="chat-delivery">dryly</span>');
    expect(html).toContain('&ldquo;You already know enough.&rdquo;');
    expect(html).toContain('class="chat-tag-bar"');
    expect(html).toContain('class="chat-tag chat-tag--speech-act">DEFLECT</span>');
    expect(html).toContain('class="chat-tag chat-tag--honesty">PARTIAL</span>');
    expect(html).toContain('class="chat-tag chat-tag--emotion">guarded</span>');
    expect(html).toContain('class="chat-inner-world"');
    expect(html).toContain("Character's Inner World");
    expect(html).toContain('Internal Self-Check');
    expect(html).toContain('What I want');
    expect(html).toContain('An admission I can use later.');
    expect(html).toContain('Emotional Layer');
    expect(html).toContain('Surface emotion');
    expect(html).toContain('Suppressed emotion');
    expect(html).toContain('Response Strategy');
    expect(html).toContain('Must address');
    expect(html).toContain('Action Plan');
    expect(html).toContain('Physical change');
    expect(html).toContain('Turn Impact');
    expect(html).toContain('Expects reply');
    expect(html).toContain('Relationship delta hint');
    expect(html).toContain('State Changes');
    expect(html).toContain('The conversation hardens into suspicion.');
    expect(html).toContain('Trust frays further.');
    expect(html).toContain('data-chat-gauge="valence"');
    expect(html).toContain('data-chat-gauge="tension"');
    expect(html).toContain('data-chat-sparkline="valence"');
    expect(html).toContain('data-chat-sparkline="tension"');
    expect(html).toContain('data-chat-list="interactableObjects"');
    expect(html).toContain('data-chat-list="ambientConditions"');
    expect(html).not.toContain('chat-tag-bar"><span class="chat-tag chat-tag--speech-act">Tell');
    expect(html).not.toContain('<details class="chat-inner-world" open');
  });

  it('omits missing character tag pills without skipping the rest of the turn', () => {
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
            turnNumber: 2,
            speaker: 'CHARACTER',
            timestamp: '2026-03-27T09:02:00.000Z',
            turnMeta: {
              visibleEmotion: 'guarded',
            },
            blocks: [{ type: 'SPEECH', text: 'You already know enough.' }],
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

    expect(html).toContain('class="chat-tag-bar"');
    expect(html).toContain('class="chat-tag chat-tag--emotion">guarded</span>');
    expect(html).not.toContain('chat-tag--speech-act');
    expect(html).not.toContain('chat-tag--honesty');
    expect(html).not.toContain('class="chat-inner-world"');
    expect(html).toContain('&ldquo;You already know enough.&rdquo;');
  });

  it('never renders the inner-world panel for user turns', () => {
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
            plannerOutput: {
              speechAct: 'DEFLECT',
            },
            blocks: [{ type: 'SPEECH', text: 'Tell me what happened.' }],
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
          relationshipHistory: [{ turnNumber: 0, valence: 0, tension: 0, dynamic: '' }],
        },
      },
      { filename: templatePath }
    );

    expect(html).not.toContain('class="chat-inner-world"');
    expect(html).not.toContain('Character\'s Inner World');
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
    expect(html).toContain('data-chat-section="physical"');
    expect(html).toContain('data-chat-section="relationship"');
    expect(html).toContain('data-chat-gauge="valence"');
    expect(html).toContain('data-chat-sparkline="valence"');
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
