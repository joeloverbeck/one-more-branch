import fs from 'fs';
import path from 'path';

describe('public client script', () => {
  const scriptPath = path.join(__dirname, '../../../../public/js/app.js');

  it('exists and is non-empty', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);

    const script = fs.readFileSync(scriptPath, 'utf8');
    expect(script.length).toBeGreaterThan(0);
  });

  it('uses strict mode and IIFE structure', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain("'use strict';");
    expect(script).toMatch(/^\(function\(\) \{/m);
    expect(script).toMatch(/\}\)\(\);\s*$/m);
  });

  it('defines API key and page initialization helpers', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain("const API_KEY_STORAGE_KEY = 'omb_api_key';");
    expect(script).toContain('function getApiKey()');
    expect(script).toContain('function setApiKey(key)');
    expect(script).toContain('function initPlayPage()');
    expect(script).toContain('function escapeHtml(text)');
    expect(script).toContain("document.addEventListener('DOMContentLoaded'");
  });

  it('uses sessionStorage only and avoids localStorage', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain('sessionStorage.getItem(API_KEY_STORAGE_KEY)');
    expect(script).toContain('sessionStorage.setItem(API_KEY_STORAGE_KEY, key)');
    expect(script).not.toContain('localStorage');
  });

  it('escapes dynamic content before innerHTML updates', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain('escapeHtmlWithBreaks(data.page.narrativeText || \'\')');
    expect(script).toContain('changes.map((change) => `<li>${escapeHtml(change)}</li>`)');
    expect(script).toContain('${escapeHtml(choiceText)}');
  });
});
