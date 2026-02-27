import type { GenreFrame } from './concept-generator.js';

export const GENRE_OBLIGATION_TAGS_BY_GENRE = {
  ADVENTURE: ['call_to_quest', 'threshold_crossing', 'ordeal_and_escape', 'treasure_with_cost'],
  COSMIC_HORROR: [
    'forbidden_knowledge_discovered',
    'reality_unravels',
    'insignificance_revelation',
    'irreversible_psychic_cost',
  ],
  CYBERPUNK: [
    'systemic_exploitation_exposed',
    'high_tech_infiltration',
    'betrayal_by_power_structure',
    'pyrrhic_victory_against_system',
  ],
  DARK_COMEDY: [
    'moral_line_crossed_for_laughs',
    'escalating_consequence_spiral',
    'social_hypocrisy_exposed',
    'bleak_ironic_resolution',
  ],
  DRAMA: [
    'relationship_fracture',
    'hard_truth_confrontation',
    'sacrifice_or_compromise_choice',
    'earned_emotional_reckoning',
  ],
  DYSTOPIAN: [
    'oppressive_order_established',
    'resistance_sparked',
    'state_violence_demonstrated',
    'system_price_of_survival',
  ],
  ESPIONAGE: ['mission_briefing', 'double_agent_reveal', 'tradecraft_operation', 'trust_collapse'],
  FABLE: ['moral_test_presented', 'symbolic_guide_appears', 'vice_punished', 'lesson_embodied'],
  FANTASY: ['magic_boundary_defined', 'artifact_or_boon_sought', 'mythic_trial', 'wonder_with_cost'],
  GOTHIC: ['haunted_setting_introduced', 'family_secret_unsealed', 'decay_mirrors_psyche', 'doom_tinged_climax'],
  GRIMDARK: ['institutional_brutality_shown', 'compromise_of_principle', 'no_clean_victory', 'survival_over_heroism'],
  HISTORICAL: [
    'period_pressure_established',
    'personal_vs_era_conflict',
    'historical_turning_point_encountered',
    'legacy_consequence',
  ],
  HORROR: ['threat_manifestation', 'false_safety', 'isolation_or_entrapment', 'final_confrontation_with_cost'],
  LITERARY: ['interiority_focus', 'ordinary_life_disruption', 'symbolic_motif_return', 'ambiguous_but_thematic_closure'],
  MAGICAL_REALISM: [
    'mundane_world_with_unquestioned_marvel',
    'mythic_symbol_intrudes',
    'emotional_truth_over_literal_logic',
    'quiet_wonder_resolution',
  ],
  MYSTERY: ['crime_or_puzzle_presented', 'red_herring_planted', 'key_clue_recontextualized', 'culprit_unmasked'],
  MYTHIC: ['prophecy_or_call_issued', 'descent_or_ordeal', 'boon_or_revelation_won', 'return_with_transformation'],
  NOIR: ['fatal_flaw_exploited', 'corruption_web_revealed', 'false_trust_broken', 'bitter_resolution'],
  PICARESQUE: ['rogue_enters_new_milieu', 'episodic_confrontation_with_order', 'satiric_social_exposure', 'restless_departure'],
  POST_APOCALYPTIC: [
    'aftermath_world_rules',
    'resource_conflict',
    'fragile_shelter_breached',
    'humanity_tested_under_ruin',
  ],
  ROMANCE: [
    'attraction_spark',
    'intimacy_growth',
    'misunderstanding_or_barrier_peak',
    'choice_for_union_or_parting',
  ],
  SATIRE: ['target_system_established', 'absurdity_escalation', 'hypocrisy_exposure', 'barbed_resolution'],
  SCI_FI: [
    'speculative_premise_demonstrated',
    'technology_or_idea_complication',
    'ethical_dilemma_under_scale',
    'conceptual_payoff',
  ],
  SURREAL: ['reality_dislocation', 'dream_logic_sequence', 'identity_or_perception_slippage', 'meaning_through_image'],
  THRILLER: ['immediate_threat_established', 'ticking_clock_pressure', 'hero_at_mercy_of_antagonist', 'last_second_reversal'],
  WESTERN: ['frontier_code_conflict', 'law_vs_violence_choice', 'showdown_preparation', 'duel_or_standoff_resolution'],
} as const satisfies Record<GenreFrame, readonly string[]>;

export type GenreObligationTagsByGenre = typeof GENRE_OBLIGATION_TAGS_BY_GENRE;
export type GenreObligationTag =
  GenreObligationTagsByGenre[keyof GenreObligationTagsByGenre][number];

const GENRE_OBLIGATION_TAG_SET = new Set<GenreObligationTag>(
  Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE).flat(),
);

export function isGenreObligationTag(value: unknown): value is GenreObligationTag {
  return typeof value === 'string' && GENRE_OBLIGATION_TAG_SET.has(value as GenreObligationTag);
}

export function getGenreObligationTags(genreFrame: GenreFrame): readonly GenreObligationTag[] {
  return GENRE_OBLIGATION_TAGS_BY_GENRE[genreFrame];
}
