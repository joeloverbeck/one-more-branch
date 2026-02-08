# Project Overview

## Purpose
"One More Branch" is an interactive branching storytelling application where users play AI-generated choose-your-own-adventure stories. The LLM acts as a Dungeon Master, generating narrative segments with meaningful choices that branch into different story paths.

## Key Characteristics
- Stories generated via OpenRouter API (user provides API key at runtime)
- Pages are immutable once generated - replay yields identical content
- No undo/back functionality - choices are permanent per playthrough
- Branch isolation - state changes only affect downstream pages in same branch
- NC-21 mature content policy (no censorship)

## Tech Stack
- **Runtime**: Node.js (>=18.0.0)
- **Language**: TypeScript (strict mode)
- **Server**: Express.js with EJS templating
- **Testing**: Jest with separate test categories
- **Storage**: File-based JSON (granular per-page files)
- **Validation**: Zod for schema validation

## Project Structure
```
src/
├── models/         # Data types: Story, Page, Choice, state management
├── persistence/    # File-based storage with atomic writes and locking
├── llm/            # OpenRouter client, prompts, response parsing
│   ├── prompts/    # System prompts, opening/continuation prompts
│   └── schemas/    # Response validation and transformation
├── engine/         # Core story engine orchestrating all operations
├── server/         # Express routes and EJS views
│   ├── routes/     # HTTP endpoints
│   ├── views/      # EJS templates
│   └── services/   # Business logic services
├── logging/        # Logging infrastructure
└── config/         # Configuration schemas
```
