---
name: arg-file-video-edit
version: "1.4.2"
description: Create, read, and update Arg's .video non-linear editor (NLE) timeline projects — multi-track video/audio/GIF/text/effects edits, including reusable nested .video compositions, stingers, title packages, and prebuilt sequences, that composite a live preview and render to MP4/WebM. Load when building or editing a .video timeline (montages, animated GIFs, titles, transitions, color grades, or nested video projects). For raw video files (mp4/mov/webm), see arg-files.
---

# Video editor / NLE timeline (`.video`)

A `.video` file is a JSON non-linear edit (NLE) project: an output resolution + frame rate, layered tracks, and the clips on each track. The editor has two **layouts** (switch in the ⋯ menu, remembered per file): **Simple** — a friendly, insert-first layout with a creative sidebar and a floating properties panel (the default) — and **Advanced** — the full NLE. The advanced NLE shares one timeline across three views: **Edit** (Premiere multitrack), **FX** (After Effects effects + keyframes), and **Color** (DaVinci grading). Arg composites a live preview in the browser, imports/exports OpenTimelineIO (`.otio`), and renders the timeline to MP4/WebM (More menu → "Export video").

This is the _edit project_, not a media file. Clips **reference** existing workspace media or another `.video` project by `src` and keep a live link. The underlying raw assets (images, audio, video) have no dedicated skill — see `arg-files`.

## CRUD

`.video` is text (JSON) — use your active Arg access method (`arg-mcp` / `arg-cli` — see `arg-files`) and the shared rules in `arg-files`. Video-edit-specific:

- **Reference only media that already exists** in the workspace, by workspace-relative `src` (always starts with `/`). Never invent paths — a bad `src` renders nothing.
- The durable stored form of a workspace link is the pair `srcFileId` + `src`: the id is authoritative across moves and the path is the readable snapshot/fallback. Author new links by `src` only because the editor owns id minting; preserve both fields when a valid id already exists, and never invent an id or replace the path with one.
- Give every track and clip a **unique `id`**, and write valid, pretty-printed (2-space) JSON.
- **All timing is in seconds** (floats). The Arg editor normalizes invalid fields when it opens a project. The bundled editing library instead preserves unknown fields and rejects invalid timing or relationships, so validate helper output before writing.

## Editing library

For `.video` JSON, prefer the bundled dependency-free module at `scripts/document-edit/video.mjs`. It is generated from `@arg-ai/sdk` and preserves unknown fields while cloning every edit. Resolve that path from the installed skill directory. When the workspace is mounted locally, a complete edit looks like:

```js
import { readFile, writeFile } from "node:fs/promises";
import {
  parseVideo,
  patchVideoClip,
  stringifyVideo,
} from "/path/to/arg-file-video-edit/scripts/document-edit/video.mjs";

const path = process.argv[2];
const project = parseVideo(await readFile(path, "utf8"));
const updated = patchVideoClip(project, "title", { start: 1.5, duration: 4 });
await writeFile(path, stringifyVideo(updated));
```

Use the track and clip helpers for placement, compatibility, overlap, move, and split safety. Marker, keyframe, transcript, and file-reference helpers cover the other linked structures. Use `editVideo` with JSON `set`, `merge`, `delete`, `insert`, or `move` operations for uncommon leaf fields. Every structural helper validates before returning. With MCP or direct CLI access, read and write through that access method instead of `node:fs`; the library itself performs no network or authentication work.

Key call shapes: `addVideoClip(project, trackId, clip, { placement?: "reject" | "next-free" })`, `moveVideoClip(project, clipId, targetTrackId, start, options?)`, and `splitVideoClip(project, clipId, time, rightId?)`. Raw paths are arrays, for example `editVideo(project, [{ op: "set", path: ["settings", "fps"], value: 60 }])`. Import `common.mjs` directly when you need the shared `JsonEdit` helpers without a format module.

## Schema

### Top level — `VideoProject`

