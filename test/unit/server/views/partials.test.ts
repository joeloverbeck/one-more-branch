import fs from 'fs';
import path from 'path';

describe('view partial templates', () => {
  const headerPath = path.join(__dirname, '../../../../src/server/views/partials/header.ejs');
  const footerPath = path.join(__dirname, '../../../../src/server/views/partials/footer.ejs');
  const chatSidebarPath = path.join(
    __dirname,
    '../../../../src/server/views/partials/chat-sidebar.ejs'
  );

  it('header partial exists and includes logo and dropdown navigation', () => {
    expect(fs.existsSync(headerPath)).toBe(true);

    const template = fs.readFileSync(headerPath, 'utf8');

    expect(template).toContain('<header class="site-header">');
    expect(template).toContain('<a href="/" class="logo">One More Branch</a>');
    expect(template).toContain('<nav>');

    expect(template).toContain('nav-dropdown');
    expect(template).toContain('href="/"');
    expect(template).toContain('href="/spines"');
    expect(template).toContain('href="/create-story"');
    expect(template).toContain('href="/kernels"');
    expect(template).toContain('href="/evolve-kernels"');
    expect(template).toContain('href="/concept-seeds"');
    expect(template).toContain('href="/concepts"');
    expect(template).toContain('href="/evolve"');
    expect(template).toContain('href="/chat"');
    expect(template).toContain('href="/logs"');
    expect(template).toContain("cp.startsWith('/character') || cp.startsWith('/chat')");
    expect(template).toContain("cp === '/chat' || cp.startsWith('/chat')");

    expect(template.indexOf('Architecture')).toBeLessThan(template.indexOf('Kernels'));
    expect(template.indexOf('Kernels')).toBeLessThan(template.indexOf('Concepts'));
    expect(template.indexOf('Character Webs')).toBeLessThan(template.indexOf('Chat with Character'));
  });

  it('footer partial exists and includes identity and disclaimer text', () => {
    expect(fs.existsSync(footerPath)).toBe(true);

    const template = fs.readFileSync(footerPath, 'utf8');

    expect(template).toContain('<footer class="site-footer">');
    expect(template).toContain('One More Branch - Interactive Storytelling');
    expect(template).toContain('Content is AI-generated and may contain mature themes.');
  });

  it('chat sidebar partial exists and preserves the canonical sidebar hooks', () => {
    expect(fs.existsSync(chatSidebarPath)).toBe(true);

    const template = fs.readFileSync(chatSidebarPath, 'utf8');

    expect(template).toContain('<aside class="chat-sidebar" id="chat-sidebar">');
    expect(template).toContain('id="chat-physical-context"');
    expect(template).toContain('id="chat-relationship-state"');
    expect(template).toContain('id="chat-knowledge-state"');
    expect(template).toContain('id="chat-character-mind"');
    expect(template).toContain('id="chat-conversation-state"');
    expect(template).toContain('id="chat-guardrails"');
    expect(template).toContain('id="chat-lead-in-context"');
    expect(template).toContain('data-chat-section="physical"');
    expect(template).toContain('data-chat-section="relationship"');
    expect(template).toContain('data-chat-section="knowledge"');
    expect(template).toContain('data-chat-section="mind"');
    expect(template).toContain('data-chat-section="conversation"');
    expect(template).toContain('data-chat-section="guardrails"');
    expect(template).toContain('data-chat-list="interactableObjects"');
    expect(template).toContain('data-chat-list="activeThreads"');
    expect(template).toContain('data-chat-list="responseConstraints"');
    expect(template).toContain('data-chat-gauge="valence"');
    expect(template).toContain('data-chat-gauge="tension"');
  });
});
