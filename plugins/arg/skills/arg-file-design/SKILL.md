---
name: arg-file-design
version: "2.3.1"
description: Create, read, update, and delete design files in Arg — the native .design vector canvas (JSON), plus .svg (round-trips), .fig (import-only), and plain .html pages the same canvas edits in place as HTML/CSS. Also exportable offline via `arg design render` (svg/png/jpg). Load when authoring or editing vector graphics, social graphics, posters, mockups, logos, or slides; for presentation-specific workflow load arg-slides alongside it.
---

# Design files (`.design`, `.svg`, `.fig`, canvas-owned `.html`)

**This skill is the schema. For how to make the result look good - committing to a mood, building a type ramp, spending space, and which design tokens to reach for - load `arg-design` alongside it.**

`.design` is Arg's native vector graphics canvas — shapes, paths, text, and images on one or more artboards — stored canonically as **JSON**. Static HTML is accepted only as the initial creation wire for a brand-new `.design` path and is materialized to JSON on its first editable open. The same editor opens `.svg` (and re-emits SVG on save), imports `.fig` (Figma), and edits plain **`.html`** pages in place: an `.html` file's App switcher offers the canvas's Design / Creative / Slides apps. A canvas-owned page uses the exact HTML/CSS spelling described below; any other page is measured by the same standard HTML-to-design converter and remains editable through targeted patches inside its own markup. Scripts, stylesheets, and unmodelled structure stay untouched. An HTML slide deck opens as one artboard per slide with speaker notes, and structural slide edits write back into the deck while its navigation runtime stays in the file.

## The HTML/CSS spelling (canvas-owned `.html` files)

A canvas-owned `.html` page is HTML with CSS. **The markup and the stylesheet are authoritative** — an element's position, size, colour, typography and effects live in CSS, exactly as they would on any web page. `data-arg-*` attributes carry only what CSS cannot express (which kind of shape an element is, the geometry of a path or a star, which workspace file a fill links to, a shader's uniform values). Where a value maps exactly onto a Tailwind utility class, the utility class is used instead of a bespoke rule; anything that doesn't map exactly stays as an explicit style. The root element carries `data-arg-design="1"` — the marker that proves the canvas wrote the bytes; without it the canvas opens an `.html` page through the same standard HTML-to-design converter as a measured import that stays EDITABLE - canvas edits are written back into the page's own markup as targeted patches - and the file never rewrites itself: the HTML file menu's **Convert to .design** action materializes a non-colliding `.design` sibling instead.

You can style a page you write by hand from its `<style>` block rather than inline: the reader resolves type, class, id, universal, attribute, descendant and child selectors by specificity, resolves `var()` against `:root` and element-level custom properties, and expands the `font`, `inset`, `padding`, `margin`, `gap`, `border` and `background` shorthands. `@media`, `@supports` and any selector with a pseudo-class or pseudo-element are skipped, so don't put a layer's geometry behind one. Note the editor re-emits the page with inline styles and utility classes when it saves, so a stylesheet is a way to author, not a structure the canvas preserves.

The structure follows the document model below: each artboard is a `<section data-arg-artboard>`, and each layer inside it is an element carrying `data-arg-type` (`rect`, `text`, `group`, …) and `data-arg-name` — a `<p>` for text, a `<div>` otherwise, with a group's children nested inside it. Paint order is an explicit `z-index` that runs with document order, so the last sibling is on top; move a layer and its `z-index` has to move with it.

**Read before you write.** Before editing an existing document, read it and match the conventions already in the file — its class vocabulary, its ordering, its attribute spelling. Before authoring a new one from scratch, copy the shape of a real file in the workspace rather than guessing at attribute names.

**Do not update an existing `.design` with HTML.** Read it first. If it still carries its initial HTML creation wire, open or render it to materialize the canonical JSON, then edit that JSON. The exact HTML/CSS spelling below belongs to canvas-owned `.html` files and is not a second persisted `.design` model.

## CRUD

Use your active Arg access method (`arg-mcp` / `arg-cli` — see `arg-files`) and the shared rules in `arg-files`. Design-specific: `.design`/`.svg` are text — edit `.design` JSON or SVG markup directly, and reuse the design's existing colors, type, and spacing. Edit a plain `.html` page as HTML. **`.fig` is binary and import-only** — read it for structure/tokens, but edits don't write back; to create a Figma-like file from scratch, produce a `.design` or `.svg` instead.

