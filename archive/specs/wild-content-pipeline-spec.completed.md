# Wild Content Pipeline Spec

**Status**: COMPLETED

## Core Diagnosis

The current concept pipeline is excellent at:
- abstract dramatic propositions (kernels, with ideator/evaluator/evolver)
- structured concept identity (concept seeder -> architect -> engineer)
- post-hoc evaluation, verification, and adversarial hardening (evaluator + verifier + stress tester)
- evolution via mutation strategies (concept evolver + evolver-seeder)
- single-concept development paths (concept-single-engineer + concept-single-evaluator + concept-single-verifier)

What it does **not** explicitly optimize for is **wild concrete imaginative payloads**: the impossible beings, grotesque transformations, absurd institutions, forbidden relationships, uncanny jobs, public policies, invasive ecologies, and signature images that make a premise feel unforgettable before the story is even built.

## The Missing Artifact Class

Add a new artifact class parallel to kernels:

- **Kernel** = abstract dramatic proposition
- **Content Packet** = concrete imaginative payload
- **Concept** = synthesis of kernel + content packet + protagonist/world/conflict machinery

A strong content packet should contain:
1. a concrete impossible thing
2. an ordinary human domain it violates
3. a human ache/desire/shame/lust/grief at the center
4. a social or institutional consequence
5. a branching dilemma
6. an escalation path
7. an unforgettable image
8. a `wildnessInvariant` that downstream stages are forbidden to sand off

## Recommended Pipeline

```text
User exemplars / mood / content prefs
    -> Content Taste Distiller (optional but strong)
    -> Sparkstormer (raw divergent sparks)
    -> Content Packeter (expands top sparks into usable content packets)
    -> Content Evaluator (scores / filters / labels)

Selected kernel(s) + selected content packet(s)
    -> Concept Seeder (6-8 seeds)
    -> Concept Architect (character/world)
    -> Concept Engineer (pressure/stakes/irony)
    -> Concept Evaluator (7 scoring dimensions + deep eval)
    -> Concept Verifier (Specificity phase + Scenario phase)
    -> [optional] Concept Stress Tester (adversarial hardening)
    -> [optional] Concept Evolver (mutation from parents)
```

> **Correction**: The original diagram omitted the Stress Tester, Evolver, and single-concept paths that already exist in the codebase. The above reflects the actual pipeline.

---

## Stage 0a -- Content Taste Distiller

### Purpose
Infer the user's imaginative DNA from exemplar ideas without copying the exemplar nouns.

### Content Policy
This prompt MUST include the NC-21 `CONTENT_POLICY` section via `content-policy.ts`. The taste distiller must not self-censor when analyzing the user's appetites for dark, grotesque, sexual, violent, or transgressive material.

### Output Shape

```json
{
  "tasteProfile": {
    "collisionPatterns": ["string"],
    "favoredMechanisms": ["string"],
    "humanAnchors": ["string"],
    "socialEngines": ["string"],
    "toneBlend": ["string"],
    "sceneAppetites": ["string"],
    "antiPatterns": ["string"],
    "surfaceDoNotRepeat": ["string"],
    "riskAppetite": "LOW|MEDIUM|HIGH|MAXIMAL"
  }
}
```

### System Prompt

```text
You are an imaginative taste distiller for branching fiction. Given exemplar ideas, infer the user's recurring appetites at the level of collision patterns, tonal blend, social engines, protagonist types, taboo bands, and image logic.

Do NOT praise the ideas. Do NOT copy surface nouns. Distill the generative DNA beneath them.

RULES:
- Separate deep patterns from surface elements.
- surfaceDoNotRepeat should capture concrete nouns/creatures/jobs/settings from the exemplars that later stages should avoid repeating directly.
- antiPatterns should name the kinds of bland outputs that would betray this taste profile.
- riskAppetite reflects how far the examples lean toward dangerous, lurid, grotesque, taboo, or anti-heroic material.
- Keep every field specific and useful for downstream ideation.
```

### User Prompt

```text
Distill the user's imaginative taste from the exemplar ideas below.

EXEMPLAR IDEAS:
{{array of user-provided ideas}}

{{optional mood / genre / content preference block}}

OUTPUT REQUIREMENTS:
- Return JSON matching exactly: { "tasteProfile": { ... } }
- Do not repeat the exemplar ideas back in paraphrase.
- collisionPatterns, favoredMechanisms, humanAnchors, socialEngines, toneBlend, sceneAppetites, antiPatterns, and surfaceDoNotRepeat must each contain 4-8 specific items.
```

