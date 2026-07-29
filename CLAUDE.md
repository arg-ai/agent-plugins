# Arg agent plugins — repo guide

This repo is a plugin **marketplace** that lets Claude Code, Cursor, and Codex connect to [Arg](https://arg.ai) (a collaborative cloud file system) over MCP, plus a library of **skills** that teach agents how to read/write each Arg file format. It doubles as a [pi package](https://pi.dev/docs/latest/packages) (skills only — pi has no MCP support).

There is one plugin — `arg` — and most work here is **adding or editing skills**.

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

## Public repo — contribute via PRs

These skills are **deployed for public consumption** — they ship in the marketplace and are what agents load in the wild, so accuracy matters. This repo is public and **all changes go through pull requests**; direct pushes to `main` aren't used. PRs and issues are welcome and taken into consideration — if a schema looks wrong, a format is missing, or a doc has drifted, open one rather than guessing.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full workflow, the skill-authoring checklist, validation, and the don'ts.

## Source of truth

**Never invent schema fields, enum values, or tool names.** The canonical schemas are maintained inside Arg's internal repository; this marketplace ships the verified, public-safe subset. Verify every format against what's published:

| Need | Where |
| --- | --- |
| Public custom formats (design / whiteboard / kanban / automation) | `https://arg.ai/docs/files/<slug>/llms.txt` |
| `window.arg` FS SDK | `https://arg.ai/docs/sdks/fs/llms.txt` |
| MCP tools, the CLI, and broader guides | `https://developers.arg.ai` |

Only those four custom formats have a published `llms.txt`. For every other format there is no public schema doc, so the verified schema lives **inlined in the skill itself** — treat the existing `arg-file-*` skills as the reference and keep them accurate.

## Skill model

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
- **The directory name MUST equal the `name:` in frontmatter**, and the `description` must not contain angle brackets (the Codex validator rejects them).

### Body pattern
- **Keep CRUD transport-neutral.** Don't name MCP tools, CLI commands, or FUSE paths in a format skill. Start the CRUD section with "use your active Arg access method (`arg-mcp` / `arg-cli` / `arg-fuse` — see `arg-core`)" and list only the **format-specific deltas** (text vs binary, which generator — `python-pptx`/`sqlite3`/`ffmpeg` — "moving a card = …", etc.). The tool/command specifics live in the access-method skills.
- For the four **public** custom formats, link the `llms.txt` and summarize the schema. For formats with **no public doc**, inline the full verified schema so the skill is self-contained.
- Cross-link related skills (e.g. `arg-file-video` ↔ `arg-file-video-edit`).

The full authoring checklist (including updating `arg-core`, `skills.sh.json`, and the README) and validation steps live in [`CONTRIBUTING.md`](CONTRIBUTING.md). Run `bun run build` before finishing; a `no hooks/hooks.json` warning is expected and fine.

## Quick facts
- **Access methods** (detail in `arg-mcp` / `arg-cli` / `arg-fuse`; routing in `arg-core`):
  - **MCP** — remote OAuth server `https://api.arg.ai/mcp` (org endpoint adds `workspace_id`; `/mcp/{workspace_id}` omits it). Tools: `read_file`, `write_file`, `edit_file`, `multi_edit`, `grep`, `run_bash`, `upload_file`/`download_file` (binary), `list_workspaces`, plus web/comment/server tools. No delete/move tool → `run_bash` `rm`/`mv`.
  - **CLI** (`arg`) — `cat`/`ls`/`grep` to read, `upload`/`download` to move whole files; **no in-place edit/rm/mv** (download→edit→upload, or mount).
  - **FUSE** (`arg mount`) — workspace as a local dir with two-way sync; use native file tools; generators run locally.
- Repo: `github.com/arg-ai/agent-plugins`. Skills index/badge: `skills.sh/arg-ai/agent-plugins`.
