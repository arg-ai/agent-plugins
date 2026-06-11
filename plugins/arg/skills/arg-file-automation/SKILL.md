---
name: arg-file-automation
description: Create, read, update, and delete Arg automation files (.automation) — visual workflows of trigger, action, and flow-control nodes for scheduled jobs, webhooks, file-change reactions, and multi-step pipelines. Load when building or editing workflow automations.
---

# Automation files (`.automation`)

A visual workflow (n8n-style) — a graph of trigger, action, and flow-control nodes wired together, stored as React Flow JSON.

**Fetch the full schema before authoring** — it lists every node kind, its `config`, and a complete example:
https://arg.ai/docs/files/automation/llms.txt

## CRUD

Use the standard MCP tools and shared rules in the `arg-core` skill. Automation-specific: read the file first to map nodes and edges; to remove a node, edit the JSON and drop it plus its edges.

## Schema essentials

Top-level: `version` (use `1`), `name`, `service_account_id` (leave `""` when authoring a template — the user associates it on Deploy), `viewport` (`{x,y,zoom}`), `nodes`, `edges`. Give every node and edge a **unique `id`**; start the workflow with a **trigger**.

**Node** — every node uses `type: "automation"`; `position`, `width`, `height`, and `data`. `data` carries `category`, `kind`, `label`, `config` (shape depends on `kind`), and `enabled`.

- **Triggers** (`category: "trigger"`): `manual` `{}`, `webhook` `{method,path}`, `schedule` `{cron}`, `file-change` `{pattern}`, `notification` `{notification_types}`.
- **Actions** (`category: "action"`): `code`, `http-request`, `read-file`, `write-file`, `append-file`, `list-files`, `grep`, `edit-file`, `multi-edit`, `copy-file`, `move-file`, `delete-file`, `run-llm`, `screenshot`, `fetch-web`, `extract-data`. (See the llms.txt for each `config`.)
- **Flow control** (`category: "flow"`): `if` (has a `false` output handle for the else branch), `switch` (one handle per case), `loop`, `merge` (`mode`: `wait-all` / `first`).

**Edge** — `id`, `source`, `target`, `sourceHandle` (`output`, or `false` for an `if` node's else branch), `targetHandle` (`input`).

## Deployment

`manual` workflows run on demand. Persistent triggers (`webhook`, `schedule`, `file-change`, `notification`) only register after the user clicks **Deploy** in the editor, which validates `service_account_id` against a service account that has access to the automation file and every file the workflow reads or writes.

## Tips

- Start with a trigger node, then chain actions and flow control left→right (~340px apart).
- Connect `output` → `input`; use the `false` handle for an `if` node's else branch.
- Write valid, pretty-printed (2-space) JSON.
