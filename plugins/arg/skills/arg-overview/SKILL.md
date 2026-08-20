---
name: arg-overview
version: "1.3.1"
description: The map of the Arg (arg.ai) product — what Arg is, every offering (workspace, agent, editors, skills, automations, actions, apps, developer/agent APIs, platform surfaces, plans), who it's for, and which skill or URL to go deeper with. Load this to answer any question about Arg itself ("what is Arg", "can Arg do X", "what does it cost"), to build a get-started or onboarding guide for someone who just signed up, or to orient another agent before it loads a specialist arg-* skill.
---

# Arg overview

**Arg (arg.ai) is one shared workspace where teams and AI agents plan, create, and ship work together.** It pairs a Google-Drive-style file manager with an AI chat agent that has full context of the files: you upload or create files, the agent reads and edits them inline, and everything it produces — docs, decks, spreadsheets, designs, videos, live sites — lands as real, versioned files that humans and agents keep editing together. Tagline: "One workspace, everyone in the loop."

- Website: https://arg.ai · AI-readable site index: https://arg.ai/llms.txt
- Developer docs: https://developers.arg.ai

Three framings of the same platform:

1. **Arg Workspace** (for teams) — files, editors, chat, real-time collaboration.
2. **Arg Filesystem API** (for agents) — the same versioned, attributed filesystem over REST, MCP, and CLI, plus sandboxes, search, artifacts, comments, and notifications.
3. **Arg Loops** (for scale) — work that runs itself: automation workflows fire the workspace on triggers and schedules, and each run builds on the last.

## Core model

- **Organizations → workspaces → files.** A user belongs to organizations; each org holds workspaces; each workspace is a file tree. Files and chat history persist and compound over time.
- **Files are the unit of work.** Every deliverable is a file you own — openable in a purpose-built editor, downloadable, portable (`.mdx`, `.pptx`, `.csv`, `.pdf`, …), never locked in a vendor database.
- **Every write is versioned and attributed** — human or agent — with per-file version history and a workspace-wide activity/audit log.
- **Real-time multiplayer.** People and agents edit the same file simultaneously with live cursors; you watch the agent's edits stream in like a teammate's.
- **Access control everywhere** — per org, per workspace, per file: roles, invitations, share links, and API keys that inherit exactly their principal's permissions.

## The product map

| Offering                       | What it is                                                                                                                                                                                                                                                                                                                | Go deeper                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Files & filesystem**         | Drive-style manager (upload, folders, previews, sharing, bookmarks) on one filesystem served to every surface — web, local mount, sandbox, REST/CLI/MCP                                                                                                                                                                   | `arg-files` (file CRUD), `arg-ui`                  |
| **Editors & native formats**   | Purpose-built editors for every file type: notes (`.md`/`.mdx`), whiteboards, kanban boards, slides (`.html` decks by default, or the `.design` canvas) and PowerPoint (`.pptx`), spreadsheets (`.csv`), PDF, design (`.design`/`.svg`), video NLE (`.video`), DAW (`.daw`), forms, diagrams, 3D/CAD, code, and many more | `arg-files` → `arg-file-*`; `arg-slides` for decks |
| **The agent**                  | Every workspace ships with an AI agent: chats over your files with cited sources, edits inline in every editor, runs Python/Bash in an isolated sandbox, generates media, works long tasks in the background, runs on your choice of frontier model                                                                       | `arg-ui`                                           |
| **Skills & subagents**         | Teach the agent your team's playbooks as plain markdown in `.skills/`; define specialist subagents in `.agents/`. One `.skills/` folder is read by Arg's agent, Claude Code, Cursor, and automations                                                                                                                      | `arg-skills-and-agents`                            |
| **Actions**                    | Built-in operations the agent runs and saves as files: image/video/3D/audio/music generation and editing, transcription, web screenshot and scraping, html→pdf, stock data, connected-service calls                                                                                                                       | `arg-actions`                                      |
| **Automations (Arg Loops)**    | Workflows as files — visual `.automation` canvas or GitHub-Actions-style `.arg/workflows/*.yml` — triggered by schedule, file change, webhook, or manually; every run on the record                                                                                                                                       | `arg-file-automation`                              |
| **Arg Apps**                   | A single `.html` file becomes an internal app (dashboard, CRM, tracker) via the `window.arg` FS SDK - workspace files are its backend. `.server` runs a sandboxed process with Personal, Workspace, or Public access                                                                                                      | `arg-apps`                                         |
| **Forms**                      | Shareable `.form` surveys written in MDX; submissions collect as rows the agent can read and summarize                                                                                                                                                                                                                    | `arg-file-document`                                |
| **Recordings & meeting notes** | Record mic/screen (desktop detects meetings), transcribe, and summarize into structured notes with decisions and action items                                                                                                                                                                                             | `arg-ui`                                           |
| **Enterprise search**          | Ask the workspace anything in plain language — semantic + keyword search across docs, decks, PDFs, images, audio, and video, with cited sources; also an API                                                                                                                                                              | `arg-mcp` (semantic_search), /product/search       |
| **Collaboration & activity**   | Live co-editing, per-file comments and threads, version history, and a filterable audit trail covering UI, API, MCP, agents, and automations                                                                                                                                                                              | `arg-ui`, /product/activity                        |
| **Connectors (BYO MCP)**       | Plug external MCP servers and integrations into a workspace so the agent can act in other systems (Settings → Connectors)                                                                                                                                                                                                 | `arg-ui`                                           |
| **Notifications**              | Reach humans and agents on web, desktop, mobile, and email; agents POST a notification when work finishes or needs review                                                                                                                                                                                                 | /for-agents/notifications                          |

