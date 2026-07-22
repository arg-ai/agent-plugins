---
name: arg-file-kanban
version: "2.2.0"
description: Create, read, update, and delete Arg kanban boards (.kanban) for task and project management — columns of cards with labels, due dates, assignees, and nested sub-task boards. Load when building or editing task boards, project trackers, or status boards.
---

# Kanban files (`.kanban`)

A board of columns holding ordered cards, stored as JSON. Cards support labels, due dates, assignees, and recursive sub-task boards.

## The flat shape (v6)

A v6 board stores **flat top-level pools** and joins them by id. Nothing is nested inside anything else:

- `cards` — every card on the board, at every nesting depth, in one flat array.
- `columns` — every column, root and sub-board alike, in one flat array.
- `rootColumnIds` — the ordered list of column ids forming the root board.
- `column.cardIds` — the ordered card ids in that column.
- `card.childColumnIds` — the column ids forming that card's sub-task board.

```json
{
  "version": 6,
  "labels": [{ "id": "l-blue", "name": "Design", "color": "blue" }],
  "rootColumnIds": ["todo", "done"],
  "columns": [
    { "id": "todo", "title": "To Do", "cardIds": ["c1"] },
    { "id": "done", "title": "Done", "cardIds": [] },
    { "id": "sub-todo", "title": "Steps", "cardIds": ["c2"] }
  ],
  "cards": [
    { "id": "c1", "title": "Ship landing page", "childColumnIds": ["sub-todo"] },
    { "id": "c2", "title": "Draft hero copy", "done": false }
  ],
  "settings": { "expandLabels": false }
}
```

Note `sub-todo` sits in the same `columns` pool as the root columns — it is a sub-board only because `c1` names it in `childColumnIds`.

## Editing rules — ids and objects move separately

Every card lives in exactly one place (`cards`) and is _placed_ by an id reference. Get both halves right:

- **Create a card** — append the card object to the top-level `cards` array **and** push its id into the target column's `cardIds`. Both writes are required: a card in `cards` that no column lists is orphaned and invisible, and an id in `cardIds` with no matching card is a dangling reference.
- **Move a card** — remove its id from the source column's `cardIds` and insert it at the right position in the target column's `cardIds`. **The card object itself never moves and is never rewritten.** This is the whole point of the flat shape: two agents moving two different cards touch two different `cardIds` arrays and never conflict, where the old nested shape made them rewrite the same subtree.
- **Reorder within a column** — reorder that column's `cardIds`. Nothing else changes.
- **Edit a card's content** — edit the card object in `cards` in place; no `cardIds` array changes.
- **Delete a card** — remove the object from `cards`, remove its id from the containing column's `cardIds`, and tear down the sub-board it owned. The teardown alternates all the way down, however deep the board goes: delete each column named in the card's `childColumnIds` from `columns`, then delete each card listed in those columns' `cardIds` from `cards`, then apply this same rule to each of _those_ cards so their own `childColumnIds` columns go too. Stopping after one level strands unreachable columns and cards in the pools, and parsing keeps orphans rather than dropping them, so they never clean themselves up.
- **Create a column** — append the column object to `columns` **and** push its id into either `rootColumnIds` (a root column) or some card's `childColumnIds` (a sub-board). A column in neither is unreachable.
- **Delete a column** — remove it from `columns`, remove its id from `rootColumnIds` or the owning card's `childColumnIds`, and delete or re-home the cards it listed.

Generate **unique ids** for every label, column, and card — ids must be unique across the whole file, not just within one column.

## CRUD

Use your active Arg access method (`arg-mcp` / `arg-cli` — see `arg-files`) and the shared rules in `arg-files`. Kanban-specific: **read the board first** to learn its version, columns, and card order; then edit the JSON surgically rather than rewriting the whole board.

## Older files: the nested shape (v5)

Boards written before v6 nest their data — `column.cards` holds card objects inline, and `card.childColumns` holds column objects inline, with no top-level `cards` array and no `rootColumnIds`:

```json
{
  "version": 5,
  "columns": [{ "id": "todo", "title": "To Do", "cards": [{ "id": "c1", "title": "…" }] }]
}
```

Files on disk stay v5 until someone opens or edits them in the editor, which upgrades them in place. So **check `version` when you read a board.** On a v5 file you may either rewrite it fully as v6, or keep editing it consistently as v5 (`cards`/`childColumns` inline) — but **never produce a half-migrated file** that mixes the two, e.g. a `rootColumnIds` alongside columns that still nest their `cards`, or a top-level `cards` pool while some columns still inline theirs. Pick one shape and make the whole file obey it.

## Schema essentials

Top-level: `version` (use `6` for new boards), `labels` (board-wide, referenced by cards), `rootColumnIds`, `columns`, `cards`, `settings` (`{ "expandLabels": false }` is a safe default — missing keys fall back).

**Never write a `version` higher than `6`.** Editors and viewers refuse to open a board newer than they support and show an error instead — the file is intact, but nobody can read it until their client catches up. Older versions stay readable; only the forward direction is gated.

**Settings** (every key optional, `expandLabels` included - each one you leave out falls back to its default) — `expandLabels` (label pills with text vs. compact bars), `theme` (palette key tinting the board), `gradient` (gradient key or `null`), `showConfetti` (confetti when a card lands in the complete column), `completeColumnId` (column treated as "done"; `null` = fuzzy title match), `autoMarkDone` (auto-toggle `done` on moves into/out of the complete column), `showCardDescription` (render the description snippet on the card face).

**Label** — `{ id, name?, color }`. `color` is a palette key (`gray` `blue` `cyan` `teal` `green` `lime` `yellow` `amber` `orange` `red` `rose` `pink` `purple` `indigo`) or a `#rrggbb` hex; omit `name` for a colour-only chip. Use only these keys - any other name (`emerald`, `violet`, …) renders the chip fully transparent, i.e. invisible. Reference from cards via `labelIds`; don't inline label objects on cards.

**Column** — `{ id, title, cardIds: [...] }`, plus optional `icon` (icon key), `color` (palette key or hex tint), `collapsed` (render as a narrow strip).

**Card** — `id`, `title`, `description`, `labelIds` (array of label ids), `dueDate` (ISO date string like `"2026-06-01"` or `null`), `createdByUserId`, `createdAt`, `assignedToUserIds`. Optional: `location` (`{ lat, lng, label? }` — pins the card on the board's Map view), `attachments` (array of `{ id, path, name, kind: "file"|"folder" }` workspace files, `path` workspace-relative with a leading slash), and `heroAttachmentId` (which attachment renders as the card's cover preview).

- **People fields:** when you author a board, leave `createdByUserId` and `createdAt` as `null` and `assignedToUserIds` as `[]` — the UI stamps these when a person creates or assigns a card.

**Sub-tasks** — a card gets a sub-task board via `childColumnIds`, listing columns that live in the same flat `columns` pool (recursive to arbitrary depth: those columns' cards may have their own `childColumnIds`). **Always use `childColumnIds` for sub-tasks — never bullet them inside `description`**; nested cards render as a real interactive checklist and count toward progress. Optional per-card `done` (boolean) marks completion in the parent's checklist (decoupled from column placement).

## Tips

- Default to three columns — **To Do, In Progress, Done** — unless a specific workflow is requested.
- Write valid, pretty-printed (2-space) JSON.
