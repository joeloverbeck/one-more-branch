import fs from 'fs';
import path from 'path';

describe('briefing page template', () => {
  const briefingPath = path.join(__dirname, '../../../../src/server/views/pages/briefing.ejs');

  it('contains begin adventure control and briefing container story id', () => {
    const template = fs.readFileSync(briefingPath, 'utf8');

    expect(template).toContain('class="briefing-container" data-story-id="<%= story.id %>"');
    expect(template).toContain('id="begin-adventure-btn"');
    expect(template).toContain('id="briefing-error"');
  });

  it('contains loading overlay and API key modal controls', () => {
    const template = fs.readFileSync(briefingPath, 'utf8');

    expect(template).toContain('id="loading"');
    expect(template).toContain('id="api-key-modal"');
    expect(template).toContain('id="api-key-form"');
    expect(template).toContain('id="cancel-api-key"');
  });
});
