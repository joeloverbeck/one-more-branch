# Concept Generator Module

**Status**: COMPLETED

## 1. Overview

A new module that generates high-quality narrative concepts from minimal user input. The module sits UPSTREAM of the existing spine generation step and produces a structured `ConceptSpec` that pre-fills the story creation form.

**Pipeline position:**
```
[User seeds] → Concept Ideator → Concept Evaluator → [User selects]
  → [Optional: Stress-Tester] → Pre-fill form → Spine → Entity Decomposer → Structure → ...
```

**LLM stages:** 2 core (Ideation + Evaluation) + 1 optional (Stress-Test)

## 2. User Seed Input

The user provides lightweight preferences, not a full story concept. All fields are optional except the API key.

```typescript
interface ConceptSeedInput {
  readonly genreVibes?: string;         // Free text: "dark fantasy", "sci-fi noir", "cosmic horror"
  readonly moodKeywords?: string;       // Free text: "melancholic", "tense", "whimsical", "gritty"
  readonly contentPreferences?: string; // Free text: "include body horror", "no romance subplot"
  readonly thematicInterests?: string;  // Free text: "identity", "power", "memory", "justice"
  readonly sparkLine?: string;          // Optional one-line idea: "What if memories could be eaten?"
  readonly apiKey: string;              // OpenRouter API key (never persisted)
}
```

