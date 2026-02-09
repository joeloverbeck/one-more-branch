# Narrative Context Strategy Analysis

**Date**: 2026-02-09
**Status**: Complete
**Trigger**: ChatGPT review of prompt documentation recommended replacing full prior narratives with 1-3 sentence summaries

---

## 1. What ChatGPT Claimed

ChatGPT was given the project's prompt documentation and recommended the following changes:

1. **"Context bloat risk"** -- feeding full prior narratives repeatedly would balloon context and degrade consistency
2. **"Replace previousNarrative/grandparentNarrative with summaries"** -- add a `sceneSummary` field to each page and send 1-3 sentence summaries instead of full prose
3. **"Structured summaries are better than raw prose"** -- the LLM would produce more consistent output from compressed context
4. **"This will degrade consistency and cost over time"** -- implying the current approach is unsustainable

---

## 2. Our Current Architecture

### The 2-Scene Rolling Window

The system sends exactly **2 prior scenes** of narrative context per continuation call:

- **Previous Scene (parent page)**: Full narrative text, always included
- **Scene Before Last (grandparent page)**: Full narrative text, included from page 3 onward

This is implemented in `src/llm/prompts/continuation/context-sections.ts:21-40`:

```typescript
export function buildSceneContextSection(
  previousNarrative: string,
  grandparentNarrative: string | null,
): string {
  let result = '';
  if (grandparentNarrative) {
    result += `SCENE BEFORE LAST:\n${grandparentNarrative}\n\n`;
  }
  result += `PREVIOUS SCENE:\n${previousNarrative}\n\n`;
  return result;
}
```

### Token Budget Reality

| Component | Tokens |
|-----------|--------|
| System prompt + rules | ~800-1,300 |
| Story setup (character, world, tone, NPCs) | ~200-900 |
| Structured state (canon, inventory, health, active state, affect) | ~200-1,000 |
| Story structure context (when enabled) | ~300-700 |
| **Previous scene (full narrative)** | **~500-2,000** |
| **Scene before last (full narrative)** | **~500-2,000** |
| Selected choice | ~10-50 |
| **Total input per call** | **~2,500-7,000** |

### Context Window Utilization

The default model (Claude Sonnet 4.5) has a **200K token** context window. Our typical prompt uses **2,500-7,000 tokens**, which is **1-3% of the available window**.

### Structured State Already Separates Facts from Prose

The system already tracks structured state independently of narrative text:

- **Active State**: current location, threats, constraints, open threads (with PREFIX_ID format)
- **Canon Facts**: permanent world facts and character traits (accumulated across all branches)
- **Character State**: NPC-specific branch events (accumulated from ancestors)
- **Inventory & Health**: accumulated item and condition lists
- **Protagonist Affect**: emotional snapshot (feeling, why, wants)
- **Story Structure**: act/beat progression, pacing nudges

Long-term continuity is handled by these structured fields. The narrative text serves a different purpose: **stylistic continuity and scene-level coherence**.

---

## 3. Research Findings

### 3.1 "Lost in the Middle" (Liu et al., 2024)

**Paper**: Liu et al. "Lost in the Middle: How Language Models Use Long Contexts." Transactions of the Association for Computational Linguistics (TACL), 2024.

**Finding**: LLMs perform best when relevant information appears at the beginning or end of input, with degraded retrieval for information positioned in the middle of long contexts.

**Relevance to us**: This effect manifests in contexts of **thousands to tens of thousands of tokens**. At 1,000-3,000 tokens of narrative context, there is no meaningful "middle" for information to get lost in. The finding does not support summarization at our scale -- it supports placing important context at the edges of *large* prompts, which we already do.

**Source**: https://arxiv.org/abs/2307.03172

### 3.2 Context Rot (Chroma Research)

**Study**: Chroma evaluated 18 state-of-the-art models to measure where performance degrades as input length increases.

**Key thresholds for significant degradation**:
- Claude Sonnet 4 (Thinking): ~60,000-120,000 tokens
- GPT-4.1: under ~100,000 tokens
- GPT-5: up to ~142,000 tokens

