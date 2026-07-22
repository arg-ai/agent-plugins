---
name: arg-ui
version: "1.0.2"
description: Feature overview of the Arg web app and desktop (macOS/Windows/Linux) app — what a user or agent can do in each surface, and what the desktop app adds on top of the web app. Load this to explain Arg's product functionality, decide which surface a capability lives on, or point a user at the right feature. For file CRUD, load arg-files plus the access-method and arg-file-* skills instead.
---

# Arg apps — web & desktop

Arg is a collaborative cloud file system and workspace for teams and AI agents. It combines a Drive-like file manager, an AI chat/agent interface, sandboxed code execution, and a growing set of native document editors. The same account, organizations, and workspaces are shared across every surface.

- Website: https://arg.ai
- Surfaces: **web app** (any browser), **desktop app** (macOS/Windows/Linux, Electron), plus iOS/Android mobile and a `arg` CLI.

> This skill is a **product feature map**, not a how-to for file operations. To create/read/update files, load `arg-files` first (it routes you to `arg-mcp` / `arg-cli` and the per-format `arg-file-*` skills).

## Core model (shared by every surface)

- **Organizations → workspaces → files.** A user belongs to one or more organizations; each org contains workspaces; each workspace is a file tree. Files and chat history persist and build up over time.
- **Files are the unit of work.** Users upload or create files, agents operate on them, and outputs are files that stay in the workspace.
- **Roles & sharing.** Access is controlled per org, per workspace, and per file (invite people, share links, set permissions). Templates let you publish and clone reusable workspace setups.
- **Themes & i18n.** Three themes — `light`, `dark`, and `focus` (default) — and multiple UI languages, consistent across web, desktop, and mobile.

## Web app

The browser app is the full-featured surface. Main areas:

### Files

- **Workspace browser** — Drive-like grid/list view with folders, upload, drag-and-drop, multi-select bulk actions (move, delete), rename, bookmarks, and Finder/Explorer-style keyboard navigation.
- **File tree sidebar** — fast cached navigation with live updates when files change.
- **Sharing & collaboration** — share files/workspaces with people or links, per-file comments, version history, and an audit log.
- **Templates** — browse the public templates store, your organization's catalog, and your managed templates; clone a template into a new workspace.

### Editors (native, in-browser)

Arg opens and edits many formats directly in the browser, including Arg's own agent-friendly formats:

- **Documents** — `.md` / `.mdx` (rich JSX components: callouts, toggles, embeds, columns, tabs, math, mentions, recordings), `.txt`, diary/journal.
- **Canvas & design** — `.design` (vector canvas), `.svg`, `.whiteboard` (infinite canvas), `.mermaid` diagrams, `.shadertoy`/GLSL shaders.
- **Productivity** — `.kanban` boards, `.form` surveys, spreadsheets (`.csv`, `.xlsx`), `.pptx` decks, calendars, maps (`.kml`).
- **Media** — image, audio, and video viewers plus a multi-track `.video` NLE timeline; 3D models and Gaussian splats.
- **Code** — syntax-aware viewing/editing for most languages, with sandboxed run for Python/Bash, and `.server` apps that expose a running process on a public URL.

See `arg-files` for the full format list and which formats have a dedicated skill.

### Chat & agents

- **AI chat** with full **file-context awareness** — the agent can read, create, and edit files in the workspace and run code in an isolated sandbox container.
- **Composer power features** — `@` mentions to reference workspace files/folders, `/` to invoke workspace skills (`.skills/`), attachments, screen capture (screenshot or screen recording), model + reasoning selectors, and per-workspace toggles including a read-only (inspection-only) mode.
- **Skills & subagents** — workspaces can carry reusable `.skills/<name>/SKILL.md` and `.agents/<name>.md` that the agent picks up automatically.

### Automations, actions & connectors

