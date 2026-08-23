---
name: arg-mcp
description: Access method for Arg file CRUD over the MCP server (read_file, write_file, edit_file, multi_edit, grep, semantic_search, run_bash, list_files, move_files, create_upload_session, download_file). Load this when Arg is connected over MCP — the cloud endpoint or the desktop app's local loopback server over shared folders. Format/schema knowledge lives in arg-files and the arg-file-* skills; this skill is only the how-to-read-and-write layer.
metadata:
  version: "1.7.0"
---

# Arg access: MCP

Use when Arg is connected as an MCP server — remote, OAuth, `https://api.arg.ai/mcp`. (Use `arg-cli` instead when MCP isn't connected and the `arg` command-line tool is installed.)

| Operation           | Tool(s)                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Create**          | `write_file` (UTF‑8 text/JSON) · `create_upload_session` (binary/large files — returns part/complete URLs; PUT the raw byte chunks, then POST the parts list)      |
| **Read**            | `read_file` (line `offset`/`limit`) · `download_file` (binary → base64 blob) · `grep`                                                                              |
| **Update**          | `edit_file` / `multi_edit` (targeted string replacements — preferred on large files) · `write_file` (full overwrite)                                               |
| **Move / rename**   | `move_files` (single rename or bulk-move; end `destination_path` with `/` to move into a folder)                                                                   |
| **Delete**          | `run_bash` (`rm`) — no dedicated tool                                                                                                                              |
| **List / search**   | `list_files` (tree listing) · `grep` (exact text/regex) · `semantic_search` (semantic - find files by meaning when exact wording is unknown)                       |
| **Run a generator** | `run_bash` — executes in the **remote Arg workspace sandbox**; the file it writes lands directly in the workspace (e.g. `sqlite3`, `ffmpeg`, Pillow, `xlsxwriter`) |
| **Share publicly**  | `create_share_link` (public, sign-in-free URL for a file or folder) · `list_share_links` · `delete_share_link`                                                     |

## Notes

- **Endpoints:** the **organization** endpoint adds a required `workspace_id` to every tool — call `list_workspaces` to discover ids. The **workspace** endpoint `/mcp/{workspace_id}` omits it.
- **Created-file links:** successful cloud `write_file` results include a full canonical Arg URL. `create_upload_session` includes the same URL in its manifest, and the `completeUrl` response returns it as `url` after the multipart upload finishes.
- **Binary formats** (image/video/audio/pptx/xlsx/sqlite): you cannot `write_file` them. Create with `create_upload_session` (follow the `instructions` in its response) or generate with `run_bash`; read with `download_file`.
- **Always `read_file` first** before an edit. Prefer `edit_file`/`multi_edit` for big files; `write_file` overwrites the whole file.
- **Workspace is network-mounted:** the remote sandbox accesses files over the network, so per-file access is slow and a recursive walk can hang. When using `run_bash`, never run `grep -r`, `find`, or `ls -R` from the workspace root — use `grep`, `list_files`, or `semantic_search` instead, or scope a bash search to a specific subdirectory.
- **Installing packages in the sandbox:** `requests`, `pandas`, `numpy`, `scipy`, `matplotlib`, `pillow`, `pillow-heif`, `beautifulsoup4`, `pyyaml`, `openpyxl`, `xlsxwriter`, `python-docx`, `python-pptx`, `pymupdf`, `pypdf`, `pypdfium2`, `pdfplumber`, `opencv-python-headless` and `imageio-ffmpeg` are preinstalled (`ffmpeg` and `ffprobe` are on PATH) — check before installing, since the user watches every install run. For anything else, `pip install <pkg> -q`. Use `apt-get` only for system binaries, never for a Python package. `arg-files` lists the recommended library per format. Treat reinstall after a cold container as normal and cheap. Keep venvs and `node_modules` under `/tmp` or `$HOME` for the session - never dump a dependency tree onto the workspace mount (network store the user browses; thousands of vendored files slow later bash and pollute search).
- **Sandbox is ephemeral:** after ~10 minutes of inactivity (or any cold start), local state is gone - system pip/apt installs, `/tmp`, cwd, shell exports, background processes. Workspace files on the mount survive. Never assume a warm box from an earlier turn; re-check a package/binary before depending on it. Named `sandbox_id` only shares a container while it is still warm; omit it unless you intentionally need a shared named box, and do not pass the word `default` as a name.
- **`run_bash` shell rules:** a file just created with `write_file` can lag briefly under the mount (lookups are cached) — verify new files with `read_file`, not a `[ -f ... ]` shell poll loop. Never use a bare `exit` in a command: while the container is warm the shell session is reused, so `exit` terminates that shell (losing cwd/env state), not just your command.
- **Semantic search:** `semantic_search` finds files by concept ("the doc about pricing strategy") across text-native formats and Arg documents (`.whiteboard`, `.kanban`, `.automation`, `.design`, `.diary`, `.video` - indexed by their text content: labels, cards, prompts, captions), shareable forms (`.form` - indexed as MDX prose), office documents (Word `.docx`, Excel `.xlsx`/`.xls`, PowerPoint `.pptx`/`.ppt`, OpenDocument `.odt`/`.ods`, Apple Numbers - indexed as extracted text) - plus media by content (images - PNG, JPEG, WebP, GIF, BMP, TIFF, short videos in common containers - MP4, MOV, WebM, AVI, MPEG..., audio - MP3, WAV, M4A, FLAC, OGG, AAC..., and PDFs) when the workspace uses a multimodal embedding model (the default); media matches return the path with no snippet, plus a page/time range locating the match inside long PDFs and audio. Recent edits can take a few seconds to appear in results. A workspace without an index returns `unindexed` - the index is built explicitly from the enterprise search settings, never by searching. Enterprise search is part of the Business and Enterprise plans, so on other plans (or where an admin has turned search off) the tool is not offered at all - fall back to `grep` and `list_files`. Use `grep` for exact strings, identifiers, or regex.
- **Share links:** `get_file_urls` builds an Arg **app** URL — it needs a sign-in and workspace access, so it is no use to an outside recipient and can never render as an image. `create_share_link` mints the public one, returning both a `share_url` (page a person opens) and a `direct_url` (`/api/share/<id>/view`, raw bytes with the file's real content type). Anything fetched by an image proxy — a markdown image in a GitHub PR body or issue, a Slack unfurl, an `<img>` — needs `direct_url`; the others render a broken image and cache the failure. Pass `expires_hours: 0` for a link going somewhere durable, since the default is 24 hours. GitHub strips `<video>` and only plays its own uploads, so post a video's `share_url` as a plain link rather than trying to embed it. The link is public with no sign-in: don't mint one for private or customer data unless the user asked, and say so when you hand it over.
- Other useful tools: `browse_url`, `screenshot_url`, `extract_webpage_data`, `comment_on_file`, `get_file_urls`, `list_skills`/`load_skill`, `send_notification`, `deploy_server`/`list_servers`/`delete_server`.
- **Targeted notifications:** `send_notification` accepts a canonical Arg file, folder, chat, or Action-run URL as `target`. `users` accepts `me`, user ids, and emails; omit it to notify yourself. Omit `channels` for all delivery or pass any of `ios`, `email`, and `in-app`. Recipient preferences still apply. `title` is optional when `target` is present.

## Local desktop MCP server (shared folders)

The Arg desktop app can also host a **loopback** MCP server (Settings → Agent Access) that exposes local folders the user has shared — the user's disk, not cloud workspaces — at `http://127.0.0.1:8720/mcp` (port configurable). Connect with the token shown in Settings → Agent Access:

```bash
claude mcp add --transport http arg-desktop http://127.0.0.1:8720/mcp \
  --header "Authorization: Bearer <token>"
```

Differences from the cloud endpoint:

- **Auth:** a static bearer token, not OAuth; the server only accepts connections from the same machine.
- **Path model:** all shared folders form one virtual filesystem — the first path segment is the folder's slug (`/my-project/src/index.ts`). Call `list_folders` (or `list_files` on `/`) to discover what is shared.
- **Tool surface:** `list_files`, `read_file`, `write_file`, `edit_file`, `multi_edit`, `move_files`, and `grep` mirror the cloud tools, plus local-only `list_folders` and `delete_files`. There is no `run_bash`, `semantic_search`, upload session, or workspace concept — everything is plain files on disk.
- **Writes land on the user's disk** immediately; folders that are also synced to a cloud workspace propagate through the desktop folder sync.
