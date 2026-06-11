---
name: arg-file-presentation
description: Create, read, update, and delete presentation files (pptx) in Arg. Load when building or editing slide decks.
---

# Presentation files (`.pptx`)

`.pptx` is a zipped Office Open XML format — **do not build it byte-by-byte with `write_file`**. Arg has a full WYSIWYG editor (slide thumbnails, text/shape editing, add/duplicate/delete/reorder slides) with round-trip save back to `.pptx`.

## CRUD

Binary format — see the `arg-core` skill for the shared rules (`rm`/`mv` to delete/move; `write_file` does not work). Presentation-specific:

- **Create / Update** — `run_bash` with the `python-pptx` library; the saved `.pptx` opens directly in the editor. Read an existing deck first (via `python-pptx`) to preserve its theme, masters, and layouts — change only the requested slides.
- **Read** — `download_file` for the bytes, or `run_bash` with `python-pptx` to extract slide order, per-slide text, and notes.

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
