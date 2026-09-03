// Generated from sdk/typescript/src/documents/common.ts. Do not edit directly.
export class DocumentEditError extends Error {
  code;
  path;
  constructor(code, message, path) {
    super(message);
    this.name = "DocumentEditError";
    this.code = code;
    this.path = path;
  }
}
export function cloneJson(value) {
  return structuredClone(value);
}
export function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function assertJsonObject(value, label, path) {
  if (!isJsonObject(value)) {
    throw new DocumentEditError("invalid_document", `${label} must be an object`, path);
  }
}
export function assertJsonArray(value, label, path) {
  if (!Array.isArray(value)) {
    throw new DocumentEditError("invalid_document", `${label} must be an array`, path);
  }
}
export function parseJsonDocument(text, label = "Document") {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new DocumentEditError("invalid_json", `${label} is not valid JSON: ${reason}`);
  }
  assertJsonObject(value, label);
  return value;
}
export function stringifyJsonDocument(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
function valueAtPath(root, path) {
  let value = root;
  for (const part of path) {
    if (typeof part === "number") {
      if (!Array.isArray(value) || !Number.isInteger(part) || part < 0 || part >= value.length)
        return undefined;
      value = value[part];
      continue;
    }
    if (!isJsonObject(value)) return undefined;
    if (!Object.hasOwn(value, part)) return undefined;
    value = value[part];
  }
  return value;
}
export function getJsonPath(root, path) {
  return valueAtPath(root, path);
}
function parentAtPath(root, path) {
  if (path.length === 0) {
    throw new DocumentEditError("invalid_path", "The document root has no parent", path);
  }
  const parentPath = path.slice(0, -1);
  const parent = valueAtPath(root, parentPath);
  if (!isJsonObject(parent) && !Array.isArray(parent)) {
    throw new DocumentEditError("path_not_found", "JSON edit path does not exist", parentPath);
  }
  return { parent, key: path[path.length - 1] };
}
function setChild(parent, key, value, path) {
  if (Array.isArray(parent)) {
    if (typeof key !== "number" || !Number.isInteger(key) || key < 0 || key >= parent.length) {
      throw new DocumentEditError("invalid_path", "Array edits require an existing index", path);
    }
    parent[key] = value;
    return;
  }
  if (typeof key !== "string") {
    throw new DocumentEditError("invalid_path", "Object edits require a string key", path);
  }
  setJsonProperty(parent, key, value);
}
function deleteChild(parent, key, path) {
  if (Array.isArray(parent)) {
    if (typeof key !== "number" || !Number.isInteger(key) || key < 0 || key >= parent.length) {
      throw new DocumentEditError("invalid_path", "Array deletes require an existing index", path);
    }
    parent.splice(key, 1);
    return;
  }
  if (typeof key !== "string") {
    throw new DocumentEditError("invalid_path", "Object deletes require a string key", path);
  }
  delete parent[key];
}
export function insertAt(values, value, index) {
  if (index !== undefined && !Number.isInteger(index)) {
    throw new DocumentEditError("invalid_index", "Insert index must be an integer");
  }
  const next = [...values];
  const at = index === undefined || index < 0 || index > next.length ? next.length : index;
  next.splice(at, 0, value);
  return next;
}
export function moveArrayItem(values, from, to) {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    from >= values.length ||
    to < 0 ||
    to >= values.length
  ) {
    throw new DocumentEditError("invalid_index", "Move indexes must address the target array");
  }
  if (from === to) return [...values];
  const next = [...values];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
export function findIndexById(values, id) {
  return values.findIndex((value) => value.id === id);
}
export function assertUniqueIds(entries, label, occupied = new Set()) {
  const seen = new Set(occupied);
  for (const entry of entries) {
    if (!entry.id || seen.has(entry.id)) {
      throw new DocumentEditError(
        "duplicate_id",
        `${label} id must be unique: ${entry.id || "<empty>"}`,
      );
    }
    seen.add(entry.id);
  }
}
export function setJsonProperty(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}
export function mergeJsonObject(target, patch) {
  for (const [key, value] of Object.entries(cloneJson(patch))) {
    if (value !== undefined) setJsonProperty(target, key, value);
  }
  return target;
}
export function applyJsonEdits(document, edits) {
  let next = cloneJson(document);
  for (const edit of edits) {
    if (edit.op === "set" && edit.path.length === 0) {
      assertJsonObject(edit.value, "Document root", edit.path);
      next = cloneJson(edit.value);
      continue;
    }
    if (edit.op === "merge") {
      const target = edit.path.length === 0 ? next : valueAtPath(next, edit.path);
      assertJsonObject(target, "Merge target", edit.path);
      mergeJsonObject(target, edit.value);
      continue;
    }
    if (edit.op === "insert") {
      const target = valueAtPath(next, edit.path);
      assertJsonArray(target, "Insert target", edit.path);
      if (edit.index !== undefined && !Number.isInteger(edit.index)) {
        throw new DocumentEditError("invalid_index", "Insert index must be an integer", edit.path);
      }
      const at =
        edit.index === undefined || edit.index < 0 || edit.index > target.length
          ? target.length
          : edit.index;
      target.splice(at, 0, cloneJson(edit.value));
      continue;
    }
    if (edit.op === "move") {
      const target = valueAtPath(next, edit.path);
      assertJsonArray(target, "Move target", edit.path);
      const moved = moveArrayItem(target, edit.from, edit.to);
      target.splice(0, target.length, ...moved);
      continue;
    }
    const { parent, key } = parentAtPath(next, edit.path);
    if (edit.op === "delete") deleteChild(parent, key, edit.path);
    else setChild(parent, key, cloneJson(edit.value), edit.path);
  }
  assertJsonObject(next, "Document root");
  return next;
}
