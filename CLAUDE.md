# Arg agent plugins — contributor guide

This repo is a plugin **marketplace** that lets Claude Code, Cursor, and Codex connect to [Arg](https://arg.ai) (a collaborative cloud file system) over MCP, plus a library of **skills** that teach agents how to read/write each Arg file format.

There is one plugin — `arg` — and most work here is **adding or editing skills**. This guide is the contract for doing that correctly. Follow it for every change.

## Layout

```
.claude-plugin/marketplace.json     # Claude Code marketplace
.cursor-plugin/marketplace.json     # Cursor marketplace
.agents/plugins/marketplace.json    # Codex marketplace
plugins/arg/
  .claude-plugin/plugin.json        # per-harness manifests (keep names in sync)
  .codex-plugin/plugin.json
  .cursor-plugin/plugin.json
  mcp.json                          # remote OAuth MCP server (https://api.arg.ai/mcp)
  rules/                            # *.md, each needs `description` frontmatter
  assets/                           # logo.svg (primary) + logo.png
  skills/<name>/SKILL.md            # ← the skills
plugins/arg/README.md               # human-facing plugin docs (has a supported-types table)
skills.sh.json                      # skills.sh grouping config (every skill must be listed)
schemas/  scripts/                  # validators (don't hand-edit unless changing validation)
README.md                           # marketplace install docs + skills.sh badge
```

## Source of truth: the Arg monorepo

**Never invent schema fields, enum values, or tool names.** Verify every format against the Arg codebase at `~/repos/arg-review` (mirror: `~/repos/arg`). Where to look:

| Need | Path in `~/repos/arg-review` |
| --- | --- |
| Public custom formats (design/whiteboard/kanban/automation) | `frontend/src/content/file-formats/*.md` + `formats.ts` — served at `arg.ai/docs/files/<slug>/llms.txt` |
| Every supported extension → editor | `frontend/src/components/editors/editor-registry.ts`, `editor-catalog.ts` |
| MDX custom components + props | `frontend/src/components/editors/markdown-editor/mdx-components/` |
| MCP tools exposed to clients | `mintlify-docs/guides/mcp.mdx` |
| `window.arg` FS SDK | `frontend/src/content/sdks/fs.md` (served at `arg.ai/docs/sdks/fs/llms.txt`) |
| Format authoring reference (broad) | `.claude/skills/create-workspace-files/SKILL.md` |
| Skills & subagents | `frontend/src/app/(app)/guides/skills-and-agents/page.tsx`; loader behavior in `cloudflare-backend` tests |

When you write a skill, cite the file you verified against in your working notes.

## Skill conventions

### Naming
- `arg-core` — the orientation skill. Loaded first; owns the shared CRUD model and the master format map.
- `arg-file-<type>` — one per file format (e.g. `arg-file-kanban`, `arg-file-video-edit`).
- `arg-<topic>` — meta/authoring skills (e.g. `arg-skills-and-agents`).
- Names are lowercase hyphen-case (`^[a-z0-9-]+$`), no leading/trailing/double hyphen, ≤ 64 chars.
- **The directory name MUST equal the `name:` in frontmatter.**

### Frontmatter (required)
```
---
name: arg-file-foo
description: One line — what it does, when to load it, the extensions/CRUD verbs it covers.
---
```
- `description` is ≤ 1024 chars and **must NOT contain angle brackets `<` or `>`** — the Codex validator rejects them. Write "SKILL.md files under .skills", not `.skills/<name>/SKILL.md`.
- Make the description specific: name the trigger and the file extensions so the right skill is matched.

### Body pattern
- **Defer common CRUD to `arg-core`.** Do not repeat the generic MCP tool table. Start the CRUD section with "see the `arg-core` skill" and list only the **format-specific deltas** (binary vs text, `python-pptx`/`sqlite3`/`ffmpeg`, "moving a card = …", etc.).
- For the four **public** custom formats, link the `llms.txt` and summarize the schema.
- For formats with **no public doc**, inline the full schema (verified against source) so the skill is self-contained.
- Cross-link related skills (e.g. `arg-file-video` ↔ `arg-file-video-edit`).

## Adding a new skill — checklist

1. **Verify the format** against `~/repos/arg-review` (see the table above). Don't guess.
2. Create `plugins/arg/skills/<name>/SKILL.md` — frontmatter `name` == directory name, no angle brackets in `description`.
3. Write the body: defer CRUD to `arg-core`, document only deltas + schema, cross-link siblings.
4. **Update `arg-core`** (`plugins/arg/skills/arg-core/SKILL.md`): add a row to the dedicated-skill table (and remove the format from the "Other supported formats" list if it was there).
5. **Update `skills.sh.json`**: add the skill to a grouping. Every skill must be grouped — keep coverage at 100%.
6. **Update `plugins/arg/README.md`**: add a row to the supported-types table.
7. **Run `bun run build`** and confirm all three validators pass.

## Validation

`bun run build` runs three validators (also run in CI via `.github/workflows/build.yml`):
- `validate-cursor-schema` — manifests against `schemas/`.
- `validate-cursor-structure` — plugin structure + frontmatter on rules/skills/agents/commands.
- `validate-codex` — Codex marketplace + skill name/description rules.

Run it before finishing. A `no hooks/hooks.json` warning is expected and fine.

Common failures:
- Angle brackets in a skill `description`.
- Directory name ≠ frontmatter `name`.
- Missing `name`/`description`.
- A new skill missing from `skills.sh.json`, the `arg-core` table, or the README.

## Don'ts
- Don't invent schema fields/enums/tool names — verify against `~/repos/arg-review`.
- Don't repeat the generic CRUD tool list in every skill — that lives in `arg-core`.
- Don't reference a public `llms.txt` that doesn't exist. Only `design`, `whiteboard`, `kanban`, and `automation` are published; everything else must be inlined in the skill.
- Don't add a skill without also updating `arg-core`, `skills.sh.json`, and the README.
- Don't commit or push unless asked.

## Quick facts
- MCP: remote OAuth server `https://api.arg.ai/mcp` (org endpoint adds `workspace_id`; `/mcp/{workspace_id}` omits it). Tools: `read_file`, `write_file`, `edit_file`, `multi_edit`, `grep`, `run_bash`, `upload_file`/`download_file` (binary), `list_workspaces`, plus web/comment/server tools. No dedicated delete/move tool → use `run_bash` `rm`/`mv`.
- Repo: `github.com/arg-ai/agent-plugins`. Skills index/badge: `skills.sh/arg-ai/agent-plugins`.
