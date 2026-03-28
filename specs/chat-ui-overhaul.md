# Chat UI Visual Overhaul

**Status**: ACTIVE
**Goal**: Transform the chat page from a long vertical scroll into a modern chat-app layout with full transparency into the character's psychology, scene state, and conversation dynamics.

## Problem

The current `/chat/:chatId` page has two critical issues:

1. **Layout**: The message input ("Send Turn") sits at the bottom of a long page, separated from the conversation by the Scene State section. Users must scroll past all state info to type their next message.
2. **Wasted data**: The JSON data contains extremely rich character psychology (`plannerOutput`, `turnMeta`, `stateUpdate`), knowledge tracking (`knowledgeState`), and scene intelligence (`chatBible`) that is not rendered at all.

## Design Decisions

- **Layout**: Chat-app style (full-viewport, conversation scrolls, input pinned at bottom, collapsible sidebar)
- **Psychology transparency**: Full — expose all planner internals, subtext, suppressed emotions, honesty mode
- **Turn detail display**: Inline expandable — tags visible, click to expand full inner world
- **Sidebar organization**: Collapsible accordion sections
- **Relationship visualization**: Visual gauges + sparklines showing trends over turns

---

## 1. Layout Architecture

Replace the current vertical-scroll page with a **full-viewport CSS grid layout** (`height: 100vh`, `overflow: hidden` on body).

