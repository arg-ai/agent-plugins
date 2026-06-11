---
name: arg-file-spreadsheet
description: Create, read, update, and delete spreadsheets (csv, xlsx) in Arg. Load when building or editing tabular data, sheets, or workbooks.
---

# Spreadsheet files (`.csv`, `.xlsx`)

Two very different formats:

- **`.csv`** — plain UTF-8 text: a single flat sheet of values, no formulas/formatting/tabs. Editable directly.
- **`.xlsx`** — **binary** workbook with multiple sheets, formulas, types, and formatting. Not editable with `write_file`.

## CRUD

See `arg-core` and your access-method skill (`arg-mcp` / `arg-cli` / `arg-fuse`) for the verbs. The two formats differ:

- **`.csv` / `.tsv`** (text) — create and edit directly; read the header + a sample of rows first to learn the schema, and keep the header row and column order stable.
- **`.xlsx`** (binary) — create/update with a generator (`openpyxl` or `pandas`), preserving existing sheets, formulas, and named ranges; read it back with `pandas`/`openpyxl`.

## Guidance

- Keep data types consistent within a column (dates, numbers, currency); don't coerce numbers to text or vice versa.
- Edit, add, or remove rows rather than rewriting the whole sheet unless asked.
- Use `.csv` when a single flat sheet of values is enough; use `.xlsx` when you need multiple tabs, formulas, or formatting.
