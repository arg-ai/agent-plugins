---
name: arg-actions
version: "1.0.0"
description: Run Arg's built-in actions — operations that generate or transform workspace files (image/video/3D/audio/music generation and editing, image crop/resize/recolor, transcription, web screenshot, web/social scraping — Instagram/LinkedIn/X/YouTube/reviews via web_scrape, html→pdf/image, stock data, connected-service calls). Load when a task is better done by an Arg action than by hand — e.g. "generate an image", "make a video", "transcribe this audio", "screenshot a page", "convert html to pdf". Driven by four tools: search_actions, describe_action, run_action, list_runs.
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
| `run_action`      | Run one by id with its `input`. Returns the result, or a `run_id` to poll for long jobs.      |
| `list_runs`       | Check past/in-flight runs — status, progress, output file. Poll long jobs here.               |

**Flow:** `search_actions` → `describe_action` (when you need a field's choices or the exact inputs) → `run_action` → `list_runs` (for long jobs).

### 1. Find it — `search_actions`

```
search_actions({ query: "generate image" })
search_actions({ category: "video" })   // image | video | audio | 3d | document | web | data | integration | file
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
- You may get back `{ status: "succeeded", output }` immediately — `output.output_path` is the saved file. Open it like any workspace file.
- **Long/provider-backed jobs** (e.g. `image_generate`, `image_edit`, `image_upscale`, `vectorize_image`, `video_generate`, `three_d_generate`) return `{ run_id, status: "queued" }` instead — poll it with `list_runs`.
- **Write actions need workspace write access** — a read-only session can't run them.

### 4. Poll long jobs — `list_runs`

```
list_runs({ run_id: "<id from run_action>" })   // one run: status + progress + output
list_runs({ status: "running" })                // everything in flight
```

Poll the `run_id` until `status` is `succeeded` (the file is at `output.output_path`) or `failed` (read `error`). Runs also report live `progress`.

## What you can run (search_actions is authoritative)

A sampling — there are more:

- **image** — `image_generate`, `image_edit`, `image_upscale`, `vectorize_image`, `html_to_image` (render HTML → png/jpeg/webp), plus `image_crop` / `image_resize` / `image_recolor` / `image_metadata` / `image_blank`.
- **video / 3d / audio** — `video_generate` (text/image/video→video; also drives audio-driven avatar / lip-sync models like Kling AI Avatar - pass the portrait as `source_path` and the voice track as `audio_path`), `three_d_generate`, `video_to_audio`, `music_generate`, `tts_generate` (text→speech), `transcribe_audio`.
- **web / data / document** — `screenshot_webpage`, `web_to_markdown`, `extract_webpage_data`, `get_stock_data`, `html_to_pdf`.
- **integration** — calls to connected services where a connector is set up: Airtable, Confluence, GitHub, Google (Gmail/Calendar/Drive), HubSpot, Jira, Linear, Microsoft, Monday.com, Notion, Salesforce, Slack. Each takes a `connection` input - use `describe_action(action_id, "connection")` to list the ones available.

## Tips

- **Search before you run.** Pick model ids from `describe_action`; guessing fails.
- **A queued/running job isn't a failure** — poll `list_runs`, don't re-run it.
- **After success, the file is at `output.output_path`** — that's what to open, embed, or edit next.
- **One file in, one file out** per action.
- **Don't hand-roll what an action does** — for media, transcription, screenshots, or conversions, an action is more reliable than writing bytes yourself.
