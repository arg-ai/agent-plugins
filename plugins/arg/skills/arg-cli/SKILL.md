---
name: arg-cli
description: Access method for Arg via the `arg` command-line tool - a workspace-aware terminal agent (`arg agent`), launching the user's own Claude Code, Codex, Pi, Hermes Agent, or OpenClaw with temporary Arg integration, direct file commands, sandbox `exec`, a local `mcp` stdio server, `arg mount`, local coding-agent import, site hosting, and native renderers. Works headlessly with an API key (ARG_API_KEY) for CI/agents. Load this when the arg CLI is installed and no MCP connection is active. Format/schema knowledge lives in arg-files and the arg-file-* skills; this skill is only the access layer.
metadata:
  version: "1.14.1"
---

# Arg access: `arg` CLI

The `arg` CLI wraps Arg's REST API and provides three ways to work with a workspace: a ready-to-use terminal agent (`arg agent`), a mounted filesystem (`arg mount`), and direct file commands. Use `arg-mcp` instead when Arg is already connected as an MCP server.

**Setup:** `arg login` (OAuth) → `arg orgs switch <slug-or-id>` → `arg workspace switch <name>`. Add `--json` for machine-readable output (or `--ndjson` for one object per line on lists; `--jq <program>` / `--fields <a,b>` to project the JSON, like `gh --jq`); `--quiet`, `-v`, `--no-color` also available.

**Workspace management:** `arg workspace list` lists the active org's workspaces, `arg workspace create <name>` creates and selects one (add `--visibility <org|private|restricted>`, default `org`, and `--region <enam|wnam|weur|eeur|apac|oc>`, default your organization's region; it never prompts), `arg workspace switch <id-or-name>` selects an existing one, and `arg workspace current` reports the selection. The interactive workspace picker in `arg mount` and `arg agent --mount` has **Create workspace** at the bottom, asks for name, visibility, and storage region, and remembers the completed selection.

**Headless / CI / agents:** skip the browser login. Create an API key at `arg.ai/platform/api-keys` and set `ARG_API_KEY` (or pass `--api-key`) — it authenticates **every** command and needs no OS keychain. With a key, set `ARG_ACTIVE_ORG=<org-id>` (and `ARG_WORKSPACE=<id>` or `--workspace`) for context, since `orgs` is user-session-only. `arg whoami` does work under a key - it reports the principal the key resolves to (service account or creating user) and the org it's bound to.

Beyond file CRUD: `arg agent [message]` (start a workspace-aware terminal chat with live MCP context and skills), `arg claude` / `arg codex` / `arg pi` / `arg hermes` / `arg claw` (launch the user's own local harness in the current directory with temporary Arg skills and MCP - see below), `arg <type> render` (export `.video`/`.design`/`.psd`/`.daw` files to local disk - see **Native renderers** below), `arg action` (list/run built-in actions - see `arg-actions`), `arg exec -- <cmd>` (run a bash command in the workspace sandbox; Python via `arg exec -- python3 …`), `arg mcp` (run a local stdio MCP server so an MCP host can use the workspace), `arg automation deploy <path>` (deploy an automation file), `arg onboard` (import a local coding-agent setup - Claude Code, Cursor, Copilot, Gemini - into a workspace, see below), `arg sites deploy` (deploy a local folder as a hosted site, see below), `arg share create <path>` (mint a public, sign-in-free link and print the URL that serves the file's bytes - see below), and `arg init` / `arg skills` (read or install Arg skill bundles; add `--scope user` to install into `~/.claude/skills/` so every project on the machine sees them).

**Notify a person:** `arg notify [recipient...] <target-url>` sends a notification that opens an Arg file, folder, chat, or Action run. Recipients accept `me`, user ids, and emails; omit them to send to yourself. Add repeatable `--channel ios|email|in-app` to narrow delivery, or omit it for all channels. Recipient preferences still apply. `--title` overrides the inferred title and `--body` adds detail.

## Share a file outside Arg (`arg share`)

Every ordinary Arg URL for a file needs a sign-in, so it is useless to an outside recipient and can never render as an image. `arg share create <path>` mints a public one and prints the URL that serves the file's **bytes** on stdout:

```bash
arg share create demo.mp4 --expires-hours 0     # a link that never expires
```

