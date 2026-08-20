---
name: arg-slides
version: "2.0.0"
description: Create, edit, and present Arg slide decks. Load for presentations, pitch decks, keynote-style talks, slide redesigns, or deck generation. Default to a single self-contained .html deck; build a multi-artboard .design deck when the user wants an editable design canvas or a PowerPoint / PDF deliverable.
---

# Arg slides

Build a new presentation as one self-contained `.html` file. An HTML deck renders live in the editor preview, presents fullscreen, animates, stays interactive, and can read real workspace data at runtime, so it is the default for a deck, pitch, or keynote-style talk.

Choose another format only when the request asks for what that format gives:

| The user wants                                                                                         | Build                                                      |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| A deck to present, share as a link, animate, or make interactive                                       | `.html` - the default                                      |
| A design canvas they will keep rearranging by hand, with a properties panel and file-backed live fills | `.design` with `metadata.defaultView: "slides"`            |
| A PowerPoint or PDF deliverable                                                                        | `.design`, then export from the Export pill in Slides view |
| Changes to a deck that is already a `.pptx` in the workspace                                           | Edit that `.pptx` in the slide editor; never regenerate it |

Ask nothing extra when the request is just "make me a deck" - write the HTML.

## Load the companion skills

Load `arg-files` for shared file rules and the active access method (`arg-mcp` or `arg-cli`).

For an HTML deck, load `arg-apps` for the `.html` preview contract and `arg-fs-js-sdk` when the deck reads workspace files at runtime through `window.arg`.

For a `.design` deck, load `arg-file-design` before editing for the complete schema, file-fill rules, GLSL contract, and bundled `scripts/document-edit/design.mjs` helper.

Use this skill for presentation decisions. Treat the companion skill as the source of truth for its file format when the two overlap.

## HTML decks

Plan the story before writing markup: audience, the decision or takeaway, the arc, and what evidence already exists in the workspace. One clear idea per slide, strong hierarchy, short copy, and the same layout rules repeated - a wall of bullets is the failure mode.

### Structure

Write one document. Every slide is a section inside a deck root, and the whole deck ships in a single file with its CSS and JS inline.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="arg-full-view" />
    <title>Q3 review</title>
    <style>
      /* Author against a fixed 1920x1080 stage and scale it, so type and
         spacing are identical at every viewport instead of reflowing. */
      .stage {
        width: 1920px;
        height: 1080px;
        transform-origin: top left;
      }
    </style>
  </head>
  <body>
    <main id="deck" class="stage">
      <section class="slide" id="title">…</section>
      <section class="slide" id="agenda">…</section>
    </main>
    <script>
      /* navigation, scaling, fullscreen */
    </script>
  </body>
</html>
```

- `<meta name="arg-full-view" />` in the `<head>` hides the source pane so the deck fills the editor and the toolbar collapses to breadcrumbs plus **View code**. Put it on every deck.
- Never link out to a second HTML page. A navigation reloads the sandboxed preview and drops `window.arg`; switch slides with in-page state.
- Fix the stage size (`1920x1080` for 16:9 unless the user asks otherwise) and scale it with a `transform: scale()` recomputed on `resize`. Fluid `vw`-based type looks fine on your screen and breaks on the projector.
- Paint the background explicitly. A deck commits to its own palette, so do not rely on the host page's colors. If the deck should follow the app instead, style all three of the `light`, `dark`, and `focus` `<body>` classes an SDK-enabled page receives, not `prefers-color-scheme`.

### Presenting

- Bind `ArrowRight` / `ArrowLeft`, `Space`, `PageDown` / `PageUp`, and `Home` / `End`, plus click-to-advance. Bind one key (`f`) to `requestFullscreen()` on the deck root.
- Reflect the current slide in `location.hash` and listen for `hashchange`, so a link opens on a specific slide and a reload keeps the place.
- Do not auto-advance on a timer unless the user asked for an unattended loop.
- Keep presenter notes in the document as hidden elements (an `<aside class="notes" hidden>` per slide) and toggle them from a key. There is no separate presenter console for an HTML deck - a `.design` deck is the format that has one.

### Motion and media

- Animate with CSS transitions and `@keyframes` driven by an `active` class on the current slide. Keep entrances subtle and fast (150-400ms, ease-out) and honor `prefers-reduced-motion`.
- Reference workspace images and video by relative path (`<img src="charts/revenue.png">`); with Scripts and Workspace access enabled, the preview resolves static `img`, `video`, `audio`, `source`, and `track` sources through short-lived signed capabilities. Inline SVG, data URIs, and CSS gradients always work.
- For motion that must render into an MP4 rather than play live, that is a HyperFrames composition, not a deck - see `arg-apps`.

### Live workspace data

A deck can read real numbers instead of hard-coding them:

```html
<script>
  if (window.arg) {
    arg.ready.then(async () => {
      const runs = await arg.fs.readJSON("data/q3.json");
      document.querySelector("#arr").textContent = runs.arr;
    });
  }
