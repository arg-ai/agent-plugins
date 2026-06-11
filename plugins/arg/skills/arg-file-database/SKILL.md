---
name: arg-file-database
description: Create, read, update, and delete SQLite databases (sqlite, sqlite3, db) in Arg. Load when building, querying, or modifying a database file.
---

# Database files (`.sqlite`, `.sqlite3`, `.db`)

SQLite databases are **binary** — not written as text. Arg has a read-only viewer (table browser + a SQL query pane that runs against an in-browser copy). All writes go through the `sqlite3` CLI.

## CRUD

Binary format — see `arg-core` and your access-method skill (`arg-mcp` / `arg-cli` / `arg-fuse`). Database-specific: all reads and writes go through the `sqlite3` CLI (run it wherever your access method runs shell commands).

- **Create / Update** — run `sqlite3` against the file; it opens automatically in the viewer afterward.
- **Read** — `sqlite3 data.db ".schema"` / `"SELECT …"`, or fetch the raw bytes. **Inspect the schema first** (`.schema`, list tables and indexes) before any write.

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
