# CHACHASYS-019: Make relationship snapshots a first-class per-turn timeline

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — chat pipeline, state-updater contract, chat models, persistence, server bootstrap/UI data flow
**Deps**: [archive/tickets/CHATUIFIX-003-chat-bible-gauge-values.completed.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHATUIFIX-003-chat-bible-gauge-values.completed.md), [archive/tickets/CHATCOMMIT-001-atomically-persist-chat-turn-results.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHATCOMMIT-001-atomically-persist-chat-turn-results.md)

## Problem

The chat UI currently shows current valence/tension from `chatBible.relationshipNow` but still builds historical relationship graphics from delta-derived `relationshipState`. The recent UI fix rebases delta history onto the latest absolute values, which is a reasonable bugfix, but it is not the clean long-term architecture.

The deeper problem is that the system has no canonical persisted relationship timeline. Historical relationship state is inferred from `relationshipState` deltas, while current displayed state is sourced from `chatBible.relationshipNow`. That is two different sources of truth for one domain concept.

Worse, the current `chatBible` is not refreshed every turn. Persisting opportunistic `chatBible.relationshipNow` snapshots as-is would still produce stale history. If we want honest historical charts and a stable relationship UI contract, the app needs an explicit per-turn relationship snapshot that is generated every character turn and persisted on the turn itself.

## Assumption Reassessment (2026-03-28)

1. `src/llm/chat/chat-pipeline.ts:64-75` refreshes the full `chatBible` only when the session resumes, when no bible exists yet, every tenth turn, or when the prior character turn requested a refresh. Confirmed.
2. `src/models/chat/chat-turn.ts` has no field for a persisted post-turn relationship snapshot. Confirmed.
3. `src/models/chat/chat-relationship-history.ts:31-61` builds `relationshipHistory` exclusively from accumulated `relationshipState` deltas starting from zero. Confirmed.
4. `src/server/routes/chat.ts:58-63` sends that delta-derived history to the client bootstrap, and `public/js/src/20b-chat-sidebar.js:280-320` now rebases it against the latest `chatBible.relationshipNow`. Confirmed.
5. Because the full `chatBible` is intentionally stale on many turns, "store historical `chatBible.relationshipNow`" would not be sufficient. Corrected scope: introduce an always-produced per-turn relationship snapshot contract instead of depending on opportunistic bible refreshes.
6. `src/persistence/chat-repository.ts` already persists chats as a single aggregate `state.json`, so adding canonical turn-level snapshot data fits the current persistence architecture cleanly. Confirmed.
7. `src/llm/chat/chat-state-updater-generation.ts` and `src/llm/schemas/chat-state-updater-schema.ts` already own post-turn state extraction. Corrected architecture: extend the existing updater response contract to emit the canonical post-turn relationship snapshot instead of adding a second LLM stage with overlapping responsibility.
8. `public/js/src/20-chat-controller.js:333-336` currently updates the sidebar after a send-turn response using only `updatedSession`. Corrected scope: live client updates must also incorporate the newly committed character turn snapshot, otherwise the canonical timeline would only be used on initial page load.

## Architecture Check

1. A first-class per-turn relationship snapshot is cleaner than the current mixed model because one contract becomes responsible for both current display and historical display.
2. The snapshot belongs on the committed character turn, not on the session:
   - it is historical by nature
   - it travels with the turn it describes
   - it avoids introducing another session-level cache that can drift from the transcript
3. The UI should ultimately stop treating `chatBible.relationshipNow` as the canonical relationship-display source. `chatBible` can remain a prompt/runtime object, but relationship visualization should use the persisted snapshot timeline.
4. The snapshot must be produced every character turn, not only when the full `chatBible` refreshes. Otherwise we would just persist stale data under a more official name.
5. The existing chat state-updater stage is the right owner for this snapshot because it already judges post-turn state from the written turn. Adding a separate relationship-curation stage would create duplicated authority and another LLM round-trip for the same domain.
6. No backwards-compatibility aliasing or dual-source rendering should remain after the cutover. Once snapshots exist, replace the rebased-history UI path rather than keeping it as a permanent parallel architecture.

## What to Change

### 1. Add a canonical relationship snapshot model on character turns

