---
name: arg-files
version: "2.9.1"
description: The file map of Arg — every supported format and how to work with files. Load this first whenever you create, read, update, or delete files in an Arg workspace — it lists every supported format, states the shared editing rules, recommends the library to generate each binary format (and how to install one fast), points to the arg-file-* skill for each format, and names the access-method skill to pair it with (arg-mcp / arg-cli). For the product overview load arg-overview instead.
---

# Arg files

Arg is a collaborative, fast, cloud file system for humans and agents to collaborate and work together. This skill is the entry point for **file work**: what formats exist, how to reach them, and the shared editing rules.

- Website: https://arg.ai

> **Two things to load for any file operation:** (1) the **access-method** skill for how this environment reaches Arg — `arg-mcp` when Arg is connected as an MCP server, else `arg-cli` when the `arg` command-line tool is installed (direct commands, or `arg mount` for a native filesystem); and (2) the **format** skill for the file you're touching — `arg-file-*`. Format skills are identical regardless of access method; they cover only what's special about the format. (Writing code that calls Arg over HTTP — an integration, script, or agent harness — is a different job: load `arg-api`.)

## Shared rules (every method, every format)

The `arg-file-*` skills assume these and only add format-specific notes:

- **Read before you edit.** Fetch the current contents first, change only what was asked, and preserve the rest of the structure.
- **Edit surgically** where the method supports targeted edits; otherwise rewrite the whole file.
- **Text vs binary.** Text/JSON formats are written/edited as text. Binary formats (image, video, audio, pptx, xlsx, docx, sqlite) can't be — create them by uploading bytes or, where the format guidance permits it, by running a generator (`sqlite3`, `ffmpeg`, Pillow, `xlsxwriter`, `python-docx` — see Recommended libraries below); your access-method skill says exactly how and where that runs.
- **JSON formats:** valid, pretty-printed (2-space) JSON, with a unique `id` on every node / object / column / card. The only documented exception is one initial static-HTML write to a brand-new `.design` path that does not already exist; every update to an existing `.design` uses canonical JSON. `arg-file-design` defines that create-only authoring wire format and how Arg materializes it.
- **Structured edit libraries:** the Design, Video, and Kanban skills bundle small dependency-free modules under `scripts/document-edit/`. Prefer their relationship-aware helpers over hand-editing linked ids and arrays; use their raw JSON edit operation for fields without a dedicated helper.
- **Linked workspace files:** the durable stored form carries both a stable `argfile_...` id and a readable path snapshot. Author the documented path field only because editors such as `.video`, `.design`, `.kanban`, `.daw`, and `.dj` own id minting and refresh both fields when a linked file moves. Preserve a valid existing pair, and never invent a file id or replace a path with one.
- **Delete / move:** to remove part of a structured file (a card, a node), edit the JSON rather than deleting the file; your access-method skill covers deleting/moving whole files.
- **Respect locked files.** A file can be locked ("editing locked"): writing to or editing it is refused with an error. Don't fight the lock or route around it - surface it to the user, who can unlock the file if they want the change. A lock freezes content only, so moving/renaming/copying/deleting a locked file still works - but confirm with the user first, since the lock says they care about that file.
- **Sharing outside Arg needs a share link.** Every ordinary Arg URL for a file — an app deep link, `get_file_urls`, `arg://` — requires signing in and having workspace access, so it is worthless to a recipient who has neither, and it can never render as an image. Mint a public link instead (`create_share_link` over MCP, `POST /files/share` over HTTP). It returns a share **page** for a person to open and a **direct bytes** URL (`/api/share/<id>/view`) that serves the file with its real content type — the bytes URL is the one an image proxy can fetch, so it is what a GitHub markdown image, a Slack unfurl or an `<img>` needs; the page URL will never render as an image. The link needs no sign-in, so treat minting one as publishing: don't do it to anything carrying customer data, credentials, or private work unless the user asked, and tell them the link is public when you hand it over.
- **Leave `.arg/editors/` (and `.views/`) alone.** A workspace-root `.arg/editors/` folder holds UI-managed alternate HTML views ("custom editors") of files (tabular data views; 3D/outline for whiteboards, table/calendar/timeline/map/dashboard/intake/whiteboard for kanbans, slides/dashboard/whiteboard for documents, places/itinerary/whiteboard for KML/KMZ maps, whiteboard for M3U playlists, records-table/structure-explorer for JSON/YAML/XML data files, news/magazine/blog/gallery/podcast/records-table/structure-explorer for RSS feeds, artboard gallery/palette for designs, calendar for diaries), keyed by each source file's path. Older workspaces may still have some under a legacy `.views/` folder. Never hand-edit, rename, move, or delete anything under either — the editor's App switcher owns them, and views read their source file live (no baked data to fix up).
- `.video` and `.daw` files can also have AI-generated custom apps even though they currently have no predefined templates.