**Relevance to us**: Our 1,000-3,000 tokens of narrative context represents **~2% of the danger zone** for the weakest model tested. Context rot is not a factor at our scale.

**Source**: https://research.trychroma.com/context-rot

### 3.3 LessWrong Summarization Study

**Study**: "Does Summarization Affect LLM Performance?" -- empirical testing of how summarization affects downstream LLM task performance.

**Key findings**:
- Summaries preserved ~90% semantic similarity (BERTScore) while reducing text by ~51%
- Despite high semantic preservation, high-baseline models experienced **11 percentage point accuracy drops** (75% to 64%)
- The degree of compression showed **no correlation** with degradation -- even mild summarization caused the same quality loss as aggressive summarization
- This means **qualitative information loss matters more than quantitative compression**

**Relevance to us**: Summaries lose something that semantic similarity metrics cannot capture. For creative writing, that "something" includes style, voice, tone, atmosphere, and subtext -- exactly the qualities that matter most for narrative continuity.

**Source**: https://www.lesswrong.com/posts/KHHSryJAezhHmBEu6/does-summarization-affect-llm-performance

### 3.4 Style Transfer Research (Amazon Science)

**Study**: "Conversation Style Transfer using Few-Shot Learning" -- research on how LLMs learn to replicate writing styles.

**Key finding**: "When shown actual samples, models analyze sentence length, vocabulary, punctuation, and structure -- details that descriptions cannot adequately convey." Showing examples is fundamentally more effective than describing style.

**Relevance to us**: Full prior narrative functions as an **implicit few-shot style example**. A summary functions as a description of what happened, not a demonstration of how it was written. Replacing full text with summaries removes the model's primary mechanism for style matching.

**Sources**:
- https://www.amazon.science/publications/conversation-style-transfer-using-few-shot-learning
- https://latitude-blog.ghost.io/blog/how-examples-improve-llm-style-consistency/

### 3.5 Document Summarization and LLM Judgments (arXiv:2512.05334)

**Study**: Tested whether LLM-generated summaries could replace full documents for relevance judgments.

