**Status**: COMPLETED

# Improvements to Content Packets Pipeline

I haven't been entirely happy with the content packets produced by the full pipeline in localhost:3000/content-packets . The prompt docs are at prompts/* , starting with content-*. 

I fed the prompt docs to ChatGPT Pro to see if it could find issues, possible improvements to make, or even features to add that would be beneficial.

## ChatGPT's response

Blunt verdict: this is a strong pipeline, especially the Packeter, but it is still optimized more for charged premise generation than for durable interactive branching seeds. The big missing pieces are: explicit modeling of the kind of decisions the user wants to inhabit, stronger encoding of how branches actually diverge, and final-stage scoring for taste fit and seed durability, not just artistic voltage. Right now the system can produce packets that are vivid and original but still a little brittle as branching-story foundations.

One prompt-level note first: the language is stylish, but the first two stages are a bit too in love with stylishness. Phrases like “gustatory DNA extractor” and repeated demands for “charged” output push the model toward performative weirdness unless you counterweight them with harder operational requirements. Keep the voice. Tighten the machinery.

### Taste Distiller

What it gets right: it explicitly forbids copying surface nouns and tries to extract deeper appetites—collision patterns, social engines, scene appetites, anti-patterns, tone blend. That is exactly the right direction. Research on analogy and computational story generation consistently points to structural similarity over surface similarity as the engine of real novelty.

What it misses: it captures aesthetic taste better than interactive taste. Choice-poetics work says narrative choices are experienced through the relation among options, outcomes, and player goals, and that players approach the same choice through different modes of engagement. Your distiller has no direct field for that. So later stages have to guess whether this user wants to roleplay, investigate, protect, transgress, optimize, express, or endure moral compromise. riskAppetite is also too blunt; it does not capture value hierarchies, ambiguity tolerance, or what kind of ethical discomfort the user actually enjoys.

What I would add: engagementModes, fantasyOfAgency, valueTensions, revelationPatterns, deepPatterns, and spatialAppetites. deepPatterns should be relation-level formulas, not genre tags: things like “private grief becomes public ritual” or “bureaucracy forces intimacy to disguise itself as procedure.” spatialAppetites matters because games and interactive fiction are not just plots; they are navigable narrative architectures and environmental storytelling systems. I would also add nearMisses: ideas that look superficially right but betray the deeper taste. That gives downstream stages a sharper negative boundary than antiPatterns alone.

A smaller fix: treat surfaceDoNotRepeat as a soft penalty, not a sacred blacklist. Avoiding superficial recycling is smart; absolute bans can accidentally kill the very deep pattern the user actually loves.

### Sparkstormer

What it gets right: the volume is good, and the taxonomy is smarter than usual. Including INSTITUTION, POLICY, JOB, SUBCULTURE, and ECONOMY is excellent because it gives the model handles for non-combat conflict and social machinery. Conflict theory absolutely supports that instinct.

What is underpowered: the spark schema still allows a spark to be little more than cool fragment + vivid image + tags. That is fine for moodboards; it is not enough for branching-story generation. Research on meaningful choice is stricter: players feel more agency when options produce discernibly different outcomes integrated into the broader context, and those differences can be understood along dimensions like time, space, goals, and characters. Right now your Packeter has to invent that later. That is too much deferred work.

So I would require every spark to imply five concrete things: playerRole, want, counterforce, uncertaintyHook, and branchFork. I would also add deepPatternRef so the spark is visibly grounded in the Distiller’s abstractions, and noveltyMode so you intentionally sample combinational, exploratory, and transformational novelty instead of getting forty variations on the same move. I would expand contentKind with at least PLACE or TOPOLOGY, and SECRET or KNOWLEDGE_REGIME, because interactive narratives live and die on spaces and information asymmetry.

I would also impose portfolio constraints inside the prompt itself: cap repetition by contentKind and by deepPatternRef, and force 20–30% of sparks to be “taste stretch” sparks that fit the user but extend them. Otherwise mode collapse will set in fast.

### Content Packeter

