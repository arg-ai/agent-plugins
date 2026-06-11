---
name: arg-file-spreadsheet
description: Create, read, update, and delete spreadsheets (csv, xlsx) in Arg. Load when building or editing tabular data, sheets, or workbooks.
---

# Spreadsheet files (`.csv`, `.xlsx`)

Two very different formats:

- **`.csv`** — plain UTF-8 text: a single flat sheet of values, no formulas/formatting/tabs. Editable directly.
- **`.xlsx`** — **binary** workbook with multiple sheets, formulas, types, and formatting. Not editable with `write_file`.

## CRUD

See the `arg-core` skill for the shared tools and rules. The two formats differ:

- **`.csv` / `.tsv`** (text) — `write_file` (whole file) or `edit_file` / `multi_edit` (targeted rows); `read_file` the header + a sample of rows first to learn the schema. Keep the header row and column order stable.
- **`.xlsx`** (binary) — create/update with `run_bash` (`openpyxl` or `pandas`), preserving existing sheets, formulas, and named ranges; read with `download_file` or `run_bash` (`pandas`/`openpyxl`).

## Guidance

- Keep data types consistent within a column (dates, numbers, currency); don't coerce numbers to text or vice versa.
- Edit, add, or remove rows rather than rewriting the whole sheet unless asked.
- Use `.csv` when a single flat sheet of values is enough; use `.xlsx` when you need multiple tabs, formulas, or formatting.
