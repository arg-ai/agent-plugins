---
name: arg-actions
version: "1.4.0"
description: Run Arg's built-in actions - operations that generate or transform workspace files and data (image/video/3D/audio/music generation and editing, image crop/resize/recolor, transcription, web screenshot, web/social scraping, html→pdf/image, stock data, connected-service calls). Load when a task is better done by an Arg action than by hand - e.g. "generate an image", "make a video", "transcribe this audio", "screenshot a page", "convert html to pdf". Driven by four tools - search_actions, describe_action, run_action, list_runs.
allowed-tools: search_actions, describe_action, run_action, list_runs
---

# Arg actions

An **action** is an operation Arg runs for you and saves straight into the workspace: media generation and editing (image, video, 3D, audio, music, speech), image crop/resize/recolor, transcription, web screenshot, web/social scraping (`web_scrape` wraps curated scrapers for Instagram, LinkedIn — no cookies, X/Twitter, YouTube, Trustpilot/G2/Glassdoor reviews, Similarweb, and general site crawling; the Instagram reel scraper can return native reel transcripts), `html`→`pdf`/`image`, stock data, and calls to connected services (GitHub, Jira, …). You don't build actions — you find the right one and run it. The result is a normal workspace file you can read, open, embed, or edit.

Prefer an action over doing it by hand whenever one fits — generating or editing media, transcribing audio/video, screenshotting or scraping a page, converting a document. Arg does the work and writes the result for you.

> Load `arg-files` first. On the `arg` CLI, use `arg action ...` instead — same actions.

## The four tools (use in this order)

| Tool              | What it does                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `search_actions`  | Find actions by keyword or category. **Start here.**                                          |
| `describe_action` | Look at ONE action's inputs, and list the choices for any field you must pick (like `model`). |
| `run_action`      | Run one by id with its `input`. Waits for long jobs and reports progress in the tool UI.      |
| `list_runs`       | Check past or in-flight runs - status, progress, output file.                                 |