| Field                                  | Type    | Notes                                                                                                                                                                                                              |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `version`                              | number  | Use `1`.                                                                                                                                                                                                           |
| `name`                                 | string  | Project name.                                                                                                                                                                                                      |
| `settings`                             | object  | `{ width, height, fps, sampleRate, background }` — default `1920×1080`, `fps 30`, `sampleRate 48000`, `background "#000000"`. Use `1080×1920` for vertical/social. Optional `crop` (see below).                    |
| `grade`                                | object  | Optional **program (master) grade** — a `ColorGrade` (same shape as a clip `grade`) applied to the **whole timeline** as a final pass. Grades stack in order: clip `grade` < `adjustment` grade < program `grade`. |
| `tracks`                               | array   | Layered tracks (see below). **Later tracks composite on top.**                                                                                                                                                     |
| `markers`                              | array   | `{ id, time, label, color }` timeline markers.                                                                                                                                                                     |
| `view`                                 | string  | Last-opened advanced-NLE page: `edit` / `fx` / `color` — cosmetic (a legacy `simple` opens as `edit`). Distinct from `defaultLayout`.                                                                              |
| `defaultLayout`                        | string  | Optional. Editor chrome the file opens with: `simple` (default) or `advanced`. Chrome only — never affects the rendered output. Omit unless a layout is requested.                                                 |
| `playhead`                             | number  | Seconds.                                                                                                                                                                                                           |
| `pixelsPerSecond`                      | number  | Timeline zoom (e.g. `80`).                                                                                                                                                                                         |
| `masterVolume`                         | number  | `0`–`1`.                                                                                                                                                                                                           |
| `showKeyframeLanes` / `autoKeyEnabled` | boolean | FX-view UI state; default `false`.                                                                                                                                                                                 |

**Sequence crop.** Optional `settings.crop: { left, right, top, bottom }` — each side is a fraction `0`–`0.45` trimmed off that frame edge. The exported/preview output is the remaining inset rectangle (output dimensions shrink, like a real crop). Omit for no crop.

### Track — `VideoTrack`

`{ id, kind, name, clips, muted, hidden, locked, solo, volume, opacity, height }`, optional `effects` (Filter[]) and `grade` (ColorGrade).

- `kind` is `"video"`, `"audio"`, or `"zoom"`. **Video tracks** hold `video`/`image`/`gif`/`cast`/`text`/`solid`/`adjustment`/`stock`/`weather`/`shape`/`embed`/`object3d`/`shader`/`kml` clips; **audio tracks** hold `audio` clips; **zoom tracks** hold `zoom` clips (the camera track — usually one per project).
- `volume`/`opacity` `0`–`1`; `height` is the track's pixel height in the timeline (e.g. `64`).

### Clip — `VideoClip`

Base: `{ id, type, name, enabled, start, duration }`.

Workspace-backed `src` clips may also contain the UI-managed `srcFileId` (`argfile_<uuid>`). A clip with cursor telemetry may pair `cursorTelemetrySrc` with `cursorTelemetryFileId`. These ids are optional and additive; the path remains the readable fallback.

- `type` — `video` / `audio` / `image` / `gif` / `cast` / `text` / `solid` / `adjustment` / `stock` / `weather` / `shape` / `embed` / `object3d` / `shader` / `kml` / `zoom`.
- `start` = position on the timeline (s); `duration` = length on the timeline (s). Clips on one track must not overlap except when an incoming clip uses a `cross-dissolve` `transitionIn`; put other overlapping content (titles over footage, picture-in-picture) on separate tracks.

Type-specific:

- **`zoom`** (on a `"zoom"` track) — a Screen-Studio-style camera zoom over the whole composite for the clip's span: `"zoom": { "depth": 1.8, "motion": "smooth", "ramp": 0.5, "anchor": { "kind": "fixed", "px": 0.3, "py": 0.6 } }`. `depth` 1–5 (1 = no zoom); `motion` `smooth`/`snappy`/`bouncy`/`cut` (spring feel; `cut` = instant, no ramp); `ramp` = transition seconds; `anchor` = `{"kind":"center"}`, `{"kind":"fixed","px":0–1,"py":0–1}` (the point that fills the frame at peak), or `{"kind":"cursor"}` (follows recorded cursor telemetry when available). Nearby zooms (<0.4 s gap) pan directly between focus points.

