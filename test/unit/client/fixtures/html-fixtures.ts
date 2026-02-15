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
  trackedPromises?: Array<{ id: string; text: string; promiseType: string; age: number }>;
  trackedPromisesOverflowSummary?: string;
  actDisplayInfo?: { displayString: string } | null;
  stateChanges?: string[];
  hasCustomChoiceInput?: boolean;
  analystResult?: Record<string, unknown> | null;
  sceneSummary?: string | null;
  recapSummaries?: Array<{ pageId: number; summary: string }>;
  resolvedThreadMeta?: Record<string, { threadType: string; urgency: string }>;
  resolvedPromiseMeta?: Record<string, { promiseType: string; urgency: string }>;
  worldFacts?: string[];
  characterCanon?: Record<string, string[]>;
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
  const trackedPromises = options.trackedPromises ?? [];
  const actDisplayInfo = options.actDisplayInfo ?? null;
  const stateChanges = options.stateChanges ?? [];
  const hasCustomChoiceInput = options.hasCustomChoiceInput ?? true;
  const analystResult = options.analystResult ?? null;
  const sceneSummary = options.sceneSummary ?? null;
  const recapSummaries = options.recapSummaries ?? [];
  const worldFacts = options.worldFacts ?? [];
  const characterCanon = options.characterCanon ?? {};
  const loreFactCount =
    worldFacts.length +
    Object.values(characterCanon).reduce((sum, facts) => sum + (Array.isArray(facts) ? facts.length : 0), 0);

  const threadsHtml =
    openThreads.length > 0
      ? `<aside class="open-threads-panel" id="open-threads-panel" aria-labelledby="open-threads-title">
        <h3 class="open-threads-title" id="open-threads-title">Active Threads</h3>
        <ul class="open-threads-list" id="open-threads-list">
          ${openThreads
            .map(
              (t) => `<li class="open-threads-item">
            <span class="thread-icon-pill" aria-hidden="true">
              <span class="thread-icon-badge"></span>
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

  const trackedPromisesHtml =
    trackedPromises.length > 0
      ? `<aside class="tracked-promises-panel" id="tracked-promises-panel" aria-labelledby="tracked-promises-title">
        <h3 class="tracked-promises-title" id="tracked-promises-title">Tracked Promises</h3>
        <ul class="tracked-promises-list" id="tracked-promises-list">
          ${trackedPromises.map((p) => `<li class="tracked-promises-item"><span class="promise-type-text-badge">${p.promiseType}</span><span class="promise-age-badge">${p.age} pg</span><span>${p.text}</span></li>`).join('')}
        </ul>
        ${options.trackedPromisesOverflowSummary ? `<div class="keyed-entry-overflow-summary" id="tracked-promises-overflow">${options.trackedPromisesOverflowSummary}</div>` : ''}
      </aside>`
      : '';

  const sidebarHtml = `<div class="sidebar-widgets" id="sidebar-widgets">${threadsHtml}${threatsHtml}${constraintsHtml}${trackedPromisesHtml}</div>`;

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
    <details class="protagonist-guidance">
      <summary class="protagonist-guidance__summary">Guide Your Protagonist</summary>
      <div class="protagonist-guidance__fields">
        <div class="protagonist-guidance__field">
          <label class="protagonist-guidance__label" for="guidance-emotions">Emotions</label>
          <textarea
            id="guidance-emotions"
            class="protagonist-guidance__textarea"
            name="suggestedEmotions"
            placeholder="e.g. Furious but hiding it behind a thin smile..."
            maxlength="500"
            rows="2"
          ></textarea>
        </div>
        <div class="protagonist-guidance__field">
          <label class="protagonist-guidance__label" for="guidance-thoughts">Thoughts</label>
          <textarea
            id="guidance-thoughts"
            class="protagonist-guidance__textarea"
            name="suggestedThoughts"
            placeholder="e.g. Wondering if the stranger recognized them..."
            maxlength="500"
            rows="2"
          ></textarea>
        </div>
        <div class="protagonist-guidance__field">
          <label class="protagonist-guidance__label" for="guidance-speech">Speech</label>
          <textarea
            id="guidance-speech"
            class="protagonist-guidance__textarea"
            name="suggestedSpeech"
            placeholder="e.g. 'Wake up, Alicia! We don't have much time.'"
            maxlength="500"
            rows="2"
          ></textarea>
        </div>
      </div>
    </details>
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

  const insightsButtonHtml = analystResult
    ? `<button type="button" class="insights-btn" id="insights-btn" aria-haspopup="dialog" aria-controls="insights-modal">
         <span class="insights-btn__icon" aria-hidden="true">🔍</span>
         <span class="insights-btn__label">Story Insights</span>
       </button>`
    : '';

  return `
    <main>
      <div class="play-container" data-story-id="${storyId}" data-page-id="${pageId}">
        <div class="play-layout">
          <div class="left-sidebar-widgets" id="left-sidebar-widgets">
            <button type="button" class="lore-trigger-btn" id="lore-trigger-btn" aria-haspopup="dialog" aria-controls="lore-modal">
              Story Lore
              <span class="lore-count-badge" id="lore-count-badge">(${loreFactCount})</span>
            </button>
          </div>
          <div class="play-content">
            <div class="story-header" id="story-header">
              <div class="story-title-section">
                <h2>Test Story</h2>
                ${actDisplayInfo ? `<span class="act-indicator">${actDisplayInfo.displayString}</span>` : ''}
              </div>
              <div class="story-header-actions" id="story-header-actions">
                <button type="button" class="recap-btn" id="recap-btn" aria-haspopup="dialog" aria-controls="recap-modal">
                  <span class="recap-btn__icon" aria-hidden="true">&#x1f4dc;</span>
                  <span class="recap-btn__label">Story So Far</span>
                </button>
                ${insightsButtonHtml}
                <span class="page-indicator">Page ${pageId}</span>
              </div>
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
        <div class="modal insights-modal" id="insights-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="insights-modal-title">
          <div class="modal-content insights-modal-content">
            <div class="insights-header">
              <h3 id="insights-modal-title">Story Insights</h3>
              <button type="button" class="insights-close-btn" id="insights-close-btn" aria-label="Close Story Insights">&times;</button>
            </div>
            <div class="insights-body" id="insights-modal-body"></div>
          </div>
        </div>
        <div class="modal recap-modal" id="recap-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="recap-modal-title">
          <div class="modal-content recap-modal-content">
            <div class="recap-header">
              <h3 id="recap-modal-title">The Story So Far</h3>
              <button type="button" class="recap-close-btn" id="recap-close-btn" aria-label="Close Story Recap">&times;</button>
            </div>
            <div class="recap-body" id="recap-modal-body"></div>
          </div>
        </div>
        <div class="modal lore-modal" id="lore-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="lore-modal-title">
          <div class="modal-content lore-modal-content">
            <div class="lore-header">
              <h3 id="lore-modal-title">Story Lore</h3>
              <button type="button" class="lore-close-btn" id="lore-close-btn" aria-label="Close Story Lore">&times;</button>
            </div>
            <div class="lore-tabs" role="tablist">
              <button class="lore-tab lore-tab--active" role="tab" aria-selected="true" data-tab="world" id="lore-tab-world" aria-controls="lore-panel-world">World</button>
              <button class="lore-tab" role="tab" aria-selected="false" data-tab="characters" id="lore-tab-characters" aria-controls="lore-panel-characters">Characters</button>
            </div>
            <div class="lore-body" id="lore-modal-body">
              <div class="lore-tab-panel" id="lore-panel-world" role="tabpanel" aria-labelledby="lore-tab-world"></div>
              <div class="lore-tab-panel" id="lore-panel-characters" role="tabpanel" aria-labelledby="lore-tab-characters" style="display: none;"></div>
            </div>
          </div>
        </div>
      </div>
      <script type="application/json" id="analyst-data">${JSON.stringify(analystResult)}</script>
      <script type="application/json" id="insights-context">${JSON.stringify({ actDisplayInfo: actDisplayInfo ? actDisplayInfo.displayString : null, sceneSummary, resolvedThreadMeta: options.resolvedThreadMeta ?? {}, resolvedPromiseMeta: options.resolvedPromiseMeta ?? {} })}</script>
      <script type="application/json" id="recap-data">${JSON.stringify(recapSummaries)}</script>
      <script type="application/json" id="lore-data">${JSON.stringify({ worldFacts, characterCanon })}</script>
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
            <button type="button" id="generate-spine-btn" class="btn btn-primary btn-large">Generate Spine</button>
          </div>
        </form>
        <div id="spine-section" class="spine-section" style="display: none;">
          <h2 class="spine-section-title">Choose Your Story's Spine</h2>
          <div id="spine-options" class="spine-options-container"></div>
          <div class="spine-actions">
            <button type="button" id="regenerate-spines-btn" class="btn btn-secondary">Regenerate Options</button>
          </div>
        </div>
      </section>
      <div class="loading-overlay" id="loading" style="display: none;">
        <div class="loading-stage" aria-live="polite"></div>
        <div class="loading-spinner"></div>
        <p class="loading-status">Creating your adventure...</p>
      </div>
    </main>
  `;
}

