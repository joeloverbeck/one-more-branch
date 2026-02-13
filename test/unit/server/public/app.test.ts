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
    expect(script).toContain('function createProgressId()');
    expect(script).toContain('function createLoadingProgressController(loadingElement)');
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

    expect(script).toContain("escapeHtmlWithBreaks(data.page.narrativeText || '')");
    expect(script).toContain('changes.map((change) => `<li>${escapeHtml(change)}</li>`)');
    expect(script).toContain('escapeHtml(choiceText)');
    expect(script).toContain('escapeHtml(thread.text)');
  });

  it('contains dedicated open-thread panel render/rebuild function', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain(
      'function renderOpenThreadsPanel(openThreads, openThreadOverflowSummary, narrativeElement)'
    );
    expect(script).toContain('const OPEN_THREADS_PANEL_LIMIT = 6;');
    expect(script).toContain('function buildOpenThreadOverflowSummary(hiddenThreads)');
    expect(script).toContain('function renderThreadBadgePill(threadType, urgency)');
    expect(script).toContain("document.getElementById('open-threads-panel')");
    expect(script).toContain('existingPanel.remove()');
  });

  it('updates open-thread panel from AJAX choice response data', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain(
      'renderOpenThreadsPanel(data.page.openThreads, data.page.openThreadOverflowSummary, narrative);'
    );
    expect(script).not.toContain('data.logScript');
    expect(script).not.toContain('executeLogScript');
    expect(script).toContain('if (!Array.isArray(openThreads) || openThreads.length === 0)');
    expect(script).toContain("getIconPath('thread_type_' + threadType)");
    expect(script).toContain("getIconPath('thread_urgency_' + urgency)");
    expect(script).toContain('class="thread-icon-pill"');
    expect(script).toContain('class="thread-icon-badge thread-icon-badge--type"');
    expect(script).toContain('class="thread-icon-badge thread-icon-badge--urgency"');
    expect(script).toContain('function getOpenThreadUrgencyClass(urgency)');
    expect(script).toContain("return 'open-threads-text--high';");
    expect(script).toContain("return 'open-threads-text--medium';");
    expect(script).toContain("return 'open-threads-text--low';");
    expect(script).toContain('class="open-threads-text ');
  });

  it('defines stage phrase buckets for all generation stages', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain('const STAGE_PHRASE_POOLS = {');
    expect(script).toContain('PLANNING_PAGE: [');
    expect(script).toContain('WRITING_OPENING_PAGE: [');
    expect(script).toContain('WRITING_CONTINUING_PAGE: [');
    expect(script).toContain('ANALYZING_SCENE: [');
    expect(script).toContain('RESTRUCTURING_STORY: [');
  });

  it('polls generation progress and falls back on unknown or polling failures', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain("fetch('/generation-progress/' + encodeURIComponent(progressId)");
    expect(script).toContain("snapshot.status === 'unknown'");
    expect(script).toContain('setFallbackText();');
    expect(script).toContain("snapshot.status === 'completed' || snapshot.status === 'failed'");
  });

  it('sends progressId for both create-story and make-choice AJAX requests', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain('progressId: createProgressId(),');
    expect(script).toContain('progressId: progressId,');
  });

  it('renders play-page errors in inline alert block instead of browser prompt alerts', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain('function showPlayError(message, choicesSectionEl)');
    expect(script).toContain('function clearPlayError(choicesSectionEl)');
    expect(script).toContain("var errorBlock = choicesSectionEl.querySelector('#play-error');");
    expect(script).toContain(
      "showPlayError(error instanceof Error ? error.message : 'Failed to add custom choice', choicesSection);"
    );
    expect(script).toContain(
      "showPlayError(error instanceof Error ? error.message : 'Something went wrong. Please try again.', choicesSection);"
    );
    expect(script).not.toContain(
      "alert(error instanceof Error ? error.message : 'Failed to add custom choice');"
    );
    expect(script).not.toContain(
      "alert(error instanceof Error ? error.message : 'Something went wrong. Please try again.');"
    );
  });

  it('handles optional suggested protagonist speech payload and clear/preserve behavior', () => {
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain('class="suggested-protagonist-speech-input"');
    expect(script).toContain('function getSuggestedProtagonistSpeechInputValue()');
    expect(script).toContain(
      'const suggestedProtagonistSpeech = getSuggestedProtagonistSpeechInputValue().trim();'
    );
    expect(script).toContain('if (suggestedProtagonistSpeech.length > 0) {');
    expect(script).toContain('body.suggestedProtagonistSpeech = suggestedProtagonistSpeech;');
    expect(script).toContain('const suggestedSpeechValue = data.wasGenerated === true');
    expect(script).toContain("            ? ''");
    expect(script).toContain('            : getSuggestedProtagonistSpeechInputValue();');
    expect(script).toContain(
      'rebuildChoicesSection(data.page.choices, suggestedSpeechValue, choices, choicesSection, bindCustomChoiceEvents);'
    );
    expect(script).toContain(
      'rebuildChoicesSection(data.choices, getSuggestedProtagonistSpeechInputValue(), choices, choicesSection, bindCustomChoiceEvents);'
    );
  });
});
