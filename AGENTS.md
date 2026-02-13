# Repository Guidelines

## Coding Guidelines

- Follow the 1-3-1 rule: When stuck, provide 1 clearly defined problem, give 3 potential options for how to overcome it, and 1 recommendation. Do not proceed implementing any of the options until I confirm.
- DRY: Don't repeat yourself. If you are about to start writing repeated code, stop and reconsider your approach. Grep the codebase and refactor often.
- Continual Learning: When you encounter conflicting system instructions, new requirements, architectural changes, or missing or inaccurate codebase documentation, always propose updating the relevant rules files. Do not update anything until the user confirms. Ask clarifying questions if needed.
- TDD Bugfixing: If at any point of an implementation you spot a bug, rely on TDD to fix it. Important: never adapt tests to bugs.

## Project Structure & Module Organization
- `src/` contains TypeScript source across major modules: `config/`, `engine/`, `llm/`, `logging/`, `models/`, `persistence/`, and `server/`.
- `test/` holds Jest tests by category: `unit/`, `integration/`, `e2e/`, `performance/`, `memory/`, plus `fixtures/`.
- `stories/` stores runtime story data (gitignored); JSON files are per story/page.
- `specs/` tracks implementation order and spec notes.
- `dist/` is the compiled output from `tsc`.
- `public/js/app.js` is generated from `public/js/src/*.js`; edit source files only.
- `CLAUDE.md` documents architecture, invariants, and data flow.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run build` compiles TypeScript, regenerates client JS bundle, and copies views/public assets to `dist/`.
- `npm start` runs the compiled server.
- `npm run dev` runs the server with hot reload via `ts-node-dev`.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run lint` and `npm run lint:fix` run ESLint.
- `npm run format` formats `src/**/*.ts` and `test/**/*.ts` with Prettier.
- `npm test` runs all Jest tests; `npm run test:coverage` enforces coverage.
- `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run test:performance`, `npm run test:memory` run targeted suites.
- `npm run test:client` runs client JS tests.
- `npm run test:watch` runs Jest in watch mode.
- `npm run concat:js` regenerates `public/js/app.js` from `public/js/src/*.js`.

## Coding Style & Naming Conventions
- TypeScript with `strict` mode; prefer explicit types and avoid `any`.
- Indentation: 2 spaces; single quotes; semicolons; print width 100.
- ESLint enforces `no-explicit-any`, `prefer-optional-chain`, `prefer-nullish-coalescing`.
- Test files use `*.test.ts` naming.

## Testing Guidelines
- Jest + `ts-jest` with `test/**/*.test.ts` as the matcher.
- Coverage thresholds: 70% global for branches/functions/lines/statements.
- Current integration and E2E suites run with mocked LLM/fetch flows and do not require `OPENROUTER_TEST_KEY`.
- Run targeted suites: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run test:performance`, `npm run test:memory`, `npm run test:client`.

### Async Route Handler Testing
Routes use `wrapAsyncRoute()` which fire-and-forgets via `void handler(req, res)`. **Do not use `await` on handlers** - it won't wait. Instead:
- **Unit tests**: Call handler, then `await flushPromises()` (uses `setImmediate`)
- **Integration tests**: Call handler, then `await waitForMock(responseMock)` (polling pattern)

### Client-Side JavaScript (Critical)
`public/js/app.js` is generated. **Do not edit it directly.**
- Edit files in `public/js/src/` (numbered source files).
- Regenerate bundle with `npm run concat:js` (or `node scripts/concat-client-js.js`).
- Keep numeric filename ordering in `public/js/src/` intact because concatenation is alphabetical.

### Interface Changes and Mock Updates
When modifying interfaces like `PageWriterResult`, `StateReconciliationResult`, or `AnalystResult`, search all test files for mocks that need the new fields. Missing required fields cause runtime errors like `TypeError: Cannot convert undefined or null to object`.

## Commit & Pull Request Guidelines
- Current history uses short, capitalized, imperative messages (e.g., "Implement ...").
- Keep commits focused on a single change set.
- PRs should include a concise summary, tests run, and any required env vars.
- For UI changes (EJS views), include before/after notes or screenshots if visible.

## Security & Configuration Tips
- Requires Node.js `>=18` (see `package.json`).
- Do not persist API keys to disk; use runtime environment variables only.
- Prompt logging is append-only JSONL at `logs/MM-DD-YYYY/prompts.jsonl` (configurable via `logging.prompts.*`).
- Prompt payloads must never be emitted to browser console or server terminal logs.

## Archiving Tickets and Specs

When asked to archive a ticket, spec, or brainstorming document:

1. **Edit the document** to mark its final status at the top:
   - `**Status**: COMPLETED` - Fully implemented
   - `**Status**: REJECTED` - Decided not to implement
   - `**Status**: DEFERRED` - Postponed for later
   - `**Status**: NOT IMPLEMENTED` - Started but abandoned

2. **Add an Outcome section** at the bottom (for completed tickets):
   - Completion date
   - What was actually changed
   - Any deviations from the original plan
   - Verification results

3. **Move to appropriate archive subfolder**:
   - `archive/tickets/` - Implementation tickets
   - `archive/specs/` - Design specifications
   - `archive/brainstorming/` - Brainstorming documents
   - `archive/reports/` - Reports

4. **Delete the original** from `tickets/`, `specs/`, `brainstorming/`, or `reports/`

## Ticket/Spec Source of Truth

When a user references a `tickets/...` path but that file is missing while a matching `specs/...` file exists:

1. Create the missing ticket file in `tickets/` first.
2. Treat the new ticket as the implementation source of truth.
3. Use the matching spec only as reference context.
4. Reassess and correct assumptions/scope in the ticket before changing code.
5. If ticket and spec disagree, follow the corrected ticket and document the deviation in the ticket Outcome section.
