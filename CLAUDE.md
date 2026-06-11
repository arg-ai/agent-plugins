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

### Two layers: format vs access method
Keep **what a file is** separate from **how you reach it**:
- **Format skills** (`arg-file-*`) describe the format — schema, components, fidelity rules — and are **transport-neutral**. They never name a specific tool.
- **Access-method skills** (`arg-mcp`, `arg-cli`, `arg-fuse`) describe how to actually read/write/delete with that transport.
- **`arg-core`** is the router: access methods, the detection order (MCP → CLI → FUSE), the shared rules, and the master format map.

Adding a new transport = one new `arg-*` skill + a row in `arg-core`; the format skills don't change. Adding a new format = one `arg-file-*` skill; the access-method skills don't change.

### Naming
- `arg-core` — orientation + access-method router. Loaded first.
- `arg-file-<type>` — one per file format (e.g. `arg-file-kanban`, `arg-file-video-edit`).
- `arg-mcp` / `arg-cli` / `arg-fuse` — the access-method (transport) skills.
- `arg-<topic>` — other meta/authoring skills (e.g. `arg-skills-and-agents`).
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
- **Keep CRUD transport-neutral.** Don't name MCP tools (`write_file`, `run_bash`, …), CLI commands, or FUSE paths in a format skill. Start the CRUD section with "use your active Arg access method (`arg-mcp` / `arg-cli` / `arg-fuse` — see `arg-core`)" and list only the **format-specific deltas** (text vs binary, which generator — `python-pptx`/`sqlite3`/`ffmpeg` — "moving a card = …", etc.). The tool/command specifics live in the access-method skills.
- For the four **public** custom formats, link the `llms.txt` and summarize the schema.
- For formats with **no public doc**, inline the full schema (verified against source) so the skill is self-contained.
- Cross-link related skills (e.g. `arg-file-video` ↔ `arg-file-video-edit`).

## Adding a new skill — checklist

1. **Verify the format** against `~/repos/arg-review` (see the table above). Don't guess.
2. Create `plugins/arg/skills/<name>/SKILL.md` — frontmatter `name` == directory name, no angle brackets in `description`.
3. Write the body: keep CRUD transport-neutral (defer the verbs to `arg-core` / the access-method skills), document only format deltas + schema, cross-link siblings.
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
- Don't hardcode access-method specifics (MCP tools, CLI commands, FUSE paths) in a format skill — keep `arg-file-*` transport-neutral; the verbs live in `arg-mcp`/`arg-cli`/`arg-fuse`.
- Don't reference a public `llms.txt` that doesn't exist. Only `design`, `whiteboard`, `kanban`, and `automation` are published; everything else must be inlined in the skill.
- Don't add a skill without also updating `arg-core`, `skills.sh.json`, and the README.
- Don't commit or push unless asked.

## Quick facts
- **Access methods** (detail in `arg-mcp` / `arg-cli` / `arg-fuse`; routing in `arg-core`):
  - **MCP** — remote OAuth server `https://api.arg.ai/mcp` (org endpoint adds `workspace_id`; `/mcp/{workspace_id}` omits it). Tools: `read_file`, `write_file`, `edit_file`, `multi_edit`, `grep`, `run_bash`, `upload_file`/`download_file` (binary), `list_workspaces`, plus web/comment/server tools. No delete/move tool → `run_bash` `rm`/`mv`.
  - **CLI** (`arg`) — `cat`/`ls`/`grep` to read, `upload`/`download` to move whole files; **no in-place edit/rm/mv** (download→edit→upload, or mount).
  - **FUSE** (`arg mount`) — workspace as a local dir with two-way sync; use native file tools; generators run locally.
- Verified against `~/repos/arg-review`: CLI in `cli/` (Go), FUSE in `cli/internal/link/fuse.go` + `cli/internal/cli/mount.go`.
- Repo: `github.com/arg-ai/agent-plugins`. Skills index/badge: `skills.sh/arg-ai/agent-plugins`.
