# Character Web and Character Development Improvements

I fed the prompt docs from prompts/* related to character web generation and character development to ChatGPT to see if our system had issues, or if ChatGPT could determine improvements.

## ChatGPT's response

Your pipeline is already better than the usual slop. It separates cast architecture, deep objective/pressure, Egri-style body/social/mind, agency, relationships, and presentation. That is a strong skeleton. But the single biggest problem is that it still produces character dossiers, not yet full dramatic operating systems. The weak spots are visible across the current Character Web, Kernel, Agency, Relationships, Tridimensional, and Presentation stages: too much is static, too much is protagonist-relative, knowledge arrives too late, and voice is still modeled too much as surface style instead of pressure-tested idiolect plus behavior.

The direction. Forster’s useful test for a “round” character is not a binary label but whether the character can surprise in a convincing way; characterization also works through both direct and indirect cues, and later information can subvert first impressions. Bakhtinian dialogism and later narratology treat strong fiction as a plurality of distinct, unmerged voices, with voice carried by markers like subjective expression, dialect, sociolect, and idiolect. Interactive-character research likewise stresses coherence, change with experience, predictability, awareness, and social/emotional expressiveness; recent dialogue work also shows that shallow persona snippets and contradiction-only checks miss stylistic drift, while richer persona docs with speech-style examples and conversational strategies do better. ically, autonomy and coherence have to coexist, and systems that preserve long-term motivations plus dynamic memory do a better job maintaining character fidelity over time. That is exactly where your current static outputs need to evolve. r Pipeline Upgrade v2
Status: Proposed
Priority: P0/P1/P2
Scope: character-web-prompt.md, char-kernel-prompt.md, char-tridimensional-prompt.md, char-agency-prompt.md, char-relationships-prompt.md, char-presentation-prompt.md
Goal: Generate characters that are branch-resilient, locally rational, dramatically usable, and unmistakable in voice.

### 1. Core Judgment

Do not scrap the current 5-stage structure.
- Keep the skeleton.
- What needs fixing is the depth model, the state model, and the QA model.

Current pipeline strengths:

- Good decomposition into cast, dramatic kernel, Egri profile, agency, relationships, presentation.

- Good emphasis on conflict, pressure, and world grounding.

- Good use of typed outputs and staged derivation.

Current pipeline failures:

- Overly protagonist-relative cast design.

- No explicit inner contradiction / wound-defense engine.

- Agency is descriptive, but not yet branch-operational.

- Knowledge/focalization arrives too late.

- Relationship generation is not globally reconciled.

- Voice is still too surface-level and too easily reducible to gimmicks.

- No cast-level distinctiveness audit.

- No stable-vs-mutable character contract for runtime branching.

### 2. Design Goals
P0 Goals

1. Every major character must feel like a self-propelled agent, not a story instrument.

2. Every major character must have a credible surprise envelope.

3. Every major character must remain distinct under pressure, intimacy, deception, status shifts, and long-run branching.

4. The system must separate stable blueprint from mutable runtime state.

5. The pipeline must include an explicit QA/audit pass.

P1 Goals

1. Relationship records must be globally coherent across the cast.

2. Voice must vary by context and counterpart without collapsing into sameness.

3. Traits must be dramatizable, not merely descriptive.

P2 Goals

1. Automated distinctiveness scoring.

2. Automated voice attribution testing.

3. Automated knowledge leak detection.

### 3. Architectural Changes

#### 3.1 Replace "Character Web" with "Cast Pressure Map"

File affected: character-web-prompt.md

Problem

The current stage assigns story functions and lightweight relationship archetypes, but it still treats characters too much as units relative to the protagonist.

Required Change

The first stage must output a structured cast pressure map, not just a web.

New required per-character fields

- characterName

- isProtagonist

- primaryStoryFunction

- secondaryStoryFunctions[]

- developmentLoad (POV, MAJOR, SUPPORTING, ATMOSPHERIC)

- publicRole

- privateAgenda

- coreNeed

- leverageAsset

- vulnerability

- moralPosition

- absentProtagonistBehavior

- defaultTacticSeed

- voiceSeed

- differentiationKeys

-- tactic

-- value

-- statusPosture

-- speechEnergy

-- sensoryBias

New required per-relationship fields

- fromCharacter

- toCharacter

- relationshipType

- valence

- powerAsymmetry

- dependencyAsymmetry

- sharedHistoryAnchor

- taboo

- reversalPotential

- essentialTension

New required cast-level outputs

- agendaCollisionMatrix[]

- conflictTriangles[]

- allianceFaultLines[]

- secretDistribution[]

- voiceDistanceNotes[]

- branchHotspots[]

New generation rules

- Every non-protagonist major character must have a private agenda not reducible to helping, hindering, or teaching the protagonist.

- Every major character must be able to generate scenes in which the protagonist is absent.

- At least one relationship triangle must contain incompatible loyalties.

- At least one non-protagonist must be partly right in a way the protagonist would hate to admit.

- No character may exist only to explain theme or lore.

Backward compatibility

- Keep storyFunction if needed for legacy consumers, but generate primaryStoryFunction + secondaryStoryFunctions[] as the real source of truth.

- Keep characterDepth only as legacy metadata. It must no longer drive generation.

#### 3.2 Add a new Stage 1B: Inner Engine / Contradiction Model

New file: char-inner-engine-prompt.md
Pipeline position: after Character Kernel, before Tridimensional

Problem

The current kernel captures desire/opposition/stakes/constraints/pressure.
It does not explicitly model the thing that makes characters compelling:
their contradiction, defensive adaptation, shame logic, and self-sabotage pattern.

Required output

- characterName

- formativeWound

- protectiveMask

- unmetNeed

- misbelief

- shameSource

- overcompensationPattern

- selfSabotagePattern

- whatTheyAreRightAbout

- whatTheyWillNotAdmit

- credibleSurprises[]

- implausibleMoves[]

Required rules

- Every major character must have one trait that helps them survive and harms them in intimacy.

- Every major character must have one thing they are sincerely right about.

- credibleSurprises[] must be actions that initially seem out of pattern but become inevitable in light of wound, need, and pressure.

- implausibleMoves[] must define the outer boundary of character integrity.

Rationale

This stage is the missing bridge between “profile” and “person.”

#### 3.3 Expand Character Kernel into a more operational dramatic core

File affected: char-kernel-prompt.md

Keep existing fields

- superObjective

- immediateObjectives

- primaryOpposition

- stakes

- constraints

- pressurePoint

Add required fields

- unacceptableCost

- moralLine

- winningFantasy

- worstFear

- sceneObjectivePatterns[]

New rules

- superObjective must be usable both in story analysis and in scene generation.

- sceneObjectivePatterns[] must describe how this character usually tries to get what they want in concrete interactions.

- moralLine and unacceptableCost must not be duplicates.

#### 3.4 Restructure Tridimensional Profile into dramatizable evidence

File affected: char-tridimensional-prompt.md

Problem

The current physiology/sociology/psychology fields are useful but too blob-like.
They invite generic prose, stereotype filler, and details that never affect scenes.

Replace loose text fields with structured subfields
physiology

- bodyPattern

- movementRhythm

- stressTells[]

- healthConstraints[]

- selfPresentation

- bodyBasedAdvantages[]

- bodyBasedDisadvantages[]

sociology

- classPosition

- materialSituation

- occupation

- institutionalTies[]

- languageCommunity

- educationPattern

- reputation

- taboos[]

- obligations[]

psychology

- temperament

- attachmentStyle

- controlStrategy

- moralFrame

- pleasureSystem

- envyAxis

- fearAxis

- identityThreat

new proof fields

- derivationProof[]

-- each entry must link one dramatic need to one selected trait

- traitToSceneAffordances[]

-- each entry must state how the trait changes what scenes become possible or harder

- coreTraits[]

New rules

- No detail is allowed unless it affects action, judgment, status, or vulnerability.

- Protected-attribute details must not be decorative filler.

- The prompt must actively reject stereotype-shaped completion.

#### 3.5 Replace "Agency Model" with "Decision + Epistemic Model"

File affected: char-agency-prompt.md

Problem

Current agency is a decent BDI-lite sketch, but it is not enough for branching story execution.
It lacks:

- operational tactics

- update rules

- epistemic state

- trust logic

- line-crossing thresholds

- focalization filter

Keep existing fields where useful

- replanningPolicy

- emotionSalience

- coreBeliefs

- desires

- decisionPattern

Move out of static blueprint

- currentIntentions -> runtime state

- falseBeliefs -> knowledge model

Add required fields

- riskStyle

- defaultTactics[]

- escalationLadder[]

- trustHeuristics

- evidenceThresholds

- deceptionStyle

- confessionTriggers[]

- lineCrossingThresholds[]

- learningRule

- memorySalienceWeights

- focalizationFilter

-- noticesFirst

-- systematicallyMisses

-- misreadsAs

- knowledgeModel

-- knows[]

-- suspects[]

-- falselyBelieves[]

-- ignores[]

-- cannotKnow[]

- branchResponseTemplates[]

-- betrayed

-- publiclyHumiliated

-- offeredPower

-- offeredIntimacy

-- facedWithLoss

-- forcedToWait

New rules

- The model must specify what changes this character’s mind and what never will.

- Knowledge must be world-position-sensitive.

- The model must explain what this character notices in a room before speaking.

- The stage must support both scene writing and runtime simulation.

#### 3.6 Make Relationships reciprocal and stateful

File affected: char-relationships-prompt.md
New pass: char-relationship-reconciliation.ts

Problem

Current relationships are generated from the focal character outward.
That is fine for drafting, but not fine as final truth.

Required split

Relationship data must have:

1. Shared record

2. Subjective overlays

Shared record fields

- participants

- relationshipType

- sharedHistoryAnchor

- taboo

- ruptureTriggers[]

- repairMoves[]

- publicAppearance

- hiddenReality

Subjective overlay fields

- fromCharacter

- toCharacter

- desiredDistance

- trust

- fear

- resentment

- dependency

- statusAssessment

- projection

- whatThisPersonGetsWrongAboutMe

- relationalVoiceShift

Secrets model must be structured

- secret

- owner

- holders[]

- suspectedBy[]

- revealConsequences

New reconciliation pass requirements

After all characters are developed:

- unify shared history facts

- preserve subjective asymmetry

- flag contradictions that are invalid rather than dramatic

- normalize pairwise references

- compute initial relationship deltas for runtime use

#### 3.7 Split Presentation into Voice, Body, and Perception

File affected: char-presentation-prompt.md

Problem

The current presentation stage is good, but it still overweights catchphrases, samples, and register labels.
That is how you get gimmick voices instead of durable ones.

Keep existing useful fields

- dialogueSamples

- antiExamples

- metaphorFrames

- appearance

- conflictPriority

Replace / expand voice modeling
baselineVoice

- formalityRange

- directnessLevel

- speechEnergy

- politenessStrategy

- humorMode

- swearProfile

- codeSwitchRules

- verbalTics

- syntaxProfile

- lexicalObsessions[]

- topicsOfEase[]

- topicsOfAvoidance[]

- evasions[]

- lieTells[]

- silencePattern

- interruptionStyle

relationSpecificVariants[]

Each entry:

- towardCharacter

- registerShift

- directnessShift

- emotionalLeakage

- whatTheyAvoidSaying

- whatBecomesPossible

stressVariants

- underThreat

- inIntimacy

- inPublic

- whenLying

- whenAshamed

- whenWinning

bodyPresentation

- movementRhythm

- gazeHabits

- touchHabits

- publicMaskCues[]

- breakdownCues[]

perceptionPresentation

- salienceMap

- evaluationStyle

- interiorMonologueTexture

New rules

- catchphrases must be optional, capped, and never the primary basis of distinctiveness.

- Dialogue samples must be tagged by context.

- Anti-examples must explain why they are wrong for the character.

- Voice must be distinguishable across at least five contexts, not just in neutral banter.

#### 4. Stable Blueprint vs Mutable Runtime State
Problem

Your current stage outputs mix timeless truths with “right now” truths.
That is poison for branching systems.

Required architecture
CharacterBlueprint

Static or slow-changing truths:

- cast pressure map slice

- dramatic kernel

- inner engine

- tridimensional profile

- decision/epistemic defaults

- relationship blueprint

- presentation model

- credible surprises / implausible moves

CharacterRuntimeState

Fast-changing state:

- currentIntentions[]

- currentEmotionalPressures[]

- currentTrustByCharacter

- currentSuspicionByCharacter

- currentKnowledgeState

- revealedSecrets[]

- injuries[]

- resourceState

- location

- recentMemories[]

- relationshipDeltas

- arcState

Required runtime rule

Every field in runtime state must declare:

- source

- mutability

- updateTrigger

- decayOrPersistence

#### Strong Opinion

The current pipeline is close, but it is still one abstraction too shallow.
Right now it can produce well-described characters.
After these changes, it can produce characters who:

- want,

- misread,

- defend,

- adapt,

- deceive,

- sound different,

- learn differently,

- and remain themselves across branches.

That is the level you need.