## Stage 0b -- Sparkstormer

### Purpose
Generate raw, high-temperature imaginative sparks before structure sandpapers them down.

### Content Policy
This prompt MUST include the NC-21 `CONTENT_POLICY` section via `content-policy.ts`. As a generative stage producing raw imaginative material, the Sparkstormer must be free to produce sparks involving violence, sexuality, body horror, transgression, and taboo without self-censorship.

### Output Shape

```json
{
  "sparks": [
    {
      "sparkId": "spark_1",
      "contentKind": "ENTITY|INSTITUTION|RELATIONSHIP|TRANSFORMATION|WORLD_INTRUSION|RITUAL|POLICY|JOB|SUBCULTURE|ECONOMY",
      "spark": "string",
      "imageSeed": "string",
      "collisionTags": ["string"]
    }
  ]
}
```

### System Prompt

```text
You are a divergent imagination engine for branching interactive fiction. Generate raw sparks, not polished concepts, not plots, and not world summaries.

A raw spark is a compact blast of story matter: an impossible thing colliding with an ordinary human domain in a way that implies desire, danger, social consequence, and branching play.

RULES:
- Each spark must contain a concrete impossible thing, a human stake, and a social frame.
- Prefer specific nouns and mechanisms over abstract adjectives.
- Dangerous sincerity beats glib parody.
- Do not explain the spark into safety.
- Do not reuse surface nouns from the taste profile's surfaceDoNotRepeat list.
- Reject generic output such as secret cult, chosen one, magical artifact, ancient evil, dystopian regime, forbidden power, mysterious girl, hidden laboratory unless brutally specified into something unmistakable.
- Half the sparks should contain structural irony: the thing that solves a problem creates a worse one.

DIVERSITY:
- Return 30-40 sparks.
- Use at least 7 distinct contentKind values.
- Mix intimate, civic, and civilizational scale.
- Mix mechanisms: transformation, policy, romance, medicine, labor, ecology, ritual, invasion, art, religion, reproduction.
```

### User Prompt

```text
Generate raw imaginative sparks from the taste profile below.

TASTE PROFILE:
{{JSON tasteProfile}}

{{optional kernel block}}
{{optional user content preferences}}

OUTPUT REQUIREMENTS:
- Return JSON: { "sparks": [ ... ] }
- Every spark must be 1-2 sentences max.
- Every spark must be meaningfully distinct.
- Do not output finished story concepts.
```

## Stage 0c -- Content Packeter

### Purpose
Turn the best sparks into load-bearing content packets usable by concept generation.

### Content Policy
This prompt MUST include the NC-21 `CONTENT_POLICY` section via `content-policy.ts`. As a generative stage that expands sparks into full packets, the Packeter must preserve and operationalize transgressive, violent, sexual, or grotesque elements without dilution.

### Output Shape

```json
{
  "packets": [
    {
      "contentId": "content_1",
      "sourceSparkIds": ["spark_1"],
      "contentKind": "ENTITY|INSTITUTION|RELATIONSHIP|TRANSFORMATION|WORLD_INTRUSION|RITUAL|POLICY|JOB|SUBCULTURE|ECONOMY",
      "coreAnomaly": "string",
      "humanAnchor": "string",
      "socialEngine": "string",
      "choicePressure": "string",
      "signatureImage": "string",
      "escalationPath": "string",
      "wildnessInvariant": "string",
      "dullCollapse": "string",
      "interactionVerbs": ["string"]
    }
  ]
}
```

### System Prompt

```text
You are a wild content architect for branching interactive fiction. You take raw sparks and turn them into usable content packets that can anchor concepts.

A content packet is not a finished concept. It is a concrete imaginative payload with enough human, social, and interactive force to seed multiple concepts.

QUALITY RULES:
- coreAnomaly: the impossible or uncanny element in one precise sentence.
- humanAnchor: the kind of person whose life becomes emotionally entangled with the anomaly.
- socialEngine: the institution, market, ritual, policy, subculture, criminal system, family structure, or public norm that grows around the anomaly.
- choicePressure: the kind of branching dilemma this packet naturally forces.
- signatureImage: one unforgettable visual that could sell the premise by itself.
- escalationPath: how the packet becomes bigger, stranger, or more destructive over time.
- wildnessInvariant: the single thing later stages MUST preserve and operationalize.
- dullCollapse: what generic story this becomes if the invariant is removed or watered down.
- interactionVerbs: 4-6 verbs the player could plausibly do around this packet.

CRITICAL:
- Weirdness must be load-bearing, not decorative.
- Each packet must imply scenes and choices, not just lore.
- Do not flatten sparks into generic genre language.
- Do not copy surface nouns from the taste profile.

DIVERSITY:
- Return 12-16 packets.
- Use at least 6 different contentKind values.
- Ensure multiple scales and tonal textures.
```