That bytes URL (`/api/share/<id>/view`) is the one an image proxy can fetch, so it is what a Markdown image in a GitHub PR body, a Slack unfurl, or an `<img>` needs. Pass `--expires-hours 0` whenever the link goes somewhere durable - the default is 24 hours, which leaves a dead link behind. Other flags mirror the API: `--max-downloads`, `--password`, `--snapshot`, `--allow-edit`, `--no-comments`, `--include-references` (pass this when sharing a document that embeds other workspace files, or the recipient sees placeholders).

Some share kinds serve no single byte stream - a folder link, a booking link, a response-collecting `.form` - and the command says so instead of printing a URL. A `--password` link is fetchable only with `?password=` appended, which an image proxy cannot supply.

`arg share list` shows what is currently exposed (omit `--path` for that question; the filter matches a path exactly, so a folder does not cover the files inside it). `arg share rm <share-id>` revokes one, though it cannot un-send bytes a proxy already cached.

The link is public with no sign-in: treat creating one as publishing, and don't do it to anything carrying customer data or private work unless you were asked to.

## Terminal agent (`arg agent`)

Use `arg agent` when the user wants an interactive Arg agent without choosing or configuring a separate coding harness:

```bash
arg agent
arg agent "Summarize this workspace"
arg agent -w "Q3 Report" "Update the executive summary"
arg agent --yolo "Run the local tests and fix failures"
```

The command selects the active workspace unless `-w` / `--workspace` overrides it. Before Pi starts, it connects to the workspace MCP server and appends the server guidance, live bundled plus workspace skill catalog, and root `CLAUDE.md` or `AGENTS.md` instructions to the CLI's base prompt. Bundled skills load as a native Pi package from the public `git:github.com/arg-ai/agent-plugins` repository. Workspace skills load through MCP into a private temporary skill directory. Both appear in slash completion as `/skill:<name>`. All file, sandbox, action, comment, and site operations go through the authenticated MCP connection.

The terminal header identifies the authenticated user, active organization, selected workspace, and whether local tools are enabled. Arg owns the embedded runtime's updates, so Pi's standalone changelog and package-update prompts are suppressed.

No separate agent-context REST route is required. Missing root instruction files and older MCP servers without optional context tools do not prevent startup. Authentication, workspace access, and MCP connection failures still stop the command.

The Pi terminal UI is an implementation detail. By default, `arg agent` disables Pi's local built-in tools, extensions, prompts, ambient skills, and context discovery. The explicit public Arg package and active workspace skills remain enabled. Never tell the user to place files in the shell's current directory in the default mode. Durable work belongs in the selected Arg workspace and is performed through the exposed workspace tools.

`arg agent --yolo` is the explicit local-access mode: it enables Pi's unrestricted built-in file and shell tools, starts in the caller's current directory, and keeps the selected Arg workspace tools connected. It is not an OS sandbox and runs with the user's normal permissions. Local extensions, prompts, ambient skills, and context discovery remain disabled. Use it only when the user asks the terminal agent to operate on the local project.

Node.js `22.19.0+`, npm, and GitHub access are required only for `arg agent`; its exact Pi and MCP packages are downloaded through npm, and the public Arg Pi package is cached and refreshed through Git. The command is interactive and does not support Arg's JSON/NDJSON/projection flags.

**Read a bundled skill without installing it:** use `arg skills get <name>` to print its exact, hash-verified `SKILL.md` to stdout. For progressive loading, run `arg skills files <name>` and then `arg skills get <name> <relative-path>` for only the support file you need. `arg skills get <name> --full` returns the complete bundle as JSON, with UTF-8 text inline and binary files base64-encoded. These commands write nothing to the project; each in-memory file is capped at 16 MiB and a full bundle at 64 MiB.

**Discovering Arg's skills without the CLI:** the same bundle is published at two well-known endpoints, so any agent that speaks either convention can find and install it. `https://arg.ai/.well-known/skills/index.json` is the `vercel-labs/skills-handler` format (what `hermes skills install --source well-known` reads; `SKILL.md` is served with frontmatter intact at `/.well-known/skills/<name>/SKILL.md`). `https://arg.ai/.well-known/agent-skills/index.json` is Cloudflare's Agent Skills Discovery v0.2.0 format, which adds a sha256 digest per skill.

## Launch a local coding harness

`arg claude`, `arg codex`, `arg pi`, `arg hermes`, and `arg claw` launch the **user's own** Claude Code, Codex, Pi, Hermes Agent, or OpenClaw binary in the current directory with current Arg skills and an `arg` MCP server for the selected workspace.

