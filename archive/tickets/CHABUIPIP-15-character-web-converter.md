# CHABUIPIP-15: Character Web Converter

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-03
**Estimated diff size**: ~150 lines

## Summary

Create the pure converter that transforms character web/development data into `DecomposedCharacter` objects for story creation. Two modes: full conversion (developed characters) and lightweight conversion (undeveloped characters).

## Assumption Corrections

- `CastRoleAssignment` does not have `archetype` or `roleJustification`. Lightweight conversion must use the current fields: `characterName`, `isProtagonist`, `storyFunction`, `characterDepth`, `narrativeRole`, and `conflictRelationship`.
- `DeepRelationshipResult.secrets` is currently `readonly string[]`, not character-scoped secret objects. Full conversion cannot filter secrets per relationship or per target character; it can only pass through the developed character's stage-4 secret list as-is.
- This ticket owns only pure per-character conversion. It does not own array ordering across a cast. The later caller that assembles `DecomposedCharacter[]` must ensure the protagonist remains first because downstream story prep treats index `0` as the protagonist.
- The converter may need a model barrel export if that is the cleanest way to support later tickets. The prior invariant `No existing code modified` was too strict for a maintainable integration path.

## File List

- `src/models/character-web-converter.ts` (CREATE)
- `test/unit/models/character-web-converter.test.ts` (CREATE)

## Out of Scope

- Do NOT modify `decomposed-character.ts` or its interfaces
- Do NOT modify any persistence code
- Do NOT modify the entity decomposer
- Do NOT create any service or route code
- Do NOT modify any LLM prompts

## Detailed Changes

### `src/models/character-web-converter.ts`:

**Full conversion** (for developed characters with all 5 stages complete):
```typescript
function toDecomposedCharacter(
  char: SavedDevelopedCharacter,
  protagonistName: string
): DecomposedCharacter
```

Field mapping:
| DecomposedCharacter field | Source |
|---------------------------|--------|
| `name` | `webContext.assignment.characterName` |
| `coreTraits` | `tridimensionalProfile.coreTraits` |
| `motivations` | `characterKernel.superObjective` |
| `protagonistRelationship` | Stage 4 relationships filtered for protagonist (null for protagonist themselves) |
| `knowledgeBoundaries` | `textualPresentation.knowledgeBoundaries` |
| `falseBeliefs` | `agencyModel.falseBeliefs` |
| `secretsKept` | `deepRelationships.secrets` |
| `decisionPattern` | `agencyModel.decisionPattern` |
| `coreBeliefs` | `agencyModel.coreBeliefs` |
| `conflictPriority` | `textualPresentation.conflictPriority` |
| `appearance` | `textualPresentation.appearance` |
| `speechFingerprint` | `textualPresentation.speechFingerprint` |
| `rawDescription` | Synthesized from kernel + tridimensional profile |
| `thematicStance` | Deterministically synthesized from kernel opposition + stakes |

Relationship mapping (CastRelationship → DecomposedRelationship):
- `valence` ← `numericValence`
- `dynamic` ← `relationshipType` enum value
- `history` ← `history`
- `currentTension` ← `currentTension`
- `leverage` ← `leverage`

Only maps relationships where the protagonist is involved.

Notes:
- If `char.webContext.assignment.isProtagonist === true`, `protagonistRelationship` must be `null`.
- For non-protagonists, map the relationship whose counterparty is `protagonistName`. If no such relationship exists, return `null` rather than inventing one.
- Reject incomplete developed characters by validating both `completedStages` and the required stage payloads. Do not rely on `completedStages` alone.

**Lightweight conversion** (for undeveloped characters):
```typescript
function toDecomposedCharacterFromWeb(
  assignment: CastRoleAssignment,
  archetypes: readonly RelationshipArchetype[],
  protagonistName: string
): DecomposedCharacter
```

Maps role + archetype data to a minimal `DecomposedCharacter` with deterministic defaults. Use only data that actually exists on `CastRoleAssignment` and `RelationshipArchetype`.

