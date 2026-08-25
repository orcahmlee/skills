# AGENTS.md

## Writing conventions

The global conventions in `~/.claude/CLAUDE.md` apply. This repo settles the one thing they leave open — which documents are Mixed:

- **Mixed** — `README.md`, `CONTEXT.md`, ADRs, planning and roadmap docs. Their reader is the user.
- **English throughout** — `docs/agents/**`, per the global rule for agent-facing docs.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`orcahmlee/skills`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.
