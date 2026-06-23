---
name: arg-file-video-edit
description: Create, read, and update Arg's .video non-linear editor (NLE) timeline projects — multi-track video/audio/text/effects edits that composite a live preview and render to MP4/WebM. Load when building or editing a .video timeline (montages, titles, transitions, color grades). For raw video files (mp4/mov/webm) use arg-file-video instead.
---

# Video editor / NLE timeline (`.video`)

A `.video` file is a JSON non-linear edit (NLE) project: an output resolution + frame rate, layered tracks, and the clips on each track. One shared timeline drives four views — **Simple** (iMovie), **Edit** (Premiere multitrack), **FX** (After Effects effects + keyframes), and **Color** (DaVinci grading). Arg composites a live preview in the browser, imports/exports OpenTimelineIO (`.otio`), and renders the timeline to MP4/WebM (More menu → "Export video").

This is the *edit project*, not a media file. Clips **reference** existing workspace media by `src` and keep a live link. To work with the underlying raw assets (mp4/mov/webm/mp3…), see `arg-file-video` / `arg-file-audio` / `arg-file-image`.

## CRUD

`.video` is text (JSON) — use your active Arg access method (`arg-mcp` / `arg-cli` / `arg-fuse` — see `arg-core`) and the shared rules in `arg-core`. Video-edit-specific:

- **Reference only media that already exists** in the workspace, by workspace-relative `src` (always starts with `/`). Never invent paths — a bad `src` renders nothing.
- Give every track and clip a **unique `id`**, and write valid, pretty-printed (2-space) JSON.
- **All timing is in seconds** (floats). Parsing deep-clones defaults and clamps/drops invalid values, so hand-authored files round-trip safely.

## Schema

### Top level — `VideoProject`

| Field | Type | Notes |
| --- | --- | --- |
| `version` | number | Use `1`. |
| `name` | string | Project name. |
| `settings` | object | `{ width, height, fps, sampleRate, background }` — default `1920×1080`, `fps 30`, `sampleRate 48000`, `background "#000000"`. Use `1080×1920` for vertical/social. |
| `tracks` | array | Layered tracks (see below). **Later tracks composite on top.** |
| `markers` | array | `{ id, time, label, color }` timeline markers. |
| `view` | string | Last-opened page: `simple` / `edit` / `fx` / `color` — cosmetic, all share the same data. |
| `playhead` | number | Seconds. |
| `pixelsPerSecond` | number | Timeline zoom (e.g. `80`). |
| `masterVolume` | number | `0`–`1`. |
| `showKeyframeLanes` / `autoKeyEnabled` | boolean | FX-view UI state; default `false`. |

### Track — `VideoTrack`

`{ id, kind, name, clips, muted, hidden, locked, solo, volume, opacity, height }`, optional `effects` (Filter[]) and `grade` (ColorGrade).

- `kind` is `"video"` or `"audio"`. **Video tracks** hold `video`/`image`/`text`/`solid`/`adjustment` clips; **audio tracks** hold `audio` clips.
- `volume`/`opacity` `0`–`1`; `height` is the track's pixel height in the timeline (e.g. `64`).

### Clip — `VideoClip`

Base: `{ id, type, name, enabled, start, duration }`.

- `type` — `video` / `audio` / `image` / `text` / `solid` / `adjustment`.
- `start` = position on the timeline (s); `duration` = length on the timeline (s). **Clips on one track must not overlap** — a track is a sequence; put overlapping content (titles over footage, picture-in-picture) on separate tracks.

Type-specific:
- **video / audio / image** — `src` (workspace path), `sourceIn` (seconds into the source to start), `sourceDuration` (full media length, `-1` if unknown — the editor fills it in), `speed` (retime, default `1`).
- **text** — `text` plus optional `textStyle` (see below).
- **solid** — `color` (a matte: backgrounds, flashes).
- **adjustment** — carries `filters` / `grade` that apply to every video track **beneath** it for the clip's duration.

Optional on any clip: `transform`, `opacity` (`0`–`1`), `blend`, `volume`/`fadeIn`/`fadeOut` (audio, seconds), `filters`, `grade`, `keyframes`, and a `transition` (or `transitionIn` / `transitionOut`).

### Sub-objects

- **`transform`** — `{ x, y, scale, rotation, anchorX, anchorY, flipH, flipV }`. Defaults `x:0, y:0, scale:1, rotation:0, anchorX:0.5, anchorY:0.5, flipH:false, flipV:false`.
- **`blend`** — `normal` (default), `multiply`, `screen`, `overlay`, `lighten`, `darken`, `color-dodge`, `difference`, `exclusion`.
- **`filters`** — array of `{ id, type, amount, enabled }`. `type` ∈ `blur`, `brightness`, `contrast`, `saturate`, `grayscale`, `sepia`, `hue-rotate`, `invert`, `vignette`, `sharpen`.
- **`grade`** (`ColorGrade`) — `{ enabled, exposure, contrast, saturation, temperature, tint, hueShift, lift, gamma, gain }`. `lift`/`gamma`/`gain` are RGB wheels `{ r, g, b }` (defaults `lift 0,0,0` · `gamma 1,1,1` · `gain 1,1,1`); scalars default `exposure 0, contrast 1, saturation 1, temperature 0, tint 0, hueShift 0`.
- **`textStyle`** — `{ fontFamily, fontSize, color, fontWeight, italic, align, verticalAlign, lineHeight, background, strokeColor, strokeWidth, shadow, letterSpacing }`. `fontSize` is a **fraction of frame height** (e.g. `0.12`); `align` is `left`/`center`/`right`; `verticalAlign` is `0`–`1`; `background`/`strokeColor` are a color or `null`.
- **`transition`** — `{ type, duration }`. `type` ∈ `none`, `cross-dissolve`, `dip-to-black`, `dip-to-white` **only** — `"fade"` / `"crossfade"` are **not** valid and are silently dropped (for a plain fade use the clip's numeric `fadeIn` / `fadeOut` instead). Prefer the per-clip fields **`transitionIn`** (played at the clip's start) and **`transitionOut`** (played at its end), each `{ type, duration }`; a bare `transition` is accepted as a legacy alias for `transitionOut`.
- **`keyframes`** — array of `{ id, prop, time, value, ease }`. `prop` is a target path: a core prop (`opacity`, `scale`, `rotation`, `x`, `y`, `volume`), a grade scalar (`grade.exposure`, `grade.contrast`, `grade.saturation`, `grade.temperature`, `grade.tint`, `grade.hueShift`), a grade wheel channel (`grade.lift.r` … `grade.gain.b`), or a stacked-effect amount (`filter.<filterId>.amount`).

