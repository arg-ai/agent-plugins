---
description: Guidelines for using the Arg MCP server
---

Arg connects over a remote MCP server at `https://api.arg.ai/mcp`, authenticated with OAuth. Before using any Arg MCP tools, make sure the connection is authorized. If a request fails with an authentication or connection error, prompt the user to sign in to Arg (the OAuth flow lets them pick an organization or workspace), then retry.

When creating, reading, updating, or deleting a supported file type, load the matching skill first for format-specific guidance.
