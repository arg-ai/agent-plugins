---
name: arg-file-design
description: Create, read, update, and delete design files in Arg — the native .design vector canvas, plus .svg (round-trips) and .fig (import-only). Also exportable offline via `arg design render` (svg/png/jpg). Load when authoring or editing vector graphics, social graphics, posters, mockups, logos, or slides; for presentation-specific workflow load arg-slides alongside it.
metadata:
  version: "1.5.0"
---

# Design files (`.design`, `.svg`, `.fig`)

`.design` is Arg's native vector graphics canvas — shapes, paths, text, and images on one or more artboards, stored as JSON. The same editor opens `.svg` (and re-emits SVG on save) and imports `.fig` (Figma).

## CRUD

Use your active Arg access method (`arg-mcp` / `arg-cli` — see `arg-files`) and the shared rules in `arg-files`. Design-specific: `.design`/`.svg` are text — edit the JSON / SVG markup directly, and reuse the design's existing colors, type, and spacing. **`.fig` is binary and import-only** — read it for structure/tokens, but edits don't write back; to create a Figma-like file from scratch, produce a `.design` or `.svg` instead.

## Editing library

For `.design` JSON, prefer the bundled dependency-free module at `scripts/document-edit/design.mjs`. It is generated from `@arg-ai/sdk` and preserves unknown fields while cloning every edit. Resolve that path from the installed skill directory. When the workspace is mounted locally, a complete edit looks like:

```js
import { readFile, writeFile } from "node:fs/promises";
import {
  parseDesign,
  patchDesignObject,
  stringifyDesign,
} from "/path/to/arg-file-design/scripts/document-edit/design.mjs";

const path = process.argv[2];
const document = parseDesign(await readFile(path, "utf8"));
const updated = patchDesignObject(document, "title", { text: "Updated title" });
await writeFile(path, stringifyDesign(updated));
```

Use the artboard, object, and shader helpers for relationship-aware edits; `collectDesignFileReferences` and `replaceDesignFillSource` handle linked fills. Use `editDesign` with JSON `set`, `merge`, `delete`, `insert`, or `move` operations for uncommon leaf fields. Every structural helper validates before returning. With MCP or direct CLI access, read and write through that access method instead of `node:fs`; the library itself performs no network or authentication work.

Key call shapes: `addDesignObject(doc, object, { parentId?, index? })`, `moveDesignObject(doc, id, { parentId?, index? })`, and `patchDesignObject(doc, id, patch)`. For auto layout (below): `createDesignFlexGroup(doc, { id, name?, layout?, frame?, children? }, { parentId?, index? })` wraps existing objects in a laid-out group, `setDesignLayout(doc, groupId, layout | null)` and `patchDesignLayout(doc, groupId, patch)` manage the group's `layout`, and `setDesignLayoutSizing(doc, objectId, sizing | null)` sets a child's per-axis sizing. Raw paths are arrays, for example `editDesign(doc, [{ op: "set", path: ["objects", "title", "name"], value: "New name" }])`. Import `common.mjs` directly when you need the shared `JsonEdit` helpers without a format module.

## Schema essentials

