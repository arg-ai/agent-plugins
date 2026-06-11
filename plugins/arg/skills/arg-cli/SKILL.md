---
name: arg-cli
description: Access method for Arg file operations via the `arg` command-line tool (cat, ls, grep, upload, download, mount). Load this when the arg CLI is installed and no MCP connection or FUSE mount is active. Format/schema knowledge lives in arg-core and the arg-file-* skills; this skill is only the how-to-read-and-write layer.
---

# Arg access: `arg` CLI

The `arg` CLI wraps Arg's REST API. (See `arg-core` for choosing between MCP / CLI / FUSE.)

**Setup:** `arg login` (OAuth) → `arg orgs switch <slug-or-id>` → `arg workspace switch <name>`. Add `--json` for machine-readable output; `--quiet`, `-v`, `--no-color` also available.

| Operation | Command |
| --- | --- |
| **Read** | `arg cat <path>` |
| **List** | `arg ls [path]` (`-R` recursive) |
| **Search** | `arg grep "<pattern>" [path] --include '*.ts'` |
| **Create / update (whole file)** | `arg upload <local-path> --to <remote-path>` |
| **Download** | `arg download <remote-path> --to <local-path>` |

## Important limits

- The CLI has **no in-place `edit`, `rm`, or `mv`** command. It reads and moves *whole files*.
- **To edit a file:** `arg download` it → edit it locally → `arg upload` it back to the same path. For granular or iterative edits this is clumsy — prefer a **FUSE mount** (`arg mount`, see `arg-fuse`) or MCP (`arg-mcp`).
- **To delete or move:** the CLI can't; use a mount (`rm`/`mv` on the mounted path), MCP (`run_bash`), or the web app.
- **Run a generator** (`python-pptx`, `sqlite3`, `ffmpeg`, …): build the file **locally**, then `arg upload` it.
- **Binary files** are handled natively by `upload`/`download` (multipart, resumable) — no base64.
