---
name: arg-file-design
description: Create, read, update, and delete design files in Arg — the native .design vector canvas, plus .svg (round-trips) and .fig (import-only). Load when authoring or editing vector graphics, social graphics, posters, mockups, logos, or slides.
---

# Design files (`.design`, `.svg`, `.fig`)

`.design` is Arg's native vector graphics canvas — shapes, paths, text, and images on one or more artboards, stored as JSON. The same editor opens `.svg` (and re-emits SVG on save) and imports `.fig` (Figma).

**Fetch the full schema before authoring** — it lists every field with a complete example:
https://arg.ai/docs/files/design/llms.txt

## CRUD

Use your active Arg access method (`arg-mcp` / `arg-cli` / `arg-fuse` — see `arg-core`) and the shared rules in `arg-core`. Design-specific: `.design`/`.svg` are text — edit the JSON / SVG markup directly, and reuse the design's existing colors, type, and spacing. **`.fig` is binary and import-only** — read it for structure/tokens, but edits don't write back; to create a Figma-like file from scratch, produce a `.design` or `.svg` instead.

## Schema essentials

Top-level: `version` (use `1`), `canvas` (`{ width, height }`), `artboards` (named rectangles in document space, ≥1), `objects` (flat map of id → object), `order` (array of object ids; **last renders on top**; group children live in the group's `children`, not `order`).

Coordinates are document pixels. Each object has a `frame` `{ x, y, width, height, rotation? }` (top-left origin, rotation in degrees around center).

**Object base fields:** `id` (matches the `objects` key and appears in `order` or a group's `children`), `type`, `name?`, `frame`, `fills` (bottom→top), `strokes`, `effects`, `opacity?` (0–1), `blendMode?`, `visible?`, `locked?`.

**`type` values & type-specific fields:** `rect` (`cornerRadius` number or `{tl,tr,br,bl}`), `ellipse`, `polygon` (`sides` ≥3), `star` (`points`, `innerRatio` 0–1), `line` (`x1,y1,x2,y2`), `path` (`d` SVG path data; `closed`, `fillRule`, `viewBox`), `text` (`text`, `textMode` `point`/`area`, `style`, `color`), `group` (`children` ids; `clipChildren?`).

**Fills:** `solid` (`color`), `linear-gradient` (`angle`, `stops`), `radial-gradient`/`angular`/`diamond` (`cx`,`cy`,`stops`), `image` (`src`, `fit`), `none`.
**Strokes:** `color`, `width`, `dash` (solid/dash/dot), `cap`, `join`, `align`.
**Effects:** `shadow` (`offsetX/Y`,`blur`,`color`,`inner?`), `blur` (`radius`), `glow` (`radius`,`color`).

## Tips

- Put the artboard background in the artboard's `fills`; everything else goes in `objects` with draw order in `order`.
- Keep ids consistent across the `objects` key, the object's own `id`, and `order` / group `children`.
- For `.svg`, edit the markup directly; keep `viewBox` and existing ids/groups/styles intact.
- Common artboard sizes: `1080×1080` (square), `1920×1080` (16:9 slide), `1080×1920` (story), `2480×3508` (A4 @300dpi).
