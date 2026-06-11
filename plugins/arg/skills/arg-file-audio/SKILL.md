---
name: arg-file-audio
description: Create, read, update, and delete audio files (wav, mp3) in Arg. Load when adding, replacing, inspecting, or generating audio assets.
---

# Audio files (`.wav`, `.mp3`)

Audio is **binary** — it can't be written as text. Arg plays back wav, mp3, ogg, flac, m4a, and aac. (In `.mdx` documents, embed an existing audio file with the `<Audio src="…" mime="…" />` component — see the `arg-file-document` skill.)

## CRUD

Binary format — see `arg-core` and your access-method skill (`arg-mcp` / `arg-cli` / `arg-fuse`) for reading/writing bytes (audio can't be written as text). Audio-specific:

- Generate or transform with `ffmpeg` — your access method says where it runs and how the file lands in the workspace.
- Read the bytes and inspect duration, sample rate, channels, and bitrate before editing.
- Audio is an opaque asset — not edited sample-by-sample; regenerate and overwrite.

## Guidance

- Choose by need: `wav` for lossless/master audio and further editing, `mp3` for compact distribution. Don't round-trip `wav → mp3 → wav` — each lossy pass degrades quality.
- Preserve sample rate and channel layout unless asked to change them.