## HTML creation wire format

Native JSON is the canonical persisted `.design` format. Static HTML is a create-only shortcut: an agent may write it directly only as the initial contents of a brand-new path ending in `.design` when HTML and CSS are the faster authoring vocabulary. Check that the path does not already exist before using HTML. Before updating any existing `.design`, read it and edit native `.design` JSON; never overwrite an existing file with HTML, even if that file still contains unmaterialized HTML from its initial write. Materialize that source first, then make the requested update in JSON.

Arg detects the initial contents rather than trusting the extension and runs HTML through the same converter used by the HTML file menu's **Convert to .design** action. The first editable open replaces the editor buffer with native JSON; read-only previews, nested design fills, headless rendering, and PSD conversion materialize the same native document in memory. Web and desktop materialize the menu conversion immediately; iOS and Android create the HTML-filled sibling and let the shared editor materialize it on first open, so there is still one DOM-to-layer implementation.

Author this wire format like Paper's `write_html` input:

- Write a complete document or one root fragment. Give the canvas and important regions explicit pixel dimensions so the result does not depend on a default viewport.
- Prefer inline CSS and flex layouts. A `<style>` block is supported, but external stylesheets are removed and scripts never run.
- Add `layer-name="..."` to meaningful elements. Arg preserves DOM nesting as editable groups and uses that attribute for layer names.
- Use real DOM elements for every visible layer. Pseudo-elements and CSS gradient or background-image paint are not imported; use a solid background, an `<img>`, or inline `<svg>` instead.
- Text converts the way the browser drew it. A block whose text is all one style becomes a single editable layer keeping its own line breaks and alignment, so paragraphs, `<br>` runs and centred copy survive intact. Native text holds one style per layer, so a `<strong>`, `<em>`, or coloured `<a>` inside a sentence becomes its own layer - keep inline styling for emphasis that earns a layer, and put a whole styled passage in its own block rather than mid-sentence when you want it editable as one thing.
- The wire format is border-box: `width: 640px; padding: 48px` converts as 640 wide. Size regions accordingly rather than adding padding on top of a width.
- Relative `<img src>` paths resolve from the source `.design` file's folder. Workspace-absolute paths and data URLs also work.
- Treat conversion as a static visual snapshot. Event handlers, scripts, iframes, objects, embeds, unsafe metadata, and external stylesheet/preload links are stripped.

Use native JSON when the document needs Arg-specific features such as tokens, auto-layout sizing, shaders, live file fills, presenter metadata, or precise round-trip edits. The HTML exception ends as soon as the new path exists. Every later update uses JSON through the design library or editor.

### An HTML slide deck converts to a deck, not a tall page

When the HTML is a slide deck, Arg gives each slide its own artboard, opens the file in Slides view, keeps each slide's presenter notes, and marks a slide hidden from playback as skipped. A reveal.js vertical stack becomes a named section. This applies to the same HTML whether it arrives through **Convert to .design** on an `.html` file or as an agent's initial static-HTML write to a new `.design` path. Load `arg-slides` for deck structure and presentation workflow.

Arg recognizes a deck from its markup, in this order: `data-arg-slide` on each slide; reveal.js (`.reveal .slides > section`, where a section holding sections is a vertical stack); Marp's per-slide `<svg data-marpit-svg>`; class-named slides (`slide`, `step`, `swiper-slide`, or any `-slide` / `__slide` class); and last, sibling `<section>` elements - which are only read as slides when a deck library appears in a script tag, the container is deck-named (`#deck`, `.slides`, `.presentation`, …), or every section declares the same explicit pixel size. **A page whose sections are ordinary page sections stays one artboard**, so mark real slides with `class="slide"` or `data-arg-slide` when you want them split.

To convert cleanly:

- Fix the stage in CSS - on the slide container, or on `html` / `body` - or configure it (`Reveal.initialize({ width, height })`). Every slide converts at that one size; Arg falls back to 1920x1080 when the markup fixes no size at all, so a deck sized only by the viewport (`100vw` / `100vh`) gets the default rather than the browser window.
- Hide inactive slides the usual way (`.slide { display: none }` plus `.slide.active { display: flex }`). Arg presents each slide by adding the active class your CSS already keys on, so authored flex or grid layout survives.
- Put presenter notes in `<aside class="notes">` inside the slide. They become the artboard's `notes` and are never captured as a visible layer.
- Add `data-visibility="hidden"` to a slide that should stay in the deck but not play; it converts as a skipped artboard.
- Name a slide with `data-name`, `aria-label`, or a heading - Arg names the artboard from those, then from `id`, then `Slide N`.
- `data-background-color` and `data-background-image` on a slide become the artboard's fills.

## Editing library

For `.design` JSON, prefer the bundled dependency-free module at `scripts/document-edit/design.mjs`. It is generated from `@arg-ai/sdk`, preserves unknown fields, and clones every edit. Resolve that path from the installed skill directory. When the workspace is mounted locally, a complete edit looks like:

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

Key call shapes: `addDesignObject(doc, object, { parentId?, index? })`, `moveDesignObject(doc, id, { parentId?, index? })`, and `patchDesignObject(doc, id, patch)`. For auto layout (below): `setDesignLayout(doc, containerId, layout | null)` manages a group's or artboard's `layout`, `setDesignLayoutItem(doc, objectId, item | null)` sets a child's per-item overrides, and `designLayoutContainerId(doc, objectId)` answers which container lays an object out. `upsertDesignToken(doc, id, token)` and `removeDesignToken(doc, id)` - the remove refuses while anything still references the token, so re-point or clear those references first. Raw paths are arrays, for example `editDesign(doc, [{ op: "set", path: ["objects", "title", "name"], value: "New name" }])`. Import `common.mjs` directly when you need the shared `JsonEdit` helpers without a format module.

## Document model

Everything below is the native JSON model and the model the canvas projects onto a canvas-owned `.html` page. In that HTML spelling, a property appears as CSS where CSS can express it and as a `data-arg-*` attribute where it cannot.

