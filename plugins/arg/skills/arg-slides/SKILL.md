---
name: arg-slides
version: "1.0.0"
description: Create, edit, and present Arg slide decks as native multi-artboard .design documents. Load for presentations, pitch decks, keynote-style talks, slide redesigns, or deck generation. Prefer .design over new .pptx or HTML decks so slides can use live inter-file references, video and 3D fills, reusable nested designs, presenter notes, and animated GLSL shader fills.
---

# Arg slides (`.design`)

Build new presentations as `.design` files. A deck is one design document whose artboards are slides, so it stays editable, presentable, and capable of rendering live workspace content. Create a `.pptx` only when the user explicitly needs a PowerPoint deliverable or must preserve an existing PowerPoint file.

## Load the companion skills

Load `arg-files` for shared file rules and the active access method (`arg-mcp` or `arg-cli`). Load `arg-file-design` before editing for the complete `.design` schema, file-fill rules, GLSL contract, and bundled `scripts/document-edit/design.mjs` helper.

Use this skill for presentation decisions. Treat `arg-file-design` as the source of truth for the document format when the two overlap.

## Start with a native deck

- Set `metadata.defaultView` to `"slides"`.
- Use one artboard per slide. Default to `1920x1080` for a 16:9 deck unless the user specifies another size.
- Keep every slide the same size unless the format deliberately changes.
- Put slides into `metadata.sections` when the story has named chapters. Section `artboardIds` define presentation order; artboard coordinates do not.
- Store presenter notes in each artboard's `notes` field as MDX. Keep notes intended for the presenter console plain-text-friendly.
- Set `skipped: true` on optional slides that should remain editable but not play.
- Arrange artboards in document space with a visible gap so Design view remains easy to scan. This geometry does not control presentation order.

Plan the story before drawing: establish the audience, decision or takeaway, narrative arc, and evidence available in the workspace. Favor one clear idea per slide, strong visual hierarchy, short copy, and repeated layout rules over a sequence of dense text panels.

## Prefer references over copies

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

## Add restrained motion with GLSL

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

Keep animation subtle enough that text remains readable. Use uniform definitions for meaningful parameters instead of burying every choice in source. A `speed` of `0` freezes the shader; positive values scale time. Live presentation mode runs shaders and video, while SVG, PNG, and JPEG exports are static and bake one frame. Any conversion to PowerPoint is likewise a static derivative.

## Build and verify

1. Read the current deck and every referenced source before editing.
2. Outline the sections and slides, then establish shared type, color, margins, and grid.
3. Create the artboards and section order before adding detailed objects.
4. Link existing workspace assets and reusable `.design` components before drawing replacements.
5. Add shader or video motion only where it supports comprehension.
6. Validate with `parseDesign` and `stringifyDesign` from the bundled design editor module.
7. Open the `.design` in Slides view and step through presentation mode. Confirm section order, skipped slides, notes, clipping, linked content, and live animation.
8. Optionally run `arg design render <deck.design> --all-artboards` for static visual QA. Treat that render as a still-image check, not proof that motion works.

Deliver the `.design` deck as the primary artifact. If the user also requests a static or PowerPoint-compatible output, create it as a secondary derivative and state that live references, video, 3D, and GLSL motion cannot remain live there.
