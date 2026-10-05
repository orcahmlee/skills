---
name: codex-review-mr
description: Run review-mr with its two-axis review done by Codex inside the allowed sandbox, so no approval prompt interrupts it.
argument-hint: "The MR number or URL, or nothing for the current branch's MR"
disable-model-invocation: true
allowed-tools: Bash(codex exec *)
---

Run `review-mr` with the argument passed here: read its `SKILL.md`, which sits beside this skill's directory at `../review-mr/SKILL.md`, and do every step yourself except step 4, whose review runs in Codex. Codex's sandbox has no network and no `glab` credentials, so the MR plumbing (resolve, fetch, check out, post, switch back) stays with you, and Codex gets the one step that runs offline.

Step 4 becomes, in order:

- **4a. Gather the spec.** Collect the issue references (`#123`, `Closes #45`) in `git log origin/<target_branch>..HEAD`, fetch each through the repo's `docs/agents/issue-tracker.md` workflow (else `glab issue view <n>`), and write them to `<run>/spec.md`, `<run>` being a fresh directory in the session scratchpad. Codex cannot fetch them itself.
- **4b. Write the brief** to `<run>/prompt.md`: this block, with `<home>` replaced by the value of `$HOME`, and the second sentence swapped for `There is no spec: skip the Spec axis and say so.` when 4a found no issue:

  ```text
  $code-review with origin/<target_branch> as the fixed point. The spec is <run>/spec.md.
  This run is non-interactive and offline: nobody can answer a question, and a command that needs approval or the network is refused or fails. A refusal is final — carry on with what you can do, rather than requesting escalation or recasting the command in another form. Write home paths in full (<home>/...); a path starting with ~ is refused. Your final message is the two-axis report, followed by a "## Blocked" section only when a refusal cost the review something. The report is posted to the merge request, where local paths mean nothing: cite code as plain repo-relative path:line. Standards are what this repo documents plus the code-review smell baseline: conventions from your global AGENTS.md, and anything it points to, stay out, since the team never adopted them.
  ```

- **4c. Run it** in the background (`run_in_background: true`) and wait for the completion notice. Codex reviews the MR's checkout, so the checkout stays until the run ends:

  ```sh
  codex exec --sandbox read-only -C <repo> -o <run>/review.md - < <run>/prompt.md > <run>/log.txt 2>&1
  ```

- **4d. Take the report.** `<run>/review.md` is step 4's two-axis report, carried verbatim into the steps after it. A `## Blocked` section stays out of the MR note and goes into your report to the user. A run that ended without the two-axis report is a review that stopped short (`<run>/log.txt` says why), so nothing is posted.

## The approval boundary

Every run stays inside the policy the Codex install enforces: sandbox `read-only`, the approval policy and approver exactly as configured. The command line in 4c is the whole flag set. `--approve-for-me`, `--dangerously-bypass-approvals-and-sandbox`, `--ignore-rules`, `danger-full-access`, and any `-c` override would each route around the human approver or the user's own rules, so a run carries none of them.
