import fs from 'fs';
import path from 'path';

describe('character-webs page template', () => {
  const templatePath = path.join(
    __dirname,
    '../../../../src/server/views/pages/character-webs.ejs'
  );

  it('renders the page shell and client mounting points', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    expect(template).toContain('id="character-webs-page"');
    expect(template).toContain('id="character-web-list"');
    expect(template).toContain('id="character-web-details"');
    expect(template).toContain('id="character-development-section"');
    expect(template).toContain('id="loading"');
    expect(template).toContain('id="character-webs-api-key-form"');
  });
});