</script>
```

There is no import for the SDK - the editor injects it when the viewer enables **Scripts** and **Workspace access**. Feature-detect with `if (window.arg)` and render a sensible static fallback when it is absent, because the deck is often opened without those grants. Load `arg-fs-js-sdk` for the full reference.

### Build and verify

1. Read the sources the deck is about before writing any markup.
2. Outline the sections and slides, then fix the shared type scale, palette, margins, and grid.
3. Write the file in one pass, then open the preview and step through every slide with the keyboard.
4. Check fullscreen, the first and last slide edges, and a narrow window - the scaled stage must letterbox, never clip.
5. If the user needs PowerPoint or PDF at the end, build the `.design` deck below instead of trying to convert the HTML.

## `.design` decks

Build this instead of HTML when the user wants a canvas they will keep editing by hand, a presenter console, live file-backed fills, or a PowerPoint / PDF deliverable. A deck is one design document whose artboards are slides.

### Start with a native deck

- Set `metadata.defaultView` to `"slides"`.
- Use one artboard per slide. Default to `1920x1080` for a 16:9 deck unless the user specifies another size.
- Keep every slide the same size unless the format deliberately changes.
- Put slides into `metadata.sections` when the story has named chapters. Section `artboardIds` define presentation order; artboard coordinates do not.
- Store presenter notes in each artboard's `notes` field as MDX. Keep notes intended for the presenter console plain-text-friendly.
- Set `skipped: true` on optional slides that should remain editable but not play.
- Arrange artboards in document space with a visible gap so Design view remains easy to scan. This geometry does not control presentation order.

Plan the story before drawing: establish the audience, decision or takeaway, narrative arc, and evidence available in the workspace. Favor one clear idea per slide, strong visual hierarchy, short copy, and repeated layout rules over a sequence of dense text panels.

### Prefer references over copies

Search the workspace for existing source material before recreating it. When content already lives in a supported workspace file, place it through a file-backed fill so the deck remains connected to that source.

Use `{ "type": "file", "fileType": "...", "src": "/workspace/path" }` on an artboard or shape for:

- `design` - a reusable component, chart, diagram, branded frame, or another deck's artboard. Select it with `artboardId`.
- `image` - raster, SVG, or PSD artwork without embedding a stale copy.
- `video` - live, muted, looping motion in presentation mode.
- `model3d` - a live 3D scene with a saved pose.
- `kml` - a map rendered from workspace KML or KMZ data.
- `cad` - a plan or saved camera from a workspace `.cad` file.
- `shader` - a reusable `.glsl`, `.frag`, or `.shadertoy` animation.

For example, reuse a maintained KPI panel instead of rebuilding it on each slide:

```json
{
  "type": "file",
  "fileType": "design",
  "src": "/components/q3-kpis.design",
  "artboardId": "executive-summary",
  "fit": "contain"
}
```

Editing the referenced design updates each place that paints it. Reuse a nested design for repeated logos, product frames, charts, and section furniture rather than copying their objects into the deck.

Author a real `src` path after verifying the file exists. Preserve an existing `fileId` plus path pair, but never invent a `fileId`; the editor mints and heals stable ids. Do not use data URLs or flattened screenshots for content that should stay connected. Avoid self-references and cycles; nested designs are limited to four levels.

If the source format cannot be painted directly, create a focused `.design` visualization beside that source and reference the visualization from the deck. Keep the source-to-visual update workflow explicit rather than implying that arbitrary documents or tables refresh automatically.

### Add restrained motion with GLSL

Use shader fills for ambient backgrounds, emphasis, section dividers, and other motion that benefits the story. Prefer a workspace shader file when several decks or elements should share the same animation. Use a top-level `shaders` entry plus an internal shader fill when the effect belongs only to this deck.

The relevant fields for an internal shader definition and an artboard that uses it look like:

```json
{
  "shaders": {
    "ambient-waves": {
      "id": "ambient-waves",
      "name": "Ambient waves",
      "source": "vec4 surface(vec2 uv) { float wave = 0.5 + 0.5 * sin((uv.x + uv.y) * 10.0 - uTime * 0.35); vec3 color = mix(uColorA, uColorB, wave); return vec4(color, 1.0); }",
      "uniforms": [
        { "name": "uColorA", "label": "Color A", "type": "color", "default": "#111827" },
        { "name": "uColorB", "label": "Color B", "type": "color", "default": "#312e81" }
      ]
    }
  },
  "artboards": [
    {
      "id": "title-slide",
      "name": "Title",
      "x": 0,
      "y": 0,
      "width": 1920,
      "height": 1080,
      "fills": [
        {
          "type": "shader",
          "shaderId": "ambient-waves",
          "speed": 0.6
        }
      ]
    }
  ]
}
```

For a shared workspace shader, use:

```json
{ "type": "file", "fileType": "shader", "src": "/shaders/ambient-grid.glsl", "speed": 0.5 }
```

Implement internal sources as `vec4 surface(vec2 uv)`. Use the injected `uTime`, `uResolution`, `vUv`, `fbm`, `vnoise`, and `hash21` symbols without redeclaring them. Workspace Shadertoy files may instead use `mainImage`, `iTime`, and `iResolution` as documented in `arg-file-design`.

Keep animation subtle enough that text remains readable. Use uniform definitions for meaningful parameters instead of burying every choice in source. A `speed` of `0` freezes the shader; positive values scale time. Live presentation mode runs shaders and video, while SVG, PNG, and JPEG exports are static and bake one frame. A PowerPoint export bakes shader and 3D motion to a still frame but keeps a video clip playable - see below.

### Build and verify

1. Read the current deck and every referenced source before editing.
2. Outline the sections and slides, then establish shared type, color, margins, and grid.
3. Create the artboards and section order before adding detailed objects.
4. Link existing workspace assets and reusable `.design` components before drawing replacements.
5. Add shader or video motion only where it supports comprehension.
6. Validate with `parseDesign` and `stringifyDesign` from the bundled design editor module.
7. Open the `.design` in Slides view and step through presentation mode. Confirm section order, skipped slides, notes, clipping, linked content, and live animation.
8. Optionally run `arg design render <deck.design> --all-artboards` for static visual QA. Treat that render as a still-image check, not proof that motion works.

Deliver the `.design` deck as the primary artifact.

### Exporting to PowerPoint

In Slides view, **Download as .pptx** (the Export pill, or the More menu) writes the deck as an editable PowerPoint file - real shapes, text runs, pictures and notes pages, not one flat image per slide. Author for `.design` first and treat `.pptx` as the hand-off format; there is no need to build a second deck by hand. **Download as .pdf** sits beside it and is a page-per-artboard render, so it is the right choice when exact visual fidelity matters more than editability.

What carries over:

| Deck feature                                             | In the `.pptx`                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Artboards, in section order                              | Slides, in the same order                                                               |
| Sections                                                 | Native PowerPoint sections                                                              |
| Skipped slides                                           | Hidden slides - still in the deck, skipped in the show                                  |
| Presenter notes                                          | Notes pages, with the MDX flattened to plain text                                       |
| Text                                                     | Editable runs keeping family, size, weight, colour, alignment, tracking and line height |
| Fonts                                                    | Embedded, so the deck renders the same on a machine without them                        |
| Rectangles, ellipses, rounded corners                    | Native preset shapes with working adjust handles                                        |
| Polygons, stars, pen paths, boolean results              | Exact freeform shapes                                                                   |
| Images                                                   | Pictures, with cover/contain/fill/tile preserved as a source crop                       |
| Video                                                    | A playable embedded clip, with its poster as the frame                                  |
| Solid and gradient paint, strokes, shadows, blurs, glows | Native DrawingML equivalents                                                            |
| Document palette and typefaces                           | The deck's theme colours and font scheme                                                |

What does not, and what to tell the user: an angular (conic) gradient approximates to a linear ramp; blend modes and backdrop blur are dropped; auto-layout is baked to the positions it resolved to. Shader, 3D, KML, CAD, nested-design and `.psd` fills bake to a still image - they keep their look, not their motion.

Sizing: the FIRST slide sets the deck's slide size, and any artboard of a different size is scaled to fit and centred. Keep every slide the same size unless you intend that letterboxing.