This is your best prompt by a comfortable margin. socialEngine, choicePressure, escalationPath, wildnessInvariant, and dullCollapse are all genuinely load-bearing. This prompt already understands that a concept seed is not just a premise but a pressure system with a failure mode.

The main problems are structural. First, viewpointPressure is optional when it should be mandatory. Agency research says players need to have actions they actually want to take and be able to understand how those actions matter. Second, choicePressure is still too vague unless the packet also names the actual options and how the world diverges after each one. Third, the strict one-spark-to-one-packet rule is too conservative. Elaboration and recombination are where a lot of novelty appears, and structured creativity research is pretty clear that idea systems often underselect novelty unless they deliberately build and integrate across ideas.

So I would make playerPosition required and replace optional viewpointPressure with it. Then add coreDilemmaOptions, choiceStateDelta, commitmentCost, hiddenPressure, and environmentalStorytelling. choiceStateDelta is the crucial one: it should explicitly state how branches differ—goal, character relationship, social standing, place, time horizon, or knowledge state—instead of merely claiming the packet has “meaningful choices.” That aligns much better with interactive choice research.

I would not fully abandon lineage, but I would relax purity. Keep one primarySparkId, then allow one or two borrowed tags or pressures from other sparks. That preserves traceability without choking off recombination. Also, interactionVerbs should be story-specific. Generic verbs like “explore,” “talk,” or “fight” should fail the prompt unless the packet makes them unusually concrete.

One extra field I genuinely like here is a force-dynamics-style field: forcePattern, meaning who is pushing, who is resisting, and how that struggle changes in phases. Computational narrative work has used that kind of representation for a reason: it compresses conflict into something generative.

### Content Evaluator

This is where the most obvious design mistake lives. Your stated goal is to generate ideas that are novel, compelling, and suited to the user’s tastes, yet the evaluator never directly scores taste alignment. That is not a small omission. It means the final filter is not optimizing for the actual product goal. Creativity research is also clear that novelty is not enough by itself; relevance, workability, and specificity matter too.

The second problem is that branchingPressure is too fuzzy as a final metric. You need a score for choice differentiation or agency yield: do the options actually lead to materially different states? You also need causalSpecificity or workability, because a packet can be gorgeously weird and still be useless as a seed. And because the evaluator sees the whole packet set, it should do portfolio curation, not just packet-by-packet grading. Creativity research on group idea selection shows that selectors often fail to pick the most novel ideas unless the selection process is structured, and recent multi-critic story-generation work shows targeted critique can improve creativity without killing coherence.

I would add tasteAlignment, choiceDifferentiation, causalSpecificity, and branchElasticity. If you want to keep only eight scores, I would demote sceneBurst and split antiGenericity into surfaceFreshness and deepOriginality, because some of the best ideas are superficially legible but structurally strange. I would also add repairNote, redundancyCluster, and a final diverseShortlist step that picks a small number of PRIMARY_SEEDs with maximum spread across deep pattern, player fantasy, social scale, and content kind. And I would make the tasteProfile mandatory here, not optional.

Also: anchored exemplars for 0, 3, and 5 on each dimension would help a lot. Right now the rubric is good conceptually, but still too adjective-driven. Anchored scales are more stable.

### Pipeline-level changes that would pay off fast

One boring but important fix: normalize the ontology across stages. Right now you have humanAnchors, humanAnchor, and humanAche; choicePressure and branchingPressure; antiGenericity alongside wildnessInvariant and dullCollapse. Some of that is intentional, but some of it is semantic drift waiting to happen. Pick one canonical term per concept and reuse it unless the distinction is deliberate.

You also want one explicit critique/refinement loop. Right now the pipeline mostly distills, diverges, expands, and scores. The better pattern is distill → diverge → critique/hybridize → expand → critique/repair → evaluate/curate. Research on collaborative creativity and multi-critic story generation points in the same direction: elaboration and targeted critique improve creativity, and can improve coherence too when the feedback is structured.

And one upstream point: if the user input is just titles or high-level concepts, the Distiller is forced to infer too much. The best improvement outside the prompts themselves would be to collect one or two reasons or unforgettable scenes per exemplar. Choice analysis gets much better when player goals, value priorities, and desired outcomes are explicit rather than guessed.