Expected behavior:
- `name` comes from `assignment.characterName`.
- `protagonistRelationship` is always `null` for the protagonist.
- For non-protagonists, derive `protagonistRelationship` from the archetype that connects this character to `protagonistName` when one exists; otherwise return `null`.
- `speechFingerprint` should use an explicit minimal placeholder shape, not an ad hoc partial object.
- `rawDescription`, `motivations`, `thematicStance`, `decisionPattern`, `conflictPriority`, `knowledgeBoundaries`, and `appearance` should be synthesized from `narrativeRole`, `conflictRelationship`, `storyFunction`, `characterDepth`, and any protagonist-facing archetype data.
- The output should be intentionally lightweight but structurally valid for downstream prompt formatting. Do not try to mimic full stage-5 richness where upstream data does not exist.

## Acceptance Criteria

### Tests that must pass

- `test/unit/models/character-web-converter.test.ts`:
  - Full conversion maps all fields correctly from a complete character
  - Full conversion synthesizes rawDescription from kernel + tridimensional
  - Full conversion maps protagonist relationship correctly
  - Full conversion returns null protagonistRelationship for protagonist character
  - Full conversion maps CastRelationship → DecomposedRelationship correctly
  - Full conversion returns null protagonistRelationship when no protagonist-facing relationship exists
  - Full conversion rejects a character whose `completedStages` claim completion but whose required stage payloads are still null
  - Lightweight conversion produces valid DecomposedCharacter from assignment + archetypes
  - Lightweight conversion populates all required DecomposedCharacter fields
  - Lightweight conversion uses the explicit `protagonistName` contract rather than inferring protagonist identity from archetype topology
  - Lightweight conversion derives protagonistRelationship from protagonist-facing archetype when present
  - Lightweight conversion returns null protagonistRelationship when no protagonist-facing archetype exists
  - Both conversion modes produce objects matching `DecomposedCharacter` shape
  - Full conversion throws if character is not fully complete (missing stages)

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- `DecomposedCharacter` interface is NOT modified
- Output matches existing `DecomposedCharacter` shape exactly
- Both conversion functions are pure (no side effects)
- Do not rewrite unrelated architecture or retrofit backwards-compatibility aliases

## Outcome

- Completed on 2026-03-09.
- Added `src/models/character-web-converter.ts` with two pure converters. Full conversion now reads protagonist identity from saved web context instead of taking it as a call-site parameter.
- Added `test/unit/models/character-web-converter.test.ts` covering full conversion, lightweight conversion, protagonist relationship mapping, explicit protagonist contract, and incomplete-stage rejection.
- Promoted protagonist identity into the saved web models:
  - `SavedCharacterWeb` now stores `protagonistName`;
  - `CharacterWebContext` now snapshots `protagonistName`;
  - `getProtagonistAssignment()` enforces the invariant that a character web has exactly one protagonist assignment.
- Corrected the original ticket scope before implementation:
  - lightweight conversion now uses real `CastRoleAssignment` fields instead of nonexistent `archetype` / `roleJustification` fields;
  - lightweight conversion still accepts `protagonistName` explicitly because undeveloped conversion currently operates on `assignment + archetypes` rather than a full saved web snapshot;
  - full conversion passes through `deepRelationships.secrets` as-is because stage-4 secrets are not character-scoped objects.
- Verification:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/models/character-web-converter.test.ts`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/models/saved-character-web.test.ts test/unit/models/saved-developed-character.test.ts test/unit/llm/character-stage-runner.test.ts`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/persistence/character-web-repository.test.ts test/unit/persistence/developed-character-repository.test.ts test/unit/llm/char-kernel-generation.test.ts test/unit/llm/char-tridimensional-generation.test.ts test/unit/llm/char-agency-generation.test.ts test/unit/llm/char-relationships-generation.test.ts test/unit/llm/char-presentation-generation.test.ts`
  - `npm run test:unit -- --coverage=false --testPathPatterns=test/unit/models`
  - `npm run typecheck`
  - `npm run lint`
