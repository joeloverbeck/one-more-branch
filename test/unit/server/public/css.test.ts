import fs from 'fs';
import path from 'path';

describe('public stylesheet', () => {
  const cssPath = path.join(__dirname, '../../../../public/css/styles.css');

  it('exists and is substantial', () => {
    expect(fs.existsSync(cssPath)).toBe(true);

    const css = fs.readFileSync(cssPath, 'utf8');
    expect(css.length).toBeGreaterThan(1000);
  });

  it('defines theme variables in :root', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain(':root');
    expect(css).toContain('--color-primary');
    expect(css).toContain('--color-bg');
  });

  it('styles key selectors used by current templates', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain('.container');
    expect(css).toContain('.site-header');
    expect(css).toContain('.btn');
    expect(css).toContain('.story-card');
    expect(css).toContain('.choice-btn');
    expect(css).toContain('.loading-overlay');
    expect(css).toContain('.modal');
    expect(css).toContain('.open-threads-panel');
    expect(css).toContain('.open-threads-list');
    expect(css).toContain('.thread-icon-pill');
    expect(css).toContain('.thread-icon-badge');
    expect(css).toContain('.thread-icon');
  });

  it('includes mobile and spinner animation rules', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain('@media (max-width: 600px)');
    expect(css).toContain('.open-threads-panel {');
    expect(css).toContain('position: static;');
    expect(css).toContain('position: fixed;');
    expect(css).toContain('@keyframes spin');
  });

  it('does not import external CSS frameworks', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).not.toMatch(/@import\s+url\(/i);
    expect(css).not.toMatch(/https?:\/\//i);
  });
});
