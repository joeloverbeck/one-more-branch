# STRSTOARCSYS-010: Story Persistence

## Summary
Update the story repository to serialize/deserialize the new `structure` field instead of `storyArc`. Add proper file data interfaces for structure storage.

## Files to Touch
- `src/persistence/story-repository.ts`

## Out of Scope
- DO NOT modify `page-repository.ts` (that's STRSTOARCSYS-011)
- DO NOT modify data models
- DO NOT modify engine layer
- DO NOT handle migration of existing stories (clean break per spec)

## Implementation Details

### Update `StoryFileData` Interface

```typescript
// BEFORE
interface StoryFileData {
  id: string;
  title: string;
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  globalCanon: string[];
  globalCharacterCanon: Record<string, string[]>;
  storyArc: string | null;  // REMOVE
  createdAt: string;
  updatedAt: string;
}

// AFTER
interface StoryFileData {
  id: string;
  title: string;
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  globalCanon: string[];
  globalCharacterCanon: Record<string, string[]>;
  structure: StoryStructureFileData | null;  // NEW
  createdAt: string;
  updatedAt: string;
}
```

### Add `StoryStructureFileData` Interface

```typescript
interface StoryStructureFileData {
  acts: Array<{
    id: string;
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      id: string;
      description: string;
      objective: string;
    }>;
  }>;
  overallTheme: string;
  generatedAt: string;  // ISO date string
}
```

### Add Serialization Functions

```typescript
function structureToFileData(structure: StoryStructure): StoryStructureFileData {
  return {
    acts: structure.acts.map(act => ({
      id: act.id,
      name: act.name,
      objective: act.objective,
      stakes: act.stakes,
      entryCondition: act.entryCondition,
      beats: act.beats.map(beat => ({
        id: beat.id,
        description: beat.description,
        objective: beat.objective,
      })),
    })),
    overallTheme: structure.overallTheme,
    generatedAt: structure.generatedAt.toISOString(),
  };
}

function fileDataToStructure(data: StoryStructureFileData): StoryStructure {
  return {
    acts: data.acts.map(actData => ({
      id: actData.id,
      name: actData.name,
      objective: actData.objective,
      stakes: actData.stakes,
      entryCondition: actData.entryCondition,
      beats: actData.beats.map(beatData => ({
        id: beatData.id,
        description: beatData.description,
        objective: beatData.objective,
      })),
    })),
    overallTheme: data.overallTheme,
    generatedAt: new Date(data.generatedAt),
  };
}
```

### Update `storyToFileData()`

```typescript
function storyToFileData(story: Story): StoryFileData {
  const globalCharacterCanon: Record<string, string[]> = {};
  for (const [name, facts] of Object.entries(story.globalCharacterCanon)) {
    globalCharacterCanon[name] = [...facts];
  }

  return {
    id: story.id,
    title: story.title,
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    globalCanon: [...story.globalCanon],
    globalCharacterCanon,
    structure: story.structure ? structureToFileData(story.structure) : null,  // CHANGED
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}
```

### Update `fileDataToStory()`

```typescript
function fileDataToStory(data: StoryFileData): Story {
  const globalCharacterCanon: Record<string, readonly string[]> = {};
  if (data.globalCharacterCanon) {
    for (const [name, facts] of Object.entries(data.globalCharacterCanon)) {
      globalCharacterCanon[name] = [...facts];
    }
  }

  return {
    id: parseStoryId(data.id),
    title: data.title,
    characterConcept: data.characterConcept,
    worldbuilding: data.worldbuilding,
    tone: data.tone,
    globalCanon: [...data.globalCanon],
    globalCharacterCanon,
    structure: data.structure ? fileDataToStructure(data.structure) : null,  // CHANGED
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}
```

## Acceptance Criteria

### Tests That Must Pass

Create/update `test/unit/persistence/story-repository.test.ts`:

1. `structureToFileData`
   - Converts StoryStructure to file-safe format
   - Converts Date to ISO string
   - Preserves all act and beat fields

2. `fileDataToStructure`
   - Converts file data back to StoryStructure
   - Parses ISO string to Date
   - Preserves all act and beat fields

3. `storyToFileData` with structure
   - Includes `structure` field in output
   - Handles `structure: null` correctly
   - Does NOT include `storyArc` field

4. `fileDataToStory` with structure
   - Parses `structure` field correctly
   - Handles `structure: null` correctly
   - Does NOT look for `storyArc` field

5. Round-trip persistence
   - Save story with structure → load story → structure matches
   - All structure fields preserved through save/load cycle
   - generatedAt date preserved correctly

6. Null structure handling
   - Save story with `structure: null` → load → `structure` is null
   - No errors on null structure

### Invariants That Must Remain True
- All existing story persistence functionality unchanged (id, title, canon, etc.)
- File format is valid JSON
- Date serialization uses ISO format
- TypeScript strict mode passes
- Existing persistence tests pass (with storyArc → structure updates)

## Dependencies
- STRSTOARCSYS-002 (Story model with structure field)
- STRSTOARCSYS-001 (StoryStructure type)

## Breaking Changes
- Existing story.json files will not load correctly (no migration)
- File format changes from `storyArc` to `structure`

## Estimated Scope
~80 lines of code changes + ~100 lines of tests
