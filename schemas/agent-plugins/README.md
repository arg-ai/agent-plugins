# Agent Plugins schemas

The versioned files in this directory are verbatim copies of the canonical schemas published by [agent-plugins.org](https://agent-plugins.org/schemas). They are vendored so CI can validate the package without retrieving schemas at load or build time.

The normative specification governs if its text conflicts with a schema. Published schema versions are immutable; add a new version directory when the package targets a newer specification instead of replacing an existing schema.

The upstream schemas are Copyright 2026 Vercel, Inc. and licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0), per the [upstream licensing terms](https://github.com/agentplugins/agent-plugins-site/blob/main/LICENSE.md).
