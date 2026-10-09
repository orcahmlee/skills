---
name: review-mr
description: Run the two-axis code-review against a GitLab merge request, post the report as an MR note, and return to the branch you started on.
argument-hint: "The MR number or URL, or nothing for the current branch's MR"
disable-model-invocation: true
---

Review a merge request with `code-review`. Its diff is always `HEAD` against a fixed point, so `HEAD` has to be the MR's source branch and the fixed point the MR's target branch. The target is read from the MR rather than assumed: a stacked MR targets its parent branch, and `main` would sweep the parent's commits into the review.

1. Resolve the MR with `glab mr view <iid> -F json`, the iid being the argument's number (`44`, `!44`, or the tail of an MR URL); no argument means the MR of the current branch. Keep `iid`, `source_branch`, `target_branch`.
2. Record the branch you are on (`git branch --show-current`, or the SHA when detached). Start only from a tree with no tracked changes (`git status --porcelain -uno` prints nothing); anything there stops the skill and is reported — stashing is the user's call.
3. `git fetch origin`, then `glab mr checkout <iid>`. `HEAD` must then equal `origin/<source_branch>`: fast-forward when behind, stop and report when ahead, since the review covers what the MR shows and nothing more.
4. Invoke `code-review` with `origin/<target_branch>` as the fixed point. It finds the spec through the `#issue` in the commit messages and the standards through the repo's docs on its own. Standards are what the repo documents plus `code-review`'s own smell baseline: conventions from the user's global instructions, such as `~/.claude/docs/`, stay out, since the note's readers are a team that never adopted them. Pass that limit to `code-review` along with the fixed point, so it reaches the Standards axis.
5. Switch back to the recorded branch, whether or not step 4 finished.
6. Post the report as one MR note once `code-review` has returned both axes. Write it to a file in the session scratchpad — the stamp, the MR (`!iid`, `source → target`), the commits reviewed, the two-axis report verbatim — then run `glab mr note create <iid> < <file>`. The note posts under the user's account, so the stamp is what tells the team a model wrote it, and which one: `> *這份 review 由 <model> 產生，agent 以這個帳號 post。*`, `<model>` being your model exactly as your environment names it (the name a commit's `AI-Assisted-by` trailer carries), or the agent's name alone (`Codex`) when the environment names none. The note's readers are the team, so it follows the repo's Mixed rule like any reply, and a local path opens nothing for them: before posting, `head -1 <file>` prints the stamp and `grep -nE '/(Users|home|private|tmp)/|~/' <file>` prints nothing: rewrite each hit as repo-relative `path:line`, and drop a finding that rests on the user's global conventions, since step 4 keeps those out. A review that stopped short posts nothing, and step 7 says why.
7. Report: the link to the posted note, the report as posted, and the branch you are back on. Approve and merge stay the user's to run.
