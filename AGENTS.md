# Repository Guidelines

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