Top-level: `version` (use `1`), optional `metadata` (`{ "defaultView": "design" | "creative" | "slides", "sections": [...] }`; use `creative` for social/content graphics that should open in the Canva-style UI, and `slides` for decks), `canvas` (`{ width, height }`), `artboards` (named rectangles in document space, ≥1), `objects` (flat map of id → object), `order` (array of object ids; **last renders on top**; group children live in the group's `children`, not `order`).

Creative view presents artboards as a centered vertical page column in `artboards` array order. That layout is a transient editor projection: keep authoring normal document-space coordinates, and use the array itself to control Creative page order. Switching between Creative and Design views never rewrites artboard or object positions.

**Slides view** treats each artboard as a slide. `metadata.sections` groups them: `[{ "id": "s1", "name": "Intro", "artboardIds": ["hero", "agenda"] }]`. Sections hold artboard **id references only**, so reordering a slide or a section never moves artboard geometry — the same projection rule as Creative view. Omit `sections` and the deck is one implicit section holding every artboard in `artboards` order. When present, `metadata.sections` is the presentation order (not the `artboards` array), every id must name a real artboard, and no artboard may appear in two sections.

For a slide deck, also load `arg-slides`. New decks default to a self-contained `.html` file; that skill covers when a `.design` deck is the right call instead (an editable canvas, or a PowerPoint / PDF hand-off) plus reference-first authoring, live content, presenter workflow, and restrained GLSL motion.

**Presenter notes:** each artboard takes an optional `notes` string holding **MDX** - the same dialect the `.mdx` editor reads, so headings, lists, callouts and embeds all render while editing beside the slide in Slides view. The presenter console shows notes as read-only Markdown, so wiki-style links and file embeds display as plain text there rather than resolving - keep notes meant to be read live plain-text-friendly. The other views carry `notes` through untouched.

**Skipped slides:** set an artboard's optional `skipped` boolean to `true` to keep it editable in its section while omitting it from presentation playback. Omit the field or set it to `false` to include the slide.

Coordinates are document pixels. Each object has a `frame` `{ x, y, width, height, rotation? }` (top-left origin, rotation in degrees around center).

**Object base fields:** `id` (matches the `objects` key and appears in `order` or a group's `children`), `type`, `name?`, `frame`, `fills` (bottom→top), `strokes`, `effects`, `opacity?` (0–1), `blendMode?`, `visible?`, `locked?`, `flipH?`/`flipV?` (booleans that mirror the object's raster fill content - image/video - across its centerline; the Flip commands set these).

**`type` values & type-specific fields:** `rect` (`cornerRadius`: one non-negative number when all four corners are equal, or `{tl,tr,br,bl}` with non-negative values for independent corners; store a plain number again once all four match), `ellipse`, `polygon` (`sides` ≥3), `star` (`points`, `innerRatio` 0–1), `line` (`x1,y1,x2,y2`; optional `markerStart`/`markerEnd` end caps: `arrow` open V / `triangle` solid head / `circle` / `diamond` / `bar`, drawn at the `x1,y1` / `x2,y2` end in the stroke's color, scaling with stroke width — the way to draw a connector/arrow between things), `path` (`d` SVG path data; `closed`, `fillRule`, `viewBox`), `text` (`text`, `textMode` `point` auto-fits width / `area` wraps inside `frame`, `style` with `fontFamily`, `fontSize`, `fontWeight`, `align` `left`/`center`/`right`/`justify` — plus optional `fontStyle`, `textDecoration`, `letterSpacing`, `lineHeight`, `verticalAlign`; glyphs are painted by `fills` — gradients/images work — and outlined by `strokes`; legacy `color` still parses but is folded into `fills` on load), `group` (`children` ids; `clipChildren?`).

**Fills:** Non-file paints are `solid` (`color`), `linear-gradient` (`angle`, `stops`, optional paired `start`/`end` points and `space` `local`/`world`), `radial-gradient`/`angular-gradient`/`diamond-gradient` (`cx`,`cy`,`stops`), internal `shader` (`shaderId` plus optional `values`/`speed` - see below), `webcam` (source-less live camera), and `none`. Every paint backed by a file uses one shape: `{ "type": "file", "fileType": "image"|"model3d"|"video"|"design"|"kml"|"cad"|"shader", "src": "...", "fileId"?: "..." }`; subtype settings stay alongside those common fields (`fit` for image/video/design, `model3d` pose, `kml` settings, `cad` settings, or `speed` for a shader file). Never author the old top-level `image`/`model3d`/`video`/`design`/`kml`/`cad` fill types or `shaderSrc`; the parser accepts and migrates them only for existing documents. Author a workspace path and preserve a valid existing `fileId`, but never invent one. A webcam stores only portable visual fields (`fit`, `mirrored`, `color`, `opacity`, `visible`) and never a device id, label, or stream identifier.
**Image fill `src`:** any workspace path the renderer can display — raster images (`.png`, `.jpg`, `.webp`, `.gif`, `.avif`), `.svg` (rendered natively), `.psd` (live reference: the renderer composites the Photoshop document to a flattened raster at display/export time; edits to the source PSD reflow on reload). On export, `.psd` fills bake to an inline PNG so the output is self-contained. Reference a real workspace path or a data URL; don't invent a path.
**Strokes:** `color`, `width`, `dash` (solid/dash/dot), `cap`, `join`, `align`, and optional `paint` containing a gradient fill. When `paint` is present it paints the stroke; keep `color` as a solid compatibility fallback for line markers and older readers. A linear-gradient stroke paint uses the same `start`/`end` and `space` rules as a fill.

Canvas-anchored gradient stroke: `{ "color": "#7c3aed", "width": 8, "paint": { "type": "linear-gradient", "angle": 90, "space": "world", "start": { "x": 120, "y": 200 }, "end": { "x": 960, "y": 680 }, "stops": [{ "offset": 0, "color": "#7c3aed" }, { "offset": 1, "color": "#06b6d4" }] } }`.
**Effects:** `shadow` (`offsetX/Y`,`blur`,`color`,`inner?`), `blur` (`radius`), `glow` (`radius`,`color`).

## Layout

A `group` can carry a `layout`, and then it positions its own `children` in the Layers hierarchy's visible top-to-bottom order - flexbox/grid, the same model as Figma auto layout. A group's raw `children` array remains painter order (last renders on top), so its last id takes the first layout slot. Prefer `createDesignFlexGroup`, whose `children` option accepts the intended hierarchy/layout order and stores the painter stack correctly. **Reach for layout before hand-computing absolute coordinates:** anything repeated (rows of cards, galleries, stacked slide content) is fewer tokens this way, and re-ordering or resizing re-flows the group instead of forcing you to recompute every `x`.

Inside a laid-out group the child's geometry is **derived** - `frame.x`/`frame.y` always, and `frame.width`/`frame.height` on any axis whose `layoutSizing` is `fill` or `hug`. Omit those numbers entirely; the editor recomputes them on load. A child with `layoutSizing: { "width": "fill", "height": "hug" }` usually needs no `frame` at all. Removing a group's `layout` writes explicit frames onto its children, since their positions were derived until then.

**Flex** - `{ "type": "flex", "direction": "row"|"column", "gap", "rowGap", "padding", "justify", "align", "wrap" }`. `justify` (main axis) is `start`/`center`/`end`/`space-between`/`space-around`/`space-evenly`; `align` (cross axis) is `start`/`center`/`end`/`stretch`. `padding` is one number for all four edges, or `{ "top", "right", "bottom", "left" }`.

```json
{
  "id": "cards",
  "type": "group",
  "frame": { "x": 80, "y": 320, "width": 920, "height": 280 },
  "layout": { "type": "flex", "gap": 24, "padding": 24, "align": "stretch" },
  "children": ["card3", "card2", "card1"]
}
```

Each card is then just `{ "id": "card1", "type": "rect", "cornerRadius": 16, "layoutSizing": { "width": "fill" }, "fills": [...] }` - three equal columns, no coordinates anywhere.

**Grid** - `{ "type": "grid", "columns", "rows", "gap", "rowGap", "columnGap", "padding", "justify", "align", "autoFlow" }`. `columns`/`rows` are either a count (that many equal `1fr` tracks) or explicit tracks `[{ "size": 1, "unit": "fr" }, { "size": 240, "unit": "px" }]` with `unit` `px`/`fr`/`auto`. `rows` may be omitted to generate rows on demand. `justify`/`align` place a child inside its cell (`start`/`center`/`end`/`stretch`), and `autoFlow` (`row`/`column`) picks the axis auto-placement advances along.

```json
{
  "id": "gallery",
  "type": "group",
  "frame": { "x": 60, "y": 200, "width": 960, "height": 640 },
  "layout": { "type": "grid", "columns": 3, "gap": 16, "padding": 32 },
  "children": ["t5", "t4", "t3", "t2", "t1", "hero"]
}
```

`hero` spans the whole first row with `"gridArea": { "column": 1, "columnSpan": 3 }`; the rest auto-place into the cells after it.

**Per-child fields** (on the child object, not the group): `layoutSizing` `{ "width", "height" }` each `fixed` (default - keeps the frame's own number) / `fill` / `hug`; `layoutGrow` (weight when several `fill` siblings split the free space, default 1); `layoutAlign` (this child's override of the container's `align`); `gridArea` `{ "column", "row", "columnSpan", "rowSpan" }`, 1-based, to pin a child instead of auto-placing it.

**Omit anything that equals its default.** Every one of `opacity` (1), `visible` (true), `locked` (false), `flipH`/`flipV` (false), `frame.rotation` (0), `fills`, `strokes` and `effects` is optional, and an absent value reads as the default everywhere - so `"opacity": 1` and `"effects": []` are pure token cost. Author the difference from the default, not the whole shape.

Measured on a 3×2 gallery of six tiles: 1317 characters of minified JSON hand-placed with the defaults spelled out, 921 with the defaults dropped, 791 as a grid group whose tiles carry no `frame` at all - 40% smaller end to end. A layout group has a fixed cost of its own, so it is roughly break-even for two or three one-off objects and pulls ahead from there.

Minimal document - an artboard (background in its `fills`) and a laid-out column holding a title and a gradient card:

```json
{
  "version": 1,
  "metadata": { "defaultView": "creative" },
  "canvas": { "width": 1080, "height": 1080 },
  "artboards": [
    {
      "id": "art1",
      "name": "Poster",
      "x": 0,
      "y": 0,
      "width": 1080,
      "height": 1080,
      "fills": [{ "type": "solid", "color": "#ffffff" }]
    }
  ],
  "objects": {
    "stack": {
      "id": "stack",
      "type": "group",
      "name": "Poster stack",
      "frame": { "x": 120, "y": 200, "width": 840, "height": 640 },
      "layout": { "type": "flex", "direction": "column", "gap": 32 },
      "children": ["card", "title"]
    },
    "title": {
      "id": "title",
      "type": "text",
      "text": "Hello, world",
      "textMode": "area",
      "layoutSizing": { "width": "fill", "height": "hug" },
      "fills": [{ "type": "solid", "color": "#0a0a0a" }],
      "style": {
        "fontFamily": "Inter, system-ui, sans-serif",
        "fontSize": 72,
        "fontWeight": 700
      }
    },
    "card": {
      "id": "card",
      "type": "rect",
      "name": "Hero card",
      "layoutSizing": { "width": "fill", "height": "fill" },
      "cornerRadius": 24,
      "fills": [
        {
          "type": "linear-gradient",
          "angle": 135,
          "stops": [
            { "offset": 0, "color": "#7c3aed" },
            { "offset": 1, "color": "#ec4899" }
          ]
        }
      ],
      "effects": [
        { "type": "shadow", "offsetX": 0, "offsetY": 16, "blur": 32, "color": "rgba(0,0,0,0.25)" }
      ]
    }
  },
  "order": ["stack"]
}
```

## Shader fills

A `{ "type": "shader" }` fill paints any shape or artboard with a live WebGL fragment shader. Define shaders once in a top-level `"shaders"` map, then reference by id from any number of fills.

**Shader fill fields:** `shaderId` (key into `shaders` map), `values` (per-fill uniform overrides — omit to use defaults), `speed` (uTime multiplier; 0 freezes animation), `opacity`.

**Shader document entry:** `{ "id", "name", "source", "uniforms": [...] }`. Each uniform: `{ "name", "label", "type": "color"|"float"|"vec2"|"bool", "default", "min"?, "max"?, "step"? }`. Write `source` as `vec4 surface(vec2 uv) { ... return vec4(rgb, 1.0); }` — standard uniforms `uResolution` (vec2), `uTime` (float), the `vUv` varying, and helpers `fbm(vec2)` / `vnoise(vec2)` / `hash21(vec2)` are always available. Never redeclare auto-injected uniforms.

**Uniform value types:** color = hex string (`"#0063b4"`), float = number, vec2 = `{ "x": 0.5, "y": 0.5 }` (0..1), bool = true/false.

**7 built-in shaders** — reference by id without a `shaders` entry: `builtin-water-caustic`, `builtin-moire`, `builtin-nebula`, `builtin-glowing-wave`, `builtin-pattern-grid`, `builtin-fractal-noise`, `builtin-concentric`. Copy one into `shaders` (with a new id) to make it editable.

**Workspace file shaders** — use `{ "type": "file", "fileType": "shader", "src": "/path/to/file.glsl", "speed": 1 }` (`.glsl`/`.frag`/`.shadertoy`). The fill stays linked to the file and has no `shaderId`/`values`; those belong only to an internal `shader` fill. Shadertoy files use the `iResolution`/`iTime`/`void mainImage(out vec4 fragColor, in vec2 fragCoord)` convention.

Shader fills bake to a static raster on SVG/PNG/JPEG export.

## Nested design fills

A `{ "type": "file", "fileType": "design" }` fill paints a shape with another workspace `.design` document — a live reference, not a copy. Editing the referenced file updates every shape painted by it, and the same file used N times is fetched and parsed once.

**Fields:** `src` (workspace path of the `.design` file, e.g. `"/boards/logo.design"`), `artboardId` (which artboard of that document to paint; omit for the first), `fit` (`contain` default — shows the whole artboard letterboxed — plus `cover` and `fill`), `opacity`, `visible`, and the UI-managed `fileId`.

Unlike every other dynamic fill, this one is **not** baked to a raster on export: a `.design` document already serializes to SVG, so the referenced artboard is inlined as real vector inside a clipped, transformed group. Its own image, shader, 3D, video and map fills are resolved first, so nested content survives the export intact.

Nesting is bounded. A document that paints itself - directly, or through a chain of references - is refused rather than recursed into, and references more than 4 levels deep are dropped; both cases show a placard on canvas instead of content. Point a fill at a different file than the one you are editing.

```json
{
  "type": "file",
  "fileType": "design",
  "src": "/boards/logo.design",
  "artboardId": "art1",
  "fit": "contain"
}
```

## KML map fills

A `{ "type": "file", "fileType": "kml" }` fill paints a shape with a workspace `.kml`/`.kmz` document rendered as a map - a raster basemap under the document's points, lines and polygons.

**Fields:** `src` (workspace path of the `.kml`/`.kmz` file), `kml` (the view and styling settings below), `opacity`, `visible`, and the UI-managed `fileId`.

**`kml` settings:** `basemap` (`none`/`light`/`dark`/`streets`/`satellite`/`satellite-labels`), `fitBounds` (true auto-frames the document's extent; false uses `centerLng`/`centerLat`/`zoom`), `centerLng`, `centerLat`, `zoom` (0–22), `padding` (px around the fitted bounds, 0–256), `background` (hex, painted under the basemap), `strokeWidth` (0.25–8 multiplier), `pointRadius` (0–40 px), `showLabels`, `labelColor` (hex or `null` to follow each feature), `labelOutlineColor` (hex, default `#ffffff`, or `null` to follow `background`), `labelOutlineWidth` (0–8 px), `labelFontSize` (8–48 px), and `basemapOpacity` (0–1). A placemark's own KML `<LabelStyle><color>` overrides `labelColor`. Out-of-range values are clamped on load, so a partial settings object is safe.

Map fills bake to a static image on SVG/PNG/JPEG export, the same way `model3d` and `video` fills do.

```json
{
  "type": "file",
  "fileType": "kml",
  "src": "/maps/route.kml",
  "kml": { "basemap": "light", "fitBounds": true, "padding": 24, "showLabels": true }
}
```

## CAD drawing fills

A `{ "type": "file", "fileType": "cad" }` fill paints a shape with a workspace `.cad` document drawn as a still - either its plan (the drawing plane) or the view through one of the document's saved cameras. Only the exact `.cad` format works; `.dxf`/`.dwg` are a different format this fill cannot read.

**Fields:** `src` (workspace path of the `.cad` file), `cad` (the view and styling settings below), `opacity`, `visible`, and the UI-managed `fileId`.

**`cad` settings:** `view` (`plan` or `camera`), `cameraId` (which saved camera `camera` looks through; `null` uses the document's first, and a document with no cameras falls back to the plan), `style` (`technical` / `blueprint` / `sketch` / `mono` / `night`), `level` (a storey id to draw on its own, or `null` for every level), `padding` (px around the fitted drawing, 0–256), `zoom` (0.1–16 multiplier over the fit), `lineWidth` (0.1–8 multiplier on every stroke), `showText` (room names, labels, dimension strings), `showFills` (false is a pure line drawing), and `background` (hex paper colour, or `null` to use the style preset's own paper - which is what makes `blueprint` look like a blueprint). Out-of-range values are clamped on load, so a partial settings object is safe.

Drawing fills bake to a static image on SVG/PNG/JPEG export, the same way `kml`, `model3d` and `video` fills do.

```json
{
  "type": "file",
  "fileType": "cad",
  "src": "/plans/house.cad",
  "cad": { "view": "plan", "style": "blueprint", "padding": 32, "showText": true }
}
```

```json
{
  "shaders": {
    "myCaustic": {
      "id": "myCaustic",
      "name": "Pool caustic",
      "source": "vec4 surface(vec2 uv){ vec2 p=(uv-uOrigin)*8.0; float v=0.0; for(int i=0;i<4;i++){v+=sin(p.x*1.3+uTime+float(i))*cos(p.y*1.1-uTime*0.8);p*=1.4;} v=abs(v)/4.0; return vec4(mix(uWater,uHighlight,pow(1.0-v,mix(1.0,6.0,uIntensity))),1.0); }",
      "uniforms": [
        { "name": "uWater", "label": "Water", "type": "color", "default": "#0063b4" },
        { "name": "uHighlight", "label": "Highlight", "type": "color", "default": "#cdf5ff" },
        {
          "name": "uIntensity",
          "label": "Intensity",
          "type": "float",
          "default": 0.5,
          "min": 0,
          "max": 1,
          "step": 0.01
        },
        { "name": "uOrigin", "label": "Origin", "type": "vec2", "default": { "x": 0.5, "y": 0.5 } }
      ]
    }
  },
  "objects": {
    "card": {
      "id": "card",
      "type": "rect",
      "frame": { "x": 0, "y": 0, "width": 600, "height": 400 },
      "fills": [
        { "type": "shader", "shaderId": "myCaustic", "values": { "uIntensity": 0.8 }, "speed": 1 }
      ]
    }
  },
  "order": ["card"]
}
```

## CLI render (`arg design render`)

Export a `.design` to a local file without opening the browser editor. Uses the exact same web exporters the editor's Export button uses.

```
arg design render poster.design                     # → poster.png (2x scale)
arg design render poster.design --format svg -o out.svg
arg design render poster.design --all-artboards     # → poster.zip (one file per artboard)
arg design render poster.design --artboard "Hero"   # → poster.png (single artboard by name)
```

Flags: `--format svg|png|jpg` (default png), `--scale <n>` (default 2), `--quality <0..1>` (jpeg, default 0.92), `--artboard <index|name>` (single artboard), `--all-artboards` (zip), `--outline-text`, `--include-id`, `--no-bounding-box`, `--ignore-overlapping`, `--color-profile document|srgb|display-p3` (default srgb). Referenced image/shader/3D fills are fetched from the workspace automatically. Run `arg design render install` once to provision the headless browser.

## Convert to Photoshop (`design_to_psd` action)

Run the `design_to_psd` action to turn a `.design` into a layered `.psd`. Text objects and solid rect/ellipse/line shapes arrive as live, editable Photoshop text and vector-shape layers. An axis-aligned shape whose only paint is an image fill keeps the complete source image in its raster layer and gets a Photoshop layer mask for the shape, so cover/crop overhang can be reframed after conversion without changing the initial composition. Rotated or mirrored shapes, tiles, mixed fills or strokes, baked effects, and unusually large off-mask images use the existing tight raster fallback. Shader, video, and 3D fills remain baked raster layers rather than being presented as original image pixels.

A `.psd` holds one canvas, so the artboard is the unit of conversion: pass `artboard` (index or name) for a single `.psd`, or omit it and a multi-artboard document comes back as a `.zip` with one `.psd` per artboard. The action writes ONE file and overwrites what is already at that path; `output_path` is optional and its extension is replaced with whatever the conversion produced (`.psd` or `.zip`), since that depends on the artboard count.

The right-click menu of a `.design` file runs the same converter but saves differently: one `.psd` sibling per artboard, each on a fresh non-colliding path, never a `.zip` and never overwriting an existing file.

The whole result travels back through a memory-bounded browser session, so a very large conversion is rejected up front - convert an artboard at a time with `artboard`, and keep `scale` low (a scaled artboard over 30000 px on either side is past Photoshop's canvas limit).

## Tips

- Put the artboard background in the artboard's `fills`; everything else goes in `objects` with draw order in `order`.
- Keep ids consistent across the `objects` key, the object's own `id`, and `order` / group `children`.
- There is no `image` object type - place a photo by giving a shape (usually a `rect`) a file fill (`{ "type": "file", "fileType": "image", "src", "fit" }`, with `fit` `cover`/`contain`/`fill`/`tile`/`crop`). Valid `src` values: any workspace image path (`.png`, `.jpg`, `.webp`, `.gif`, `.avif`), `.svg` workspace paths, `.psd` workspace paths (live reference - composited to a raster at display/export time), or a data URL. Don't invent a path.
- `rect` corner radius UI: the Properties panel's frame icon toggles between the single-radius input and the 2×2 per-corner grid. Dragging a canvas corner grip rounds all corners together; hold Option (macOS) / Ctrl (Windows) to round only the dragged corner.
- `line` endpoints (`x1,y1,x2,y2`) and `path` `d` coordinates are relative to the object's `frame` origin, not document space — reposition the whole object by moving its `frame`, not by rewriting the point coords.
- For `.svg`, edit the markup directly; keep `viewBox` and existing ids/groups/styles intact. On open the editor parses standard primitives (`rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `text`, `image`, `g` + nested transforms) and re-emits SVG on save.
- Common artboard sizes: `1080×1080` (square), `1920×1080` (16:9 slide), `1080×1920` (story), `2480×3508` (A4 @300dpi).
