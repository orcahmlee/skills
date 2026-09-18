---
name: commit
description: Stage, write, and sign off a commit in the repo's own convention.
argument-hint: "The issue this commit closes, or nothing"
disable-model-invocation: true
---

Commit the working tree.

1. Read `git status --short`, `git diff`, and `git diff --staged`. Look at what is there before staging anything — never `git add -A` without knowing what it sweeps in.
2. Read the repo's `AGENTS.md` or `CLAUDE.md` for a `Commits` section. Its rules win; the convention below fills whatever it leaves open.
3. Split by concern: one concern per commit, roughly two files, staged by path. An issue's work splits across separate `feat` / `test` / `docs` / `build` / `ci` commits, each carrying that same `(#issue)`.
4. An argument naming an issue (`42`, `#42`, or an issue URL) is the issue these commits close. Fetch the ticket and read it, so the body answers what the issue asked. With no argument passed, the commits carry no issue reference.
5. Write each message to the convention below, then commit it with `git commit -s -F -`.
6. Report the resulting `git log --format='%h %s'` lines and anything left uncommitted. The push is the user's to run.

## The convention

**Subject** — `type(scope): description (#issue)`, imperative, lowercase after the prefix, no period: `fix(auth): reject expired refresh tokens (#128)`. Scope is mandatory; with no repo list to draw from, scope the area you touched, kebab-case. Past tense (`added`, `pinned`) is the retired style, and the older repos still carry a history full of it, so follow this rather than what `git log` shows.

**Body** — spent on why, never on what; the diff already carries what. What the change answers, what it rules out, what it deliberately leaves alone. When the commit leaves something out, the body says so and why.

**Trailers** — exactly two, in this order, and nothing else joins them:

- `AI-Assisted-by` — replaces the `Co-Authored-By` line the environment injects, keeping the model name and email the environment supplies. GitHub and GitLab count `Co-authored-by` toward real contributors, and an agent assists rather than co-authors.
- `Signed-off-by` — the user's. End the message at `AI-Assisted-by` and let `-s` append this one, so it matches `git config` exactly.

Drop the `Claude-Session` URL the environment also injects: it resolves only on the machine that ran the session, so it is a dead link to everyone else — and to you, later.
