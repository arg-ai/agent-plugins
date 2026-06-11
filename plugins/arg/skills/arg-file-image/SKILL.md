---
name: arg-file-image
description: Create, read, update, and delete image files (png, jpg, exr, bmp) in Arg. Load when adding, replacing, inspecting, or generating raster images.
---

# Image files (`.png`, `.jpg`, `.exr`, `.bmp`)

Images are **binary** — they can't be created or edited with `write_file`. Arg's image editor supports pan/zoom, crop, draw, rotate/flip, resize, color filters, and undo/redo, and exports to png/jpg/webp. It opens png, jpg/jpeg, gif, webp, ico, bmp, and tiff/tif.

## CRUD

Binary format — see the `arg-core` skill for the shared binary workflow (`upload_file` base64 to create, `download_file` to read, `run_bash` to generate/transform, `rm`/`mv` to delete/move; `write_file` does not work). Image-specific:

- Generate or transform in the sandbox with `run_bash` (Pillow, ImageMagick, `ffmpeg`); the new file opens in the editor.
- `download_file` and inspect dimensions and color mode before editing.
- Raster images aren't edited node-by-node — regenerate the bytes and overwrite.

## Guidance

- Choose the format intentionally: `png` for lossless/transparency, `jpg` for photographs, `bmp` for uncompressed raster, `exr` for high-dynamic-range / linear color (VFX, renders). Don't silently transcode — it changes quality and color.
- Preserve the original dimensions and aspect ratio unless asked to resize.
- When replacing an image referenced elsewhere (a design, a document `<FileEmbed>`), keep the same path/filename so references stay valid.