Pick it when the user wants to keep working in their own repo with their own harness and just needs it connected to Arg. Pick `arg agent` when they want an Arg agent with no harness setup at all, and `arg mount` when the **workspace** should be the working directory - `arg claude` mounts nothing and syncs no files.

```bash
arg claude
arg claude --arg-workspace "Q3 Planning"   # default: the active workspace
arg codex --arg-org=acme                   # org-scoped MCP server instead
arg pi --arg-system-prompt --continue       # add Arg product context for this session
arg hermes --arg-no-sync                   # launch without temporary integration
arg claw --arg-sync-only                   # validate setup and exit
```

Only the `--arg-*` options are Arg's, and they must come first: parsing stops at the first argument Arg does not recognise, and a bare `--` ends it too. Everything else, `-h`/`--help` included, is passed to the harness untouched, and the harness's exit code is returned. Arg's global flags (`--json`, `--quiet`, …) are not available here. `--arg-org` and `--arg-workspace` are mutually exclusive, and `--arg-org` needs the equals form to take a value. `--arg-system-prompt` opts the child into a short arg.ai description and guidance to use Arg for artifacts and internal apps; it is session-only and cannot be combined with `--arg-no-sync`.

Arg stages the integration under a private temporary directory, passes it through invocation-only flags or environment overrides, and removes it after the harness exits. It never installs skills or edits project and user harness configuration, so there is no install-location picker on these commands. A failed preparation is a warning and the harness still starts - except under `--arg-sync-only`, where it is an error. With no workspace selected the MCP server uses the active org; with neither, Arg loads the temporary skills, warns, and launches without MCP.

## Import a local coding-agent setup (`arg onboard`)

`arg onboard` scans this machine for coding-agent state and plans (or applies) its transfer into the active workspace. It is safe to run unattended: the default is a **read-only dry-run report** and `--json` emits the same plan as machine output. It reads `~/.claude/CLAUDE.md`; project context files `./CLAUDE.md`, `./AGENTS.md`, `./GEMINI.md`, `./.github/copilot-instructions.md`, `./.cursorrules`, `./.cursor/rules/*.mdc`, and nested `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` in monorepo subdirectories; skill bundles under `./.claude/skills/` and `~/.claude/skills/` (the whole bundle, including `scripts/` and `references/`); subagents under `./.claude/agents/` and `~/.claude/agents/`; slash commands under `./.claude/commands/` and `~/.claude/commands/`; and MCP servers in `./.mcp.json` / `~/.claude.json` (including the local-scope per-project entries).

- `arg onboard` — dry-run report grouped as **Transfers / Transfers with changes / Skipped / Needs manual**.
- `arg onboard --apply` — writes the plan: context files → workspace-root `AGENTS.md` (multiple sources merged with provenance headers; `CLAUDE.local.md` never transfers and is reported as skipped); portable skills → `.skills/<name>/` with their full bundle; subagents → `.agents/<name>.md`; slash commands → converted into skills at `.skills/<name>/SKILL.md`. A destination that already exists in the workspace is never silently overwritten: identical content is reported as already present, different content moves to **Needs manual** - pass `--force` to overwrite explicitly.
- `arg onboard --apply --install-skills` — additionally installs the four core arg skills (arg-cli, arg-files, arg-overview, arg-sites) into the project's own skills dir (offline), so the machine's coding agents know the arg CLI from then on. Opt-in; install failures are warnings, never a failed exit. Add the rest any time with `arg init` (full bundle; `--minimal` for just the core) or `arg skills install <name>`.
- Flags: `--workspace <id|name>` (or `ARG_WORKSPACE`), `--project <dir>` (default: cwd), `--apply`, `--force`, `--install-skills`, plus the global `--json`.
- The report also flags a **deploy candidate** when the project has a root `index.html` or a `package.json` build script (`deploy_candidate` in JSON) — follow it with `arg sites deploy <dir>` to finish onboarding with a live site.

**Security:** secrets are never transferred. MCP servers are only ever listed as connector candidates you add by hand — env values, secret-looking args, and URL tokens are redacted from the output. A skill, agent, or command that references local-machine paths (`~/…`, `/Users/…`, `/opt/homebrew/…`) is left under **Needs manual** rather than transferred.

## Deploy a local project as a hosted site (`arg sites`)

