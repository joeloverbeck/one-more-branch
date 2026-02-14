# Improvements to Architect

We provided the prompts at prompts/* to ChatGPT and we asked ChatGPT to figure out if we could improve the story architecting process. It said:

## Story architecture: beats aren’t enough — you want intentions + constraints + reincorporation
### A. Add “intentional-agent” scaffolding (research-backed)

Classic narrative-planning work argues two universals: causal plot progression and believable characters as intentional agents (actions should be explainable by goals).
Right now your structure step outputs beats, but (based on the prompt) it doesn’t require an explicit goal/plan model per major actor—so later steps must “rediscover” intentions from prose, which is where coherence leaks.

Add to STRUCTURING output (new fields):

- ProtagonistArcTrack: want/need, misbelief/lie, value-shift per act, “proof moments”

- Antagonist/PressurePlan: what the opposition is doing off-screen by act (not only NPC agenda blurbs)

- Faction clocks (if applicable): what advances regardless of player choices

- Causal dependencies per beat: “what must become true” / “what must not become true yet”

This aligns with planning-based interactive narrative work where story control is represented as state/trajectory constraints over time (not just a list of scenes).

### B. Add “dead-end avoidance” via reincorporation

A big failure mode in generative stories is “cool stuff that never matters again.” The planning literature explicitly calls out dead ends (events that don’t causally contribute later) and highlights reincorporation as a principle: reuse earlier state changes and planted elements so the story feels authored.

Add to STRUCTURING output:

- PlantedElements[] (Chekhov inventory): each with introduceByBeatId and payoffByBeatId ranges

- ReincorporationTargets[]: “bring back X consequence / object / promise by Act 2”

- OpenLoops[]: unanswered questions that must be closed (or deliberately subverted)

Then have your ANALYZING step score: “did this page create dead ends?” and your SCHEMING step propose reincorporations.

### C. Upgrade “branch-aware” into “choice-authored”

Branch-aware beats prevent contradictions, but they don’t guarantee meaningful choice. Research on interactive narratives repeatedly finds perceived agency can matter more than true divergence—design techniques can create strong agency feelings without infinite branching.
And “meaningful choice” analysis in narrative games focuses on types of choice and how they shape adaptive narrative experience.

Add to STRUCTURING output:

ChoiceDesignBudget per act:

- required “tradeoff choices” (lose X to gain Y)

- required “identity choices” (who the protagonist is)

- required “information choices” (what you learn / when)

- required “relationship choices”

PerceivedAgencyTechniques[] checklist for your writer:

- immediate acknowledgment

- irreversible micro-consequences (even if macro reconverges)

- NPC memory + changed affordances

- altered future tone of scenes (not just events)

Net effect: your loop stops being “branching story” and becomes “authored choices that shape self + world”.