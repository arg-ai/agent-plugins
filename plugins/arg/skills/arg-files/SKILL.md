---
name: arg-files
version: "2.3.1"
description: The file map of Arg — every supported format and how to work with files. Load this first whenever you create, read, update, or delete files in an Arg workspace — it lists every supported format, states the shared editing rules, points to the arg-file-* skill for each format, and names the access-method skill to pair it with (arg-mcp / arg-cli). For the product overview load arg-overview instead.
---

# Arg files

Arg is a collaborative, fast, cloud file system for humans and agents to collaborate and work together. This skill is the entry point for **file work**: what formats exist, how to reach them, and the shared editing rules.

- Website: https://arg.ai

> **Two things to load for any file operation:** (1) the **access-method** skill for how this environment reaches Arg — `arg-mcp` when Arg is connected as an MCP server, else `arg-cli` when the `arg` command-line tool is installed (direct commands, or `arg mount` for a native filesystem); and (2) the **format** skill for the file you're touching — `arg-file-*`. Format skills are identical regardless of access method; they cover only what's special about the format. (Writing code that calls Arg over HTTP — an integration, script, or agent harness — is a different job: load `arg-api`.)

## Shared rules (every method, every format)

The `arg-file-*` skills assume these and only add format-specific notes:

- **Read before you edit.** Fetch the current contents first, change only what was asked, and preserve the rest of the structure.
- **Preview before reasoning.** When the Arg agent exposes `preview_file`, prefer it to understand a file: text stays text, JPEG/PNG/PDF use their native model representation, and `.html`/`.tsx`/`.jsx`/`.design` are rendered as a JPEG. Every HTML/React preview run pauses for fresh explicit approval because it executes authored code with read-only workspace access. Use `read_file` instead when you need exact source for editing.
- **Edit surgically** where the method supports targeted edits; otherwise rewrite the whole file.
- **Text vs binary.** Text/JSON formats are written/edited as text. Binary formats (image, video, audio, pptx, xlsx, sqlite) can't be — create them by uploading bytes or by running a generator (`python-pptx`, `sqlite3`, `ffmpeg`, Pillow); your access-method skill says exactly how and where that runs.
- **JSON formats:** valid, pretty-printed (2-space) JSON, with a unique `id` on every node / object / column / card.
- **Linked workspace files:** author the documented readable path field only. Editors such as `.video`, `.design`, `.kanban`, `.daw`, and `.dj` add or refresh their optional durable `argfile_...` fields when the file opens. Never invent a file id or replace a path with one.
- **Delete / move:** to remove part of a structured file (a card, a node), edit the JSON rather than deleting the file; your access-method skill covers deleting/moving whole files.
- **Respect locked files.** A file can be locked ("editing locked"): writing to or editing it is refused with an error. Don't fight the lock or route around it - surface it to the user, who can unlock the file if they want the change. A lock freezes content only, so moving/renaming/copying/deleting a locked file still works - but confirm with the user first, since the lock says they care about that file.
- **Leave `.arg/editors/` (and `.views/`) alone.** A workspace-root `.arg/editors/` folder holds UI-managed alternate HTML views ("custom editors") of files (tabular data views; 3D/outline for whiteboards, table/calendar/timeline/map/dashboard/intake/whiteboard for kanbans, slides/dashboard/whiteboard for documents, places/itinerary/whiteboard for KML/KMZ maps, whiteboard for M3U playlists, records-table/structure-explorer for JSON/YAML/XML data files, news/magazine/blog/gallery/podcast/records-table/structure-explorer for RSS feeds, artboard gallery/palette for designs, calendar for diaries), keyed by each source file's path. Older workspaces may still have some under a legacy `.views/` folder. Never hand-edit, rename, move, or delete anything under either — the Views UI owns them, and views read their source file live (no baked data to fix up).

## Formats with a dedicated skill — load before CRUD-ing

For these, **load the named skill first** for format-specific guidance:

| Type                      | Extensions                                                  | Skill                 | Storage                                             |
| ------------------------- | ----------------------------------------------------------- | --------------------- | --------------------------------------------------- |
| Document / notes          | md, mdx, txt, markdown                                      | `arg-file-document`   | Text (`.mdx` adds custom JSX components)            |
| React UI / apps           | tsx, jsx                                                    | `arg-apps`            | Text (live preview on an isolated sitearg origin)   |
| HTML / web / apps         | html, htm                                                   | `arg-apps`            | Text (file-backed apps via the `window.arg` FS SDK) |
| Video editor (NLE)        | video                                                       | `arg-file-video-edit` | Text (JSON timeline with linked media/GIF clips)    |
| DAW / music session       | daw                                                         | `arg-file-daw`        | Text (JSON arrangement)                             |
| Design                    | design, svg, fig                                            | `arg-file-design`     | Text (`.design`/`.svg`); `.fig` import-only         |
| Whiteboard                | whiteboard                                                  | `arg-file-whiteboard` | Text (JSON)                                         |
| Task / project management | kanban                                                      | `arg-file-kanban`     | Text (JSON)                                         |
| Automation / workflow     | automation, `.arg/workflows/*.yml`, `.arg/workflows/*.yaml` | `arg-file-automation` | Text (JSON or YAML)                                 |
| Diary / journal           | diary                                                       | `arg-file-document`   | Text (JSON, per-day rich text)                      |
| Shareable form / survey   | form                                                        | `arg-file-document`   | Text (MDX with form field components)               |

Plus a meta skill, **`arg-skills-and-agents`**, for authoring reusable workspace skills (`.skills/<name>/SKILL.md`) and subagents (`.agents/<name>.md`).

For a product feature map of the Arg **web** and **desktop** apps — what each surface can do, and which capabilities are desktop-only (local-folder workspaces, folder sync, local CLI agents, native notifications) — load **`arg-ui`**. For the full product overview — what Arg is, every offering, plans, and who it's for (e.g. to answer questions about Arg or onboard a new user) — load **`arg-overview`**.

## Custom Arg formats

Arg defines native, agent-friendly formats. Load the dedicated format skill before authoring one:

- `.design` — vector canvas — see the `arg-file-design` skill.
- `.whiteboard` — infinite canvas — see the `arg-file-whiteboard` skill.
- `.kanban` — task board — see the `arg-file-kanban` skill.
- `.automation` — visual workflow — see the `arg-file-automation` skill.
- `.arg/workflows/*.yml` — YAML workflow that compiles to the automation engine — see the `arg-file-automation` skill.

Two more custom surfaces:

- **`.mdx` documents** carry Arg's custom JSX components (callouts, toggles, embeds, columns, tabs, math, mentions, recordings, and more) — documented in full in the `arg-file-document` skill.
- **`.server`** is a JSON config that launches a process in a sandboxed container and exposes a port as a public URL — see the `arg-apps` skill.
- **`.form`** is an MDX document with form field components; shared externally, it collects responses as rows — see the `arg-file-document` skill.

## Other supported formats (no dedicated skill — handle directly)

Arg opens, views, and (where noted) edits many more formats. Create text/JSON/XML ones directly; build binary ones with a generator and write/upload the result (see your access-method skill).