- **Automations / workflows** — visual `.automation` files and GitHub-Actions-style `.arg/workflows/*.yml` that run on triggers/schedules; deployment and run history are visible in the app.
- **Actions & run status** — long-running work (agent turns, media generation, automations) surfaces live status, queue position, and progress.
- **Connectors (BYO MCP)** — connect external MCP servers so their tools become available to the agent inside a workspace.
- **Media generation** — image/video/3D/audio generation with a browsable history.

### Recordings

- **Meeting/audio recordings** — capture mic (and optional system audio), transcribe, and generate an AI summary into an `.mdx` note (the `Recording` block). Screen capture (screenshot / screen recording) is available from the chat composer.

### Account & organization settings

- **User settings** (`/settings`) and **org settings** (`/org-settings`) as full, bookmarkable multi-tab pages: profile/appearance, members & roles, invitations, workspaces, billing/usage, API keys & service accounts, connectors, enterprise controls.

## Desktop app

The desktop app **reuses the entire web frontend** — every editor, the file browser, chat, and settings behave the same — and then adds native capabilities the browser can't offer. Pick the desktop app when you need local-filesystem integration, always-on notifications, or local CLI agents.

Desktop-only functionality:

- **Local-folder workspaces** — open any folder on disk as an offline workspace (no cloud round-trip). "Open in Arg" shell integration (macOS Finder / Windows Explorer context menu) registers a folder or file and opens it directly.
- **Local folder sync** — keep a local folder and an Arg workspace in sync, with per-pair direction (two-way / local→Arg / Arg→local) and selectable change types (create / update / delete). Owned by the app; the file watcher runs natively.
- **Drag & drop with the OS** — drag workspace files _out_ to Finder/Explorer (materialized to real local paths) and drop OS files/folders _in_; Cmd/Ctrl+C a workspace file to paste it into other apps. Drag files between two desktop app windows to copy across workspaces.
- **Local CLI chat agents** — besides the normal Arg cloud agent, the docked chat can run a locally-installed **Codex** or **Claude Code** agent against the workspace (via the Arg MCP workspace tools, or directly on a local folder). It also surfaces those CLIs' own on-disk sessions in a "Local chats" list you can reopen and resume.
- **Native notifications** — OS toasts and a dock/taskbar unread badge that keep working while the window is minimized or closed to tray (as long as the app is running), plus the in-app notification bell.
- **Meeting detection & recorder** — an over-everything "Meeting detected" prompt that starts a recording note in one click, and a native screen recorder (WebM-first capture, honors the selected output format).
- **Native context menu & spellcheck** — right-click spelling suggestions, "Add to Dictionary", and cut/copy/paste inside the reused editors and composer.
- **Local provider settings** — a Providers settings tab for local integrations (e.g. Codex connection checks and a "store history in the cloud" toggle).

## Choosing a surface

| Need                                                                | Surface             |
| ------------------------------------------------------------------- | ------------------- |
| Anything file/editor/chat/automation related, zero install          | **Web**             |
| Local folder as a workspace, folder sync, drag to/from Finder       | **Desktop**         |
| Local Codex / Claude Code agent against a workspace or local folder | **Desktop**         |
| Always-on OS notifications, meeting detection, tray quick-switch    | **Desktop**         |
| Scriptable file CRUD / sync from a terminal                         | **CLI** (`arg-cli`) |
| Programmatic agent access to a workspace                            | **MCP** (`arg-mcp`) |

## Related skills

- `arg-overview` — the whole-product map: what Arg is, every offering, plans, and onboarding guidance.
- `arg-files` — start here for any file operation; routes to the access-method and format skills.
- `arg-cli`, `arg-mcp` — the two ways to do file CRUD programmatically (`arg-cli` covers both direct commands and an `arg mount` FUSE filesystem).
- `arg-skills-and-agents` — author reusable workspace skills and subagents.
- `arg-actions` — find and run Arg's built-in actions (media generation and editing, transcription, screenshots, scraping, html→pdf, and more).
