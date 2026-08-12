// Generated from sdk/typescript/src/documents/design.mts. Do not edit directly.
import {
  applyJsonEdits,
  cloneJson,
  DocumentEditError,
  insertAt,
  isJsonObject,
  moveArrayItem,
  parseJsonDocument,
  setJsonProperty,
  stringifyJsonDocument,
} from "./common.mjs";
const DESIGN_FILE_FILL_TYPES = new Set([
  "image",
  "model3d",
  "video",
  "design",
  "kml",
  "cad",
  "shader",
]);
export const BUILTIN_DESIGN_SHADER_IDS = [
  "builtin-water-caustic",
  "builtin-moire",
  "builtin-nebula",
  "builtin-glowing-wave",
  "builtin-pattern-grid",
  "builtin-fractal-noise",
  "builtin-concentric",
  "builtin-aurora",
  "builtin-plasma",
  "builtin-starfield",
  "builtin-kaleidoscope",
  "builtin-synthwave",
  "builtin-rainbow-swirl",
  "builtin-metaballs",
];
const builtinDesignShaderIds = new Set(BUILTIN_DESIGN_SHADER_IDS);
function error(code, message) {
  throw new DocumentEditError(code, message);
}
function assertValid(document) {
  const errors = validateDesign(document);
  if (errors.length > 0) error("invalid_document", errors.join("; "));
}
function normalizeDesignFileFillsInPlace(document) {
  for (const { fills } of fillArrays(document)) {
    fills.forEach((value, index) => {
      if (!isJsonObject(value) || value.type === "file") return;
      const fileType =
        typeof value.type === "string" && DESIGN_FILE_FILL_TYPES.has(value.type)
          ? value.type
          : undefined;
      const source = fileType === "shader" ? value.shaderSrc : value.src;
      if (!fileType || typeof source !== "string" || (fileType === "shader" && !source.trim())) {
        if (
          fileType === "shader" &&
          (value.shaderSrc !== undefined || value.fileId !== undefined)
        ) {
          const fill = cloneJson(value);
          delete fill.shaderSrc;
          delete fill.fileId;
          fills[index] = fill;
        }
        return;
      }
      const fill = cloneJson(value);
      fill.type = "file";
      fill.fileType = fileType;
      fill.src = source;
      if (fileType === "shader") {
        delete fill.shaderSrc;
        delete fill.shaderId;
        delete fill.values;
      }
      fills[index] = fill;
    });
  }
}
function normalizedDesign(document) {
  const needsMigration = fillArrays(document).some(({ fills }) =>
    fills.some(
      (fill) =>
        isJsonObject(fill) &&
        fill.type !== "file" &&
        typeof fill.type === "string" &&
        DESIGN_FILE_FILL_TYPES.has(fill.type) &&
        (fill.type !== "shader" || fill.shaderSrc !== undefined || fill.fileId !== undefined),
    ),
  );
  if (!needsMigration) return document;
  const next = cloneJson(document);
  normalizeDesignFileFillsInPlace(next);
  return next;
}
function mutate(document, change) {
  const next = cloneJson(document);
  normalizeDesignFileFillsInPlace(next);
  assertValid(next);
  change(next);
  normalizeDesignFileFillsInPlace(next);
  assertValid(next);
  return next;
}
function record(value) {
  return isJsonObject(value) ? value : undefined;
}
function objectRecord(document) {
  return record(document.objects);
}
function groupChildren(object) {
  return object?.type === "group" && Array.isArray(object.children) ? object.children : undefined;
}
function fillArrays(document) {
  const arrays = [];
  for (const artboard of Array.isArray(document.artboards) ? document.artboards : []) {
    if (
      isJsonObject(artboard) &&
      typeof artboard.id === "string" &&
      Array.isArray(artboard.fills)
    ) {
      arrays.push({ kind: "artboard", id: artboard.id, fills: artboard.fills });
    }
  }
  for (const [id, object] of Object.entries(
    isJsonObject(document.objects) ? document.objects : {},
  )) {
    if (isJsonObject(object) && Array.isArray(object.fills))
      arrays.push({ kind: "object", id, fills: object.fills });
  }
  return arrays;
}
function internalShaderId(fill) {
  if (!isJsonObject(fill) || fill.type !== "shader") return undefined;
  if (typeof fill.shaderSrc === "string" && fill.shaderSrc.trim()) return undefined;
  return typeof fill.shaderId === "string" ? fill.shaderId : undefined;
}
function hasFiniteGeometry(value, label, errors) {
  for (const field of ["x", "y", "width", "height"]) {
    const number = value[field];
    if (
      typeof number !== "number" ||
      !Number.isFinite(number) ||
      ((field === "width" || field === "height") && number <= 0)
    ) {
      errors.push(
        `${label}.${field} must be ${field === "x" || field === "y" ? "finite" : "positive"}`,
      );
    }
  }
}
export function createDesignDocument(options = {}) {
  const width = options.width ?? 1080;
  const height = options.height ?? 1080;
  const id = options.artboardId ?? "artboard-1";
  const document = {
    version: 1,
    canvas: { width, height },
    artboards: [{ id, name: options.artboardName ?? "Artboard 1", x: 0, y: 0, width, height }],
    objects: {},
    order: [],
  };
  assertValid(document);
  return document;
}
export function parseDesign(text) {
  let document = parseJsonDocument(text, "Design document");
  if (!Array.isArray(document.artboards) || document.artboards.length === 0) {
    const canvas = isJsonObject(document.canvas) ? document.canvas : {};
    const background = isJsonObject(canvas.background)
      ? cloneJson(canvas.background)
      : { type: "solid", color: "#ffffff" };
    document = {
      ...document,
      artboards: [
        {
          id: "artboard-1",
          name: "Artboard 1",
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
          fills: [background],
        },
      ],
    };
  }
  normalizeDesignFileFillsInPlace(document);
  assertValid(document);
  return document;
}
export function stringifyDesign(document) {
  const normalized = normalizedDesign(document);
  assertValid(normalized);
  return stringifyJsonDocument(normalized);
}
export function editDesign(document, edits) {
  const next = applyJsonEdits(normalizedDesign(document), edits);
  normalizeDesignFileFillsInPlace(next);
  assertValid(next);
  return next;
}
function validateDesignMetadata(value, artboardIds, errors) {
  const metadata = value.metadata;
  if (metadata === undefined) return;
  if (!isJsonObject(metadata)) {
    errors.push("metadata must be an object");
    return;
  }
  const defaultView = metadata.defaultView;
  if (
    defaultView !== undefined &&
    defaultView !== "design" &&
    defaultView !== "creative" &&
    defaultView !== "slides"
  ) {
    errors.push("metadata.defaultView must be design, creative, or slides");
  }
  const sections = metadata.sections;
  if (sections === undefined) return;
  if (!Array.isArray(sections)) {
    errors.push("metadata.sections must be an array");
    return;
  }
  const sectionIds = new Set();
  const seenArtboards = new Set();
  sections.forEach((entry, index) => {
    const owner = `metadata.sections[${index}]`;
    if (!isJsonObject(entry) || typeof entry.id !== "string" || !entry.id) {
      errors.push(`${owner} must have an id`);
      return;
    }
    if (sectionIds.has(entry.id)) errors.push(`duplicate section id: ${entry.id}`);
    sectionIds.add(entry.id);
    if (typeof entry.name !== "string" || !entry.name) errors.push(`${owner}.name must be set`);
    if (!Array.isArray(entry.artboardIds)) {
      errors.push(`${owner}.artboardIds must be an array`);
      return;
    }
    entry.artboardIds.forEach((id, slide) => {
      if (typeof id !== "string" || !artboardIds.has(id)) {
        errors.push(`${owner}.artboardIds[${slide}] references a missing artboard: ${String(id)}`);
        return;
      }
      // A slide in two sections has no defined position in the deck.
      if (seenArtboards.has(id)) errors.push(`artboard is in more than one section: ${id}`);
      seenArtboards.add(id);
    });
  });
}
export function validateDesign(value) {
  if (!isJsonObject(value)) return ["Design document must be an object"];
  const errors = [];
  if (value.version !== 1) errors.push("version must be 1");
  if (!isJsonObject(value.canvas)) errors.push("canvas must be an object");
  else {
    for (const field of ["width", "height"]) {
      const number = value.canvas[field];
      if (typeof number !== "number" || !Number.isFinite(number) || number <= 0) {
        errors.push(`canvas.${field} must be positive`);
      }
    }
  }
  const artboards = value.artboards;
  const artboardIds = new Set();
  if (!Array.isArray(artboards) || artboards.length === 0) {
    errors.push("artboards must contain at least one artboard");
  } else {
    artboards.forEach((entry, index) => {
      if (!isJsonObject(entry) || typeof entry.id !== "string" || !entry.id) {
        errors.push(`artboards[${index}] must have an id`);
      } else if (artboardIds.has(entry.id)) errors.push(`duplicate artboard id: ${entry.id}`);
      else {
        artboardIds.add(entry.id);
        hasFiniteGeometry(entry, `artboards[${index}]`, errors);
        if (entry.notes !== undefined && typeof entry.notes !== "string") {
          errors.push(`artboards[${index}].notes must be a string`);
        }
        if (entry.skipped !== undefined && typeof entry.skipped !== "boolean") {
          errors.push(`artboards[${index}].skipped must be a boolean`);
        }
      }
    });
  }
  validateDesignMetadata(value, artboardIds, errors);
  const objects = objectRecord(value);
  if (!objects) errors.push("objects must be an object");
  const order = value.order;
  if (!Array.isArray(order)) errors.push("order must be an array");
  if (!objects || !Array.isArray(order)) return errors;
  const parentCounts = new Map(Object.keys(objects).map((id) => [id, 0]));
  const countPlacement = (id, owner) => {
    if (typeof id !== "string" || !Object.hasOwn(objects, id) || !record(objects[id]))
      errors.push(`${owner} references a missing object: ${String(id)}`);
    else parentCounts.set(id, (parentCounts.get(id) ?? 0) + 1);
  };
  const rootIds = new Set();
  for (const id of order) {
    if (typeof id === "string" && rootIds.has(id)) errors.push(`duplicate root object: ${id}`);
    if (typeof id === "string") rootIds.add(id);
    countPlacement(id, "order");
  }
  const groups = new Map();
  for (const [id, entry] of Object.entries(objects)) {
    if (!isJsonObject(entry)) {
      errors.push(`objects.${id} must be an object`);
      continue;
    }
    if (entry.id !== id) errors.push(`objects.${id}.id must equal its map key`);
    if (typeof entry.type !== "string" || !entry.type)
      errors.push(`objects.${id} must have a type`);
    if (!isJsonObject(entry.frame)) errors.push(`objects.${id}.frame must be an object`);
    else hasFiniteGeometry(entry.frame, `objects.${id}.frame`, errors);
    if (entry.type !== "group") continue;
    if (!Array.isArray(entry.children)) {
      errors.push(`group ${id} must have children`);
      continue;
    }
    const children = entry.children;
    const seen = new Set();
    for (const child of children) {
      if (typeof child === "string" && seen.has(child))
        errors.push(`group ${id} contains duplicate child: ${child}`);
      if (typeof child === "string") seen.add(child);
      countPlacement(child, `group ${id}`);
    }
    groups.set(id, [...seen]);
  }
  for (const [id, count] of parentCounts) {
    if (count !== 1) errors.push(`object ${id} must have exactly one placement`);
  }
  const visiting = new Set();
  const visited = new Set();
  for (const start of groups.keys()) {
    if (visited.has(start)) continue;
    const stack = [{ id: start, childIndex: 0 }];
    visiting.add(start);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const children = groups.get(frame.id) ?? [];
      const child = children[frame.childIndex++];
      if (child === undefined) {
        visiting.delete(frame.id);
        visited.add(frame.id);
        stack.pop();
        continue;
      }
      if (!groups.has(child) || visited.has(child)) continue;
      if (visiting.has(child)) {
        errors.push(`group cycle includes ${child}`);
        continue;
      }
      visiting.add(child);
      stack.push({ id: child, childIndex: 0 });
    }
  }
  const shaders = value.shaders;
  if (shaders !== undefined && !isJsonObject(shaders)) errors.push("shaders must be an object");
  if (isJsonObject(shaders)) {
    for (const [id, shader] of Object.entries(shaders)) {
      if (!isJsonObject(shader) || shader.id !== id)
        errors.push(`shader ${id} must be an object with a matching id`);
    }
  }
  for (const { fills } of fillArrays(value)) {
    for (const fill of fills) {
      const shaderId = internalShaderId(fill);
      if (
        shaderId &&
        !builtinDesignShaderIds.has(shaderId) &&
        (!isJsonObject(shaders) ||
          !Object.hasOwn(shaders, shaderId) ||
          !isJsonObject(shaders[shaderId]))
      ) {
        errors.push(`fill references a missing shader: ${shaderId}`);
      }
    }
  }
  return errors;
}
export function addDesignArtboard(document, artboard, index) {
  return mutate(document, (next) => {
    if (next.artboards.some((entry) => entry.id === artboard.id))
      error("duplicate_id", `Artboard already exists: ${artboard.id}`);
    next.artboards = insertAt(next.artboards, cloneJson(artboard), index);
  });
}
export function patchDesignArtboard(document, id, patch) {
  return mutate(document, (next) => {
    if (Object.hasOwn(patch, "id")) error("immutable_id", "Artboard ids cannot be patched");
    const index = next.artboards.findIndex((entry) => entry.id === id);
    if (index < 0) error("not_found", `Artboard not found: ${id}`);
    next.artboards[index] = { ...next.artboards[index], ...cloneJson(patch) };
  });
}
/**
 * Drops a deleted artboard's slide reference. Validation rejects a section that
 * points at a missing artboard, so leaving the id behind would make every
 * removal on a sectioned deck fail as `invalid_document`.
 *
 * A section left with no slides is kept: the editor's Slides view treats an
 * empty section as a legitimate place to add slides back into, and the two must
 * agree on what a deletion leaves behind.
 */
