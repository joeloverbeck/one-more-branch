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
    expect(css).toContain('.open-threads-text--high');
    expect(css).toContain('.open-threads-text--medium');
    expect(css).toContain('.open-threads-text--low');
    expect(css).toContain('.chat-block--action');
    expect(css).toContain('.chat-block--speech');
    expect(css).toContain('.chat-delivery');
    expect(css).toContain('.chat-tag-bar');
    expect(css).toContain('.chat-tag--emotion');
    expect(css).toContain('.chat-inner-world');
    expect(css).toContain('.chat-inner-world__summary');
    expect(css).toContain('.chat-inner-world__emotion-grid');
    expect(css).toContain('.chat-inner-world__pill--physical');
    expect(css).toContain('.chat-metric-card__summary');
    expect(css).toContain('.chat-metric-card__trend');
    expect(css).toContain('.chat-gauge__anchors');
    expect(css).toContain('.chat-sparkline__current-dot');
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

  it('keeps shared form input selector block well-formed and non-duplicated', () => {
    const css = fs.readFileSync(cssPath, 'utf8');
    const sharedSelector = '.form-group input,\n.form-group textarea,\n.modal-content input {';

    const matchCount = css.split(sharedSelector).length - 1;
    expect(matchCount).toBe(1);
  });

  it('makes the chat composer textarea fill its grid column', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain('.chat-input-form__message {');
    expect(css).toContain('min-width: 0;');
    expect(css).toContain('.chat-input-form__message textarea {');
    expect(css).toContain('width: 100%;');
    expect(css).toContain('box-sizing: border-box;');
    expect(css).toContain('min-height: 46px;');
  });

  it('applies thin dark scrollbars to the chat page scroll containers', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain('.chat-conversation,\n.chat-sidebar {');
    expect(css).toContain('scrollbar-width: thin;');
    expect(css).toContain('scrollbar-color: rgba(39, 64, 111, 0.5) transparent;');
    expect(css).toContain('.chat-conversation::-webkit-scrollbar,\n.chat-sidebar::-webkit-scrollbar {');
    expect(css).toContain(
      '.chat-conversation::-webkit-scrollbar-track,\n.chat-sidebar::-webkit-scrollbar-track {'
    );
    expect(css).toContain(
      '.chat-conversation::-webkit-scrollbar-thumb,\n.chat-sidebar::-webkit-scrollbar-thumb {'
    );
    expect(css).toContain(
      '.chat-conversation::-webkit-scrollbar-thumb:hover,\n.chat-sidebar::-webkit-scrollbar-thumb:hover {'
    );
  });
});