### User Prompt

```text
Expand the best raw sparks into content packets.

TASTE PROFILE:
{{JSON tasteProfile}}

RAW SPARKS:
{{JSON spark array}}

{{optional kernel block}}
{{optional user content preferences}}

OUTPUT REQUIREMENTS:
- Return JSON: { "packets": [ ... ] }
- Exactly 12-16 packets.
- Each packet must be strong enough to seed a story concept.
- interactionVerbs must contain 4-6 distinct verbs.
```

## Stage 0d -- Content Evaluator

### Purpose
Label packets by role so the system can distinguish primary seed material from decorative weirdness. This is a lightweight filter, not a full scorer -- packets will be re-evaluated implicitly through concept evaluation downstream.

### Content Policy
This prompt MUST include the NC-21 `CONTENT_POLICY` section via `content-policy.ts`. The evaluator must not penalize packets for transgressive, violent, or sexual content.

### Suggested Scoring Dimensions

- **imageCharge**: Is there an unforgettable concrete visual?
- **humanAche**: Is there a live emotional wound/desire/shame/love inside the weirdness?
- **socialLoadBearing**: Does the anomaly create institutions, incentives, public consequences, or power structures?
- **branchingPressure**: Does it naturally force meaningful choices?
- **antiGenericity**: Could this be mistaken for stock genre material?
- **sceneBurst**: Does it immediately imply multiple vivid scenes?
- **structuralIrony**: Is there a contradiction baked into the content itself?
- **conceptUtility**: Is this usable as a primary concept seed rather than just a decorative flourish?

### Role Labels

Have the evaluator assign one of:
- `PRIMARY_SEED`
- `SECONDARY_MUTAGEN`
- `IMAGE_ONLY`
- `REJECT`

### Output Shape

```json
{
  "evaluations": [
    {
      "contentId": "content_1",
      "scores": {
        "imageCharge": 0,
        "humanAche": 0,
        "socialLoadBearing": 0,
        "branchingPressure": 0,
        "antiGenericity": 0,
        "sceneBurst": 0,
        "structuralIrony": 0,
        "conceptUtility": 0
      },
      "strengths": ["string"],
      "weaknesses": ["string"],
      "recommendedRole": "PRIMARY_SEED"
    }
  ]
}
```

---

## Minimal One-Shot Prompt (Default Path)

The one-shot prompt should be the **default** content generation path, not the fallback. The full 4-stage pipeline (Taste Distiller -> Sparkstormer -> Packeter -> Evaluator) is the premium/thorough path for users who want deeper creative exploration. Most users should start with the one-shot.

### Content Policy
This prompt MUST include the NC-21 `CONTENT_POLICY` section via `content-policy.ts`.

### System Prompt

```text
You are a wild-content ideator for branching interactive fiction. Generate story matter, not finished concepts, not plots, and not lore summaries.

Story matter means concrete imaginative payloads: impossible beings, invasive social systems, grotesque transformations, forbidden relationships, uncanny jobs, public policies, rituals, rivalries, ecologies, and world intrusions that can later seed concepts.

QUALITY RULES:
- Every item must contain:
  1. a concrete impossible thing
  2. an ordinary human domain it violates
  3. a human ache or desire
  4. a social or institutional consequence
  5. a branching dilemma
  6. an escalation path
  7. an unforgettable image
- Weirdness must be load-bearing, not decorative.
- Prefer specific nouns and mechanisms over abstract adjectives.
- Dangerous sincerity beats glib parody.
- Do not output generic scaffolding: chosen one, secret order, ancient prophecy, dark lord, mysterious artifact, hidden conspiracy, save the world, magical empire, forbidden power.
- Do not copy the exemplar ideas' surface nouns, creatures, jobs, countries, or plot beats. Extrapolate the deeper taste behind them.
- At least half the items should contain structural irony.

DIVERSITY:
- Generate 18 items.
- Use at least 6 distinct content kinds.
- Mix intimate, civic, and civilizational scale.
- Mix mechanisms: transformation, bureaucracy, romance, medicine, labor, ecology, ritual, invasion, art, religion, reproduction.

OUTPUT:
Return JSON with shape:
{
  "packets": [
    {
      "title": "string",
      "contentKind": "ENTITY|INSTITUTION|RELATIONSHIP|TRANSFORMATION|WORLD_INTRUSION|RITUAL|POLICY|JOB|SUBCULTURE|ECONOMY",
      "coreAnomaly": "string",
      "humanAnchor": "string",
      "socialEngine": "string",
      "choicePressure": "string",
      "signatureImage": "string",
      "escalationHint": "string",
      "wildnessInvariant": "string",
      "dullCollapse": "string"
    }
  ]
}
```

