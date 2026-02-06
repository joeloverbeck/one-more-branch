import fs from 'fs';
import path from 'path';

describe('error page template', () => {
  const errorPath = path.join(__dirname, '../../../../src/server/views/pages/error.ejs');

  it('exists and renders required error page bindings', () => {
    expect(fs.existsSync(errorPath)).toBe(true);

    const template = fs.readFileSync(errorPath, 'utf8');

    expect(template).toContain('<!DOCTYPE html>');
    expect(template).toContain('<title><%= title %></title>');
    expect(template).toContain('<p class="error-message"><%= message %></p>');
    expect(template).toContain('<a href="/" class="btn btn-primary">Back to Home</a>');
  });

  it('includes shared partials and does not use unavailable layout helper', () => {
    const template = fs.readFileSync(errorPath, 'utf8');

    expect(template).toContain("<%- include('../partials/header') %>");
    expect(template).toContain("<%- include('../partials/footer') %>");
    expect(template).not.toContain('layout(');
  });
});
