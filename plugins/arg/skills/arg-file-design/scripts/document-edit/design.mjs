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
// ---------- auto layout ----------
// Names and value sets mirror frontend/src/components/editors/design-editor/types.ts;
// design-layout-contract in test/design-document.test.ts pins them together.
// The types are derived from these arrays rather than spelled twice, so the
// runtime validator below cannot accept a value the type rejects.
export const DESIGN_LAYOUT_SIZINGS = ["fixed", "fill", "hug"];
export const DESIGN_LAYOUT_ALIGNS = ["start", "center", "end", "stretch"];
export const DESIGN_LAYOUT_JUSTIFIES = [
  "start",
  "center",
  "end",
  "space-between",
  "space-around",
  "space-evenly",
];
export const DESIGN_LAYOUT_AXES = ["row", "column"];
export const DESIGN_GRID_TRACK_UNITS = ["px", "fr", "auto"];
export const DESIGN_LAYOUT_DISTRIBUTES = [
  "start",
  "center",
  "end",
  "stretch",
  "space-between",
  "space-around",
  "space-evenly",
];
export const DESIGN_LAYOUT_POSITIONINGS = ["auto", "absolute"];
export const DESIGN_GRID_AUTO_REPEATS = ["auto-fill", "auto-fit"];
/** What a scalar token means. Inside the document every scalar is document
 *  pixels (except `leading`, a ratio of the font size); the role picks the CSS
 *  unit and the Tailwind v4 namespace, and in v4 the namespace is what turns a
 *  variable into utilities. */
export const DESIGN_NUMBER_TOKEN_ROLES = [
  "spacing",
  "radius",
  "text",
  "fontWeight",
  "tracking",
  "leading",
  "breakpoint",
  "container",
];
export const DESIGN_TOKEN_TYPES = ["color", "number", "fontFamily", "paint", "textStyle", "shadow"];
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
/**
 * Geometry for an object that has just lost the layout which owned its position.
 * Deliberate hand-mirror of `FALLBACK_FRAME` in
 * `frontend/src/components/editors/design-editor/layout-engine.ts` - the SDK
 * ships standalone and cannot import from the frontend, so a change there has to
 * be repeated here or the editor and the SDK would place the same frameless
 * child differently.
 */
const LAYOUT_FALLBACK_FRAME = { x: 0, y: 0, width: 100, height: 100 };
/** Fills in only the frame fields the object never wrote, so an axis it did
 *  specify survives untouched. */
function materializeFrame(object) {
  const frame = isJsonObject(object.frame) ? { ...object.frame } : {};
  for (const field of ["x", "y", "width", "height"]) {
    if (frame[field] === undefined) frame[field] = LAYOUT_FALLBACK_FRAME[field];
  }
  object.frame = frame;
}
/**
 * A child of a laid-out group is allowed to carry no `frame` at all, because the
 * group recomputes one on load. Any edit that takes it back out of that group
 * therefore leaves a real object with no geometry anywhere, which `validateDesign`
 * rightly rejects - so the edit has to give it one rather than the caller getting
 * a validation error for a document they never wrote.
 *
 * Diffing the laid-out set across the whole change (rather than patching each
 * builder) covers every operation that can release a child: clearing a layout,
 * moving a child out, patching a group's `layout` away. Moving between two
 * laid-out groups leaves the id in the set, so nothing is materialized.
 */