## Complete example

A 1080p edit: an intro clip with a fade-out cross-dissolve, b-roll, a title on a second track, and a music bed.

```json
{
  "version": 1,
  "name": "My Edit",
  "settings": { "width": 1920, "height": 1080, "fps": 30, "sampleRate": 48000, "background": "#000000" },
  "view": "edit",
  "playhead": 0,
  "pixelsPerSecond": 80,
  "masterVolume": 1,
  "markers": [],
  "tracks": [
    {
      "id": "video-1", "kind": "video", "name": "V1",
      "muted": false, "hidden": false, "locked": false, "solo": false,
      "volume": 1, "opacity": 1, "height": 64,
      "clips": [
        { "id": "c1", "type": "video", "name": "Intro", "enabled": true, "src": "/clips/intro.mp4",
          "start": 0, "duration": 5, "sourceIn": 0, "sourceDuration": -1, "speed": 1,
          "fadeOut": 0.5, "transitionOut": { "type": "cross-dissolve", "duration": 1 } },
        { "id": "c2", "type": "video", "name": "B-roll", "enabled": true, "src": "/clips/broll.mp4",
          "start": 5, "duration": 4, "sourceIn": 2 }
      ]
    },
    {
      "id": "video-2", "kind": "video", "name": "V2",
      "muted": false, "hidden": false, "locked": false, "solo": false,
      "volume": 1, "opacity": 1, "height": 64,
      "clips": [
        { "id": "t1", "type": "text", "name": "Title", "enabled": true, "text": "Hello world",
          "start": 0.5, "duration": 3,
          "textStyle": { "fontFamily": "Inter, system-ui, sans-serif", "fontSize": 0.12, "color": "#ffffff", "fontWeight": 700, "align": "center", "verticalAlign": 0.5, "shadow": true } }
      ]
    },
    {
      "id": "audio-1", "kind": "audio", "name": "A1",
      "muted": false, "hidden": false, "locked": false, "solo": false,
      "volume": 1, "opacity": 1, "height": 48,
      "clips": [
        { "id": "a1", "type": "audio", "name": "Music", "enabled": true, "src": "/audio/music.mp3",
          "start": 0, "duration": 9, "sourceIn": 0, "volume": 0.7, "fadeOut": 1 }
      ]
    }
  ]
}
```

## Pitfalls (silent-failure traps)

The parser **silently drops unknown keys and invalid enum values** and falls back to defaults — that is what makes an edit look broken (overlapping titles, missing transitions, no motion). Avoid these:

- **Transitions:** the only valid `type`s are `cross-dissolve`, `dip-to-black`, `dip-to-white` (and `none`). `"fade"` / `"crossfade"` are dropped — for a plain fade use `fadeIn` / `fadeOut` (seconds) on the clip. Use `transitionIn` / `transitionOut` per clip.
- **Crossfade between two clips:** overlap them by the dissolve length and give the **incoming** (later-in-array) clip a `cross-dissolve` `transitionIn` — the later clip composites on top and dissolves in over the previous one. This deliberate overlap is the one exception to "no overlap on a track".
- **Images & video always _cover_ the frame** (fill + center-crop, aspect kept). There is **no `fit` field** — to reframe, zoom, or pan use `transform` (`scale`, `x`/`y`) and/or `keyframes`.
- **Ken Burns** (slow zoom/pan on a still) = `keyframes`, **not** an `animation` object. Keyframe `scale` (and/or `x`/`y`): `[{ "id":"k1","prop":"scale","time":0,"value":1,"ease":"ease-in-out" }, { "id":"k2","prop":"scale","time":4,"value":1.1,"ease":"ease-in-out" }]`. `time` is clip-local seconds.
- **Text:** the style object is `textStyle`, not `style`. `fontSize` is a **fraction of frame height** (≈`0.04`–`0.12`), **not pixels** — a pixel value like `48` clamps to `1.0` = full-frame-height text. Position with `align` (horizontal) + `verticalAlign` (`0` top … `1` bottom); text has no `x`/`y` percentage fields.
- **Titles overlap by default:** every text clip is centered, so two text clips on screen at once stack on top of each other. Separate them — keep `verticalAlign: 0.5` and offset each with `transform` (`y` in pixels, negative = up), or give one a low and one a high `verticalAlign`.
- **The `settings` wrapper is required:** `width`/`height`/`fps` live under `settings`; at the top level they're ignored and the project falls back to `1920×1080@30`. There is no top-level `duration` — length comes from the clips.
- **`kind` is on the track, `type` is on the clip** — don't swap them. A mis-keyed track falls back to `video` and drops the clips that don't match it.
- **Never invent:** `fit`/`objectFit`, `animation`/`kenBurns`, top-level `width`/`height`/`duration`, `style` on text, `x`/`y` percentages on text, `filters` as an object (it's an array). All are silently dropped.

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
