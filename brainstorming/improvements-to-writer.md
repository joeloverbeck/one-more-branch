# Improvements to Writer (opening and continuation)

We fed some examples of narrative text from stories at stories/* to ChatGPT Pro. I also provided the current prompts for the opening and continuation writers (see prompt docs at prompts/* ). The goal was for ChatGPT to determine if our prompts could be improved to produce better writing quality.

## ChatGPT's response

The prose has real voltage. It also has a control problem.

What you’re getting is not “bad writing.” It’s a model that has been pushed hard toward intensity, sensory saturation, interiority, and tonal commitment, without a matching set of instructions about restraint, variation, clarity, and beat economy. Both prompt templates currently emphasize vigorous verbs, meaningful sensory detail, emotional coloration, tension, tone fidelity, and mature permissiveness, but they do not give the model enough craft-side guardrails against self-echo, cadence monotony, metaphor stacking, or house-style takeover.

### What is going wrong in the sample prose

The main issues are these:

It keeps re-saying the same thing in hotter language.
Phrases and concepts like the void, the grey static, the crack’s warmth, the operational layer, the counter, the “wrong-warm” sensation, and the protagonist’s clinical self-monitoring recur so often that they stop accruing power. The prose is not just recurring motifs; it is frequently re-labelling the same beat instead of buying a new beat.
The sentence music gets monotonous.
There is a lot of fragmenting, reversal syntax, em-dash pressure, “Not X. Y.” rhythm, and self-intensifying qualification. That can be great at peaks. Here it becomes the baseline texture, so nothing stands out.
The narration often explains what the image already conveyed.
The text regularly lands an image, then interprets it, then interprets the interpretation. That creates a prestige-horror glaze, but it costs force.
The “literary horror” house style is overpowering character voice.
You do have protagonist voice data in the prompt, but the generated narration still feels dominated by a generalized elevated-horror register. The protagonist’s analytical lexicon is present, but it gets used like filler instead of a selective character instrument.
Escalation is often atmospheric rather than structural.
The scene does escalate, but too often by intensifying description instead of clearly changing the board: danger, knowledge, leverage, location, options, or cost. In interactive fiction, that is a problem because the page has to leave the choice generator with a legible game state.

Those failure modes make sense given the current prompt language. The continuation template tells the model not to repeat the previous scene’s last sentence, but it does not tell it not to re-describe already-established mood or sensation for multiple paragraphs. It also feeds in full previous-scene prose “for style continuity,” which can encourage tic mimicry if you don’t explicitly forbid it. The opening template asks for a compelling introduction, atmosphere, and intrigue, but it does not require early concrete grounding or warn against decorative over-stylization in the first paragraphs.

### What to change

Most of the fix belongs in the shared system-prompt craft instructions, because the current system guidance is nearly the same in both templates. Then add a smaller opening-specific block and a continuation-specific block in the user prompts.

### 1) Add this to the system prompt in both opening and continuation

Put this under STORYTELLING GUIDELINES: in both prompts, or better yet in the shared system-prompt builder so both inherit it.

"PROSE DISCIPLINE:
- Prefer precision over intensity. One exact image beats three extreme ones.
- Use figurative language selectively. Let a paragraph ride on one dominant image or comparison rather than stacking multiple metaphors or similes.
- Modulate intensity. Alternate dense, lyrical passages with clean, plain sentences so the prose can breathe.
- Vary sentence length and structure. Use fragments, anaphora, repeated sentence openings, and typographic emphasis sparingly and only at moments of peak pressure.
- Do not self-echo. Once a feeling, fact, or image has landed, do not restate it in slightly different language unless the repetition clearly escalates, inverts, or reveals something new.
- Trust subtext. If action, dialogue, or image already conveys the meaning, do not immediately explain that meaning again in narration.
- Keep scenes legible. In surreal, erotic, or horror material, maintain clear physical geography, cause-and-effect, and the protagonist's immediate options.
- Keep most paragraphs centered on one beat. Every paragraph should buy at least one of: new action, new information, a reversal, sharper decision pressure, or a changed relationship."

### 2) Strengthen two existing system-prompt bullets in both prompts

Replace the current GOLDEN RULE bullet with this:

"- GOLDEN RULE: Build narrative prose around vigorous verbs, precise nouns, and a few meaningful sensory details. Avoid adjective-heavy filler, abstract summary, and stacked metaphors."

Replace the current emotional-state bullet with this:

"- Let emotional state color the prose naturally, but do not let it flatten the whole scene into one repeated note. Even panic, obsession, arousal, or numbness should still allow variation in observation, rhythm, and action."

These changes directly attack the “everything is hot all the time” problem that your sample shows. The current prompts already reward sensoriality and tone; these revisions add missing modulation.

### Changes for continuation-prompt.md

#### 3) Add a narration/voice block right after PROTAGONIST SPEECH FINGERPRINT

"VOICE APPLICATION:
- The protagonist speech fingerprint governs narration as well as dialogue.
- Use the protagonist's conceptual vocabulary, favorite abstractions, and recurring metaphors selectively.
- Reuse recurring inner-language only when it sharpens conflict or shows change; do not use it as filler.
- If a phrase, abstraction, or comparison would not plausibly occur in this protagonist's mind, do not use it."

That matters because right now the continuation prompt gives the model protagonist voice data, but it never explicitly says that narration must answer to that fingerprint instead of drifting into generic “high-end horror prose.

#### 4) Add this new block before REQUIREMENTS (follow all):

"=== SCENE PROGRESSION DISCIPLINE ===
- Because this is a continuation, inherited mood or physical state from the previous scene may be refreshed briefly, but do not spend multiple paragraphs re-describing it.
- By the end of the scene, at least one of the following must materially change in a player-legible way: danger, knowledge, leverage, relationship, location, available options, or cost.
- Each major escalation must be tied to a concrete observable change in the environment, the body, or the available decisions.
- End hooks must arise from a genuinely altered situation, not from ominous phrasing alone.
- If you repeat a motif or image from the prior scene, the repeat must deepen, invert, or complicate it."

This is the biggest continuation-specific fix. Your sample keeps intensifying the same sensations and motifs; this block forces the model to change the board instead of polishing the same dread for three more paragraphs.

#### 5) Add a style-continuity anti-mimicry block after PREVIOUS SCENE (full text for style continuity):

"STYLE CONTINUITY:
- Use prior full-scene text to preserve continuity of events, tone, and character voice.
- Do not mechanically imitate repeated phrasings, syntactic tics, or signature images from the prior narrative unless their recurrence is intentional and meaningfully transformed.
- Continue the voice at its best, not its surface habits."

This one is important because the continuation prompt explicitly includes full previous-scene prose for style continuity. Without an anti-mimicry instruction, the model tends to copy surface tics, which is exactly what your sample reads like over successive pages.

#### 6) Tighten the continuation REQUIREMENTS

Replace current requirement 3:

"3. Advance the narrative naturally - time passes, situations evolve, new elements emerge"

with:

"3. Advance the narrative materially - by the end of the scene, at least one of the following must have changed in a clear, player-legible way: danger, knowledge, relationship, leverage, location, available options, or cost."

Add this new requirement after current item 2:

"2a. Re-establish inherited mood, sensation, or fear only briefly; do not spend multiple paragraphs paraphrasing what the previous scene already made clear."

Add this new requirement after current item 6:

"6a. Leave the scene in a choiceable state: the player should understand what is now urgent, tempting, dangerous, and possible."

And change the WHEN IN CONFLICT prose line from:

"3. Prose quality: character-filtered, emotionally resonant, forward-moving"

to:

"3. Prose quality: character-filtered, emotionally resonant, forward-moving, and legible"

All of that fits the continuation prompt’s stated job: react to the player’s choice, maintain continuity, and set up the next decision cleanly.

### Changes for opening-prompt.md

#### 7) Add the same VOICE APPLICATION block after PROTAGONIST SPEECH FINGERPRINT

Use exactly the same block as above in the opening prompt too:

"VOICE APPLICATION:
- The protagonist speech fingerprint governs narration as well as dialogue.
- Use the protagonist's conceptual vocabulary, favorite abstractions, and recurring metaphors selectively.
- Reuse recurring inner-language only when it sharpens conflict or shows change; do not use it as filler.
- If a phrase, abstraction, or comparison would not plausibly occur in this protagonist's mind, do not use it."

The opening prompt already includes protagonist speech fingerprint data; this change makes it operational instead of ornamental.

#### 8) Expand the OPENING IMAGE CONTRACT

Replace the current opening-image text with this version:

"OPENING IMAGE CONTRACT:
Anchor this opening scene to this concrete image: {{structure.openingImage}}
Use this as a visual spine for setting, action framing, or emotional atmosphere.
Treat it as an anchor, not a collage prompt: choose a small number of telling details and turn them into immediate action, tension, or decision pressure.
Do not linger in decorative description before the scene is clear."

This directly fixes the tendency to treat the opening as an excuse for pure atmosphere rather than situation. The current contract tells the model to anchor to an image, but it does not tell it not to over-decorate.

#### 9) Add this new block before REQUIREMENTS (follow all):

"=== OPENING SCENE DISCIPLINE ===
- Within the first 2 paragraphs, make clear where the protagonist is, what is happening right now, and what immediate pressure, desire, or disturbance is active.
- If you begin with a fragment, aphoristic line, or highly stylized sentence, ground it immediately in concrete action or observation.
- Let intrigue come from a legible situation, not from withholding basic orientation.
- Use one dominant opening image and a small number of telling details; do not flood the opening with multiple equally loaded metaphors before the scene is clear.
- By the end of the scene, the reader should understand what the protagonist wants next and what presently obstructs them."

This specifically addresses the opening-prose problem of sounding “literary” before it becomes readable.

#### 10) Tighten the opening REQUIREMENTS

Replace current requirement 1:

"1. Introduce the protagonist in a compelling scene that reveals their personality through action"

with:

"1. Introduce the protagonist through action, reaction, or choice so personality emerges from behavior rather than descriptive performance."

Replace current requirement 2:

"2. Establish the world and atmosphere matching the specified tone"

with:

"2. Establish the world and atmosphere matching the specified tone, but ground the concrete situation within the first 2 paragraphs."

Replace current requirement 3:

"3. Present an initial situation with immediate tension or intrigue that draws the player in"

with:

"3. Present an initial situation with immediate tension or intrigue that also gives the protagonist a clear next pressure, problem, or desire."

Add this new requirement after item 3:

"3a. Leave the opening in a choiceable state: the player should understand what the protagonist could try next, even if several options are possible."

And change the WHEN IN CONFLICT prose line from:

"3. Prose quality: character-filtered, emotionally resonant, forward-moving"

to:

"3. Prose quality: character-filtered, emotionally resonant, forward-moving, and legible"

The current opening prompt is good at saying “be compelling.” These changes force “be compelling” to cash out as readable dramatic setup rather than ornamental mood.

### One extra addition I would make to both user prompts

Add this near the end, before WHEN IN CONFLICT:

"PROSE SELF-CHECK:
Before finalizing, mentally verify:
1. Have I repeated any distinctive phrase, sensation, or image without changing its meaning?
2. Does each paragraph add motion, information, pressure, or relational change?
3. Can the reader track the space, bodies, threats, and immediate options?
4. Is the narration genuinely in the protagonist's idiom rather than a generic literary house voice?
5. Have I explained any beat twice—once through image and once through interpretation? If so, cut the weaker one."

This kind of anti-bloat self-audit is missing from both templates. Right now they have continuity verification, but not craft verification.
