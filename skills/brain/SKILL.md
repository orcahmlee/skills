---
name: brain
description: Search the user's Brain for Lessons from their past sessions in every repo. Use before debugging an error, before choosing a library, tool or approach, and when the user asks what they learned or tried before.
---

# Brain

The Brain holds Lessons distilled from the user's past agent sessions. A Lesson has a cue (the situation it fits), a rule, and a basis. A `verified` Lesson rests on an observed failure and its fix; an `asserted` one rests on a claim.

1. Search with two to five English keywords: words from the error message, the tool or library names, the operation.

   ```bash
   uv run --quiet --project ~/Brain ~/Brain/scripts/recall.py <keywords>
   ```

   No match is a normal result: carry on without the Brain.

2. Apply a hit only when its cue fits your situation. Follow a `verified` Lesson; check an `asserted` one before you rely on it.
3. When a Lesson changes what you do, cite its id, such as `l-20261020-001`, in your reply.

The Brain's own pipeline writes Lessons; this search only reads them. Something worth keeping goes into the current project's auto-memory as usual, and the Brain captures it from there.
