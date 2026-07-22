---
name: arg-file-document
version: "1.2.0"
description: Create, read, update, and delete Arg documents — .md/.mdx/.txt text docs with Arg's custom JSX components (callouts, toggles, embeds, columns, tabs, math, mentions, …), .diary dated journals, and .form shareable forms/surveys. Load when authoring or editing any Arg document, note, journal/daily log, or form.
---

# Documents (`.md`, `.mdx`, `.txt`, `.diary`, `.form`)

Arg's markdown editor is a rich block editor (slash commands, drag-and-drop, inline formatting). This skill covers five related text formats, all authored as plain text on disk:

- **`.md`** — standard Markdown. Use when you don't need custom blocks.
- **`.mdx`** — Markdown **plus** Arg's JSX components (callouts, toggles, file embeds, columns, tabs, math, …) while staying readable as plain text on disk. Use for notes and docs that mix prose with rich blocks.
- **`.txt`** — plain text. No Markdown syntax — don't add any.
- **`.diary`** — a dated JSON journal: a map of per-day rich-text entries, paged by day / week / month. See [Diary files](#diary-files-diary).
- **`.form`** — an MDX document with fillable form-field components; shared externally to collect responses as rows. See [Form files](#form-files-form).

## CRUD

Use your active Arg access method (`arg-mcp` / `arg-cli` — see `arg-files`) and the shared rules in `arg-files` (`grep` / `arg grep` / native search to find content across documents). Document-specific: edit surgically — keep the heading hierarchy, list style, and existing conventions intact. Standard Markdown (headings, paragraphs, lists, code fences, GFM tables, task lists, links, images, blockquotes) works both inside and outside JSX components.

## MDX custom components

`.mdx` documents may use the JSX components below. They are **case-sensitive PascalCase** — `<callout>` or `<note>` is not recognized. Numeric and boolean props use braces (`height={400}`, `open`); string props use quotes (`type="tip"`). **Void** components self-close (`<X … />`); **block** components have open/close tags and wrap inner Markdown.

### Page chrome (place at the very top, in this order)

- **`<CoverImage />`** — void. Full-width page banner (Notion-style), pinned to the top as the first block.
  - `src` — workspace-relative path (`/uploads/cover.png`) or absolute URL.
  - `gradient` — predefined key instead of `src` (mutually exclusive): `coral` `amber` `sky` `blush` `mint` `bubblegum` `ember` `haze` `twilight` `orchid` `forest` `plum` `dusk` `slate`.
  - `position` — number `0`–`100`, vertical focal point of the cropped image. Omit to center.
- **`<FileIcon />`** — void. Page icon above the title; place right after `<CoverImage>`.
  - `icon` — an emoji character (`😎`) or an `icon:Name` Lucide reference.

### Blocks

- **`<Callout>…</Callout>`** — block. Highlighted admonition.
  - `type` — `note` (default) `info` `tip` `warning` `check` `danger` `important`.
  - `color` — `gray` `blue` `cyan` `teal` `green` `lime` `yellow` `amber` `orange` `red` `pink` `purple` `indigo`.
  - `emoji` — emoji character or `icon:Name`.
- **`<Toggle>…</Toggle>`** — block (renders as `<details>`). Collapsible section.
  - `title` — summary text (default `"Toggle"`).
  - `open` — boolean; render expanded (default `false`).
- **`<TableOfContents />`** — block void. Auto-generated table of contents from the document's headings.
  - `title` — heading shown above the list (default `""`, none).
  - `skipFirstHeading` — boolean (default `false`).
  - `minLevel` / `maxLevel` — heading levels to include (default `1` / `6`).
  - `font` — `sans` (default) / `serif` / `mono`.
  - `align` — `left` (default) / `center` / `right`.
  - `markers` — `bullets` (default) / `none`.
- **`<PromptTemplate>…</PromptTemplate>`** — block. No props. Body supports `{{variable}}` placeholders.
- **`<EmailTemplate>…</EmailTemplate>`** — block. All props optional strings: `to`, `cc`, `bcc`, `subject`.
- **`<FileEmbed />`** — void. Embeds another workspace file inline.
  - `path` — **required**. Write the workspace path (e.g. `clips/intro.mp4`). On load the editor records the file's stable id (`argfile_<uuid>`) alongside it, round-tripping as `path="clips/intro.mp4" id="argfile_…"` — the path stays readable and the id makes the embed survive renames/moves. (A legacy `id="<path or argfile_…>"` is still accepted, but prefer `path`.)
  - `height` — number, px.
  - `collapsed` — boolean (default `false`).
  - `fit` — `contain` (default) or `cover` (how an image/video sits in the box).
  - `autoplay` / `muted` / `loop` — booleans for video embeds (default `false`).
  - `widgetHeader` — boolean, show the embed's header bar (path + refresh/open/settings); default `true`.
  - `chromeTop` / `chromeLeft` / `chromeRight` — booleans, show the embedded editor's top toolbar / left sidebar / right inspector; default `true`.
  - `interactive` — boolean, let pan/zoom/play/scroll reach the embedded editor; default `false`.
  - `editable` — boolean, render the embed read-write and persist edits; default `false`.
  - `pathDisplay` — `full` (default) or `name`.
  - `mediaMode` — `zoom` or `playback` (default) for image/video embeds.
  - `pptxView` — `direct` or `viewport` (default) for `.pptx` embeds.
  - `codeView` — `code`, `rendered`, or `both` for code/HTML embeds.

### Layout

- **`<Tabs>…</Tabs>`** — block. Wraps `<Tab>` children.
  - `activeTab` — number, initially-selected index (default `0`).
- **`<Tab>…</Tab>`** — block. A single tab inside `<Tabs>`.
  - `title` — tab label (default `"Tab"`).
- **`<Columns>…</Columns>`** — block. Wraps 1–5 `<Column>` children in a horizontal grid.
  - `widths` — comma-separated relative track widths (e.g. `"1,2"` or `"0.4,0.6"`); omit for equal columns.
- **`<Column>…</Column>`** — block. A single column. No props.

### Inline

- **`<Icon />`** — inline void. `name` — a Lucide icon name (e.g. `Sparkles`).
- **`<InlineMath />`** — inline void. `latex` — a KaTeX expression (e.g. `x^2`).
- **`<Mention />`** — inline void. An `@`-mention of a workspace file/folder, a user, or a date.
  - `kind` — `user` / `file` / `folder` / `date`.
  - `target` — the referenced id (`user_…`, a file/folder path/id) or, for a date, an ISO datetime.
  - `label` — display text.
  - Date-only options: `endDate` (ISO), `dateFormat` (default `"relative"`), `includeTime` (boolean, default `false`), `timeFormat` (default `"12h"`), `timezone`, `remind` (default `"none"`).
- **`<Citation />`** — inline void. Circled-number chip linking back to a cited transcript moment (used in meeting summaries).
  - `n` — number (the chip's number).
  - `quote` — the cited text.
  - `startMs` — number, transcript offset in ms.
  - `source` — e.g. `transcript`.

### Media & meeting

- **`<UrlEmbed />`** — void. Iframe embed for a third-party URL. `url` — required. Auto-recognizes YouTube, Vimeo, Loom, TikTok, Spotify, SoundCloud, Figma, CodePen, CodeSandbox, GitHub Gist, Twitter/X, Reddit, Instagram, Facebook, LinkedIn, Pinterest, GIPHY, Google Maps, Canva, Miro, Typeform, Tally, Replit, Streamlit, Excalidraw, Framer, Tableau, InVision; unknown providers render as a compact link card.
- **`<Bookmark />`** — void. Rich link-preview card. `url` — required; `title`, `description`, `image`, `favicon`, `siteName` optional (auto-populated on first render if omitted); `align` (default `"left"`).
- **`<Math />`** — block void. Block-level KaTeX equation. `latex` — the expression; `align` (default `"center"`).
- **`<Audio />`** — block void. Playback for an existing workspace audio file. `src` — workspace audio path; `mime` (e.g. `audio/mpeg`); `durationMs` — number.
- **`<Recording />`** — block void. A persistable meeting-recording card (Notes / Transcript / Summary tabs).
  - Content: `title`, `notes`, `transcript`, `summary`, `citations`, `audioPath`, `audioMime`, `durationMs`.
  - Behavior: `instructions` (default `"auto"`), `transcriptionProvider` (default `"deepgram"`), `phase` — `new` (default) or `recorded`, `autostart` (boolean, default `false`), `keepAudio` (boolean, default `true`), `timestamps` (boolean, default `true`).

### Raw-HTML constructs

A couple of editor features round-trip as raw HTML rather than JSX:

- **Collapsible heading** — `<h2 data-collapsible="true">…</h2>` (works for h1/h2/h3); add `data-collapsed="true"` to start collapsed. Hides following blocks until the next heading of the same or shallower level.
- **Non-decimal ordered lists** — `<ol data-list-type="lower-alpha|upper-alpha|lower-roman|upper-roman"><li>…</li></ol>`. Decimal lists stay as plain `1. 2. 3.` Markdown.

## Rules

- Component names are case-sensitive PascalCase.
- **Frontmatter (`---` blocks) is not supported** and is lost on save — put metadata in a leading paragraph or `<Callout>`.
- `import` / `export` statements and `{js expressions}` outside attribute values are not interpreted — they round-trip as literal text.
- Unknown JSX components are preserved but render as a placeholder; prefer the components above.

## Example `.mdx`

```mdx
<FileIcon icon="🚀" />

# Launch checklist

Tracking the Q3 launch.

<Callout type="tip" color="green">
  This page is the source of truth — update it as items move.
</Callout>

<Toggle title="Pre-launch tasks" open>
  - [x] Draft announcement - [ ] Schedule social posts - [ ] Brief support team
</Toggle>

<Columns widths="1,1">
  <Column>Owner: **Alex**</Column>
  <Column>Owner: **Sam**</Column>
</Columns>

<FileEmbed path="reports/q3-launch.pdf" height={320} />
```

## Diary files (`.diary`)

A `.diary` is a JSON journal for daily logs, gratitude/workout logs, or travel diaries — a single file paged by day / week / month in the editor. For one long-form note (not dated), use `.md`/`.mdx` instead.

Three top-level fields: `version` (always `1`), `granularity` (`day` default / `week` / `month` — display only, entries are always keyed by day), and `entries` — a map of `"YYYY-MM-DD"` key → **MDX string** (same format as `.mdx` above: markdown + JSX components; encode newlines as `\n`). Keys must match `^\d{4}-\d{2}-\d{2}$`; blank/invalid entries are dropped, so an empty day is just an omitted key.

Read the file first and merge into the existing `entries` map (don't drop days you aren't editing); add/update a day by setting its key, delete one by removing it.

```json
{
  "version": 1,
  "granularity": "day",
  "entries": {
    "2026-06-10": "## Tuesday\n\nKicked off the Arg plugin work.\n\n<Callout type=\"tip\">Ship the diary skill tomorrow.</Callout>",
    "2026-06-11": "Shipped the diary skill."
  }
}
```

## Form files (`.form`)

A `.form` file is an MDX document (same syntax and custom components as `.mdx`, above) that defines a fillable form. The owner shares it externally so people submit responses; every response is saved as one flat row and can be exported as CSV (optionally mirrored to a workspace CSV). Use `.form` for forms, surveys, questionnaires, intake/signup/RSVP forms, and feedback collectors.

### CRUD

Use your active Arg access method and the shared rules in `arg-files`. The file is plain MDX text — read it first, then edit the field components in place rather than rewriting the document.

### Field components

On top of the normal MDX vocabulary above, `.form` files add these components:

| Component                                                                                      | Props                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<FormInput type="text" name="email" label="Email" required />`                                | `name` (required — the CSV column key, lower_snake_case), `label` (question text), `type` (text \| email \| number \| tel \| url \| date \| time \| checkbox \| country \| yesno \| color; default text — `country` is a searchable country dropdown, `yesno` renders fixed Yes/No buttons, `color` renders a color swatch picker), `placeholder` (text-like inputs only), `required` (shorthand). `type="number"` also takes `min`/`max`/`step`; `type="date"` takes `dateRange="future"` or `"past"`.                                                                                                                                                                                                                                  |
| `<FormTextarea name="message" label="Message" />`                                              | Multi-line paragraph answer. `name`, `label`, `placeholder`, `required`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `<FormSelect name="topic" options="Sales, Support" />`                                         | Dropdown (pick one). `name`, `label`, `required`, plus `options` (comma-separated choices).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `<FormCheckboxGroup name="interests" options="Design, Code" />`                                | Checkbox list (pick several). `name`, `label`, `required`, plus `options`. Ticked options are stored as one comma-separated value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `<FormRating name="rating" label="Rating" max={5} />`                                          | Star rating from 1 to `max` (default 5, capped at 10). `name`, `label`, `required`, `max`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `<FormScale name="nps" label="How likely?" min={0} max={10} />`                                | Linear scale of buttons from `min` to `max` (default 1-5). `name`, `label`, `required`, `min`, `max`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `<FormSlider name="budget" label="Budget" min={0} max={100} step={5} />`                       | Range slider. `name`, `label`, `required`, `min` (default 0), `max` (default 100), `step` (default 1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `<FormRank name="priorities" label="Rank these" options="Speed, Price, Quality" />`            | Drag-to-reorder ranking. `name`, `label`, `required`, plus `options`. Submitted value is the options in the chosen order (comma-separated).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `<FormMatrix name="feedback" label="Rate each" rows="Speed, Price" options="Bad, OK, Good" />` | Grid of single-select rows. `name`, `label`, `required`, plus `rows` (the questions) and `options` (the shared columns). Value is `row: column` segments joined by "; ".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `<FormScheduler name="meeting_time" label="Pick a time" calendar="/team.ics" duration={30} />` | Calendly-style date + time slot picker; the value is the picked slot's start (ISO 8601 UTC). `name`, `label`, `required`, plus `calendar` (optional workspace path of an `.ics` — its events block times and booked slots are written back into it, so a slot can only be taken once, and when the respondent's email is known (an email question or an email-gated share) they get a confirmation email with a calendar invite while the share's creator is notified; without it, times are informational and not reserved), `duration` (minutes, default 30), `windowDays` (default 14, max 90), `hours` ("09:00-17:00" default), `days` ("1,2,3,4,5" default, 0 = Sunday), `timeZone` (IANA, default UTC — set the host's real zone). |
| `<FormStep title="About you" />`                                                               | Page break: splits the form into steps shown one at a time with Back/Next navigation and a progress header. Everything before the first break is step 1; each break starts the next step (`title` names it). Responses still land in one flat row.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `<FormSubmit label="Submit" />`                                                                | `label` (optional button text). Include exactly one, at the end (on the last step when using `<FormStep>`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### Form rules

- Pick the component by answer shape: `<FormInput type="…">` for single-value inputs, `<FormTextarea>` for paragraphs, `<FormSelect>` pick-one, `<FormCheckboxGroup>` pick-several, `<FormRating>`/`<FormScale>`/`<FormSlider>` for numeric ratings/scales/sliders, `<FormRank>` for ranking, `<FormMatrix>` for a grid of single-select rows, `<FormScheduler>` when the form books a meeting/appointment time (link the host's `.ics` via `calendar` so busy times are excluded and picked slots are reserved), and `<FormStep>` breaks (2-4 steps) to split a long form into pages.
- Every field needs a unique `name` — it becomes the CSV column the answers land in.
- Include exactly one `<FormSubmit />` so the form can be submitted.
- Title and explain the form with ordinary markdown (heading + a short intro) around the fields.
- The owner enables collection and picks the audience (and optionally a CSV mirror) when they create the share link; you only author the form itself.

```mdx
# Contact us

Tell us how we can help and we'll get back to you.

<FormInput type="text" name="full_name" label="Full name" required />
<FormInput type="email" name="email" label="Email" required />

<FormStep title="Your message" />

<FormSelect name="topic" label="Topic" options="Sales, Support, Feedback" />
<FormTextarea name="message" label="Message" placeholder="How can we help?" required />

<FormSubmit label="Send" />
```
