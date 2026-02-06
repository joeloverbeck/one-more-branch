import fs from 'fs';
import path from 'path';

describe('main layout template', () => {
  const layoutPath = path.join(__dirname, '../../../../src/server/views/layouts/main.ejs');

  it('exists at the expected path', () => {
    expect(fs.existsSync(layoutPath)).toBe(true);
  });

  it('contains required layout structure and shared assets', () => {
    const template = fs.readFileSync(layoutPath, 'utf8');

    expect(template).toContain('<!DOCTYPE html>');
    expect(template).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    expect(template).toContain('<title><%= title %></title>');
    expect(template).toContain('<link rel="stylesheet" href="/css/styles.css">');
    expect(template).toContain('<script src="/js/app.js"></script>');
    expect(template).toContain("<%- include('../partials/header') %>");
    expect(template).toContain("<%- include('../partials/footer') %>");
    expect(template).toContain('<main class="container">');
    expect(template).toContain('<%- body %>');
  });
});
