---
name: arg-file-automation
version: "1.7.1"
description: Create, read, update, delete, and deploy Arg automation files (.automation) and YAML workflows (.arg/workflows/*.yml) for scheduled jobs, webhooks, file-change reactions, and multi-step pipelines. Load when building, editing, or deploying workflow automations.
---

# Automation files (`.automation`, `.arg/workflows/*.yml`)

Arg has two automation authoring formats:

- **`.automation`** — visual workflow (n8n-style), stored as React Flow JSON.
- **`.arg/workflows/*.yml` / `.yaml`** — GitHub-Actions-style YAML that compiles to the same automation engine. Prefer it when the user wants a readable, reviewable, hand-editable workflow file.

## CRUD

Use your active Arg access method (`arg-mcp` / `arg-cli` — see `arg-files`) and the shared rules in `arg-files`. Automation-specific: read the file first. For `.automation`, map nodes and edges before editing; to remove a node, edit the JSON and drop it plus its edges. For YAML workflows, preserve stable `id` values because templates and `needs` refer to them.

## `.automation` schema essentials

Top-level: `version` (use `1`), `name`, `service_account_id` (the account persistent triggers run as — see Deployment; leave `""` on a new file or a `manual`-only workflow, but when editing an existing file **keep the id already in the document**, since it is the run-as identity the user bound and blanking it breaks the deployment), `nodes`, `edges`. Give every node and edge a **unique `id`**; start the workflow with a **trigger**. Pan/zoom is stored client-side per viewer, not in the file, so `viewport` is optional - include `viewport` (`{x,y,zoom}`) only to hint the initial view; it's honored on first open, then superseded by the viewer's own pan/zoom.

**Node** — every node uses `type: "automation"`; `position`, `width`, `height`, and `data`. `data` carries `category`, `kind`, `label`, `config` (shape depends on `kind`), and `enabled`.

- **Triggers** (`category: "trigger"`): `manual` `{}`, `webhook` `{method,path}`, `schedule` `{cron}`, `file-change` `{pattern}`, `notification` `{notification_types}`.
- **Actions** (`category: "action"`): `code`, `http-request`, `read-file`, `write-file`, `append-file`, `list-files`, `grep`, `edit-file`, `multi-edit`, `copy-file` / `move-file` (`{sourcePath, destinationPath, onConflict}`; `onConflict` is `"append"` (default - keep both, suffixing `(1)`, `(2)`, … on collision) or `"overwrite"` - replace the existing destination file), `delete-file`, `run-llm`, `screenshot`, `fetch-web`, `download-file` (raw GET of a URL saved to a workspace file, keeping the source's content type - `{url, savePath?, contentType?, headers?}`; good for RSS feeds), `extract-data`, `apify-actor` (curated Apify web scrapers; `actorKey` picks the scraper, `input` is that actor's input object; returns `{items, itemCount, actorId}`), `send-notification` (`{title, body, notifyRunner, recipientUserIds}`: delivers a workspace notification. `notifyRunner` defaults `true` and notifies whoever runs the automation - the running user on manual runs, the workspace owner on scheduled runs. `recipientUserIds` is an optional array of workspace-member user ids to also notify; ids outside the workspace's org are ignored).
- **Flow control** (`category: "flow"`): `if` (has a `false` output handle for the else branch), `switch` (one handle per case), `loop`, `merge` (`mode`: `wait-all` / `first`).

**Edge** — `id`, `source`, `target`, `sourceHandle` (`output`, or `false` for an `if` node's else branch), `targetHandle` (`input`).

## YAML workflow essentials

YAML workflows live under `.arg/workflows/` with a `.yml` or `.yaml` extension. One file is one workflow.

Top-level keys:

- `name` — workflow label.
- `service-account` — service account id for persistent triggers; omit for manual drafts, and keep any existing value when editing a workflow that already has one.
- `on` — trigger map. Supported keys match `.automation` triggers: `manual`, `webhook`, `schedule`, `file-change`, `notification`.
- `jobs` — map of job ids to job definitions.

Job keys:

- `needs` — string or list of upstream job ids.
- `steps` — ordered list of steps.

Step keys:

- `id` — stable id used in templates such as `{{ read.output.content }}`.
- `name` — display label.
- `uses` — an action kind (`read-file`, `write-file`, `copy-file`, `move-file`, `run-llm`, `http-request`, `send-notification`, …) or a flow kind (`switch`, `merge`, or `loop` — see Loops below). **`uses: if` is a compile error** — conditionals are the step-level `if:` key below.
- `with` — config object for the selected kind.
- `run` + `shell` — shorthand for a `code` step.
- `if` — expression guard on the step (see Expressions).
- `enabled` — optional boolean.

Loops use `uses: loop` with nested `steps` and `with: { over: "{{ ... }}" }`; inside the body, `{{ <loop-id>.item }}` is the current element. Nested loops are not supported.

### Expressions and templates

- `{{ … }}` resolves **only** the trigger (`{{ trigger.output.… }}`) and earlier step ids (`{{ read.output.content }}`). There are **no built-in variables** — `{{ now }}`, `{{ date }}`, `{{ env.X }}` do not exist and fail the step at runtime with "references deleted node". Need a timestamp or computed value? Produce it in a `run:` code step and reference that step's output.
- Know the output shapes: `read-file` → `{{ <id>.output.content }}`; `run-llm` → `{{ <id>.output.text }}`; a `file-change` trigger → `{{ trigger.output.file.path }}`, `{{ trigger.output.file.name }}`, `{{ trigger.output.file.previousPath }}`, `{{ trigger.output.file.operation }}` (upload/write/edit/copy/move/delete). Referencing a bare object (`{{ read.output }}`) interpolates raw JSON — drill to the field you want.
- **Python and TypeScript code steps** (`kind: code` / `run:` + `shell: python` or `shell: typescript`) run as a plain top-level script with `input` injected — the upstream step's output, already JSON-decoded (after `read-file`, `input["content"]` is the file text; never `json.loads(input)` / `JSON.parse(input)`). Hand a JSON-serializable value to later steps by assigning `output`; reference it as `{{ <id>.output.result }}` (drill: `{{ <id>.output.result.rows.0.name }}`). A top-level `return <value>` also works, but prefer `output =`. `print` / `console.log` goes to `{{ <id>.output.stdout }}` (logs, not data). TypeScript also allows top-level `await` and plain JavaScript (`javascript` is an accepted alias); use `require("node:fs")`-style requires for Node builtins — `import` statements are not supported. Bash code steps get the upstream output as `$INPUT` (a JSON string) and their output is `{{ <id>.output.stdout }}`.
- In an `if:` guard, the comparison goes **outside** the braces: `if: "{{ trigger.output.file.name }} != 'README.md'"` — never `if: "{{ a != b }}"`. Operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `&&`, `||`, `!` (JavaScript's `===`/`!==` are **not** supported). Quote string literals in single quotes.

```yaml
name: Summarize uploads
# Must be an EXISTING service account's id (a UUID) — see Deployment.
service-account: 4f7d2c1e-9b3a-4e8f-a1d2-6c5b4a3f2e1d
on:
  file-change:
    pattern: "uploads/**/*.txt"
jobs:
  summarize:
    steps:
      - id: read
        uses: read-file
        with:
          path: "{{ trigger.output.file.path }}"
      - id: summary
        uses: run-llm
        with:
          prompt: "Summarize this file:\n\n{{ read.output.content }}"
      - id: write
        uses: write-file
        with:
          path: "summaries/{{ trigger.output.file.name }}.md"
          content: "{{ summary.output.text }}"
```

## Deployment

Writing the file only saves it. `manual` workflows run on demand, but persistent triggers (`webhook`, `schedule`, `file-change`, `notification`) stay dormant until the automation is **deployed** — which registers them and snapshots the document.

Deploy it yourself; don't ask the user to open the editor and click **Deploy**:

- `deploy_automation({ file_path })` — registers the persistent triggers. Call it after writing or editing the file; calling it again ships an edit.
- `list_automation_deployments()` — what's live: registered triggers, which are enabled, the service account, and whether the deployment is active, paused, or stopped.
- `list_automation_history({ file_path?, limit? })` — finished runs, newest first, and how each ended. A successful deploy only means the triggers are registered, so check the runs before telling the user an automation works or is fixed. Two limits: a run that finished before your latest edit says nothing about that edit (check its age), and a `completed` run only means every node reported success — it does not prove the notification, board update, or calendar event actually landed, so confirm the affected file or resource. No runs returned does not mean it never ran; the reply lists the causes it cannot distinguish.
- `manage_automation_deployment({ file_path, action })` — `pause` (triggers stay registered but stop firing), `resume`, `stop` (unregister the runtime, keep the snapshot), or `delete` (remove the deployment; the file stays).

Deploy validates the configured service account against the automation file and every file the workflow reads or writes. Persistent triggers run **as that service account**, not as you or the user, so `service_account_id` (`service-account:` in YAML) must be the id (a UUID) of an **existing** service account with access to those files — **never invent or guess an id**. Don't know which to use? Deploy anyway: the error lists the organization's service accounts by id and name. When exactly one fits, set it and deploy again without asking. When the choice isn't obvious — none exist yet, or several could apply — call `request_service_account({ purpose })` (chat surface): it pauses on an interactive picker where the user selects an existing account or creates one inline, and returns the chosen id to write into the file. If the picker is dismissed or unavailable (CLI/MCP), ask the user instead. An automation whose trigger nodes are all disabled deploys as `paused`.

> On the `arg` CLI, use `arg automation deploy <path>` instead.

## Tips

- Start with a trigger node, then chain actions and flow control left→right (~340px apart).
- Connect `output` → `input`; use the `false` handle for an `if` node's else branch.
- Write valid, pretty-printed (2-space) JSON for `.automation`; write plain YAML for `.arg/workflows/*.yml`.
- Keep YAML valid: unknown `uses` (including `uses: if`), duplicate trigger kinds, invalid cron expressions, and persistent triggers without a service account are compile errors surfaced on deploy.
- A `file-change` automation that writes files can **trigger itself in a loop**: keep every written path outside the watched `pattern` (watch `uploads/**`, write to `summaries/…`) and never watch `**/*` in a workflow that writes files.
- After a deploy error, fix the file and deploy again yourself — compile errors name the offending step, and a wrong/missing service account error lists the valid ones. Don't hand the problem back to the user if one more deploy can resolve it.
