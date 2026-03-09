# CHABUIPIP-13: LLM Pipeline — Textual Presentation (Stage 5)

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-03, CHABUIPIP-07
**Estimated diff size**: ~250 lines across 3 files

## Summary

Create prompt builder, JSON schema, and generation function for Stage 5: Textual Presentation. Produces `TextualPresentation` (voice register, speech fingerprint, appearance, knowledge boundaries, conflict priority). This is the final stage — it receives all prior stage outputs.

## File List

- `src/llm/prompts/char-presentation-prompt.ts` (CREATE)
- `src/llm/schemas/char-presentation-schema.ts` (CREATE)
- `src/llm/char-presentation-generation.ts` (CREATE)
- `test/unit/llm/char-presentation-generation.test.ts` (CREATE)

## Out of Scope

- Do NOT create stage runner (CHABUIPIP-14)
- Do NOT create other stage prompts
- Do NOT modify existing prompts, schemas, or models
- Do NOT modify `decomposed-character.ts` or its `SpeechFingerprint`

## Detailed Changes

### `src/llm/prompts/char-presentation-prompt.ts`:

Prompt builder accepting `CharacterDevPromptContext` with ALL prior stages:
- `webContext` (role, archetypes, dynamics)
- `characterKernel` (Stage 1)
- `tridimensionalProfile` (Stage 2)
- `agencyModel` (Stage 3)
- `deepRelationships` (Stage 4)
- `kernelSummary?`, `conceptSummary?`, `userNotes?`

Prompt instructs LLM to synthesize all character data into textual presentation:
1. Voice register (from `VoiceRegister` enum)
2. Speech fingerprint (catchphrases, vocabulary, sentence patterns, verbal tics, dialogue samples, metaphor frames, anti-examples, discourse markers, register shifts) — matches `SpeechFingerprint` from `decomposed-character.ts`
3. Appearance description
4. Knowledge boundaries
5. Conflict priority

### `src/llm/schemas/char-presentation-schema.ts`:

JSON Schema matching `TextualPresentation`:
- `characterName` (string)
- `voiceRegister` (enum: VoiceRegister)
- `speechFingerprint` (object matching SpeechFingerprint interface)
- `appearance` (string)
- `knowledgeBoundaries` (string)
- `conflictPriority` (string)

Reuse the SpeechFingerprint schema fields from `entity-decomposition-contract.ts` or `decomposed-character.ts`.

### `src/llm/char-presentation-generation.ts`:

Follow `spine-generator.ts` pattern. Use stage `GENERATING_CHAR_PRESENTATION`.
Validate `voiceRegister` enum with existing type guard.

Return type:
```typescript
interface CharPresentationGenerationResult {
  readonly textualPresentation: TextualPresentation;
  readonly rawResponse: string;
}
```

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/char-presentation-generation.test.ts`:
  - Prompt includes ALL prior stage outputs (Stages 1-4) as context
  - Schema validates TextualPresentation with valid VoiceRegister enum
  - Schema validates SpeechFingerprint nested structure
  - Schema rejects invalid VoiceRegister values
  - Generation function returns typed result
  - Generation function validates voiceRegister enum

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- `TextualPresentation` and `SpeechFingerprint` types used as-is
- `VoiceRegister` enum validation uses existing type guard from `character-enums.ts`
- SpeechFingerprint schema matches the interface in `decomposed-character.ts`
- No existing code modified

## Outcome

- Completion date: March 9, 2026
- What changed: Implemented Stage 5 prompt assembly in `src/llm/prompts/char-presentation-prompt.ts`, Stage 5 JSON schema in `src/llm/schemas/char-presentation-schema.ts`, and Stage 5 orchestration/parsing in `src/llm/char-presentation-generation.ts`. Added unit coverage in `test/unit/llm/char-presentation-generation.test.ts`.
- Deviations from original plan: Updated `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` to register the new schema export so the repo's schema coverage and compatibility checks continue to pass.
- Verification results: `npm run test:unit -- --runTestsByPath test/unit/llm/char-presentation-generation.test.ts test/unit/llm/schemas/anthropic-schema-compatibility.test.ts`, `npm run typecheck`, and `npm run lint` all passed.
