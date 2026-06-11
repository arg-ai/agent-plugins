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
- **`transition`** — `{ type, duration }`. `type` ∈ `none`, `cross-dissolve`, `dip-to-black`, `dip-to-white`.
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
          "fadeOut": 0.5, "transition": { "type": "cross-dissolve", "duration": 1 } },
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

## Tips

- Default `settings` to `1920×1080 @ 30fps` (`1080×1920` for vertical). If no usable media exists yet, scaffold one video + one audio track plus any requested text titles, and leave media clips out.
- Layer with tracks (later = on top); never overlap clips on a single track.
- Use an `adjustment` clip to grade/filter everything beneath it without touching each clip.