## The agent, in more detail

- **Built-in tools** (toggleable per chat): web browsing, web search, semantic workspace search, the code sandbox, media generation, and MCP connectors — plus opt-in people, stock, and weather data.
- **Any frontier model.** Chat runs on Claude, GPT, Gemini, and more — swap per chat or per workspace; orgs can control which models are allowed. Model catalogs and pass-through prices: https://arg.ai/models/llms and https://arg.ai/models/media.
- **Coding agents.** Claude Code and Codex plug in over MCP (and run locally in the desktop app), drawing down tokens from your own subscription — no separate billing through Arg.
- **ChatGPT-backed Arg chats.** A user can connect a personal ChatGPT subscription in Organization Settings -> Models. Supported OpenAI-model chats then use that subscription from Arg's cloud runtime, with no desktop process required. An organization OpenAI key takes priority when configured.
- **Visual effort dial** — from clean prose to richly designed output.

## Where Arg runs

| Surface                                   | What it adds                                                                                                                                                                                                               | Go deeper  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Web app**                               | The full product in any browser                                                                                                                                                                                            | `arg-ui`   |
| **Desktop** (macOS/Windows/Linux)         | Local-folder workspaces, folder sync, offline access, drag to/from Finder/Explorer, native notifications, meeting detection, local Claude Code/Codex agents, a local MCP server exposing shared folders to external agents | `arg-ui`   |
| **Mobile** (iOS/Android)                  | Chat with file context on the go, snap photos into a workspace, voice prompts, push notifications                                                                                                                          | /mobile    |
| **Browser extension** (Chrome/Edge/Brave) | Workspace side panel on any tab — ask about the page, clip text/screenshots/links into a workspace                                                                                                                         | /extension |
| **CLI** (`arg`)                           | Workspace-aware terminal agent (`arg agent`), file CRUD, uploads/downloads, skill install (`arg init`), and `arg mount` for local workspace sync                                                                           | `arg-cli`  |
| **MCP server**                            | `https://api.arg.ai/mcp` — connect Claude, Codex, Cursor, or any MCP client to a workspace; the desktop app can also host a local loopback MCP server over shared folders (Settings → Agent Access)                        | `arg-mcp`  |
| **REST API**                              | `https://api.arg.ai` — files, search, sandbox, comments, notifications, agents; OpenAPI spec                                                                                                                               | `arg-api`  |

## For developers & external agents

- **Connect over MCP (fastest):** `claude mcp add -t http arg https://api.arg.ai/mcp` — OAuth sign-in, pick a workspace. For headless/CI, create an API key at https://arg.ai/platform/api-keys and use `https://api.arg.ai/mcp/<workspace-id>` with an `x-api-key` header.
- **CLI:** `curl -fsSL https://arg.ai/cli | sh`, then `arg login` → `arg workspace switch` → `arg agent` for terminal chat, or `ls`/`cat`/`grep`/`upload`/`download`/`mount` for direct workflows.
- **Agent-facing APIs:** storage (walk the tree, land outputs as files), search (semantic/keyword, permission-aware, cited), sandbox (isolated Python/Bash with the workspace mounted, streamed output), artifacts (upload + share with expiring/gated links), comments, and notifications. Index: https://arg.ai/llms.txt. Building code against the REST API → `arg-api`.
- **API keys** belong to a user or a service account and inherit that principal's access — no separate scope system to reason about.
- **The `window.arg` FS SDK** turns a previewed `.html` file into a file-backed app — see `arg-apps`.

## Go deeper: which skill to load next

| The question or task is about…                                               | Load                                                              |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Creating/reading/editing files, or which formats exist                       | `arg-files` (routes onward to `arg-file-*` and the access method) |
| Doing file CRUD over MCP or the CLI (direct commands or a local mount)       | `arg-mcp` / `arg-cli`                                             |
| Writing code/integrations against the REST API (`https://api.arg.ai`)        | `arg-api`                                                         |
| A specific format — docs, design, video, DAW, whiteboard, kanban, automation | the matching `arg-file-*` skill (see the table in `arg-files`)    |
| What the web/desktop app can do, feature locations, choosing a surface       | `arg-ui`                                                          |
| Generating/transforming media, transcribing, scraping, screenshots           | `arg-actions`                                                     |
| Building an internal app or web page on workspace files                      | `arg-apps`                                                        |
| Authoring reusable skills or subagents                                       | `arg-skills-and-agents`                                           |
