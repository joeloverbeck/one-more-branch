import type { GenreFrame } from './concept-generator.js';

export interface GenreConventionEntry {
  readonly tag: string;
  readonly gloss: string;
}

export const GENRE_CONVENTIONS_BY_GENRE = {
  ABSURDIST: [
    {
      tag: 'rational_frameworks_fail',
      gloss: 'Logical reasoning produces nonsensical outcomes',
    },
    {
      tag: 'meaning_sought_but_absent',
      gloss: 'Characters search for purpose in a purposeless universe',
    },
    {
      tag: 'repetition_as_existential_condition',
      gloss: 'Cycles and loops replace linear progress',
    },
    {
      tag: 'authority_is_incomprehensible',
      gloss: 'Power structures operate by inscrutable rules',
    },
    {
      tag: 'language_undermines_communication',
      gloss: 'Words fail to convey what characters actually mean',
    },
    {
      tag: 'mundane_and_catastrophic_equalized',
      gloss: 'Trivial events and existential crises receive identical weight',
    },
  ],
  ADVENTURE: [
    {
      tag: 'protagonist_driven_by_external_goal',
      gloss: 'The protagonist pursues a concrete outer objective',
    },
    {
      tag: 'escalating_environmental_danger',
      gloss: 'The environment itself grows more hostile over time',
    },
    {
      tag: 'companion_or_ally_dynamic',
      gloss: 'Relationships with allies shape the journey',
    },
    {
      tag: 'wonder_and_discovery_atmosphere',
      gloss: 'New places and phenomena evoke awe',
    },
    {
      tag: 'physical_competence_tested',
      gloss: 'The protagonist must prove capable through action',
    },
    {
      tag: 'journey_as_transformation',
      gloss: 'Travel changes the traveler',
    },
  ],
  ALTERNATE_HISTORY: [
    {
      tag: 'divergence_point_anchors_world',
      gloss: 'A specific historical change is the foundation of all differences',
    },
    {
      tag: 'butterfly_effects_rigorously_traced',
      gloss: 'Consequences of the divergence propagate logically through society',
    },
    {
      tag: 'historical_knowledge_creates_irony',
      gloss: 'The reader knows what should have happened',
    },
    {
      tag: 'familiar_institutions_distorted',
      gloss: 'Recognizable organizations and nations exist in altered forms',
    },
    {
      tag: 'period_authenticity_despite_divergence',
      gloss: 'Material culture and social norms feel grounded in their era',
    },
    {
      tag: 'individual_agency_against_historical_momentum',
      gloss: 'Characters struggle to redirect or preserve the altered course of history',
    },
  ],
  COMING_OF_AGE: [
    {
      tag: 'naivete_as_starting_condition',
      gloss: 'The protagonist begins with a limited, sheltered worldview',
    },
    {
      tag: 'formative_relationships_shape_identity',
      gloss: 'Mentors, first loves, and rivals function as identity-shapers',
    },
    {
      tag: 'world_expands_progressively',
      gloss: "The protagonist's sphere of experience broadens across the story",
    },
    {
      tag: 'social_pressure_toward_conformity',
      gloss: 'Society pushes the protagonist toward a role they must negotiate',
    },
    {
      tag: 'bodily_and_emotional_awakening',
      gloss: 'Physical maturation and emotional development intertwine',
    },
    {
      tag: 'loss_of_innocence_as_central_event',
      gloss: 'Something irrevocable reveals the world is not what the protagonist believed',
    },
  ],
  COSMIC_HORROR: [
    {
      tag: 'human_knowledge_is_dangerous',
      gloss: 'Understanding brings harm, not power',
    },
    {
      tag: 'scale_dwarfs_human_agency',
      gloss: 'Forces at play make human effort trivial',
    },
    {
      tag: 'atmosphere_of_wrongness',
      gloss: 'Something is fundamentally off about reality',
    },
    {
      tag: 'unreliable_perception',
      gloss: 'What characters perceive may not be true',
    },
    {
      tag: 'isolation_from_comprehension',
      gloss: 'No one else understands what the protagonist faces',
    },
    {
      tag: 'sanity_as_resource',
      gloss: 'Mental stability erodes under pressure',
    },
  ],
  CULTIVATION: [
    {
      tag: 'cultivation_realms_as_power_hierarchy',
      gloss: 'A rigidly stratified system of power levels structures all social interactions',
    },
    {
      tag: 'heavenly_dao_as_impersonal_force',
      gloss: 'The universe has laws that govern advancement and impose tribulations',
    },
    {
      tag: 'immortality_as_ultimate_goal',
      gloss: 'Characters pursue transcendence of mortality',
    },
    {
      tag: 'cosmic_scale_power_escalation',
      gloss: 'Power progresses from individual martial arts to reality-warping scales',
    },
    {
      tag: 'sect_as_cultivation_institution',
      gloss: 'Sects are training institutions, political powers, and social hierarchies simultaneously',
    },
    {
      tag: 'treasures_and_pills_as_cultivation_aids',
      gloss: 'Spirit stones, elixirs, and artifacts accelerate advancement',
    },
  ],
  CYBERPUNK: [
    {
      tag: 'high_tech_low_life_divide',
      gloss: 'Technology amplifies inequality',
    },
    {
      tag: 'corporate_power_exceeds_state',
      gloss: 'Corporations hold more authority than governments',
    },
    {
      tag: 'body_as_commodity',
      gloss: 'Physical augmentation is transactional',
    },
    {
      tag: 'surveillance_permeates_environment',
      gloss: 'Privacy does not exist',
    },
    {
      tag: 'information_is_currency',
      gloss: 'Data has more value than physical goods',
    },
    {
      tag: 'neon_and_decay_aesthetic',
      gloss: 'Gleaming technology overlays crumbling infrastructure',
    },
  ],
  DARK_COMEDY: [
    {
      tag: 'humor_derived_from_suffering',
      gloss: 'Pain is the raw material of comedy',
    },
    {
      tag: 'escalation_through_absurdity',
      gloss: 'Situations grow more ridiculous as stakes rise',
    },
    {
      tag: 'social_taboos_treated_casually',
      gloss: 'Characters discuss the unspeakable without flinching',
    },
    {
      tag: 'characters_blind_to_own_hypocrisy',
      gloss: 'Self-awareness is conspicuously absent',
    },
    {
      tag: 'ironic_narrative_distance',
      gloss: 'The narration maintains detached amusement',
    },
    {
      tag: 'moral_universe_indifferent',
      gloss: 'The world does not reward virtue or punish vice',
    },
  ],
  DRAMA: [
    {
      tag: 'interior_life_drives_conflict',
      gloss: 'External events matter because of internal stakes',
    },
    {
      tag: 'relationships_bear_weight_of_theme',
      gloss: 'Human connections carry thematic meaning',
    },
    {
      tag: 'emotional_honesty_required',
      gloss: 'Characters must eventually face truth',
    },
    {
      tag: 'consequences_are_proportional',
      gloss: 'Actions produce realistic outcomes',
    },
    {
      tag: 'silence_and_subtext_carry_meaning',
      gloss: 'What is unsaid matters as much as dialogue',
    },
    {
      tag: 'change_is_earned_not_given',
      gloss: 'Transformation requires genuine struggle',
    },
  ],
  DYSTOPIAN: [
    {
      tag: 'state_or_system_controls_daily_life',
      gloss: 'Authority regulates mundane existence',
    },
    {
      tag: 'language_or_thought_policed',
      gloss: 'Expression itself is dangerous',
    },
    {
      tag: 'surveillance_normalized',
      gloss: 'Being watched is unremarkable',
    },
    {
      tag: 'resistance_carries_mortal_cost',
      gloss: 'Defiance risks death or worse',
    },
    {
      tag: 'conformity_rewarded_dissent_punished',
      gloss: 'The system incentivizes compliance',
    },
    {
      tag: 'memory_of_before_is_contested',
      gloss: 'History is controlled or erased',
    },
  ],
  EROTICA: [
    {
      tag: 'desire_drives_narrative',
      gloss: 'Physical and emotional desire is the primary engine of plot',
    },
    {
      tag: 'intimacy_as_character_revelation',
      gloss: 'Sexual encounters expose who characters truly are',
    },
    {
      tag: 'consent_as_dramatic_architecture',
      gloss: 'Negotiation of boundaries creates tension and trust',
    },
    {
      tag: 'body_as_emotional_landscape',
      gloss: 'Physical sensation carries psychological meaning',
    },
    {
      tag: 'escalating_vulnerability_through_closeness',
      gloss: 'Each encounter demands deeper exposure',
    },
    {
      tag: 'power_dynamics_shape_every_interaction',
      gloss: 'Control, surrender, and equality are always at play',
    },
  ],
  ESPIONAGE: [
    {
      tag: 'trust_is_never_absolute',
      gloss: 'Every relationship has a hidden dimension',
    },
    {
      tag: 'cover_identity_strains_selfhood',
      gloss: 'Maintaining a false self erodes the real one',
    },
    {
      tag: 'information_compartmentalized',
      gloss: 'No one has the full picture',
    },
    {
      tag: 'tradecraft_grounds_action',
      gloss: 'Operational procedure shapes how scenes unfold',
    },
    {
      tag: 'moral_compromise_for_mission',
      gloss: 'The job demands ethical shortcuts',
    },
    {
      tag: 'handler_asset_power_dynamic',
      gloss: 'Professional relationships involve control imbalance',
    },
  ],
  FABLE: [
    {
      tag: 'symbolic_characters_over_psychological_depth',
      gloss: 'Characters represent ideas',
    },
    {
      tag: 'natural_world_as_moral_mirror',
      gloss: 'Nature reflects moral truths',
    },
    {
      tag: 'simplicity_of_language',
      gloss: 'Prose is direct and unadorned',
    },
    {
      tag: 'lessons_embedded_in_action',
      gloss: 'Morals emerge from events, not lectures',
    },
    {
      tag: 'archetypes_over_individuals',
      gloss: 'Roles matter more than personalities',
    },
    {
      tag: 'justice_is_structural',
      gloss: 'The world\'s design rewards virtue and punishes vice',
    },
  ],
  FANTASY: [
    {
      tag: 'magic_system_has_rules_and_costs',
      gloss: 'Power is not free',
    },
    {
      tag: 'mythic_weight_to_objects_and_places',
      gloss: 'Artifacts and locations carry significance',
    },
    {
      tag: 'chosen_or_tested_protagonist',
      gloss: 'The hero is singled out or forged by trial',
    },
    {
      tag: 'ancient_conflict_resurfacing',
      gloss: 'Old forces stir again',
    },
    {
      tag: 'wonder_coexists_with_danger',
      gloss: 'Beauty and threat are intertwined',
    },
    {
      tag: 'lineage_or_prophecy_matters',
      gloss: 'Heritage and destiny shape events',
    },
  ],
  GOTHIC: [
    {
      tag: 'setting_reflects_psyche',
      gloss: 'Architecture and landscape mirror inner turmoil',
    },
    {
      tag: 'past_intrudes_on_present',
      gloss: 'History refuses to stay buried',
    },
    {
      tag: 'claustrophobic_atmosphere',
      gloss: 'Escape feels impossible',
    },
    {
      tag: 'family_legacy_as_burden',
      gloss: 'Ancestry carries obligation and guilt',
    },
    {
      tag: 'decay_mirrors_moral_state',
      gloss: 'Physical ruin signals spiritual decline',
    },
    {
      tag: 'sublime_dread_over_shock',
      gloss: 'Sustained unease rather than jump scares',
    },
  ],
  GRIMDARK: [
    {
      tag: 'no_heroes_only_survivors',
      gloss: 'Protagonists are flawed and compromised',
    },
    {
      tag: 'institutions_perpetuate_violence',
      gloss: 'Systems are engines of cruelty',
    },
    {
      tag: 'power_corrupts_universally',
      gloss: 'No one wields authority cleanly',
    },
    {
      tag: 'idealism_is_punished',
      gloss: 'Principled stances lead to suffering',
    },
    {
      tag: 'pragmatism_over_honor',
      gloss: 'Survival demands moral flexibility',
    },
    {
      tag: 'moral_ambiguity_in_every_choice',
      gloss: 'No option is clearly right',
    },
  ],
  HEIST: [
    {
      tag: 'competence_as_spectacle',
      gloss: 'Characters are defined by being extraordinarily good at specific skills',
    },
    {
      tag: 'plan_as_dramatic_architecture',
      gloss: 'The heist plan itself structures the narrative',
    },
    {
      tag: 'information_asymmetry_favoring_protagonist',
      gloss: 'The protagonists are the ones with the scheme',
    },
    {
      tag: 'criminal_protagonists_as_sympathetic',
      gloss: 'The audience roots for the people committing the crime',
    },
    {
      tag: 'precision_and_timing_atmosphere',
      gloss: 'Every scene operates with clockwork exactness',
    },
    {
      tag: 'target_as_character',
      gloss: 'The thing being robbed has its own defenses that function as an antagonist',
    },
  ],
  HISTORICAL: [
    {
      tag: 'period_detail_grounds_action',
      gloss: 'Material culture anchors scenes in time',
    },
    {
      tag: 'social_hierarchy_constrains_agency',
      gloss: 'Class and status limit choices',
    },
    {
      tag: 'contemporary_values_clash_with_era',
      gloss: 'Modern sensibilities cannot be imposed',
    },
    {
      tag: 'historical_forces_dwarf_individuals',
      gloss: 'Events larger than any character',
    },
    {
      tag: 'authenticity_of_material_culture',
      gloss: 'Objects, language, and customs feel period-correct',
    },
    {
      tag: 'personal_fate_tied_to_historical_event',
      gloss: 'Private lives intersect public history',
    },
  ],
  HORROR: [
    {
      tag: 'normalcy_established_then_violated',
      gloss: 'Safety is shown before being destroyed',
    },
    {
      tag: 'threat_operates_by_alien_logic',
      gloss: 'The antagonist follows incomprehensible rules',
    },
    {
      tag: 'isolation_from_help',
      gloss: 'No cavalry is coming',
    },
    {
      tag: 'body_or_mind_under_siege',
      gloss: 'The threat targets physical or psychological integrity',
    },
    {
      tag: 'false_safety_precedes_escalation',
      gloss: 'Relief is always temporary',
    },
    {
      tag: 'survival_demands_sacrifice',
      gloss: 'Escaping costs something precious',
    },
  ],
  ISEKAI: [
    {
      tag: 'mundane_origin_as_contrast',
      gloss: "The protagonist's ordinary past highlights the new world's strangeness",
    },
    {
      tag: 'outsider_knowledge_as_advantage',
      gloss: 'Skills or understanding from the old world give unexpected leverage',
    },
    {
      tag: 'new_world_operates_by_learnable_rules',
      gloss: 'The setting has discoverable systems the protagonist can master',
    },
    {
      tag: 'identity_rebuilt_from_scratch',
      gloss: 'The protagonist defines who they are without old-world status',
    },
    {
      tag: 'displacement_as_liberation_and_loss',
      gloss: 'Being uprooted is simultaneously freeing and disorienting',
    },
    {
      tag: 'progression_through_adaptation',
      gloss: "Growth comes from learning the new world's logic",
    },
  ],
  KAIJU: [
    {
      tag: 'creature_as_sublime_force',
      gloss: 'The monster evokes awe and terror simultaneously',
    },
    {
      tag: 'civilization_scale_vulnerability',
      gloss: 'Human infrastructure and institutions are fragile against the threat',
    },
    {
      tag: 'allegory_encoded_in_monster',
      gloss: 'The creature embodies a real-world fear or social force',
    },
    {
      tag: 'human_drama_against_spectacle',
      gloss: 'Personal stories ground the overwhelming destruction',
    },
    {
      tag: 'military_and_scientific_response',
      gloss: 'Institutional attempts to understand or combat the threat drive plot',
    },
    {
      tag: 'scale_dislocation_atmosphere',
      gloss: 'Normal-sized humans exist alongside impossibly vast beings',
    },
  ],
  LITRPG: [
    {
      tag: 'visible_game_mechanics_in_prose',
      gloss: 'Stats, levels, and skill trees appear as narrative elements',
    },
    {
      tag: 'system_mastery_as_character_growth',
      gloss: 'Understanding game rules is equivalent to personal development',
    },
    {
      tag: 'numerical_progression_drives_satisfaction',
      gloss: 'Quantified advancement provides tangible reward',
    },
    {
      tag: 'exploit_discovery_as_cleverness',
      gloss: 'Finding loopholes in the system signals protagonist intelligence',
    },
    {
      tag: 'loot_and_reward_economy',
      gloss: 'Items, skills, and abilities are earned through measurable achievement',
    },
    {
      tag: 'system_interface_as_narrative_voice',
      gloss: 'Status screens, notifications, and pop-ups convey information within the story',
    },
  ],
  LITERARY: [
    {
      tag: 'interiority_over_plot',
      gloss: 'Internal experience matters more than events',
    },
    {
      tag: 'ordinary_life_as_subject',
      gloss: 'Mundane situations carry weight',
    },
    {
      tag: 'symbolic_motifs_recur',
      gloss: 'Images and patterns repeat with deepening meaning',
    },
    {
      tag: 'ambiguity_preferred_to_resolution',
      gloss: 'Clean endings are suspect',
    },
    {
      tag: 'language_is_the_experience',
      gloss: 'Prose style is inseparable from content',
    },
    {
      tag: 'thematic_weight_over_spectacle',
      gloss: 'Ideas matter more than action',
    },
  ],
  MAGICAL_REALISM: [
    {
      tag: 'supernatural_presented_matter_of_factly',
      gloss: 'Magic is unremarkable',
    },
    {
      tag: 'no_character_questions_the_impossible',
      gloss: 'The extraordinary is accepted',
    },
    {
      tag: 'sensory_richness_grounds_the_magical',
      gloss: 'Vivid detail makes magic tangible',
    },
    {
      tag: 'political_subtext_beneath_surface',
      gloss: 'Social critique lives under the narrative',
    },
    {
      tag: 'cyclical_or_nonlinear_time',
      gloss: 'Past, present, and future blur',
    },
    {
      tag: 'myth_woven_into_daily_life',
      gloss: 'Folklore is everyday reality',
    },
  ],
  MILITARY: [
    {
      tag: 'chain_of_command_as_social_structure',
      gloss: 'Rank and orders define all interpersonal relationships',
    },
    {
      tag: 'unit_cohesion_over_individual_heroism',
      gloss: 'Survival depends on the group, not the lone warrior',
    },
    {
      tag: 'violence_has_physical_and_psychological_cost',
      gloss: 'Combat produces lasting damage to body and mind',
    },
    {
      tag: 'mission_logic_vs_human_logic',
      gloss: 'Tactical objectives conflict with emotional needs',
    },
    {
      tag: 'waiting_and_boredom_punctuated_by_terror',
      gloss: 'Long stretches of inaction contrast with sudden, intense danger',
    },
    {
      tag: 'institutional_indifference_to_individual',
      gloss: 'The military machine does not care about any single soldier',
    },
  ],
  MYSTERY: [
    {
      tag: 'information_asymmetry_between_detective_and_reader',
      gloss: 'The detective knows or suspects more',
    },
    {
      tag: 'every_detail_potentially_significant',
      gloss: 'Nothing is merely decorative',
    },
    {
      tag: 'fair_play_clue_planting',
      gloss: 'The reader could solve it with available information',
    },
    {
      tag: 'suspicion_shifts_among_suspects',
      gloss: 'Guilt appears to move between characters',
    },
    {
      tag: 'logical_deduction_rewarded',
      gloss: 'Reasoning produces results',
    },
    {
      tag: 'truth_is_hidden_in_plain_sight',
      gloss: 'The answer was always visible',
    },
  ],
  MYTHIC: [
    {
      tag: 'cosmic_stakes_behind_personal_journey',
      gloss: 'Individual trials reflect universal forces',
    },
    {
      tag: 'archetypal_roles_and_thresholds',
      gloss: 'Characters fill mythic functions',
    },
    {
      tag: 'divine_or_supernatural_intervention',
      gloss: 'Powers beyond human act on the story',
    },
    {
      tag: 'ritual_and_symbol_carry_power',
      gloss: 'Ceremony and imagery have real effect',
    },
    {
      tag: 'transformation_is_irreversible',
      gloss: 'The hero cannot return to who they were',
    },
    {
      tag: 'fate_and_choice_in_tension',
      gloss: 'Destiny and free will pull against each other',
    },
  ],
  NOIR: [
    {
      tag: 'power_asymmetry_favors_antagonist',
      gloss: 'The system is rigged against the protagonist',
    },
    {
      tag: 'moral_compromise_normalized',
      gloss: 'Ethical shortcuts are routine',
    },
    {
      tag: 'urban_decay_or_institutional_rot_atmosphere',
      gloss: 'Setting reflects systemic corruption',
    },
    {
      tag: 'femme_fatale_or_tempter_archetype',
      gloss: 'A character whose allure masks danger',
    },
    {
      tag: 'confessional_or_weary_narrative_voice',
      gloss: 'Prose carries exhaustion and hindsight',
    },
    {
      tag: 'information_weaponized_between_characters',
      gloss: 'Knowledge is leverage, not shared freely',
    },
  ],
  PARANORMAL: [
    {
      tag: 'supernatural_beings_among_mundane',
      gloss: 'Vampires, ghosts, or shapeshifters coexist with ordinary people',
    },
    {
      tag: 'hidden_world_with_own_politics',
      gloss: 'Supernatural communities have hierarchies and power struggles',
    },
    {
      tag: 'morality_not_determined_by_species',
      gloss: 'Supernatural nature does not make a being good or evil',
    },
    {
      tag: 'contemporary_setting_grounds_the_strange',
      gloss: 'Modern cities, jobs, and technology anchor the supernatural elements',
    },
    {
      tag: 'human_identity_questioned_through_other',
      gloss: 'Encountering non-human beings forces reflection on what being human means',
    },
    {
      tag: 'masquerade_or_integration_tension',
      gloss: 'Supernatural existence is either hidden from or negotiated with human society',
    },
  ],
  PICARESQUE: [
    {
      tag: 'rogue_protagonist_from_low_station',
      gloss: 'The hero is an outsider surviving by wit',
    },
    {
      tag: 'episodic_movement_between_milieus',
      gloss: 'The story drifts through social worlds',
    },
    {
      tag: 'satire_of_social_strata',
      gloss: 'Each milieu\'s pretensions are exposed',
    },
    {
      tag: 'wit_as_primary_survival_tool',
      gloss: 'Cleverness substitutes for power',
    },
    {
      tag: 'no_moral_growth_expected',
      gloss: 'The protagonist does not reform',
    },
    {
      tag: 'hypocrisy_exposed_through_encounter',
      gloss: 'Meeting people reveals their true nature',
    },
  ],
  POST_APOCALYPTIC: [
    {
      tag: 'scarcity_defines_all_choices',
      gloss: 'Resources are the primary constraint',
    },
    {
      tag: 'old_world_artifacts_carry_meaning',
      gloss: 'Relics of civilization evoke loss',
    },
    {
      tag: 'community_vs_isolation_tension',
      gloss: 'Group survival vs. self-preservation',
    },
    {
      tag: 'environment_is_hostile_actor',
      gloss: 'The world itself is dangerous',
    },
    {
      tag: 'social_order_must_be_reinvented',
      gloss: 'Old rules no longer apply',
    },
    {
      tag: 'memory_of_civilization_haunts',
      gloss: 'The past is a ghost',
    },
  ],
  ROMANCE: [
    {
      tag: 'attraction_generates_vulnerability',
      gloss: 'Desire opens characters to hurt',
    },
    {
      tag: 'external_forces_oppose_union',
      gloss: 'Something outside the lovers keeps them apart',
    },
    {
      tag: 'emotional_honesty_rewarded',
      gloss: 'Vulnerability produces connection',
    },
    {
      tag: 'intimacy_requires_risk',
      gloss: 'Closeness demands exposure',
    },
    {
      tag: 'rival_or_obstacle_intensifies_desire',
      gloss: 'Opposition strengthens longing',
    },
    {
      tag: 'complementary_wounds_between_lovers',
      gloss: 'Each lover\'s flaw matches the other\'s need',
    },
  ],
  SATIRE: [
    {
      tag: 'target_institution_rendered_absurd',
      gloss: 'The system\'s logic is shown as ridiculous',
    },
    {
      tag: 'exaggeration_reveals_truth',
      gloss: 'Distortion illuminates reality',
    },
    {
      tag: 'earnest_characters_expose_system',
      gloss: 'Sincerity highlights institutional failure',
    },
    {
      tag: 'ironic_gap_between_stated_and_actual_values',
      gloss: 'What people claim vs. what they do',
    },
    {
      tag: 'escalation_through_logical_extension',
      gloss: 'Following rules to absurd conclusions',
    },
    {
      tag: 'no_safe_position_for_reader',
      gloss: 'Complicity is inescapable',
    },
  ],
  SCI_FI: [
    {
      tag: 'speculative_premise_extrapolated_rigorously',
      gloss: 'The "what if" is followed to its logical end',
    },
    {
      tag: 'technology_reshapes_human_condition',
      gloss: 'Innovation changes what it means to be human',
    },
    {
      tag: 'scale_shift_reframes_ethics',
      gloss: 'Moral questions change at different magnitudes',
    },
    {
      tag: 'worldbuilding_implies_rules',
      gloss: 'The setting operates by consistent internal logic',
    },
    {
      tag: 'ideas_drive_conflict',
      gloss: 'Conceptual tensions generate plot',
    },
    {
      tag: 'wonder_and_unease_coexist',
      gloss: 'Discovery is thrilling and unsettling',
    },
  ],
  SLICE_OF_LIFE: [
    {
      tag: 'anti_dramatic_pacing',
      gloss: 'Events unfold at the rhythm of everyday life, not narrative urgency',
    },
    {
      tag: 'small_moments_carry_meaning',
      gloss: 'A shared meal or quiet conversation holds as much weight as any crisis',
    },
    {
      tag: 'character_over_plot',
      gloss: 'Who people are matters more than what happens to them',
    },
    {
      tag: 'routine_as_narrative_texture',
      gloss: 'Repeated daily activities create atmosphere and grounding',
    },
    {
      tag: 'gentle_emotional_shifts',
      gloss: 'Feelings change gradually rather than through dramatic revelation',
    },
    {
      tag: 'community_and_place_as_character',
      gloss: 'The setting and its inhabitants form a collective presence',
    },
  ],
  SPACE_OPERA: [
    {
      tag: 'galactic_scale_civilizations',
      gloss: 'Multiple spacefaring species or factions with complex political relationships',
    },
    {
      tag: 'technology_as_backdrop_not_premise',
      gloss: 'FTL travel, energy weapons, and AI exist but are not the point',
    },
    {
      tag: 'epic_emotional_stakes',
      gloss: 'Love, family, and honor drive decisions with galaxy-spanning consequences',
    },
    {
      tag: 'idealism_under_pressure',
      gloss: 'Protagonists believe in something and fight for it',
    },
    {
      tag: 'spectacle_and_wonder_scale',
      gloss: 'Massive space battles, alien worlds, and cosmic vistas are expected',
    },
    {
      tag: 'mythic_resonance_in_space',
      gloss: 'Prophecies, chosen ones, and galactic destiny operate without specific mythology',
    },
  ],
  STEAMPUNK: [
    {
      tag: 'victorian_era_aesthetic_foundation',
      gloss: 'Fashion, architecture, and social mores draw from the 19th century',
    },
    {
      tag: 'anachronistic_technology_with_period_logic',
      gloss: 'Advanced machines operate on steam, gears, and brass rather than electronics',
    },
    {
      tag: 'class_hierarchy_shapes_all_access',
      gloss: 'Technology and opportunity are distributed by social station',
    },
    {
      tag: 'invention_as_individual_craft',
      gloss: 'Machines are built by singular brilliant minds, not assembly lines',
    },
    {
      tag: 'empire_and_colonialism_as_backdrop',
      gloss: 'Imperial power structures pervade the social and political landscape',
    },
    {
      tag: 'aesthetics_of_visible_mechanism',
      gloss: 'Gears, pipes, and moving parts are displayed rather than hidden',
    },
  ],
  SURREAL: [
    {
      tag: 'dream_logic_replaces_causality',
      gloss: 'Events follow emotional rather than rational order',
    },
    {
      tag: 'identity_is_fluid',
      gloss: 'Characters may change or merge without explanation',
    },
    {
      tag: 'juxtaposition_of_incongruous_images',
      gloss: 'Unrelated elements collide meaningfully',
    },
    {
      tag: 'emotional_truth_over_literal_coherence',
      gloss: 'Feelings matter more than facts',
    },
    {
      tag: 'defamiliarization_of_the_ordinary',
      gloss: 'Familiar things become strange',
    },
    {
      tag: 'meaning_emerges_from_pattern_not_explanation',
      gloss: 'Understanding comes through recurrence',
    },
  ],
  SURVIVAL: [
    {
      tag: 'environment_as_primary_antagonist',
      gloss: 'Nature, climate, or terrain is the central threat',
    },
    {
      tag: 'resource_management_drives_decisions',
      gloss: 'Food, water, shelter, and tools constrain every choice',
    },
    {
      tag: 'body_as_vulnerable_system',
      gloss: 'Physical condition deteriorates and must be actively maintained',
    },
    {
      tag: 'knowledge_and_skill_determine_survival',
      gloss: 'Practical competence separates the living from the dead',
    },
    {
      tag: 'isolation_intensifies_psychological_pressure',
      gloss: 'Being alone or in a small group amplifies every setback',
    },
    {
      tag: 'civilization_stripped_to_essentials',
      gloss: 'Social norms collapse when basic needs are unmet',
    },
  ],
  THRILLER: [
    {
      tag: 'protagonist_under_constant_pressure',
      gloss: 'The hero never gets to rest',
    },
    {
      tag: 'antagonist_always_one_step_ahead',
      gloss: 'The opposition anticipates the hero\'s moves',
    },
    {
      tag: 'information_revealed_under_duress',
      gloss: 'Truth comes out through crisis',
    },
    {
      tag: 'clock_ticking_on_every_decision',
      gloss: 'Time pressure is omnipresent',
    },
    {
      tag: 'trust_network_unreliable',
      gloss: 'Allies may be compromised',
    },
    {
      tag: 'stakes_are_personal_and_immediate',
      gloss: 'The threat targets what the hero loves',
    },
  ],
  TRAGEDY: [
    {
      tag: 'protagonist_elevated_then_destroyed',
      gloss: 'The protagonist begins with genuine stature that makes their fall meaningful',
    },
    {
      tag: 'hamartia_drives_all_events',
      gloss: 'A specific character flaw, not external forces, is the causal engine of destruction',
    },
    {
      tag: 'inevitability_atmosphere',
      gloss: 'Tension comes from watching an unstoppable trajectory, not from surprise',
    },
    {
      tag: 'catharsis_through_suffering',
      gloss: 'The emotional contract is purgation through pity and fear',
    },
    {
      tag: 'dignity_in_destruction',
      gloss: 'The fall has grandeur; the destruction matters because the person mattered',
    },
    {
      tag: 'fate_and_free_will_entangled',
      gloss: 'The protagonist both causes and cannot escape their doom',
    },
  ],
  TRANSGRESSIVE: [
    {
      tag: 'social_taboo_violation_as_engine',
      gloss: 'The narrative systematically crosses boundaries society enforces',
    },
    {
      tag: 'body_as_site_of_transgression',
      gloss: 'Physical acts and bodily experience carry ideological weight',
    },
    {
      tag: 'narrator_complicity_with_the_abject',
      gloss: 'The narrative voice does not distance itself from disturbing content',
    },
    {
      tag: 'consumer_culture_as_target',
      gloss: 'Materialism, conformity, and mainstream values are exposed and attacked',
    },
    {
      tag: 'shock_in_service_of_revelation',
      gloss: 'Disturbing content exists to strip away comfortable illusions',
    },
    {
      tag: 'marginal_subcultures_as_setting',
      gloss: 'The story inhabits spaces outside mainstream social approval',
    },
  ],
  UTOPIAN: [
    {
      tag: 'ideal_society_constructed_and_examined',
      gloss: 'The setting presents a deliberately designed better world',
    },
    {
      tag: 'perfection_contains_hidden_cost',
      gloss: 'The ideal society requires trade-offs or sacrifices',
    },
    {
      tag: 'outsider_perspective_reveals_assumptions',
      gloss: 'A newcomer or dissident exposes what residents take for granted',
    },
    {
      tag: 'philosophical_debate_as_narrative_texture',
      gloss: 'Characters discuss and defend the principles underlying their society',
    },
    {
      tag: 'individual_desire_vs_collective_design',
      gloss: 'Personal wants test the limits of social engineering',
    },
    {
      tag: 'comparison_with_imperfect_present',
      gloss: "The utopia implicitly critiques the reader's own world",
    },
  ],
  WESTERN: [
    {
      tag: 'frontier_as_moral_testing_ground',
      gloss: 'The edge of civilization tests character',
    },
    {
      tag: 'law_is_fragile_or_absent',
      gloss: 'Order cannot be taken for granted',
    },
    {
      tag: 'violence_has_weight_and_consequence',
      gloss: 'Fighting carries real cost',
    },
    {
      tag: 'self_reliance_as_virtue',
      gloss: 'Independence is valued above all',
    },
    {
      tag: 'landscape_shapes_character',
      gloss: 'Geography molds the people who inhabit it',
    },
    {
      tag: 'civilization_vs_wilderness_tension',
      gloss: 'Settlement and wildness are in opposition',
    },
  ],
  WUXIA: [
    {
      tag: 'jianghu_as_parallel_world',
      gloss: 'The martial underworld operates by its own laws outside official society',
    },
    {
      tag: 'martial_honor_code_xia',
      gloss: 'A chivalric code: protect the weak, right wrongs, maintain integrity',
    },
    {
      tag: 'qi_cultivation_as_human_potential',
      gloss: 'Power comes from disciplined internal training, not external magic',
    },
    {
      tag: 'master_disciple_transmission',
      gloss: 'Knowledge passes through lineage relationships that carry obligations',
    },
    {
      tag: 'sect_and_school_politics',
      gloss: 'Martial sects function as political factions with rivalries and hierarchies',
    },
    {
      tag: 'revenge_and_vendetta_cycles',
      gloss: 'Grudges between individuals and sects drive multi-generational conflicts',
    },
  ],
} as const satisfies Record<GenreFrame, readonly GenreConventionEntry[]>;

export type GenreConventionsByGenre = typeof GENRE_CONVENTIONS_BY_GENRE;
export type GenreConventionTag =
  GenreConventionsByGenre[keyof GenreConventionsByGenre][number]['tag'];

const GENRE_CONVENTION_TAG_SET = new Set<string>(
  Object.values(GENRE_CONVENTIONS_BY_GENRE)
    .flat()
    .map((e) => e.tag),
);

export function isGenreConventionTag(value: unknown): value is GenreConventionTag {
  return typeof value === 'string' && GENRE_CONVENTION_TAG_SET.has(value);
}

export function getGenreConventions(
  genreFrame: GenreFrame,
): readonly GenreConventionEntry[] {
  return GENRE_CONVENTIONS_BY_GENRE[genreFrame];
}
