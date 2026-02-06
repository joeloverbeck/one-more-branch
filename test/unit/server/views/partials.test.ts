import fs from 'fs';
import path from 'path';

describe('view partial templates', () => {
  const headerPath = path.join(__dirname, '../../../../src/server/views/partials/header.ejs');
  const footerPath = path.join(__dirname, '../../../../src/server/views/partials/footer.ejs');

  it('header partial exists and includes logo and navigation links', () => {
    expect(fs.existsSync(headerPath)).toBe(true);

    const template = fs.readFileSync(headerPath, 'utf8');

    expect(template).toContain('<header class="site-header">');
    expect(template).toContain('<a href="/" class="logo">One More Branch</a>');
    expect(template).toContain('<nav>');
    expect(template).toContain('<a href="/">Stories</a>');
    expect(template).toContain('<a href="/stories/new">New Adventure</a>');
  });

  it('footer partial exists and includes identity and disclaimer text', () => {
    expect(fs.existsSync(footerPath)).toBe(true);

    const template = fs.readFileSync(footerPath, 'utf8');

    expect(template).toContain('<footer class="site-footer">');
    expect(template).toContain('One More Branch - Interactive Storytelling');
    expect(template).toContain('Content is AI-generated and may contain mature themes.');
  });
});
