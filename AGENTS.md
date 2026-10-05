# AGENTS.md

## Writing conventions

- **Mixed** — `README.md`, `GLOSSARY.md`, ADRs, planning and roadmap docs. Their reader is the user.
- **English throughout** — `docs/agents/**`, per the global rule for agent-facing docs.

## Skills

`skills/<name>/` is the source of truth for the user's own skills; `.agents/skills/` holds skills vendored from `mattpocock/skills`, recorded in `skills-lock.json` and refreshed with `npx skills@latest update`, so an edit belongs under `skills/` and nowhere else.

A skill reaches the machine through `npx skills@latest add orcahmlee/skills -s <name> -g`, which reads the GitHub repo — so push before installing — and records the install in `~/.agents/.skill-lock.json`. The copies under `~/.agents/skills/` and the symlinks under `~/.claude/skills/` are that command's output: edit the skill here and reinstall, and a copy made by hand is a drift waiting to happen, since `update` cannot see it. The commands, with the layout they produce, are in `README.md`.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`orcahmlee/skills`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.
