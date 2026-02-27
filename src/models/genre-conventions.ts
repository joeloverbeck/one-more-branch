import type { GenreFrame } from './concept-generator.js';

export interface GenreConventionEntry {
  readonly tag: string;
  readonly gloss: string;
}

export const GENRE_CONVENTIONS_BY_GENRE = {
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