`arg sites deploy [dir]` is one command from a local folder to a live URL (default dir: `.`):

1. Detects the framework from `package.json` (`static`, `vite`, `astro`, `next`, `worker` — same precedence as the workspace agent's `deploy_site` tool) and derives the site slug from the folder name. Override with `--framework`, `--slug`, `--name`; `--public` requests a public site (requires the org opt-in, otherwise 403).
2. Uploads the project into the workspace folder `/sites/<slug>/`, honouring the project's root `.gitignore` plus standard ignores (`node_modules`, `__pycache__`). **Every dot-prefixed file and folder stays on the machine** - so `.env`, `.mcp.json`, `.npmrc`, `.netrc`, `.git`, `.claude` and anything else beginning with a dot never upload; a root `.well-known/` is the single exception, since the web serves it. A `.gitignore` cannot re-admit a dotfile. Re-deploys replace that folder's contents.
3. Builds with the durable promote-on-success flag, polls up to `--timeout` (default 5m), and prints the openable URL on stdout — the tokenized capability link for private (workspace-access) sites, the bare URL for public ones. A build still running at the timeout is not a failure: it finishes and goes live on its own; check `arg sites status <slug>`.

`arg sites list` shows the workspace's sites; `arg sites status <slug>` shows version states and the openable URL; `arg sites delete <slug>` takes a site offline and removes its versions (preview with `--dry-run`, not reversible). Deleting the uploaded sources with `arg rm` does **not** unpublish a built version - use `arg sites delete` for that. All work headlessly with `ARG_API_KEY`.

## Native renderers (`arg <type> render`)

Export workspace documents to local files using the same web exporters the editor uses — no secondary renderer to keep in sync. All four types share one provisioned headless browser + ffmpeg install (`arg <type> render install`).

| Command                           | Input            | Output                                      | Key flags                                                                                      |
| --------------------------------- | ---------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `arg video render <path.video>`   | `.video` NLE     | mp4/mov/webm/gif/mkv                        | `--format`, `-o`                                                                               |
| `arg design render <path.design>` | `.design` canvas | svg/png/jpg (or .zip for `--all-artboards`) | `--format`, `--scale`, `--quality`, `--artboard`, `--all-artboards`, `--color-profile`         |
| `arg psd render <path.psd>`       | `.psd` Photoshop | png/jpg/webp                                | `--format`, `--quality`, `--scale`, `--background`                                             |
| `arg daw render <path.daw>`       | `.daw` session   | wav/mp3/flac/aac/ogg/opus                   | `--format`, `--sample-rate`, `--channels`, `--bitrate`, `--bit-depth`, `--normalize`, `--tail` |

`<path>` accepts a local file, a bare workspace path, or an `arg://` / `arg.ai` URL. Run `arg <type> render install` once to provision the headless browser and ffmpeg (shared across all types).

For dynamic `.design` or `.video` output, fetch live data before rendering and materialize it into text objects or clips selected by a unique, stable name. Object and clip ids are generated by the editors and cannot be set, so rename the layer or clip and match on `.name`: a `.design` keys objects by id in an `objects` map (update named entries in place with jq `with_entries`, which never fabricates a new key), while a `.video` stores clips in track arrays (`select` them by name). The standalone harness has no signed-in Arg application/API session: local files render offline and resolve linked assets beside the document, while rendering an uploaded workspace path stages its linked workspace assets. Built-in `.video` stock and weather clips currently draw their error state in the headless harness, so materialize those values as text or a static image too.

**vs. the cloud `render_*` actions.** The same exporters back the `render_video` / `render_design` / `render_psd` / `render_daw` actions, which need no local install. `render_video` runs on GPU containers with the timeline sharded across them, so it has no length cap and outputs mp4/mov/mkv/webm — prefer it unless you want the file on the local machine. The others still run in a memory-bounded browser session that returns the whole file in one piece, so `render_daw` is capped at ~2.5 min of WAV and cannot produce an ffmpeg container (mp3/flac/aac/ogg/opus); use the CLI for anything longer, larger, or in a transcoded format.

## Preferred: mount as a filesystem (`arg mount`)

`arg mount [flags] -- <harness> [harness args...]` mounts the active workspace as a **local directory with two-way sync**, then launches your coding harness inside it. From there the workspace is just files on disk, so **use your harness's own native tools directly on the mounted paths** — no Arg-specific verbs, no base64. Edits sync back to Arg automatically.

The mount prepends that disk-first rule to a local `AGENTS.md` or `CLAUDE.md`, creating the harness's context file when needed. The generated block is mount-only and is stripped from uploads; edits you make around it still sync to the workspace.

| Operation           | How                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Create / update** | native Write / Edit / MultiEdit on the path                                                 |
| **Read / search**   | native Read / Grep / Glob                                                                   |
| **Delete / move**   | `rm` / `mv` / `cp` / `mkdir` (bash)                                                         |
| **Run a generator** | run it **locally** (`sqlite3`, `ffmpeg`, Pillow, `xlsxwriter`), writing to the mounted path |

This is the **highest-fidelity, lowest-friction** mode: everything an agent already does with local files works unchanged, including binary files (read/write them like any local file). **Always read a file before editing it**, same as any local edit. The default `--mode watch` downloads the workspace and file-watches both sides (remote changes polled every few seconds) — no FUSE needed, works on macOS, Linux, and Windows. `--mode fuse` is an optional lazy on-touch mount that needs a FUSE provider (FUSE-T/macFUSE, libfuse2, or WinFsp). Local edits sync shortly after write; very large files may take a moment - resolve paths relative to the mount root. **Ignores (watch mode):** `.gitignore` files in the mounted tree are honored automatically - build artifacts, `.env`, coverage, and anything else the repo gitignores are excluded from sync and stay local-only. Pass `--no-gitignore` to opt out; add extra patterns with a `.argignore` file (`--ignore-file` to point elsewhere). `--mode fuse` still relies on defaults and `.argignore` only (lazy materialization means `.gitignore` files aren't loaded up front).

## Fallback: direct file commands

When you can't mount (or you only need a one-shot read/write), use the command verbs:

| Operation                        | Command                                        |
| -------------------------------- | ---------------------------------------------- |
| **Read**                         | `arg cat <path>`                               |
| **List**                         | `arg ls [path]` (`-R` recursive)               |
| **Search**                       | `arg grep "<pattern>" [path] --include '*.ts'` |
| **Create / update (whole file)** | `arg upload <local-path> --to <remote-path>`   |
| **Download**                     | `arg download <remote-path> --to <local-path>` |
| **Move / rename**                | `arg mv <source>... <destination>`             |
| **Delete**                       | `arg rm <path>...` (`-r` for folders)          |

`rm`/`mv` are destructive: preview first with `--dry-run` (they never prompt; `-y`/`--yes` is accepted but reserved). To run a generator or arbitrary shell in the workspace, use `arg exec -- <cmd>` (sandbox) instead of building locally.

Every successful `arg upload` result includes its full, openable Arg URL. In JSON output, read `summary.uploaded[].url`; the human-readable table exposes the same value in its `URL` column. Surface that URL directly instead of making a separate lookup after uploading.

### Limits of the direct commands

- There is **no in-place `edit`** command — `upload` replaces _whole files_.
- **To edit a file:** `arg download` it → edit it locally → `arg upload` it back to the same path. For granular or iterative edits this is clumsy — prefer a **mount** (`arg mount`, above).
- **Run a generator** (`sqlite3`, `ffmpeg`, Pillow, …): either build the file **locally** then `arg upload` it, or run it in the sandbox with `arg exec -- python3 …`. The sandbox ships `requests`, `pandas`, `numpy`, `scipy`, `matplotlib`, `pillow`, `pillow-heif`, `beautifulsoup4`, `pyyaml`, `openpyxl`, `xlsxwriter`, `python-docx`, `python-pptx`, `pymupdf`, `pypdf`, `pypdfium2`, `pdfplumber`, `opencv-python-headless` and `imageio-ffmpeg` preinstalled (`ffmpeg` and `ffprobe` are on PATH); for anything else, `arg exec -- pip install <pkg> -q`. `arg-files` lists the recommended library per format. The sandbox container is ephemeral (~10 minutes idle / cold start wipes local installs and `/tmp`); reinstall is normal. Prefer `--sandbox <name>` only for intentional named reuse while warm - omit for the default path, and do not use the name `default`. Keep venvs/`node_modules` in `/tmp` or `$HOME` for the session, not in the workspace tree.
- **Binary files** are handled natively by `upload`/`download` (multipart, resumable) — no base64.

If neither mode is available, fall back to `arg-mcp`.
