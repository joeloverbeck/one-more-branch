import fs from 'fs';
import path from 'path';
import { render as renderEjs } from 'ejs';

describe('chat-list page template', () => {
  const templatePath = path.join(__dirname, '../../../../src/server/views/pages/chat-list.ejs');
  const renderTemplate = renderEjs as (
    source: string,
    data: {
      title: string;
      chats: Array<{
        id: string;
        targetCharacterName: string;
        interlocutorCharacterName: string;
        turnCount: number;
        updatedAt: string;
        location: string;
      }>;
    },
    options: { filename: string }
  ) => string;

  it('renders an empty-state list shell with client hooks', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    const html = renderTemplate(
      template,
      {
        title: 'Character Chats - One More Branch',
        chats: [],
      },
      { filename: templatePath }
    );

    expect(html).toContain('id="chat-list-page"');
    expect(html).toContain('data-chat-list');
    expect(html).toContain('id="chat-list-empty-state"');
    expect(html).toContain('href="/chat/new"');
    expect(html).toContain('No chats yet.');
  });

  it('renders saved chat summaries and delete hooks', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    const html = renderTemplate(
      template,
      {
        title: 'Character Chats - One More Branch',
        chats: [
          {
            id: 'chat-1',
            targetCharacterName: 'Mara',
            interlocutorCharacterName: 'Iven',
            turnCount: 12,
            updatedAt: '2026-03-27T09:02:00.000Z',
            location: 'Archive',
          },
        ],
      },
      { filename: templatePath }
    );

    expect(html).toContain('data-chat-summary');
    expect(html).toContain('data-chat-id="chat-1"');
    expect(html).toContain('Mara and Iven');
    expect(html).toContain('Turns:</strong> 12');
    expect(html).toContain('Location:</strong> Archive');
    expect(html).toContain('href="/chat/chat-1"');
    expect(html).toContain('data-chat-delete-button');
  });
});