Introduce a dedicated turn-level snapshot contract, preferably a full post-turn relationship snapshot rather than valence/tension-only fields.

Preferred shape:

- reuse a dedicated type derived from `ChatBibleRelationshipNow`
- persist it on character turns only
- treat it as "relationship state after this character turn completed"

Minimum fields:

- `dynamic`
- `valence`
- `tension`
- `leverage`
- `whatCharacterBelievesAboutInterlocutor`

If naming is reconsidered, prefer something explicit like `relationshipSnapshot` or `postTurnRelationship`.

### 2. Generate a relationship snapshot every character turn

Extend the existing chat state-updater stage so a fresh relationship snapshot is produced for every successful character turn, independent of whether the full `chatBible` refreshes.

Requirements:

- do not rely on `chatBible` refresh cadence
- do not infer the full snapshot from delta accumulation alone
- keep the snapshot aligned with the post-turn conversation state
- preserve the existing `chatBible` refresh cadence unless this ticket explicitly replaces it

Preferred implementation:

- extend the existing updater response contract to return:
  - the existing delta-oriented `stateUpdate`
  - one absolute `relationshipSnapshot`
- attach the returned snapshot to the committed character turn in the chat pipeline
- do not persist the same snapshot twice inside both the turn root and `stateUpdate`

### 3. Persist and validate the snapshot as part of the chat aggregate

Update runtime validation, repository round-tripping, and representative fixtures so persisted character turns can carry the new snapshot contract.

Requirements:

- runtime validators reject malformed snapshot payloads
- repository round-trip preserves snapshots with no lossy projection
- transcript ordering semantics remain unchanged

### 4. Replace UI relationship history/bootstrap with the canonical snapshot timeline

Update server bootstrap assembly and client sidebar rendering to derive relationship graphics from the persisted snapshot timeline instead of delta-derived `relationshipHistory`.

Requirements:

- current displayed relationship metrics come from the latest snapshot when present
- historical graphics come from prior snapshots in order
- delta badges may still use computed turn-over-turn differences, but those differences should be derived from adjacent snapshots, not from `relationshipState`
- remove the long-term rebasing path introduced in `CHATUIFIX-003`
- cover both initial page bootstrap and live post-send sidebar updates

### 5. Reassess `relationshipState` ownership after snapshot cutover

Do not delete `relationshipState` blindly, but explicitly decide and document its remaining role after snapshots become canonical.

Possible acceptable outcomes:

- keep it as prompt/pipeline state only, not UI history
- keep it as deterministic delta accumulator for prompts, while snapshots own display/history

This ticket should make that ownership explicit so the app is not left with ambiguous overlapping contracts.

Decision for this ticket:

- keep `relationshipState` as the session-level prompt/runtime state that the pipeline mutates each turn
- keep the new turn-level `relationshipSnapshot` as the canonical UI/history contract
- require the two to agree on numeric/dynamic/leverage state after a successful character turn

### 6. Document the canonical relationship-display contract

Add or update a chat-system design/spec document that states:

- what the canonical relationship snapshot contract is
- why it lives on character turns
- what `relationshipState` still owns
- what the UI is allowed to read

## Files to Touch

- `tickets/CHACHASYS-019-relationship-snapshot-timeline.md` (new)
- `src/models/chat/chat-turn.ts` (modify)
- `src/models/chat/chat-validation.ts` (modify)
- `src/models/chat/index.ts` (modify, if new type exports are added)
- `src/llm/chat/chat-pipeline.ts` (modify)
- `src/llm/chat/chat-state-updater-generation.ts` (modify)
- `src/llm/schemas/chat-state-updater-schema.ts` (modify)
- `src/llm/prompts/chat/chat-state-updater-prompt.ts` (modify)
- `prompts/chat-state-updater-prompt.md` (modify)
- `src/persistence/chat-repository.ts` (modify)
- `src/server/routes/chat.ts` (modify)
- `src/server/views/pages/chat.ejs` (modify)
- `public/js/src/20-chat-controller.js` (modify)
- `public/js/src/20b-chat-sidebar.js` (modify)
- `public/js/app.js` (regenerated)
- `test/unit/llm/chat/chat-pipeline.test.ts` (modify)
- `test/unit/models/chat/chat-models.test.ts` (modify)
- `test/unit/llm/schemas/chat-state-updater-schema.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts` (modify)
- `test/unit/persistence/chat-repository.test.ts` (modify)
- `test/unit/server/routes/chat.test.ts` (modify)
- `test/unit/server/views/chat.test.ts` (modify)
- `test/unit/client/chat-page/controller.test.ts` (modify)
- `specs/character-chat-relationship-timeline.md` (new)