**Flow:** `search_actions` → `describe_action` (when you need a field's choices or the exact inputs) → `run_action`. Use `list_runs` to inspect durable queued/async runs or recover an interrupted run. A succeeded sync read returns its output inline; its `run_id` may identify only the audit event and need not resolve through `list_runs`.

### 1. Find it — `search_actions`

```
search_actions({ query: "generate image" })
search_actions({ category: "video" })   // image | video | audio | 3d | document | web | data | integration | file
search_actions({ provider: "slack" })   // every action for one connected service, with schemas
```

Action ids read **`category_verb`** — `image_generate`, `video_generate`, `transcribe_audio`, `html_to_pdf`, `screenshot_webpage` (a guess like `generate_image` is wrong, though a bad id suggests the right one). **Search rather than relying on memory** for ids or which models exist.

### 2. Check inputs — `describe_action`

```
describe_action({ action_id: "image_generate" })                      // the inputs it takes
describe_action({ action_id: "image_generate", field: "model" })      // the model choices
describe_action({ action_id: "image_generate", field: "model", value: "<id from the list>" })  // that model's extra settings
```

Most inputs are plain — `source_path`, `output_path`, `prompt`, sizes. Some fields (like `model`) have a **list of choices you ask for** instead of guessing:

- See the choices with `describe_action(action_id, "model")`, then a chosen value's extra settings with `describe_action(action_id, "model", <id>)`.
- **Never invent a `model` id** — pick one from the list, or omit `model` to use the default.
- Put any extra settings where `describe_action` tells you to.

### 3. Run it — `run_action`

```
run_action({
  action_id: "image_generate",
  input: { prompt: "a red bicycle on a beach at sunset", output_path: "/images/bike.png" }
})
```

- `input` matches what `describe_action` showed. File actions usually take a `source_path` (input file) and/or `output_path` (often defaults next to the source if omitted).
- Successful runs return `{ status: "succeeded", output }` - `output.output_path` is the saved file. Open it like any workspace file.
- Do not poll an already-succeeded sync read. Its `run_id` can be audit-only and `list_runs` may not find it; use the inline `output`.
- **Long/provider-backed jobs** (e.g. `image_generate`, `image_edit`, `image_upscale`, `vectorize_image`, `video_generate`, `three_d_generate`) stay in the `run_action` tool call and report progress until they finish.
- If the wait limit returns a queued/running `run_id`, check that run with `list_runs`. After an interrupted call with no result, list running runs to recover the in-flight work. Do not start it again, especially for paid provider work.
- **Write actions need workspace write access** — a read-only session can't run them.

### 4. Inspect or recover runs - `list_runs`

```
list_runs({ run_id: "<id returned at the wait limit>" })   // one run: status + progress + output
list_runs({ status: "running" })                // everything in flight
```

Use the returned status and progress to recover work after an interrupted tool call. A succeeded run's file is at `output.output_path`; a failed run includes `error`.

## From sandbox or `.server` code - `arg-action`

The same actions are callable from inside `run_bash` when you'd rather script them than use the tools - e.g. running an action in a loop over many files. A preinstalled helper reads the workspace + token the environment injects:

```
arg-action catalog "generate image"        # find actions (with input schemas)
arg-action schema image_generate           # one action's input and output schemas
arg-action run image_generate '{"prompt":"a red bike","output_path":"/images/bike.png"}'
arg-action get <run_id>                     # inspect one queued/running run
arg-action wait <run_id>                    # wait up to 75s for terminal output
```

`run` prints the JSON result (`output.output_path` is the saved file; long jobs return `{ "runId", "status": "queued" }`). Pass that `runId` to `wait` rather than starting the paid action again; `wait` prints the durable run record with progress/output, exits non-zero for failed or canceled runs, and accepts an optional timeout in seconds. Use `get` for one non-blocking status read. Both commands are owner- and workspace-scoped. The helper runs against the current workspace at the session's permission - a read-only session can't run write actions. For interactive one-offs, the four tools above are simpler; reach for `arg-action` when you're already in a script.

A `.server` backend must opt in with an explicit top-level allowlist, for example `"actions": ["file_read", "text_generate"]`. Only those registered Actions whose backend is not `integration` are visible or runnable. Action-enabled files do not auto-launch: the user must launch them after reviewing the declared authority. The long-running process receives `ARG_API_URL`, `ARG_WORKSPACE_ID`, and `ARG_ACTION_TOKEN`, so it can use `arg-action` directly or call `/api/actions-exec/*` with the token. Never print, persist, return, or copy the token into source. The token stops working when the tunnel stops, the launching principal is deactivated, or that principal loses workspace-wide write access. Because tunnel URLs are public and collaborators can change live workspace code, declare the smallest Action set the backend needs.

Hosted-site server code can call the same endpoint directly using its incoming `X-Arg-Api-Url` and `X-Arg-Action-Token` headers.

## From an in-app TSX or JSX preview - `@arg/actions`

Cloud `.tsx` and `.jsx` previews can discover and run Actions through the typed package facade:

```ts
import { actions } from "@arg/actions";

await actions.ready;
const catalog = await actions.list({ query: "generate image" });
const { inputSchema, outputSchema } = await actions.schema(catalog[0].id);
const details = await actions.describe(catalog[0].id);
const run = await actions.run(catalog[0].id, {
  prompt: "a red bicycle on a beach at sunset",
  output_path: "/images/bicycle.png",
});
const latest =
  run.status === "queued" || run.status === "running" ? await actions.getRun(run.runId) : run;
```

For many independent calls, batch them into one request. Every result is positionally aligned with its input and has its own `ok` discriminator:

```ts
const { results } = await actions.runBatch([
  { actionId: "file_read", input: { path: "/brief.md" } },
  {
    actionId: "image_generate",
    input: { prompt: "A red bicycle", output_path: "/images/bike.png" },
    idempotencyKey: "dashboard-bike-v1",
  },
]);
```

`runBatch` accepts 1-50 calls. It is not a transaction: one failed call neither rejects nor rolls back its siblings, and later calls cannot consume earlier outputs. Give every write, billable, or provider-backed call a stable `idempotencyKey` before retrying a batch after a transport failure.

The package is a lazy facade over `window.arg.actions`, not another transport. The viewer must enable the separate, session-only Actions grant in the preview toolbar or permissions menu. The grant is available only for cloud workspaces and is bound to the exact authored source revision, so any local or collaborative code change revokes it before changed code can execute. It is deliberately not covered by folder-scoped filesystem access: registry Actions can reach the whole workspace, spend credits, and act through the viewer's connected services. The iframe never receives a token or chooses the workspace/audit surface; its exact sitearg origin posts to the authenticated Arg parent, and the backend applies the signed-in viewer's permissions and validates the current registry schema.

Use `list`, `schema`, and `describe` for reflection instead of hardcoding current inputs. Poll only a queued/running asynchronous Action with `getRun` or `listRuns`. A succeeded sync read carries its output inline and its audit-only `runId` may return not found. This browser API applies only to framed `r-*.sitearg.com` previews inside Arg, not a deployed top-level Site.

## From an in-app HTML preview - `window.arg.actions`

Classic `.html` and `.htm` scripts use the equivalent injected namespace directly:

```js
await window.arg.actions.ready;
const catalog = await window.arg.actions.list({ query: "generate image" });
const { inputSchema, outputSchema } = await window.arg.actions.schema(catalog[0].id);
```

It has the same methods, including `runBatch`, grant, and backend validation as `@arg/actions`. On web and desktop the page is a framed sitearg preview and the grant is origin-pinned; on iOS and Android `.html` renders in a native WebView, so the same namespace arrives over a platform transport that the viewer enables per file from the "…" menu. Either way the page never sees a token and never picks the workspace or audit surface.

## What you can run (search_actions is authoritative)

A sampling — there are more:

- **image** — `image_generate`, `image_edit`, `image_upscale`, `vectorize_image`, `html_to_image` (render HTML → png/jpeg/webp), plus `image_crop` / `image_resize` / `image_recolor` / `image_metadata` / `image_blank`.
- **video / 3d / audio** — `video_generate` (text/image/video→video; also drives audio-driven avatar / lip-sync models like Kling AI Avatar - pass the portrait as `source_path` and the voice track as `audio_path`), `three_d_generate`, `video_to_audio`, `music_generate`, `tts_generate` (text→speech), `transcribe_audio`.
- **web / data / document** — `screenshot_webpage`, `web_to_markdown` (one-shot page → Markdown), `web_fetch` (the full browser surface: `format` of `markdown` / `html` / `links` / `scrape` / `pdf` / `crawl`), `extract_webpage_data`, `web_scrape` (curated Apify scrapers — Instagram, LinkedIn, X, YouTube, G2, Trustpilot, …), `get_stock_data`, `html_to_pdf`.
- **integration** — calls to connected services where a connector is set up: Airtable, Confluence, Firmable (ANZ company/people data), GitHub, Google (Gmail/Calendar/Drive/Sheets - `google_append_sheet_row`/`google_read_sheet_range` read and write a spreadsheet), HubSpot, Jira, Linear, Microsoft, Monday.com, Notion, Salesforce, Slack, Stripe (payments - get a charge, create a refund), treg (a gateway to thousands of third-party API endpoints - search its catalogue, then call an endpoint by id), Databricks (run SQL on a warehouse, browse Unity Catalog, run and check jobs), Gong (what was said on sales calls - briefs, key points, trackers, transcripts). Each takes a `connection` input - use `describe_action(action_id, "connection")` to list the ones available.

### Acting on a connected service

Integrations are not automation-only: whatever the user has connected, you can run here.

1. `search_actions({ provider: "slack" })` for that service's actions and their input schemas.
2. Pass the `connection` id. Your system prompt names the connected services and their connection ids; otherwise `describe_action(action_id, "connection")` lists them. **Never invent one.**
3. `run_action({ action_id: "slack_send_message", input: { connection: "<id>", channel: "C01ABC123", text: "..." } })`.

A `not_configured` failure means the account is disconnected or the grant is missing a scope - tell the user to reconnect that service rather than retrying or trying a different account.

## Running an action from an automation

The same registry backs `.automation` files, so anything runnable here is runnable on a
schedule or a trigger. Two ways to author it:

- **Visual `.automation`** — a node with `kind: "run-action"` and
  `config: { action_id, input }`. Templates flow in and out normally, so
  `{{ previous.output.text }}` works as an `input` value and the next node reads
  `{{ node.output.output_path }}`.
- **`.arg/workflows/*.yml`** — `uses: action/<action_id>`, with `with:` holding the
  action's own input.

Either way the run is audited in ClickHouse `action_runs` with `surface: "automation"`. Durable
write/async runs also land in Postgres for `list_runs`; a sync read returns inline and may be
audit-only. **Every** node with a dedicated kind - the file
nodes, `code`, `http-request`, `run-agent`, `run-automation`, `send-notification`, the media nodes,
`screenshot`, `fetch-web`, `extract-data`, `apify-actor` - bridges onto one of these actions underneath, so
they share this persistence rule too. Keep using those kinds; they just have a friendlier config
shape, and they keep their own output key names (`output.path`, `output.image_url`) alongside
the action's (`output.output_path`, `output.asset_url`).

## Tips

- **Search before you run.** Pick model ids from `describe_action`; guessing fails.
- **A queued/running job isn't a failure** - inspect it with `list_runs`; don't re-run it.
- **After success, the file is at `output.output_path`** — that's what to open, embed, or edit next.
- **One file in, one file out** per action.
- **Don't hand-roll what an action does** — for media, transcription, screenshots, or conversions, an action is more reliable than writing bytes yourself.