## Formats with a dedicated skill — load before CRUD-ing

For these, **load the named skill first** for format-specific guidance:

| Type                      | Extensions                                                  | Skill                 | Storage                                                                                           |
| ------------------------- | ----------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| Document / notes          | md, mdx, txt, markdown                                      | `arg-file-document`   | Text (`.mdx` adds custom JSX components)                                                          |
| React UI / apps           | tsx, jsx                                                    | `arg-apps`            | Text (live preview on an isolated sitearg origin)                                                 |
| HTML / web / apps         | html, htm                                                   | `arg-apps`            | Text (file-backed apps via the `window.arg` FS SDK; also HyperFrames motion-graphic compositions) |
| Video editor (NLE)        | video                                                       | `arg-file-video-edit` | Text (JSON timeline with linked media/projects)                                                   |
| DAW / music session       | daw                                                         | `arg-file-daw`        | Text (JSON arrangement)                                                                           |
| Design                    | design, svg, fig                                            | `arg-file-design`     | Text (`.design`: JSON; HTML only on initial creation; `.svg`); `.fig` import-only                 |
| CAD / architecture        | cad                                                         | `arg-file-cad`        | Text (JSON; `.dxf`/`.dwg` import-only)                                                            |
| Whiteboard                | whiteboard                                                  | `arg-file-whiteboard` | Text (JSON)                                                                                       |
| Task / project management | kanban                                                      | `arg-file-kanban`     | Text (JSON)                                                                                       |
| Automation / workflow     | automation, `.arg/workflows/*.yml`, `.arg/workflows/*.yaml` | `arg-file-automation` | Text (JSON or YAML)                                                                               |
| Diary / journal           | diary                                                       | `arg-file-document`   | Text (JSON, per-day rich text)                                                                    |
| Shareable form / survey   | form                                                        | `arg-file-document`   | Text (MDX with form field components)                                                             |

For slide decks and presentations, load `arg-slides`. It makes a self-contained `.html` deck the default and covers presentation structure, navigation and present mode, live workspace data, and when to build a multi-artboard `.design` deck instead (an editable design canvas, or a PowerPoint / PDF deliverable) alongside `arg-file-design`.

Plus a meta skill, **`arg-skills-and-agents`**, for authoring reusable workspace skills (`.skills/<name>/SKILL.md`) and subagents (`.agents/<name>.md`).

For a product feature map of the Arg **web** and **desktop** apps — what each surface can do, and which capabilities are desktop-only (local-folder workspaces, folder sync, local CLI agents, native notifications) — load **`arg-ui`**. For the full product overview — what Arg is, every offering, plans, and who it's for (e.g. to answer questions about Arg or onboard a new user) — load **`arg-overview`**.

## Custom Arg formats

Arg defines native, agent-friendly formats. Load the dedicated format skill before authoring one:

- `.design` — vector canvas. Native JSON is canonical. An agent may write static HTML only while creating a brand-new path and let Arg materialize it on open or render; read and update every existing `.design` as JSON - see the `arg-file-design` skill.
- `.cad` — parametric CAD drawing (floor plans, buildings, structural frames, bridges), and LiDAR scan reconstruction — see the `arg-file-cad` skill.
- `.whiteboard` — infinite canvas with font-selectable standalone text objects — see the `arg-file-whiteboard` skill.
- `.kanban` — task board — see the `arg-file-kanban` skill.
- `.automation` — visual workflow — see the `arg-file-automation` skill.
- `.arg/workflows/*.yml` — YAML workflow that compiles to the automation engine — see the `arg-file-automation` skill.
- `.video` - an NLE timeline that can also be referenced as a normal video clip from another `.video`, making reusable compositions, stingers, title packages, and prebuilt sequences without copying child tracks - see the `arg-file-video-edit` skill.

