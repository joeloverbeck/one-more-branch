# Style and Conventions

## TypeScript Configuration
- **Strict mode**: All strict options enabled
- **Target**: ES2022
- **Module**: Node16 with Node16 resolution
- **noUncheckedIndexedAccess**: true (safer array access)
- **noImplicitReturns**: true (all paths must return)

## ESLint Rules
- `@typescript-eslint/explicit-function-return-type`: warn
- `@typescript-eslint/no-unused-vars`: error (args starting with _ ignored)
- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/prefer-nullish-coalescing`: error
- `@typescript-eslint/prefer-optional-chain`: error
- `no-console`: warn (allow warn/error)

## Prettier Configuration
- Semi: true
- Trailing comma: es5
- Single quotes: true
- Print width: 100
- Tab width: 2
- Tabs: false (spaces)

## Design Patterns
- **Immutability**: CRITICAL - always create new objects, never mutate
- **Single Responsibility**: Each component has one reason to change
- **Repository Pattern**: Used for persistence layer
- **TDD**: Write tests first, 80%+ coverage required

## File Organization
- Many small files preferred over few large files
- 200-400 lines typical, 800 max
- Organize by feature/domain, not by type
