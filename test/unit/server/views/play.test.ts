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

  describe('open threads panel', () => {
    it('contains panel container and heading text', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('id="open-threads-panel"');
      expect(template).toContain('Active Threads');
    });

    it('uses semantic list markup for thread rows', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('<ul class="open-threads-list" id="open-threads-list">');
      expect(template).toContain('<li class="open-threads-item">');
    });

    it('renders thread badge pill with type and urgency icon images', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('class="thread-icon-pill"');
      expect(template).toContain('class="thread-icon-badge thread-icon-badge--type"');
      expect(template).toContain('class="thread-icon-badge thread-icon-badge--urgency"');
      expect(template).toContain('/images/icons/thread-type-<%= thread.threadType.toLowerCase().replace(/_/g, \'-\') %>.png');
      expect(template).toContain('/images/icons/thread-urgency-<%= thread.urgency.toLowerCase().replace(/_/g, \'-\') %>.png');
      expect(template).toContain('class="open-threads-text open-threads-text--<%= thread.urgency.toLowerCase().replace(/_/g, \'-\') %>"');
      expect(template).toContain('<%= thread.text %></span>');
    });

    it('renders panel conditionally when openThreadPanelRows exist', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('<% if (openThreadPanelRows && openThreadPanelRows.length > 0) { %>');
      expect(template).toContain('openThreadPanelRows.forEach');
    });

    it('renders overflow summary block conditionally', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('<% if (openThreadOverflowSummary) { %>');
      expect(template).toContain('class="open-threads-overflow-summary"');
      expect(template).toContain('<%= openThreadOverflowSummary %>');
    });
  });

  describe('suggested protagonist speech input', () => {
    it('renders ghost input with placeholder in the choices section', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('class="suggested-protagonist-speech-container"');
      expect(template).toContain('id="suggested-protagonist-speech-input"');
      expect(template).toContain('class="suggested-protagonist-speech-input"');
      expect(template).toContain('Suggest something your protagonist might say...');
      expect(template).toContain('maxlength="500"');
      expect(template).not.toContain('suggested-protagonist-speech-label');
    });
  });
});
