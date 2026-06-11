# Arg agent plugins

[![skills.sh](https://skills.sh/b/arg-ai/agent-plugins)](https://skills.sh/arg-ai/agent-plugins)

Use [Arg](https://arg.ai) with your favorite agent harness.
Missing one? [Request it in an issue](https://github.com/arg-ai/agent-plugins/issues/new).

Arg is a collaborative, fast, cloud file system for humans and agents to collaborate and work together.

## Cursor

```sh
/add-plugin arg
```

- [Read more about installing Cursor plugins](https://cursor.com/docs/plugins#installing-plugins)

## Claude Code

**Add the custom marketplace**

```sh
/plugin marketplace add arg-ai/agent-plugins
```

**Install the plugin**

```sh
/plugin install arg@arg
```

## Codex

**Add the custom marketplace**

```sh
codex plugin marketplace add arg-ai/agent-plugins
```

**Install the plugin**

```sh
codex plugin install arg@arg
```

You can also browse and install plugins interactively by running `/plugins` inside Codex CLI after adding the marketplace.

- [Read more about installing Codex plugins](https://developers.openai.com/codex/plugins)

## Connecting

The plugin connects to Arg's cloud MCP server at `https://api.arg.ai/mcp` using OAuth. On first use you'll sign in and choose an organization or workspace.
