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
    expect(script).toContain("escapeHtml(choiceText)");
    expect(script).toContain("escapeHtml(thread.text)");
  });

  it('contains dedicated open-thread panel render/rebuild function', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain('function renderOpenThreadsPanel(openThreads)');
    expect(script).toContain('function renderThreadBadgePill(threadType, urgency)');
    expect(script).toContain("document.getElementById('open-threads-panel')");
    expect(script).toContain('existingPanel.remove()');
  });

  it('updates open-thread panel from AJAX choice response data', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain('renderOpenThreadsPanel(data.page.openThreads);');
    expect(script).toContain("if (!Array.isArray(openThreads) || openThreads.length === 0)");
    expect(script).toContain("getIconPath('thread_type_' + threadType)");
    expect(script).toContain("getIconPath('thread_urgency_' + urgency)");
    expect(script).toContain("class=\"thread-icon-pill\"");
    expect(script).toContain("class=\"thread-icon-badge thread-icon-badge--type\"");
    expect(script).toContain("class=\"thread-icon-badge thread-icon-badge--urgency\"");
    expect(script).toContain('function getOpenThreadUrgencyClass(urgency)');
    expect(script).toContain("return 'open-threads-text--high';");
    expect(script).toContain("return 'open-threads-text--medium';");
    expect(script).toContain("return 'open-threads-text--low';");
    expect(script).toContain("class=\"open-threads-text ");
  });
});
