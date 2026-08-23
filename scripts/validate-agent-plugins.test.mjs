import assert from "node:assert/strict";
import test from "node:test";

import {
  remoteServerProblems,
  skillFrontmatterProblems,
  stdioServerProblems,
} from "./validate-agent-plugins.mjs";

test("accepts Agent Skills frontmatter with string metadata", () => {
  const content = `---
name: example-skill
description: Explain the example when the user asks for it.
metadata:
  version: "1.2.3"
allowed-tools: Read Bash(git:*)
---

# Example
`;

  assert.deepEqual(skillFrontmatterProblems(content, "example-skill"), []);
});

test("rejects legacy and mistyped Agent Skills fields", () => {
  const content = `---
name: example-skill
version: "1.2.3"
description: Explain the example when the user asks for it.
metadata:
  version: 1.2
---
`;

  assert.deepEqual(skillFrontmatterProblems(content, "example-skill"), [
    'unsupported frontmatter field "version"',
    "metadata.version must be a string",
  ]);
});

test("accepts secure remote MCP configuration", () => {
  assert.deepEqual(
    remoteServerProblems({
      type: "streamable-http",
      url: "https://api.example.com/mcp",
      headers: { "X-Tenant": "public" },
    }),
    [],
  );
});

test("rejects insecure URLs and case-insensitive duplicate headers", () => {
  assert.deepEqual(
    remoteServerProblems({
      type: "streamable-http",
      url: "http://user@example.com/mcp#fragment",
      headers: { "X-Tenant": "one", "x-tenant": "two" },
    }),
    [
      "url must not contain user information",
      "url must not contain a fragment",
      "non-loopback URLs must use HTTPS",
      "duplicate header name ignoring case — x-tenant",
    ],
  );
});

test("rejects malformed HTTP header fields", () => {
  assert.deepEqual(
    remoteServerProblems({
      type: "streamable-http",
      url: "https://api.example.com/mcp",
      headers: { "Bad Header": "value", "X-Control": "bad\u0001value" },
    }),
    ["invalid HTTP header name — Bad Header", "invalid HTTP header value — X-Control"],
  );
});

test("rejects stdio shell commands and escaping working directories", () => {
  assert.deepEqual(
    stdioServerProblems({
      type: "stdio",
      command: "node server.js",
      cwd: "${PLUGIN_ROOT}/../outside",
    }),
    ["command must be one executable token", "cwd must remain within its declared root"],
  );
});

test("rejects an unrooted stdio working directory", () => {
  assert.deepEqual(
    stdioServerProblems({
      type: "stdio",
      command: "node",
      cwd: "server",
    }),
    ["cwd must be plugin-relative or rooted at PLUGIN_ROOT or PLUGIN_DATA"],
  );
});
