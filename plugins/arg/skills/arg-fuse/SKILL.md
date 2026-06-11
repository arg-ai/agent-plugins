---
name: arg-fuse
description: Access method for an Arg workspace mounted as a local filesystem (via `arg mount`, FUSE) — use your harness's native read/write/edit/grep/bash tools on real paths, with two-way sync to Arg. Load this when a mount is present or as the native-filesystem fallback. Format/schema knowledge lives in arg-core and the arg-file-* skills.
---

# Arg access: native filesystem (FUSE mount)

`arg mount [flags] -- <harness> [harness args...]` mounts the active workspace as a **local directory with two-way sync**, then launches your coding harness inside it. From there the workspace is just files on disk.

So **use your harness's own native tools directly on the mounted paths** — no Arg-specific verbs, no base64. Edits sync back to Arg automatically.

| Operation | How |
| --- | --- |
| **Create / update** | native Write / Edit / MultiEdit on the path |
| **Read / search** | native Read / Grep / Glob |
| **Delete / move** | `rm` / `mv` / `cp` / `mkdir` (bash) |
| **Run a generator** | run it **locally** (`python-pptx`, `sqlite3`, `ffmpeg`, Pillow), writing to the mounted path |

## Notes

- This is the **highest-fidelity, lowest-friction** method: everything an agent already does with local files works unchanged, including binary files (read/write them like any local file).
- **Always read a file before editing it**, same as any local edit.
- Writes propagate on close/flush; very large files may take a moment to sync. Resolve paths relative to the mount root.
- Requires FUSE (macOS / Linux). If no mount is available, fall back to `arg-mcp` or `arg-cli`.
