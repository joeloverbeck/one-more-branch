# LLM Integration Tickets

Implementation tickets for **Spec 04: LLM Integration**.

## Ticket Overview

| Ticket | Description | Depends On | Est. Size |
|--------|-------------|------------|-----------|
| [LLMINT-001](./LLMINT-001-types.md) | LLM Types and Error Classes | None | ~150 LOC |
| [LLMINT-002](./LLMINT-002-schemas.md) | JSON Schema and Zod Validation | LLMINT-001 | ~350 LOC |
| [LLMINT-003](./LLMINT-003-content-policy-prompts.md) | Content Policy and Prompt Templates | LLMINT-001 | ~330 LOC |
| [LLMINT-004](./LLMINT-004-fallback-parser.md) | Fallback Text Parser | LLMINT-001 | ~400 LOC |
| [LLMINT-005](./LLMINT-005-client.md) | OpenRouter API Client | LLMINT-001-004 | ~480 LOC |
| [LLMINT-006](./LLMINT-006-barrel-export.md) | Barrel Export and Module Integration | LLMINT-001-005 | ~90 LOC |
| [LLMINT-007](./LLMINT-007-spec-update.md) | Update Implementation Tracker | All above | ~20 LOC |

## Dependency Graph

```
LLMINT-001 (types)
    │
    ├──► LLMINT-002 (schemas)
    │         │
    ├──► LLMINT-003 (prompts)
    │         │         │
    ├──► LLMINT-004 (fallback-parser)
    │         │         │         │
    │         └─────────┴─────────┴──► LLMINT-005 (client)
    │                                       │
    └───────────────────────────────────────┴──► LLMINT-006 (barrel export)
                                                        │
                                                        ▼
                                                 LLMINT-007 (spec update)
```

## Implementation Order

1. **LLMINT-001** - Types (no dependencies)
2. **LLMINT-002** - Schemas (depends on types)
3. **LLMINT-003** - Prompts (depends on types)
4. **LLMINT-004** - Fallback parser (depends on types)
5. **LLMINT-005** - Client (depends on all above)
6. **LLMINT-006** - Barrel export (depends on all modules)
7. **LLMINT-007** - Spec update (after all code complete)

**Note**: Tickets 2, 3, and 4 can be implemented in parallel after ticket 1 is complete.

## Files Created

After all tickets are complete, `src/llm/` will contain:

```
src/llm/
├── index.ts              # Barrel exports
├── client.ts             # OpenRouter API client
├── prompts.ts            # Prompt templates
├── schemas.ts            # JSON + Zod schemas
├── types.ts              # Type definitions
├── content-policy.ts     # NC-21 content policy
└── fallback-parser.ts    # Text parsing fallback
```

## Test Files Created

```
test/unit/llm/
├── types.test.ts
├── schemas.test.ts
├── prompts.test.ts
├── fallback-parser.test.ts
├── client.test.ts
└── index.test.ts

test/integration/llm/
└── client.test.ts
```

## Running Tests

```bash
# All LLM unit tests
npm run test:unit -- --testPathPattern=llm

# All LLM integration tests (requires OPENROUTER_TEST_KEY)
npm run test:integration -- --testPathPattern=llm

# Individual test files
npm run test:unit -- --testPathPattern=schemas
npm run test:unit -- --testPathPattern=prompts
npm run test:unit -- --testPathPattern=fallback-parser
npm run test:unit -- --testPathPattern=client
```
