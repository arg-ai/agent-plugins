---
name: arg-mcp
description: Access method for Arg file CRUD over the MCP server (read_file, write_file, edit_file, multi_edit, grep, run_bash, upload_file, download_file). Load this when Arg is connected over MCP. Format/schema knowledge lives in arg-core and the arg-file-* skills; this skill is only the how-to-read-and-write layer.
---

# Arg access: MCP

Use when Arg is connected as an MCP server — remote, OAuth, `https://api.arg.ai/mcp`. (See `arg-core` for choosing between MCP / CLI / FUSE.)

| Operation | Tool(s) |
| --- | --- |
| **Create** | `write_file` (UTF‑8 text/JSON) · `upload_file` with `encoding: "base64"` (binary) |
| **Read** | `read_file` (line `offset`/`limit`) · `download_file` (binary → base64 blob) · `grep` |
| **Update** | `edit_file` / `multi_edit` (targeted string replacements — preferred on large files) · `write_file` (full overwrite) |
| **Delete / move** | `run_bash` (`rm` / `mv`) — no dedicated tool |
| **List / search** | `grep` · `run_bash` (`ls` / `find`) |
| **Run a generator** | `run_bash` — executes in the **remote Arg workspace sandbox**; the file it writes lands directly in the workspace (e.g. `python-pptx`, `sqlite3`, `ffmpeg`, Pillow) |

## Notes

- **Endpoints:** the **organization** endpoint adds a required `workspace_id` to every tool — call `list_workspaces` to discover ids. The **workspace** endpoint `/mcp/{workspace_id}` omits it.
- **Binary formats** (image/video/audio/pptx/xlsx/sqlite): you cannot `write_file` them. Create with `upload_file` (base64) or generate with `run_bash`; read with `download_file`.
- **Always `read_file` first** before an edit. Prefer `edit_file`/`multi_edit` for big files; `write_file` overwrites the whole file.
- Other useful tools: `browse_url`, `screenshot_url`, `extract_webpage_data`, `comment_on_file`, `deploy_server`/`list_servers`/`delete_server`.