Two more custom surfaces:

- **`.mdx` documents** carry Arg's custom JSX components (callouts, toggles, embeds, columns, tabs, math, mentions, recordings, and more) — documented in full in the `arg-file-document` skill.
- **`.server`** is a JSON config that launches a process in a sandboxed container and exposes a port with Personal, Workspace, or Public access - see the `arg-apps` skill.
- **`.form`** is an MDX document with form field components; shared externally, it collects responses as rows — see the `arg-file-document` skill.
- **`.tools/<slug>.yaml`** wires Arg to one third-party HTTP API. YAML: a `base` URL, an `auth:` block naming a stored secret, and an `operations:` mapping. The whole file becomes one tool you call by its slug (`stripe({})` lists its operations, `stripe({ operation, input })` runs one). Never write a literal credential into it - it is an ordinary workspace file. Never pass a secret value as a tool argument. Call `list_secrets` before you write the file so `auth:` names a secret that exists and is usable in this workspace; it returns names, key hints and settings, never a value. If the name is missing, call `request_secret` with that name rather than asking the user to open Settings or paste the key in chat. Arg attaches the credential itself on the way out, so the value never reaches you. A file you write is callable on your NEXT turn; a new operation added to a tool that already exists is callable immediately.

## Other supported formats (no dedicated skill — handle directly)

Arg opens, views, and (where noted) edits many more formats. Create text/JSON/XML ones directly; build binary ones with a generator and write/upload the result (see your access-method skill).

