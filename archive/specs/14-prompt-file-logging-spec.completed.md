# 14 - Prompt File Logging Spec

## Status
- ✅ COMPLETED

## Goal
Move all prompt logging from server terminal and browser console into append-only files under `logs/[month-day-year]/`.

This applies to prompts generated from `src/llm/prompts/*` and logged through current `logPrompt(...)` call sites.

## Current-State Audit
- Prompt logging entrypoint is `src/logging/prompt-formatter.ts` (`logPrompt`).
- Prompt logging call sites currently exist for:
1. `opening` (`src/llm/client.ts`)
2. `writer` (`src/llm/client.ts`)
3. `analyst` (`src/llm/client.ts`)
4. `planner` (`src/llm/client.ts`)
5. `structure` (`src/llm/structure-generator.ts`)
6. `structure-rewrite` (`src/engine/structure-rewriter.ts`)
- Logs currently flow through `logger` (`src/logging/logger.ts`) wrapped by `ConsoleLogger` (`src/logging/console-logger.ts`), so prompt summaries/details can appear in the Express terminal.
- Browser prompt logging is injected via:
1. `generateBrowserLogScript(...)` (`src/logging/browser-injector.ts`)
2. `POST /play/:storyId/choice` response field `logScript` (`src/server/routes/play.ts`)
3. `executeLogScript(...)` (`public/js/app.js`) which executes returned script text.
- `logging.level` exists in config but is not currently applied to the singleton logger during bootstrap/startup.

## Scope
- In scope:
1. Prompt logging transport and persistence.
2. Removal of prompt log output to terminal/browser.
3. Config updates needed for file-based prompt logging.
4. Tests and fixtures affected by logging-path changes.
- Out of scope:
1. General non-prompt application logging behavior (errors/info unrelated to prompt content).
2. Changing LLM prompt composition logic.

## 1) What Needs To Change / Be Implemented

### A. Add dedicated prompt file sink
Create a dedicated file-based prompt sink module in `src/logging/` (example: `prompt-file-sink.ts`) that:
1. Builds folder path as `logs/MM-DD-YYYY/` using local server date.
2. Ensures daily folder exists (`mkdir(..., { recursive: true })`).
3. Appends prompt entries to a daily file (recommended: JSONL format, e.g. `prompts.jsonl`).
4. Writes asynchronously and serializes appends to preserve order under concurrent requests.

Recommended line schema (JSON per line):
- `timestamp` (ISO string)
- `promptType`
- `messageCount`
- `messages` (array of `{ role, content }`)
- `meta` (optional context fields safe for logs)

### B. Route prompt logs to file sink only
Refactor `logPrompt(...)` in `src/logging/prompt-formatter.ts` so prompt content is not emitted through `logger.info/debug` anymore.
- `logPrompt(...)` should call the new prompt sink.
- Failures in file writing must not fail story generation; emit one safe warning/error without prompt content.

### C. Remove browser prompt log injection path
Remove prompt-log transport to browser:
1. Stop generating `logScript` in `src/server/routes/play.ts`.
2. Remove `generateBrowserLogScript` export/usage for runtime prompt flow.
3. Remove `executeLogScript(...)` and `data.logScript` handling in `public/js/app.js`.

### D. Prevent terminal prompt log output
Ensure prompt content never reaches terminal via `ConsoleLogger`.
- Prompt logging bypasses `ConsoleLogger` entirely (through dedicated file sink).

### E. Config updates
Extend `logging` schema in `src/config/schemas.ts` and `configs/default.json` with explicit prompt-file settings, for example:
- `logging.prompts.enabled` (default `true`)
- `logging.prompts.baseDir` (default `logs`)
- `logging.prompts.fileName` (default `prompts.jsonl`)
- `logging.prompts.dateFormat` fixed to month-day-year behavior (or implicit and documented)

Keep `promptPreviewLength` only if still used by prompt sink format; otherwise deprecate and remove with test/docs updates.