**Validation rules:**
- `apiKey`: required, at least 10 characters (same as existing)
- All other fields: optional, trimmed
- At least ONE seed field must be non-empty (can't generate from nothing)

## 3. Concept Spec Schema

This is what the pipeline produces for each concept candidate.

### 3.1 Taxonomy Enums

```typescript
// Genre classification — broad enough for creative range, specific enough for LLM guidance
type GenreFrame =
  | 'HORROR' | 'THRILLER' | 'MYSTERY' | 'FANTASY'
  | 'SCI_FI' | 'LITERARY' | 'ROMANCE' | 'DRAMA'
  | 'WESTERN' | 'NOIR' | 'SATIRE' | 'FABLE'
  | 'GOTHIC' | 'SURREAL' | 'DYSTOPIAN' | 'MYTHIC';

// The fundamental tension axis driving the concept
type ConflictAxis =
  | 'INDIVIDUAL_VS_SYSTEM'
  | 'TRUTH_VS_STABILITY'
  | 'DUTY_VS_DESIRE'
  | 'FREEDOM_VS_SAFETY'
  | 'KNOWLEDGE_VS_INNOCENCE'
  | 'POWER_VS_MORALITY'
  | 'LOYALTY_VS_SURVIVAL'
  | 'IDENTITY_VS_BELONGING';

// How the branching story should expand
type BranchingPosture =
  | 'TREE'            // Pure branching, no reconvergence
  | 'RECONVERGE'      // Branches that meet at key junctions
  | 'STORYLETS'       // Modular episodes gated by state
  | 'HUB_AND_SPOKE';  // Central hub with explorable branches

// Setting scope affects state complexity
type SettingScale =
  | 'INTIMATE'    // Single location or very constrained space
  | 'LOCAL'       // Neighborhood, building, small town
  | 'REGIONAL'    // City, territory, region
  | 'GLOBAL';     // World-spanning or multi-realm

// How many state variables the concept naturally demands
type StateComplexity =
  | 'LOW'     // 5-8 core state variables
  | 'MEDIUM'  // 9-14 core state variables
  | 'HIGH';   // 15-20 core state variables
```

### 3.2 ConceptSpec Interface

```typescript
interface ConceptSpec {
  // --- Core Identity ---
  readonly oneLineHook: string;          // The concept in one sentence (<=25 words)
  readonly elevatorParagraph: string;    // Expanded concept (<=120 words)
  readonly genreFrame: GenreFrame;
  readonly genreSubversion: string;      // How it twists genre expectations (1-2 sentences)

  // --- Protagonist Seed ---
  readonly protagonistRole: string;      // Who the player IS (role, not character name)
  readonly coreCompetence: string;       // What they're good at
  readonly coreFlaw: string;             // What creates internal conflict
  readonly actionVerbs: readonly string[]; // 6+ verbs the player can DO (negotiate, investigate, sabotage...)

  // --- Dramatic Engine ---
  readonly coreConflictLoop: string;     // The recurring decision pattern that generates situations
  readonly conflictAxis: ConflictAxis;
  readonly pressureSource: string;       // What forces tradeoffs (1-2 sentences)
  readonly stakesPersonal: string;       // What's at risk personally (1-2 sentences)
  readonly stakesSystemic: string;       // What's at risk for the world/community (1-2 sentences)
  readonly deadlineMechanism: string;    // What creates urgency (1-2 sentences)

  // --- World Kernel ---
  readonly settingAxioms: readonly string[];     // 2-5 rules that make this world unique
  readonly constraintSet: readonly string[];     // 3-5 things that are impossible/costly/forbidden
  readonly keyInstitutions: readonly string[];   // 2-4 systems that produce pressure
  readonly settingScale: SettingScale;

  // --- Branching Profile ---
  readonly branchingPosture: BranchingPosture;
  readonly stateComplexity: StateComplexity;
}
```

### 3.3 Evaluated Concept (output of Stage 2)

```typescript
interface ConceptDimensionScores {
  readonly hookStrength: number;      // 0-5: Curiosity gaps + emotional pull + one-line clarity
  readonly conflictEngine: number;    // 0-5: Stakes depth + constraint quality + pressure mechanism
  readonly agencyBreadth: number;     // 0-5: Verb palette + strategy variety + meaningful choice potential
  readonly noveltyLeverage: number;   // 0-5: Familiar frame + load-bearing differentiator
  readonly branchingFitness: number;  // 0-5: Scalability + reconvergence + state manageability
  readonly llmFeasibility: number;    // 0-5: Rule count + enforceability + drift resistance
}

interface EvaluatedConcept {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;
  readonly overallScore: number;         // Weighted sum (0-100)
  readonly strengths: readonly string[]; // 2-3 bullet points
  readonly weaknesses: readonly string[]; // 2-3 bullet points
  readonly tradeoffSummary: string;      // 1-2 sentences: "Strong in X, weaker in Y"
}
```

### 3.4 Scoring Weights and Thresholds

| Dimension | Weight | Pass Threshold |
|---|---:|---|
| Hook strength | 12 | >= 3 |
| Conflict engine | 20 | >= 3 |
| Agency breadth | 15 | >= 3 |
| Novelty leverage | 10 | >= 2 |
| Branching fitness | 20 | >= 3 |
| LLM feasibility | 23 | >= 3 |

The evaluator uses these weights to compute `overallScore` and these thresholds to flag weak dimensions.

## 4. Stage 1: Concept Ideator

**Purpose:** Generate diverse, structured concept candidates from minimal user seeds.

**File:** `src/llm/concept-ideator.ts`
**Prompt:** `src/llm/prompts/concept-ideator-prompt.ts`
**Schema:** `src/llm/schemas/concept-ideator-schema.ts`
**Types:** `src/llm/concept-generator-types.ts` (shared across all concept stages)

### 4.1 Input

```typescript
interface ConceptIdeatorContext {
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly thematicInterests?: string;
  readonly sparkLine?: string;
}
```

### 4.2 Output

```typescript
interface ConceptIdeationResult {
  readonly concepts: readonly ConceptSpec[];  // 6-8 candidates
  readonly rawResponse: string;
}
```

### 4.3 Prompt Design Principles

The system prompt establishes the LLM as a "narrative concept architect for branching interactive fiction."

Key prompt sections:
1. **Role and task**: Generate N concept candidates that are optimized for branching interactive stories, not linear fiction
2. **Taxonomy guidance**: List all enum values for GenreFrame, ConflictAxis, BranchingPosture, SettingScale, StateComplexity with brief descriptions of when each applies
3. **Quality anchors**:
   - A concept is a "generative engine" not a plot outline — it must produce situations, not describe events
   - The one-line hook must be graspable WITHOUT proper nouns
   - The core conflict loop must describe a RECURRING decision pattern, not a single dilemma
   - World axioms must be ENFORCEABLE by an LLM (not vague)
4. **Diversity constraints**:
   - No two concepts may share the same genreFrame AND conflictAxis
   - Must span at least 3 different genreFrames
   - Must span at least 3 different conflictAxis values
5. **Content policy**: Injected via existing `CONTENT_POLICY` constant
6. **Tone directive**: Built from genreVibes + moodKeywords using existing `buildToneDirective()` pattern

The user prompt provides the seed input with clear section headers.

### 4.4 Schema

JSON Schema with `strict: true`, `additionalProperties: false` at every level. Top-level structure:
```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "concept_ideation",
    "strict": true,
    "schema": {
      "type": "object",
      "required": ["concepts"],
      "properties": {
        "concepts": {
          "type": "array",
          "items": { /* ConceptSpec fields with enum constraints */ }
        }
      }
    }
  }
}
```

All enum fields use `"enum": [...]` inline. All string arrays specify `"items": { "type": "string" }`.

## 5. Stage 2: Concept Evaluator

**Purpose:** Score, rank, and select the top 3 concept candidates.

**File:** `src/llm/concept-evaluator.ts`
**Prompt:** `src/llm/prompts/concept-evaluator-prompt.ts`
**Schema:** `src/llm/schemas/concept-evaluator-schema.ts`

### 5.1 Input

```typescript
interface ConceptEvaluatorContext {
  readonly concepts: readonly ConceptSpec[];  // 6-8 from ideator
  readonly userSeeds: ConceptSeedInput;       // For relevance checking against user intent
}
```

### 5.2 Output

```typescript
interface ConceptEvaluationResult {
  readonly evaluatedConcepts: readonly EvaluatedConcept[]; // Top 3, ranked by overallScore
  readonly rawResponse: string;
}
```

### 5.3 Prompt Design Principles

The system prompt establishes the LLM as a "strict evaluator for branching interactive narrative concepts."

Key prompt sections:
1. **Role**: You are an evaluator, NOT a creator. Score honestly. Do not inflate.
2. **Scoring rubric**: For each of the 6 dimensions, provide the 0-5 scale with concrete descriptions of what each score level means (adapted from the research doc's rubrics)
3. **Evidence requirement**: Each score must be backed by 1-3 bullet points of evidence referencing the concept's actual fields
4. **Selection criteria**: Return the top 3 by weighted score. If fewer than 3 pass thresholds, return what passes with warnings.
5. **Tradeoff framing**: For each selected concept, explain what the user gains and what they give up

The user prompt provides all concept candidates as numbered JSON objects plus the original user seeds for relevance assessment.

### 5.4 Separation of Concerns

The evaluator NEVER modifies or "improves" concepts. It only scores and selects. This preserves the ideator's creative output while applying independent judgment — the same separation as the planner (creates plan) vs. analyst (evaluates scene).

## 6. Stage 3: Concept Stress-Tester (Optional)

**Purpose:** Adversarial critique of the selected concept to harden it before downstream generation.

**File:** `src/llm/concept-stress-tester.ts`
**Prompt:** `src/llm/prompts/concept-stress-tester-prompt.ts`
**Schema:** `src/llm/schemas/concept-stress-tester-schema.ts`

### 6.1 Input

```typescript
interface ConceptStressTesterContext {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;     // So it knows which dimensions are weak
  readonly weaknesses: readonly string[];       // From evaluator
}
```

### 6.2 Output

```typescript
interface ConceptStressTestResult {
  readonly hardenedConcept: ConceptSpec;        // Same shape, tightened content
  readonly driftRisks: readonly DriftRisk[];
  readonly playerBreaks: readonly PlayerBreak[];
  readonly rawResponse: string;
}

interface DriftRisk {
  readonly risk: string;
  readonly mitigation: string;
  readonly mitigationType: 'STATE_CONSTRAINT' | 'WORLD_AXIOM' | 'SCENE_RULE' | 'RETRIEVAL_SCOPE';
}

interface PlayerBreak {
  readonly scenario: string;
  readonly handling: string;
  readonly constraintUsed: string;   // Which existing constraint handles this
}
```

### 6.3 Prompt Design Principles

The system prompt establishes the LLM as an "adversarial story architect" — its job is to BREAK the concept, not praise it.

Key prompt sections:
1. **Drift analysis**: Find ways the LLM could lose track of world rules, contradict constraints, or generate incoherent consequences
2. **Player-break analysis**: Model extreme but plausible player behavior (side with antagonist, refuse the call, focus on side activities, try to game the system)
3. **Strengthening directives**: For each risk/break, propose a concrete tightening to the concept's constraints, axioms, or institutional descriptions
4. **Weak dimension focus**: Specifically improve dimensions that scored below 3

## 7. UI/UX Specification

### 7.1 New Route Structure

```
GET  /stories/new              → Renders concept seed form + existing form (hidden initially)
POST /stories/generate-concepts → AJAX: Run Stage 1 + Stage 2, return top 3 concepts
POST /stories/stress-test-concept → AJAX: Run Stage 3 on selected concept (optional)
```

The existing routes remain unchanged:
```
POST /stories/generate-spines  → (existing) Generate 3 spine options
POST /stories/create-ajax      → (existing) Create story with selected spine
```

### 7.2 New Story Page Flow

The `/stories/new` page gains a new first step before the existing form:

**Step 1: Concept Seeds** (new section at top of page)
- Seed input fields (genre vibes, mood, content prefs, thematic interests, spark line)
- "Generate Concepts" button
- Progress spinner with stage phrases (like existing spine/story generation)

**Step 2: Concept Selection** (appears after concepts generated)
- 3 concept cards (same UX pattern as spine cards) showing:
  - One-line hook (headline)
  - Elevator paragraph
  - Genre frame + conflict axis badges
  - Protagonist role (subtitle)
  - Score radar/bar chart (6 dimensions)
  - Tradeoff summary
- "Harden this concept" checkbox/toggle
- Click to select → runs stress-test if toggled → pre-fills form

**Step 3: Story Details** (existing form, now pre-filled)
- characterConcept pre-filled from protagonist seed
- worldbuilding pre-filled from world kernel
- tone pre-filled from genre frame
- NEW: Additional concept context fields displayed (read-only or editable):
  - Core conflict loop
  - Stakes (personal + systemic)
  - Action verb palette
  - Deadline mechanism
- "Generate Spine" button → existing flow

**Alternative path:** User can skip concept generation entirely and fill the form manually (preserving the existing flow for users who already have a concept in mind). A "Skip — I have my own concept" link below the seed form.

### 7.3 Progress Stages

New generation stages for the progress spinner:

```typescript
// Add to existing GenerationStage type
'GENERATING_CONCEPTS'   // Stage 1: Concept ideation
'EVALUATING_CONCEPTS'   // Stage 2: Concept evaluation
'STRESS_TESTING_CONCEPT' // Stage 3: Optional stress-test
```

Stage display names and phrase pools follow the existing pattern in `public/js/src/01-constants.js`.

### 7.4 Client-Side JavaScript

New source files in `public/js/src/`:
- `03b-concept-progress.js` — Concept generation progress tracking (or extend existing `03-loading-progress.js`)
- `04d-concept-renderer.js` — Concept card rendering and selection
- `09-controllers.js` — Extend `initNewStoryPage()` with concept generation flow

After editing, regenerate `app.js` via `node scripts/concat-client-js.js`.

## 8. Integration with Existing Pipeline

### 8.1 Form Pre-fill Mapping

| Concept Field | → Form Field | Transform |
|---|---|---|
| `protagonistRole` + `coreCompetence` + `coreFlaw` | `characterConcept` | Join as paragraph |
| `settingAxioms` + `constraintSet` + `keyInstitutions` | `worldbuilding` | Join as structured paragraphs |
| `genreFrame` + `genreSubversion` | `tone` | Convert to prose description |
| (not generated) | `npcs` | Empty — user adds manually or skips |
| (not generated) | `startingSituation` | Empty — user writes or derived from concept |
| (not generated) | `title` | Empty — user provides |

### 8.2 New Context Fields

Fields from the concept that don't map to existing form fields but should enrich downstream generation:

```typescript
interface ConceptContext {
  readonly oneLineHook: string;
  readonly coreConflictLoop: string;
  readonly conflictAxis: ConflictAxis;
  readonly pressureSource: string;
  readonly stakesPersonal: string;
  readonly stakesSystemic: string;
  readonly deadlineMechanism: string;
  readonly actionVerbs: readonly string[];
  readonly branchingPosture: BranchingPosture;
  readonly stateComplexity: StateComplexity;
  readonly settingScale: SettingScale;
}
```

**How this feeds downstream:**
- The `SpinePromptContext` interface would be extended with an optional `conceptContext?: ConceptContext` field
- The spine prompt builder uses this to provide richer guidance: "The concept's core conflict loop is X, so spine options should embody this tension"
- The entity decomposer receives it as additional context for worldbuilding atomization
- The structure generator uses branchingPosture and stateComplexity as pacing hints

These downstream prompt enrichments are **follow-up work** — the initial implementation focuses on the concept generator itself and the form pre-fill. The spine/entity decomposer/structure prompts can be enriched incrementally.

### 8.3 Story Model Changes

The `Story` interface gains an optional field:

```typescript
interface Story {
  // ... existing fields ...
  readonly conceptSpec?: ConceptSpec;  // The selected concept, if generated
}
```

This is stored on the story for traceability — downstream prompts can reference it, and the briefing page can display the concept's hook and elevator paragraph.

## 9. New Files to Create

Following established patterns (see existing generator file structure):

```
src/llm/
  concept-generator-types.ts         # Shared types: ConceptSpec, enums, result types
  concept-ideator.ts                 # Stage 1: generate concepts
  concept-evaluator.ts               # Stage 2: score and rank
  concept-stress-tester.ts           # Stage 3: optional hardening
  prompts/
    concept-ideator-prompt.ts        # Stage 1 prompt builder
    concept-evaluator-prompt.ts      # Stage 2 prompt builder
    concept-stress-tester-prompt.ts  # Stage 3 prompt builder
  schemas/
    concept-ideator-schema.ts        # Stage 1 JSON schema
    concept-evaluator-schema.ts      # Stage 2 JSON schema
    concept-stress-tester-schema.ts  # Stage 3 JSON schema

src/config/
  stage-model.ts                     # Add 'conceptIdeator' | 'conceptEvaluator' | 'conceptStressTester' to LlmStage

src/server/
  routes/stories.ts                  # Add POST /stories/generate-concepts and POST /stories/stress-test-concept
  services/concept-service.ts        # Orchestrate the concept generation pipeline

src/models/
  concept-spec.ts                    # ConceptSpec and related types (or in concept-generator-types.ts)
  story.ts                           # Add optional conceptSpec field

public/js/src/
  04d-concept-renderer.js            # Concept card rendering
  09-controllers.js                  # Extend with concept generation flow

src/server/views/pages/
  new-story.ejs                      # Add concept seed form and concept cards section
```

## 10. Existing Code to Reuse

| Utility | Location | Usage |
|---|---|---|
| `withRetry` | `src/llm/retry.ts` | Wrap all LLM calls |
| `LLMError` | `src/llm/llm-client-types.ts` | Error handling |
| `parseMessageJsonContent` | `src/llm/http-client.ts` | Parse LLM responses |
| `readJsonResponse` | `src/llm/http-client.ts` | Extract response data |
| `readErrorDetails` | `src/llm/http-client.ts` | HTTP error details |
| `CONTENT_POLICY` | `src/llm/content-policy.ts` | Content policy injection |
| `buildToneDirective` | `src/llm/prompts/sections/shared/tone-block.ts` | Tone section building |
| `logPrompt` | `src/logging/` | Prompt logging |
| `getStageModel` | `src/config/stage-model.ts` | Per-stage model selection |
| `getConfig` | `src/config/` | Configuration access |
| `GenerationProgressService` | `src/server/services/` | Progress tracking |
| `wrapAsyncRoute` | `src/server/utils/` | Async route wrapping |
| Spine card rendering pattern | `public/js/src/04b-spine-renderer.js` | UI card pattern to replicate |

## 11. Testing Strategy

Follow existing patterns:

**Unit tests** (`test/unit/`):
- `concept-ideator.test.ts`: Mock LLM response, verify parse logic, test diversity constraints
- `concept-evaluator.test.ts`: Mock LLM response, verify scoring/ranking, test threshold logic
- `concept-stress-tester.test.ts`: Mock LLM response, verify hardening output
- `concept-generator-types.test.ts`: Type guard functions for all enums

**Integration tests** (`test/integration/`):
- `concept-pipeline.test.ts`: Full ideation → evaluation flow with mocked LLM
- `concept-routes.test.ts`: HTTP route tests for generate-concepts and stress-test-concept

**E2E tests** (`test/e2e/`):
- `concept-flow.test.ts`: Full user journey from seed input to concept selection to spine generation

## 12. Verification Plan

1. **Type-check**: `npm run typecheck` passes with all new types
2. **Lint**: `npm run lint` passes on all new files
3. **Unit tests**: All concept generator tests pass
4. **Integration test**: Mock LLM → call generate-concepts endpoint → verify 3 concept cards returned with valid scores
5. **Manual E2E**:
   - Visit localhost:3000 → Start New Adventure
   - Enter seed: genre vibes "dark sci-fi", mood "melancholic tense"
   - Click Generate Concepts → see spinner → see 3 concept cards
   - Click a concept → form pre-fills
   - Toggle "Harden" → stress-test runs → form updates
   - Click "Generate Spine" → existing flow works
   - Play through the story → verify concept context enriches narrative quality

## 13. Implementation Phasing

Given the scope, this epic should be broken into tickets:

1. **Types and enums**: Create `concept-generator-types.ts` with all types, enums, type guards
2. **Stage 1 - Concept Ideator**: Prompt, schema, generator, parse logic, unit tests
3. **Stage 2 - Concept Evaluator**: Prompt, schema, generator, parse logic, unit tests
4. **Stage 3 - Concept Stress-Tester**: Prompt, schema, generator, parse logic, unit tests
5. **Pipeline orchestration**: `concept-service.ts` orchestrating stages 1-3, route handlers
6. **UI - Seed form and concept cards**: New story page modifications, client JS
7. **Integration - Form pre-fill and downstream context**: Mapping concept to form fields, optional spine prompt enrichment
8. **Stage registration and progress**: Add LlmStage entries, progress spinner phrases
9. **Integration and E2E tests**: Full pipeline and route testing

## Outcome

- **Completion date**: 2026-02-18
- **What was implemented**:
  - Concept ideator/evaluator/stress-tester stages, schemas, prompts, and shared concept model support are present in the codebase.
  - Concept generation routes, service orchestration, UI flow, progress stages, and story model persistence are implemented.
  - Additional integration/E2E tests for concept pipeline/service wiring/persistence were completed in CONGEN-09.
- **Deviation from original plan**:
  - Integration and E2E verification emphasized existing repository test architecture (handler-level integration/E2E with mocked LLM boundaries) rather than adding duplicate browser-E2E for already unit-covered client behavior.
- **Verification summary**:
  - Full project validation passes: `npm run typecheck`, `npm run lint`, `npm test`.
