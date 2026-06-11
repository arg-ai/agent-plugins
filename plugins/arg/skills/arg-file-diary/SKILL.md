---
name: arg-file-diary
description: Create, read, and update Arg diary files (.diary) — a dated journal whose entries are per-day rich-text documents, viewed by day, week, or month. Load when building or editing a journal, daily log, gratitude log, workout log, or travel diary.
---

# Diary files (`.diary`)

A `.diary` is a JSON journal: a map of **per-day entries**, each a rich-text document, shown in a calendar-style editor that pages by day / week / month. The editor multiplexes the day documents behind a date strip; on disk it's a single JSON file you can author directly.

## CRUD

`.diary` is text (JSON) — use the standard MCP tools and shared rules in the `arg-core` skill (`write_file` / `read_file` / `edit_file` / `multi_edit`; `rm`/`mv` to delete/move). Diary-specific:

- **Read the file first** and merge into the existing `entries` map — don't drop days you aren't editing.
- Add or update a day by setting `entries["YYYY-MM-DD"]`; **delete a day** by removing its key from `entries`.
- Write valid, pretty-printed (2-space) JSON. (The diary editor is single-user — it is not a live-collaborative surface.)

## Schema

| Field | Type | Notes |
| --- | --- | --- |
| `version` | number | Use `1`. |
| `granularity` | string | Display grouping: `day` (default), `week`, or `month`. Purely how the editor pages through entries — entries are always keyed by day. |
| `entries` | object | Map of **`"YYYY-MM-DD"` day key → entry document**. Keys must match `^\d{4}-\d{2}-\d{2}$`; invalid keys are dropped on load. |

Each **entry value is a TipTap/ProseMirror document** — `{ "type": "doc", "content": [ …nodes… ] }` — the same rich-text node shape the notes editor uses (`paragraph`, `heading` with `attrs.level`, `bulletList`/`orderedList` + `listItem`, `text` with optional `marks`, etc.). An empty day is `{ "type": "doc", "content": [{ "type": "paragraph" }] }`.

## Example

```json
{
  "version": 1,
  "granularity": "day",
  "entries": {
    "2026-06-10": {
      "type": "doc",
      "content": [
        { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Tuesday" }] },
        { "type": "paragraph", "content": [{ "type": "text", "text": "Kicked off the Arg plugin work." }] }
      ]
    },
    "2026-06-11": {
      "type": "doc",
      "content": [
        { "type": "paragraph", "content": [{ "type": "text", "text": "Shipped the diary skill." }] }
      ]
    }
  }
}
```

## Tips

- Use ISO day keys (`YYYY-MM-DD`) even when `granularity` is `week`/`month` — granularity only changes how the editor buckets and displays days.
- For a single long-form note (not a dated journal), prefer a `.md`/`.mdx` document (`arg-file-document`) instead.
