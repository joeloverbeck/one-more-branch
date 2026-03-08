# CHABUIPIP-15: Character Web Converter

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-03
**Estimated diff size**: ~150 lines

## Summary

Create the converter that transforms character web/development data into `DecomposedCharacter` objects for story creation. Two modes: full conversion (developed characters) and lightweight conversion (undeveloped characters).

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
function toDecomposedCharacter(char: SavedDevelopedCharacter): DecomposedCharacter
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
| `thematicStance` | Derived from kernel opposition + stakes |

Relationship mapping (CastRelationship → DecomposedRelationship):
- `valence` ← `numericValence`
- `dynamic` ← `relationshipType` enum value
- `history` ← `history`
- `currentTension` ← `currentTension`
- `leverage` ← `leverage`

Only maps relationships where the protagonist is involved.

**Lightweight conversion** (for undeveloped characters):
```typescript
function toDecomposedCharacterFromWeb(
  assignment: CastRoleAssignment,
  archetypes: readonly RelationshipArchetype[]
): DecomposedCharacter
```

Maps role + archetype data to a minimal DecomposedCharacter (similar quality to entity decomposer output). Uses assignment fields (characterName, archetype, roleJustification) to populate required fields with reasonable defaults.

## Acceptance Criteria

### Tests that must pass

- `test/unit/models/character-web-converter.test.ts`:
  - Full conversion maps all fields correctly from a complete character
  - Full conversion synthesizes rawDescription from kernel + tridimensional
  - Full conversion maps protagonist relationship correctly
  - Full conversion returns null protagonistRelationship for protagonist character
  - Full conversion maps CastRelationship → DecomposedRelationship correctly
  - Lightweight conversion produces valid DecomposedCharacter from assignment + archetypes
  - Lightweight conversion populates all required DecomposedCharacter fields
  - Both conversion modes produce objects matching `DecomposedCharacter` shape
  - Full conversion throws if character is not fully complete (missing stages)

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- `DecomposedCharacter` interface is NOT modified
- Output matches existing `DecomposedCharacter` shape exactly
- Both conversion functions are pure (no side effects)
- No existing code modified
