---
name: arg-file-whiteboard
description: Create, read, update, and delete Arg whiteboard files (.whiteboard) — the native infinite-canvas format with shapes, sticky notes, text, tables, sections, and connectors. Load when authoring or editing diagrams, flowcharts, architecture maps, or mind maps.
---

# Whiteboard files (`.whiteboard`)

A freeform 2D canvas of nodes (shapes, sticky notes, text, tables, sections, images) and edges (connectors), stored as React Flow JSON.

**Fetch the full schema before authoring** — it lists every field with a complete example:
https://arg.ai/docs/files/whiteboard/llms.txt

## CRUD

Use your active Arg access method (`arg-mcp` / `arg-cli` / `arg-fuse` — see `arg-core`) and the shared rules in `arg-core`. Whiteboard-specific: read the board first to learn existing nodes and their coordinates; to remove a node, edit the JSON and drop it plus any edges that reference it.

## Schema essentials

Top-level: `version` (use `1`), `viewport` (`{ x, y, zoom }`; `{0,0,1}` is a safe default), `nodes`, `edges`. Every node and edge needs a **unique `id`** (e.g. `n1`, `edge-1`).

**Node** — `id`, `type`, `position` (`{x,y}` canvas px), `width`, `height`, `data` (whose `kind` matches the type).
- `type: "shape"` — `data.shape`: `rectangle` / `rounded-rectangle` / `diamond` / `circle` / `ellipse`; `label`, `fill`, `textColor`.
- `type: "sticky"` — `label`, `fill`, `textColor`.
- `type: "text"` — `label`, `fill` (often `transparent`), `textColor`, `fontSize`.
- `type: "table"` — `rows`, `cols`, `cells` (row-major, length = `rows*cols`), `headerRow`, `fontSize`.
- `type: "section"` — a labelled frame grouping nodes on top of it; set `zIndex: -1` and size it to enclose its contents.

`data` also accepts optional text styling on any node: `fontSize`, `bold`, `italic`, `strikethrough`. Default sizes: shapes `220×132`, circle `156×156`, sticky `220×180`, text `240×96`.

**Edge** — `id`, `source`, `target`, `sourceHandle`/`targetHandle` (`top`/`right`/`bottom`/`left`), `type` (e.g. `smoothstep`), `markerEnd` (`{ type: "arrowclosed", width, height, color }`), optional `data.label`.

## Tips

- Space nodes 200–350px apart; lay flows left→right or top→bottom.
- Use semantic colors — blue=info, green=success, red=urgent, yellow=warning, purple=feature.
- `\n` in a `label` is a line break.
