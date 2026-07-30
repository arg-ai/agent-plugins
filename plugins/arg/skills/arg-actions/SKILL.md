---
name: arg-actions
version: "1.0.0"
description: Run Arg's built-in actions - operations that generate or transform workspace files and data (image/video/3D/audio/music generation and editing, image crop/resize/recolor, transcription, web screenshot, web/social scraping, Markdown/HTML conversion, html→pdf/image, stock data, connected-service calls). Load when a task is better done by an Arg action than by hand - e.g. "generate an image", "make a video", "transcribe this audio", "convert markdown to html", "convert html to pdf". Driven by four tools: search_actions, describe_action, run_action, list_runs.
allowed-tools: search_actions, describe_action, run_action, list_runs
---

# Arg actions

An **action** is an operation Arg runs for you and returns as a typed result: media generation and editing (image, video, 3D, audio, music, speech), image crop/resize/recolor, transcription, web screenshot, web/social scraping (`web_scrape` wraps curated scrapers for Instagram, LinkedIn - no cookies, X/Twitter, YouTube, Trustpilot/G2/Glassdoor reviews, Similarweb, and general site crawling; the Instagram reel scraper can return native reel transcripts), Markdown/HTML conversion, `html`→`pdf`/`image`, stock data, and calls to connected services (GitHub, Jira, ...). File-producing actions save a normal workspace file you can read, open, embed, or edit; data-producing actions return inline fields for the next action or automation node.

Prefer an action over doing it by hand whenever one fits — generating or editing media, transcribing audio/video, screenshotting or scraping a page, converting a document. Arg does the work and writes the result for you.

> Load `arg-files` first. On the `arg` CLI, use `arg action ...` instead — same actions.

## The four tools (use in this order)

| Tool              | What it does                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| `search_actions`  | Find actions by keyword or category. **Start here.**                                                      |
| `describe_action` | Look at ONE action's inputs and outputs, and list the choices for any field you must pick (like `model`). |
| `run_action`      | Run one by id with its `input`. Waits for long jobs and reports progress in the tool UI.                  |
| `list_runs`       | Check past or in-flight runs - status, progress, output file.                                             |

**Flow:** `search_actions` → `describe_action` (when you need a field's choices or the exact inputs) → `run_action`. Use `list_runs` to inspect history or recover an interrupted run.

### 1. Find it — `search_actions`

```
search_actions({ query: "generate image" })
search_actions({ category: "video" })   // image | video | audio | 3d | document | web | data | integration | file
search_actions({ provider: "slack" })   // every action for one connected service, with schemas
```

Action ids read **`category_verb`** — `image_generate`, `video_generate`, `transcribe_audio`, `html_to_pdf`, `screenshot_webpage` (a guess like `generate_image` is wrong, though a bad id suggests the right one). **Search rather than relying on memory** for ids or which models exist.

### 2. Check inputs and outputs - `describe_action`

```
describe_action({ action_id: "image_generate" })                      // its input and output fields
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
- **Long/provider-backed jobs** (e.g. `image_generate`, `image_edit`, `image_upscale`, `vectorize_image`, `video_generate`, `three_d_generate`) stay in the `run_action` tool call and report progress until they finish.
- If the wait limit returns a queued/running `run_id`, check that run with `list_runs`. After an interrupted call with no result, list running runs to recover the in-flight work. Do not start it again, especially for paid provider work.
- **Write actions need workspace write access** — a read-only session can't run them.

### 4. Inspect or recover runs - `list_runs`

```
list_runs({ run_id: "<id returned at the wait limit>" })   // one run: status + progress + output
list_runs({ status: "running" })                // everything in flight
```

Use the returned status and progress to recover work after an interrupted tool call. A succeeded run's file is at `output.output_path`; a failed run includes `error`.

## What you can run (search_actions is authoritative)

A sampling — there are more:

- **image** — `image_generate`, `image_edit`, `image_upscale`, `vectorize_image`, `html_to_image` (render HTML → png/jpeg/webp), plus `image_crop` / `image_resize` / `image_recolor` / `image_metadata` / `image_blank`.
- **video / 3d / audio** — `video_generate` (text/image/video→video; also drives audio-driven avatar / lip-sync models like Kling AI Avatar - pass the portrait as `source_path` and the voice track as `audio_path`), `three_d_generate`, `video_to_audio`, `music_generate`, `tts_generate` (text→speech), `transcribe_audio`.
- **web / data / document** - `screenshot_webpage`, `web_to_markdown` (one-shot page → Markdown), `web_fetch` (the full browser surface: `format` of `markdown` / `html` / `links` / `scrape` / `pdf` / `crawl`), `extract_webpage_data`, `web_scrape` (curated Apify scrapers - Instagram, LinkedIn, X, YouTube, G2, Trustpilot, ...), `get_stock_data`, `markdown_to_html` (inline Markdown → `output.html`), `html_to_markdown` (inline HTML → `output.markdown`), `html_to_pdf`.
- **integration** — calls to connected services where a connector is set up: Airtable, Confluence, GitHub, Google (Gmail/Calendar/Drive), HubSpot, Jira, Linear, Microsoft, Monday.com, Notion, Salesforce, Slack. Each takes a `connection` input - use `describe_action(action_id, "connection")` to list the ones available.

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

Either way the run lands in `action_runs` with `surface: "automation"`, so `list_runs` and
the run history show it beside interactive runs. **Every** node with a dedicated kind - the file
nodes, `code`, `http-request`, `run-agent`, `send-notification`, the media nodes, `screenshot`,
`fetch-web`, `extract-data`, `apify-actor` - bridges onto one of these actions underneath, so
they all show up in run history too. Keep using those kinds; they just have a friendlier config
shape, and they keep their own output key names (`output.path`, `output.image_url`) alongside
the action's (`output.output_path`, `output.asset_url`).

Text-conversion actions return their converted text inline rather than creating a file:

- `markdown_to_html` returns `output.html`.
- `html_to_markdown` returns `output.markdown`.

That makes them composable without a temporary file. For example, a Markdown-producing node can
feed `markdown_to_html`, whose HTML can feed `html_to_pdf`:

```yaml
- id: render_html
  uses: action/markdown_to_html
  with:
    markdown: "{{ draft.output.markdown }}"
- id: render_pdf
  uses: action/html_to_pdf
  with:
    html: "{{ render_html.output.html }}"
    output_path: reports/final.pdf
```

The visual automation editor uses the same fields: connect or insert the Markdown node's output
into **Markdown to HTML**, then use its **HTML** output as the inline **HTML** input on **HTML to
PDF**. Use `html_to_markdown` in the opposite direction when a node returns HTML but the next node
needs Markdown. The HTML/Markdown conversion itself is inline; add `write-file` only when you also
want to persist the converted text as a workspace file.

## Tips

- **Search before you run.** Pick model ids from `describe_action`; guessing fails.
- **A queued/running job isn't a failure** - inspect it with `list_runs`; don't re-run it.
- **After a file-producing action succeeds, the file is at `output.output_path`** - that's what to open, embed, or edit next.
- **Read the declared output fields.** Data-producing actions can return inline text or structured data without an `output_path`; pass those fields directly to the next action.
- **File-producing actions use one source file and one output file.** Data-producing actions need not create a file.
- **Don't hand-roll what an action does** - for media, transcription, screenshots, or conversions, an action is more reliable than writing bytes yourself.
