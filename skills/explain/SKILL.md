---
name: explain
description: Explain something in depth, so the user can predict and change it rather than only follow it.
disable-model-invocation: true
---

Explain what the user just named, for someone who intends to change it later.

1. Start from what they already have. They are missing one specific link, not the whole topic, and re-explaining the part they clearly already used spends the answer in the wrong place. Where the gap is ambiguous, ask one question before committing to a long answer.
2. Read the code before describing it. Every claim about this codebase cites a path they can open (`src/thing.ts:42`). A claim you did not verify is marked as a guess in the sentence that makes it.
3. Lead with the **mechanism**: what happens, in order, and which part is **load-bearing** — the piece that breaks the behaviour when changed. They can already see the outcome; the mechanism is what they came for.
4. Name the alternative that lost. A decision is only understandable against the option it beat, so give the rejected design and the cost that ruled it out. Where nothing was rejected and it is merely convention, say so.
5. State the **fog**: what you are unsure of, what the code leaves undecided, and what would settle it. An answer that sounds complete with a hole in it teaches worse than one that admits the hole.
6. End on what they can now do: the edit to try, the experiment that would confirm it, or the behaviour they can now predict without asking.

Depth is mechanism and evidence, not length. An answer that restates the outcome three times is shallower than one that names the load-bearing line, so spend words on the causal chain and on real code, and stop once the mechanism is covered.

`/wait-what` runs the other direction: reach for it when an answer went deeper than it went clear.
