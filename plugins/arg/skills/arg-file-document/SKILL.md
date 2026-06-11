---
name: arg-file-document
description: Create, read, update, and delete text documents (md, mdx, txt) in Arg, including .mdx notes with Arg's custom JSX components (callouts, toggles, embeds, columns, tabs, math, mentions, and more). Load when authoring or editing any Arg document.
---

# Documents (`.md`, `.mdx`, `.txt`)

Arg's markdown editor is a rich block editor (slash commands, drag-and-drop, inline formatting). It handles three text formats:

- **`.md`** — standard Markdown. Use when you don't need custom blocks.
- **`.mdx`** — Markdown **plus** Arg's JSX components (callouts, toggles, file embeds, columns, tabs, math, …) while staying readable as plain text on disk. Use for notes and docs that mix prose with rich blocks.
- **`.txt`** — plain text. No Markdown syntax — don't add any.

## CRUD

Use your active Arg access method (`arg-mcp` / `arg-cli` / `arg-fuse` — see `arg-core`) and the shared rules in `arg-core` (`grep` / `arg grep` / native search to find content across documents). Document-specific: edit surgically — keep the heading hierarchy, list style, and existing conventions intact. Standard Markdown (headings, paragraphs, lists, code fences, GFM tables, task lists, links, images, blockquotes) works both inside and outside JSX components.

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
  - `id` — **required**, the embedded file's workspace UUID (get it from the file's info).
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
- [x] Draft announcement
- [ ] Schedule social posts
- [ ] Brief support team
</Toggle>

<Columns widths="1,1">
  <Column>Owner: **Alex**</Column>
  <Column>Owner: **Sam**</Column>
</Columns>

<FileEmbed id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" height={320} />
```
