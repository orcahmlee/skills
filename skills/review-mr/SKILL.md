---
name: review-mr
description: Run the two-axis code-review against a GitLab merge request, then return to the branch you started on.
argument-hint: "The MR number or URL, or nothing for the current branch's MR"
disable-model-invocation: true
---

Review a merge request with `code-review`. Its diff is always `HEAD` against a fixed point, so `HEAD` has to be the MR's source branch and the fixed point the MR's target branch. The target is read from the MR rather than assumed: a stacked MR targets its parent branch, and `main` would sweep the parent's commits into the review.

1. Resolve the MR with `glab mr view <iid> -F json`, the iid being the argument's number (`44`, `!44`, or the tail of an MR URL); no argument means the MR of the current branch. Keep `iid`, `source_branch`, `target_branch`.
2. Record the branch you are on (`git branch --show-current`, or the SHA when detached). Start only from a tree with no tracked changes (`git status --porcelain -uno` prints nothing); anything there stops the skill and is reported — stashing is the user's call.
3. `git fetch origin`, then `glab mr checkout <iid>`. `HEAD` must then equal `origin/<source_branch>`: fast-forward when behind, stop and report when ahead, since the review covers what the MR shows and nothing more.
4. Invoke `code-review` with `origin/<target_branch>` as the fixed point. It finds the spec through the `#issue` in the commit messages and the standards through the repo's docs on its own.
5. Switch back to the recorded branch, whether or not step 4 finished.
6. Report: the MR (`!iid`, `source → target`), the commits reviewed, the two-axis report verbatim, and the branch you are back on. Offer to post the report as one MR note (`glab mr note <iid> -m`); its readers are the team, so it follows the repo's Mixed rule like any reply. Approve and merge stay the user's to run.
