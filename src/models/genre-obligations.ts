import type { GenreFrame } from './concept-generator.js';

export interface GenreObligationEntry {
  readonly tag: string;
  readonly gloss: string;
}

export const GENRE_OBLIGATION_TAGS_BY_GENRE = {
  ABSURDIST: [
    {
      tag: 'logic_applied_to_absurd_conclusion',
      gloss: 'A character follows a reasonable chain of thought to a nonsensical result',
    },
    {
      tag: 'bureaucratic_labyrinth_encountered',
      gloss: 'A system of rules traps the protagonist in circular procedure',
    },
    {
      tag: 'meaningful_gesture_voided',
      gloss: 'An act of significance is rendered pointless by circumstance',
    },
    {
      tag: 'existential_confrontation_without_resolution',
      gloss: 'The protagonist faces the void and receives no answer',
    },
    {
      tag: 'dialogue_at_cross_purposes',
      gloss: 'Characters speak to each other but comprehend nothing',
    },
    {
      tag: 'arbitrary_transformation_accepted',
      gloss: 'A sudden, inexplicable change is treated as unremarkable',
    },
  ],
  ADVENTURE: [
    { tag: 'call_to_quest', gloss: 'An external summons or discovery launches the journey' },
    { tag: 'threshold_crossing', gloss: 'The protagonist leaves the known world behind' },
    { tag: 'ally_tested_or_won', gloss: 'A companion proves loyalty or is recruited through trial' },
    { tag: 'ordeal_survived', gloss: 'The protagonist endures a defining physical or mental test' },
    { tag: 'treasure_with_cost', gloss: 'The prize is won but at meaningful expense' },
    { tag: 'return_transformed', gloss: 'The protagonist comes back changed by the journey' },
  ],
  ALTERNATE_HISTORY: [
    {
      tag: 'divergence_consequence_demonstrated',
      gloss: 'A scene shows a concrete result of the historical change',
    },
    {
      tag: 'historical_figure_recontextualized',
      gloss: 'A known person appears in their altered role',
    },
    {
      tag: 'parallel_to_real_history_highlighted',
      gloss: 'An event echoes what actually happened, with meaningful difference',
    },
    {
      tag: 'cultural_artifact_of_altered_timeline',
      gloss: 'A detail of daily life reveals how different this world became',
    },
    {
      tag: 'ideological_conflict_from_divergence',
      gloss: 'The altered history produces a political or social clash',
    },
    {
      tag: 'point_of_no_return_for_timeline',
      gloss: 'Events reach a moment where the alternate history becomes permanently fixed',
    },
  ],
  COMING_OF_AGE: [
    {
      tag: 'departure_from_known_world',
      gloss: 'The protagonist leaves or is expelled from their sheltered environment',
    },
    {
      tag: 'mentor_or_model_encountered',
      gloss: 'A figure embodies what the protagonist might become',
    },
    {
      tag: 'first_major_disillusionment',
      gloss: 'A belief the protagonist held is shattered by experience',
    },
    {
      tag: 'social_values_clash',
      gloss: "The protagonist's emerging identity conflicts with expectations of family or society",
    },
    {
      tag: 'trial_of_self_definition',
      gloss: 'The protagonist must choose who they are becoming',
    },
    {
      tag: 'maturity_earned_through_loss',
      gloss: 'Understanding comes at a cost: innocence, a relationship, or a dream',
    },
  ],
  COSMIC_HORROR: [
    {
      tag: 'forbidden_knowledge_discovered',
      gloss: "The protagonist learns something they shouldn't",
    },
    { tag: 'reality_unravels', gloss: 'The rules of the world visibly break down' },
    {
      tag: 'insignificance_revelation',
      gloss: 'The protagonist grasps the scale of what they face',
    },
    {
      tag: 'sanity_breaking_encounter',
      gloss: 'Direct contact with the unknowable damages the mind',
    },
    { tag: 'irreversible_psychic_cost', gloss: 'Understanding cannot be unlearned' },
    {
      tag: 'truth_worse_than_ignorance',
      gloss: 'The final revelation makes things worse, not better',
    },
  ],
  CULTIVATION: [
    {
      tag: 'cultivation_breakthrough',
      gloss: 'The protagonist advances through a defined power level through tribulation or insight',
    },
    {
      tag: 'heavenly_tribulation_survived',
      gloss: "The universe itself tests the protagonist's worthiness to advance",
    },
    {
      tag: 'sect_conflict_or_tournament',
      gloss: 'Competition between cultivators or sects provides structure',
    },
    {
      tag: 'ancient_inheritance_discovered',
      gloss: 'A powerful legacy from a long-dead cultivator is found',
    },
    {
      tag: 'realm_ascension',
      gloss: 'The protagonist moves to a higher realm with stronger beings',
    },
    {
      tag: 'dao_comprehension_moment',
      gloss: 'A philosophical or spiritual insight unlocks power',
    },
  ],
  CYBERPUNK: [
    {
      tag: 'systemic_exploitation_exposed',
      gloss: 'The protagonist sees how the system extracts from the powerless',
    },
    { tag: 'high_tech_infiltration', gloss: 'Technology is used to breach a defended space' },
    {
      tag: 'body_or_mind_modified_under_pressure',
      gloss: 'Augmentation happens under duress or necessity',
    },
    {
      tag: 'betrayal_by_power_structure',
      gloss: 'An institution the protagonist relied on turns hostile',
    },
    {
      tag: 'data_heist_or_info_weapon',
      gloss: 'Information is stolen or weaponized in a key scene',
    },
    {
      tag: 'pyrrhic_victory_against_system',
      gloss: 'The protagonist wins but the system absorbs the damage',
    },
  ],
  DARK_COMEDY: [
    {
      tag: 'moral_line_crossed_for_laughs',
      gloss: 'A character does something terrible and it is funny',
    },
    {
      tag: 'escalating_consequence_spiral',
      gloss: 'One bad decision cascades into compounding disasters',
    },
    {
      tag: 'social_hypocrisy_exposed',
      gloss: 'A respected figure or institution is revealed as fraudulent',
    },
    {
      tag: 'accomplice_through_inaction',
      gloss: 'A character becomes complicit by failing to act',
    },
    { tag: 'darkest_joke_lands', gloss: 'The most transgressive moment produces the biggest laugh' },
    {
      tag: 'bleak_ironic_resolution',
      gloss: 'The ending resolves things but in a way that mocks resolution',
    },
  ],
  DRAMA: [
    { tag: 'relationship_fracture', gloss: 'A meaningful bond breaks under pressure' },
    {
      tag: 'hard_truth_confrontation',
      gloss: 'A character is forced to face an uncomfortable reality',
    },
    { tag: 'vulnerability_exposed', gloss: 'A character reveals what they have been hiding' },
    {
      tag: 'sacrifice_or_compromise_choice',
      gloss: 'A character must give something up to gain something else',
    },
    { tag: 'silence_broken', gloss: 'Something long unsaid is finally spoken' },
    {
      tag: 'earned_emotional_reckoning',
      gloss: 'The climax delivers emotional payoff built over the full arc',
    },
  ],
  DYSTOPIAN: [
    {
      tag: 'oppressive_order_demonstrated',
      gloss: "The system's power is shown in action against someone",
    },
    { tag: 'resistance_sparked', gloss: 'A moment of defiance ignites broader opposition' },
    {
      tag: 'state_violence_witnessed',
      gloss: "The protagonist sees the system's willingness to destroy",
    },
    {
      tag: 'informer_or_betrayal_within_resistance',
      gloss: 'Trust within the opposition collapses',
    },
    { tag: 'forbidden_knowledge_accessed', gloss: 'The protagonist learns what the system hides' },
    { tag: 'system_price_of_survival', gloss: 'Surviving within the system demands moral cost' },
  ],
  EROTICA: [
    { tag: 'desire_awakened', gloss: 'A character becomes aware of a specific, consuming want' },
    {
      tag: 'boundary_tested',
      gloss: 'A limit—physical, emotional, or social—is approached and negotiated',
    },
    {
      tag: 'intimacy_escalation',
      gloss: 'Physical encounters intensify in vulnerability or stakes',
    },
    {
      tag: 'fantasy_made_real',
      gloss: 'Something only imagined is acted upon for the first time',
    },
    {
      tag: 'consequence_of_surrender',
      gloss: 'Yielding to desire produces a meaningful change in circumstances',
    },
    {
      tag: 'reckoning_with_want',
      gloss: 'A character confronts what their desires reveal about themselves',
    },
  ],
  ESPIONAGE: [
    {
      tag: 'mission_briefing_with_hidden_agenda',
      gloss: "The assignment has layers the protagonist doesn't see",
    },
    { tag: 'cover_identity_tested', gloss: 'The false self is nearly exposed' },
    { tag: 'double_agent_reveal', gloss: 'Someone is working for the other side' },
    {
      tag: 'tradecraft_operation_under_pressure',
      gloss: 'A procedural operation goes wrong or must be improvised',
    },
    { tag: 'trust_collapse', gloss: 'A key relationship is revealed as compromised' },
    {
      tag: 'handler_betrayal_or_sacrifice',
      gloss: "The authority figure acts against the protagonist's interest or gives themselves up",
    },
  ],
  FABLE: [
    { tag: 'moral_test_presented', gloss: 'The protagonist faces a clear ethical choice' },
    { tag: 'symbolic_guide_appears', gloss: 'A figure embodies wisdom and offers direction' },
    {
      tag: 'vice_demonstrated_through_action',
      gloss: "A character's flaw produces visible consequences",
    },
    {
      tag: 'unexpected_reversal_of_fortune',
      gloss: 'Circumstance flips for a character based on their virtue or vice',
    },
    { tag: 'vice_punished', gloss: 'Wrongdoing receives its consequence' },
    {
      tag: 'lesson_embodied_in_outcome',
      gloss: "The story's moral is demonstrated by what happens, not stated",
    },
  ],
  FANTASY: [
    {
      tag: 'magic_boundary_tested',
      gloss: 'A character pushes against the limits of what magic allows',
    },
    { tag: 'artifact_or_boon_sought', gloss: 'A powerful object or gift is the focus of a quest' },
    {
      tag: 'mythic_trial',
      gloss: 'The protagonist faces a test with symbolic or supernatural weight',
    },
    { tag: 'sacrifice_to_power', gloss: 'Magic or power demands something in exchange' },
    { tag: 'wonder_with_cost', gloss: 'A moment of awe carries a price' },
    {
      tag: 'prophecy_fulfilled_or_subverted',
      gloss: 'A foretold event comes true or is deliberately broken',
    },
  ],
  GOTHIC: [
    {
      tag: 'haunted_setting_introduced',
      gloss: 'The primary location is established as oppressive and laden with history',
    },
    { tag: 'family_secret_unsealed', gloss: 'A hidden truth about lineage or legacy is revealed' },
    {
      tag: 'doppelganger_or_doubling_encountered',
      gloss: 'A mirror, double, or uncanny reflection appears',
    },
    { tag: 'transgression_against_nature', gloss: 'A character violates natural or moral law' },
    {
      tag: 'decay_mirrors_psyche',
      gloss: "Physical deterioration of setting reflects a character's inner state",
    },
    { tag: 'doom_tinged_climax', gloss: 'The resolution carries an air of inescapability' },
  ],
  GRIMDARK: [
    {
      tag: 'institutional_brutality_shown',
      gloss: 'A system inflicts cruelty as standard procedure',
    },
    { tag: 'compromise_of_principle', gloss: 'A character abandons a moral stance to survive' },
    {
      tag: 'ally_lost_to_pragmatism',
      gloss: 'A companion is sacrificed for tactical advantage',
    },
    {
      tag: 'power_seized_through_cruelty',
      gloss: 'Authority is gained through violence or manipulation',
    },
    { tag: 'no_clean_victory', gloss: 'The best outcome still costs dearly' },
    { tag: 'survival_over_heroism', gloss: 'Living trumps doing the right thing' },
  ],
  HEIST: [
    {
      tag: 'team_assembly',
      gloss: 'Recruitment of specialists with distinct, complementary skills',
    },
    {
      tag: 'plan_reveal',
      gloss: 'The scheme is presented with sufficient detail to create investment',
    },
    {
      tag: 'execution_with_complication',
      gloss: 'The plan goes into motion and something goes wrong',
    },
    {
      tag: 'hidden_plan_reveal',
      gloss: 'The protagonists had a deeper plan than what was shown',
    },
    {
      tag: 'betrayal_or_double_cross',
      gloss: 'Someone has a hidden agenda or is outmaneuvered',
    },
    {
      tag: 'satisfaction_payoff',
      gloss: 'The final reveal reframes earlier events',
    },
  ],
  HISTORICAL: [
    {
      tag: 'period_pressure_established',
      gloss: "The era's specific constraints are shown bearing on characters",
    },
    {
      tag: 'personal_vs_era_conflict',
      gloss: "A character's desires clash with historical norms",
    },
    {
      tag: 'historical_turning_point_encountered',
      gloss: 'A real or analogous historical event intersects the plot',
    },
    { tag: 'social_station_tested', gloss: 'Class or rank is challenged or enforced' },
    {
      tag: 'anachronistic_desire_punished',
      gloss: 'A character wanting what the era forbids faces consequences',
    },
    { tag: 'legacy_consequence', gloss: 'Past actions or ancestry shape present outcomes' },
  ],
  HORROR: [
    { tag: 'threat_manifestation', gloss: 'The antagonist or danger appears for the first time' },
    { tag: 'false_safety_shattered', gloss: 'A moment of relief is violently interrupted' },
    { tag: 'isolation_or_entrapment', gloss: 'The protagonist is cut off from help' },
    { tag: 'ally_lost_to_threat', gloss: 'A companion falls victim to the danger' },
    {
      tag: 'monster_reveal_or_escalation',
      gloss: 'The true nature or scale of the threat becomes clear',
    },
    { tag: 'final_confrontation_with_cost', gloss: 'The climax demands a price for survival' },
  ],
  ISEKAI: [
    {
      tag: 'world_displacement_event',
      gloss: 'The protagonist is torn from their ordinary existence',
    },
    {
      tag: 'rules_of_new_world_discovered',
      gloss: 'The mechanics or laws of the new reality are revealed',
    },
    {
      tag: 'outsider_advantage_demonstrated',
      gloss: 'Knowledge from the old world solves a problem others cannot',
    },
    {
      tag: 'old_identity_challenged',
      gloss: 'Who the protagonist was no longer fits who they must become',
    },
    {
      tag: 'new_world_stakes_made_personal',
      gloss: 'The protagonist gains something worth protecting in this world',
    },
    {
      tag: 'point_of_no_return',
      gloss: 'Returning to the old world becomes impossible or undesirable',
    },
  ],
  KAIJU: [
    {
      tag: 'creature_emergence_spectacle',
      gloss: 'The monster appears or arrives with overwhelming visual impact',
    },
    {
      tag: 'infrastructure_destruction_sequence',
      gloss: 'Buildings, vehicles, or systems are destroyed at massive scale',
    },
    {
      tag: 'human_response_proves_inadequate',
      gloss: 'Military or scientific countermeasures fail against the creature',
    },
    {
      tag: 'civilian_perspective_on_catastrophe',
      gloss: 'Ordinary people experience the devastation at ground level',
    },
    {
      tag: 'creature_nature_partially_revealed',
      gloss: "Something about the monster's origin, motivation, or biology is discovered",
    },
    {
      tag: 'sacrifice_at_monster_scale',
      gloss: 'A human choice with enormous cost addresses the creature-level threat',
    },
  ],
  LITRPG: [
    {
      tag: 'status_screen_revealed',
      gloss: "The protagonist's stats, skills, or level are displayed",
    },
    {
      tag: 'level_up_or_skill_acquisition',
      gloss: 'The protagonist gains measurable power through the system',
    },
    {
      tag: 'system_rule_exploited',
      gloss: 'The protagonist discovers and uses a mechanical advantage others missed',
    },
    {
      tag: 'boss_encounter_with_visible_mechanics',
      gloss: "A major combat tests the protagonist's build and strategy",
    },
    {
      tag: 'loot_drop_or_reward_claimed',
      gloss: 'A significant item or ability is obtained after a challenge',
    },
    {
      tag: 'system_limitation_creates_crisis',
      gloss: 'A rule or restriction of the game system produces a genuine threat',
    },
  ],
  LITERARY: [
    { tag: 'ordinary_disruption', gloss: "A small event fractures the protagonist's routine" },
    {
      tag: 'interiority_deepened',
      gloss: 'A scene focuses on internal experience over external action',
    },
    {
      tag: 'symbolic_motif_crystallizes',
      gloss: 'A recurring image or pattern achieves its fullest meaning',
    },
    { tag: 'relationship_reexamined', gloss: 'A familiar bond is seen from a new angle' },
    {
      tag: 'epiphany_or_anti_epiphany',
      gloss: 'The protagonist reaches or fails to reach understanding',
    },
    {
      tag: 'ambiguous_but_thematic_closure',
      gloss: 'The ending resonates thematically without resolving cleanly',
    },
  ],
  MAGICAL_REALISM: [
    {
      tag: 'mundane_world_with_unquestioned_marvel',
      gloss: 'Magic appears and no one is surprised',
    },
    { tag: 'mythic_symbol_intrudes', gloss: 'A figure or event from folklore enters the narrative' },
    {
      tag: 'community_ritual_or_collective_memory',
      gloss: 'A shared practice or memory carries weight',
    },
    {
      tag: 'political_reality_surfaced_through_magic',
      gloss: 'Social truth is revealed via supernatural means',
    },
    {
      tag: 'emotional_truth_over_literal_logic',
      gloss: 'Feelings take precedence over physical plausibility',
    },
    {
      tag: 'quiet_wonder_resolution',
      gloss: 'The ending carries gentle astonishment rather than spectacle',
    },
  ],
  MILITARY: [
    {
      tag: 'combat_engagement_with_consequences',
      gloss: 'A battle or firefight produces casualties or lasting effects',
    },
    {
      tag: 'order_obeyed_against_judgment',
      gloss: 'A character follows a command they believe is wrong',
    },
    {
      tag: 'unit_bond_tested_under_fire',
      gloss: 'Combat or crisis strains the relationship between soldiers',
    },
    {
      tag: 'home_front_intrusion',
      gloss: 'Personal life or civilian reality pierces the military bubble',
    },
    {
      tag: 'tactical_dilemma_with_human_cost',
      gloss: 'A strategic decision requires accepting harm to some for the benefit of others',
    },
    {
      tag: 'psychological_toll_manifested',
      gloss: 'The accumulated stress of combat produces visible behavioral change',
    },
  ],
  MYSTERY: [
    { tag: 'crime_or_puzzle_presented', gloss: 'The central question or crime is established' },
    { tag: 'red_herring_planted', gloss: 'A misleading clue or suspect diverts attention' },
    {
      tag: 'key_witness_or_suspect_confronted',
      gloss: 'The detective presses someone who knows something',
    },
    {
      tag: 'key_clue_recontextualized',
      gloss: 'An earlier detail is revealed to mean something different',
    },
    { tag: 'detective_synthesis_moment', gloss: 'The investigator assembles the full picture' },
    { tag: 'culprit_unmasked', gloss: 'The guilty party is identified and confronted' },
  ],
  MYTHIC: [
    {
      tag: 'prophecy_or_call_issued',
      gloss: 'A supernatural or fateful summons launches the quest',
    },
    { tag: 'threshold_guardian_confronted', gloss: 'A figure blocks passage to the next stage' },
    { tag: 'descent_or_ordeal', gloss: 'The hero enters a place of trial and suffering' },
    { tag: 'mentor_lost_or_transcended', gloss: 'The guide falls away, forcing independence' },
    {
      tag: 'boon_or_revelation_won',
      gloss: "The quest's prize is obtained through sacrifice",
    },
    { tag: 'return_with_transformation', gloss: 'The hero comes back fundamentally changed' },
  ],
  NOIR: [
    { tag: 'fatal_flaw_exploited', gloss: "The protagonist's weakness is turned against them" },
    { tag: 'corruption_web_revealed', gloss: 'The network of complicity becomes visible' },
    { tag: 'false_trust_broken', gloss: 'Someone the protagonist relied on proves false' },
    {
      tag: 'moral_point_of_no_return_crossed',
      gloss: 'The protagonist does something they cannot undo',
    },
    { tag: 'false_hope_dangled_then_snatched', gloss: 'A way out appears and is taken away' },
    { tag: 'bitter_resolution', gloss: 'The ending delivers truth without comfort' },
  ],
  PARANORMAL: [
    {
      tag: 'supernatural_encounter_in_mundane_setting',
      gloss: 'A supernatural being or event intrudes on ordinary life',
    },
    {
      tag: 'hidden_world_rules_discovered',
      gloss: 'The protagonist learns how the supernatural community operates',
    },
    {
      tag: 'species_prejudice_encountered',
      gloss: 'Tension between human and supernatural groups surfaces',
    },
    {
      tag: 'power_negotiation_across_species',
      gloss: 'Human and supernatural characters establish or contest boundaries',
    },
    {
      tag: 'human_ally_or_enemy_of_supernatural',
      gloss: 'A mortal takes a definitive side in supernatural affairs',
    },
    {
      tag: 'masquerade_threatened_or_maintained',
      gloss: 'The secret of supernatural existence is nearly exposed or deliberately protected',
    },
  ],
  PICARESQUE: [
    {
      tag: 'rogue_enters_new_milieu',
      gloss: 'The protagonist arrives in an unfamiliar social world',
    },
    {
      tag: 'episodic_confrontation_with_order',
      gloss: 'The protagonist clashes with authority or convention',
    },
    {
      tag: 'satiric_social_exposure',
      gloss: 'A social class or institution is shown as corrupt or absurd',
    },
    {
      tag: 'wit_deployed_as_weapon',
      gloss: 'The protagonist uses cleverness to escape or prevail',
    },
    {
      tag: 'patron_or_mark_outwitted',
      gloss: 'A powerful figure is deceived or manipulated',
    },
    {
      tag: 'restless_departure',
      gloss: 'The protagonist moves on, unchanged, to the next episode',
    },
  ],
  POST_APOCALYPTIC: [
    {
      tag: 'aftermath_world_rules_established',
      gloss: "The new reality's constraints are shown",
    },
    { tag: 'resource_conflict', gloss: 'People clash over scarce necessities' },
    { tag: 'fragile_shelter_breached', gloss: 'A place of safety is compromised' },
    {
      tag: 'old_world_echo_discovered',
      gloss: 'A relic or memory of the previous civilization surfaces',
    },
    { tag: 'community_trust_tested', gloss: 'Group bonds strain under survival pressure' },
    {
      tag: 'humanity_tested_under_ruin',
      gloss: 'A character must choose between self-interest and compassion',
    },
  ],
  ROMANCE: [
    { tag: 'attraction_spark', gloss: 'The lovers first feel mutual pull' },
    { tag: 'intimacy_deepened', gloss: 'Emotional or physical closeness increases' },
    { tag: 'vulnerability_exchanged', gloss: 'Both lovers reveal something hidden' },
    {
      tag: 'misunderstanding_or_barrier_peak',
      gloss: 'The obstacle between them reaches maximum intensity',
    },
    {
      tag: 'grand_gesture_or_confession',
      gloss: 'A character risks everything to declare their feelings',
    },
    {
      tag: 'choice_for_union_or_parting',
      gloss: 'The final decision about the relationship is made',
    },
  ],
  SATIRE: [
    { tag: 'target_system_established', gloss: 'The institution or social structure is introduced' },
    {
      tag: 'absurdity_escalation',
      gloss: "The system's logic produces increasingly ridiculous outcomes",
    },
    {
      tag: 'earnest_fool_enters_system',
      gloss: "A sincere character highlights the system's dysfunction",
    },
    {
      tag: 'hypocrisy_exposure',
      gloss: 'A gap between professed values and actual behavior is revealed',
    },
    {
      tag: 'system_logic_taken_to_extreme',
      gloss: 'Following the rules to their conclusion produces absurdity',
    },
    { tag: 'barbed_resolution', gloss: 'The ending comments on the system without reforming it' },
  ],
  SCI_FI: [
    { tag: 'speculative_premise_demonstrated', gloss: 'The core "what if" is shown in action' },
    {
      tag: 'technology_or_idea_complication',
      gloss: 'The premise creates unforeseen problems',
    },
    {
      tag: 'scale_shift_encounter',
      gloss: 'The protagonist confronts something at a vastly different magnitude',
    },
    {
      tag: 'ethical_dilemma_under_new_rules',
      gloss: 'Moral questions arise from the speculative premise',
    },
    {
      tag: 'unintended_consequence_cascade',
      gloss: 'The technology or idea produces chain reactions',
    },
    { tag: 'conceptual_payoff', gloss: "The story's central idea reaches its fullest expression" },
  ],
  SLICE_OF_LIFE: [
    {
      tag: 'quiet_moment_of_connection',
      gloss: 'Two characters share an understated moment of understanding',
    },
    {
      tag: 'daily_ritual_disrupted',
      gloss: 'A small change in routine produces gentle ripple effects',
    },
    {
      tag: 'seasonal_or_temporal_passage_marked',
      gloss: 'The progression of time is noted through natural or cultural markers',
    },
    {
      tag: 'minor_conflict_resolved_through_empathy',
      gloss: 'A low-stakes disagreement is settled by understanding rather than force',
    },
    {
      tag: 'beauty_in_the_ordinary_noticed',
      gloss: 'A character pauses to appreciate something commonplace',
    },
    {
      tag: 'bittersweet_acceptance_of_change',
      gloss: 'Something familiar ends or shifts, and the character lets it go',
    },
  ],
  SPACE_OPERA: [
    {
      tag: 'galaxy_threatening_crisis',
      gloss: 'An existential threat to multiple civilizations',
    },
    {
      tag: 'unlikely_alliance_forged',
      gloss: 'Factions that distrust each other cooperate against the greater threat',
    },
    {
      tag: 'space_battle_at_turning_point',
      gloss: 'A large-scale engagement determines the trajectory of events',
    },
    {
      tag: 'personal_sacrifice_for_galactic_stakes',
      gloss: 'An individual choice with cosmic consequences',
    },
    {
      tag: 'bridge_confrontation',
      gloss: 'A climactic face-to-face encounter between protagonist and antagonist in a seat of power',
    },
    {
      tag: 'hope_preserved_through_action',
      gloss: 'Resolution affirms that individual courage matters at any scale',
    },
  ],
  STEAMPUNK: [
    {
      tag: 'invention_unveiled_or_tested',
      gloss: 'A new machine or device is demonstrated for the first time',
    },
    {
      tag: 'class_boundary_crossed_or_enforced',
      gloss: 'A character confronts the limits of their social station',
    },
    {
      tag: 'mechanical_spectacle_sequence',
      gloss: 'Complex machinery produces a visually dramatic scene',
    },
    {
      tag: 'imperial_power_confronted',
      gloss: 'The reach of empire affects the protagonist directly',
    },
    {
      tag: 'technological_malfunction_with_consequence',
      gloss: 'A machine fails in a way that drives the plot forward',
    },
    {
      tag: 'artisan_vs_industrialist_tension',
      gloss: 'Individual craft clashes with mass production or institutional control',
    },
  ],
  SURREAL: [
    { tag: 'reality_dislocation', gloss: 'The world shifts away from the familiar' },
    { tag: 'dream_logic_sequence', gloss: 'Events follow emotional rather than causal order' },
    {
      tag: 'identity_or_perception_slippage',
      gloss: "The protagonist's sense of self or reality wavers",
    },
    {
      tag: 'incongruous_juxtaposition_crystallizes',
      gloss: 'Unrelated elements collide to produce meaning',
    },
    { tag: 'defamiliarized_encounter', gloss: 'Something ordinary becomes profoundly strange' },
    {
      tag: 'meaning_through_image',
      gloss: "A visual or sensory moment conveys the story's deepest point",
    },
  ],
  SURVIVAL: [
    {
      tag: 'resource_scarcity_crisis',
      gloss: 'A critical supply runs out or becomes dangerously low',
    },
    {
      tag: 'environmental_hazard_confronted',
      gloss: 'Weather, terrain, or wildlife presents an immediate physical threat',
    },
    {
      tag: 'shelter_or_tool_improvised',
      gloss: 'The protagonist creates a solution from available materials',
    },
    {
      tag: 'physical_limit_reached',
      gloss: 'The body fails or nearly fails under the demands of survival',
    },
    {
      tag: 'moral_choice_under_scarcity',
      gloss: 'Limited resources force a decision about who benefits',
    },
    {
      tag: 'rescue_or_self_rescue_turning_point',
      gloss: 'The protagonist either finds help or commits to saving themselves',
    },
  ],
  THRILLER: [
    { tag: 'immediate_threat_established', gloss: 'Danger is present from the outset' },
    { tag: 'ticking_clock_activated', gloss: 'A deadline creates urgency' },
    { tag: 'protagonist_outmaneuvered', gloss: 'The antagonist gains advantage' },
    { tag: 'hero_at_mercy_of_antagonist', gloss: 'The protagonist is trapped or powerless' },
    { tag: 'false_ending', gloss: 'An apparent resolution proves premature' },
    { tag: 'last_second_reversal', gloss: 'The climax turns on a final unexpected shift' },
  ],
  TRAGEDY: [
    {
      tag: 'hamartia_demonstrated',
      gloss: 'The fatal flaw is established through concrete action',
    },
    {
      tag: 'stature_established',
      gloss: "The protagonist's position, capability, or worth is shown before the fall",
    },
    {
      tag: 'escalation_through_character',
      gloss: "Each escalation flows from the protagonist's nature, not external machinations",
    },
    {
      tag: 'point_of_no_return_by_own_hand',
      gloss: 'The protagonist crosses an irreversible threshold through their own choices',
    },
    {
      tag: 'peripeteia',
      gloss: "A sudden reversal of fortune caused by the protagonist's own actions",
    },
    {
      tag: 'anagnorisis',
      gloss: 'The protagonist sees, too late, the truth of their situation and their role in causing it',
    },
  ],
  TRANSGRESSIVE: [
    {
      tag: 'taboo_act_committed_without_apology',
      gloss: 'A character crosses a social boundary and the narrative does not condemn them',
    },
    {
      tag: 'conformity_mask_removed',
      gloss: "A character's respectable surface is stripped away",
    },
    {
      tag: 'subculture_ritual_entered',
      gloss: 'The protagonist participates in an activity outside mainstream acceptance',
    },
    {
      tag: 'consumption_or_excess_sequence',
      gloss: 'A scene of indulgence or self-destruction is rendered in unflinching detail',
    },
    {
      tag: 'violence_as_self_expression',
      gloss: 'A character uses destruction to communicate what words cannot',
    },
    {
      tag: 'identity_dissolution_climax',
      gloss: "The protagonist's sense of self breaks down under accumulated transgression",
    },
  ],
  UTOPIAN: [
    {
      tag: 'society_design_demonstrated',
      gloss: 'A specific mechanism of the ideal society is shown functioning',
    },
    {
      tag: 'newcomer_orientation_sequence',
      gloss: 'The utopia is explained to someone encountering it for the first time',
    },
    {
      tag: 'hidden_cost_surfaced',
      gloss: 'A sacrifice or limitation required by the perfect system becomes visible',
    },
    {
      tag: 'dissident_voice_raised',
      gloss: 'Someone within or arriving from outside questions the ideal',
    },
    {
      tag: 'philosophical_defense_of_order',
      gloss: 'A character articulates why the system works and must be preserved',
    },
    {
      tag: 'utopian_principle_tested_by_crisis',
      gloss: "An emergency or edge case challenges the society's foundational rules",
    },
  ],
  WESTERN: [
    {
      tag: 'frontier_code_conflict',
      gloss: 'A character must choose between competing moral codes',
    },
    {
      tag: 'law_vs_violence_choice',
      gloss: 'The protagonist faces the question of righteous force',
    },
    { tag: 'showdown_preparation', gloss: 'Tension builds toward an inevitable confrontation' },
    {
      tag: 'landscape_as_crucible',
      gloss: "The physical environment tests the protagonist's endurance",
    },
    { tag: 'honor_tested_by_survival', gloss: 'Principle clashes with self-preservation' },
    {
      tag: 'duel_or_standoff_resolution',
      gloss: 'The climax centers on a direct confrontation',
    },
  ],
  WUXIA: [
    {
      tag: 'training_or_cultivation_breakthrough',
      gloss: 'The protagonist achieves a martial advancement through discipline',
    },
    {
      tag: 'honor_code_tested',
      gloss: 'Following xia principles conflicts with survival or personal desire',
    },
    {
      tag: 'martial_demonstration',
      gloss: 'Martial prowess is tested publicly against other practitioners',
    },
    {
      tag: 'master_or_lineage_debt',
      gloss: 'The protagonist must honor a debt to their teacher or school',
    },
    {
      tag: 'jianghu_justice_sought',
      gloss: "Justice must be pursued through the martial community's own mechanisms",
    },
    {
      tag: 'secret_technique_sought',
      gloss: 'A specific martial technique or manual becomes a contested prize',
    },
  ],
} as const satisfies Record<GenreFrame, readonly GenreObligationEntry[]>;

export type GenreObligationTagsByGenre = typeof GENRE_OBLIGATION_TAGS_BY_GENRE;
export type GenreObligationTag =
  GenreObligationTagsByGenre[keyof GenreObligationTagsByGenre][number]['tag'];

const GENRE_OBLIGATION_TAG_SET = new Set<string>(
  Object.values(GENRE_OBLIGATION_TAGS_BY_GENRE)
    .flat()
    .map((e) => e.tag),
);

export function isGenreObligationTag(value: unknown): value is GenreObligationTag {
  return typeof value === 'string' && GENRE_OBLIGATION_TAG_SET.has(value);
}

export function getGenreObligationTags(
  genreFrame: GenreFrame,
): readonly GenreObligationEntry[] {
  return GENRE_OBLIGATION_TAGS_BY_GENRE[genreFrame];
}