**Key findings**:
- GPT-4o: summaries maintained comparable ranking stability (Kendall's tau > 0.92)
- Llama-3.1-8B: "greater sensitivity to compression" with destabilized label distributions
- Summarization "tends to collapse fine distinctions" between nuanced categories
- Cost savings were significant (~42% token reduction on one dataset)

**Relevance to us**: Even for the simpler task of relevance judgments, summarization collapsed nuanced distinctions. For creative writing -- where nuance IS the product -- the loss would be proportionally worse.

**Source**: https://arxiv.org/html/2512.05334

### 3.6 AI Lab Guidance

#### Anthropic (Claude)

- Context compaction is recommended **only when approaching context limits**
- "Overly aggressive compaction can result in loss of subtle but critical context"
- Claude excels at "character consistency and narrative coherence across 200K token contexts"
- Placement advice: put longform data at top, instructions at end -- "queries at the end can improve response quality by up to 30%"
- No recommendation to pre-summarize when using 1-3% of the window

**Sources**:
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/long-context-tips

#### OpenAI (GPT)

- Recommends feeding "the previous output back into the model for context" for maintaining narrative continuity -- describes this as playing to GPT's strengths
- Place long context at beginning and end of prompts
- No recommendation to summarize small context amounts

**Source**: https://cookbook.openai.com/examples/gpt4-1_prompting_guide

#### Google (Gemini)

Most explicit of all three: "The more limited context windows common in many other models often require strategies like arbitrarily dropping old messages, summarizing content, using RAG with vector databases, or filtering prompts to save tokens. While these techniques remain valuable in specific scenarios, Gemini's extensive context window invites a **more direct approach: providing all relevant information upfront**."

**Source**: https://ai.google.dev/gemini-api/docs/long-context

### 3.7 Interactive Fiction Benchmarks

Community analysis comparing AI Dungeon (32K context) and NovelAI (4K-8K context):

- Going from 2K to 4K tokens yields **measurable coherence gains**
- NovelAI achieved 89% character retention vs. AI Dungeon's 72% over 20+ turns, despite a smaller window, through superior "token economy"
- "A 4K window with precise prompts outperforms a 32K window filled with redundant content"
- Pasting summaries as workarounds backfires: "models interpret pasted summaries as new user input rather than memory reinforcement, triggering 'response mode' instead of 'continuation mode'"

**Source**: https://www.alibaba.com/product-insights/ai-dungeon-vs-novelai-for-immersive-interactive-fiction-does-context-window-length-actually-matter.html

### 3.8 Context Length Alone Hurts (Du & Tian, 2025)

**Paper**: Demonstrated that sheer input length can hurt performance independent of content quality.

**Key numbers**: Testing started at 3,750 tokens. Significant degradation at 7,500+ tokens on **7B-8B parameter models**:
- At 7,500 tokens: 20-59% accuracy loss
- At 30,000 tokens: up to 85% accuracy loss

**Relevance to us**: These findings are for models 10-20x smaller than what we use, and the degradation onset is 2-7x above our token count. Not applicable.

**Source**: https://arxiv.org/abs/2510.05381

---

## 4. Verdict on Each Claim

### Claim: "Context bloat risk from feeding full prior narratives"

**Verdict: Not valid at our scale.**

Our narrative context is 1,000-3,000 tokens out of 200K+ available. Context degradation research consistently shows problems beginning at 60,000+ tokens for frontier models. We are using ~1-3% of the context window. This is analogous to worrying that a cup of water will overflow an Olympic swimming pool.

| Factor | Concern Threshold | Our Usage | Status |
|--------|-------------------|-----------|--------|
| Context rot onset | 60,000-120,000 tokens | 1,000-3,000 tokens | ~2% of danger zone |
| "Lost in the middle" | 10,000+ token contexts | 1,000-3,000 tokens | Not applicable |
| Degradation (small models) | 7,500+ tokens | 1,000-3,000 tokens | Below tested minimums |
| Window utilization | Compact at 75%+ | ~1-3% utilization | Negligible |

### Claim: "Replace full narratives with 1-3 sentence summaries"

**Verdict: Would degrade output quality.**

What summaries lose that full narratives preserve:

1. **Style markers** -- sentence rhythm, vocabulary register, narrative voice patterns
2. **Subtext and implication** -- tension, what characters don't say
3. **Atmospheric details** -- sensory descriptions, environmental cues that establish tone
4. **Character voice cues** -- speech patterns, internal monologue style, behavioral tics
5. **Pacing information** -- how quickly or slowly scenes unfold, moment-to-moment beats
6. **Thematic resonance** -- motifs, symbolic elements, recurring imagery

Our prompt explicitly tells the LLM: "Start exactly where the previous scene ended -- do NOT recap or summarize." The model needs the full scene to know *exactly where it ended* and *how it was written*.

### Claim: "Structured summaries produce more consistent output"

**Verdict: True for factual recall, false for creative writing.**

For information retrieval and Q&A tasks, structured summaries can match or exceed full-text performance (as shown in the arXiv:2512.05334 study). But creative writing continuation requires both factual and stylistic continuity. Our system already handles factual continuity through structured state (canon, inventory, health, active state). The full narrative text provides the *stylistic* continuity that summaries cannot.

### Claim: "This will degrade cost and consistency over time"

**Verdict: Partially valid on cost (trivially), wrong on consistency.**

- **Cost**: Replacing narratives with summaries would save ~500-1,500 tokens per call. At current API rates, this is fractions of a cent per page generation. The cost savings are real but negligible.
- **Consistency**: Research shows the opposite. Full text *improves* consistency through implicit few-shot style learning. The LessWrong study found that even mild summarization causes quality drops, and the Amazon style transfer research confirms that showing examples beats describing them.

---

## 5. When Summaries WOULD Make Sense

ChatGPT's advice is not universally wrong -- it applies to scenarios different from ours. Summaries should be considered if:

### 5a. Expanding the narrative window beyond 2 scenes

If we ever wanted to include context from 5-10 prior scenes (e.g., "chapter-level" context), sending all full text would push toward 10,000-20,000 tokens of narrative alone. At that scale:
- Use **full text for the 1-2 most recent scenes** (style/voice continuity)
- Use **structured summaries for scenes 3-10** (factual/thematic continuity)
- This is the "hierarchical context" pattern used by SCORE (arXiv:2503.23512)

### 5b. Using models with small context windows

If targeting models with 4K-16K context windows (e.g., local/open-source models), the narrative context would consume 10-50% of available space, making summarization a reasonable trade-off.

### 5c. Approaching context window limits

If accumulated structured state (canon facts, character state, etc.) grows to tens of thousands of tokens over very long stories (100+ pages), the total prompt could approach meaningful percentages of the window. At that point, summarizing the *state data* (not the narrative) might become necessary.

### 5d. Cost optimization at production scale

If serving thousands of concurrent users, the ~500-1,500 token savings per call could aggregate to meaningful cost reductions. This is a valid business consideration but a quality trade-off, not a technical necessity.

---

## 6. Conclusion

**Our current architecture is correct.** The 2-scene rolling window with full narrative text, combined with structured state accumulation, is the approach recommended by the available research and by all three major AI labs for creative writing at this token scale.

ChatGPT's recommendation appears to be a generic "optimize tokens" heuristic applied without consideration of:
- The actual token scale involved (1-3% of context window)
- The nature of the task (creative writing, not information retrieval)
- The existing structured state system (which already handles factual continuity separately)
- The research on what summaries lose (style, voice, tone, atmosphere)

No changes to the narrative context strategy are recommended at this time.

---

## Sources

### Academic Papers
- Liu et al. (2024). [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172). TACL.
- Du & Tian (2025). [Context Length Alone Hurts LLM Performance Despite Perfect Retrieval](https://arxiv.org/abs/2510.05381). EMNLP Findings.
- Hossain et al. (2025). [Context Discipline and Performance Correlation](https://arxiv.org/abs/2601.11564). arXiv.
- [The Effect of Document Summarization on LLM-Based Relevance Judgments](https://arxiv.org/html/2512.05334). arXiv:2512.05334.
- [Catch Me If You Can? LLMs Still Struggle to Imitate Implicit Writing Styles](https://arxiv.org/html/2509.14543v1). arXiv:2509.14543.
- [SCORE: Story Coherence and Retrieval Enhancement for AI Narratives](https://arxiv.org/html/2503.23512v1). arXiv:2503.23512.

### Research Reports
- Chroma Research. [Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://research.trychroma.com/context-rot).
- LessWrong. [Does Summarization Affect LLM Performance?](https://www.lesswrong.com/posts/KHHSryJAezhHmBEu6/does-summarization-affect-llm-performance).
- Latitude Blog. [How Examples Improve LLM Style Consistency](https://latitude-blog.ghost.io/blog/how-examples-improve-llm-style-consistency/).

### AI Lab Documentation
- Anthropic. [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).
- Anthropic. [Long Context Prompting Tips](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/long-context-tips).
- OpenAI. [GPT-4.1 Prompting Guide](https://cookbook.openai.com/examples/gpt4-1_prompting_guide).
- Google. [Long Context - Gemini API Documentation](https://ai.google.dev/gemini-api/docs/long-context).

### Industry Analysis
- [AI Dungeon vs NovelAI: Does Context Window Length Actually Matter](https://www.alibaba.com/product-insights/ai-dungeon-vs-novelai-for-immersive-interactive-fiction-does-context-window-length-actually-matter.html).
- Amazon Science. [Conversation Style Transfer using Few-Shot Learning](https://www.amazon.science/publications/conversation-style-transfer-using-few-shot-learning).