- **Diagrams & shaders** — `.excalidraw` (real Excalidraw JSON scene), `.mermaid`/`.mmd` (live SVG preview), `.shadertoy`/`.glsl`/`.frag` (WebGL render).
- **Data, feeds & config** — `.json` (graph viewer), `.xml`, `.rss` (RSS 2.0 XML), `.yaml`/`.yml`, `.toml`, `.ini`, `.env`, `.sql`. RSS files open as editable XML source and support news, magazine, blog, gallery, podcast, records-table, structure-explorer, and custom AI views.
- **Spreadsheets** — `.csv`/`.tsv` (text — edit directly), `.xlsx`/`.xlsm` (binary — generate with `openpyxl` / `pandas` / `xlsxwriter`).
- **Databases** — `.sqlite`/`.sqlite3`/`.db` (SQLite). Binary — create/query with the `sqlite3` CLI or Python's `sqlite3` module.
- **Presentations** — `.pptx` (PowerPoint). Binary — generate with `python-pptx`.
- **Video** — `.mp4`, `.mov`, `.webm` (+ `.m4v`, `.ogv`, `.mkv`, `.avi`, `.3gp`, `.3g2`). Binary — generate/transcode with `ffmpeg`, or upload. (Multi-track edits use the `.video` NLE — see the table above.)
- **Audio** — `.wav`, `.mp3` (+ `.ogg`, `.flac`, `.m4a`, `.aac`). Binary — generate/transcode with `ffmpeg`, or upload.
- **Images** — `.png`, `.jpg`/`.jpeg`, `.exr`, `.bmp` (+ `.gif`, `.webp`, `.ico`, `.tif`/`.tiff`, `.hdr`, `.psd`). Binary — generate with Pillow / ImageMagick, or upload.
- **Geo & calendar** — `.kml`/`.kmz` (MapLibre map), `.ics`/`.ical`/`.ifb`/`.icalendar`/`.vcs` (calendar).
- **Contacts** — `.vcf`/`.vcard` (vCard — editable contact-card viewer; a file may hold one or many contacts).
- **Media projects** — `.dj` (two-deck mixer), `.m3u`/`.m3u8` (playlists), `.mid`/`.midi`, `.srt`/`.vtt` (subtitles/captions — cue-list editor). (`.daw` DAW sessions and `.video` NLE timelines have dedicated skills — see the table above.)
- **Terminal recordings** — `.cast` (asciicast v1/v2/v3, played back and scrubbed in a terminal emulator). Read-only, and a recorded artifact — capture with `asciinema rec` or upload one; never hand-author it. Line-oriented JSON, so `head`/`jq` read it fine: line 1 is the header (`{"version":2,"width":80,"height":24}`), then `[time, code, data]` events where code `o` is output.
- **Animation & docs** — `.lottie` (Bodymovin), `.pdf`, `.epub`, `.ipynb` (read-only Jupyter).
- **Bookmarks / shortcuts** — `.url` (Windows INI: `[InternetShortcut]` with a `URL=` line), `.webloc` (macOS XML plist with a `URL` key). Clickable files that open a single URL in a new tab; name them after the host (e.g. `github.com.url`).
- **3D / CAD / splats** — `.glb`, `.gltf`, `.obj`, `.stl`, `.fbx`, `.usd*`, `.ply`, `.dae`, `.3ds`, `.3mf`, `.vox`, `.vrml`/`.wrl`, `.amf`; CAD `.step`/`.stp`, `.iges`/`.igs`, `.brep`, `.ifc`, `.3dm`, `.dxf`, `.dwg`; PCB layouts `.kicad_pcb` (KiCad — upload/view only); splats `.splat`, `.ksplat`, `.spz`.
- **React preview** - `.tsx`/`.jsx` files export a default component and render live on a per-file `sitearg.com` origin. They can import relative workspace modules, portable components from `@arg/ui`, and exactly versioned npm dependencies through the nearest `package.json`.
- **Code** - `.ts`, `.js`, `.py`, `.go`, `.rs`, `.java`, `.c`/`.cpp`/`.h`, `.rb`, `.php`, `.swift`, `.kt`, `.css`/`.scss`, `.vue`, `.svelte`, `.astro`, `.sh`, and more.
- **Games & misc** — `.pgn` (chess), `.solitaire` (playable Klondike solitaire, JSON).
- **Archives** — `.zip`, `.tar`, `.gz`/`.tgz`, `.rar`, `.7z`, `.jar`, `.war`, `.apk` (upload/view only — no blank-file creation).
- **Workspace meta** — `.skills/<name>/SKILL.md` (reusable skills) and `.agents/<name>.md` (subagents) — see the `arg-skills-and-agents` skill.
