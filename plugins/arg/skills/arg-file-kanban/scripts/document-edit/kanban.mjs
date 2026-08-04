// Generated from sdk/typescript/src/documents/kanban.mts. Do not edit directly.
import { applyJsonEdits, cloneJson, DocumentEditError, insertAt, isJsonObject } from "./common.mjs";
import {
  mergeJsonObject,
  moveArrayItem,
  parseJsonDocument,
  stringifyJsonDocument,
} from "./common.mjs";
export const KANBAN_VERSION = 6;
const DEFAULT_SETTINGS = {
  expandLabels: false,
  theme: "gray",
  gradient: null,
  showConfetti: true,
  completeColumnId: null,
  autoMarkDone: true,
  showCardDescription: false,
};
let generatedIdCounter = 0;
function generatedId(prefix) {
  generatedIdCounter += 1;
  const uuid = globalThis.crypto?.randomUUID?.();
  const suffix = uuid ?? `${Date.now().toString(36)}_${generatedIdCounter.toString(36)}`;
  return `${prefix}_${suffix}`;
}
function objectFields(value) {
  return cloneJson(value);
}
function requireId(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new DocumentEditError("invalid_document", `${label} id must be a non-empty string`);
  }
  return value;
}
function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !entry)) {
    throw new DocumentEditError("invalid_document", `${label} must be an array of non-empty ids`);
  }
  return value;
}
function uniqueEntries(value, label) {
  if (!Array.isArray(value)) {
    throw new DocumentEditError("invalid_document", `${label} must be an array`);
  }
  const seen = new Set();
  for (const entry of value) {
    if (!isJsonObject(entry)) {
      throw new DocumentEditError("invalid_document", `${label} entries must be objects`);
    }
    const id = requireId(entry.id, label);
    if (seen.has(id)) throw new DocumentEditError("duplicate_id", `Duplicate ${label} id: ${id}`);
    seen.add(id);
  }
  return value;
}
export function createKanbanDocument(fields = {}) {
  const supplied = isJsonObject(fields.settings) ? fields.settings : {};
  return {
    ...objectFields(fields),
    version: KANBAN_VERSION,
    labels: [],
    cards: [],
    columns: [],
    rootColumnIds: [],
    settings: { ...DEFAULT_SETTINGS, ...objectFields(supplied) },
  };
}
export function createKanbanLabel(fields = {}) {
  return {
    ...objectFields(fields),
    id: typeof fields.id === "string" ? fields.id : generatedId("label"),
    color: typeof fields.color === "string" ? fields.color : "gray",
  };
}
export function createKanbanColumn(fields = {}) {
  return {
    ...objectFields(fields),
    id: typeof fields.id === "string" ? fields.id : generatedId("column"),
    title: typeof fields.title === "string" ? fields.title : "Untitled",
    cardIds: [],
  };
}
export function createKanbanCard(fields = {}) {
  const next = {
    title: "Untitled",
    description: typeof fields.description === "string" ? fields.description : "",
    dueDate: null,
    createdByUserId: null,
    createdAt: null,
    assignedToUserIds: [],
    labelIds: [],
    ...objectFields(fields),
    id: typeof fields.id === "string" ? fields.id : generatedId("card"),
  };
  return next;
}
export function createKanbanAttachment(fields) {
  if (typeof fields.path !== "string" || fields.path.length === 0) {
    throw new DocumentEditError("invalid_document", "Attachment path must be a non-empty string");
  }
  const path = fields.path;
  const attachment = {
    ...objectFields(fields),
    id: typeof fields.id === "string" ? fields.id : generatedId("attachment"),
    path,
    name: typeof fields.name === "string" ? fields.name : basename(path),
    kind: fields.kind === "folder" ? "folder" : "file",
  };
  if (attachment.kind === "folder") delete attachment.fileId;
  return attachment;
}
export function parseKanban(text) {
  const raw = parseJsonDocument(text, "Kanban document");
  const declared = typeof raw.version === "string" ? Number(raw.version) : raw.version;
  if (typeof declared === "number" && declared > KANBAN_VERSION) {
    throw new DocumentEditError(
      "unsupported_version",
      `Kanban version ${declared} is newer than supported version ${KANBAN_VERSION}`,
    );
  }
  const document =
    declared === 5
      ? migrateV5(raw)
      : declared === KANBAN_VERSION
        ? { ...raw, version: KANBAN_VERSION }
        : raw;
  validateKanban(document);
  return document;
}
function migrateV5(raw) {
  if (!Array.isArray(raw.columns)) {
    throw new DocumentEditError("invalid_document", "Kanban v5 columns must be an array");
  }
  const next = objectFields(raw);
  const cards = [];
  const columns = [];
  const rootColumnIds = [];
  const legacyLabelsByColor = new Map();
  for (const rawColumn of raw.columns) {
    if (!isJsonObject(rawColumn) || !Array.isArray(rawColumn.cards)) continue;
    for (const rawCard of rawColumn.cards) {
      if (!isJsonObject(rawCard) || typeof rawCard.color !== "string") continue;
      const color = rawCard.color.toLowerCase();
      if (!legacyLabelsByColor.has(color)) {
        legacyLabelsByColor.set(color, createKanbanLabel({ color }));
      }
    }
  }
  const jobs = [];
  for (let index = raw.columns.length - 1; index >= 0; index--) {
    jobs.push({ kind: "column", node: raw.columns[index], owner: rootColumnIds });
  }
  while (jobs.length > 0) {
    const job = jobs.pop();
    if (!isJsonObject(job.node)) {
      throw new DocumentEditError("invalid_document", `Kanban v5 ${job.kind} must be an object`);
    }
    const id = requireId(job.node.id, `Kanban v5 ${job.kind}`);
    job.owner.push(id);
    if (job.kind === "column") {
      const nested = job.node.cards ?? [];
      if (!Array.isArray(nested)) {
        throw new DocumentEditError(
          "invalid_document",
          `Kanban v5 column ${id}.cards must be an array`,
        );
      }
      const column = objectFields(job.node);
      delete column.cards;
      column.cardIds = [];
      columns.push(column);
      for (let index = nested.length - 1; index >= 0; index--) {
        jobs.push({ kind: "card", node: nested[index], owner: column.cardIds });
      }
    } else {
      const nested = job.node.childColumns ?? [];
      if (!Array.isArray(nested)) {
        throw new DocumentEditError(
          "invalid_document",
          `Kanban v5 card ${id}.childColumns must be an array`,
        );
      }
      const card = objectFields(job.node);
      delete card.childColumns;
      const legacyColor = typeof card.color === "string" ? card.color.toLowerCase() : null;
      delete card.color;
      card.labelIds ??= [];
      const legacyLabel = legacyColor ? legacyLabelsByColor.get(legacyColor) : undefined;
      if (legacyLabel && !card.labelIds.includes(legacyLabel.id)) {
        card.labelIds.push(legacyLabel.id);
      }
      if (nested.length > 0) card.childColumnIds = [];
      else delete card.childColumnIds;
      cards.push(card);
      for (let index = nested.length - 1; index >= 0; index--) {
        jobs.push({ kind: "column", node: nested[index], owner: card.childColumnIds });
      }
    }
  }
  return {
    ...next,
    version: KANBAN_VERSION,
    labels: [...(Array.isArray(raw.labels) ? raw.labels : []), ...legacyLabelsByColor.values()],
    cards,
    columns,
    rootColumnIds,
    settings: isJsonObject(raw.settings) ? raw.settings : {},
  };
}
export function stringifyKanban(document) {
  validateKanban(document);
  return stringifyJsonDocument(document);
}
export function editKanban(document, edits) {
  validateKanban(document);
  const next = applyJsonEdits(document, edits);
  validateKanban(next);
  return next;
}
export function validateKanban(document) {
  if (!isJsonObject(document) || document.version !== KANBAN_VERSION) {
    throw new DocumentEditError("invalid_document", `Kanban version must be ${KANBAN_VERSION}`);
  }
  if (!isJsonObject(document.settings)) {
    throw new DocumentEditError("invalid_document", "Kanban settings must be an object");
  }
  const labels = uniqueEntries(document.labels, "label");
  const cards = uniqueEntries(document.cards, "card");
  const columns = uniqueEntries(document.columns, "column");
  const roots = requireStringArray(document.rootColumnIds, "rootColumnIds");
  const labelIds = new Set(labels.map((entry) => entry.id));
  const cardIds = new Set(cards.map((entry) => entry.id));
  const columnIds = new Set(columns.map((entry) => entry.id));
  const allIds = new Set();
  for (const [kind, ids] of [
    ["label", labelIds],
    ["card", cardIds],
    ["column", columnIds],
  ]) {
    for (const id of ids) {
      if (allIds.has(id)) {
        throw new DocumentEditError(
          "duplicate_id",
          `${kind} id collides with another board id: ${id}`,
        );
      }
      allIds.add(id);
    }
  }
  const ownedCards = new Set();
  const ownedColumns = new Set();
  const claim = (id, known, owned, label) => {
    if (!known.has(id))
      throw new DocumentEditError("dangling_reference", `Unknown ${label} id: ${id}`);
    if (owned.has(id))
      throw new DocumentEditError("duplicate_ownership", `${label} ${id} has multiple owners`);
    owned.add(id);
  };
  for (const id of roots) claim(id, columnIds, ownedColumns, "column");
  for (const column of columns) {
    for (const id of requireStringArray(column.cardIds, `column ${column.id}.cardIds`)) {
      claim(id, cardIds, ownedCards, "card");
    }
  }
  for (const card of cards) {
    if (card.labelIds !== undefined) {
      const seen = new Set();
      for (const id of requireStringArray(card.labelIds, `card ${card.id}.labelIds`)) {
        if (!labelIds.has(id))
          throw new DocumentEditError("dangling_reference", `Unknown label id: ${id}`);
        if (seen.has(id))
          throw new DocumentEditError("duplicate_ownership", `Card ${card.id} repeats label ${id}`);
        seen.add(id);
      }
    }
    for (const id of requireStringArray(
      card.childColumnIds ?? [],
      `card ${card.id}.childColumnIds`,
    )) {
      claim(id, columnIds, ownedColumns, "column");
    }
    const attachments = uniqueEntries(card.attachments ?? [], "attachment");
    for (const attachment of attachments) {
      if (typeof attachment.path !== "string" || !attachment.path) {
        throw new DocumentEditError("invalid_document", `Attachment ${attachment.id} needs a path`);
      }
    }
    if (
      card.heroAttachmentId != null &&
      !attachments.some((attachment) => attachment.id === card.heroAttachmentId)
    ) {
      throw new DocumentEditError(
        "dangling_reference",
        `Unknown hero attachment: ${card.heroAttachmentId}`,
      );
    }
  }
  if (
    typeof document.settings.completeColumnId === "string" &&
    !columnIds.has(document.settings.completeColumnId)
  ) {
    throw new DocumentEditError("dangling_reference", "completeColumnId does not resolve");
  }
  const cardById = new Map(cards.map((entry) => [entry.id, entry]));
  const columnById = new Map(columns.map((entry) => [entry.id, entry]));
  const seenCards = new Set();
  const seenColumns = new Set();
  const pending = [
    ...roots.map((id) => ({ kind: "column", id })),
    ...cards
      .filter((card) => !ownedCards.has(card.id))
      .map((card) => ({ kind: "card", id: card.id })),
    ...columns
      .filter((column) => !ownedColumns.has(column.id))
      .map((column) => ({ kind: "column", id: column.id })),
  ];
  while (pending.length > 0) {
    const node = pending.pop();
    if (node.kind === "column") {
      if (seenColumns.has(node.id))
        throw new DocumentEditError("cycle", "Kanban graph has a cycle");
      seenColumns.add(node.id);
      for (const id of columnById.get(node.id)?.cardIds ?? []) pending.push({ kind: "card", id });
    } else {
      if (seenCards.has(node.id)) throw new DocumentEditError("cycle", "Kanban graph has a cycle");
      seenCards.add(node.id);
      for (const id of cardById.get(node.id)?.childColumnIds ?? []) {
        pending.push({ kind: "column", id });
      }
    }
  }
  if (seenCards.size !== cards.length || seenColumns.size !== columns.length) {
    throw new DocumentEditError("cycle", "Kanban graph contains an unreachable cycle");
  }
}
function transformed(document, change) {
  validateKanban(document);
  const next = cloneJson(document);
  change(next);
  validateKanban(next);
  return next;
}
function entry(values, id, label) {
  const found = values.find((value) => value.id === id);
  if (!found) throw new DocumentEditError("not_found", `${label} not found: ${id}`);
  return found;
}
function forbidPatch(patch, keys) {
  const key = keys.find((candidate) => Object.hasOwn(patch, candidate));
  if (key) throw new DocumentEditError("invalid_patch", `${key} requires a structural operation`);
}
export function addKanbanLabel(document, label, index) {
  return transformed(document, (next) => {
    next.labels = insertAt(next.labels, cloneJson(label), index);
  });
}
export function patchKanbanLabel(document, id, patch) {
  forbidPatch(patch, ["id"]);
  return transformed(document, (next) => mergeJsonObject(entry(next.labels, id, "Label"), patch));
}
export function removeKanbanLabel(document, id) {
  return transformed(document, (next) => {
    entry(next.labels, id, "Label");
    next.labels = next.labels.filter((label) => label.id !== id);
    for (const card of next.cards)
      card.labelIds = card.labelIds?.filter((labelId) => labelId !== id);
  });
}
function ownerColumns(document, ownerCardId) {
  if (ownerCardId == null) return document.rootColumnIds;
  const card = entry(document.cards, ownerCardId, "Owner card");
  return (card.childColumnIds ??= []);
}
function subtree(document, kind, id) {
  const cardIds = new Set();
  const columnIds = new Set();
  const cardById = new Map(document.cards.map((item) => [item.id, item]));
  const columnById = new Map(document.columns.map((item) => [item.id, item]));
  const pending = [{ kind, id }];
  while (pending.length) {
    const node = pending.pop();
    const seen = node.kind === "card" ? cardIds : columnIds;
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    if (node.kind === "card") {
      for (const child of cardById.get(node.id)?.childColumnIds ?? [])
        pending.push({ kind: "column", id: child });
    } else {
      for (const child of columnById.get(node.id)?.cardIds ?? [])
        pending.push({ kind: "card", id: child });
    }
  }
  return { cardIds, columnIds };
}
function removeSubtree(next, doomed) {
  next.cards = next.cards.filter((card) => !doomed.cardIds.has(card.id));
  next.columns = next.columns.filter((column) => !doomed.columnIds.has(column.id));
  next.rootColumnIds = next.rootColumnIds.filter((id) => !doomed.columnIds.has(id));
  for (const card of next.cards) {
    if (card.childColumnIds)
      card.childColumnIds = card.childColumnIds.filter((id) => !doomed.columnIds.has(id));
  }
  for (const column of next.columns)
    column.cardIds = column.cardIds.filter((id) => !doomed.cardIds.has(id));
  if (doomed.columnIds.has(next.settings.completeColumnId ?? ""))
    next.settings.completeColumnId = null;
}
export function addKanbanColumn(document, column, placement = {}) {
  if (column.cardIds.length > 0)
    throw new DocumentEditError("invalid_document", "A new column must be empty");
  return transformed(document, (next) => {
    next.columns.push(cloneJson(column));
    const ids = ownerColumns(next, placement.ownerCardId);
    const placed = insertAt(ids, column.id, placement.index);
    ids.splice(0, ids.length, ...placed);
  });
}
export function patchKanbanColumn(document, id, patch) {
  forbidPatch(patch, ["id", "cardIds"]);
  return transformed(document, (next) => mergeJsonObject(entry(next.columns, id, "Column"), patch));
}
export function removeKanbanColumn(document, id) {
  validateKanban(document);
  entry(document.columns, id, "Column");
  const doomed = subtree(document, "column", id);
  return transformed(document, (next) => removeSubtree(next, doomed));
}
export function moveKanbanColumn(document, id, placement = {}) {
  validateKanban(document);
  entry(document.columns, id, "Column");
  const descendants = subtree(document, "column", id).cardIds;
  if (placement.ownerCardId && descendants.has(placement.ownerCardId)) {
    throw new DocumentEditError("invalid_move", "Cannot move a column into its own descendant");
  }
  return transformed(document, (next) => {
    next.rootColumnIds = next.rootColumnIds.filter((columnId) => columnId !== id);
    for (const card of next.cards)
      card.childColumnIds = card.childColumnIds?.filter((columnId) => columnId !== id);
    const ids = ownerColumns(next, placement.ownerCardId);
    const placed = insertAt(ids, id, placement.index);
    ids.splice(0, ids.length, ...placed);
  });
}
export function reorderKanbanColumns(document, ownerCardId, from, to) {
  return transformed(document, (next) => {
    const ids = ownerColumns(next, ownerCardId);
    ids.splice(0, ids.length, ...moveArrayItem(ids, from, to));
  });
}
export function addKanbanCard(document, card, columnId, index) {
  if (card.childColumnIds?.length)
    throw new DocumentEditError("invalid_document", "A new card cannot own columns");
  return transformed(document, (next) => {
    next.cards.push(cloneJson(card));
    const column = entry(next.columns, columnId, "Column");
    column.cardIds = insertAt(column.cardIds, card.id, index);
  });
}
export function patchKanbanCard(document, id, patch) {
  forbidPatch(patch, ["id", "childColumnIds", "attachments"]);
  return transformed(document, (next) => mergeJsonObject(entry(next.cards, id, "Card"), patch));
}
export function removeKanbanCard(document, id) {
  validateKanban(document);
  entry(document.cards, id, "Card");
  const doomed = subtree(document, "card", id);
  return transformed(document, (next) => removeSubtree(next, doomed));
}
export function moveKanbanCard(document, id, columnId, index) {
  validateKanban(document);
  entry(document.cards, id, "Card");
  entry(document.columns, columnId, "Column");
  if (subtree(document, "card", id).columnIds.has(columnId)) {
    throw new DocumentEditError("invalid_move", "Cannot move a card into its own descendant");
  }
  return transformed(document, (next) => {
    for (const column of next.columns)
      column.cardIds = column.cardIds.filter((cardId) => cardId !== id);
    const target = entry(next.columns, columnId, "Column");
    target.cardIds = insertAt(target.cardIds, id, index);
  });
}
export function reorderKanbanCards(document, columnId, from, to) {
  return transformed(document, (next) => {
    const column = entry(next.columns, columnId, "Column");
    column.cardIds = moveArrayItem(column.cardIds, from, to);
  });
}
export function setKanbanSettings(document, patch) {
  return transformed(document, (next) => mergeJsonObject(next.settings, patch));
}
export function addKanbanAttachment(document, cardId, attachment, index) {
  return transformed(document, (next) => {
    const card = entry(next.cards, cardId, "Card");
    card.attachments = insertAt(card.attachments ?? [], cloneJson(attachment), index);
  });
}
export function patchKanbanAttachment(document, cardId, attachmentId, patch) {
  forbidPatch(patch, ["id", "path"]);
  return transformed(document, (next) => {
    const card = entry(next.cards, cardId, "Card");
    const attachment = entry(card.attachments ?? [], attachmentId, "Attachment");
    mergeJsonObject(attachment, patch);
    if (attachment.kind === "folder") delete attachment.fileId;
  });
}
export function removeKanbanAttachment(document, cardId, attachmentId) {
  return transformed(document, (next) => {
    const card = entry(next.cards, cardId, "Card");
    entry(card.attachments ?? [], attachmentId, "Attachment");
    card.attachments = card.attachments?.filter((attachment) => attachment.id !== attachmentId);
    if (card.heroAttachmentId === attachmentId) card.heroAttachmentId = null;
  });
}
export function setKanbanHeroAttachment(document, cardId, attachmentId) {
  return transformed(document, (next) => {
    const card = entry(next.cards, cardId, "Card");
    if (attachmentId !== null) entry(card.attachments ?? [], attachmentId, "Attachment");
    card.heroAttachmentId = attachmentId;
  });
}
export function replaceKanbanAttachmentPath(
  document,
  cardId,
  attachmentId,
  path,
  name = basename(path),
) {
  if (!path) throw new DocumentEditError("invalid_document", "Attachment path must not be empty");
  return transformed(document, (next) => {
    const card = entry(next.cards, cardId, "Card");
    const attachment = entry(card.attachments ?? [], attachmentId, "Attachment");
    attachment.path = path;
    attachment.name = name;
    delete attachment.fileId;
  });
}
export function collectKanbanFileReferences(document) {
  validateKanban(document);
  const references = [];
  for (const card of document.cards) {
    for (const attachment of card.attachments ?? []) {
      if (attachment.kind !== "folder") {
        references.push({
          cardId: card.id,
          attachmentId: attachment.id,
          path: attachment.path,
          ...(typeof attachment.fileId === "string" ? { fileId: attachment.fileId } : {}),
        });
      }
    }
  }
  return references;
}
function basename(path) {
  const clean = path.replace(/\/+$/, "");
  return clean.slice(clean.lastIndexOf("/") + 1) || clean;
}