function materializeReleasedFrames(released, next) {
  if (released.size === 0) return;
  const objects = objectRecord(next);
  if (!objects) return;
  const stillLaidOut = laidOutChildIds(next);
  for (const id of released) {
    if (stillLaidOut.has(id)) continue;
    const object = Object.hasOwn(objects, id) ? objects[id] : undefined;
    if (isJsonObject(object)) materializeFrame(object);
  }
}
function mutate(document, change) {
  const next = cloneJson(document);
  normalizeDesignFileFillsInPlace(next);
  assertValid(next);
  const laidOutBefore = laidOutChildIds(next);
  change(next);
  materializeReleasedFrames(laidOutBefore, next);
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
/**
 * `derivable` relaxes the check for a child of a layout group: the layout owns
 * those numbers and recomputes them on load, so a document is allowed to leave
 * them off disk entirely. A value that IS written still has to be usable, since
 * a fixed axis keeps whatever the frame says.
 */
function hasFiniteGeometry(value, label, errors, derivable = false) {
  for (const field of ["x", "y", "width", "height"]) {
    const number = value[field];
    if (number === undefined && derivable) continue;
    const positive = field === "width" || field === "height";
    if (typeof number !== "number" || !Number.isFinite(number) || (positive && number <= 0)) {
      errors.push(`${label}.${field} must be ${positive ? "positive" : "finite"}`);
    }
  }
}
function validateEnum(value, allowed, label, errors) {
  if (value === undefined) return;
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push(`${label} must be one of ${allowed.join(", ")}`);
  }
}
function validateNonNegative(value, label, errors) {
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    errors.push(`${label} must be a non-negative number`);
  }
}
function validateLayoutPadding(value, label, errors) {
  if (value === undefined || typeof value === "number") {
    validateNonNegative(value, label, errors);
    return;
  }
  if (!isJsonObject(value)) {
    errors.push(`${label} must be a non-negative number or a per-edge object`);
    return;
  }
  for (const edge of ["top", "right", "bottom", "left"]) {
    validateNonNegative(value[edge], `${label}.${edge}`, errors);
  }
}
function validateGridTracks(value, label, errors) {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 1) {
      errors.push(`${label} must be a positive integer or an array of tracks`);
    }
    return;
  }
  if (!Array.isArray(value)) {
    errors.push(`${label} must be a positive integer or an array of tracks`);
    return;
  }
  if (value.length === 0) {
    errors.push(`${label} must contain at least one track`);
    return;
  }
  value.forEach((track, index) => {
    validateGridTrack(track, `${label}[${index}]`, errors, true);
  });
}
function validateGridTrack(track, owner, errors, allowRepeat) {
  if (track === undefined) return;
  if (!isJsonObject(track)) {
    errors.push(`${owner} must be an object`);
    return;
  }
  validateNonNegative(track.size, `${owner}.size`, errors);
  if (track.size === undefined) errors.push(`${owner}.size must be a non-negative number`);
  if (track.unit === undefined) errors.push(`${owner}.unit must be one of px, fr, auto`);
  else validateEnum(track.unit, DESIGN_GRID_TRACK_UNITS, `${owner}.unit`, errors);
  // `min`/`max` are bounds, not tracks: nesting a repeat inside one has no CSS
  // reading, so it is rejected here rather than silently ignored on load.
  validateGridTrack(track.min, `${owner}.min`, errors, false);
  validateGridTrack(track.max, `${owner}.max`, errors, false);
  if (track.repeat === undefined) return;
  if (!allowRepeat) {
    errors.push(`${owner}.repeat is only allowed on a track, not on a min/max bound`);
    return;
  }
  if (typeof track.repeat === "number") {
    if (!Number.isInteger(track.repeat) || track.repeat < 1) {
      errors.push(`${owner}.repeat must be an integer of at least 1, auto-fill, or auto-fit`);
    }
    return;
  }
  validateEnum(track.repeat, DESIGN_GRID_AUTO_REPEATS, `${owner}.repeat`, errors);
}
function validateLayoutConstraints(value, label, errors) {
  if (value === undefined) return;
  if (!isJsonObject(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const field of ["minWidth", "maxWidth", "minHeight", "maxHeight"]) {
    validateNonNegative(value[field], `${label}.${field}`, errors);
  }
  const ratio = value.aspectRatio;
  if (ratio === undefined) return;
  if (typeof ratio !== "number" || !Number.isFinite(ratio) || ratio <= 0) {
    errors.push(`${label}.aspectRatio must be a positive number (width divided by height)`);
  }
}
function validateTokenRef(value, label, errors) {
  if (value === undefined) return;
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${label} must be a token id`);
  }
}
function validateLayout(value, label, errors) {
  if (value === undefined) return;
  if (!isJsonObject(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  if (value.type !== "flex" && value.type !== "grid") {
    errors.push(`${label}.type must be one of flex, grid`);
    return;
  }
  validateNonNegative(value.gap, `${label}.gap`, errors);
  validateNonNegative(value.rowGap, `${label}.rowGap`, errors);
  validateLayoutPadding(value.padding, `${label}.padding`, errors);
  validateEnum(value.align, DESIGN_LAYOUT_ALIGNS, `${label}.align`, errors);
  validateEnum(value.alignContent, DESIGN_LAYOUT_DISTRIBUTES, `${label}.alignContent`, errors);
  validateTokenRef(value.gapToken, `${label}.gapToken`, errors);
  validateTokenRef(value.rowGapToken, `${label}.rowGapToken`, errors);
  validateTokenRef(value.paddingToken, `${label}.paddingToken`, errors);
  if (value.type === "flex") {
    validateEnum(value.direction, DESIGN_LAYOUT_AXES, `${label}.direction`, errors);
    validateEnum(value.justify, DESIGN_LAYOUT_JUSTIFIES, `${label}.justify`, errors);
    if (value.wrap !== undefined && typeof value.wrap !== "boolean") {
      errors.push(`${label}.wrap must be a boolean`);
    }
    return;
  }
  validateNonNegative(value.columnGap, `${label}.columnGap`, errors);
  validateTokenRef(value.columnGapToken, `${label}.columnGapToken`, errors);
  validateEnum(value.justify, DESIGN_LAYOUT_ALIGNS, `${label}.justify`, errors);
  validateEnum(value.justifyContent, DESIGN_LAYOUT_DISTRIBUTES, `${label}.justifyContent`, errors);
  validateEnum(value.autoFlow, DESIGN_LAYOUT_AXES, `${label}.autoFlow`, errors);
  validateGridTrack(value.autoRows, `${label}.autoRows`, errors, false);
  validateGridTrack(value.autoColumns, `${label}.autoColumns`, errors, false);
  if (value.dense !== undefined && typeof value.dense !== "boolean") {
    errors.push(`${label}.dense must be a boolean`);
  }
  if (value.columns === undefined) {
    errors.push(`${label}.columns must be a positive integer or an array of tracks`);
  } else validateGridTracks(value.columns, `${label}.columns`, errors);
  if (value.rows !== undefined) validateGridTracks(value.rows, `${label}.rows`, errors);
}
function validateObjectLayoutFields(entry, label, errors) {
  const sizing = entry.layoutSizing;
  if (sizing !== undefined) {
    if (!isJsonObject(sizing)) errors.push(`${label}.layoutSizing must be an object`);
    else {
      validateEnum(sizing.width, DESIGN_LAYOUT_SIZINGS, `${label}.layoutSizing.width`, errors);
      validateEnum(sizing.height, DESIGN_LAYOUT_SIZINGS, `${label}.layoutSizing.height`, errors);
    }
  }
  validateNonNegative(entry.layoutGrow, `${label}.layoutGrow`, errors);
  validateNonNegative(entry.layoutShrink, `${label}.layoutShrink`, errors);
  validateEnum(entry.layoutAlign, DESIGN_LAYOUT_ALIGNS, `${label}.layoutAlign`, errors);
  validateEnum(entry.layoutJustify, DESIGN_LAYOUT_ALIGNS, `${label}.layoutJustify`, errors);
  validateEnum(
    entry.layoutPositioning,
    DESIGN_LAYOUT_POSITIONINGS,
    `${label}.layoutPositioning`,
    errors,
  );
  validateLayoutConstraints(entry.layoutConstraints, `${label}.layoutConstraints`, errors);
  const area = entry.gridArea;
  if (area === undefined) return;
  if (!isJsonObject(area)) {
    errors.push(`${label}.gridArea must be an object`);
    return;
  }
  for (const field of ["column", "row", "columnSpan", "rowSpan"]) {
    const number = area[field];
    if (number === undefined) continue;
    if (typeof number !== "number" || !Number.isInteger(number) || number < 1) {
      errors.push(`${label}.gridArea.${field} must be an integer of at least 1`);
    }
  }
}
/** Ids whose frame geometry a layout owns and recomputes on load — a laid-out
 *  group's children, and an artboard's `layoutRoot`. An absolutely-positioned
 *  child is inside its container but outside its flow, so its frame is authored
 *  and stays. */
function laidOutChildIds(document) {
  const ids = new Set();
  const objects = objectRecord(document) ?? {};
  for (const entry of Object.values(objects)) {
    if (!isJsonObject(entry) || entry.layout === undefined || !Array.isArray(entry.children))
      continue;
    for (const child of entry.children) {
      if (typeof child !== "string") continue;
      const target = objects[child];
      if (isJsonObject(target) && target.layoutPositioning === "absolute") continue;
      ids.add(child);
    }
  }
  if (!Array.isArray(document.artboards)) return ids;
  for (const artboard of document.artboards) {
    if (!isJsonObject(artboard) || typeof artboard.layoutRoot !== "string") continue;
    if (Object.hasOwn(objects, artboard.layoutRoot)) ids.add(artboard.layoutRoot);
  }
  return ids;
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
const TOKEN_ALIAS_RE = /^\{[^{}]+\}$/;
/** A token's value has to match the shape its `type` promises, or every
 *  reference to it would read back something the reference site cannot use. An
 *  alias (`"{other}"`) stands in for any of them and is resolved by the editor,
 *  which is also where a broken chain is caught — the SDK only has to reject a
 *  value that could never be one. */
function validateDesignTokens(value, errors) {
  const tokens = value.tokens;
  if (tokens === undefined) return;
  if (!isJsonObject(tokens)) {
    errors.push("tokens must be an object keyed by token id");
    return;
  }
  for (const [id, token] of Object.entries(tokens)) {
    const owner = `tokens.${id}`;
    if (!isJsonObject(token)) {
      errors.push(`${owner} must be an object`);
      continue;
    }
    validateEnum(token.type, DESIGN_TOKEN_TYPES, `${owner}.type`, errors);
    validateEnum(token.role, DESIGN_NUMBER_TOKEN_ROLES, `${owner}.role`, errors);
    const tokenValue = token.value;
    if (tokenValue === undefined) {
      errors.push(`${owner}.value must be set`);
      continue;
    }
    if (typeof tokenValue === "string" && TOKEN_ALIAS_RE.test(tokenValue.trim())) continue;
    switch (token.type) {
      case "color":
      case "fontFamily":
        if (typeof tokenValue !== "string" || !tokenValue) {
          errors.push(`${owner}.value must be a non-empty string`);
        }
        break;
      case "number":
        if (typeof tokenValue !== "number" || !Number.isFinite(tokenValue)) {
          errors.push(`${owner}.value must be a finite number`);
        }
        break;
      case "paint":
      case "shadow":
        if (!isJsonObject(tokenValue) || typeof tokenValue.type !== "string") {
          errors.push(`${owner}.value must be an object with a type`);
        }
        break;
      case "textStyle":
        if (!isJsonObject(tokenValue)) errors.push(`${owner}.value must be an object`);
        break;
      default:
        break;
    }
  }
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
        validateLayoutPadding(entry.padding, `artboards[${index}].padding`, errors);
        validateTokenRef(entry.paddingToken, `artboards[${index}].paddingToken`, errors);
        validateLayoutConstraints(
          entry.layoutConstraints,
          `artboards[${index}].layoutConstraints`,
          errors,
        );
        const sizing = entry.layoutSizing;
        if (sizing !== undefined && !isJsonObject(sizing)) {
          errors.push(`artboards[${index}].layoutSizing must be an object`);
        } else if (isJsonObject(sizing)) {
          validateEnum(
            sizing.width,
            DESIGN_LAYOUT_SIZINGS,
            `artboards[${index}].layoutSizing.width`,
            errors,
          );
          validateEnum(
            sizing.height,
            DESIGN_LAYOUT_SIZINGS,
            `artboards[${index}].layoutSizing.height`,
            errors,
          );
        }
        if (entry.layoutRoot !== undefined && typeof entry.layoutRoot !== "string") {
          errors.push(`artboards[${index}].layoutRoot must be an object id`);
        }
      }
    });
  }
  validateDesignMetadata(value, artboardIds, errors);
  validateDesignTokens(value, errors);
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
  if (Array.isArray(artboards)) {
    artboards.forEach((entry, index) => {
      if (!isJsonObject(entry) || typeof entry.layoutRoot !== "string") return;
      if (!Object.hasOwn(objects, entry.layoutRoot)) {
        errors.push(
          `artboards[${index}].layoutRoot references a missing object: ${entry.layoutRoot}`,
        );
        return;
      }
      // The artboard positions it in document space, which only makes sense for
      // an object nothing else already positions.
      if (!rootIds.has(entry.layoutRoot)) {
        errors.push(
          `artboards[${index}].layoutRoot must be a top-level object in order: ${entry.layoutRoot}`,
        );
      }
    });
  }
  const derivedFrames = laidOutChildIds(value);
  const groups = new Map();
  for (const [id, entry] of Object.entries(objects)) {
    if (!isJsonObject(entry)) {
      errors.push(`objects.${id} must be an object`);
      continue;
    }
    if (entry.id !== id) errors.push(`objects.${id}.id must equal its map key`);
    if (typeof entry.type !== "string" || !entry.type)
      errors.push(`objects.${id} must have a type`);
    const derivable = derivedFrames.has(id);
    if (entry.frame === undefined) {
      if (!derivable) errors.push(`objects.${id}.frame must be an object`);
    } else if (!isJsonObject(entry.frame)) errors.push(`objects.${id}.frame must be an object`);
    else hasFiniteGeometry(entry.frame, `objects.${id}.frame`, errors, derivable);
    validateObjectLayoutFields(entry, `objects.${id}`, errors);
    validateLayout(entry.layout, `objects.${id}.layout`, errors);
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
function requireObject(document, id) {
  const object = Object.hasOwn(document.objects, id) ? document.objects[id] : undefined;
  if (!object) error("not_found", `Object not found: ${id}`);
  return object;
}
/** Sets or clears a group's auto layout. `null` removes it, which hands the
 *  children's geometry back to their own frames - any child that had none gets
 *  the fallback frame. Setting a layout leaves existing frames alone; the editor
 *  overwrites the derived axes at runtime. */
export function setDesignLayout(document, groupId, layout) {
  return mutate(document, (next) => {
    const group = requireObject(next, groupId);
    if (group.type !== "group") error("invalid_parent", `Object is not a group: ${groupId}`);
    if (layout === null) delete group.layout;
    else group.layout = cloneJson(layout);
  });
}
/** Shallow-merges into an existing layout, leaving unmentioned fields alone. */
export function patchDesignLayout(document, groupId, patch) {
  return mutate(document, (next) => {
    const group = requireObject(next, groupId);
    const layout = group.layout;
    if (!isJsonObject(layout)) error("not_found", `Object has no layout: ${groupId}`);
    group.layout = { ...layout, ...cloneJson(patch) };
  });
}
export function setDesignLayoutSizing(document, objectId, sizing) {
  return mutate(document, (next) => {
    const object = requireObject(next, objectId);
    if (sizing === null) delete object.layoutSizing;
    else object.layoutSizing = cloneJson(sizing);
  });
}
export function createDesignFlexGroup(document, options, placement = {}) {
  return mutate(document, (next) => {
    if (Object.hasOwn(next.objects, options.id))
      error("duplicate_id", `Object already exists: ${options.id}`);
    const adopted = new Set();
    for (const child of options.children ?? []) {
      if (!Object.hasOwn(next.objects, child)) error("not_found", `Object not found: ${child}`);
      if (adopted.has(child)) error("duplicate_id", `Duplicate child: ${child}`);
      adopted.add(child);
    }
    const pending = [...adopted];
    while (pending.length > 0) {
      const objectId = pending.pop();
      if (placement.parentId === objectId)
        error("group_cycle", `Cannot place ${options.id} inside its own child ${objectId}`);
      pending.push(...(groupChildren(next.objects[objectId]) ?? []));
    }
    // Resolve the destination before detaching, so an unusable parentId fails
    // without having already pulled the adopted children out of the tree.
    targetOrder(next, placement.parentId);
    const parentLaidOut =
      !!placement.parentId && isJsonObject(next.objects[placement.parentId]?.layout);
    removePlacements(next, adopted);
    const group = {
      id: options.id,
      type: "group",
      layout: cloneJson(options.layout ?? { type: "flex" }),
      // The document stores a painter's stack (last child on top), while auto
      // layout follows that same top-to-bottom order shown in Layers.
      children: [...adopted].reverse(),
    };
    if (options.name !== undefined) group.name = options.name;
    if (options.frame !== undefined) group.frame = cloneJson(options.frame);
    else if (!parentLaidOut) group.frame = { ...LAYOUT_FALLBACK_FRAME };
    setJsonProperty(next.objects, options.id, group);
    const order = targetOrder(next, placement.parentId);
    order.splice(0, order.length, ...insertAt(order, options.id, placement.index));
  });
}
/** Sets or clears an object's min/max bounds and aspect ratio. */
export function setDesignLayoutConstraints(document, objectId, constraints) {
  return mutate(document, (next) => {
    const object = requireObject(next, objectId);
    if (constraints === null) delete object.layoutConstraints;
    else object.layoutConstraints = cloneJson(constraints);
  });
}
/**
 * Give an artboard a content root, or take it away.
 *
 * With `layoutSizing: { height: "hug" }` this is how a page GROWS with what it
 * holds instead of being a fixed rectangle its content overflows. Clearing it
 * hands the root's geometry back to its own frame, which `mutate` materializes
 * if the root never had one.
 */
export function setDesignArtboardLayout(document, artboardId, layout) {
  return mutate(document, (next) => {
    const artboard = next.artboards.find((entry) => entry.id === artboardId);
    if (!artboard) error("not_found", `Artboard not found: ${artboardId}`);
    if (layout === null) {
      delete artboard.layoutRoot;
      delete artboard.padding;
      delete artboard.layoutSizing;
      delete artboard.layoutConstraints;
      return;
    }
    if (!Object.hasOwn(next.objects, layout.layoutRoot)) {
      error("not_found", `Object not found: ${layout.layoutRoot}`);
    }
    artboard.layoutRoot = layout.layoutRoot;
    if (layout.padding === undefined) delete artboard.padding;
    else artboard.padding = cloneJson(layout.padding);
    if (layout.layoutSizing === undefined) delete artboard.layoutSizing;
    else artboard.layoutSizing = cloneJson(layout.layoutSizing);
    if (layout.layoutConstraints === undefined) delete artboard.layoutConstraints;
    else artboard.layoutConstraints = cloneJson(layout.layoutConstraints);
  });
}
/** Adds a design token, or replaces the one already under `id`. */
export function upsertDesignToken(document, id, token) {
  if (!id) error("invalid_token", "Token id must be a non-empty string");
  return mutate(document, (next) => {
    next.tokens = { ...(next.tokens ?? {}), [id]: cloneJson(token) };
  });
}
/**
 * Whether anything still names `id` — a `token` or `<prop>Token` field
 * anywhere in the document, or another token's `{id}` alias. Walked structurally rather than
 * field by field: the format carries token refs on fills, gradient stops,
 * strokes, effects, text styles, layout gaps, padding and corner radius, and a
 * hand-maintained list of those would drift behind the next one added.
 */
function isDesignTokenReferenced(document, id) {
  const alias = `{${id}}`;
  const seen = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) return value.some(walk);
    if (!isJsonObject(value)) return false;
    if (seen.has(value)) return false;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      // `token` is the whole-paint shorthand a fill layer collapses to on
      // save; `<prop>Token` is every other reference site.
      if ((key === "token" || key.endsWith("Token")) && child === id) return true;
      if (child !== undefined && walk(child)) return true;
    }
    return false;
  };
  for (const [tokenId, token] of Object.entries(
    isJsonObject(document.tokens) ? document.tokens : {},
  )) {
    if (tokenId === id || !isJsonObject(token)) continue;
    if (typeof token.value === "string" && token.value.trim() === alias) return true;
  }
  return (
    walk(isJsonObject(document.objects) ? document.objects : {}) ||
    walk(Array.isArray(document.artboards) ? document.artboards : [])
  );
}
/**
 * Removes a token, refusing while anything still references it — the same
 * guard `removeDesignShader` applies, and for the same reason: the value beside
 * a `<prop>Token` is DERIVED, so the writer has already stripped it. A fill
 * that is entirely a paint token is on disk as the bare `{ "type": "token" }`
 * shorthand with no colour left to fall back to, and dropping the entry under
 * it renders the object with no fill at all.
 */
export function removeDesignToken(document, id) {
  return mutate(document, (next) => {
    if (!next.tokens || !Object.hasOwn(next.tokens, id)) {
      error("not_found", `Token not found: ${id}`);
    }
    if (isDesignTokenReferenced(next, id)) {
      error("token_in_use", `Token is still referenced: ${id}`);
    }
    const tokens = { ...next.tokens };
    delete tokens[id];
    if (Object.keys(tokens).length === 0) delete next.tokens;
    else next.tokens = tokens;
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
