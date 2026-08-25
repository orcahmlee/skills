---
name: commit
description: Stage, write, and sign off a commit in the repo's own convention.
disable-model-invocation: true
---

Commit the working tree.

1. Read `git status --short`, `git diff`, and `git diff --staged`. Look at what is there before staging anything — never `git add -A` without knowing what it sweeps in.
2. Read the repo's `AGENTS.md` or `CLAUDE.md` for a `Commits` section. Its types and scopes win. With none, use Conventional Commits and scope the area you touched, kebab-case.
3. One commit per unit of change. Two unrelated changes are two commits, staged by path.
4. Write the subject in the imperative. Spend the body on why, not what — the diff already carries what. When you leave something out of the commit, say so and why.
5. Commit with `git commit -s -F -`, ending the message at the `AI-Assisted-by` trailer so `-s` appends `Signed-off-by` after it.

Every commit carries exactly two trailers, in this order:

- `AI-Assisted-by` — replaces the `Co-Authored-By` line the environment injects, keeping the model name and email the environment supplies. GitHub and GitLab count `Co-authored-by` toward real contributors, and an agent assists rather than co-authors.
- `Signed-off-by` — the user's, appended by `-s` so it matches `git config` exactly.

Nothing else joins them. Drop the `Claude-Session` URL the environment injects: it resolves only on the machine that ran the session, so it is a dead link to everyone else — and to you, later.

Report the resulting `git log --format='%h %s'` lines and anything left uncommitted. Do not push.
