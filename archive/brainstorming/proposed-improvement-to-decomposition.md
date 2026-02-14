**Status**: NOT IMPLEMENTED

# Proposed improvements to entity decomposition process

We provided the prompts at prompts/* to ChatGPT so that it could suggest improvements, and it said:

"Decomposition: atomized facts are good — but you’re missing rules, disputes, and evidence

Your worldFacts are a strong start. 

entity-decomposer-prompt

 But for believability, you need to separate:

- World laws (always true; e.g., magic has a cost)

- Local norms (true in region/faction)

- Beliefs/propaganda (what people think is true)

- Disputed claims (multiple factions disagree)

- Unknowns/mysteries (intentionally unresolved)

If you don’t encode that distinction, LLMs tend to flatten it and “helpfully” resolve ambiguity.

Add to world facts:

- factType: LAW | NORM | BELIEF | DISPUTED | RUMOR | MYSTERY

- holders: which factions/characters believe it (for BELIEF/RUMOR/DISPUTED)

- confidence: explicit | implied | inferred

- evidence: a short supporting quote/snippet from the user’s raw text (this is huge for preventing over-inference)

This is the same general idea as grounding: keep the model honest about what was provided vs invented—especially important in long-running story bibles."