- **video / audio / image / gif** — `src` (workspace path), `sourceIn` (seconds into the source to start), `sourceDuration` (full media length, `-1` if unknown — the editor fills it in), `speed` (retime, default `1`). On **video / image / gif**, `objectFit` controls how the media fills its box: `cover` (default — fill + center-crop), `contain` (fit + letterbox), `fill` (stretch). A `gif` is timeline-linked media, not a wall-clock `<img>`: its decoded frame is selected from `(sourceIn + clip-local time × speed)` and loops when the clip is longer than one GIF cycle, so scrubbing and export land on the same frame. Use `type: "gif"` for `.gif` sources rather than `image`.
- **Nested video projects** - a `video` clip may point its `src` at an existing workspace `.video` project. Use this for reusable compositions such as stingers, bumpers, title packages, branded sections, prebuilt sequences, or a larger edit assembled from smaller edits. Keep `type: "video"` and reference the child project; do not add a new clip type, copy its tracks into the parent, or embed its JSON. Its rendered picture and mixed audio behave like a normal video source, including `sourceIn`, `speed`, transforms, gain, fades, mute, and solo. Reuse the same child from as many ordinary clips as needed: connected cuts share a bounded child materialization while each parent clip keeps its own timing and effects. The persisted child link remains the `srcFileId` + `src` pair described above. Product code must load the child and its descendant media through the normal workspace asset path (`useWorkspaceAsset` / `resolveWorkspaceAsset`, or the host's standard `GetFileAssetUrl` resolver in imperative and headless code), never with a direct fetch or a parallel URL cache. Assets and further `.video` / `.daw` projects referenced by the child stay linked workspace files; durable ids survive moves and headless hosts stage them recursively. Cyclic or excessively deep project graphs are rejected. Full iOS and Android file views use the shared web compositor; lightweight Reels cards remain static and open that full viewer when tapped.
- **DAW-backed audio** — an `audio` clip may point its `src` at an existing workspace `.daw` project. Keep `type: "audio"` and reference the project by path; do not add a new clip type or embed the DAW JSON. Browser/desktop preview and browser/cloud/CLI export bounce it through the shared DAW renderer, including the standard 2-second tail. Audio clips and sampler files referenced inside the DAW remain linked workspace assets; their durable file ids survive renames and moves, and headless render hosts stage them automatically. Native iOS and Android read-only video players do not support DAW-backed audio.
- **cast** — an asciinema terminal recording (`.cast`) replayed against the playhead, with `src`, `sourceIn`, `sourceDuration` and `speed` like any other timed source. A recording is finite (unlike a looping `gif`), so a clip outliving its source holds the final frame. Styling lives in `cast: { zoom, theme, background: { r, g, b }, backgroundAlpha }`. `zoom` is the terminal size relative to the clip box: `1` (default) fits the box, so resizing the box scales the terminal; above `1` punches in and crops; below `1` insets it. `theme` is a palette preset (`dark` (default) / `light` / `solarized` / `dracula`); an unknown id falls back to `dark`. `backgroundAlpha` of `0` leaves the box clear so the terminal composites over the tracks beneath it. `zoom`, `backgroundAlpha` and each `background` channel are **keyframable** via `cast.zoom` / `cast.backgroundAlpha` / `cast.background.<r|g|b>` (see below) — keyframing `cast.zoom` reads as a terminal punch-in. `theme` is a discrete preset and is deliberately not keyframable. Use `type: "cast"` for `.cast` sources rather than `embed`.
- **text** — `text` plus optional `textStyle` and `textAnim` (see below).
- **solid** — `color` (a matte: backgrounds, flashes).
- **adjustment** — an adjustment layer: its full `grade` (incl. the lift/gamma/gain wheels, temperature/tint and vignette) and `filters` stack apply to every video track **beneath** it for the clip's duration. The main way to grade or add an effect across several clips at once. In the Simple layout, the sidebar's "Effects" are one-click preset-seeded adjustment layers.
- **stock** — a live ticker chart fetched at render/export time. `symbol` (e.g. `"AAPL"`, `"BTC/USD"`), `stockRange` (`1D`/`1W`/`1M`/`3M`/`6M`/`1Y`/`5Y`, default `1M`), `stockChart` (`area`/`line`/`candles`, default `area`). Only the config persists.
- **weather** — a live forecast card fetched at render/export time. `weatherLocation` (e.g. `"San Francisco"`), optional `weatherLatitude`/`weatherLongitude`/`weatherTimezone` (resolved coords), `weatherDays` (`1`/`3`/`7`/`10`/`16`, default `7`), `weatherUnit` (`celsius`/`fahrenheit`), `weatherChart` (`temperature`/`precipitation`/`wind`/`none`).
- **shape** — a vector shape (no `src`): `shape: { preset, spec, fill, stroke, strokeWidth }`. `fill` is a hex color or `"none"` (outline-only); `stroke` is a hex color or `null` (no outline); `strokeWidth` is `0`–`40` in the `0..100` viewBox. `spec` is one of `{kind:"rect",corner?}`, `{kind:"ellipse"}`, `{kind:"polygon",sides,rotation?}`, `{kind:"star",points,innerRatio}`, or `{kind:"path",d}` (`d` is a `0..100` viewBox SVG path).
- **embed** — embeds a workspace file via `src`, plus optional `embedFit` (`"contain"`/`"cover"`, default `contain`) and `embedOutline`/`embedToolbars`/`embedHeader`/`embedInteractive` (default `false`). Embeds are full bleed by default: no frame, header, or child-editor chrome. The live document renders in both the editor preview and the exported video (rasterised to an image at export time; a clip that can't be rendered falls back to a placard card), including when this project is itself used as a nested `.video` source. For a **paged** embed — a `.pptx`/`.potx` deck or a `.design` file — `embedPage` (0-based) picks which slide (deck) or artboard (design) shows, fit to the frame; out-of-range clamps to the last page. `embedPage` is **keyframeable** (see below), so one clip can step through a deck/design over time.
- **object3d** — a 3D model layer whose `src` is a workspace model path (`.glb` preferred; `.gltf`/`.obj`/`.stl`/`.ply`/`.fbx`/`.3mf`/`.usd`/`.usda`/`.usdc`/`.usdz` ok, plus Gaussian splats `.splat`/`.ksplat`/`.spz`), plus optional `model3d: { yaw, pitch (-89..89), distance (0.2..50), fov (10..90), panX/panY (-5..5), environment (studio/sunset/dawn/night/neutral), exposure (0.2..3), background (hex or null) }`. The camera is animatable via `keyframes` (see below). The model renders at a static pose (no auto-rotate) — double-click it in the editor to orbit (drag to orbit, shift-drag to pan, scroll to zoom).
- **shader** — a GLSL fragment-shader layer (no `src`; the code is stored inline), rendered fullscreen in its box on a WebGL2 quad. `shader: { source, uniforms, values, speed }`. `source` is Shadertoy-style GLSL — implement either `vec4 surface(vec2 uv)` (uv is `0..1`) or `void mainImage(out vec4 c, in vec2 fragCoord)`. `uniforms` is the parameter schema (`[{ name, label, type, default, min?, max?, step? }]`, `type` ∈ `float`/`color`/`vec2`/`bool`); `values` holds the current per-uniform values (missing → the def's `default`); `speed` multiplies the time uniform (default `1`). **Time uniforms** available inside the shader (do not redeclare — the host injects them): `iTime`/`uTime` = the timeline playhead in seconds × `speed` (so shader clips share one clock and seek/export deterministically), `iClipTime` = seconds since this clip started, `iClipProgress` = `0..1` across the clip's duration, `iClipDuration` = the clip length in seconds, plus the usual `iResolution`, `iTimeDelta`, `iFrame`. Float/`vec2`/`color` uniforms are **keyframable** (see below). Pick a ready-made look from the built-in preset library in the editor, or write your own. Great for animated backgrounds, overlays, and transitions.
- **kml** - a workspace `.kml` / `.kmz` document rendered as a map layer, referenced by `src`. Styling and the view live in `kml: { basemap, fitBounds, centerLng, centerLat, zoom, padding, background, strokeWidth, pointRadius, showLabels, labelColor, labelOutlineColor, labelOutlineWidth, labelFontSize, basemapOpacity }`. `basemap` is the raster tile layer painted underneath (`none` / `light` (default) / `dark` / `streets` / `satellite` / `satellite-labels`); `fitBounds` (default `true`) frames the whole document and ignores `centerLng`/`centerLat`/`zoom`, which drive the view when it is `false`. `zoom` is a web-Mercator tile level `0`-`22`; `padding` is `0`-`256` px around fitted bounds; `strokeWidth` is a `0.25`-`8` line multiplier; `pointRadius` is a `0`-`40` px marker radius (`0` hides markers); `labelColor` is a hex color or `null` to follow each feature; `labelOutlineColor` is a hex color (default `#ffffff`) or `null` to follow `background`; `labelOutlineWidth` is `0`-`8` px; `labelFontSize` is `8`-`48` px; and `basemapOpacity` (`0`-`1`) dims only the tiles. A placemark's own KML `<LabelStyle><color>` overrides `labelColor`. Polygons draw first, then lines, then point markers, then labels, so a marker is never buried. A map has no intrinsic duration - it is a fixed-length, freely trimmable layer like `image` or `shape`. The view is deliberately **not** keyframeable: the export bakes the basemap tiles for one resolved view, so an animated camera would render frames with a missing basemap. Ground overlays and custom placemark icons are not drawn (their hrefs are arbitrary remote URLs).

Optional on any clip: `transform`, `opacity` (`0`–`1`), `blend`, `volume`/`fadeIn`/`fadeOut` (audio, seconds), `filters`, `grade`, `keyframes`, and a `transition` (or `transitionIn` / `transitionOut`).

### Sub-objects

- **`transform`** — `{ x, y, scale, rotation, anchorX, anchorY, flipH, flipV }`, plus an optional box `{ width, height }` (project pixels, before `scale`; both must be present together). Defaults `x:0, y:0, scale:1, rotation:0, anchorX:0.5, anchorY:0.5, flipH:false, flipV:false`; omit `width`/`height` to fill the whole frame (for a `text` clip the box is the wrap width that `align`/`verticalAlign` position within). The box applies **only at the default center anchor**. `scale` is the only geometry channel that keyframes.
- **`blend`** — `normal` (default), `multiply`, `screen`, `overlay`, `lighten`, `darken`, `color-dodge`, `difference`, `exclusion`.
- **`filters`** — array of `{ id, type, amount, enabled }`. `type` ∈ `blur`, `brightness`, `contrast`, `saturate`, `grayscale`, `sepia`, `hue-rotate`, `invert`, `vignette`, `sharpen`.
- **`grade`** (`ColorGrade`) — `{ enabled, exposure, contrast, saturation, temperature, tint, hueShift, lift, gamma, gain }`. `lift`/`gamma`/`gain` are RGB wheels `{ r, g, b }` (defaults `lift 0,0,0` · `gamma 1,1,1` · `gain 1,1,1`); scalars default `exposure 0, contrast 1, saturation 1, temperature 0, tint 0, hueShift 0`.
- **`textStyle`** — `{ fontFamily, fontSize, color, fontWeight, italic, align, verticalAlign, textDecoration, lineHeight, background, strokeColor, strokeWidth, shadow, letterSpacing }`. `fontSize` is a **fraction of frame height** (e.g. `0.12`); `align` is `left`/`center`/`right`/`justify`; `verticalAlign` is `0`–`1`; `textDecoration` is `none`/`underline`/`line-through` (default `none`); `fontWeight` is `100`–`900`; `background`/`strokeColor` are a color or `null`.
- **`textAnim`** (optional, text clips only) — `{ unit, in?, out?, loop? }`. Animates text by splitting it into units and staggering a reveal/exit motion per unit. `unit` ∈ `"character"` / `"word"` / `"line"` / `"block"`. Each slot is a `TextAnimSpec`: `{ preset, duration, stagger }`. Enter/exit `preset` ∈ `fade`, `rise`, `drop`, `slide-left`, `slide-right`, `pop`, `zoom`, `blur`, `spin`, `flip`, `flip-y`, `typewriter`, `bounce`, `swing`, `roll`, `wave`. Loop `preset` ∈ `wave`, `bounce`, `pulse`, `shake`, `float`, `swing`, `jitter`, `wiggle`. `duration` (seconds, `0.05`–`20`); `stagger` (`0`–`1`, fraction of duration spread across units). Omit unused slots; an all-empty `textAnim` is dropped.
- **`transition`** — `{ type, duration }`, plus optional `direction` (`left`/`right`/`up`/`down`, for `wipe`/`slide`/`push`) and `softness` (`0`–`1` edge feather, for `wipe`/`iris`). Valid `type`s: `none`, `cross-dissolve`, `dip-to-black`, `dip-to-white`, `wipe`, `slide`, `push`, `zoom`, `spin`, `iris`, `blur-dissolve`, `glitch`. `"fade"` / `"crossfade"` are **not** valid and are silently dropped (for a plain fade use the clip's numeric `fadeIn` / `fadeOut` instead). Prefer the per-clip fields **`transitionIn`** (played at the clip's start) and **`transitionOut`** (played at its end), each with this shape; a bare `transition` is accepted as a legacy alias for `transitionOut`.
- **`keyframes`** — array of `{ id, prop, time, value, ease }` (`time` is **clip-local seconds**). `prop` is a target path: a core prop (`opacity`, `scale`, `rotation`, `x`, `y`, `volume`), a grade scalar (`grade.exposure`, `grade.contrast`, `grade.saturation`, `grade.temperature`, `grade.tint`, `grade.hueShift`), a grade wheel channel (`grade.lift.r` … `grade.gain.b`), a stacked-effect amount (`filter.<filterId>.amount`), on `object3d` clips a camera channel (`model3d.yaw`, `model3d.pitch`, `model3d.distance`, `model3d.fov`, `model3d.panX`, `model3d.panY`, `model3d.exposure`), on paged `embed` clips (`.pptx`/`.design`) the shown page (`embedPage`, a whole slide/artboard index — use `ease: "hold"` to step cleanly between pages rather than interpolating), on `cast` clips a styling channel (`cast.zoom`, `cast.backgroundAlpha`, `cast.background.r` / `.g` / `.b`), or — on `shader` clips — a uniform channel: `shader.<uniformName>` for a `float`, `shader.<uniformName>.x` / `.y` for a `vec2`, and `shader.<uniformName>.r` / `.g` / `.b` for a `color`.

**Transcripts & transcript-driven cuts.** Word-level transcripts live at the **project level**, in `transcripts` (a map keyed by media source path: `{ "<path>": { sourceSignature, provider, model, words: [{ text, start, end }] } }`, times in source-media seconds). `sourceSignature` is the media's `size:etag` when transcribed; a mismatch means the words are stale. The editor's Transcript view transcribes a clip's source and lets you delete words as text — each deletion **physically cuts** the covering clip on that track (real `start`/`sourceIn`/`duration` splits, the removed footage dropped), optionally rippling the track to close the gap. There is no per-clip "removed spans" field; a cut is just the resulting clips. Agents may read `transcripts` (e.g. to find a word's timestamp) or set it when importing an existing transcript; to remove speech, cut the clips directly.

## Complete example

A 1080p edit: an intro clip with a fade-out cross-dissolve, b-roll, a title on a second track, and a music bed.

```json
{
  "version": 1,
  "name": "My Edit",
  "settings": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "sampleRate": 48000,
    "background": "#000000"
  },
  "view": "edit",
  "playhead": 0,
  "pixelsPerSecond": 80,
  "masterVolume": 1,
  "markers": [],
  "tracks": [
    {
      "id": "video-1",
      "kind": "video",
      "name": "V1",
      "muted": false,
      "hidden": false,
      "locked": false,
      "solo": false,
      "volume": 1,
      "opacity": 1,
      "height": 64,
      "clips": [
        {
          "id": "c1",
          "type": "video",
          "name": "Intro",
          "enabled": true,
          "src": "/clips/intro.mp4",
          "start": 0,
          "duration": 5,
          "sourceIn": 0,
          "sourceDuration": -1,
          "speed": 1,
          "fadeOut": 0.5,
          "transitionOut": { "type": "cross-dissolve", "duration": 1 }
        },
        {
          "id": "c2",
          "type": "video",
          "name": "B-roll",
          "enabled": true,
          "src": "/clips/broll.mp4",
          "start": 5,
          "duration": 4,
          "sourceIn": 2
        }
      ]
    },
    {
      "id": "video-2",
      "kind": "video",
      "name": "V2",
      "muted": false,
      "hidden": false,
      "locked": false,
      "solo": false,
      "volume": 1,
      "opacity": 1,
      "height": 64,
      "clips": [
        {
          "id": "t1",
          "type": "text",
          "name": "Title",
          "enabled": true,
          "text": "Hello world",
          "start": 0.5,
          "duration": 3,
          "textStyle": {
            "fontFamily": "Inter",
            "fontSize": 0.12,
            "color": "#ffffff",
            "fontWeight": 700,
            "align": "center",
            "verticalAlign": 0.5,
            "shadow": true
          },
          "textAnim": {
            "unit": "word",
            "in": { "preset": "rise", "duration": 0.5, "stagger": 0.4 },
            "out": { "preset": "fade", "duration": 0.35, "stagger": 0.2 }
          }
        }
      ]
    },
    {
      "id": "audio-1",
      "kind": "audio",
      "name": "A1",
      "muted": false,
      "hidden": false,
      "locked": false,
      "solo": false,
      "volume": 1,
      "opacity": 1,
      "height": 48,
      "clips": [
        {
          "id": "a1",
          "type": "audio",
          "name": "Music",
          "enabled": true,
          "src": "/audio/music.mp3",
          "start": 0,
          "duration": 9,
          "sourceIn": 0,
          "volume": 0.7,
          "fadeOut": 1
        }
      ]
    }
  ]
}
```

## Pitfalls (silent-failure traps)

The Arg editor parser **silently drops unsupported keys and invalid enum values** and falls back to defaults - that is what makes an edit look broken (overlapping titles, missing transitions, no motion). Avoid these:

- **Transitions:** valid `type`s are `none`, `cross-dissolve`, `dip-to-black`, `dip-to-white`, `wipe`, `slide`, `push`, `zoom`, `spin`, `iris`, `blur-dissolve`, `glitch` (add `direction` for `wipe`/`slide`/`push`, `softness` for `wipe`/`iris`). `"fade"` / `"crossfade"` are **not** valid and are dropped — for a plain fade use `fadeIn` / `fadeOut` (seconds) on the clip. Use `transitionIn` / `transitionOut` per clip.
- **Crossfade between two clips:** overlap them by the dissolve length and give the **incoming** (later-in-array) clip a `cross-dissolve` `transitionIn` — the later clip composites on top and dissolves in over the previous one. This deliberate overlap is the one exception to "no overlap on a track".
- **Images, GIFs & video _cover_ the frame by default** (fill + center-crop, aspect kept). To letterbox instead of crop set `objectFit: "contain"` (or `"fill"` to stretch); the field is `objectFit`, **not** `fit`/`objectfit`. To reframe, zoom, or pan use `transform` (`scale`, `x`/`y`) and/or `keyframes`.
- **Ken Burns** (slow zoom/pan on a still) = `keyframes`, **not** an `animation` object. Keyframe `scale` (and/or `x`/`y`): `[{ "id":"k1","prop":"scale","time":0,"value":1,"ease":"ease-in-out" }, { "id":"k2","prop":"scale","time":4,"value":1.1,"ease":"ease-in-out" }]`. `time` is clip-local seconds.
- **Text:** the style object is `textStyle`, not `style`. `fontSize` is a **fraction of frame height** (≈`0.04`–`0.12`), **not pixels** — a pixel value like `48` clamps to `1.0` = full-frame-height text. Position with `align` (horizontal, `left`/`center`/`right`/`justify`) + `verticalAlign` (`0` top … `1` bottom); text has no `x`/`y` percentage fields. Underline / strikethrough is `textDecoration`, not a CSS string.
- **Titles overlap by default:** every text clip is centered, so two text clips on screen at once stack on top of each other. Separate them — keep `verticalAlign: 0.5` and offset each with `transform` (`y` in pixels, negative = up), or give one a low and one a high `verticalAlign`.
- **The `settings` wrapper is required:** `width`/`height`/`fps` live under `settings`; at the top level they're ignored and the project falls back to `1920×1080@30`. There is no top-level `duration` — length comes from the clips.
- **`kind` is on the track, `type` is on the clip** — don't swap them. A mis-keyed track falls back to `video` and drops the clips that don't match it.
- **Never invent:** `fit` (the field is `objectFit`), `animation` (text animations use `textAnim`), `kenBurns`, top-level `width`/`height`/`duration` (box size goes in `transform.width`/`height`), `style` on text, `x`/`y` percentages on text, `filters` as an object (it's an array). All are silently dropped.

## Rendering a timeline to a video file

Two routes:

- **`render_video` action (cloud)** — no local setup, no length cap. It shards the timeline across GPU containers and stitches the segments, writing the finished file straight into the workspace, so nothing is streamed back through the response. Outputs **mp4** (default), **mov**, **mkv** or **webm**. A 26-minute 1080p60 timeline renders in a few minutes; the run reports progress while it works.
- **`arg video render <path.video>` (CLI)** — the offline route. Provisions a local browser + ffmpeg and streams the encode to disk. Use it when you want the file on the local machine rather than in the workspace, or when working without network access. Run `arg video render install` once first.

Both drive the **same** web exporter, so the picture is identical either way — only the host differs.

Optional `render_video` inputs, for when the finished file matters more than the render being untouched:

- `max_height` — downscale (aspect preserved, never upscales), e.g. `720`.
- `fps` — output frame rate, e.g. `30`.
- `quality` — `original` (default), `high`, `medium`, `low`.

`original` with no `max_height`/`fps` copies the rendered stream, which is the fastest path and loses nothing. Any other setting re-encodes the whole timeline: slower, but a much smaller file (a 26-minute render is ~486 MB untouched, ~68 MB at 720p30 `medium`).

## Layering & positioning

- **What draws on top:** video tracks composite **back-to-front in array order** — the first video track is the backdrop and each later one draws over it. Put base footage on the first video track and overlays (titles, logos, lower-thirds, picture-in-picture) on tracks **after** it. If two clips on the _same_ track overlap in time, the one later in that track's `clips` array wins. `hidden: true` removes a track; `solo: true` shows only soloed video tracks; audio level is `clip.volume` × `track.volume` × `masterVolume`.
- **Placing a clip on the frame:** `transform.x`/`y` are **project pixels measured from the frame center** (`x > 0` right, `y > 0` down; negatives go left/up), so values run roughly ±width/2 by ±height/2. `scale` `1` fills the frame, `< 1` shrinks it (around `anchorX`/`anchorY`, default center `0.5`/`0.5`), `> 1` zooms in; `rotation` is degrees; `flipH`/`flipV` mirror.
- **Picture-in-picture / corner logo / split panels:** put the overlay on its own video track _above_ the base, shrink with `scale`, and move with `x`/`y` — e.g. a webcam in the top-right of a 1920×1080 frame: `"transform": { "scale": 0.3, "x": 600, "y": -320 }`.

## Photo-slideshow recipe

The most common request — stills with Ken Burns, crossfades, captions, and music. Photos on one video track (overlap each pair by the dissolve length; the incoming clip gets a `cross-dissolve` `transitionIn`; every photo gets gentle `scale` keyframes); captions on a **second** video track above it, positioned out of each other's way; music on an audio track with `fadeIn` / `fadeOut`.

```json
"tracks": [
  { "id": "v-photos", "kind": "video", "name": "Photos", "clips": [
    { "id": "p1", "type": "image", "name": "Photo 1", "enabled": true, "src": "/photos/01.jpg",
      "start": 0, "duration": 4, "fadeIn": 0.6,
      "keyframes": [ { "id": "k1", "prop": "scale", "time": 0, "value": 1.0, "ease": "ease-in-out" },
                     { "id": "k2", "prop": "scale", "time": 4, "value": 1.10, "ease": "ease-in-out" } ] },
    { "id": "p2", "type": "image", "name": "Photo 2", "enabled": true, "src": "/photos/02.jpg",
      "start": 3.4, "duration": 4, "fadeOut": 1.0,
      "transitionIn": { "type": "cross-dissolve", "duration": 0.6 },
      "keyframes": [ { "id": "k3", "prop": "scale", "time": 0, "value": 1.10, "ease": "ease-in-out" },
                     { "id": "k4", "prop": "scale", "time": 4, "value": 1.0, "ease": "ease-in-out" } ] }
  ] },
  { "id": "v-titles", "kind": "video", "name": "Titles", "clips": [
    { "id": "tt1", "type": "text", "name": "Title", "enabled": true, "text": "VAN GOGH",
      "start": 0.3, "duration": 3.4, "fadeIn": 0.4, "fadeOut": 0.4, "transform": { "y": 300 },
      "textStyle": { "fontSize": 0.06, "color": "#ffffff", "fontWeight": 700, "align": "left", "verticalAlign": 0.5, "shadow": true } },
    { "id": "ts1", "type": "text", "name": "Caption", "enabled": true, "text": "Wheat Field with Cypresses, 1889",
      "start": 0.5, "duration": 3.2, "fadeIn": 0.4, "fadeOut": 0.4, "transform": { "y": 378 },
      "textStyle": { "fontSize": 0.028, "color": "#e8c87a", "fontWeight": 400, "align": "left", "verticalAlign": 0.5 } }
  ] },
  { "id": "a-music", "kind": "audio", "name": "Music", "clips": [
    { "id": "m1", "type": "audio", "name": "Score", "enabled": true, "src": "/music/score.mp3",
      "start": 0, "duration": 7.4, "volume": 0.6, "fadeIn": 1.0, "fadeOut": 2.0 }
  ] }
]
```

## Tips

- Default `settings` to `1920×1080 @ 30fps` (`1080×1920` for vertical). If no usable media exists yet, scaffold one video + one audio track plus any requested text titles, and leave media clips out.
- Layer with tracks (later = on top); clips on one track play in sequence — overlap two only to crossfade (see Layering & positioning).
- Use an `adjustment` clip to grade/filter everything beneath it without touching each clip.
- **Data clips** (`stock` / `weather`) need no `src` — they render a live card from their config. Place them on a video track like any visual clip, size with `transform`, and animate with `keyframes`:

```json
{ "id": "s1", "type": "stock", "name": "AAPL", "enabled": true, "start": 0, "duration": 5,
  "symbol": "AAPL", "stockRange": "1M", "stockChart": "area" }
{ "id": "w1", "type": "weather", "name": "SF", "enabled": true, "start": 0, "duration": 5,
  "weatherLocation": "San Francisco", "weatherDays": 7, "weatherUnit": "fahrenheit", "weatherChart": "temperature" }
```

- **Shader clips** (`shader`) render inline GLSL fullscreen and need no `src`. Fill the frame by omitting `transform.width`/`height`; animate uniforms with `keyframes` on `shader.<uniform>` paths. The host injects `iTime` (playhead × `speed`), `iClipTime`, `iClipProgress`, `iResolution` etc. — don't redeclare them:

```json
{
  "id": "bg1",
  "type": "shader",
  "name": "Aurora",
  "enabled": true,
  "start": 0,
  "duration": 6,
  "shader": {
    "source": "vec4 surface(vec2 uv){ float w = sin(uv.x*6.0 + iTime) * 0.15; float g = smoothstep(0.5+w, 0.2, uv.y); return vec4(mix(uColorA, uColorB, uv.y) * g, 1.0); }",
    "uniforms": [
      { "name": "uColorA", "label": "Top", "type": "color", "default": "#0b1e3f" },
      { "name": "uColorB", "label": "Bottom", "type": "color", "default": "#38f9d7" }
    ],
    "values": {},
    "speed": 1
  },
  "keyframes": [
    { "id": "k1", "prop": "shader.uColorB.g", "time": 0, "value": 0.9, "ease": "ease-in-out" },
    { "id": "k2", "prop": "shader.uColorB.g", "time": 6, "value": 0.3, "ease": "ease-in-out" }
  ]
}
```
