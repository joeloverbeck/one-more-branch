# Spec 01: Project Foundation & Test Infrastructure

## Overview

Set up the foundational project structure including Node.js/TypeScript configuration, testing infrastructure, and development tooling for the "One More Branch" interactive storytelling application.

## Goals

1. Initialize a properly configured TypeScript Node.js project
2. Establish test directory structure with separate categories
3. Configure npm scripts for building, testing, and running
4. Set up linting and code formatting
5. Create placeholder directories for future components

## Dependencies

**None** - This is the first spec to implement.

## Implementation Details

### Package Configuration

Create `package.json` with:
- Node.js engine: `>=18.0.0` (LTS)
- TypeScript as dev dependency
- Jest for testing
- ESLint + Prettier for code quality
- Express.js for server (installed but not configured yet)

### TypeScript Configuration

Create `tsconfig.json` with:
- Strict mode enabled
- ES2022 target
- Node16 module resolution
- Output to `dist/` directory
- Source maps enabled
- Declaration files generated

### Test Structure

```
test/
├── unit/           # Isolated unit tests (fast, no I/O)
├── integration/    # Tests involving multiple components
├── e2e/            # End-to-end browser/API tests
├── performance/    # Load and stress tests
├── memory/         # Memory leak detection tests
└── fixtures/       # Shared test data and mocks
```

### Directory Structure

```
one-more-branch/
├── src/
│   ├── models/         # Data type definitions (Spec 02)
│   ├── persistence/    # File storage (Spec 03)
│   ├── llm/            # OpenRouter integration (Spec 04)
│   ├── engine/         # Story engine logic (Spec 05)
│   ├── server/         # Express routes (Spec 06)
│   └── index.ts        # Application entry point
├── test/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── performance/
│   ├── memory/
│   └── fixtures/
├── stories/            # Runtime story data storage
├── dist/               # Compiled output (gitignored)
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
└── .gitignore
```

## Files to Create

### `package.json`

```json
{
  "name": "one-more-branch",
  "version": "0.1.0",
  "description": "Interactive branching storytelling application",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn src/index.ts",
    "test": "jest",
    "test:unit": "jest --testPathPattern=test/unit",
    "test:integration": "jest --testPathPattern=test/integration",
    "test:e2e": "jest --testPathPattern=test/e2e",
    "test:performance": "jest --testPathPattern=test/performance",
    "test:memory": "jest --testPathPattern=test/memory",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src test --ext .ts",
    "lint:fix": "eslint src test --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "typecheck": "tsc --noEmit"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "interactive-fiction",
    "storytelling",
    "choose-your-own-adventure",
    "llm"
  ],
  "license": "GPL-3.0",
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.0",
    "@types/uuid": "^9.0.8",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "jest": "^29.7.0",
    "prettier": "^3.2.0",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "uuid": "^9.0.1"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### `jest.config.js`

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test/fixtures/setup.ts'],
  testTimeout: 10000,
  verbose: true,
};
```

### `.eslintrc.js`

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', '*.js'],
};
```

### `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### `.gitignore` (additions)

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Coverage
coverage/

# Runtime data
stories/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

### `src/index.ts` (placeholder)

```typescript
/**
 * One More Branch - Interactive Branching Storytelling Application
 * Entry point - will be expanded in Spec 06
 */

console.log('One More Branch - Starting...');

// Placeholder - actual server setup in Spec 06
export {};
```

### `test/fixtures/setup.ts`

```typescript
/**
 * Jest test setup file
 * Runs before all tests
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Cleanup logic will be added as needed
});

// Global test utilities
export {};
```

### `test/unit/.gitkeep`
### `test/integration/.gitkeep`
### `test/e2e/.gitkeep`
### `test/performance/.gitkeep`
### `test/memory/.gitkeep`

Empty placeholder files to ensure directories are tracked in git.

## Invariants

1. **Build Success**: `npm run build` must complete without errors
2. **Type Safety**: `npm run typecheck` must pass with no errors
3. **Lint Clean**: `npm run lint` must pass (warnings acceptable initially)
4. **Test Infrastructure**: All test commands must run (even with no tests yet)
5. **Directory Structure**: All specified directories must exist

## Test Cases

### Unit Tests

**File**: `test/unit/foundation.test.ts`

```typescript
describe('Project Foundation', () => {
  it('should have TypeScript configured correctly', () => {
    // Verify tsconfig can be loaded
    const tsconfig = require('../../tsconfig.json');
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it('should have required directories', () => {
    const fs = require('fs');
    const path = require('path');

    const requiredDirs = [
      'src/models',
      'src/persistence',
      'src/llm',
      'src/engine',
      'src/server',
      'test/unit',
      'test/integration',
      'test/e2e',
      'test/performance',
      'test/memory',
      'test/fixtures',
    ];

    requiredDirs.forEach(dir => {
      const fullPath = path.join(__dirname, '../..', dir);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });
});
```

### Integration Tests

None for this spec - infrastructure only.

### E2E Tests

None for this spec - infrastructure only.

## Acceptance Criteria

- [ ] `npm install` completes successfully
- [ ] `npm run build` compiles TypeScript without errors
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` runs (may have warnings but no errors)
- [ ] `npm run test:unit` runs the foundation test
- [ ] `npm run test:integration` runs (no tests yet, should pass)
- [ ] All source directories exist: `src/{models,persistence,llm,engine,server}`
- [ ] All test directories exist: `test/{unit,integration,e2e,performance,memory,fixtures}`
- [ ] `stories/` directory exists (for runtime data)
- [ ] TypeScript strict mode is enabled

## Implementation Notes

1. Run `npm install` after creating `package.json`
2. Create all directories before running tests
3. The `stories/` directory should be gitignored as it contains runtime data
4. TypeScript strict mode ensures type safety from the start
5. Jest is configured with path aliases matching tsconfig