Three zones:

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER BAR                                                  │
├────────────────────────────────────┬─────────────────────────┤
│  CONVERSATION PANE (scrollable)    │  SIDEBAR (collapsible)  │
├────────────────────────────────────┴─────────────────────────┤
│  INPUT BAR (pinned)                                          │
└──────────────────────────────────────────────────────────────┘
```

### Header Bar
- Character names prominently displayed (target + interlocutor)
- Turn count badge
- Quick scene indicators: time-of-day icon, privacy badge, distance-band badge
- Sidebar toggle button (collapses/expands the right panel)

### Conversation Pane
- Fixed-height scrollable area (`overflow-y: auto`)
- Auto-scrolls to bottom on new turns
- Contains all rendered turns

### Sidebar
- Collapsible via header toggle button
- When collapsed, conversation pane takes full width
- Contains accordion sections (see Section 3)
- Independently scrollable

### Input Bar
- Pinned at absolute bottom, always visible
- Spans full width below both conversation pane and sidebar
- Contains: API key icon button + message textarea + Send button

---

## 2. Turn Rendering

### User Turns
- Distinct visual style: slightly different background shade from character turns
- Shows interlocutor name, turn number, timestamp
- Renders blocks (ACTION as italic, SPEECH as quoted text with delivery qualifiers)
- No expandable panel (user turns have no psychology data)

### Character Turns

Each character turn renders with:

**A. Message content** — same block rendering as today (ACTION italic, SPEECH quoted with delivery qualifiers) but with improved styling:
- Action blocks: italic text with a subtle colored left-border accent
- Speech blocks: delivery qualifiers as small-caps muted text above the quoted speech
- Delivery qualifiers already exist in the data (`block.delivery` field)

**B. Tag bar** — a row of small pill-shaped badges below the message content:
- `speechAct` (e.g., DEFLECT, PROBE, REVEAL) — from `plannerOutput.speechAct`
- `honestyMode` (e.g., EVASIVE, FULL, DECEPTIVE) — from `plannerOutput.honestyMode`
- `visibleEmotion` — from `turnMeta.visibleEmotion`
- Each badge has a muted color appropriate to the dark theme

**C. Expandable "Character's Inner World" panel** — collapsed by default, click to expand. Contains these sub-sections:

#### Internal Self-Check
From `plannerOutput.internalSelfCheck`:
- **What I want**: `whatDoIWant`
- **What I know**: `whatDoIKnow`
- **What I'm hiding**: `whatAmIHiding`
- **How honest am I**: `howHonestAmI`

#### Emotional Layer
- **Surface emotion**: `plannerOutput.surfaceEmotion`
- **Suppressed emotion**: `plannerOutput.suppressedEmotion` (shown side-by-side with surface)
- **Subtext**: `plannerOutput.subtext`

#### Response Strategy
- **Response goal**: `plannerOutput.responseGoal`
- **Must address**: `plannerOutput.mustAddress` (bulleted list)
- **Must avoid**: `plannerOutput.mustAvoid` (bulleted list)
- **Target length**: `plannerOutput.targetLength`

#### Action Plan
- `plannerOutput.actionPlan` rendered as a list with `kind` labels (GESTURE, POSTURE_SHIFT, etc.)
- `changesPhysicalState` indicated with a small icon

#### Turn Impact
From `turnMeta`:
- **Final pressure**: `turnMeta.finalPressure`
- **Expects reply**: `turnMeta.expectsReply` (badge)
- **Ends with question**: `turnMeta.endsWithQuestion` (badge)

From `plannerOutput.expectedImpact`:
- Relationship delta hint, tension delta hint, reveals secret

#### State Changes
From `stateUpdate`:
- **Summary**: `stateUpdate.summaryDelta`
- **Relationship shifts**: each shift's description and suggested deltas
- **Knowledge changes**: new facts, new suspicions, corrected false beliefs, secrets revealed
- **Conversation update**: commitments, threats, questions opened/resolved
- **Physical changes**: location changes, distance band changes, object state changes

---

## 3. Sidebar — Accordion Sections

Six collapsible sections. Each shows a **compact summary line when collapsed** and full detail when expanded. Sections update dynamically after each turn via the existing `data-chat-field` attribute pattern.

### 3.1 Physical Context
**Collapsed**: `Location icon + micro-location + time + distance badge`

**Expanded**:
- Location (full text)
- Micro-location
- Time of day (with icon)
- Privacy level (badge)
- Distance band (badge)
- Character activity (text)
- Interactable objects (pill tags)
- Ambient conditions (bulleted list)

Source: `session.physicalContext`

### 3.2 Relationship
**Collapsed**: Mini valence/tension bars inline

**Expanded**:
- **Valence gauge**: Horizontal gradient bar, red (-5) through neutral gray (0) to green (+5). Current value shown as a marker on the bar plus numeric label. Delta arrow from last turn (e.g., +0.5)
- **Tension gauge**: Same treatment, cool blue (0) to hot red (10)
- **Sparklines**: Tiny SVG/CSS line charts showing valence and tension values over the last N turns. Computed from turn history (`stateUpdate.relationshipShifts` in each turn)
- **Dynamic**: `relationshipState.dynamic` text
- **Leverage**: `relationshipState.leverage` text

Source: `session.relationshipState` + historical data from `turns[].stateUpdate.relationshipShifts`

### 3.3 Knowledge State
**Collapsed**: `fact-count facts, suspicion-count suspicions`

**Expanded**:
- Known facts (bulleted list)
- Suspicions (bulleted, italic/distinct styling)
- False beliefs (bulleted, warning-colored when present)
- Secrets revealed (bulleted, when present)

Source: `session.knowledgeState`

### 3.4 Character Mind
**Collapsed**: `Objective text (truncated)`

**Expanded**:
- Current objective (`chatBible.characterNow.currentObjective`)
- Immediate need from conversation (`chatBible.characterNow.immediateNeedFromConversation`)
- Emotional state (`chatBible.characterNow.emotionalState`)
- Willingness to engage (badge: `chatBible.characterNow.willingnessToEngage`)
- Topics to advance (list)
- Topics to protect (list, with lock icons)
- What character believes about interlocutor (list: `chatBible.relationshipNow.whatCharacterBelievesAboutInterlocutor`)
- Secrets kept (list: `chatBible.knowledgeNow.secretsKept`)
- Knowledge boundaries (list: `chatBible.knowledgeNow.knowledgeBoundaries`)

Source: `session.chatBible`

### 3.5 Conversation
**Collapsed**: `thread-count threads, commitment-count commitments`

**Expanded**:
- Active threads (list: `chatBible.conversationNow.activeThreads`)
- Commitments (list: `chatBible.conversationNow.commitments`)
- Sensitive topics (list: `chatBible.conversationNow.sensitiveTopics`)
- Last turn pressure (text: `chatBible.conversationNow.lastTurnPressure`)
- Rolling summary (text, when available: `chatBible.conversationNow.rollingSummary`)

Source: `session.chatBible.conversationNow`

### 3.6 Guardrails & Constraints
**Collapsed**: `guardrail-count guardrails, constraint-count constraints`

**Expanded**:
- Continuity guardrails (bulleted list: `chatBible.continuityGuardrails`)
- Response constraints (bulleted list: `chatBible.responseConstraints`)

Source: `session.chatBible`

---

## 4. Input Bar

Replace the current full "Send Turn" form section with a **compact input bar** pinned at the bottom.

### API Key
- Small lock icon button at the left of the input bar
- Clicking opens a popover/dropdown with the password input and "Stored client-side" help text
- Once set, the lock icon shows as "locked" (filled) state
- No longer a visible form field taking up vertical space

### Message Textarea
- Auto-growing textarea: starts at 1 line, grows up to ~4 lines, then scrolls internally
- Placeholder: `Use *asterisks* for actions and plain text for speech.`
- Max 2000 characters (existing constraint)
- Enter to send, Shift+Enter for newline (already implemented in `20-chat-controller.js`)

### Send Button
- Compact button to the right of the textarea
- Disabled when textarea is empty or API key is not set
- During loading: button shows spinner, textarea becomes read-only
- Progress status text appears inline next to the button or below the input bar

---

## 5. Data Requirements

### Server-side changes

The EJS template and the `/chat/:chatId/turn` POST response need to expose additional data:

**Already available in state.json but not rendered in template:**
- `session.chatBible` — full chat bible (needs to be passed to EJS template)
- `session.knowledgeState` — already partially rendered but missing details
- `turn.turnMeta` — already in turn data, not rendered
- `turn.plannerOutput` — already in turn data, not rendered
- `turn.stateUpdate` — already in turn data, not rendered

**Needs computation:**
- Historical valence/tension values for sparklines: extract from `turns[].stateUpdate.relationshipShifts` to build an array of `[turnNumber, valence, tension]` tuples

### Route handler changes
- `GET /chat/:chatId` — pass `chatBible`, `knowledgeState`, and sparkline data to the template
- `POST /chat/:chatId/turn` — already returns `updatedSession` and `characterTurn` with full data; may need to also return updated `chatBible` if it was refreshed (`shouldRefreshChatBible`)

### Client-side changes
- `20-chat-controller.js` — major rewrite for new layout, turn rendering with expandable panels, sidebar accordion updates, sparkline rendering, API key popover
- New CSS classes for chat-specific layout (currently reuses `story-card` classes)

---

## 6. Files to Modify

| File | Change |
|------|--------|
| `src/server/views/pages/chat.ejs` | Complete rewrite — new layout structure |
| `public/js/src/20-chat-controller.js` | Major rewrite — new rendering, accordion, expandable turns, sparklines, API key popover |
| `public/css/styles.css` | Add chat-specific CSS classes for the new layout |
| `src/server/routes/chat.ts` | Pass additional data (`chatBible`, sparkline history) to template |
| `scripts/concat-client-js.js` | No change needed (new JS files auto-concatenated) |

New files may be needed if the client JS grows too large:
- `public/js/src/20a-chat-turn-renderer.js` — turn rendering with expandable panels
- `public/js/src/20b-chat-sidebar.js` — accordion sidebar logic
- `public/js/src/20c-chat-sparkline.js` — SVG sparkline rendering

---

## 7. Verification Plan

1. **Visual check**: Load `/chat/:chatId` — page should fill viewport, no page-level scrolling
2. **Input proximity**: Last message and message input should be visible simultaneously without scrolling
3. **Turn expansion**: Click "Character's Inner World" on a character turn — all psychology data renders correctly
4. **Sidebar accordion**: Each section collapses/expands, shows correct summary when collapsed
5. **Sparklines**: Valence and tension mini-charts render with correct data points from turn history
6. **Sidebar toggle**: Clicking toggle collapses sidebar, conversation pane fills width
7. **API key popover**: Lock icon opens popover, key persists in session storage, lock icon updates state
8. **Send turn**: Message sends, both turns append, sidebar updates, conversation auto-scrolls to bottom
9. **Existing tests**: `npm test` passes — no regressions in chat service, routes, or validation
10. **Client tests**: `npm run test:client` passes after regenerating `app.js`
