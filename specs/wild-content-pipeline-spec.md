# Wild Content Pipeline Proposal

## Core Diagnosis

Your current stack is excellent at:
- abstract dramatic propositions (kernels)
- structured concept identity (concept seeder)
- world/character operationalization (architect)
- pressure/stakes/irony machinery (engineer)
- post-hoc evaluation and specificity testing (evaluator + verifier)

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
    -> Concept Seeder
    -> Concept Architect
    -> Concept Engineer
    -> Evaluator
    -> Specificity / Scenario
```

## Stage 0a — Content Taste Distiller

### Purpose
Infer the user's imaginative DNA from exemplar ideas without copying the exemplar nouns.

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

## Stage 0b — Sparkstormer

### Purpose
Generate raw, high-temperature imaginative sparks before structure sandpapers them down.

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

## Stage 0c — Content Packeter

### Purpose
Turn the best sparks into load-bearing content packets usable by concept generation.

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

## Stage 0d — Content Evaluator

### Purpose
Score packets so the system can distinguish primary seed material from decorative weirdness.

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

## Minimal One-Shot Prompt

If you do not want the full pipeline yet, use this single prompt.

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

## Integration Into Your Existing Concept Pipeline

## Concept Seeder Changes

Add an optional `CONTENT PACKETS` block to the prompt.

New requirements:
- Each concept must use exactly 1 `primaryContentId` from the selected packets.
- Each concept may optionally fuse 1 `secondaryContentId`.
- The concept must preserve the packet's `wildnessInvariant`.
- The seed must carry forward a `signatureImageHook` derived from the packet.

### Suggested ConceptSeed Extension

```json
{
  "oneLineHook": "string",
  "genreFrame": "GENRE_ENUM",
  "genreSubversion": "string",
  "conflictAxis": "AXIS_ENUM",
  "conflictType": "TYPE_ENUM",
  "whatIfQuestion": "string",
  "playerFantasy": "string",
  "primaryContentId": "string",
  "secondaryContentIds": ["string"],
  "preservedInvariant": "string",
  "signatureImageHook": "string"
}
```

## Concept Architect Changes

Prompt additions:
- settingAxioms must operationalize the packet's impossible rule
- at least one keyInstitution must emerge from the packet's socialEngine
- coreConflictLoop must put pressure on the packet's choicePressure
- do not normalize the packet into stock genre dressing

## Concept Engineer Changes

Prompt additions:
- pressureSource, incitingDisruption, or ironicTwist must emerge directly from the packet's socialEngine or escalationPath
- elevatorParagraph must preserve the packet's signature image or invariant
- protagonistLie / Truth should collide with the packet's contradiction

## Concept Evaluator Changes

Add a scoring dimension:
- **contentCharge**: Does the concept contain concrete, memorable, load-bearing imaginative material, or only abstract genre language?

Suggested rubric:
- 0-1: mostly abstract or stock genre with cosmetic weirdness
- 2-3: one decent differentiator, but it could still be reskinned into generic genre
- 4-5: contains one or more unforgettable concrete impossibilities that drive institutions, dilemmas, and scenes

## Specificity Analyzer Changes

Extend the negative test:
- Remove the `preservedInvariant` or primary content packet. Does the story collapse into generic genre?

That is a much sharper test than only removing `genreSubversion + coreFlaw + coreConflictLoop`.

## Scenario Generator Changes

Require:
- at least 2 of the 6 escalating setpieces must directly exploit the content packet's `signatureImageHook` or `escalationPath`
- at least 1 setpiece must show the packet's socialEngine in action

## Evolution / Repair Use Cases

A content packet system also gives you a strong repair path for dull concepts:
- inject a new packet into a bland concept
- swap the primary packet while preserving the kernel
- add a secondary mutagen packet to intensify weirdness without rebuilding the whole concept

## Strong Recommendations

1. **Do not ask the same stage to be maximally wild and maximally evaluative.** Split divergence and judgment.
2. **Treat content packets as first-class saved artifacts.** Let users browse, pin, and breed them.
3. **Carry `wildnessInvariant` through the whole pipeline.** This is how you stop later stages from sanding off the strange material.
4. **Store a taste memory.** The user's best-liked packets and accepted concepts should become future retrieval context.
5. **Run semantic novelty checks against your own archive.** Originality is not just originality versus the current prompt; it is originality versus your own catalog.

## Formula

The shortest useful formula is:

**Compelling wild content = concrete impossibility + human ache + social engine + hard choice + escalation + unforgettable image.**
