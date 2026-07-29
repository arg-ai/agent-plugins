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

## Pi

Pi has no marketplace — it installs [packages](https://pi.dev/docs/latest/packages) straight from git. This repo is also a pi package, so it installs in one command:

```sh
pi install git:github.com/arg-ai/agent-plugins
```

That adds the Arg skills to your global config (`~/.pi/agent/settings.json`). Add `-l` to install into the project instead (`.pi/settings.json`), which pi will auto-install for anyone else who trusts the project. To try it for a single run without installing:

```sh
pi -e git:github.com/arg-ai/agent-plugins
```

**Pi has no built-in MCP support**, so it picks up the skills but not the MCP connection. Install the `arg` CLI and the skills will use it as their access method:

```sh
curl -fsSL https://arg.ai/cli | sh
arg login
```

Then `pi config` to enable or disable individual skills, `pi update --extensions` to pull newer ones, and `pi remove git:github.com/arg-ai/agent-plugins` to uninstall.

### MCP in pi (optional)

If you'd rather have the MCP tools, the third-party [`pi-mcp-adapter`](https://github.com/nicobailon/pi-mcp-adapter) extension adds MCP support to pi, including remote servers with OAuth:

```sh
pi install npm:pi-mcp-adapter
```

Then add Arg to `.mcp.json` (project) or `~/.config/mcp/mcp.json` (global) and restart pi:

```json
{
  "mcpServers": {
    "arg": {
      "url": "https://api.arg.ai/mcp",
      "auth": "oauth"
    }
  }
}
```

- [Read more about pi packages](https://pi.dev/docs/latest/packages)

## Connecting

The plugin connects to Arg's cloud MCP server at `https://api.arg.ai/mcp` using OAuth. On first use you'll sign in and choose an organization or workspace. Pi is the exception — see [Pi](#pi) for the CLI-based setup.

## Contributing

PRs and issues are welcome. All changes go through pull requests — see [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, skill conventions, and validation.
