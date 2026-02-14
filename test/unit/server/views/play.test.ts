import fs from 'fs';
import path from 'path';

describe('play page template', () => {
  const playPath = path.join(__dirname, '../../../../src/server/views/pages/play.ejs');

  it('wraps the API key password input in a submit form', () => {
    expect(fs.existsSync(playPath)).toBe(true);

    const template = fs.readFileSync(playPath, 'utf8');

    expect(template).toContain('<form id="api-key-form" class="api-key-form">');
    expect(template).toContain('<input type="password" id="modal-api-key"');
    expect(template).toContain(
      '<button class="btn btn-primary" id="save-api-key" type="submit">Continue</button>'
    );
    expect(template).toMatch(
      /<form id="api-key-form" class="api-key-form">[\s\S]*<input type="password" id="modal-api-key"/
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
        /<div class="story-title-section">[\s\S]*<h2><%=\s*story\.title\s*%><\/h2>[\s\S]*<span class="act-indicator">/
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
      expect(template).toContain(
        "/images/icons/thread-type-<%= thread.threadType.toLowerCase().replace(/_/g, '-') %>.png"
      );
      expect(template).toContain(
        "/images/icons/thread-urgency-<%= thread.urgency.toLowerCase().replace(/_/g, '-') %>.png"
      );
      expect(template).toContain(
        'class="open-threads-text open-threads-text--<%= thread.urgency.toLowerCase().replace(/_/g, \'-\') %>"'
      );
      expect(template).toContain('<%= thread.text %></span>');
    });

    it('renders panel conditionally when openThreadPanelRows exist', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain(
        '<% if (openThreadPanelRows && openThreadPanelRows.length > 0) { %>'
      );
      expect(template).toContain('openThreadPanelRows.forEach');
    });

    it('renders overflow summary block conditionally', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('<% if (openThreadOverflowSummary) { %>');
      expect(template).toContain('class="open-threads-overflow-summary"');
      expect(template).toContain('<%= openThreadOverflowSummary %>');
    });
  });

  describe('protagonist guidance block', () => {
    it('renders collapsible guidance fields in the choices section', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('class="protagonist-guidance"');
      expect(template).toContain('class="protagonist-guidance__summary"');
      expect(template).toContain('id="guidance-emotions"');
      expect(template).toContain('id="guidance-thoughts"');
      expect(template).toContain('id="guidance-speech"');
      expect(template).toContain('maxlength="500"');
      expect(template).toContain('Guide Your Protagonist');
    });
  });

  describe('analyst insights wiring', () => {
    it('contains analyst JSON script payload node', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('<script type="application/json" id="analyst-data">');
      expect(template).toContain('JSON.stringify(page.analystResult ?? null)');
    });

    it('contains insights-context JSON element with actDisplayInfo and sceneSummary', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('<script type="application/json" id="insights-context">');
      expect(template).toContain('actDisplayInfo');
      expect(template).toContain('sceneSummary');
    });

    it('contains insights modal scaffold and header actions slot', () => {
      const template = fs.readFileSync(playPath, 'utf8');

      expect(template).toContain('id="story-header-actions"');
      expect(template).toContain('id="insights-modal"');
      expect(template).toContain('id="insights-modal-body"');
      expect(template).toContain('id="insights-close-btn"');
    });
  });
});