Top-level: `version` (use `1`), optional `tokens` (design tokens - see below), optional `metadata` (`{ "defaultView": "design" | "creative" | "slides", "sections": [...] }`; use `creative` for social/content graphics that should open in the Canva-style UI, and `slides` for decks), `canvas` (`{ width, height }`), `artboards` (named rectangles in document space, ≥1), `objects` (flat map of id → object), `order` (array of object ids; **last renders on top**; group children live in the group's `children`, not `order`).

Creative view presents artboards as a centered vertical page column in `artboards` array order. That layout is a transient editor projection: keep authoring normal document-space coordinates, and use the array itself to control Creative page order. Switching between Creative and Design views never rewrites artboard or object positions.

**Slides view** treats each artboard as a slide. `metadata.sections` groups them: `[{ "id": "s1", "name": "Intro", "artboardIds": ["hero", "agenda"] }]`. Sections hold artboard **id references only**, so reordering a slide or a section never moves artboard geometry — the same projection rule as Creative view. Omit `sections` and the deck is one implicit section holding every artboard in `artboards` order. When present, `metadata.sections` is the presentation order (not the `artboards` array), every id must name a real artboard, and no artboard may appear in two sections.

For a slide deck, also load `arg-slides`. New decks default to a self-contained `.html` file; that skill covers when a `.design` deck is the right call instead (an editable canvas, or a PowerPoint / PDF hand-off) plus reference-first authoring, live content, presenter workflow, and restrained GLSL motion.

**Presenter notes:** each artboard takes an optional `notes` string holding **MDX** - the same dialect the `.mdx` editor reads, so headings, lists, callouts and embeds all render while editing beside the slide in Slides view. The presenter console shows notes as read-only Markdown, so wiki-style links and file embeds display as plain text there rather than resolving - keep notes meant to be read live plain-text-friendly. The other views carry `notes` through untouched.

**Skipped slides:** set an artboard's optional `skipped` boolean to `true` to keep it editable in its section while omitting it from presentation playback. Omit the field or set it to `false` to include the slide.

Coordinates are document pixels. Each object has a `frame` `{ x, y, width, height, rotation? }` (top-left origin, rotation in degrees around center).

**Object base fields:** `id` (matches the `objects` key and appears in `order` or a group's `children`), `type`, `name?`, `frame`, `fills` (bottom→top), `strokes`, `effects`, `opacity?` (0–1), `blendMode?`, `visible?`, `locked?`, `layoutItem?` (see Layout), `flipH?`/`flipV?` (booleans that mirror the object's raster fill content - image/video - across its centerline; the Flip commands set these).

**`type` values & type-specific fields:** `rect` (`cornerRadius`: one non-negative number when all four corners are equal, or `{tl,tr,br,bl}` with non-negative values for independent corners; store a plain number again once all four match), `ellipse`, `polygon` (`sides` ≥3), `star` (`points`, `innerRatio` 0–1), `line` (`x1,y1,x2,y2`; optional `markerStart`/`markerEnd` end caps: `arrow` open V / `triangle` solid head / `circle` / `diamond` / `bar`, drawn at the `x1,y1` / `x2,y2` end in the stroke's color, scaling with stroke width — the way to draw a connector/arrow between things), `path` (`d` SVG path data; `closed`, `fillRule`, `viewBox`), `text` (`text`, `textMode` `point` auto-fits width / `area` wraps inside `frame`, `style` with `fontFamily`, `fontSize`, `fontWeight`, `align` `left`/`center`/`right`/`justify` — plus optional `fontStyle`, `textDecoration`, `letterSpacing` (document **pixels**), `lineHeight` (a **ratio** of the font size, default 1.3 - `76` here means a 76x line, not 76px), `verticalAlign`, `writingMode` (`vertical-rl` / `vertical-lr` turn the block on its side — Latin glyphs rotate a quarter turn; an upright CJK run is not modelled, and the `sideways-*` modes are not carried); glyphs are painted by `fills` — every fill kind works on text, shader / video / 3D / map / drawing / nested-design paints included, each clipped to the glyph run — and outlined by `strokes`; legacy `color` still parses but is folded into `fills` on load), `group` (`children` ids; `clipChildren?`; `layout?`).

**Layout (flex/grid):** a `group` or an artboard takes an optional `layout` and positions its children by that instead of by their authored coordinates. `layout`: `mode` (`flex` or `grid`, required), `direction` (`row` default / `column` / `row-reverse` / `column-reverse`, flex only), `wrap` (`nowrap` default / `wrap` / `wrap-reverse`, flex only), `justify` (`start` default / `center` / `end` / `space-between` / `space-around` / `space-evenly`), `align` (`stretch` default, matching CSS `align-items: normal` / `start` / `center` / `end`), `alignContent` (same values as `justify`; distributes wrapped lines and grid rows, ignored when `nowrap`), `rowGap`/`columnGap` (px, default 0), `padding` (`{top,right,bottom,left}` px, default 0), `columns`/`rows` (grid only; one track string per track: `"120px"`, `"1fr"`, `"auto"`, `"minmax(80px, 1fr)"`), `autoFlow` (`row` default / `column`, grid only). Any object inside such a container takes an optional `layoutItem`: `grow` (default 0), `shrink` (default 1), `basis` (px number or `"auto"` default), `alignSelf` (overrides the container's `align`), `order` (default 0), `column`/`row` (grid only; `"2"`, `"1 / span 2"`, `"span 3"`). Library helpers: `setDesignLayout(doc, containerId, layout | null)`, `setDesignLayoutItem(doc, objectId, item | null)`, `designLayoutContainerId(doc, objectId)`.

In the HTML/CSS spelling this is plain CSS, so you can write it directly: `mode`→`display`, `direction`→`flex-direction`, `wrap`→`flex-wrap`, `justify`→`justify-content`, `align`→`align-items`, `alignContent`→`align-content`, `rowGap`/`columnGap`→`row-gap`/`column-gap` (`gap` when equal), `padding`→`padding`, `columns`/`rows`→`grid-template-columns`/`grid-template-rows`, `autoFlow`→`grid-auto-flow`; on a child, `grow`/`shrink`/`basis`→`flex`, `alignSelf`→`align-self`, `order`→`order`, `column`/`row`→`grid-column`/`grid-row`. A layout container's children carry **no** `position:absolute`/`left`/`top` (no `absolute` class) - only their `width`/`height`. The container itself keeps its own absolute placement unless it is a child of another layout container.

**A layout child's frame position is derived.** The solver recomputes `frame.x`/`frame.y` for every child on load and after every edit, so authoring them on a child has no effect - change the container's `layout`, the child's `layoutItem`, or the child order instead.

**An earlier layout spelling still reads.** Documents written between the two layout implementations may carry `layout.type` (instead of `mode`), `layoutSizing` (`fixed`/`fill`/`hug`), `layoutGrow`, `layoutAlign`, and `gridArea`; every reader migrates that spelling into the model above on load, and the next save writes only the current one. Never author it.

**There is no hug-contents sizing.** A child keeps its own `frame.width`/`frame.height` unless something resizes it: `grow`/`shrink` on the main axis (starting from `basis`), `stretch` from `align`/`alignSelf` on the cross axis, or an `fr`/`minmax` grid track sizing its cell. An `auto` track sizes to the largest child's own frame in that track. Nothing measures content, so a text layer will not grow to fit its string - give every child the size you want it to have.

A row of three equal cards in the HTML/CSS spelling - a laid-out group, its children sized by `flex` rather than by `left`/`top`:

```html
<div
  id="cards"
  data-arg-type="group"
  data-arg-name="Cards"
  class="absolute isolate"
  style="left:80px;top:120px;width:1040px;height:320px;display:flex;gap:24px;z-index:1"
>
  <div
    id="card1"
    data-arg-type="rect"
    data-arg-name="Card 1"
    class="rounded-2xl"
    style="width:320px;height:320px;flex:1 1 0;background-image:linear-gradient(#f1f5f9, #f1f5f9)"
  ></div>
  <div
    id="card2"
    data-arg-type="rect"
    data-arg-name="Card 2"
    class="rounded-2xl"
    style="width:320px;height:320px;flex:1 1 0;background-image:linear-gradient(#f1f5f9, #f1f5f9)"
  ></div>
  <div
    id="card3"
    data-arg-type="rect"
    data-arg-name="Card 3"
    class="rounded-2xl"
    style="width:320px;height:320px;flex:1 1 0;background-image:linear-gradient(#f1f5f9, #f1f5f9)"
  ></div>
</div>
```

**Fills:** Non-file paints are `solid` (`color`), `linear-gradient` (`angle`, `stops`, optional paired `start`/`end` points and `space` `local`/`world`; `angle` is the CSS angle - `0` runs bottom-to-top and `90` left-to-right, so the first stop sits at the bottom and the left respectively), `radial-gradient`/`angular-gradient`/`diamond-gradient` (`cx`,`cy`,`stops`), internal `shader` (`shaderId` plus optional `values`/`speed` - see below), `webcam` (source-less live camera), and `none`. Every paint backed by a file uses one shape: `{ "type": "file", "fileType": "image"|"model3d"|"video"|"design"|"kml"|"cad"|"shader", "src": "...", "fileId"?: "..." }`; subtype settings stay alongside those common fields (`fit` for image/video/design, `model3d` pose, `kml` settings, `cad` settings, or `speed` for a shader file). Never author the old top-level `image`/`model3d`/`video`/`design`/`kml`/`cad` fill types or `shaderSrc`; the parser accepts and migrates them only for existing documents. Author a workspace path and preserve a valid existing `fileId`, but never invent one. A webcam stores only portable visual fields (`fit`, `mirrored`, `color`, `opacity`, `visible`) and never a device id, label, or stream identifier.
**Image fill `src`:** any workspace path the renderer can display — raster images (`.png`, `.jpg`, `.webp`, `.gif`, `.avif`), `.svg` (rendered natively), `.psd` (live reference: the renderer composites the Photoshop document to a flattened raster at display/export time; edits to the source PSD reflow on reload). On export, `.psd` fills bake to an inline PNG so the output is self-contained. Reference a real workspace path or a data URL; don't invent a path.
**Strokes:** `color`, `width`, `dash` (solid/dash/dot), `cap`, `join`, `align`, and optional `paint` containing a gradient fill. When `paint` is present it paints the stroke; keep `color` as a solid compatibility fallback for line markers and older readers. A linear-gradient stroke paint uses the same `start`/`end` and `space` rules as a fill.

Canvas-anchored gradient stroke: `{ "color": "#7c3aed", "width": 8, "paint": { "type": "linear-gradient", "angle": 90, "space": "world", "start": { "x": 120, "y": 200 }, "end": { "x": 960, "y": 680 }, "stops": [{ "offset": 0, "color": "#7c3aed" }, { "offset": 1, "color": "#06b6d4" }] } }`.
**Effects:** `shadow` (`offsetX/Y`,`blur`,`color`,`inner?`), `blur` (`radius`), `glow` (`radius`,`color`).

**A laid-out group paints a background.** When a group carries a `layout` it is a _frame_: its `fills`, `strokes`, `cornerRadius` and `effects` paint behind its children, so a card is ONE object rather than a rectangle plus a group whose frames you keep in step by hand. A plain group (no `layout`) has no surface and its fills stay inert - Figma's Frame-versus-Group rule.

**Spacing tokens on a layout:** `gapToken`, `rowGapToken`, `columnGapToken` and `paddingToken` name `number` tokens; the `gap`/`padding` beside them are derived (see Design tokens).

**Omit anything that equals its default.** Every one of `opacity` (1), `visible` (true), `locked` (false), `flipH`/`flipV` (false), `frame.rotation` (0), `fills`, `strokes` and `effects` is optional, and an absent value reads as the default everywhere - so `"opacity": 1` and `"effects": []` are pure token cost. Author the difference from the default, not the whole shape.

Minimal document — an artboard (background in its `fills`), a gradient card, and a title on top, in the JSON form a `.design` file stores:

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
      "layout": { "mode": "flex", "direction": "column", "rowGap": 32, "align": "stretch" },
      "children": ["card", "title"]
    },
    "title": {
      "id": "title",
      "type": "text",
      "text": "Hello, world",
      "textMode": "area",
      "frame": { "x": 0, "y": 0, "width": 840, "height": 96 },
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
      "frame": { "x": 0, "y": 0, "width": 840, "height": 512 },
      "layoutItem": { "grow": 1 },
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

## Artboards that grow with their content

An artboard is normally a fixed rectangle. Give it a `layoutRoot` - the id of a **top-level** object (one listed in `order`) - and the artboard becomes that object's layout parent: it positions the root inside the artboard's `padding` and sizes it against the artboard's box. Add `"layoutSizing": { "height": "hug" }` and the direction reverses on that axis: the **artboard** takes its size from the root plus padding, so a page grows as you add to it and shrinks when you take content away. `layoutConstraints` bounds it (a page that grows but stops at A4's height, a column that never gets narrower than its measure).

```json
{
  "id": "page",
  "name": "Memo",
  "x": 0,
  "y": 0,
  "width": 816,
  "height": 400,
  "layoutRoot": "body",
  "padding": 72,
  "layoutSizing": { "height": "hug" },
  "fills": [{ "type": "solid", "color": "#ffffff" }]
}
```

with `body` a `{ "type": "flex", "direction": "column", "gap": 24 }` group whose `layoutSizing` is `{ "width": "fill", "height": "hug" }`. Every paragraph appended to `body` lengthens the page; nothing has a coordinate.

The root's `frame` is derived (position always, plus any axis the artboard decides), so omit it. Naming one root rather than adopting whatever happens to sit inside the rectangle is deliberate: membership by containment would depend on the size the hug is computing. Wrap the page's contents in a single laid-out group and point `layoutRoot` at it. The artboard's own `width`/`height` are recomputed on load, and `canvas` follows them.

## Design tokens

`tokens` is a top-level map of reusable values - colours, scalars, font stacks, whole paints and typography sets - keyed by id. Anywhere in the document, a `*Token` field names one of those keys, and **the value beside it is derived**: the editor rewrites it from the token on load and omits it on save, exactly like a laid-out child's geometry. Editing one token restyles every object that names it.

**Token entry:** `{ "type", "value", "name"?, "description"?, "group"?, "unit"? }`. Types:

| `type`       | `value`               | Referenced by                                                     |
| ------------ | --------------------- | ----------------------------------------------------------------- |
| `color`      | CSS colour string     | `colorToken` on a fill, a gradient stop, a stroke, an effect      |
| `number`     | number (document px)  | `fontSizeToken`, `widthToken`, `gapToken`, `cornerRadiusToken`, … |
| `fontFamily` | font stack string     | `TextStyle.fontFamilyToken`                                       |
| `paint`      | a whole `Fill` object | a fill layer's `token`                                            |
| `textStyle`  | a `TextStyle` object  | `TextObject.styleToken`                                           |
| `shadow`     | an `Effect` object    | an effect entry's `token`                                         |

`role` is `number` tokens only and affects the stylesheet export alone: `spacing` (default), `radius`, `text`, `fontWeight`, `tracking`, `leading`, `breakpoint`, `container`. It picks the Tailwind v4 namespace, and in v4 the namespace is what turns a variable into utilities - a radius exported under `--spacing-*` generates no `rounded-*`. Inside the document every scalar is document pixels, except `leading`, which is a ratio of the font size (see Typography above).

`textStyle` tokens are the composite half of the type ramp - `type.display`, `type.title`, `type.body`, `type.label` - bound with `styleToken` so one reference carries family, size, weight, tracking and leading together. The loose scalars (`text.display`, `weight.display`, …) are for overriding one field of a bound style.

**New documents ship with a full token set**, and there are nine built-in themes - `neutral` (the default), `editorial`, `bookish`, `mineral`, `maritime`, `nocturnal`, `signage`, `botanical`, `terminal`. Every theme declares the same ids, so switching one is a value swap that retargets the whole document. Author against those ids (`color.bg`, `color.ink`, `color.accent`, `color.accent-ink`, `text.display`, `space.4`, `radius.lg`, `shadow.card`, …) rather than inventing a parallel vocabulary; `arg-design` lists them and says which to reach for.

**Aliases.** A `value` written as `"{other-token}"` is a reference to another token **of the same type**, so a semantic layer can point at a palette layer and a retheme is one edit. Chains are followed on load; a cycle, a missing target or a type mismatch resolves to nothing and every reference falls back to the literal beside it. A literal can therefore never itself be `{…}`.

**Reference fields.** `colorToken` (on `solid` fills, gradient `stops`, `strokes`, `shadow`/`glow` effects), `widthToken` (stroke), `cornerRadiusToken` (rect, artboard), `paddingToken` (artboard), the layout spacing tokens above, `styleToken` plus `fontFamilyToken` / `fontSizeToken` / `fontWeightToken` / `letterSpacingToken` / `lineHeightToken` inside a `style`. A whole paint is `{ "type": "token", "token": "brand.gradient" }` as a fill layer (its own `opacity`/`visible` still apply); a whole effect is `{ "type": "token", "token": "elevation.card" }`. A `color` token also works as a paint token and reads as a solid fill.

A `styleToken` supplies every typography field the token declares, and the object's own `style` entries override it - so a heading shares a token's family and tracking while overriding only its size.

```json
{
  "tokens": {
    "palette.violet-600": { "type": "color", "value": "#7c3aed" },
    "brand.primary": { "type": "color", "value": "{palette.violet-600}" },
    "space.4": { "type": "number", "value": 24 },
    "type.heading": {
      "type": "textStyle",
      "value": { "fontFamily": "Inter, system-ui, sans-serif", "fontSize": 48, "fontWeight": 700 }
    }
  },
  "objects": {
    "card": {
      "id": "card",
      "type": "rect",
      "cornerRadiusToken": "space.4",
      "fills": [{ "type": "solid", "colorToken": "brand.primary" }]
    },
    "title": {
      "id": "title",
      "type": "text",
      "text": "Hello",
      "textMode": "area",
      "styleToken": "type.heading",
      "style": { "fontSize": 32 }
    }
  }
}
```

Note `"fills": [{ "type": "solid", "colorToken": "brand.primary" }]` carries no `color` - that is the derived value, and writing one is only useful as the fallback for a token that does not exist. **Author tokens for anything used more than twice** (the brand colours, the spacing scale, the type ramp): it is fewer tokens on the wire than repeating hex strings, and it makes a restyle a single edit. The editor's Export menu writes them out as CSS custom properties or a Tailwind v4 `@theme` block, alias chains preserved as `var()`.

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

## Export to PowerPoint (`design_to_pptx` action)

Run the `design_to_pptx` action when the user wants a `.design` deck handed off as an editable PowerPoint file. The action calls the same exporter as **Download as .pptx** in Slides view, writes the result into the workspace, and preserves slide/section order, presenter notes, hidden slides, editable text and shapes, images, embedded fonts and playable video where PowerPoint supports them. Keep the `.design` as the source of truth instead of rebuilding the deck with `python-pptx`.

Pass `source_path`; `output_path` defaults beside it with a `.pptx` extension. Skipped artboards remain in the package as hidden slides by default; pass `include_skipped_slides: false` only to remove them. The cloud action returns the package through a memory-bounded browser and is intended for outputs up to about 25 MB; for a larger media-heavy deck, direct the user to the Slides view Export pill.

## Convert to Photoshop (`design_to_psd` action)

Run the `design_to_psd` action to turn a `.design` into a layered `.psd`. Text objects and solid rect/ellipse/line shapes arrive as live, editable Photoshop text and vector-shape layers. An axis-aligned shape whose only paint is an image fill keeps the complete source image in its raster layer and gets a Photoshop layer mask for the shape, so cover/crop overhang can be reframed after conversion without changing the initial composition. Rotated or mirrored shapes, tiles, mixed fills or strokes, baked effects, and unusually large off-mask images use the existing tight raster fallback. Shader, video, and 3D fills remain baked raster layers rather than being presented as original image pixels.

A `.psd` holds one canvas, so the artboard is the unit of conversion: pass `artboard` (index or name) for a single `.psd`, or omit it and a multi-artboard document comes back as a `.zip` with one `.psd` per artboard. The action writes ONE file and overwrites what is already at that path; `output_path` is optional and its extension is replaced with whatever the conversion produced (`.psd` or `.zip`), since that depends on the artboard count.

The right-click menu of a `.design` file runs the same converter but saves differently: one `.psd` sibling per artboard, each on a fresh non-colliding path, never a `.zip` and never overwriting an existing file.

The whole result travels back through a memory-bounded browser session, so a very large conversion is rejected up front - convert an artboard at a time with `artboard`, and keep `scale` low (a scaled artboard over 30000 px on either side is past Photoshop's canvas limit).

## Tips

- Read the file's existing content before editing it, and follow its conventions — its color/type vocabulary, its ordering, and (in a canvas-owned `.html` page) its Tailwind class and attribute spelling — rather than introducing a second style alongside.
- Put the artboard background in the artboard's `fills`; everything else is a layer, with document order giving paint order (last on top).
- Keep a layer's id consistent everywhere it is referenced — its own element, its group's children, and any `metadata.sections` entry naming it.
- There is no `image` object type - place a photo by giving a shape (usually a `rect`) a file fill (`{ "type": "file", "fileType": "image", "src", "fit" }`, with `fit` `cover`/`contain`/`fill`/`tile`/`crop`). Valid `src` values: any workspace image path (`.png`, `.jpg`, `.webp`, `.gif`, `.avif`), `.svg` workspace paths, `.psd` workspace paths (live reference - composited to a raster at display/export time), or a data URL. Don't invent a path.
- `rect` corner radius UI: the Properties panel's frame icon toggles between the single-radius input and the 2×2 per-corner grid. Dragging a canvas corner grip rounds all corners together; hold Option (macOS) / Ctrl (Windows) to round only the dragged corner.
- `line` endpoints (`x1,y1,x2,y2`) and `path` `d` coordinates are relative to the object's `frame` origin, not document space — reposition the whole object by moving its `frame`, not by rewriting the point coords.
- For `.svg`, edit the markup directly; keep `viewBox` and existing ids/groups/styles intact. On open the editor parses standard primitives (`rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `text`, `image`, `g` + nested transforms) and re-emits SVG on save.
- Common artboard sizes: `1080×1080` (square), `1920×1080` (16:9 slide), `1080×1920` (story), `2480×3508` (A4 @300dpi).
