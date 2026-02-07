# Improving story structure

We have a functional app for interactive branching stories. It's very detailed already in the sense that it generates state changes for characters, general, health, inventory... But the story arc that the storyteller is supposed to follow is a simple string generated through the prompt that generates the initial page. I want you to investigate the structured way that dungeon masters structure scenarios/campaigns. Whether they structure them in acts, etc. I'm interested in the following features: -we'll create a new, dedicated prompt to determine the structure of the whole story as the dungeon master will intend to play it out. -We'll add to one of the prompts (likely the prompt for the subsequent pages, not the first one), whether a specific act/part of the plot or story arc has been fulfilled. If so, we'll mark it as fulfilled and indicate what was the resolution. -The system will need to be robust enough to react to changes, and possibly even to change parts of the structure if it has deviated too much.

Reference reports/story-arc-report.md .

## Deep research with ChatGPT

ChatGPT asked:

"To design a structured and resilient story arc system inspired by how Dungeon Masters (DMs) organize their campaigns, could you please clarify a few points:

Intended granularity: Are you aiming for a 3-act structure, or something more modular like scenes and beats within acts?

Dynamic reactivity: Should the system allow for acts to be split/merged or reshuffled dynamically, and should the LLM be allowed to do that on its own or with constraints?

Milestone tracking: Are you imagining objective milestone fulfillment as a boolean checklist (e.g., "slay the beast") or more fuzzy (e.g., "forge a shaky alliance")?

Examples: Are there specific styles of campaigns you'd like us to study—e.g., D&D 5e modules, Pathfinder APs, or homebrew session-planning guides?

These details will help tailor the research to provide the best structural design patterns for your branching story engine."

I answered:

"1. I imagine that something like a 3-act structure would be the minimal story arc. Likely scenes would be too granular given that each page offers 3-4 distinct, meaningful choices that can screw up with the narrative, but I think that we could aim for the LLM to determine what specific "beats" each act should hit. 2. We will have to deal with dynamic reactivity. When a prompt to generate a subsequent page (other than the first one) get send, it should likely task the LLM with determining if the current act, which we feed and mark as it being current, has been completed. In fact, we should probably track the act/beat it's currently in (specific beat inside the current act), and will have to ask if the beat has been concluded, and if the act has concluded (and if so, what was the resolution for both. I envision something like this shown in the prompt: STORY ARC > (current) Figure out who's behind the gruesome murders - The constable approaches you and offers money to solve the case. Resolution: you accepted. - (current) Investigate the rough areas of the city. (likely the next beats, at least, will need to be displayed lest the story deviates too much from the tracks.) 3. These beats/milestones (I'm not sure if you refer to a milestone as the thing that concludes an act) should be concrete enough upon initial definition by the LLM, but could likely change if the story has deviated too much. 4. I'm actually not too familiar with how roleplaying game campaigns are structured, but I was interested in how they structure them because they need to be reliant and robust against players messing up or ignoring parts of the plot."

## ChatGPT's research. Campaign Structure: Acts, Chapters, Milestones

Tabletop campaigns are usually organized into hierarchical narrative layers. Individual scenes/encounters (e.g. a dungeon room or social event) each form a mini-story with its own climax, and these scenes combine into larger quests or adventures, which in turn build the overarching campaign arc. DMs often divide a campaign into “acts” or chapters corresponding to level tiers or story phases. For example, early levels (Act I) introduce local conflicts, mid levels (Act II) expand stakes regionally, and high levels (Act III) bring about the final climax. Each act usually culminates in a significant showdown or revelation – a milestone that signals the end of that arc. Published advice notes that every play session should have a mini-climax, with especially major climaxes at the end of each act or tier.

Figure: A classical story-arc (Freytag’s Pyramid) illustrating rising action, climax, and resolution, which many DMs emulate when structuring campaign acts. Campaigns can also use milestones as structural markers: leveling often occurs only when players hit a story milestone (defeating a villain, completing a quest, etc.). In practice, GMs prepare a rough outline of each act’s goals and stakes but leave details flexible. Acts may be called “quests,” “chapters,” or even tied to game mechanics (e.g. the first five levels of 5E as one story arc, the next five as another). This fractal design – small stories within larger ones – helps DMs maintain pacing and scope: local problems at low levels, world-threatening problems at high levels.

## Defining Story Beats and Objectives

Within each act, DMs identify specific beats or objectives that drive the story forward. These are the key tasks or events the players must tackle, such as retrieving a magical artifact, uncovering a hidden secret, or confronting a major NPC. Common quest types illustrate typical beats: for example, Fetch/Delivery (retrieve or deliver an object or person), Destroy (defeat a monster or evil device), Protect/Escort (safeguard someone or something), Investigation (solve a mystery or gather intel), Negotiation (diplomacy or intrigue), Survival, etc.. Listing these as bullet points helps DMs vary objectives and match player interests:

Fetch/Delivery Quests: Recover or deliver an item or person.

Protect/Escort Quests: Defend a person, place, or convoy.

Destroy/Kill Quests: Eliminate a threat (monster, villain) or destroy a target.

Investigation/Mystery Quests: Uncover clues, solve puzzles or crimes.

Negotiation/Diplomacy: Resolve conflicts through talk, alliances or intrigue.

DMs often plan in terms of story beats rather than rigid scripts. For each beat, they establish the purpose and possible outcomes (success/failure states), but allow players freedom in how to achieve it. Advice from encounter design translates to storytelling: “plan beats, not scripts” by setting a few escalation moments and remaining ready to improvise around player actions. This means defining the goal (e.g. “find the stolen gem”) but not prescribing exactly how the party moves from point A to B. In narrative terms, many GMs map these beats onto structures like the three-act model or Hero’s Journey (setup → confrontation → resolution), so each beat naturally follows the last without prescribing the path.