- **Diagrams & shaders** — `.excalidraw` (real Excalidraw JSON scene), `.mermaid`/`.mmd` (live SVG preview), `.shadertoy`/`.glsl`/`.frag` (WebGL render).
- **Data, feeds & config** — `.json` (graph viewer), `.xml`, `.rss` (RSS 2.0 XML), `.yaml`/`.yml`, `.toml`, `.ini`, `.env`, `.sql`. RSS files open as editable XML source and support news, magazine, blog, gallery, podcast, records-table, structure-explorer, and custom AI views.
- **Spreadsheets** — `.csv`/`.tsv` (text — edit directly), `.xlsx`/`.xlsm` (binary — generate with `xlsxwriter`, edit an existing workbook with `openpyxl`; see Recommended libraries below).
- **Databases** — `.sqlite`/`.sqlite3`/`.db` (SQLite). Binary — create/query with the `sqlite3` CLI or Python's `sqlite3` module.
- **Presentations** — `.pptx` (PowerPoint). Binary — upload or open an existing deck in the slide editor (thumbnails, add/reorder slides, text and shape editing across the DrawingML shape gallery, tables, charts, groups, pictures, speaker notes, slide transitions and animations, and present mode). Anything the editor does not model is preserved byte-for-byte through a save. Don't generate a new deck as `.pptx`; load `arg-slides` and author a self-contained `.html` deck, or a `.design` document whose artboards present as slides when the user wants an editable canvas - including when they need PowerPoint, since a `.design` deck exports to an editable `.pptx` (shapes, text runs, pictures, embedded fonts, playable video, notes pages and sections) through the `design_to_pptx` action or the Export pill in Slides view.
- **Documents (Word)** — `.docx` (binary — generate with `python-docx`).
- **Video** — `.mp4`, `.mov`, `.webm` (+ `.m4v`, `.ogv`, `.mkv`, `.avi`, `.3gp`, `.3g2`). Binary — generate/transcode with `ffmpeg`, or upload. (Multi-track edits use the `.video` NLE — see the table above.)
- **Audio** — `.wav`, `.mp3` (+ `.ogg`, `.flac`, `.m4a`, `.aac`). Binary — generate/transcode with `ffmpeg`, or upload.
- **Images** — `.png`, `.jpg`/`.jpeg`, `.exr`, `.bmp` (+ `.gif`, `.webp`, `.ico`, `.tif`/`.tiff`, `.hdr`, `.psd`, `.heic`/`.heif`). Binary — generate with Pillow / ImageMagick, or upload. `.heic`/`.heif` are display-only: they open in a read-only viewer that keeps HDR where the platform supports it, and the viewer's Convert action writes a `.jpg`/`.png`/`.webp` copy rather than editing in place, so convert first if you need to edit the pixels. GIFs open in an animated player with local crop, resize, speed and convert-to-MP4 tools that keep every frame; the static image canvas is not one of them, so use an animation-aware tool when editing elsewhere or the file is flattened to one frame.
- **Geo & calendar** — `.kml`/`.kmz` (MapLibre map), `.ics`/`.ical`/`.ifb`/`.icalendar`/`.vcs` (calendar).
- **Contacts** — `.vcf`/`.vcard` (vCard — editable contact-card viewer; a file may hold one or many contacts).
- **Media projects** — `.dj` (two-deck mixer), `.m3u`/`.m3u8` (playlists), `.mid`/`.midi`, `.srt`/`.vtt` (subtitles/captions — cue-list editor). (`.daw` DAW sessions and `.video` NLE timelines have dedicated skills — see the table above.)
- **Terminal recordings** — `.cast` (asciicast v1/v2/v3, played back and scrubbed in a terminal emulator). Read-only, and a recorded artifact — capture with `asciinema rec` or upload one; never hand-author it. Line-oriented JSON, so `head`/`jq` read it fine: line 1 is the header (`{"version":2,"width":80,"height":24}`), then `[time, code, data]` events where code `o` is output.
- **Animation & docs** — `.lottie` (Bodymovin), `.pdf`, `.epub`, `.ipynb` (read-only Jupyter).
- **Bookmarks / shortcuts** — `.url` (Windows INI: `[InternetShortcut]` with a `URL=` line), `.webloc` (macOS XML plist with a `URL` key). Clickable files that open a single URL in a new tab; name them after the host (e.g. `github.com.url`).
- **App launchers** — `.app`. A small JSON manifest that gives an app already in the workspace a name, an icon and a launchable file of its own: `{"name": "Expense tracker", "icon": "<svg viewBox=\"0 0 24 24\">…</svg>", "entry": {"path": "apps/expenses.tsx"}}`. `entry.path` must name an existing `.html`/`.htm`/`.tsx`/`.jsx` file (an `entry.id` file id is stored alongside it so the launcher survives a rename), and `icon` is inline SVG markup rather than a path. Opening the `.app` renders that file's app full page. It is a pointer, not a copy - author or edit the app itself in the `.html`/`.tsx` file.
- **3D / CAD / splats** — `.glb`, `.gltf`, `.obj`, `.stl`, `.fbx`, `.usd*`, `.ply`, `.dae`, `.3ds`, `.3mf`, `.vox`, `.vrml`/`.wrl`, `.amf`; CAD `.step`/`.stp`, `.iges`/`.igs`, `.brep`, `.ifc`, `.3dm`, `.dxf`, `.dwg`; PCB layouts `.kicad_pcb` (KiCad — upload/view only); splats `.splat`, `.ksplat`, `.spz`.
- **React preview** - `.tsx`/`.jsx` files export a default component and render live on a per-file `sitearg.com` origin. They can import relative workspace modules, the exact shared Arg components from `@arg/ui`, and exactly versioned npm dependencies through the nearest `package.json`.
- **Code** - `.ts`, `.js`, `.py`, `.go`, `.rs`, `.java`, `.c`/`.cpp`/`.h`, `.rb`, `.php`, `.swift`, `.kt`, `.css`/`.scss`, `.vue`, `.svelte`, `.astro`, `.sh`, and more.
- **Games & misc** — `.pgn` (chess), `.solitaire` (playable Klondike solitaire, JSON).
- **Archives** — `.zip`, `.tar`, `.gz`/`.tgz`, `.rar`, `.7z`, `.jar`, `.war`, `.apk` (upload/view only — no blank-file creation).
- **Workspace meta** — `.skills/<name>/SKILL.md` (reusable skills), `.agents/<name>.md` (subagents) — see the `arg-skills-and-agents` skill — and `.tools/<slug>.yaml` (third-party HTTP APIs, above).

