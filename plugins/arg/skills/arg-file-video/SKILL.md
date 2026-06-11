---
name: arg-file-video
description: Create, read, update, and delete video files (mp4, mov, webm) in Arg. Load when adding, replacing, inspecting, trimming, or generating video assets.
---

# Video files (`.mp4`, `.mov`, `.webm`)

Video is **binary** — it can't be written as text. Arg's video editor offers playback, trim markers, frame capture (saves the current frame as a sibling `.png`), and an AI Edit panel for video-to-video transformation. It opens mp4, webm, mov, m4v, ogv, mkv, avi, 3gp, and 3g2.

> For a **multi-clip timeline edit** (tracks, titles, transitions, color grade, render to MP4/WebM), use the `arg-file-video-edit` skill — that's Arg's `.video` NLE project format, which references raw video files like these by path.

## CRUD

Binary format — see `arg-core` and your access-method skill (`arg-mcp` / `arg-cli` / `arg-fuse`) for reading/writing bytes (video can't be written as text). Video-specific:

- Produce or re-encode/trim with `ffmpeg` — your access method says where it runs; it opens in the editor.
- Read the bytes and inspect duration, resolution, frame rate, and codec before editing.
- Video is an opaque asset — not edited frame-by-frame; regenerate and overwrite.

## Guidance

- Pick container/codec for the use case: `mp4` (H.264/H.265) for broad compatibility, `webm` (VP9/AV1) for the web, `mov` for editing/ProRes. Avoid re-encoding unless asked — it costs quality and time.
- Keep resolution and aspect ratio unless a change is requested.
- Large files take time to transfer — confirm the operation finished before reporting success.
