# Repository Guidelines

## Coding Guidelines

- Follow the 1-3-1 rule: When stuck, provide 1 clearly defined problem, give 3 potential options for how to overcome it, and 1 recommendation. Do not proceed implementing any of the options until I confirm.
- DRY: Don't repeat yourself. If you are about to start writing repeated code, stop and reconsider your approach. Grep the codebase and refactor often.
- Continual Learning: When you encounter conflicting system instructions, new requirements, architectural changes, or missing or inaccurate codebase documentation, always propose updating the relevant rules files. Do not update anything until the user confirms. Ask clarifying questions if needed.
- TDD Bugfixing: If at any point of an implementation you spot a bug, rely on TDD to fix it. Important: never adapt tests to bugs.

## Project Structure & Module Organization
- `src/` contains TypeScript source (Express server, story engine, LLM integration).
- `test/` holds Jest tests by category: `unit/`, `integration/`, `e2e/`, `performance/`, `memory/`, plus `fixtures/`.
- `stories/` stores runtime story data (gitignored); JSON files are per story/page.
- `specs/` tracks implementation order and spec notes.
- `dist/` is the compiled output from `tsc`.
- `CLAUDE.md` documents architecture, invariants, and data flow.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run build` compiles TypeScript to `dist/`.
- `npm start` runs the compiled server.
- `npm run dev` runs the server with hot reload via `ts-node-dev`.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run lint` and `npm run lint:fix` run ESLint.
- `npm run format` formats `src/**/*.ts` and `test/**/*.ts` with Prettier.
- `npm test` runs all Jest tests; `npm run test:coverage` enforces coverage.

## Coding Style & Naming Conventions
- TypeScript with `strict` mode; prefer explicit types and avoid `any`.
- Indentation: 2 spaces; single quotes; semicolons; print width 100.
- ESLint enforces `no-explicit-any`, `prefer-optional-chain`, `prefer-nullish-coalescing`.
- Test files use `*.test.ts` naming.

## Testing Guidelines
- Jest + `ts-jest` with `test/**/*.test.ts` as the matcher.
- Coverage thresholds: 70% global for branches/functions/lines/statements.
- Current integration and E2E suites run with mocked LLM/fetch flows and do not require `OPENROUTER_TEST_KEY`.
- Run targeted suites: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`.

### Async Route Handler Testing
Routes use `wrapAsyncRoute()` which fire-and-forgets via `void handler(req, res)`. **Do not use `await` on handlers** - it won't wait. Instead:
- **Unit tests**: Call handler, then `await flushPromises()` (uses `setImmediate`)
- **Integration tests**: Call handler, then `await waitForMock(responseMock)` (polling pattern)

### Interface Changes and Mock Updates
When modifying interfaces like `GenerationResult`, search all test files for mocks that need the new fields. Missing required fields cause runtime errors like `TypeError: Cannot convert undefined or null to object`.

## Commit & Pull Request Guidelines
- Current history uses short, capitalized, imperative messages (e.g., "Implement ...").
- Keep commits focused on a single change set.
- PRs should include a concise summary, tests run, and any required env vars.
- For UI changes (EJS views), include before/after notes or screenshots if visible.

## Security & Configuration Tips
- Requires Node.js `>=18` (see `package.json`).
- Do not persist API keys to disk; use runtime environment variables only.

## Archiving Tickets and Specs

When asked to archive a ticket, spec, or brainstorming document:

1. **Edit the document** to mark its final status at the top:
   - `**Status**: ✅ COMPLETED` - Fully implemented
   - `**Status**: ❌ REJECTED` - Decided not to implement
   - `**Status**: ⏸️ DEFERRED` - Postponed for later
   - `**Status**: 🚫 NOT IMPLEMENTED` - Started but abandoned

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