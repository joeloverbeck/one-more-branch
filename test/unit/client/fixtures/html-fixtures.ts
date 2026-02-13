/**
 * HTML fixture builders for client-side characterization tests.
 * These produce minimal DOM structures matching the EJS templates
 * that app.js queries via getElementById, querySelector, etc.
 */

export interface PlayPageOptions {
  storyId?: string;
  pageId?: number;
  narrativeText?: string;
  choices?: Array<{
    text: string;
    choiceType?: string;
    primaryDelta?: string;
    nextPageId?: number | null;
  }>;
  isEnding?: boolean;
  openThreads?: Array<{
    id: string;
    text: string;
    threadType: string;
    urgency: string;
  }>;
  openThreadOverflowSummary?: string;
  activeThreats?: Array<{ id: string; text: string }>;
  threatsOverflowSummary?: string;
  activeConstraints?: Array<{ id: string; text: string }>;
  constraintsOverflowSummary?: string;
  actDisplayInfo?: { displayString: string } | null;
  stateChanges?: string[];
  hasCustomChoiceInput?: boolean;
}

export function buildPlayPageHtml(options: PlayPageOptions = {}): string {
  const storyId = options.storyId ?? 'test-story-1';
  const pageId = options.pageId ?? 1;
  const narrativeText = options.narrativeText ?? 'You stand at a crossroads.';
  const choices = options.choices ?? [
    { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
    { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT' },
  ];
  const isEnding = options.isEnding ?? false;
  const openThreads = options.openThreads ?? [];
  const activeThreats = options.activeThreats ?? [];
  const activeConstraints = options.activeConstraints ?? [];
  const actDisplayInfo = options.actDisplayInfo ?? null;
  const stateChanges = options.stateChanges ?? [];
  const hasCustomChoiceInput = options.hasCustomChoiceInput ?? true;

  const threadsHtml =
    openThreads.length > 0
      ? `<aside class="open-threads-panel" id="open-threads-panel" aria-labelledby="open-threads-title">
        <h3 class="open-threads-title" id="open-threads-title">Active Threads</h3>
        <ul class="open-threads-list" id="open-threads-list">
          ${openThreads
            .map(
              (t) => `<li class="open-threads-item">
            <span class="thread-icon-pill" aria-hidden="true">
              <span class="thread-icon-badge thread-icon-badge--type"></span>
              <span class="thread-icon-badge thread-icon-badge--urgency"></span>
            </span>
            <span class="open-threads-text">${t.text}</span>
          </li>`
            )
            .join('')}
        </ul>
        ${options.openThreadOverflowSummary ? `<div class="open-threads-overflow-summary" id="open-threads-overflow-summary">${options.openThreadOverflowSummary}</div>` : ''}
      </aside>`
      : '';

  const threatsHtml =
    activeThreats.length > 0
      ? `<aside class="active-threats-panel" id="active-threats-panel" aria-labelledby="active-threats-title">
        <h3 class="active-threats-title" id="active-threats-title">Active Threats</h3>
        <ul class="active-threats-list" id="active-threats-list">
          ${activeThreats.map((t) => `<li class="active-threats-item">${t.text}</li>`).join('')}
        </ul>
        ${options.threatsOverflowSummary ? `<div class="keyed-entry-overflow-summary" id="active-threats-overflow">${options.threatsOverflowSummary}</div>` : ''}
      </aside>`
      : '';

  const constraintsHtml =
    activeConstraints.length > 0
      ? `<aside class="active-constraints-panel" id="active-constraints-panel" aria-labelledby="active-constraints-title">
        <h3 class="active-constraints-title" id="active-constraints-title">Active Constraints</h3>
        <ul class="active-constraints-list" id="active-constraints-list">
          ${activeConstraints.map((c) => `<li class="active-constraints-item">${c.text}</li>`).join('')}
        </ul>
        ${options.constraintsOverflowSummary ? `<div class="keyed-entry-overflow-summary" id="active-constraints-overflow">${options.constraintsOverflowSummary}</div>` : ''}
      </aside>`
      : '';

  const sidebarHtml = `<div class="sidebar-widgets" id="sidebar-widgets">${threadsHtml}${threatsHtml}${constraintsHtml}</div>`;

  const stateChangesHtml =
    stateChanges.length > 0
      ? `<aside class="state-changes" id="state-changes">
        <h4>What happened:</h4>
        <ul>${stateChanges.map((c) => `<li>${c}</li>`).join('')}</ul>
      </aside>`
      : '';

  const choiceButtonsHtml = choices
    .map((choice, index) => {
      const isExplored = Boolean(choice.nextPageId);
      return `<div class="choice-row">
      <span class="choice-icon-pill" aria-hidden="true">
        <img class="choice-icon choice-icon--type" src="/images/icons/${(choice.choiceType ?? 'tactical-approach').toLowerCase().replace(/_/g, '-')}.png" alt="" width="32" height="32" loading="lazy">
        <img class="choice-icon choice-icon--delta" src="/images/icons/${(choice.primaryDelta ?? 'goal-shift').toLowerCase().replace(/_/g, '-')}.png" alt="" width="32" height="32" loading="lazy">
      </span>
      <button class="choice-btn" data-choice-index="${index}" data-choice-type="${choice.choiceType ?? ''}" data-primary-delta="${choice.primaryDelta ?? ''}"${isExplored ? ' data-explored="true"' : ''}>
        <span class="choice-text">${choice.text}</span>
      </button>
      ${isExplored ? '<span class="explored-marker" title="Previously explored">&#8617;</span>' : ''}
    </div>`;
    })
    .join('');

  const customChoiceHtml = hasCustomChoiceInput
    ? `
    <div class="suggested-protagonist-speech-container">
      <label for="suggested-protagonist-speech-input" class="suggested-protagonist-speech-label">
        Optional: Suggested protagonist speech
      </label>
      <input type="text" id="suggested-protagonist-speech-input" class="suggested-protagonist-speech-input"
             placeholder="Something your protagonist might say..." maxlength="500" />
    </div>
    <div class="custom-choice-container">
      <input type="text" class="custom-choice-input" placeholder="Introduce your own custom choice..." maxlength="500" />
      <button type="button" class="custom-choice-btn">Add</button>
    </div>
    <div class="custom-choice-enums">
      <select class="custom-choice-type">
        <option value="TACTICAL_APPROACH">Method/Tactic</option>
        <option value="MORAL_DILEMMA">Moral Choice</option>
      </select>
      <select class="custom-choice-delta">
        <option value="LOCATION_CHANGE">Location</option>
        <option value="GOAL_SHIFT">Goal</option>
      </select>
    </div>
    <div class="alert alert-error play-error" id="play-error" style="display: none;" role="alert" aria-live="polite"></div>
  `
    : '';

  const choicesSectionHtml = isEnding
    ? `<div class="ending-banner">
        <h3>THE END</h3>
        <div class="ending-actions">
          <a href="/play/${storyId}/restart" class="btn btn-primary">Play Again</a>
          <a href="/" class="btn btn-secondary">Back to Stories</a>
        </div>
      </div>`
    : `<section class="choices-section" id="choices-section">
        <h3>What do you do?</h3>
        <div class="choices" id="choices">${choiceButtonsHtml}</div>
        ${customChoiceHtml}
      </section>`;

  return `
    <main>
      <div class="play-container" data-story-id="${storyId}" data-page-id="${pageId}">
        <div class="play-layout">
          <div class="left-sidebar-widgets" id="left-sidebar-widgets"></div>
          <div class="play-content">
            <div class="story-header">
              <div class="story-title-section">
                <h2>Test Story</h2>
                ${actDisplayInfo ? `<span class="act-indicator">${actDisplayInfo.displayString}</span>` : ''}
              </div>
              <span class="page-indicator">Page ${pageId}</span>
            </div>
            <article class="narrative" id="narrative">
              <div class="narrative-text">${narrativeText}</div>
            </article>
            ${stateChangesHtml}
            ${choicesSectionHtml}
          </div>
          ${sidebarHtml}
        </div>
        <div class="loading-overlay" id="loading" style="display: none;">
          <div class="loading-stage" aria-live="polite"></div>
          <div class="loading-spinner"></div>
          <p class="loading-status">Crafting your story...</p>
        </div>
        <div class="modal" id="api-key-modal" style="display: none;">
          <div class="modal-content">
            <h3>Enter OpenRouter API Key</h3>
            <form id="api-key-form" class="api-key-form">
              <input type="password" id="modal-api-key" placeholder="sk-or-..." autocomplete="off">
              <div class="modal-actions">
                <button class="btn btn-primary" id="save-api-key" type="submit">Continue</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  `;
}

export interface NewStoryPageOptions {
  error?: string;
  npcs?: Array<{ name: string; description: string }>;
}

export function buildNewStoryPageHtml(options: NewStoryPageOptions = {}): string {
  const npcs = options.npcs ?? [];
  const errorHtml = options.error ? `<div class="alert alert-error">${options.error}</div>` : '';

  const npcEntriesHtml = npcs
    .map(
      (npc, i) => `
    <div class="npc-entry" data-index="${i}">
      <div class="npc-entry-header">
        <strong>${npc.name}</strong>
        <button type="button" class="btn btn-small btn-danger npc-remove-btn">&times;</button>
      </div>
      <p class="npc-entry-description">${npc.description}</p>
    </div>
  `
    )
    .join('');

  return `
    <main class="container">
      <section class="form-section">
        <h1>Begin a New Adventure</h1>
        ${errorHtml}
        <form action="/stories/create" method="POST" class="story-form">
          <div class="form-group">
            <label for="title">Story Title *</label>
            <input type="text" id="title" name="title" required value="">
          </div>
          <div class="form-group">
            <label for="characterConcept">Character Concept *</label>
            <textarea id="characterConcept" name="characterConcept" rows="4" required></textarea>
          </div>
          <div class="form-group">
            <label for="worldbuilding">Worldbuilding</label>
            <textarea id="worldbuilding" name="worldbuilding" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>NPCs (Optional)</label>
            <div id="npc-entries">${npcEntriesHtml}</div>
            <div class="npc-add-form">
              <input type="text" id="npc-name-input" placeholder="NPC name" maxlength="100">
              <textarea id="npc-desc-input" rows="2" placeholder="Describe this character"></textarea>
              <button type="button" id="npc-add-btn" class="btn btn-secondary btn-small">Add NPC</button>
            </div>
          </div>
          <div class="form-group">
            <label for="startingSituation">Starting Situation</label>
            <textarea id="startingSituation" name="startingSituation" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label for="tone">Tone/Genre</label>
            <input type="text" id="tone" name="tone" value="">
          </div>
          <div class="form-group">
            <label for="apiKey">OpenRouter API Key *</label>
            <input type="password" id="apiKey" name="apiKey" required placeholder="sk-or-..." autocomplete="off">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-large">Begin Adventure</button>
          </div>
        </form>
      </section>
      <div class="loading-overlay" id="loading" style="display: none;">
        <div class="loading-stage" aria-live="polite"></div>
        <div class="loading-spinner"></div>
        <p class="loading-status">Creating your adventure...</p>
      </div>
    </main>
  `;
}