## Out of Scope

- Refreshing every other chat-bible section on every turn unless a direct architectural conflict forces it
- Redesigning the whole chat prompt pipeline
- Broad UI visual polish beyond consuming the new canonical timeline
- Migration shims or legacy dual-read logic for old persisted snapshots

## Acceptance Criteria

### Tests That Must Pass

1. Every persisted character turn includes a validated post-turn relationship snapshot.
2. The server bootstrap and client relationship UI build current and historical relationship visuals from the snapshot timeline, not from rebased delta history.
3. Turn-over-turn deltas shown in the UI are derived from adjacent snapshots.
4. Sessions whose full `chatBible` was not refreshed on a turn still receive a fresh relationship snapshot for that turn.
5. Live sidebar updates after `POST /chat/:id/turn` append the committed character turn snapshot rather than synthesizing history from session-level state.
5. Existing suite: `npm test`

### Invariants

1. Relationship display/history has one canonical persisted source of truth: the per-turn relationship snapshot timeline.
2. A snapshot describes post-turn relationship state for the character turn it is attached to.
3. UI history must not depend on rebasing `relationshipState` deltas once the cutover is complete.
4. No backwards-compatibility alias fields or permanent dual-source rendering paths are introduced.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/chat/chat-pipeline.test.ts` — verify a fresh relationship snapshot is attached to every generated character turn, even when the full `chatBible` was reused.
2. `test/unit/models/chat/chat-models.test.ts` — verify runtime validation accepts valid snapshot-bearing turns and rejects malformed snapshot payloads.
3. `test/unit/llm/schemas/chat-state-updater-schema.test.ts` — verify the state-updater schema now requires the absolute post-turn relationship snapshot.
4. `test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts` — verify the prompt contract documents/emits the snapshot responsibility alongside delta extraction.
5. `test/unit/persistence/chat-repository.test.ts` — verify chat aggregate persistence round-trips snapshot-bearing character turns without loss.
6. `test/unit/server/routes/chat.test.ts` — verify route bootstrap exposes canonical snapshot history instead of delta-derived relationship history.
7. `test/unit/server/views/chat.test.ts` — verify initial relationship rendering uses the latest snapshot contract.
8. `test/unit/client/chat-page/controller.test.ts` — verify current values, deltas, ghost markers, sparklines, and live updates are all derived from the snapshot timeline.

### Commands

1. `npm run test:unit -- --coverage=false --runInBand test/unit/llm/chat/chat-pipeline.test.ts test/unit/models/chat/chat-models.test.ts test/unit/llm/schemas/chat-state-updater-schema.test.ts test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts test/unit/persistence/chat-repository.test.ts test/unit/server/routes/chat.test.ts test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. `npm test`

## Outcome

- Completed: 2026-03-28
- Actual implementation:
  - added a canonical `relationshipSnapshot` contract on persisted character turns
  - extended the chat state-updater response to return both delta-oriented `stateUpdate` data and an absolute post-turn relationship snapshot
  - cut server bootstrap, SSR rendering, and live client updates over to a canonical persisted `relationshipTimeline`
  - kept session-level `relationshipState` as runtime/prompt state, but now force it to agree with the latest snapshot after each successful character turn
  - documented the relationship-display contract in `specs/character-chat-relationship-timeline.md`
- Deviations from original plan:
  - did not add a second relationship-only LLM stage; the existing state-updater stage was extended instead
  - did not duplicate the canonical snapshot inside `stateUpdate`; the snapshot is persisted once on the character turn and returned separately by the updater response
- Verification:
  - targeted relationship/chat unit coverage passed
  - `npm run lint` passed
  - `npm run typecheck` passed
  - `npm run build` passed
  - `npm test` passed