### F. Documentation updates (proposed, not part of this code change yet)
Because behavior changes materially, propose updating:
1. `CLAUDE.md` logging/data-flow notes.
2. `AGENTS.md` logging expectations if prompt observability workflow changes.

## 2) Invariants That Must Hold
1. Prompt content is never written to browser console by application code.
2. Prompt content is never written to server terminal by application code.
3. Every `logPrompt(...)` call appends exactly one entry to that day’s file.
4. File path format is `logs/MM-DD-YYYY/<file>` (folder per day; month/day/year ordering).
5. Daily folder is auto-created if missing.
6. Writes are append-only; existing prompt log lines are not overwritten.
7. Prompt logging failures do not break request handling or page generation.
8. All six active prompt types remain covered: `opening`, `writer`, `analyst`, `planner`, `structure`, `structure-rewrite`.
9. Non-prompt logs (errors/warnings unrelated to prompt content) retain existing behavior.

## 3) Tests That Need To Pass

### A. New/updated unit tests
1. `test/unit/logging/prompt-file-sink.test.ts`
- creates `logs/MM-DD-YYYY/` folder when absent.
- appends JSONL entries (no overwrite).
- preserves write ordering for concurrent calls.
- rotates to new folder on date change (with mocked clock).

2. `test/unit/logging/prompt-formatter.test.ts`
- verifies `logPrompt(...)` writes to file sink (not logger.info/debug for prompt body).
- verifies all prompt types invoke sink correctly.
- verifies sink failure is handled without throw.

3. Config tests (`test/unit/config/schemas.test.ts`, loader tests)
- validate new `logging.prompts.*` defaults and overrides.

### B. Updated server/client tests
1. `test/unit/server/routes/play.test.ts`
- no `logScript` field in `POST /:storyId/choice` success payload.

2. `test/integration/server/play-flow.test.ts`
- remove mocks/assertions tied to `generateBrowserLogScript` and logger entry draining for prompt display.

3. Front-end tests touching play flow (`test/unit/server/public/app.test.ts` as applicable)
- remove expectations around executing server-provided prompt scripts.

### C. Regression coverage for prompt completeness
Add one focused integration/unit assertion that each generation path still triggers `logPrompt(...)` once:
1. opening
2. writer
3. analyst
4. planner
5. structure
6. structure-rewrite

## Acceptance Criteria
1. Running story creation and continuation generates prompt log lines in `logs/MM-DD-YYYY/`.
2. No prompt payloads appear in Express terminal output.
3. No prompt payloads appear in browser console from `logScript` injection.
4. Existing non-prompt logging and route behavior remain functional.
5. Relevant unit/integration tests pass.

## Outcome
- Completion date: 2026-02-11
- Implemented:
  - Added append-only prompt file sink in `src/logging/prompt-file-sink.ts` writing JSONL entries to `logs/MM-DD-YYYY/prompts.jsonl` with serialized concurrent appends.
  - Refactored `logPrompt(...)` in `src/logging/prompt-formatter.ts` to write only through the prompt sink and emit safe warning metadata on sink failure.
  - Removed runtime browser prompt log transport (`logScript`) from `src/server/routes/play.ts` and `public/js/app.js`.
  - Updated logging config schema/defaults to `logging.prompts.enabled`, `logging.prompts.baseDir`, and `logging.prompts.fileName` in `src/config/schemas.ts` and `configs/default.json`.
  - Applied `logging.level` during bootstrap via `logger.setMinLevel(...)` in `src/index.ts`.
- Deviations from original plan:
  - Kept `src/logging/browser-injector.ts` source file in repo, but removed runtime export/usage in application flow.
- Verification:
  - `npx jest --runTestsByPath test/unit/logging/prompt-file-sink.test.ts test/unit/logging/prompt-formatter.test.ts test/unit/config/schemas.test.ts test/unit/config/loader.test.ts test/unit/server/routes/play.test.ts test/unit/server/public/app.test.ts test/unit/index.test.ts`
  - `npx jest --runTestsByPath test/integration/server/play-flow.test.ts`
