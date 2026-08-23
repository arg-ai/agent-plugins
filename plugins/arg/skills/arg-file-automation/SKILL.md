---
name: arg-file-automation
version: "1.13.0"
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

- **Triggers** (`category: "trigger"`): `manual` `{}`, `webhook` `{method,path}`, `schedule` `{cron}`, `file-change` `{pattern}`, `notification` `{notification_types}`, `poll` `{url, cron, mode?, headers?}` (checks `url` on the `cron` schedule; response capped at 256KB, so use it for feeds/pages, not large downloads; `headers` is a list of `{key, value}` rows for literal values like an API token - no `{{ }}` templating at check time. `mode: "page"` (default) fires only when the response body's content hash changes since the last check. `mode: "feed"` parses the response as an RSS/Atom/RDF feed and fires once per item the feed didn't have last check, deduped by the item's guid/id - up to 20 new items per check, output at `{{ trigger.output.item.title }}` / `item.link` / `item.summary` / `item.published_at` / `item.id`. Both modes seed a baseline on the first check after deploy instead of firing, so a freshly deployed trigger never fires reporting "everything is new"), `form-submission` `{form_path?}` (fires when a `.form` file records a new response — a public share fill or a signed-in workspace fill; `form_path` is the workspace path of the form to watch, omit it to fire for every `.form` in the workspace).
- **Actions** (`category: "action"`): `code`, `http-request`, `read-file`, `write-file`, `append-file`, `list-files`, `grep`, `edit-file` (`{path, edits: [{operator, value, replacement, replace_all}]}`), `copy-file` / `move-file` (`{sourcePath, destinationPath, onConflict}`; `onConflict` is `"append"` (default - keep both, suffixing `(1)`, `(2)`, … on collision) or `"overwrite"` - replace the existing destination file), `delete-file`, `run-llm`, `screenshot`, `fetch-web`, `download-file` (raw GET of a URL saved to a workspace file, keeping the source's content type - `{url, savePath?, contentType?, headers?}`; good for RSS feeds), `extract-data`, `apify-actor` (curated Apify web scrapers; `actorKey` picks the scraper, `input` is that actor's input object; returns `{items, itemCount, actorId}`), `send-notification` (`{title, body, notifyRunner, recipientUserIds}`: delivers a workspace notification. `notifyRunner` defaults `true` and notifies whoever runs the automation - the running user on manual runs, the workspace owner on scheduled runs. `recipientUserIds` is an optional array of workspace-member user ids to also notify; ids outside the workspace's org are ignored).
- **Registry actions** (`category: "action"`, `kind: "run-action"`): runs any action from the central Action registry with `config: {action_id, input}`. This is the generic path for anything without a dedicated kind above - media generation, transcription, web scraping, stock/people/company data, and every integration action. Discover ids and input schemas with `search_actions` / `describe_action`.
- **Flow control** (`category: "flow"`): `if` (has a `false` output handle for the else branch), `switch` (one handle per case), `loop`, `merge` (`mode`: `wait-all` / `first`), `delay` (`{amount, unit}`; `unit` is `seconds` / `minutes` / `hours` / `days`, capped at 7 days total — pauses this branch of a deployed run without using any compute; a manual live-preview run in the editor caps to a short simulated wait instead, since it has no durable step to sleep on).

**Edge** — `id`, `source`, `target`, `sourceHandle` (`output`, or `false` for an `if` node's else branch), `targetHandle` (`input`).

**Tolerating a node's own failure** — any action/flow node (not `loop`) can set `config.continue_on_error: true`. By default a failed node stops its branch and the run reports `error`; with this set, the failure still emits a `node_error` event but execution continues along the node's normal output edges with `{ failed: true, error_message: "..." }` (plus any fields the failed result carried, e.g. a `code` node's `stdout`/`stderr`) as the downstream input — reference it as `{{ id.output.failed }}` / `{{ id.output.error_message }}`, never `{{ id.output.error }}` (a node result with a literal `error` field is what the engine's strict template resolver refuses to reference). Use this so one optional/flaky step (an enrichment lookup, a non-critical notification) can't take down an otherwise-working automation — wire an `if` after it to branch on `{{ id.output.failed }}`.

**Retrying a flaky node** — any action/flow node (not `loop` or `delay`) can set `config.retry: true` (defaults: 3 attempts, 5s fixed delay) or `config.retry: { max_attempts, delay_seconds, backoff }` (`max_attempts` 2-5, `delay_seconds` 0-300, `backoff` `"fixed"` | `"exponential"`). Unlike `continue_on_error` (accept the failure and move on), `retry` re-attempts the node itself before counting it as failed — compose them so a transient error retries a few times and only falls through to `continue_on_error` handling once exhausted. On a deployed run the wait between attempts is a real durable sleep (no compute burned); a live editor preview retries immediately. Don't set it on a non-idempotent write (e.g. sending an email) unless a duplicate on retry is acceptable — retry re-submits the node's own side effects on each attempt.

## YAML workflow essentials

YAML workflows live under `.arg/workflows/` with a `.yml` or `.yaml` extension. One file is one workflow.

Top-level keys:

- `name` — workflow label.
- `service-account` — service account id for persistent triggers; omit for manual drafts, and keep any existing value when editing a workflow that already has one.
- `on` — trigger map. Supported keys match `.automation` triggers: `manual`, `webhook`, `schedule`, `file-change`, `notification`, `poll` (`{url, cron, mode?, headers?}`; `mode` is `"page"` (default) or `"feed"`; `headers` is a mapping `{HeaderName: "value"}` in YAML), `form-submission` (`{form_path?}`, same semantics as the `.automation` trigger).
- `jobs` — map of job ids to job definitions.

Job keys:

- `needs` — string or list of upstream job ids.
- `steps` — ordered list of steps.

Step keys:

- `id` — stable id used in templates such as `{{ read.output.content }}`.
- `name` — display label.
- `uses` — an action kind (`read-file`, `write-file`, `copy-file`, `move-file`, `run-llm`, `http-request`, `send-notification`, …), `action/<action_id>` to run any action from the central registry (`with:` is then that action's own input, e.g. `uses: action/image_generate`), or a flow kind (`switch`, `merge`, `delay` (`with: {amount, unit}`), or `loop` — see Loops below). **`uses: if` is a compile error** — conditionals are the step-level `if:` key below.
- `with` — config object for the selected kind.
- `run` + `shell` — shorthand for a `code` step.
- `if` — expression guard on the step (see Expressions).
- `enabled` — optional boolean.
- `continue-on-error` — optional boolean (default `false`). Tolerates this step's own failure — see "Tolerating a node's own failure" above. Not valid on `uses: loop`.
- `retry` — optional boolean or `{ max_attempts, delay_seconds, backoff }`. Re-attempts this step's own failure — see "Retrying a flaky node" above. Not valid on `uses: loop` or `uses: delay`.

Loops use `uses: loop` with nested `steps` and `with: { over: "{{ ... }}" }`; inside the body, `{{ <loop-id>.item }}` is the current element. Nested loops are not supported.

### Expressions and templates

- `{{ … }}` resolves **only** the trigger (`{{ trigger.output.… }}`) and earlier step ids (`{{ read.output.content }}`). There are **no built-in variables** — `{{ now }}`, `{{ date }}`, `{{ env.X }}` do not exist and fail the step at runtime with "references deleted node". Need a timestamp or computed value? Produce it in a `run:` code step and reference that step's output.
- Know the output shapes: `read-file` → `{{ <id>.output.content }}`; `run-llm` → `{{ <id>.output.text }}`; a `file-change` trigger → `{{ trigger.output.file.path }}`, `{{ trigger.output.file.name }}`, `{{ trigger.output.file.previousPath }}`, `{{ trigger.output.file.operation }}` (upload/write/edit/copy/move/delete); a `poll` trigger in `mode: "page"` → `{{ trigger.output.url }}`, `{{ trigger.output.current_hash }}`, `{{ trigger.output.previous_hash }}`, `{{ trigger.output.content_preview }}` (first 2000 chars of the new body), `{{ trigger.output.status_code }}`; a `poll` trigger in `mode: "feed"` → `{{ trigger.output.item.title }}`, `{{ trigger.output.item.link }}`, `{{ trigger.output.item.summary }}`, `{{ trigger.output.item.published_at }}`, `{{ trigger.output.item.id }}`; a `form-submission` trigger → `{{ trigger.output.form_submission.form_path }}`, `{{ trigger.output.form_submission.data }}` (submitted field values keyed by field name — drill to `{{ trigger.output.form_submission.data.email }}`), `{{ trigger.output.form_submission.submitter_email }}`, `{{ trigger.output.form_submission.submitted_by }}` (workspace user id, or null for a public share). Referencing a bare object (`{{ read.output }}`) interpolates raw JSON — drill to the field you want.
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

Writing the file only saves it. `manual` workflows run on demand, but persistent triggers (`webhook`, `schedule`, `file-change`, `notification`, `poll`, `form-submission`) stay dormant until the automation is **deployed** — which registers them and snapshots the document.

Deploy it yourself; don't ask the user to open the editor and click **Deploy**:

- `deploy_automation({ file_path })` — registers the persistent triggers. Call it after writing or editing the file; calling it again ships an edit. **Editing a deployed automation without redeploying changes nothing at runtime**: dispatch executes the deployment snapshot, so the old graph — old trigger patterns included — keeps running (or keeps not firing) until you deploy again.
- `list_automation_deployments()` — what's live: registered triggers **with their configs** (`registered_triggers` — the file-change pattern / cron dispatch actually consults), which are enabled, the service account, whether the deployment is active, paused, or stopped, and `file_changed_since_deploy`. When that flag is true the saved file has drifted from the running snapshot — say so and redeploy. When a deployed automation never fires, compare `registered_triggers` against the file's trigger nodes first: a pattern edited (or a watched file moved) after the last deploy is the classic silent killer.
- `list_automation_history({ file_path?, limit? })` — finished runs, newest first, and how each ended. A successful deploy only means the triggers are registered, so check the runs before telling the user an automation works or is fixed. Two limits: a run that finished before your latest edit says nothing about that edit (check its age), and a `completed` run only means every node reported success — it does not prove the notification, board update, or calendar event actually landed, so confirm the affected file or resource. No runs returned does not mean it never ran; the reply lists the causes it cannot distinguish.
- `manage_automation_deployment({ file_path, action })` — `pause` (triggers stay registered but stop firing), `resume`, `stop` (unregister the runtime, keep the snapshot), or `delete` (remove the deployment; the file stays).

Deploy validates the configured service account against the automation file and every file the workflow reads or writes. Persistent triggers run **as that service account**, not as you or the user, so `service_account_id` (`service-account:` in YAML) must be the id (a UUID) of an **existing** service account with access to those files — **never invent or guess an id**. Don't know which to use? Deploy anyway: the error lists the organization's service accounts by id and name. When exactly one fits, set it and deploy again without asking. When the choice isn't obvious — none exist yet, or several could apply — call `request_service_account({ purpose, access })` (chat surface): it pauses on an interactive picker where the user selects an existing account or creates one inline, and returns the chosen id to write into the file. `access` is where you say what the account needs — `access.level` (`read` / `write` / `manage`) plus `access.paths` naming the automation file itself and every file or folder the workflow reads or writes, or `access.whole_workspace: true` for one that genuinely operates workspace-wide. Paths that don't exist yet are fine; the grant applies once the automation creates them. The picker shows that list to the user before they choose, and the grants are written under **their** permissions the moment they pick — so check the result's `access_not_granted` and relay anything that was refused, because the automation will fail on those paths at run time. If the picker is dismissed or unavailable (CLI/MCP), ask the user instead. An automation whose trigger nodes are all disabled deploys as `paused`.

> On the `arg` CLI, use `arg automation deploy <path>` instead.

## Tips

- Start with a trigger node, then chain actions and flow control left→right (~340px apart).
- Connect `output` → `input`; use the `false` handle for an `if` node's else branch.
- Write valid, pretty-printed (2-space) JSON for `.automation`; write plain YAML for `.arg/workflows/*.yml`.
- Keep YAML valid: unknown `uses` (including `uses: if`), duplicate trigger kinds, invalid cron expressions, and persistent triggers without a service account are compile errors surfaced on deploy.
- A `file-change` automation that writes files can **trigger itself in a loop**: keep every written path outside the watched `pattern` (watch `uploads/**`, write to `summaries/…`) and never watch `**/*` in a workflow that writes files.
- After a deploy error, fix the file and deploy again yourself — compile errors name the offending step, and a wrong/missing service account error lists the valid ones. Don't hand the problem back to the user if one more deploy can resolve it.