## Recommended libraries

When a format needs a generator, reach for the library below rather than hand-rolling a writer or picking one at random — these are the ones the sandbox is provisioned for. Where they run is your access-method skill's business (`run_bash` over MCP, `arg` locally).

**Installing.** Check the preinstalled list below first — the user waits through every install. When you do need something else, `pip install <pkg> -q`. Never `apt-get install` a Python package; apt is for system binaries (`sqlite3`) and its Python packages are older than PyPI's. Sandbox installs are session-local: after ~10 minutes of inactivity or a cold start they are gone, so reinstall is normal. Keep venvs/`node_modules` in `/tmp` or `$HOME` for the run - do not put dependency trees in the workspace tree (slow network mount, pollutes search and the file browser).

**Already installed — import, don't install:** `requests`, `pandas`, `numpy`, `scipy`, `matplotlib`, `pillow`, `pillow-heif`, `beautifulsoup4`, `pyyaml`, `openpyxl`, `xlsxwriter`, `python-docx`, `python-pptx`, `pymupdf`, `pypdf`, `pypdfium2`, `pdfplumber`, `opencv-python-headless`, `imageio-ffmpeg`, `fonttools`, `brotli`. `ffmpeg` and `ffprobe` are on PATH — do not `apt-get install ffmpeg` or `pip install imageio-ffmpeg`.

| Task                      | Use                            | Notes                                                                                                                                                                                                      |
| ------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Excel — write formatted   | `xlsxwriter`                   | Best writer: charts, sparklines, number formats, low memory. Write-only — cannot reopen a file.                                                                                                            |
| Excel — read / edit       | `openpyxl`                     | Round-trips styles, formulas, validations. It rebuilds the file, so charts, images and pivot tables in a workbook it loads are **dropped on save** — write with `xlsxwriter` when output fidelity matters. |
| Excel — read fast / bulk  | `python-calamine`              | Rust-backed, values only, no styles. Also `pandas.read_excel(..., engine="calamine")`.                                                                                                                     |
| Excel — evaluate formulas | `formulas`                     | A workbook may cache no results (`fullCalcOnLoad`), so reading cells alone returns blanks.                                                                                                                 |
| Word                      | `python-docx`                  |                                                                                                                                                                                                            |
| PowerPoint                | `python-pptx`                  | Edit / generate a binary `.pptx`. Prefer `.html` or `.design` for new decks when the user will keep editing in Arg.                                                                                        |
| PDF — read / edit         | `pymupdf`                      | `import fitz`. `pypdf` / `pdfplumber` if you need those APIs.                                                                                                                                              |
| PDF — generate            | HTML → the `html`→`pdf` action | Prefer the action over a Python PDF writer — see the `arg-actions` skill.                                                                                                                                  |
| CSV / tabular analysis    | `pandas`                       | For plain row I/O the stdlib `csv` module is lighter and preserves exact values.                                                                                                                           |
| Images                    | `pillow`                       | `ffmpeg` for animated/video frames.                                                                                                                                                                        |
| Audio / video             | `ffmpeg` (CLI)                 | Transcode, trim, extract frames. Don't shell out to a Python wrapper.                                                                                                                                      |
| SQLite                    | stdlib `sqlite3`               | Or the `sqlite3` CLI.                                                                                                                                                                                      |
| HTTP                      | `requests`                     | `httpx` if you need async.                                                                                                                                                                                 |
| HTML scraping             | `beautifulsoup4`               | Prefer the `web_scrape` action first — it handles auth-walled sites.                                                                                                                                       |
| Calendar                  | `icalendar`                    |                                                                                                                                                                                                            |
| 3D / CAD                  | `trimesh`                      | `cadquery` for parametric STEP work.                                                                                                                                                                       |
