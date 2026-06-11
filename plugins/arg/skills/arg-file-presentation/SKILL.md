---
name: arg-file-presentation
description: Create, read, update, and delete presentation files (pptx) in Arg. Load when building or editing slide decks.
---

# Presentation files (`.pptx`)

`.pptx` is a zipped Office Open XML format — **don't build it byte-by-byte as text**. Arg has a full WYSIWYG editor (slide thumbnails, text/shape editing, add/duplicate/delete/reorder slides) with round-trip save back to `.pptx`.

## CRUD

Binary format — see `arg-core` and your access-method skill (`arg-mcp` / `arg-cli` / `arg-fuse`) for reading/writing bytes (it can't be written as text). Presentation-specific:

- **Create / Update** — build it with the `python-pptx` library (your access method says where the script runs / how the file reaches the workspace); the saved `.pptx` opens directly in the editor. Read an existing deck first (via `python-pptx`) to preserve its theme, masters, and layouts — change only the requested slides.
- **Read** — fetch the bytes, or run `python-pptx` to extract slide order, per-slide text, and notes.

## Authoring with python-pptx

```bash
pip install python-pptx -q
python - <<'PY'
from pptx import Presentation
from pptx.util import Inches, Pt
p = Presentation()                 # 16:9 blank deck
slide = p.slides.add_slide(p.slide_layouts[5])  # 0=title, 1=title+content, 5=title only, 6=blank
slide.shapes.title.text = "Your Title"
body = slide.shapes.add_textbox(Inches(1), Inches(2), Inches(8), Inches(4)).text_frame
body.word_wrap = True
body.paragraphs[0].text = "First bullet"
body.add_paragraph().text = "Second bullet"
p.save("deck.pptx")
PY
```

## Guidance

- Set positions/sizes in `Inches(...)`, `Pt(...)`, or `Emu(...)`.
- Keep a consistent visual language (fonts, colors, spacing) across slides; reuse the deck's existing styles.
- Populate real, task-specific content — never leave placeholder text.
