---
name: arg-file-database
description: Create, read, update, and delete SQLite databases (sqlite, sqlite3, db) in Arg. Load when building, querying, or modifying a database file.
---

# Database files (`.sqlite`, `.sqlite3`, `.db`)

SQLite databases are **binary** — not created or edited with `write_file`. Arg has a read-only viewer (table browser + a SQL query pane that runs against an in-browser copy). All writes go through the `sqlite3` CLI in the workspace sandbox.

## CRUD

Binary format — see the `arg-core` skill for the shared rules (`rm`/`mv` to delete/move; `write_file` does not work). Database-specific: all reads and writes go through the `sqlite3` CLI via `run_bash`.

- **Create / Update** — `run_bash` with `sqlite3`; the file opens automatically in the viewer afterward.
- **Read** — `run_bash` `sqlite3 data.db ".schema"` / `"SELECT …"`, or `download_file` for the raw bytes. **Inspect the schema first** (`.schema`, list tables and indexes) before any write.

## Working with sqlite3

```bash
# Create
sqlite3 mydata.db "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);"
sqlite3 mydata.db "INSERT INTO users VALUES (1, 'Alice', 'alice@example.com');"
# Inspect
sqlite3 data.db ".schema"
sqlite3 data.db "SELECT * FROM users LIMIT 10;"
# Import CSV
sqlite3 data.db ".import --csv data.csv my_table"
```

## Guidance

- Use SQLite-compatible SQL and types (dynamic typing / type affinity).
- Prefer `INSERT`/`UPDATE`/`DELETE` and `ALTER TABLE` over rewriting the file; use parameterized statements and wrap multi-step changes in a transaction.
- Respect foreign keys and constraints; run a scoped `SELECT` to confirm what a destructive statement will affect before executing it.
- For migrations, make additive changes where possible and confirm before dropping columns or tables.
