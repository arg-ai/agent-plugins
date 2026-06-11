---
name: arg-file-kanban
description: Create, read, update, and delete Arg kanban boards (.kanban) for task and project management — columns of cards with labels, due dates, assignees, and nested sub-task boards. Load when building or editing task boards, project trackers, or status boards.
---

# Kanban files (`.kanban`)

A board of columns holding ordered cards, stored as JSON. Cards support labels, due dates, assignees, and recursive sub-task boards.

**Fetch the full schema before authoring** — it lists every field with a complete example:
https://arg.ai/docs/files/kanban/llms.txt

## CRUD

Use the standard MCP tools and shared rules in the `arg-core` skill. Kanban-specific: read the board first to learn columns and card order; add/move/edit a card by editing the JSON rather than rewriting the board. **Moving** a card means removing it from one column's `cards` and inserting it into another.

## Schema essentials

Top-level: `version` (use `4`), `labels` (board-wide, referenced by cards), `columns`, `settings` (`{ "expandLabels": false }`). Generate **unique ids** for every label, column, and card.

**Label** — `{ id, name, color }`. `color` is a palette key (`red` `orange` `yellow` `green` `blue` `purple` `pink` `gray`) or a `#rrggbb` hex. Reference from cards via `labelIds`; don't inline label objects on cards.

**Column** — `{ id, title, cards: [...] }`.

**Card** — `id`, `title`, `description`, `labelIds` (array of label ids), `dueDate` (ISO date string like `"2026-06-01"` or `null`), `createdByUserId`, `createdAt`, `assignedToUserIds`.
- **People fields:** when you author a board, leave `createdByUserId` and `createdAt` as `null` and `assignedToUserIds` as `[]` — the UI stamps these when a person creates or assigns a card.

**Sub-tasks** — any card may carry a nested board under `childColumns` (recursive — same shape as root `columns`, arbitrary depth). **Always use `childColumns` for sub-tasks — never bullet them inside `description`**; nested cards render as a real interactive checklist and count toward progress. Optional per-card `done` (boolean) marks completion in the parent's checklist (decoupled from column placement).

## Tips

- Default to three columns — **To Do, In Progress, Done** — unless a specific workflow is requested.
- Write valid, pretty-printed (2-space) JSON.
