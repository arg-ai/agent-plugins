# Arg

## Description

Arg is a collaborative, fast, cloud file system for humans and agents to collaborate and work together. With this plugin, your agent connects to your Arg workspace over MCP and can read and write files natively — turning your workspace into a shared surface between you and your agent.

## Features

- **Native read/write for many file types**: images, video, audio, presentations, documents, spreadsheets, databases, designs, whiteboards, and kanban boards.
- **Format-aware skills**: each supported file type ships a skill with domain-specific guidance, so edits stay high fidelity.
- **Arg-native formats**: author `.design`, `.whiteboard`, and `.kanban` files using Arg's agent-friendly schemas.
- **Cross-tool workflows**: combine Arg with your codebase and other MCP servers to move content between designs, documents, data, and code.

## Supported file types

| Type | Extensions |
| --- | --- |
| Image | png, jpg, exr, bmp |
| Video | mp4, mov, webm |
| Video editor (NLE) | video |
| Audio | wav, mp3 |
| Presentation | pptx |
| Document | md, mdx, txt |
| HTML / web | html, htm |
| Spreadsheet | csv, xlsx |
| Database | sqlite, sqlite3, db |
| Design | design, svg, fig |
| Whiteboard | whiteboard |
| Task / project management | kanban |
| Automation / workflow | automation |
| Diary / journal | diary |
| URL shortcut / bookmark | url, webloc |

Plus a meta skill, `arg-skills-and-agents`, for authoring reusable workspace skills (`.skills/<name>/SKILL.md`) and subagents (`.agents/<name>.md`).

Custom Arg formats — `.design`, `.whiteboard`, `.kanban`, `.automation` — are documented at:

- https://arg.ai/docs/files/design/llms.txt
- https://arg.ai/docs/files/whiteboard/llms.txt
- https://arg.ai/docs/files/kanban/llms.txt
- https://arg.ai/docs/files/automation/llms.txt

`.mdx` documents support Arg's custom JSX components (callouts, toggles, embeds, columns, tabs, math, mentions, and more); those are documented in full in the `arg-file-document` skill. `.html` pages can use the `window.arg` FS SDK ([arg.ai/docs/sdks/fs/llms.txt](https://arg.ai/docs/sdks/fs/llms.txt)) to read/write workspace files for file-backed apps; see the `arg-file-html` skill. Arg also opens many other formats (diagrams, 3D/CAD, notebooks, geo, media projects, code, and more) — the `arg-core` skill has the full list.

## Access methods

The skills are **transport-neutral** — the format knowledge is the same however you reach Arg. CRUD can run over any of three access methods, and `arg-core` routes to the right one:

- **MCP** (`arg-mcp`) — this plugin's `mcp.json` connects to Arg's cloud MCP server at `https://api.arg.ai/mcp` over OAuth. On first use you'll sign in and choose an organization or workspace. No local app required.
- **CLI** (`arg-cli`) — the `arg` command-line tool (`arg login`, `arg cat`/`ls`/`grep`/`upload`/`download`).
- **FUSE** (`arg-fuse`) — mount the workspace as a local filesystem with `arg mount` and use your harness's native file tools, with two-way sync.

When the environment doesn't specify, `arg-core` auto-detects in order: MCP → CLI → native filesystem.

## Examples

### Example 1: Plan a project on a board

**User prompt:** "Create a kanban board in Arg to plan my launch and add the first tasks"

The agent loads the `arg-file-kanban` skill, reads the `.kanban` format docs, creates a board with sensible columns, and adds the initial cards.

### Example 2: Implement a design

**User prompt:** "Read my design file in Arg and implement it in my codebase"

The agent loads the `arg-file-design` skill, reads the design's structure, styles, and tokens, and generates components in your project's framework and conventions.

### Example 3: Summarize data into a doc

**User prompt:** "Turn the spreadsheet in my Arg workspace into a summary document"

The agent loads the `arg-file-spreadsheet` and `arg-file-document` skills, reads the sheet, and writes a Markdown summary back into Arg.

## Privacy Policy

See: [arg.ai/privacy](https://arg.ai/privacy)

## Support

- Website: [arg.ai](https://arg.ai)
- Developer docs: [developers.arg.ai](https://developers.arg.ai)
- For issues or questions: team@arg.ai