## Completing Beats and Acts

A beat or act is considered fulfilled when its core objectives are met or its dramatic arc is resolved. In practical terms, that might be when the boss is defeated, the secret is revealed, the artifact is secured, etc. When those criteria are achieved (or made impossible by story events), the DM advances the story to the next beat or act. Many RPGs even use milestone leveling: characters level up only when major story milestones are completed, tying game progression directly to narrative fulfillment.

Handling deviations is key: if players skip or alter an expected beat, the DM adapts. A classic technique is the “Quantum Ogre”: an encounter prepared for one location simply occurs elsewhere if the party goes a different route. For example, if the PCs avoid the ruined keeps where a villain waits, the villain might ambush them along the road instead. The players have agency in choosing directions, but the prepared beat (the villain fight) still happens. Similarly, DMs often advance the world independent of the party – NPCs pursue their goals on a timeline. As Sly Flourish advises: “We don’t build the campaign arc assuming one path… we leave ourselves room to change things depending on how [players] go.”. In effect, a beat is “complete” if its narrative goal is achieved (even if via an alternate path) or if off-screen developments force its resolution. Once the players have, say, eliminated the threat or all clues are found, the DM moves on to the next act.

## Tracking Progress and Adapting to Choices

Throughout a campaign, DMs keep track of story goals and update them as players make choices. Many use notes, bullet journals, wikis or digital tools to log active quests and their status. When players diverge from a planned path, the DM revises the outline: an unused dungeon remains “out there” for future discovery, or clues are placed along the party’s new route. In effect, the DM may defer or relocate beats rather than cancel them. Using milestone advancement inherently tracks progress – if the PCs still need that milestone to level up, the beat persists until addressed.

New tools can help formalize this tracking. For example, one DM recommends NotebookLM as a “digital binder” to manage campaign lore and future plot arcs. Another uses a Game Master Platform that organizes campaign elements – it logs session history, NPCs, events and quest logs in an integrated way. In a structured approach, the campaign’s narrative state could be stored as a data object. Our own proposed schema suggests a storyArc object containing fields like acts[] (with each act’s name, objective, stakes, entry and exit criteria) and a list of milestones[] (each with an ID, title, description, status). The system would maintain a currentActIndex and update it when a beat’s exit criteria are satisfied. If players stray, the DM or engine can mark which milestones remain pending and even allow certain fields to be revised (according to a “revisionPolicy”). In short, structured tracking (via notes or software) ensures that after each session the team updates which acts/beats are done and which new ones have emerged.

## Narrative Frameworks for Flexibility

DMs commonly borrow narrative frameworks while building in flexibility. For example, many treat the campaign as a Hero’s Journey or three-act story. In the Hero’s Journey pattern, the party experiences a call to adventure, faces trials, reaches a climax, and returns transformed. Mapping a campaign to such a spine ensures a satisfying shape. However, GMs emphasize preparedness over fixed planning. As one expert puts it, designing a campaign is like stocking a pantry: you don’t have a single recipe, but you have ingredients (dungeons, NPCs, encounters) ready to use as needed. This avoids dangerous “pivot points” that break the game if players do something unexpected. Instead of requiring the party to trigger a specific event, the world simply contains many possible events that can be improvised.

Practically, DMs may outline a story beat sheet (akin to Save-The-Cat or Campbell’s monomyth), but they treat each beat as a guideline, not a railroad. For instance, one guide advises planning only a few key escalation moments per encounter and being ready to react to player ideas. By mixing a loose narrative structure (acts and turning points) with the mindset of readiness for any choice, GMs keep the overarching plot coherent while preserving player agency. If the party resolves a beat early or in an unintended way, the DM simply shifts the next beats into play. In summary, the narrative framework provides the “what” (goals and beats in order) but not the rigid “how” – that part is created dynamically.

## Tools and Schemas for Story Arcs

Campaigns are often planned in shared documents or apps. Beyond generic note-takers, some tools explicitly support structured story arcs. For example, NotebookLM is praised for organizing campaign notes and plotting future arcs in one place. More comprehensive DM platforms (like the Game Master Platform) let DMs log every session, NPC, and event into a searchable campaign database. These tools effectively serve as the campaign’s “control panel” for tracking ongoing plots.

Another approach is to define a formal schema for the story arc. As in our system proposal, one could use a JSON-like storyArc object with fields: a campaign premise and centralConflict, an array of acts (each with name, objective, stakes, and entry/exit criteria), and an array of milestones (each with ID, description, and status). Such a schema makes it easy to prompt the AI for an initial outline (acts with named goals and success criteria) and then to update it. For instance, the model can be asked “Have the objectives of Act 1 been met?” after a scene, and record a resolution. If the story deviates, the system can flag which act/beat criteria are still unmet or need revision. By mirroring the DM’s method of tracking with data fields, the interactive fiction engine can robustly manage branches.

Key Insights: Campaigns are typically divided into acts or arcs (often tied to level tiers), each containing quests or beats with clear objectives. DMs define important beats (e.g. investigate a clue, defeat a villain) but plan only key points (“beats, not scripts”). A beat is complete when its main goals are achieved (or forced by story), and the next act can begin. DMs track progress via notes or tools: milestone-based advancement and platforms for session logs. They prepare content flexibly (avoiding rigid pivot points) and adapt by relocating or reinterpreting beats if players stray. For an AI-driven storytelling system, this suggests prompting upfront for a structured arc (with acts and beats), maintaining a current-act state, asking explicitly if each beat is resolved, and updating or redefining acts as needed when players go off the planned path.