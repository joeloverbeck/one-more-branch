# Character Brainstormer Prompt

## Purpose

Generates 6-10 unique, original, memorable character concepts for a given story context. The brainstormer applies narrative theory techniques to ensure each character passes a diagnostic uniqueness test.

## Pipeline Position

Standalone brainstorming tool. Not part of the per-page generation pipeline. Called on-demand from the character brainstormer UI page.

## Generation Stage

`BRAINSTORMING_CHARACTERS`

## Input Context

`CharacterBrainstormerContext` from `src/llm/character-brainstormer-types.ts`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conceptSpec` | `ConceptSpec` | Yes | The story concept specification |
| `storyKernel` | `StoryKernel` | Yes | The thematic kernel |
| `decomposedWorld` | `DecomposedWorld \| null` | No | Structured world facts (preferred over raw) |
| `rawWorldbuilding` | `string \| null` | No | Raw worldbuilding text (fallback) |
| `existingCharacterNames` | `ExistingCharacterSummary[]` | Yes | Existing characters for anti-similarity constraints |
| `userNotes` | `string` | Yes | User-provided creative direction (may be empty) |

## Message Structure

### System Message

1. **Role introduction**: Character concept brainstormer for interactive branching fiction
2. **Content policy**: NC-21 mature content guidelines
3. **Diagnostic uniqueness mandate**: Every character must pass the uniqueness test
4. **Narrative theory toolkit**: 10 techniques (Egri, McKee, Weiland/Hurst, Diaz/Seger, archetype subversion, Matt Bird, Truby/McKee, technique rotation, worldview fingerprinting, functional diversity)
5. **Quality gates**: Surprise traits, naming conventions, field-level requirements

### User Message

1. **Generation instruction**: "Generate 6-10 unique, original, memorable character concepts"
2. **Concept analysis**: Rendered via `buildConceptAnalysisSection()` (always present)
3. **Thematic kernel**: Rendered via `buildKernelGroundingSection()` (always present)
4. **World context** (conditional): `decomposedWorld` via `buildWorldSectionForCharacterWeb()`, or `rawWorldbuilding` as fallback
5. **Existing characters** (conditional): Anti-similarity constraints when characters exist for the selected concept
6. **User creative direction** (conditional): User notes with anchoring constraint instructions
7. **Output requirements**: JSON schema compliance, character count, diversity note

## Output Contract

`CharacterBrainstormerResult` from `src/llm/character-brainstormer-types.ts`:

- `characters`: Array of 6-10 `BrainstormedCharacter` objects
- `diversityNote`: Explanation of techniques used for diversity

Each `BrainstormedCharacter` has 9 required string fields: `name`, `highConceptPitch`, `coreWound`, `centralContradiction`, `archetypeAndSubversion`, `suggestedStoryFunction`, `relationshipDynamicHint`, `whatMakesThemMemorable`, `metaphorFamily`.

## Schema

`CHARACTER_BRAINSTORMER_SCHEMA` from `src/llm/schemas/character-brainstormer-schema.ts`

## Shared Section Builders

- `buildConceptAnalysisSection()` from `src/llm/prompts/sections/shared/concept-kernel-sections.ts`
- `buildKernelGroundingSection()` from `src/llm/prompts/sections/shared/concept-kernel-sections.ts`
- `buildWorldSectionForCharacterWeb()` from `src/llm/prompts/sections/shared/worldbuilding-sections.ts`
