import { renderFile } from 'ejs';
import { JSDOM } from 'jsdom';
import path from 'node:path';

const templatePath = path.resolve(
  __dirname,
  '../../../../src/server/views/pages/characters.ejs'
);

async function renderCharactersPage(): Promise<Document> {
  const html = await renderFile(templatePath, {
    title: 'Character Profiles - One More Branch',
  });

  return new JSDOM(html).window.document;
}

describe('characters page template', () => {
  it('contains the OpenRouter API key password field inside a form', async () => {
    const document = await renderCharactersPage();

    const apiKeyInput = document.querySelector<HTMLInputElement>('#characters-api-key');

    expect(apiKeyInput).not.toBeNull();
    expect(apiKeyInput?.type).toBe('password');
    expect(apiKeyInput?.closest('form')).not.toBeNull();
  });
});