function dropSlideFromSections(document, artboardId) {
  for (const section of document.metadata?.sections ?? []) {
    section.artboardIds = section.artboardIds.filter((entry) => entry !== artboardId);
  }
}
export function removeDesignArtboard(document, id) {
  return mutate(document, (next) => {
    const index = next.artboards.findIndex((entry) => entry.id === id);
    if (index < 0) error("not_found", `Artboard not found: ${id}`);
    if (next.artboards.length === 1)
      error("last_artboard", "A design must keep at least one artboard");
    next.artboards.splice(index, 1);
    dropSlideFromSections(next, id);
  });
}
export function moveDesignArtboard(document, id, toIndex) {
  return mutate(document, (next) => {
    const from = next.artboards.findIndex((entry) => entry.id === id);
    if (from < 0) error("not_found", `Artboard not found: ${id}`);
    next.artboards = moveArrayItem(next.artboards, from, toIndex);
  });
}
function targetOrder(document, parentId) {
  if (!parentId) return document.order;
  const parent = Object.hasOwn(document.objects, parentId) ? document.objects[parentId] : undefined;
  const children = groupChildren(parent);
  if (!children) error("invalid_parent", `Object is not a group: ${parentId}`);
  return children;
}
function removePlacements(document, ids) {
  document.order = document.order.filter((id) => !ids.has(id));
  for (const object of Object.values(document.objects)) {
    const children = groupChildren(object);
    if (children) object.children = children.filter((id) => !ids.has(id));
  }
}
export function addDesignObject(document, object, placement = {}) {
  return mutate(document, (next) => {
    if (Object.hasOwn(next.objects, object.id))
      error("duplicate_id", `Object already exists: ${object.id}`);
    const order = targetOrder(next, placement.parentId);
    setJsonProperty(next.objects, object.id, cloneJson(object));
    order.splice(0, order.length, ...insertAt(order, object.id, placement.index));
  });
}
export function patchDesignObject(document, id, patch) {
  return mutate(document, (next) => {
    if (Object.hasOwn(patch, "id")) error("immutable_id", "Object ids cannot be patched");
    const object = Object.hasOwn(next.objects, id) ? next.objects[id] : undefined;
    if (!object) error("not_found", `Object not found: ${id}`);
    setJsonProperty(next.objects, id, { ...object, ...cloneJson(patch) });
  });
}
export function removeDesignObject(document, id) {
  return mutate(document, (next) => {
    if (!Object.hasOwn(next.objects, id)) error("not_found", `Object not found: ${id}`);
    const removed = new Set();
    const pending = [id];
    while (pending.length > 0) {
      const objectId = pending.pop();
      if (removed.has(objectId)) continue;
      removed.add(objectId);
      pending.push(...(groupChildren(next.objects[objectId]) ?? []));
    }
    removePlacements(next, removed);
    for (const objectId of removed) delete next.objects[objectId];
  });
}
export function moveDesignObject(document, id, placement = {}) {
  return mutate(document, (next) => {
    if (!Object.hasOwn(next.objects, id)) error("not_found", `Object not found: ${id}`);
    const descendants = new Set();
    const pending = [id];
    while (pending.length > 0) {
      const objectId = pending.pop();
      for (const child of groupChildren(next.objects[objectId]) ?? []) {
        if (!descendants.has(child)) {
          descendants.add(child);
          pending.push(child);
        }
      }
    }
    if (placement.parentId === id || (placement.parentId && descendants.has(placement.parentId))) {
      error("group_cycle", `Cannot move ${id} into its own subtree`);
    }
    targetOrder(next, placement.parentId);
    removePlacements(next, new Set([id]));
    const order = targetOrder(next, placement.parentId);
    order.splice(0, order.length, ...insertAt(order, id, placement.index));
  });
}
export function upsertDesignShader(document, shader) {
  return mutate(document, (next) => {
    next.shaders ??= {};
    const previous = Object.hasOwn(next.shaders, shader.id) ? next.shaders[shader.id] : undefined;
    setJsonProperty(next.shaders, shader.id, { ...previous, ...cloneJson(shader), id: shader.id });
  });
}
export function renameDesignShader(document, id, nextId) {
  return mutate(document, (next) => {
    const shader = next.shaders && Object.hasOwn(next.shaders, id) ? next.shaders[id] : undefined;
    if (!shader) error("not_found", `Shader not found: ${id}`);
    if (!nextId) error("invalid_id", "Shader id cannot be empty");
    if (nextId !== id && next.shaders && Object.hasOwn(next.shaders, nextId))
      error("duplicate_id", `Shader already exists: ${nextId}`);
    if (nextId !== id) {
      delete next.shaders[id];
      setJsonProperty(next.shaders, nextId, { ...shader, id: nextId });
    }
    for (const { fills } of fillArrays(next)) {
      for (const fill of fills)
        if (isJsonObject(fill) && fill.type === "shader" && fill.shaderId === id)
          fill.shaderId = nextId;
    }
  });
}
export function removeDesignShader(document, id) {
  return mutate(document, (next) => {
    if (!next.shaders || !Object.hasOwn(next.shaders, id))
      error("not_found", `Shader not found: ${id}`);
    const inUse = fillArrays(next).some(({ fills }) =>
      fills.some((fill) => internalShaderId(fill) === id),
    );
    if (inUse) error("shader_in_use", `Shader is still referenced: ${id}`);
    delete next.shaders[id];
    if (Object.keys(next.shaders).length === 0) delete next.shaders;
  });
}
function isWorkspacePath(value) {
  const path = value.trim();
  return (
    !!path && !path.startsWith("#") && !path.startsWith("//") && !/^[a-z][a-z0-9+.-]*:/i.test(path)
  );
}
export function collectDesignFileReferences(document) {
  const references = [];
  for (const { kind, id, fills } of fillArrays(document)) {
    fills.forEach((fill, fillIndex) => {
      if (!isJsonObject(fill)) return;
      const field =
        fill.type === "file" &&
        typeof fill.fileType === "string" &&
        DESIGN_FILE_FILL_TYPES.has(fill.fileType)
          ? "src"
          : fill.type === "shader"
            ? "shaderSrc"
            : typeof fill.type === "string" && DESIGN_FILE_FILL_TYPES.has(fill.type)
              ? "src"
              : undefined;
      if (!field) return;
      const filePath = fill[field];
      if (typeof filePath !== "string" || !isWorkspacePath(filePath)) return;
      references.push({
        kind,
        ownerId: id,
        fillIndex,
        field,
        filePath,
        fileId: typeof fill.fileId === "string" ? fill.fileId : null,
      });
    });
  }
  return references;
}
export function replaceDesignFillSource(fill, filePath) {
  const next = cloneJson(fill);
  const fileType =
    next.type === "file" &&
    typeof next.fileType === "string" &&
    DESIGN_FILE_FILL_TYPES.has(next.fileType)
      ? next.fileType
      : typeof next.type === "string" && DESIGN_FILE_FILL_TYPES.has(next.type)
        ? next.type
        : undefined;
  if (!fileType) error("invalid_fill", "Only file-backed fills have replaceable sources");
  next.type = "file";
  next.fileType = fileType;
  next.src = filePath;
  if (fileType === "shader") {
    delete next.shaderSrc;
    delete next.shaderId;
    delete next.values;
  }
  if (fileType === "design") delete next.artboardId;
  delete next.fileId;
  return next;
}
