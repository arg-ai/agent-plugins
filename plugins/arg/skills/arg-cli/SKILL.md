---
name: arg-cli
version: "1.5.1"
description: Access method for Arg file operations via the `arg` command-line tool — direct commands (cat, ls, grep, upload, download, mv, rm), sandbox `exec`, a local `mcp` stdio server, `arg mount` (two-way workspace sync), and opt-in native renderers for .video/.design/.daw/.psd files (`arg {type} render`). Works headlessly with an API key (ARG_API_KEY) for CI/agents. Load this when the arg CLI is installed and no MCP connection is active. Format/schema knowledge lives in arg-files and the arg-file-* skills; this skill is only the how-to-read-and-write layer.
---

# Arg access: `arg` CLI

The `arg` CLI wraps Arg's REST API and is the single binary behind **two ways to reach a workspace**: a mounted filesystem (`arg mount`, preferred) and direct file commands. (Use `arg-mcp` instead when Arg is connected as an MCP server.)

**Setup:** `arg login` (OAuth) → `arg orgs switch <slug-or-id>` → `arg workspace switch <name>`. Add `--json` for machine-readable output (or `--ndjson` for one object per line on lists; `--jq <program>` / `--fields <a,b>` to project the JSON, like `gh --jq`); `--quiet`, `-v`, `--no-color` also available.

**Headless / CI / agents:** skip the browser login. Create an API key at `arg.ai/platform/api-keys` and set `ARG_API_KEY` (or pass `--api-key`) — it authenticates **every** command and needs no OS keychain. With a key, set `ARG_ACTIVE_ORG=<org-id>` (and `ARG_WORKSPACE=<id>` or `--workspace`) for context, since `whoami`/`orgs` are user-session-only.

Beyond file CRUD: `arg <type> render` (export `.video`/`.design`/`.psd`/`.daw` files to local disk — see **Native renderers** below), `arg action` (list/run built-in actions — see `arg-actions`), `arg exec -- <cmd>` (run a bash command in the workspace sandbox; Python via `arg exec -- python3 …`), `arg mcp` (run a local stdio MCP server so an MCP host can use the workspace), `arg automation deploy <path>` (deploy an automation file), and `arg init` / `arg skills` (install the Arg skill bundle into the current project for your coding harness).

**Discovering Arg's skills without the CLI:** the same bundle is published at two well-known endpoints, so any agent that speaks either convention can find and install it. `https://arg.ai/.well-known/skills/index.json` is the `vercel-labs/skills-handler` format (what `hermes skills install --source well-known` reads; `SKILL.md` is served with frontmatter intact at `/.well-known/skills/<name>/SKILL.md`). `https://arg.ai/.well-known/agent-skills/index.json` is Cloudflare's Agent Skills Discovery v0.2.0 format, which adds a sha256 digest per skill.

## Native renderers (`arg <type> render`)

Export workspace documents to local files using the same web exporters the editor uses — no secondary renderer to keep in sync. All four types share one provisioned headless browser + ffmpeg install (`arg <type> render install`).

| Command                           | Input            | Output                                      | Key flags                                                                                      |
| --------------------------------- | ---------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `arg video render <path.video>`   | `.video` NLE     | mp4/mov/webm/gif/mkv                        | `--format`, `-o`                                                                               |
| `arg design render <path.design>` | `.design` canvas | svg/png/jpg (or .zip for `--all-artboards`) | `--format`, `--scale`, `--quality`, `--artboard`, `--all-artboards`, `--color-profile`         |
| `arg psd render <path.psd>`       | `.psd` Photoshop | png/jpg/webp                                | `--format`, `--quality`, `--scale`, `--background`                                             |
| `arg daw render <path.daw>`       | `.daw` session   | wav/mp3/flac/aac/ogg/opus                   | `--format`, `--sample-rate`, `--channels`, `--bitrate`, `--bit-depth`, `--normalize`, `--tail` |

`<path>` accepts a local file, a bare workspace path, or an `arg://` / `arg.ai` URL. Run `arg <type> render install` once to provision the headless browser and ffmpeg (shared across all types).

**vs. the cloud `render_*` actions.** The same exporters back the `render_video` / `render_design` / `render_psd` / `render_daw` actions, which need no local install — but they run in a memory-bounded browser session that returns the whole file in one piece, so `render_video` is capped at ~2 min / ~25 MB (about 1 min at 1080p) and `render_daw` at ~2.5 min of WAV, and neither can produce an ffmpeg container (mp4/mov/gif/mkv, mp3/flac/aac/ogg/opus). Use the CLI for anything longer, larger, or in a transcoded format — it streams to disk and has no cap.

## Preferred: mount as a filesystem (`arg mount`)

`arg mount [flags] -- <harness> [harness args...]` mounts the active workspace as a **local directory with two-way sync**, then launches your coding harness inside it. From there the workspace is just files on disk, so **use your harness's own native tools directly on the mounted paths** — no Arg-specific verbs, no base64. Edits sync back to Arg automatically.

| Operation           | How                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Create / update** | native Write / Edit / MultiEdit on the path                                                  |
| **Read / search**   | native Read / Grep / Glob                                                                    |
| **Delete / move**   | `rm` / `mv` / `cp` / `mkdir` (bash)                                                          |
| **Run a generator** | run it **locally** (`python-pptx`, `sqlite3`, `ffmpeg`, Pillow), writing to the mounted path |

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

### Limits of the direct commands

- There is **no in-place `edit`** command — `upload` replaces _whole files_.
- **To edit a file:** `arg download` it → edit it locally → `arg upload` it back to the same path. For granular or iterative edits this is clumsy — prefer a **mount** (`arg mount`, above).
- **Run a generator** (`python-pptx`, `sqlite3`, `ffmpeg`, …): either build the file **locally** then `arg upload` it, or run it in the sandbox with `arg exec -- python3 …`.
- **Binary files** are handled natively by `upload`/`download` (multipart, resumable) — no base64.

If neither mode is available, fall back to `arg-mcp`.
