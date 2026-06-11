---
name: arg-core
description: Core overview of Arg, a collaborative cloud file system for humans and agents. Load this first whenever you create, read, update, or delete files in an Arg workspace — it lists every supported format, routes you to the right access method (MCP / CLI / FUSE), states the shared rules, and points to the arg-file-* skill for each format.
---

# Arg

Arg is a collaborative, fast, cloud file system for humans and agents to collaborate and work together.

- Website: https://arg.ai

> **Two things to load for any file operation:** (1) the **access-method** skill for how this environment reaches Arg — `arg-mcp`, `arg-cli`, or `arg-fuse` (see "Accessing files" below); and (2) the **format** skill for the file you're touching — `arg-file-*`. Format skills are identical regardless of access method; they cover only what's special about the format.

## Accessing files (pick one)

Arg supports three ways to do file CRUD. The **verbs differ; the formats don't.** Load the skill for the active method:

| Method | Use when | Skill |
| --- | --- | --- |
| **MCP** | Arg is connected as an MCP server (remote, OAuth — `https://api.arg.ai/mcp`) | `arg-mcp` |
| **CLI** | the `arg` command-line tool is installed | `arg-cli` |
| **Native filesystem** | the workspace is mounted as a local dir (FUSE, via `arg mount`) | `arg-fuse` |

**Choosing one:** if the environment (system prompt / project config / `CLAUDE.md`) names a method, use it. Otherwise detect, in order:

1. **MCP** configured/connected → `arg-mcp`.
2. else the **`arg` CLI** on `PATH` → `arg-cli`.
3. else operate on the workspace as a **native mounted filesystem** → `arg-fuse`.

### Shared rules (every method, every format)

The `arg-file-*` skills assume these and only add format-specific notes:

- **Read before you edit.** Fetch the current contents first, change only what was asked, and preserve the rest of the structure.
- **Edit surgically** where the method supports targeted edits; otherwise rewrite the whole file.
- **Text vs binary.** Text/JSON formats are written/edited as text. Binary formats (image, video, audio, pptx, xlsx, sqlite) can't be — create them by uploading bytes or by running a generator (`python-pptx`, `sqlite3`, `ffmpeg`, Pillow); your access-method skill says exactly how and where that runs.
- **JSON formats:** valid, pretty-printed (2-space) JSON, with a unique `id` on every node / object / column / card.
- **Delete / move:** to remove part of a structured file (a card, a node), edit the JSON rather than deleting the file; your access-method skill covers deleting/moving whole files.

## Formats with a dedicated skill — load before CRUD-ing

For these, **load the named skill first** for format-specific guidance:

| Type | Extensions | Skill | Storage |
| --- | --- | --- | --- |
| Document / notes | md, mdx, txt, markdown | `arg-file-document` | Text (`.mdx` adds custom JSX components) |
| HTML / web | html, htm | `arg-file-html` | Text (file-backed apps via the `window.arg` FS SDK) |
| Image | png, jpg, exr, bmp (+ gif, webp, ico, tif/tiff, hdr, psd) | `arg-file-image` | Binary |
| Video | mp4, mov, webm (+ m4v, ogv, mkv, avi, 3gp, 3g2) | `arg-file-video` | Binary |
| Video editor (NLE) | video | `arg-file-video-edit` | Text (JSON timeline) |
| Audio | wav, mp3 (+ ogg, flac, m4a, aac) | `arg-file-audio` | Binary |
| Presentation | pptx | `arg-file-presentation` | Binary (generate with `python-pptx`) |
| Spreadsheet | csv, tsv, xlsx, xlsm | `arg-file-spreadsheet` | csv/tsv text; xlsx binary |
| Database | sqlite, sqlite3, db | `arg-file-database` | Binary (via `sqlite3`) |
| Design | design, svg, fig | `arg-file-design` | Text (`.design`/`.svg`); `.fig` import-only |
| Whiteboard | whiteboard | `arg-file-whiteboard` | Text (JSON) |
| Task / project management | kanban | `arg-file-kanban` | Text (JSON) |
| Automation / workflow | automation | `arg-file-automation` | Text (JSON) |
| Diary / journal | diary | `arg-file-diary` | Text (JSON, per-day rich text) |
| URL shortcut / bookmark | url, webloc | `arg-file-url` | Text |

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

Arg opens, views, and (where noted) edits many more formats. Create text/JSON/XML ones directly; build binary ones with a generator and write/upload the result (see your access-method skill).

- **Diagrams & shaders** — `.mermaid`/`.mmd` (live SVG preview), `.shadertoy`/`.glsl`/`.frag` (WebGL render).
- **Data & config** — `.json` (graph viewer), `.xml`, `.yaml`/`.yml`, `.toml`, `.ini`, `.env`, `.sql`.
- **Geo & calendar** — `.kml`/`.kmz` (MapLibre map), `.ics`/`.ical`/`.ifb`/`.icalendar`/`.vcs` (calendar).
- **Media projects** — `.dj` (two-deck mixer), `.m3u`/`.m3u8` (playlists), `.mid`/`.midi`. (`.video` NLE timelines have a dedicated skill — see the table above.)
- **Animation & docs** — `.lottie` (Bodymovin), `.pdf`, `.epub`, `.ipynb` (read-only Jupyter).
- **3D / CAD / splats** — `.glb`, `.gltf`, `.obj`, `.stl`, `.fbx`, `.usd*`, `.ply`, `.dae`, `.3ds`, `.3mf`, `.vox`, `.vrml`/`.wrl`, `.amf`; CAD `.step`/`.stp`, `.iges`/`.igs`, `.brep`, `.ifc`, `.3dm`, `.dxf`, `.dwg`; splats `.splat`, `.ksplat`, `.spz`.
- **Code** — `.ts`/`.tsx`, `.js`/`.jsx`, `.py`, `.go`, `.rs`, `.java`, `.c`/`.cpp`/`.h`, `.rb`, `.php`, `.swift`, `.kt`, `.css`/`.scss`, `.vue`, `.svelte`, `.astro`, `.sh`, and more.
- **Games & misc** — `.pgn` (chess), `.snake`.
- **Workspace meta** — `.skills/<name>/SKILL.md` (reusable skills) and `.agents/<name>.md` (subagents) — see the `arg-skills-and-agents` skill.