### User Prompt

```text
Infer my imaginative taste from the exemplar ideas below, but do not copy their surface elements. Generate content packets that belong to the same creative appetite while still feeling original.

EXEMPLAR IDEAS:
{{array of user-provided ideas}}

{{optional genre vibes / mood keywords / content prefs}}
{{optional kernel block}}

OUTPUT REQUIREMENTS:
- Return exactly 18 packets.
- Every packet must be strong enough to inspire a story concept by itself.
- No packet may feel like generic fantasy, generic sci-fi, or generic horror with a cosmetic gimmick.
```

---

## Integration Into Existing Concept Pipeline

### Concept Seeder Changes

Add an optional `CONTENT PACKETS` block to the seeder prompt context.

New requirements:
- Each concept seed may reference a `primaryContentId` from the selected packets.
- Each concept seed may optionally fuse a `secondaryContentId`.
- The concept must preserve the packet's `wildnessInvariant`.
- The seed must carry forward a `signatureImageHook` derived from the packet.

#### Context Extension (not ConceptSeedFields)

> **Correction**: The original spec proposed adding `primaryContentId`, `secondaryContentIds`, `preservedInvariant`, and `signatureImageHook` directly to `ConceptSeedFields`. However, `ConceptSeedFields` is defined as `Pick<ConceptSpec, ...>` and cannot be extended with fields that don't exist on `ConceptSpec`. Instead, content packet references should be passed as context in `ConceptSeederContext`.

Add to `ConceptSeederContext`:

```typescript
export interface ConceptSeederContext {
  // ... existing fields ...
  readonly contentPackets?: readonly ContentPacket[];
}
```

The seeder prompt builder then injects a `CONTENT PACKETS` section when `contentPackets` is provided. The LLM is instructed to ground seeds in packet material, but the packet IDs are prompt-level context, not persisted on `ConceptSeedFields`.

The actual type names from the codebase:
- `GenreFrame` (not `GENRE_ENUM`) -- defined in `src/models/concept-generator.ts`
- `ConflictAxis` (not `AXIS_ENUM`) -- defined in `src/models/conflict-taxonomy.ts`
- `ConflictType` (not `TYPE_ENUM`) -- defined in `src/models/conflict-taxonomy.ts`

### Concept Architect Changes

Prompt additions (when content packets are in context):
- `settingAxioms` must operationalize the packet's impossible rule
- at least one `keyInstitution` must emerge from the packet's `socialEngine`
- `coreConflictLoop` must put pressure on the packet's `choicePressure`
- do not normalize the packet into stock genre dressing

### Concept Engineer Changes

Prompt additions (when content packets are in context):
- `pressureSource`, `incitingDisruption`, or `ironicTwist` must emerge directly from the packet's `socialEngine` or `escalationPath`
- `elevatorParagraph` must preserve the packet's signature image or invariant
- `protagonistLie` / `protagonistTruth` should collide with the packet's contradiction

### Concept Evaluator Changes

> **Correction**: The original spec proposed adding `contentCharge` as an 8th scoring dimension. This is a significant cascade requiring updates to 8+ files. This section documents the full impact.

Adding a new scoring dimension `contentCharge` requires updating:

| File | What Changes |
|------|-------------|
| `src/models/concept-generator.ts` | `ConceptDimensionScores` interface -- add `contentCharge: number` |
| `src/models/concept-generator.ts` | `ConceptScoreEvidence` interface -- add `contentCharge: readonly string[]` |
| `src/models/concept-generator.ts` | `CONCEPT_SCORING_WEIGHTS` -- add `contentCharge: N` (rebalance all weights to sum to 100) |
| `src/models/concept-generator.ts` | `CONCEPT_PASS_THRESHOLDS` -- add `contentCharge: N` |
| `src/models/concept-generator.ts` | `computeOverallScore()` -- add `contentCharge` term |
| `src/models/concept-generator.ts` | `passesConceptThresholds()` -- add `contentCharge` check |
| `src/models/saved-concept.ts` | `isConceptDimensionScores()` guard -- add `contentCharge` validation |
| `src/models/saved-concept.ts` | `isScoreEvidence()` guard -- add `contentCharge` validation |
| `src/llm/schemas/concept-evaluator-schema.ts` | JSON Schema -- add `contentCharge` to both scoring and evidence objects |
| `src/llm/prompts/concept-evaluator-prompt.ts` | Prompt text -- add `contentCharge` rubric (phase 1 + phase 2) |
| `src/persistence/concept-payload-parser.ts` | Upcast hook -- default `contentCharge` for legacy `SavedConcept` payloads |
| All test mocks | Any mock with `ConceptDimensionScores` needs `contentCharge` |

Suggested rubric for `contentCharge`:
- 0-1: mostly abstract or stock genre with cosmetic weirdness
- 2-3: one decent differentiator, but it could still be reskinned into generic genre
- 4-5: contains one or more unforgettable concrete impossibilities that drive institutions, dilemmas, and scenes

### Verifier Phase 1 (Specificity) Changes

> **Correction**: The original spec referred to a "Specificity Analyzer" as a separate stage. In the codebase, Specificity and Scenario are two phases of a single `concept-verifier.ts` that uses `runTwoPhaseLlmStage()`. The phases are:
> - Phase 1: Specificity analysis (`concept-specificity-prompt.ts` + `concept-specificity-schema.ts`)
> - Phase 2: Scenario analysis (`concept-scenario-prompt.ts` + `concept-scenario-schema.ts`)

Extend the negative test in the Specificity phase:
- **Add** an invariant-removal test: Remove the `preservedInvariant` or primary content packet. Does the story collapse into generic genre?
- This test is **additive** to the existing load-bearing check (which removes `genreSubversion + coreFlaw + coreConflictLoop`). Both checks should run.

> **Correction**: The original spec implied the invariant-removal test **replaces** the existing load-bearing check. The existing check (removing `genreSubversion + coreFlaw + coreConflictLoop`) is a proven specificity signal and must be preserved. The invariant-removal test is an additional, sharper test that runs alongside it.

### Verifier Phase 2 (Scenario) Changes

Require (when content packets are in context):
- at least 2 of the escalating setpieces must directly exploit the content packet's `signatureImageHook` or `escalationPath`
- at least 1 setpiece must show the packet's `socialEngine` in action

---

## Concept Evolver Integration

> **Addition**: The original spec did not address integration with the existing Concept Evolver (`src/llm/concept-evolver.ts` + `src/llm/concept-evolver-seeder.ts`).

### Evolver-Seeder Context Extension

Add optional `contentPackets` to `ConceptEvolverSeederContext`:

```typescript
export interface ConceptEvolverSeederContext {
  // ... existing fields ...
  readonly contentPackets?: readonly ContentPacket[];
}
```

### New Mutation Strategy: Content Injection

The evolver-seeder prompt currently generates 6 mutated seeds from parent concepts. Add a new mutation strategy:

- **CONTENT_INJECTION**: Replace or add a content packet to a parent concept, forcing the seed to re-ground its hook, subversion, and conflict in the new packet's material while preserving the kernel's dramatic proposition.

This enables the "repair path for dull concepts" use case described in the Evolution / Repair section.

### Wildness Invariant Preservation

When a parent concept has a `wildnessInvariant` (inherited from a content packet), the evolver must treat it as a hard constraint during mutation. The evolver-seeder prompt should include:
- A `WILDNESS INVARIANTS` section listing invariants from parent concepts
- An instruction that evolved seeds must preserve or intensify (never dilute) these invariants

---

## Concept Stress Tester Integration

> **Addition**: The original spec did not address integration with the existing Concept Stress Tester (`src/llm/concept-stress-tester.ts`).

