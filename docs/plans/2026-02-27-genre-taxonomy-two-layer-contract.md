# Two-Layer Genre Contract: Conventions + Obligatory Moments

**Date**: 2026-02-27
**Status**: APPROVED

## Problem

The current `genre-obligations.ts` maps each of 26 `GenreFrame` values to exactly 4 obligation tags. These tags are both too formulaic (they read as a linear 4-step recipe: setup → complicate → crisis → resolve) and too few (4 tags can't capture what makes a genre feel authentic). The system conflates two fundamentally different genre contract layers: persistent atmospheric/tonal requirements and specific narrative events.

## Research Basis

The design draws from:
- **Story Grid (Shawn Coyne)**: Distinguishes "conventions" (persistent character roles, settings, catalysts) from "obligatory moments" (specific scenes that must happen). Conventions set up expectations; obligatory moments pay them off.
- **Save the Cat (Blake Snyder)**: 10 genre types each with mandatory structural elements beyond universal beat sheets.
- **Robert McKee**: Genre conventions as audience expectations that must be met but innovated upon.
- **Genre-specific literary criticism**: Gothic (decay, doubling, claustrophobia), Picaresque (rogue protagonist, episodic satire, no moral growth), Magical Realism (matter-of-fact supernatural, political subtext), Cyberpunk (high tech/low life, corporate dystopia), etc.

## Architecture: Two Separate Registries

### Layer 1: Genre Conventions (NEW — `genre-conventions.ts`)

Persistent cross-cutting rules injected into writer/planner/lorekeeper system prompts. NOT beat-assignable. Describe what must be true throughout the story: atmosphere, character dynamics, tonal constraints, world-rules.

- 6 conventions per genre (uniform count)
- Each convention is a `{ tag, gloss }` entry
- Tags need not be globally unique (same convention can appear across genres)
- Consumed by: structure prompt, writer system prompt, planner, lorekeeper, structure rewrite, spine rewrite

### Layer 2: Obligatory Moments (MODIFIED — `genre-obligations.ts`)

Beat-assignable scene events that must happen at specific structural points. Replace the current 4-tag system.

- 6 obligations per genre (uniform count, up from 4)
- Each obligation becomes a `{ tag, gloss }` entry (gloss is new)
- Tags remain globally unique across all genres
- Consumed by: same beat-tagging pipeline as today (`obligatorySceneTag`)

### No Overlap Invariant

No tag appears in both registries. Conventions and obligations are disjoint sets.

## Full Taxonomy

### Genre Conventions

```
ADVENTURE:
  - protagonist_driven_by_external_goal: The protagonist pursues a concrete outer objective
  - escalating_environmental_danger: The environment itself grows more hostile over time
  - companion_or_ally_dynamic: Relationships with allies shape the journey
  - wonder_and_discovery_atmosphere: New places and phenomena evoke awe
  - physical_competence_tested: The protagonist must prove capable through action
  - journey_as_transformation: Travel changes the traveler

COSMIC_HORROR:
  - human_knowledge_is_dangerous: Understanding brings harm, not power
  - scale_dwarfs_human_agency: Forces at play make human effort trivial
  - atmosphere_of_wrongness: Something is fundamentally off about reality
  - unreliable_perception: What characters perceive may not be true
  - isolation_from_comprehension: No one else understands what the protagonist faces
  - sanity_as_resource: Mental stability erodes under pressure

CYBERPUNK:
  - high_tech_low_life_divide: Technology amplifies inequality
  - corporate_power_exceeds_state: Corporations hold more authority than governments
  - body_as_commodity: Physical augmentation is transactional
  - surveillance_permeates_environment: Privacy does not exist
  - information_is_currency: Data has more value than physical goods
  - neon_and_decay_aesthetic: Gleaming technology overlays crumbling infrastructure

DARK_COMEDY:
  - humor_derived_from_suffering: Pain is the raw material of comedy
  - escalation_through_absurdity: Situations grow more ridiculous as stakes rise
  - social_taboos_treated_casually: Characters discuss the unspeakable without flinching
  - characters_blind_to_own_hypocrisy: Self-awareness is conspicuously absent
  - ironic_narrative_distance: The narration maintains detached amusement
  - moral_universe_indifferent: The world does not reward virtue or punish vice

DRAMA:
  - interior_life_drives_conflict: External events matter because of internal stakes
  - relationships_bear_weight_of_theme: Human connections carry thematic meaning
  - emotional_honesty_required: Characters must eventually face truth
  - consequences_are_proportional: Actions produce realistic outcomes
  - silence_and_subtext_carry_meaning: What is unsaid matters as much as dialogue
  - change_is_earned_not_given: Transformation requires genuine struggle

DYSTOPIAN:
  - state_or_system_controls_daily_life: Authority regulates mundane existence
  - language_or_thought_policed: Expression itself is dangerous
  - surveillance_normalized: Being watched is unremarkable
  - resistance_carries_mortal_cost: Defiance risks death or worse
  - conformity_rewarded_dissent_punished: The system incentivizes compliance
  - memory_of_before_is_contested: History is controlled or erased

ESPIONAGE:
  - trust_is_never_absolute: Every relationship has a hidden dimension
  - cover_identity_strains_selfhood: Maintaining a false self erodes the real one
  - information_compartmentalized: No one has the full picture
  - tradecraft_grounds_action: Operational procedure shapes how scenes unfold
  - moral_compromise_for_mission: The job demands ethical shortcuts
  - handler_asset_power_dynamic: Professional relationships involve control imbalance

FABLE:
  - symbolic_characters_over_psychological_depth: Characters represent ideas
  - natural_world_as_moral_mirror: Nature reflects moral truths
  - simplicity_of_language: Prose is direct and unadorned
  - lessons_embedded_in_action: Morals emerge from events, not lectures
  - archetypes_over_individuals: Roles matter more than personalities
  - justice_is_structural: The world's design rewards virtue and punishes vice

FANTASY:
  - magic_system_has_rules_and_costs: Power is not free
  - mythic_weight_to_objects_and_places: Artifacts and locations carry significance
  - chosen_or_tested_protagonist: The hero is singled out or forged by trial
  - ancient_conflict_resurfacing: Old forces stir again
  - wonder_coexists_with_danger: Beauty and threat are intertwined
  - lineage_or_prophecy_matters: Heritage and destiny shape events

GOTHIC:
  - setting_reflects_psyche: Architecture and landscape mirror inner turmoil
  - past_intrudes_on_present: History refuses to stay buried
  - claustrophobic_atmosphere: Escape feels impossible
  - family_legacy_as_burden: Ancestry carries obligation and guilt
  - decay_mirrors_moral_state: Physical ruin signals spiritual decline
  - sublime_dread_over_shock: Sustained unease rather than jump scares

GRIMDARK:
  - no_heroes_only_survivors: Protagonists are flawed and compromised
  - institutions_perpetuate_violence: Systems are engines of cruelty
  - power_corrupts_universally: No one wields authority cleanly
  - idealism_is_punished: Principled stances lead to suffering
  - pragmatism_over_honor: Survival demands moral flexibility
  - moral_ambiguity_in_every_choice: No option is clearly right

HISTORICAL:
  - period_detail_grounds_action: Material culture anchors scenes in time
  - social_hierarchy_constrains_agency: Class and status limit choices
  - contemporary_values_clash_with_era: Modern sensibilities cannot be imposed
  - historical_forces_dwarf_individuals: Events larger than any character
  - authenticity_of_material_culture: Objects, language, and customs feel period-correct
  - personal_fate_tied_to_historical_event: Private lives intersect public history

HORROR:
  - normalcy_established_then_violated: Safety is shown before being destroyed
  - threat_operates_by_alien_logic: The antagonist follows incomprehensible rules
  - isolation_from_help: No cavalry is coming
  - body_or_mind_under_siege: The threat targets physical or psychological integrity
  - false_safety_precedes_escalation: Relief is always temporary
  - survival_demands_sacrifice: Escaping costs something precious

LITERARY:
  - interiority_over_plot: Internal experience matters more than events
  - ordinary_life_as_subject: Mundane situations carry weight
  - symbolic_motifs_recur: Images and patterns repeat with deepening meaning
  - ambiguity_preferred_to_resolution: Clean endings are suspect
  - language_is_the_experience: Prose style is inseparable from content
  - thematic_weight_over_spectacle: Ideas matter more than action

MAGICAL_REALISM:
  - supernatural_presented_matter_of_factly: Magic is unremarkable
  - no_character_questions_the_impossible: The extraordinary is accepted
  - sensory_richness_grounds_the_magical: Vivid detail makes magic tangible
  - political_subtext_beneath_surface: Social critique lives under the narrative
  - cyclical_or_nonlinear_time: Past, present, and future blur
  - myth_woven_into_daily_life: Folklore is everyday reality

MYSTERY:
  - information_asymmetry_between_detective_and_reader: The detective knows or suspects more
  - every_detail_potentially_significant: Nothing is merely decorative
  - fair_play_clue_planting: The reader could solve it with available information
  - suspicion_shifts_among_suspects: Guilt appears to move between characters
  - logical_deduction_rewarded: Reasoning produces results
  - truth_is_hidden_in_plain_sight: The answer was always visible

MYTHIC:
  - cosmic_stakes_behind_personal_journey: Individual trials reflect universal forces
  - archetypal_roles_and_thresholds: Characters fill mythic functions
  - divine_or_supernatural_intervention: Powers beyond human act on the story
  - ritual_and_symbol_carry_power: Ceremony and imagery have real effect
  - transformation_is_irreversible: The hero cannot return to who they were
  - fate_and_choice_in_tension: Destiny and free will pull against each other

NOIR:
  - power_asymmetry_favors_antagonist: The system is rigged against the protagonist
  - moral_compromise_normalized: Ethical shortcuts are routine
  - urban_decay_or_institutional_rot_atmosphere: Setting reflects systemic corruption
  - femme_fatale_or_tempter_archetype: A character whose allure masks danger
  - confessional_or_weary_narrative_voice: Prose carries exhaustion and hindsight
  - information_weaponized_between_characters: Knowledge is leverage, not shared freely

PICARESQUE:
  - rogue_protagonist_from_low_station: The hero is an outsider surviving by wit
  - episodic_movement_between_milieus: The story drifts through social worlds
  - satire_of_social_strata: Each milieu's pretensions are exposed
  - wit_as_primary_survival_tool: Cleverness substitutes for power
  - no_moral_growth_expected: The protagonist does not reform
  - hypocrisy_exposed_through_encounter: Meeting people reveals their true nature

POST_APOCALYPTIC:
  - scarcity_defines_all_choices: Resources are the primary constraint
  - old_world_artifacts_carry_meaning: Relics of civilization evoke loss
  - community_vs_isolation_tension: Group survival vs. self-preservation
  - environment_is_hostile_actor: The world itself is dangerous
  - social_order_must_be_reinvented: Old rules no longer apply
  - memory_of_civilization_haunts: The past is a ghost

ROMANCE:
  - attraction_generates_vulnerability: Desire opens characters to hurt
  - external_forces_oppose_union: Something outside the lovers keeps them apart
  - emotional_honesty_rewarded: Vulnerability produces connection
  - intimacy_requires_risk: Closeness demands exposure
  - rival_or_obstacle_intensifies_desire: Opposition strengthens longing
  - complementary_wounds_between_lovers: Each lover's flaw matches the other's need

SATIRE:
  - target_institution_rendered_absurd: The system's logic is shown as ridiculous
  - exaggeration_reveals_truth: Distortion illuminates reality
  - earnest_characters_expose_system: Sincerity highlights institutional failure
  - ironic_gap_between_stated_and_actual_values: What people claim vs. what they do
  - escalation_through_logical_extension: Following rules to absurd conclusions
  - no_safe_position_for_reader: Complicity is inescapable

SCI_FI:
  - speculative_premise_extrapolated_rigorously: The "what if" is followed to its logical end
  - technology_reshapes_human_condition: Innovation changes what it means to be human
  - scale_shift_reframes_ethics: Moral questions change at different magnitudes
  - worldbuilding_implies_rules: The setting operates by consistent internal logic
  - ideas_drive_conflict: Conceptual tensions generate plot
  - wonder_and_unease_coexist: Discovery is thrilling and unsettling

SURREAL:
  - dream_logic_replaces_causality: Events follow emotional rather than rational order
  - identity_is_fluid: Characters may change or merge without explanation
  - juxtaposition_of_incongruous_images: Unrelated elements collide meaningfully
  - emotional_truth_over_literal_coherence: Feelings matter more than facts
  - defamiliarization_of_the_ordinary: Familiar things become strange
  - meaning_emerges_from_pattern_not_explanation: Understanding comes through recurrence

THRILLER:
  - protagonist_under_constant_pressure: The hero never gets to rest
  - antagonist_always_one_step_ahead: The opposition anticipates the hero's moves
  - information_revealed_under_duress: Truth comes out through crisis
  - clock_ticking_on_every_decision: Time pressure is omnipresent
  - trust_network_unreliable: Allies may be compromised
  - stakes_are_personal_and_immediate: The threat targets what the hero loves

WESTERN:
  - frontier_as_moral_testing_ground: The edge of civilization tests character
  - law_is_fragile_or_absent: Order cannot be taken for granted
  - violence_has_weight_and_consequence: Fighting carries real cost
  - self_reliance_as_virtue: Independence is valued above all
  - landscape_shapes_character: Geography molds the people who inhabit it
  - civilization_vs_wilderness_tension: Settlement and wildness are in opposition
```

### Obligatory Moments

```
ADVENTURE:
  - call_to_quest: An external summons or discovery launches the journey
  - threshold_crossing: The protagonist leaves the known world behind
  - ally_tested_or_won: A companion proves loyalty or is recruited through trial
  - ordeal_survived: The protagonist endures a defining physical or mental test
  - treasure_with_cost: The prize is won but at meaningful expense
  - return_transformed: The protagonist comes back changed by the journey

COSMIC_HORROR:
  - forbidden_knowledge_discovered: The protagonist learns something they shouldn't
  - reality_unravels: The rules of the world visibly break down
  - insignificance_revelation: The protagonist grasps the scale of what they face
  - sanity_breaking_encounter: Direct contact with the unknowable damages the mind
  - irreversible_psychic_cost: Understanding cannot be unlearned
  - truth_worse_than_ignorance: The final revelation makes things worse, not better

CYBERPUNK:
  - systemic_exploitation_exposed: The protagonist sees how the system extracts from the powerless
  - high_tech_infiltration: Technology is used to breach a defended space
  - body_or_mind_modified_under_pressure: Augmentation happens under duress or necessity
  - betrayal_by_power_structure: An institution the protagonist relied on turns hostile
  - data_heist_or_info_weapon: Information is stolen or weaponized in a key scene
  - pyrrhic_victory_against_system: The protagonist wins but the system absorbs the damage

DARK_COMEDY:
  - moral_line_crossed_for_laughs: A character does something terrible and it is funny
  - escalating_consequence_spiral: One bad decision cascades into compounding disasters
  - social_hypocrisy_exposed: A respected figure or institution is revealed as fraudulent
  - accomplice_through_inaction: A character becomes complicit by failing to act
  - darkest_joke_lands: The most transgressive moment produces the biggest laugh
  - bleak_ironic_resolution: The ending resolves things but in a way that mocks resolution

DRAMA:
  - relationship_fracture: A meaningful bond breaks under pressure
  - hard_truth_confrontation: A character is forced to face an uncomfortable reality
  - vulnerability_exposed: A character reveals what they have been hiding
  - sacrifice_or_compromise_choice: A character must give something up to gain something else
  - silence_broken: Something long unsaid is finally spoken
  - earned_emotional_reckoning: The climax delivers emotional payoff built over the full arc

DYSTOPIAN:
  - oppressive_order_demonstrated: The system's power is shown in action against someone
  - resistance_sparked: A moment of defiance ignites broader opposition
  - state_violence_witnessed: The protagonist sees the system's willingness to destroy
  - informer_or_betrayal_within_resistance: Trust within the opposition collapses
  - forbidden_knowledge_accessed: The protagonist learns what the system hides
  - system_price_of_survival: Surviving within the system demands moral cost

ESPIONAGE:
  - mission_briefing_with_hidden_agenda: The assignment has layers the protagonist doesn't see
  - cover_identity_tested: The false self is nearly exposed
  - double_agent_reveal: Someone is working for the other side
  - tradecraft_operation_under_pressure: A procedural operation goes wrong or must be improvised
  - trust_collapse: A key relationship is revealed as compromised
  - handler_betrayal_or_sacrifice: The authority figure acts against the protagonist's interest or gives themselves up

FABLE:
  - moral_test_presented: The protagonist faces a clear ethical choice
  - symbolic_guide_appears: A figure embodies wisdom and offers direction
  - vice_demonstrated_through_action: A character's flaw produces visible consequences
  - unexpected_reversal_of_fortune: Circumstance flips for a character based on their virtue or vice
  - vice_punished: Wrongdoing receives its consequence
  - lesson_embodied_in_outcome: The story's moral is demonstrated by what happens, not stated

FANTASY:
  - magic_boundary_tested: A character pushes against the limits of what magic allows
  - artifact_or_boon_sought: A powerful object or gift is the focus of a quest
  - mythic_trial: The protagonist faces a test with symbolic or supernatural weight
  - sacrifice_to_power: Magic or power demands something in exchange
  - wonder_with_cost: A moment of awe carries a price
  - prophecy_fulfilled_or_subverted: A foretold event comes true or is deliberately broken

GOTHIC:
  - haunted_setting_introduced: The primary location is established as oppressive and laden with history
  - family_secret_unsealed: A hidden truth about lineage or legacy is revealed
  - doppelganger_or_doubling_encountered: A mirror, double, or uncanny reflection appears
  - transgression_against_nature: A character violates natural or moral law
  - decay_mirrors_psyche: Physical deterioration of setting reflects a character's inner state
  - doom_tinged_climax: The resolution carries an air of inescapability

GRIMDARK:
  - institutional_brutality_shown: A system inflicts cruelty as standard procedure
  - compromise_of_principle: A character abandons a moral stance to survive
  - ally_lost_to_pragmatism: A companion is sacrificed for tactical advantage
  - power_seized_through_cruelty: Authority is gained through violence or manipulation
  - no_clean_victory: The best outcome still costs dearly
  - survival_over_heroism: Living trumps doing the right thing

HISTORICAL:
  - period_pressure_established: The era's specific constraints are shown bearing on characters
  - personal_vs_era_conflict: A character's desires clash with historical norms
  - historical_turning_point_encountered: A real or analogous historical event intersects the plot
  - social_station_tested: Class or rank is challenged or enforced
  - anachronistic_desire_punished: A character wanting what the era forbids faces consequences
  - legacy_consequence: Past actions or ancestry shape present outcomes

HORROR:
  - threat_manifestation: The antagonist or danger appears for the first time
  - false_safety_shattered: A moment of relief is violently interrupted
  - isolation_or_entrapment: The protagonist is cut off from help
  - ally_lost_to_threat: A companion falls victim to the danger
  - monster_reveal_or_escalation: The true nature or scale of the threat becomes clear
  - final_confrontation_with_cost: The climax demands a price for survival

LITERARY:
  - ordinary_disruption: A small event fractures the protagonist's routine
  - interiority_deepened: A scene focuses on internal experience over external action
  - symbolic_motif_crystallizes: A recurring image or pattern achieves its fullest meaning
  - relationship_reexamined: A familiar bond is seen from a new angle
  - epiphany_or_anti_epiphany: The protagonist reaches or fails to reach understanding
  - ambiguous_but_thematic_closure: The ending resonates thematically without resolving cleanly

MAGICAL_REALISM:
  - mundane_world_with_unquestioned_marvel: Magic appears and no one is surprised
  - mythic_symbol_intrudes: A figure or event from folklore enters the narrative
  - community_ritual_or_collective_memory: A shared practice or memory carries weight
  - political_reality_surfaced_through_magic: Social truth is revealed via supernatural means
  - emotional_truth_over_literal_logic: Feelings take precedence over physical plausibility
  - quiet_wonder_resolution: The ending carries gentle astonishment rather than spectacle

MYSTERY:
  - crime_or_puzzle_presented: The central question or crime is established
  - red_herring_planted: A misleading clue or suspect diverts attention
  - key_witness_or_suspect_confronted: The detective presses someone who knows something
  - key_clue_recontextualized: An earlier detail is revealed to mean something different
  - detective_synthesis_moment: The investigator assembles the full picture
  - culprit_unmasked: The guilty party is identified and confronted

MYTHIC:
  - prophecy_or_call_issued: A supernatural or fateful summons launches the quest
  - threshold_guardian_confronted: A figure blocks passage to the next stage
  - descent_or_ordeal: The hero enters a place of trial and suffering
  - mentor_lost_or_transcended: The guide falls away, forcing independence
  - boon_or_revelation_won: The quest's prize is obtained through sacrifice
  - return_with_transformation: The hero comes back fundamentally changed

NOIR:
  - fatal_flaw_exploited: The protagonist's weakness is turned against them
  - corruption_web_revealed: The network of complicity becomes visible
  - false_trust_broken: Someone the protagonist relied on proves false
  - moral_point_of_no_return_crossed: The protagonist does something they cannot undo
  - false_hope_dangled_then_snatched: A way out appears and is taken away
  - bitter_resolution: The ending delivers truth without comfort

PICARESQUE:
  - rogue_enters_new_milieu: The protagonist arrives in an unfamiliar social world
  - episodic_confrontation_with_order: The protagonist clashes with authority or convention
  - satiric_social_exposure: A social class or institution is shown as corrupt or absurd
  - wit_deployed_as_weapon: The protagonist uses cleverness to escape or prevail
  - patron_or_mark_outwitted: A powerful figure is deceived or manipulated
  - restless_departure: The protagonist moves on, unchanged, to the next episode

POST_APOCALYPTIC:
  - aftermath_world_rules_established: The new reality's constraints are shown
  - resource_conflict: People clash over scarce necessities
  - fragile_shelter_breached: A place of safety is compromised
  - old_world_echo_discovered: A relic or memory of the previous civilization surfaces
  - community_trust_tested: Group bonds strain under survival pressure
  - humanity_tested_under_ruin: A character must choose between self-interest and compassion

ROMANCE:
  - attraction_spark: The lovers first feel mutual pull
  - intimacy_deepened: Emotional or physical closeness increases
  - vulnerability_exchanged: Both lovers reveal something hidden
  - misunderstanding_or_barrier_peak: The obstacle between them reaches maximum intensity
  - grand_gesture_or_confession: A character risks everything to declare their feelings
  - choice_for_union_or_parting: The final decision about the relationship is made

SATIRE:
  - target_system_established: The institution or social structure is introduced
  - absurdity_escalation: The system's logic produces increasingly ridiculous outcomes
  - earnest_fool_enters_system: A sincere character highlights the system's dysfunction
  - hypocrisy_exposure: A gap between professed values and actual behavior is revealed
  - system_logic_taken_to_extreme: Following the rules to their conclusion produces absurdity
  - barbed_resolution: The ending comments on the system without reforming it

SCI_FI:
  - speculative_premise_demonstrated: The core "what if" is shown in action
  - technology_or_idea_complication: The premise creates unforeseen problems
  - scale_shift_encounter: The protagonist confronts something at a vastly different magnitude
  - ethical_dilemma_under_new_rules: Moral questions arise from the speculative premise
  - unintended_consequence_cascade: The technology or idea produces chain reactions
  - conceptual_payoff: The story's central idea reaches its fullest expression

SURREAL:
  - reality_dislocation: The world shifts away from the familiar
  - dream_logic_sequence: Events follow emotional rather than causal order
  - identity_or_perception_slippage: The protagonist's sense of self or reality wavers
  - incongruous_juxtaposition_crystallizes: Unrelated elements collide to produce meaning
  - defamiliarized_encounter: Something ordinary becomes profoundly strange
  - meaning_through_image: A visual or sensory moment conveys the story's deepest point

THRILLER:
  - immediate_threat_established: Danger is present from the outset
  - ticking_clock_activated: A deadline creates urgency
  - protagonist_outmaneuvered: The antagonist gains advantage
  - hero_at_mercy_of_antagonist: The protagonist is trapped or powerless
  - false_ending: An apparent resolution proves premature
  - last_second_reversal: The climax turns on a final unexpected shift

WESTERN:
  - frontier_code_conflict: A character must choose between competing moral codes
  - law_vs_violence_choice: The protagonist faces the question of righteous force
  - showdown_preparation: Tension builds toward an inevitable confrontation
  - landscape_as_crucible: The physical environment tests the protagonist's endurance
  - honor_tested_by_survival: Principle clashes with self-preservation
  - duel_or_standoff_resolution: The climax centers on a direct confrontation
```

## Consumption Architecture

### Convention Injection Points

| Prompt stage | Injection method | Rationale |
|---|---|---|
| Structure generator | New `buildGenreConventionsSection()` in user message | Structure needs to design beats honoring atmosphere |
| Writer system prompt | Injected into `composeCreativeSystemPrompt()` after tone directive | Writer maintains conventions in every scene |
| Planner | Injected into user message context block | Planner designs scenes within genre constraints |
| Lorekeeper | Injected into user message context block | Lorekeeper curates context through genre-aware lens |
| Structure rewrite | Same pattern as structure prompt | Rewrites preserve genre conventions |
| Spine rewrite | Injected into context | Spine deviations must not violate genre conventions |

Stages that do NOT receive conventions: accountant, analyst, agenda resolver (they operate on state/analysis, not creative generation).

### Obligation Consumption (unchanged pattern)

- `buildGenreObligationsSection()` in structure prompt — beat-tagging contract
- `obligatorySceneTag` on beats — same field, same validation
- Post-generation warning in `structure-generator.ts` — soft check for missing tags
- Response parser and factory validate tags via `isGenreObligationTag()`
- Persistence serializer validates on deserialization

### Data Flow

```
ConceptSpec.genreFrame
    │
    ├──► getGenreConventions(genreFrame) ──► GenreConventionEntry[]
    │       │
    │       ├──► system-prompt-builder (writer system prompt)
    │       ├──► structure-prompt (user message)
    │       ├──► page-planner-prompt (user message)
    │       ├──► lorekeeper-prompt (user message)
    │       ├──► structure-rewrite-prompt (user message)
    │       └──► spine-rewrite-prompt (user message)
    │
    └──► getGenreObligationTags(genreFrame) ──► GenreObligationEntry[]
            │
            ├──► structure-prompt (beat-tagging contract)
            ├──► structure-generator (post-validation warning)
            ├──► structure-response-parser (tag validation)
            ├──► structure-factory (tag validation)
            ├──► structure-rewrite (tag preservation)
            └──► story-serializer (deserialization validation)
```

## Registry Data Shape

```typescript
// genre-conventions.ts
export interface GenreConventionEntry {
  readonly tag: string;
  readonly gloss: string;
}

export const GENRE_CONVENTIONS_BY_GENRE: Record<GenreFrame, readonly GenreConventionEntry[]>;

// genre-obligations.ts (modified)
export interface GenreObligationEntry {
  readonly tag: string;
  readonly gloss: string;
}

export const GENRE_OBLIGATION_TAGS_BY_GENRE: Record<GenreFrame, readonly GenreObligationEntry[]>;
```

## Context Threading

`genreFrame` must be available at each prompt site. Currently `ConceptSpec` carries `genreFrame` and is available in `StructureContext`. For writer/planner/lorekeeper prompts, `genreFrame` needs to be threaded through their context types by adding `genreFrame?: GenreFrame` to:

- `OpeningContext` / `ContinuationContext`
- `PlannerContext`
- `LorekeeperContext`
- `SpineRewriteContext`
- `StructureRewriteContext`

## Test Invariants

| Invariant | File |
|---|---|
| Every GenreFrame has 5-8 convention entries | genre-conventions.test.ts |
| Every convention entry has non-empty tag and gloss | genre-conventions.test.ts |
| Convention tags unique within each genre | genre-conventions.test.ts |
| Every GenreFrame has 5-8 obligation entries | genre-obligations.test.ts |
| Every obligation entry has non-empty tag and gloss | genre-obligations.test.ts |
| Obligation tags globally unique across all genres | genre-obligations.test.ts |
| No tag in both conventions and obligations | cross-registry test |
| Convention section builder produces expected format | structure-prompt.test.ts |
| Writer system prompt includes conventions when genreFrame provided | system-prompt-builder.test.ts |

## Files Changed Summary

**New files:**
- `src/models/genre-conventions.ts`
- `src/llm/prompts/sections/shared/genre-conventions-section.ts`
- `test/unit/models/genre-conventions.test.ts`

**Modified (data):**
- `src/models/genre-obligations.ts` — expanded to 6 tags, add gloss, change type to GenreObligationEntry[]
- `src/models/index.ts` — export new module

**Modified (prompt injection):**
- `src/llm/prompts/system-prompt-builder.ts`
- `src/llm/prompts/structure-prompt.ts`
- `src/llm/prompts/page-planner-prompt.ts`
- `src/llm/prompts/lorekeeper-prompt.ts`
- `src/llm/prompts/structure-rewrite-prompt.ts`
- `src/llm/prompts/spine-rewrite-prompt.ts`

**Modified (context threading):**
- Context types needing genreFrame

**Modified (validation):**
- `src/llm/structure-response-parser.ts`
- `src/engine/structure-factory.ts`
- `src/persistence/story-serializer.ts`

**Modified tests:**
- `test/unit/models/genre-obligations.test.ts`
- Various prompt test files
