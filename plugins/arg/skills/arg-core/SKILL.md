---
name: arg-core
description: Core overview of Arg, a collaborative cloud file system for humans and agents. Load this first whenever you create, read, update, or delete files in an Arg workspace over MCP — it lists every supported format, the shared CRUD tools and rules, and which arg-file-* skill to load before working on each format.
---

# Arg

Arg is a collaborative, fast, cloud file system for humans and agents to collaborate and work together.

- Website: https://arg.ai
- Connection: remote MCP server at `https://api.arg.ai/mcp` (OAuth). See the `ensure-arg-connected` rule.

> **Always load the matching `arg-file-*` skill before you create, read, update, or delete a file.** Load `arg-core` once for orientation, then the specific skill (e.g. `arg-file-kanban`, `arg-file-design`, `arg-file-document`, `arg-file-html`) for the file you're touching. Each `arg-file-*` skill covers only what's special about that format — the CRUD tooling and shared rules below apply to all of them.

## CRUD over MCP

Arg exposes a workspace filesystem through MCP tools. The same set covers every file type:

| Operation | Tools | Notes |
| --- | --- | --- |
| **Create** | `write_file` · `upload_file` · `run_bash` | `write_file` for UTF‑8 text/JSON formats. `upload_file` (`encoding: "base64"`) for binary. `run_bash` to generate files in the workspace sandbox (e.g. `python-pptx`, `sqlite3`, `ffmpeg`). |
| **Read** | `read_file` · `download_file` · `grep` | `read_file` for text (supports line `offset`/`limit`). `download_file` for binary (returns a base64 blob). `grep` to search across files. |
| **Update** | `edit_file` · `multi_edit` · `write_file` | Prefer `edit_file`/`multi_edit` (targeted string replacements) for large files — change only what's needed. `write_file` overwrites the whole file. **Always `read_file` first.** |
| **Delete / move** | `run_bash` | `rm` to delete, `mv` to move/rename, in the workspace sandbox. There is no dedicated delete/move MCP tool. |

On the **organization** endpoint every tool also takes a `workspace_id`; call `list_workspaces` to discover ids. The **workspace** endpoint (`/mcp/{workspace_id}`) omits it.

### Shared CRUD rules (apply to every format)

These hold for all file types, so the `arg-file-*` skills don't repeat them — they only add format-specific notes:

- **Read before you edit.** `read_file` (or `download_file` for binary) the current contents first, then change only what was asked and preserve the rest of the structure.
- **Edit surgically.** Prefer `edit_file` / `multi_edit` on large files; reserve `write_file` for new files or full rewrites.
- **Text vs binary.** UTF‑8 text/JSON formats use `write_file`/`edit_file`. Binary formats can't — create them with `upload_file` (`encoding: "base64"`) or generate them in the sandbox with `run_bash`, and read them with `download_file`.
- **JSON formats.** Write valid, pretty-printed (2-space) JSON, and give every node / object / column / card a unique `id`.
- **Delete / move** with `run_bash` (`rm` / `mv`). To remove part of a structured file (a card, a node), edit the JSON rather than deleting the file.

## Formats with a dedicated skill — load before CRUD-ing

For these, **load the named skill first** for format-specific guidance:

| Type | Extensions | Skill | Editable as text? |
| --- | --- | --- | --- |
| Document / notes | md, mdx, txt, markdown | `arg-file-document` | Yes — `write_file` / `edit_file` (`.mdx` adds custom JSX components) |
| HTML / web | html, htm | `arg-file-html` | Yes — incl. file-backed apps via the `window.arg` FS SDK |
| Image | png, jpg, exr, bmp (+ gif, webp, ico, tif/tiff, hdr, psd) | `arg-file-image` | No — binary (`upload_file` / `run_bash`) |
| Video | mp4, mov, webm (+ m4v, ogv, mkv, avi, 3gp, 3g2) | `arg-file-video` | No — binary |
| Video editor (NLE) | video | `arg-file-video-edit` | Yes — JSON timeline |
| Audio | wav, mp3 (+ ogg, flac, m4a, aac) | `arg-file-audio` | No — binary |
| Presentation | pptx | `arg-file-presentation` | No — build via `run_bash` (`python-pptx`) |
| Spreadsheet | csv, tsv, xlsx, xlsm | `arg-file-spreadsheet` | csv/tsv yes; xlsx binary |
| Database | sqlite, sqlite3, db | `arg-file-database` | No — `run_bash` (`sqlite3`) |
| Design | design, svg, fig | `arg-file-design` | `.design`/`.svg` yes (JSON/XML); `.fig` import-only |
| Whiteboard | whiteboard | `arg-file-whiteboard` | Yes — JSON |
| Task / project management | kanban | `arg-file-kanban` | Yes — JSON |
| Automation / workflow | automation | `arg-file-automation` | Yes — JSON |
| Diary / journal | diary | `arg-file-diary` | Yes — JSON (per-day rich text) |
| URL shortcut / bookmark | url, webloc | `arg-file-url` | Yes — text |

Plus a meta skill, **`arg-skills-and-agents`**, for authoring reusable workspace skills (`.skills/<name>/SKILL.md`) and subagents (`.agents/<name>.md`).

## Custom Arg formats

Arg defines native, agent-friendly formats. Fetch the full schema before authoring one — each `llms.txt` is the single source of truth and includes every field plus a complete example:

- `.design` — vector canvas — https://arg.ai/docs/files/design/llms.txt
- `.whiteboard` — infinite canvas — https://arg.ai/docs/files/whiteboard/llms.txt
- `.kanban` — task board — https://arg.ai/docs/files/kanban/llms.txt
- `.automation` — visual workflow — https://arg.ai/docs/files/automation/llms.txt

Two more custom surfaces:

- **`.mdx` documents** carry Arg's custom JSX components (callouts, toggles, embeds, columns, tabs, math, mentions, recordings, and more) — documented in full in the `arg-file-document` skill.
- **`.site`** is a JSON config that launches a process in a sandboxed container and exposes a port as a public URL — see the `arg-file-html` skill.

## Other supported formats (no dedicated skill — handle directly)

Arg opens, views, and (where noted) edits many more formats. Create text/JSON/XML ones with `write_file`; build binary ones in the sandbox with `run_bash`; upload other binaries with `upload_file`.

- **Diagrams & shaders** — `.mermaid`/`.mmd` (live SVG preview), `.shadertoy`/`.glsl`/`.frag` (WebGL render).
- **Data & config** — `.json` (graph viewer), `.xml`, `.yaml`/`.yml`, `.toml`, `.ini`, `.env`, `.sql`.
- **Geo & calendar** — `.kml`/`.kmz` (MapLibre map), `.ics`/`.ical`/`.ifb`/`.icalendar`/`.vcs` (calendar).
- **Media projects** — `.dj` (two-deck mixer), `.m3u`/`.m3u8` (playlists), `.mid`/`.midi`. (`.video` NLE timelines have a dedicated skill — see the table above.)
- **Animation & docs** — `.lottie` (Bodymovin), `.pdf`, `.epub`, `.ipynb` (read-only Jupyter).
- **3D / CAD / splats** — `.glb`, `.gltf`, `.obj`, `.stl`, `.fbx`, `.usd*`, `.ply`, `.dae`, `.3ds`, `.3mf`, `.vox`, `.vrml`/`.wrl`, `.amf`; CAD `.step`/`.stp`, `.iges`/`.igs`, `.brep`, `.ifc`, `.3dm`, `.dxf`, `.dwg`; splats `.splat`, `.ksplat`, `.spz`.
- **Code** — `.ts`/`.tsx`, `.js`/`.jsx`, `.py`, `.go`, `.rs`, `.java`, `.c`/`.cpp`/`.h`, `.rb`, `.php`, `.swift`, `.kt`, `.css`/`.scss`, `.vue`, `.svelte`, `.astro`, `.sh`, and more.
- **Games & misc** — `.pgn` (chess), `.snake`.
- **Workspace meta** — `.skills/<name>/SKILL.md` (reusable skills) and `.agents/<name>.md` (subagents) — see the `arg-skills-and-agents` skill.
