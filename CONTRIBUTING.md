# Contributing to Arg agent plugins

Thanks for helping improve the Arg plugins and skills. This repo is a public plugin **marketplace** that lets Claude Code, Cursor, and Codex connect to [Arg](https://arg.ai) over MCP, plus a library of **skills** that teach agents how to read/write each Arg file format. It also ships as a [pi package](https://pi.dev/docs/latest/packages), which loads `plugins/arg/skills/` via the `pi` key in the root `package.json` — new skills are picked up automatically, no manifest edit needed.

There is one plugin — `arg` — and most contributions are **adding or editing skills**.

## How to contribute

**All changes go through pull requests.** Please don't push directly to `main`.

1. **Open an issue first** for anything non-trivial — a missing format, a schema that looks wrong, a doc that has drifted. Small fixes can go straight to a PR.
2. **Fork and branch.** Make your change on a topic branch.
3. **Run the validators** (`bun run build`) and make sure they pass.
4. **Open a PR.** Describe what you changed and, for a skill, cite the doc or real file you verified the format against.

PRs and issues are genuinely reviewed and taken into consideration. If a schema looks wrong or a format is missing, open one rather than guessing.

## Source of truth

**Never invent schema fields, enum values, or tool names.** The canonical schemas are maintained inside Arg's internal repository; this marketplace ships the verified, public-safe subset. Verify every format against what's published:

| Need | Where |
| --- | --- |
| Public custom formats (design / whiteboard / kanban / automation) | `https://arg.ai/docs/files/<slug>/llms.txt` |
| `window.arg` FS SDK | `https://arg.ai/docs/sdks/fs/llms.txt` |
| MCP tools, the CLI, and broader guides | `https://developers.arg.ai` |

Only those four custom formats have a published `llms.txt`. For every other format there is no public schema doc, so the verified schema lives **inlined in the skill itself** — treat the existing `arg-file-*` skills as the reference and keep them accurate.

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
- **The directory name MUST equal the `name:` in frontmatter.**

### Frontmatter
```
---
name: arg-file-foo
description: One line — what it does, when to load it, the extensions/CRUD verbs it covers.
---
```
- The `description` **must NOT contain angle brackets `<` or `>`** — the Codex validator rejects them. Write "SKILL.md files under .skills", not `.skills/<name>/SKILL.md`.
- Make the description specific: name the trigger and the file extensions so the right skill is matched.

### Body pattern
- **Keep CRUD transport-neutral.** Don't name MCP tools (`write_file`, `run_bash`, …), CLI commands, or FUSE paths in a format skill. Start the CRUD section with "use your active Arg access method (`arg-mcp` / `arg-cli` / `arg-fuse` — see `arg-core`)" and list only the **format-specific deltas** (text vs binary, which generator — `python-pptx`/`sqlite3`/`ffmpeg` — "moving a card = …", etc.). The tool/command specifics live in the access-method skills.
- For the four **public** custom formats, link the `llms.txt` and summarize the schema.
- For formats with **no public doc**, inline the full verified schema so the skill is self-contained.
- Cross-link related skills (e.g. `arg-file-video` ↔ `arg-file-video-edit`).

## Adding a new skill — checklist

1. **Verify the format** against Arg's public docs (see the table above); for formats without a published doc, match the schema already inlined in the sibling skills. Don't guess.
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

Run it before opening a PR. A `no hooks/hooks.json` warning is expected and fine.

Common failures:
- Angle brackets in a skill `description`.
- Directory name ≠ frontmatter `name`.
- Missing `name`/`description`.
- A new skill missing from `skills.sh.json`, the `arg-core` table, or the README.

## Don'ts
- Don't invent schema fields/enums/tool names — verify against the published docs (or the inlined schema in the sibling skills).
- Don't hardcode access-method specifics (MCP tools, CLI commands, FUSE paths) in a format skill — keep `arg-file-*` transport-neutral; the verbs live in `arg-mcp`/`arg-cli`/`arg-fuse`.
- Don't reference a public `llms.txt` that doesn't exist. Only `design`, `whiteboard`, `kanban`, and `automation` are published; everything else must be inlined in the skill.
- Don't add a skill without also updating `arg-core`, `skills.sh.json`, and the README.
