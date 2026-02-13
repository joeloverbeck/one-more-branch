import fs from 'fs';
import path from 'path';

describe('home page template', () => {
  const templatePath = path.join(__dirname, '../../../../src/server/views/pages/home.ejs');

  it('renders prepared-story state with briefing link', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    expect(template).toContain('story.pageCount === 0');
    expect(template).toContain('Awaiting briefing');
    expect(template).toContain('/play/<%= story.id %>/briefing');
    expect(template).toContain('View Briefing');
  });
});