### Highest-ROI changes, in order

1. Add tasteAlignment and causalSpecificity to the Evaluator, and make tasteProfile mandatory there. That fixes the most obvious optimization mismatch.
2. Make playerPosition, coreDilemmaOptions, and choiceStateDelta mandatory in the Packeter. That gives you actual branching seed structure instead of implied pressure.
3. Add engagementModes, fantasyOfAgency, valueTensions, and deepPatterns to the Distiller. That turns taste into something interactive, not just aesthetic.
4. Make Sparkstormer encode playerRole, want, counterforce, uncertaintyHook, and branchFork. That prevents sparks from collapsing into pure vibes.
5. Allow controlled hybridization and add a set-level diversity shortlist. That is where you will recover a lot of originality that a strict 1:1 pipeline leaves on the floor.

In schema terms, this is the shape I would move toward:

{
  "TasteProfile+": {
    "deepPatterns": ["abstract relational formulas"],
    "engagementModes": ["ROLEPLAY", "INVESTIGATIVE", "PROTECTIVE", "TRANSGRESSIVE", "OPTIMIZING", "EXPRESSIVE"],
    "fantasyOfAgency": ["what the player wants to feel able to do"],
    "valueTensions": ["loyalty vs justice"],
    "revelationPatterns": ["identity reframe", "hidden institution", "price-of-power reveal"],
    "spatialAppetites": ["contested thresholds", "ritual workplaces", "haunted infrastructure"],
    "nearMisses": ["surface-similar but wrong"]
  },
  "ContentSpark+": {
    "playerRole": "who the player would be here",
    "want": "urgent desire",
    "counterforce": "who/what resists",
    "uncertaintyHook": "what is unknowable at decision time",
    "branchFork": "two plausible immediate actions with different likely consequences",
    "deepPatternRef": "pat-02",
    "noveltyMode": "COMBINATIONAL | EXPLORATORY | TRANSFORMATIONAL"
  },
  "ContentPacket+": {
    "playerPosition": "you are ...",
    "coreDilemmaOptions": ["...", "...", "..."],
    "choiceStateDelta": {
      "differsBy": ["goal", "characters", "status", "place", "time", "knowledge"],
      "shortTermFeedback": "...",
      "longTermTrajectory": "..."
    },
    "commitmentCost": "...",
    "hiddenPressure": "...",
    "environmentalStorytelling": "...",
    "branchElasticity": "LOW | MEDIUM | HIGH"
  },
  "ContentEvaluation.scores+": {
    "tasteAlignment": 0,
    "choiceDifferentiation": 0,
    "causalSpecificity": 0,
    "branchElasticity": 0
  }
}

The shortest takeaway is this: your pipeline already knows how to generate strange, vivid material. What it still needs is a first-class model of what kind of decisions this specific user wants to make—and a final judge that scores that as hard as it scores originality.

## Outcome

- Completion date: 2026-03-27
- What actually changed: the content-packets pipeline prompts now encode the main implemented improvements from this brainstorm, including richer taste-profile structure in `prompts/content-taste-distiller-prompt.md`, explicit player-role and resistance fields in `prompts/content-sparkstormer-prompt.md`, required `playerPosition` in `prompts/content-packeter-prompt.md`, and evaluator scoring/persistence support for `tasteAlignment` and `causalSpecificity` across prompts, models, routes, persistence, presenters, and tests.
- Deviations from the original plan: the shipped implementation did not adopt every proposed schema field verbatim. The implemented version centers on `engagementModes`, `valueTensions`, `deepPatterns`, `playerRole`, `want`, `counterforce`, `playerPosition`, and evaluator scoring additions, rather than the full suggested expansion such as `uncertaintyHook`, `branchFork`, `coreDilemmaOptions`, and `choiceStateDelta`.
- Verification results: verified via repo search that the prompt docs, model contracts, persistence layer, server routes/views, and test suites all reference the implemented content-packet pipeline additions, including `engagementModes`, `valueTensions`, `deepPatterns`, `playerRole`, `counterforce`, `playerPosition`, `tasteAlignment`, and `causalSpecificity`.
