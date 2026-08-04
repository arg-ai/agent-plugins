---
name: arg-file-design
version: "1.1.6"
description: Create, read, update, and delete design files in Arg — the native .design vector canvas, plus .svg (round-trips) and .fig (import-only). Also exportable offline via `arg design render` (svg/png/jpg). Load when authoring or editing vector graphics, social graphics, posters, mockups, logos, or slides.
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

Key call shapes: `addDesignObject(doc, object, { parentId?, index? })`, `moveDesignObject(doc, id, { parentId?, index? })`, and `patchDesignObject(doc, id, patch)`. Raw paths are arrays, for example `editDesign(doc, [{ op: "set", path: ["objects", "title", "name"], value: "New name" }])`. Import `common.mjs` directly when you need the shared `JsonEdit` helpers without a format module.

## Schema essentials

Top-level: `version` (use `1`), optional `metadata` (`{ "defaultView": "design" | "creative" }`; use `creative` for social/content graphics that should open in the Canva-style UI), `canvas` (`{ width, height }`), `artboards` (named rectangles in document space, ≥1), `objects` (flat map of id → object), `order` (array of object ids; **last renders on top**; group children live in the group's `children`, not `order`).

Coordinates are document pixels. Each object has a `frame` `{ x, y, width, height, rotation? }` (top-left origin, rotation in degrees around center).

**Object base fields:** `id` (matches the `objects` key and appears in `order` or a group's `children`), `type`, `name?`, `frame`, `fills` (bottom→top), `strokes`, `effects`, `opacity?` (0–1), `blendMode?`, `visible?`, `locked?`, `flipH?`/`flipV?` (booleans that mirror the object's raster fill content - image/video - across its centerline; the Flip commands set these).

**`type` values & type-specific fields:** `rect` (`cornerRadius` number or `{tl,tr,br,bl}`), `ellipse`, `polygon` (`sides` ≥3), `star` (`points`, `innerRatio` 0–1), `line` (`x1,y1,x2,y2`; optional `markerStart`/`markerEnd` end caps: `arrow` open V / `triangle` solid head / `circle` / `diamond` / `bar`, drawn at the `x1,y1` / `x2,y2` end in the stroke's color, scaling with stroke width — the way to draw a connector/arrow between things), `path` (`d` SVG path data; `closed`, `fillRule`, `viewBox`), `text` (`text`, `textMode` `point` auto-fits width / `area` wraps inside `frame`, `style` with `fontFamily`, `fontSize`, `fontWeight`, `align` `left`/`center`/`right`/`justify` — plus optional `fontStyle`, `textDecoration`, `letterSpacing`, `lineHeight`, `verticalAlign`; glyphs are painted by `fills` — gradients/images work — and outlined by `strokes`; legacy `color` still parses but is folded into `fills` on load), `group` (`children` ids; `clipChildren?`).

**Fills:** `solid` (`color`), `linear-gradient` (`angle`, `stops`), `radial-gradient`/`angular`/`diamond` (`cx`,`cy`,`stops`), `image` (`src`, `fit`; mirror it with the object-level `flipH`/`flipV`), `shader` (procedural GLSL — see below), `none`. Advanced fills paint a shape's interior with an already-uploaded workspace asset (not creatable via write_file; both export as a baked still image): `model3d` (`src` model path + optional `model3d` camera pose) and `video` (`src` clip path, `fit` `cover`/`contain`/`fill`, `loop` default true) — the clip plays muted + looping on-canvas. Workspace-backed image/model3d/video fills may also carry a UI-managed `fileId`; a linked shader pairs `shaderSrc` with `fileId`. Author the path only, preserve a valid existing id, and never invent one.
**Image fill `src`:** any workspace path the renderer can display — raster images (`.png`, `.jpg`, `.webp`, `.gif`, `.avif`), `.svg` (rendered natively), `.psd` (live reference: the renderer composites the Photoshop document to a flattened raster at display/export time; edits to the source PSD reflow on reload). On export, `.psd` fills bake to an inline PNG so the output is self-contained. Reference a real workspace path or a data URL; don't invent a path.
**Strokes:** `color`, `width`, `dash` (solid/dash/dot), `cap`, `join`, `align`.
**Effects:** `shadow` (`offsetX/Y`,`blur`,`color`,`inner?`), `blur` (`radius`), `glow` (`radius`,`color`).

Minimal document — an artboard (background in its `fills`), a gradient card, and a title on top:

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
    "card": {
      "id": "card",
      "type": "rect",
      "name": "Hero card",
      "frame": { "x": 120, "y": 200, "width": 840, "height": 480, "rotation": 0 },
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
      "cornerRadius": 24,
      "effects": [
        { "type": "shadow", "offsetX": 0, "offsetY": 16, "blur": 32, "color": "rgba(0,0,0,0.25)" }
      ]
    },
    "title": {
      "id": "title",
      "type": "text",
      "name": "Title",
      "frame": { "x": 160, "y": 280, "width": 760, "height": 96 },
      "text": "Hello, world",
      "textMode": "point",
      "fills": [{ "type": "solid", "color": "#ffffff" }],
      "style": {
        "fontFamily": "Inter, system-ui, sans-serif",
        "fontSize": 72,
        "fontWeight": 700,
        "align": "left"
      }
    }
  },
  "order": ["card", "title"]
}
```

## Shader fills

A `{ "type": "shader" }` fill paints any shape or artboard with a live WebGL fragment shader. Define shaders once in a top-level `"shaders"` map, then reference by id from any number of fills.

**Shader fill fields:** `shaderId` (key into `shaders` map), `values` (per-fill uniform overrides — omit to use defaults), `speed` (uTime multiplier; 0 freezes animation), `opacity`.

**Shader document entry:** `{ "id", "name", "source", "uniforms": [...] }`. Each uniform: `{ "name", "label", "type": "color"|"float"|"vec2"|"bool", "default", "min"?, "max"?, "step"? }`. Write `source` as `vec4 surface(vec2 uv) { ... return vec4(rgb, 1.0); }` — standard uniforms `uResolution` (vec2), `uTime` (float), the `vUv` varying, and helpers `fbm(vec2)` / `vnoise(vec2)` / `hash21(vec2)` are always available. Never redeclare auto-injected uniforms.

**Uniform value types:** color = hex string (`"#0063b4"`), float = number, vec2 = `{ "x": 0.5, "y": 0.5 }` (0..1), bool = true/false.

**7 built-in shaders** — reference by id without a `shaders` entry: `builtin-water-caustic`, `builtin-moire`, `builtin-nebula`, `builtin-glowing-wave`, `builtin-pattern-grid`, `builtin-fractal-noise`, `builtin-concentric`. Copy one into `shaders` (with a new id) to make it editable.

**Workspace file shaders** — instead of `shaderId`, set `"shaderSrc": "/path/to/file.glsl"` (`.glsl`/`.frag`/`.shadertoy`). The fill stays linked to the file; `shaderId`/`values` are ignored. `speed` still applies. Shadertoy files use `iResolution`/`iTime`/`void mainImage(out vec4 fragColor, in vec2 fragCoord)` convention.

Shader fills bake to a static raster on SVG/PNG/JPEG export.

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

## Tips

- Put the artboard background in the artboard's `fills`; everything else goes in `objects` with draw order in `order`.
- Keep ids consistent across the `objects` key, the object's own `id`, and `order` / group `children`.
- There is no `image` object type — place a photo by giving a shape (usually a `rect`) an `image` fill (`{ "type": "image", "src", "fit" }`, `fit` `cover`/`contain`/`fill`/`tile`/`crop`). Valid `src` values: any workspace image path (`.png`, `.jpg`, `.webp`, `.gif`, `.avif`), `.svg` workspace paths, `.psd` workspace paths (live reference — composited to a raster at display/export time), or a data URL. Don't invent a path.
- `line` endpoints (`x1,y1,x2,y2`) and `path` `d` coordinates are relative to the object's `frame` origin, not document space — reposition the whole object by moving its `frame`, not by rewriting the point coords.
- For `.svg`, edit the markup directly; keep `viewBox` and existing ids/groups/styles intact. On open the editor parses standard primitives (`rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `text`, `image`, `g` + nested transforms) and re-emits SVG on save.
- Common artboard sizes: `1080×1080` (square), `1920×1080` (16:9 slide), `1080×1920` (story), `2480×3508` (A4 @300dpi).