### Invariant Erosion Test

When a concept was seeded from a content packet with a `wildnessInvariant`, the stress tester should check whether the invariant has been diluted during the hardening process. Add to the stress tester prompt:

- Compare the pre-hardened concept's relationship to the invariant against the hardened concept's
- Flag if the hardened concept has normalized, genericized, or removed the invariant's concrete specificity

### Dull Collapse Comparison

The content packet's `dullCollapse` field describes what generic story the concept becomes if the invariant is removed. The stress tester already produces a `genericCollapse` field in its `LoadBearingCheck`. Compare the packet's `dullCollapse` against the stress tester's `genericCollapse` -- if they match, the concept has collapsed despite nominally passing.

### New DriftRiskMitigationType Value

Add `WILDNESS_INVARIANT` to the `DRIFT_RISK_MITIGATION_TYPES` array in `src/models/concept-generator.ts`:

```typescript
export const DRIFT_RISK_MITIGATION_TYPES = [
  'STATE_CONSTRAINT',
  'WORLD_AXIOM',
  'SCENE_RULE',
  'RETRIEVAL_SCOPE',
  'WILDNESS_INVARIANT',  // NEW
] as const;
```

This allows drift risks to be mitigated specifically by referencing the wildness invariant.

---

## Service Layer Design

> **Addition**: The original spec did not address the service layer.

### ContentService Interface

Following the pattern established by `ConceptService` in `src/server/services/concept-service.ts`:

```typescript
export interface ContentService {
  distillTaste(input: DistillTasteInput): Promise<TasteProfile>;
  generateSparks(input: GenerateSparksInput): Promise<SparkstormerResult>;
  packageContent(input: PackageContentInput): Promise<ContentPacketerResult>;
  evaluatePackets(input: EvaluatePacketsInput): Promise<ContentEvaluatorResult>;
  generateContentPipeline(input: FullPipelineInput): Promise<ContentPipelineResult>;
  generateContentQuick(input: QuickContentInput): Promise<ContentPacket[]>;
}
```

- `generateContentPipeline()` runs the full 4-stage pipeline (Taste -> Sparks -> Packets -> Evaluate)
- `generateContentQuick()` runs the one-shot prompt (default path)

---

## Persistence Design

> **Addition**: The original spec recommended treating content packets as first-class saved artifacts but did not design the persistence layer.

### SavedContentPacket Type

```typescript
export interface SavedContentPacket {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly contentKind: ContentKind;
  readonly coreAnomaly: string;
  readonly humanAnchor: string;
  readonly socialEngine: string;
  readonly choicePressure: string;
  readonly signatureImage: string;
  readonly escalationPath: string;
  readonly wildnessInvariant: string;
  readonly dullCollapse: string;
  readonly interactionVerbs: readonly string[];
  readonly pinned: boolean;
  readonly recommendedRole: ContentPacketRole;
  readonly sourceSparkIds?: readonly string[];
  readonly sourceTasteProfileId?: string;
}

export type ContentKind =
  | 'ENTITY' | 'INSTITUTION' | 'RELATIONSHIP' | 'TRANSFORMATION'
  | 'WORLD_INTRUSION' | 'RITUAL' | 'POLICY' | 'JOB' | 'SUBCULTURE' | 'ECONOMY';

export type ContentPacketRole = 'PRIMARY_SEED' | 'SECONDARY_MUTAGEN' | 'IMAGE_ONLY' | 'REJECT';
```

### SavedTasteProfile Type

```typescript
export interface SavedTasteProfile {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly tasteProfile: TasteProfile;
  readonly sourceExemplars: readonly string[];
}
```

### Repository Pattern

Following `createJsonEntityRepository` from `src/persistence/json-entity-repository.ts`:

```
content-packets/{id}.json    -- individual content packet files
taste-profiles/{id}.json     -- taste profile files
```

### Storage Structure

```
content-packets/
    {contentPacketId}.json
taste-profiles/
    {tasteProfileId}.json
```

---

## Progress Stages

> **Addition**: The original spec did not define spinner stages.

New stages for `src/config/generation-stage-metadata.json`:

| Stage ID | Display Name | Context |
|----------|-------------|---------|
| `DISTILLING_TASTE` | `TASTING` | Content taste distiller LLM call |
| `GENERATING_SPARKS` | `SPARKING` | Sparkstormer LLM call |
| `PACKAGING_CONTENT` | `PACKAGING` | Content packeter LLM call |
| `EVALUATING_CONTENT` | `FILTERING` | Content evaluator LLM call |

