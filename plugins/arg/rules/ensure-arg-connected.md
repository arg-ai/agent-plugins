---
description: Guidelines for connecting to Arg and choosing an access method
---

Arg files can be reached three ways — an **MCP server**, the **`arg` CLI**, or a **FUSE mount** (the workspace as a native local filesystem). Load the `arg-core` skill first; it explains how to pick the active method and routes to `arg-mcp`, `arg-cli`, or `arg-fuse`.

- **MCP:** the server is remote and OAuth-authenticated (`https://api.arg.ai/mcp`). On an auth/connection error, prompt the user to sign in (the OAuth flow lets them pick an organization or workspace), then retry.
- **CLI:** ensure `arg login` has run (and an org/workspace is selected).
- **FUSE:** ensure the workspace is mounted (`arg mount`).

When creating, reading, updating, or deleting a supported file type, also load the matching `arg-file-*` skill for format-specific guidance.
