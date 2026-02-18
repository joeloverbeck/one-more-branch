import fs from 'fs';
import path from 'path';

describe('concepts page template', () => {
  const conceptsPath = path.join(__dirname, '../../../../src/server/views/pages/concepts.ejs');

  it('wraps the API key password input in a form', () => {
    expect(fs.existsSync(conceptsPath)).toBe(true);

    const template = fs.readFileSync(conceptsPath, 'utf8');

    expect(template).toContain('<form id="concept-generate-form">');
    expect(template).toContain('<input');
    expect(template).toContain('type="password"');
    expect(template).toContain('id="conceptApiKey"');
    expect(template).toMatch(
      /<form id="concept-generate-form">[\s\S]*<input[\s\S]*type="password"[\s\S]*id="conceptApiKey"/
    );
  });
});