export interface BriefingPageOptions {
  storyId?: string;
}

export function buildBriefingPageHtml(options: BriefingPageOptions = {}): string {
  const storyId = options.storyId ?? 'test-story-1';

  return `
    <main class="container">
      <div class="briefing-container" data-story-id="${storyId}">
        <section class="briefing-action">
          <button id="begin-adventure-btn" class="btn btn-primary btn-large">Begin Adventure</button>
          <div class="alert alert-error briefing-error" id="briefing-error" style="display: none;" role="alert" aria-live="polite"></div>
        </section>
      </div>
      <div class="loading-overlay" id="loading" style="display: none;">
        <div class="loading-stage" aria-live="polite"></div>
        <div class="loading-spinner"></div>
        <p class="loading-status">Preparing your first page...</p>
      </div>
      <div class="modal" id="api-key-modal" style="display: none;">
        <div class="modal-content">
          <h3>Enter OpenRouter API Key</h3>
          <form id="api-key-form" class="api-key-form">
            <input type="password" id="modal-api-key" placeholder="sk-or-..." autocomplete="off">
            <div class="modal-actions">
              <button class="btn btn-primary" id="save-api-key" type="submit">Continue</button>
              <button class="btn btn-secondary" id="cancel-api-key" type="button">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  `;
}