Each stage needs phrase pools in `generation-stage-metadata.json` following the existing pattern.

---

## Routes and UI

> **Addition**: The original spec did not address routes or client UI.

### Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/content-packets` | List all saved content packets |
| `GET` | `/content-packets/:id` | Load single content packet |
| `POST` | `/content-packets/generate` | Generate packets (quick or full pipeline) |
| `POST` | `/content-packets/:id/save` | Save a generated packet |
| `PATCH` | `/content-packets/:id/pin` | Pin/unpin a packet |
| `DELETE` | `/content-packets/:id` | Delete a packet |
| `GET` | `/taste-profiles` | List taste profiles |
| `POST` | `/taste-profiles/generate` | Generate a taste profile |

### Client JS

New source file: `public/js/src/11-content-packets.js`

---

## Evolution / Repair Use Cases

A content packet system gives a strong repair path for dull concepts:
- inject a new packet into a bland concept (via Evolver with CONTENT_INJECTION strategy)
- swap the primary packet while preserving the kernel
- add a secondary mutagen packet to intensify weirdness without rebuilding the whole concept

---

## Design Notes

1. **One-shot is the default, not the fallback.** The 4-stage pipeline is the premium/thorough path. Most users should start with the one-shot prompt and only use the full pipeline when they want deeper creative exploration.

2. **Content Evaluator is a lightweight filter.** It assigns role labels (PRIMARY_SEED, SECONDARY_MUTAGEN, etc.) and light scores, but packets will be re-evaluated implicitly through concept evaluation. Don't over-engineer the evaluator into a full scoring system parallel to the concept evaluator.

3. **Content packets are kernel-independent by default.** Packets should maximize reuse across different kernels. A packet can optionally receive kernel context to bias generation, but the stored artifact should not be tied to a specific kernel.

4. **`wildnessInvariant` propagation to the story generation pipeline is out of scope.** Carrying the invariant through planner/writer/analyst prompts is a valuable follow-up but belongs in a separate spec. This spec covers content packet generation, persistence, and concept pipeline integration only.

5. **Content packets as breeding stock.** Users should be able to browse, pin, and reuse packets across concept generations. The taste memory (SavedTasteProfile) enables the system to learn the user's creative appetites over time.

---

## Strong Recommendations

1. **Do not ask the same stage to be maximally wild and maximally evaluative.** Split divergence and judgment.
2. **Treat content packets as first-class saved artifacts.** Let users browse, pin, and breed them.
3. **Carry `wildnessInvariant` through the concept pipeline.** This is how you stop seeder/architect/engineer from sanding off the strange material.
4. **Store a taste memory.** The user's best-liked packets and accepted concepts should become future retrieval context.
5. **Run semantic novelty checks against your own archive.** Originality is not just originality versus the current prompt; it is originality versus your own catalog.

## Formula

The shortest useful formula is:

**Compelling wild content = concrete impossibility + human ache + social engine + hard choice + escalation + unforgettable image.**

---

## Outcome

- **Completion date**: 2026-03-08
- **Implemented via tickets**: WILCONPIP-01 through WILCONPIP-15
- **What was implemented**:
  - Content packet types, persistence, and repository (WILCONPIP-01, WILCONPIP-02)
  - Content taste distiller, sparkstormer, one-shot generator (WILCONPIP-03, WILCONPIP-04, WILCONPIP-05)
  - Content packeter and evaluator prompts/schemas/generation (WILCONPIP-06, WILCONPIP-07)
  - Content service, routes, and client JS (WILCONPIP-08, WILCONPIP-09)
  - Concept seeder/architect/engineer content packet context injection (WILCONPIP-10)
  - Concept evolver content injection mutation strategy (WILCONPIP-11)
  - Concept evaluator contentCharge scoring dimension (WILCONPIP-12)
  - Verifier invariant-removal load-bearing test (WILCONPIP-13)
  - WILDNESS_INVARIANT drift risk mitigation type (WILCONPIP-14)
  - Stress tester invariant erosion and dull collapse checks (WILCONPIP-15)
- **Deviations**: None significant; corrections noted inline in spec were followed
- **Verification**: All 271 test suites pass (3288 tests), typecheck clean, lint clean
