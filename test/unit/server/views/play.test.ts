import fs from 'fs';
import path from 'path';

describe('play page template', () => {
  const playPath = path.join(__dirname, '../../../../src/server/views/pages/play.ejs');

  it('wraps the API key password input in a submit form', () => {
    expect(fs.existsSync(playPath)).toBe(true);

    const template = fs.readFileSync(playPath, 'utf8');

    expect(template).toContain('<form id="api-key-form" class="api-key-form">');
    expect(template).toContain('<input type="password" id="modal-api-key"');
    expect(template).toContain('<button class="btn btn-primary" id="save-api-key" type="submit">Continue</button>');
    expect(template).toMatch(
      /<form id="api-key-form" class="api-key-form">[\s\S]*<input type="password" id="modal-api-key"/,
    );
  });

  describe('act display', () => {
    it('contains act-indicator class', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('class="act-indicator"');
    });

    it('has conditional for actDisplayInfo', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('<% if (actDisplayInfo) { %>');
      expect(template).toContain('actDisplayInfo.displayString');
    });

    it('wraps title and act in story-title-section', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('class="story-title-section"');
      expect(template).toMatch(
        /<div class="story-title-section">[\s\S]*<h2><%=\s*story\.title\s*%><\/h2>[\s\S]*<span class="act-indicator">/,
      );
    });
  });
});
