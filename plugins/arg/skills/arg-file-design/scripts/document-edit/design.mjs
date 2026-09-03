// Generated from sdk/typescript/src/documents/design.ts. Do not edit directly.
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
// `design-html.ts` imports this module back, but only with `import type`, which
// `verbatimModuleSyntax` erases from both the tsc build and the skill
// generator's `transpileModule` output. The cycle is therefore types-only —
// TypeScript resolves that without trouble and no runtime import graph closes.
// Hoisting `DesignDocument` into `common.ts` would break the cycle at the cost
// of moving the format's public types away from the module that owns them.
import { isDesignHtml, parseDesignHtml } from "./design-html.mjs";
import { applyDesignLayout } from "./layout.mjs";
/** What a `number` token measures. Every role is authored in document
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
 * A shape's point count is geometry too, so it answers to the same rule as a
 * frame's — the codec turns it into that many coordinates, and a non-finite one
 * is not a count. Absent is fine; the serializer has a default for that.
 */
function hasFiniteShapeCount(value, field, label, errors) {
  const number = value[field];
  if (number === undefined) return;
  if (typeof number !== "number" || !Number.isFinite(number)) {
    errors.push(`${label}.${field} must be finite`);
  }
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
const LAYOUT_DIRECTIONS = ["row", "column", "row-reverse", "column-reverse"];
const LAYOUT_WRAPS = ["nowrap", "wrap", "wrap-reverse"];
const LAYOUT_JUSTIFICATIONS = [
  "start",
  "center",
  "end",
  "space-between",
  "space-around",
  "space-evenly",
];
const LAYOUT_ALIGNMENTS = ["start", "center", "end", "stretch"];
const LAYOUT_AUTO_FLOWS = ["row", "column"];
const LAYOUT_PADDING_SIDES = ["top", "right", "bottom", "left"];
function optionList(allowed) {
  if (allowed.length < 3) return allowed.join(" or ");
  return `${allowed.slice(0, -1).join(", ")}, or ${allowed[allowed.length - 1]}`;
}
function hasAllowedValue(value, allowed, label, errors) {
  if (value === undefined) return;
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push(`${label} must be ${optionList(allowed)}`);
  }
}
function hasNonNegativeNumber(value, label, errors) {
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    errors.push(`${label} must be a non-negative number`);
  }
}
function hasTrackList(value, label, errors) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((track) => typeof track !== "string")) {
    errors.push(`${label} must be an array of strings`);
  }
}
function validateTokenRef(value, label, errors) {
  if (value === undefined) return;
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${label} must be a token id`);
  }
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
    hasAllowedValue(token.type, DESIGN_TOKEN_TYPES, `${owner}.type`, errors);
    hasAllowedValue(token.role, DESIGN_NUMBER_TOKEN_ROLES, `${owner}.role`, errors);
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
/**
 * A layout is solved into every child's frame, so a value the solver has to
 * fall back on produces a silently wrong drawing rather than a visible failure.
 * Unknown fields pass: this format preserves them everywhere else too.
 */
function hasValidLayout(value, label, errors) {
  if (value === undefined) return;
  if (!isJsonObject(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  if (value.mode !== "flex" && value.mode !== "grid") {
    errors.push(`${label}.mode must be flex or grid`);
  }
  hasAllowedValue(value.direction, LAYOUT_DIRECTIONS, `${label}.direction`, errors);
  hasAllowedValue(value.wrap, LAYOUT_WRAPS, `${label}.wrap`, errors);
  hasAllowedValue(value.justify, LAYOUT_JUSTIFICATIONS, `${label}.justify`, errors);
  hasAllowedValue(value.align, LAYOUT_ALIGNMENTS, `${label}.align`, errors);
  hasAllowedValue(value.alignContent, LAYOUT_JUSTIFICATIONS, `${label}.alignContent`, errors);
  hasNonNegativeNumber(value.rowGap, `${label}.rowGap`, errors);
  hasNonNegativeNumber(value.columnGap, `${label}.columnGap`, errors);
  hasValidLayoutTokenRefs(value, label, errors);
  if (value.padding !== undefined) {
    if (!isJsonObject(value.padding)) errors.push(`${label}.padding must be an object`);
    else {
      for (const side of LAYOUT_PADDING_SIDES) {
        hasNonNegativeNumber(value.padding[side], `${label}.padding.${side}`, errors);
      }
    }
  }
  hasTrackList(value.columns, `${label}.columns`, errors);
  hasTrackList(value.rows, `${label}.rows`, errors);
  hasAllowedValue(value.autoFlow, LAYOUT_AUTO_FLOWS, `${label}.autoFlow`, errors);
}
function hasValidLayoutTokenRefs(value, label, errors) {
  validateTokenRef(value.gapToken, `${label}.gapToken`, errors);
  validateTokenRef(value.rowGapToken, `${label}.rowGapToken`, errors);
  validateTokenRef(value.columnGapToken, `${label}.columnGapToken`, errors);
  validateTokenRef(value.paddingToken, `${label}.paddingToken`, errors);
}
function hasValidLayoutItem(value, label, errors) {
  if (value === undefined) return;
  if (!isJsonObject(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  hasNonNegativeNumber(value.grow, `${label}.grow`, errors);
  hasNonNegativeNumber(value.shrink, `${label}.shrink`, errors);
  const basis = value.basis;
  if (
    basis !== undefined &&
    basis !== "auto" &&
    (typeof basis !== "number" || !Number.isFinite(basis))
  ) {
    errors.push(`${label}.basis must be a finite number or auto`);
  }
  hasAllowedValue(value.alignSelf, LAYOUT_ALIGNMENTS, `${label}.alignSelf`, errors);
  if (
    value.order !== undefined &&
    (typeof value.order !== "number" || !Number.isFinite(value.order))
  )
    errors.push(`${label}.order must be finite`);
  for (const field of ["column", "row"]) {
    if (value[field] !== undefined && typeof value[field] !== "string")
      errors.push(`${label}.${field} must be a string`);
  }
}
/** Children whose frames a layout container derives — a document written by the
 *  earlier layout model's serializer may omit those numbers entirely, so the
 *  validator relaxes for them and the reader backfills. */
function laidOutChildIds(objects) {
  const ids = new Set();
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
/** One track of the earlier layout model's grid, as `{ size, unit }`. */
function legacyTrackToCss(track) {
  if (!isJsonObject(track)) return "auto";
  if (track.unit === "fr") return `${typeof track.size === "number" ? track.size : 1}fr`;
  if (track.unit === "auto") return "auto";
  return `${typeof track.size === "number" ? track.size : 0}px`;
}
function legacyTracksToCss(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return Array.from({ length: value }, () => "1fr");
  }
  if (Array.isArray(value)) return value.map(legacyTrackToCss);
  return undefined;
}
function legacyPadding(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { top: value, right: value, bottom: value, left: value };
  }
  return isJsonObject(value) ? value : undefined;
}
function compactRecord(record) {
  for (const key of Object.keys(record)) if (record[key] === undefined) delete record[key];
  return record;
}
/**
 * Fold the earlier layout model (PR #5049: `layout.type`, `layoutSizing`
 * fixed/fill/hug, `layoutGrow`, `layoutAlign`, `gridArea`) into the current
 * CSS-1:1 one (`layout.mode` + `layoutItem`), so a document written between the
 * two implementations keeps its layout.
 *
 * Two semantic gaps are bridged deliberately:
 * - That model laid children out in the visible hierarchy's top-to-bottom order
 *   — the REVERSE of the painter-order `children` array the current solver
 *   follows. Reversing `children` would flip paint order, so each migrated
 *   child gets `layoutItem.order` instead, which reverses layout order alone.
 * - `hug` has no equivalent (nothing measures content here); a hug child keeps
 *   whatever frame is on disk, and a frame that model omitted as derived is
 *   backfilled with a placeholder the solver then positions.
 */
export function migrateLegacyDesignLayout(document) {
  const objects = isJsonObject(document.objects) ? document.objects : undefined;
  if (!objects) return document;
  const legacyContainers = Object.entries(objects).filter(
    ([, entry]) =>
      isJsonObject(entry) && isJsonObject(entry.layout) && typeof entry.layout.type === "string",
  );
  const legacyChildFields = Object.values(objects).some(
    (entry) =>
      isJsonObject(entry) &&
      (entry.layoutSizing !== undefined ||
        entry.layoutGrow !== undefined ||
        entry.layoutAlign !== undefined ||
        entry.gridArea !== undefined),
  );
  if (legacyContainers.length === 0 && !legacyChildFields) return document;
  const next = cloneJson(document);
  const nextObjects = next.objects;
  for (const [containerId, rawEntry] of Object.entries(nextObjects)) {
    if (!isJsonObject(rawEntry)) continue;
    const entry = rawEntry;
    const old = entry.layout;
    if (!isJsonObject(old) || typeof old.type !== "string") continue;
    const direction = old.direction === "column" ? "column" : "row";
    entry.layout = compactRecord(
      old.type === "grid"
        ? {
            mode: "grid",
            columns: legacyTracksToCss(old.columns),
            rows: legacyTracksToCss(old.rows),
            columnGap: typeof old.columnGap === "number" ? old.columnGap : old.gap,
            rowGap: typeof old.rowGap === "number" ? old.rowGap : old.gap,
            padding: legacyPadding(old.padding),
            // That model's grid `justify`/`align` are in-cell placements; the
            // start/center/end words survive, `stretch` is already the default.
            justify: old.justify === "stretch" ? undefined : old.justify,
            align: old.align,
            autoFlow: old.autoFlow,
          }
        : {
            mode: "flex",
            direction,
            wrap: old.wrap === true ? "wrap" : undefined,
            justify: old.justify,
            align: old.align,
            columnGap: old.gap,
            rowGap: typeof old.rowGap === "number" ? old.rowGap : old.gap,
            padding: legacyPadding(old.padding),
          },
    );
    const children = Array.isArray(entry.children) ? entry.children : [];
    const count = children.length;
    children.forEach((childId, index) => {
      if (typeof childId !== "string") return;
      const child = nextObjects[childId];
      if (!isJsonObject(child)) return;
      const sizing = isJsonObject(child.layoutSizing) ? child.layoutSizing : {};
      const mainSizing = direction === "column" ? sizing.height : sizing.width;
      const crossSizing = direction === "column" ? sizing.width : sizing.height;
      const area = isJsonObject(child.gridArea) ? child.gridArea : undefined;
      const item = compactRecord({
        ...(isJsonObject(child.layoutItem) ? child.layoutItem : {}),
        order: count > 1 ? count - 1 - index : undefined,
        grow:
          typeof child.layoutGrow === "number"
            ? child.layoutGrow
            : mainSizing === "fill"
              ? 1
              : undefined,
        alignSelf:
          typeof child.layoutAlign === "string"
            ? child.layoutAlign
            : crossSizing === "fill"
              ? "stretch"
              : undefined,
        column: area ? gridAreaToLine(area.column, area.columnSpan) : undefined,
        row: area ? gridAreaToLine(area.row, area.rowSpan) : undefined,
      });
      if (Object.keys(item).length > 0) child.layoutItem = item;
      delete child.layoutSizing;
      delete child.layoutGrow;
      delete child.layoutAlign;
      delete child.gridArea;
      // That model omitted derived geometry on disk; the solver needs a frame
      // to start from, so backfill a placeholder it will position and size.
      const frame = isJsonObject(child.frame) ? child.frame : {};
      child.frame = {
        x: typeof frame.x === "number" ? frame.x : 0,
        y: typeof frame.y === "number" ? frame.y : 0,
        width: typeof frame.width === "number" ? frame.width : 100,
        height: typeof frame.height === "number" ? frame.height : 100,
        ...(typeof frame.rotation === "number" ? { rotation: frame.rotation } : {}),
      };
    });
    void containerId;
  }
  // Child fields can also linger on objects whose container already migrated
  // (or was deleted); they are that model's spelling either way.
  for (const entry of Object.values(nextObjects)) {
    if (!isJsonObject(entry)) continue;
    delete entry.layoutSizing;
    delete entry.layoutGrow;
    delete entry.layoutAlign;
    delete entry.gridArea;
  }
  return next;
}
function gridAreaToLine(start, span) {
  const hasStart = typeof start === "number" && Number.isInteger(start) && start >= 1;
  const hasSpan = typeof span === "number" && Number.isInteger(span) && span > 1;
  if (hasStart && hasSpan) return `${start} / span ${span}`;
  if (hasStart) return `${start}`;
  if (hasSpan) return `span ${span}`;
  return undefined;
}
/**
 * Read canonical `.design` JSON or the transient HTML creation wire.
 *
 * The exact HTML codec (`serializeDesignHtml` in ./design-html) is also used by
 * canvas-owned `.html` projections. A brand-new `.design` may carry that input
 * until its first editable open materializes JSON, so readers tolerate it even
 * though writers persist JSON.
 *
 * Everything downstream of this function — `editDesign`, the artboard/object
 * mutators, `validateDesign`, `collectDesignFileReferences` — operates on the
 * parsed document object and is unchanged by the input spelling.
 */
export function parseDesign(text) {
  let document = isDesignHtml(text)
    ? parseDesignHtml(text)
    : parseJsonDocument(text, "Design document");
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
  document = migrateLegacyDesignLayout(document);
  // `parseDesignHtml` already solved its branch, and the solve is idempotent, so
  // this is here for the legacy-JSON branch — which has no CSS to carry a layout
  // child's position and would otherwise hand back the authored frames the
  // container's own rules are supposed to override.
  // Guarded because the solve reads author-controlled span and track counts and
  // a read must degrade, never throw: the authored frames are a worse layout
  // than the solved ones but still the user's document.
  try {
    document = applyDesignLayout(document);
  } catch {
    // Keep the authored frames.
  }
  assertValid(document);
  return document;
}
/** Write a `.design` file: JSON, until the deferred HTML flip (see
 *  `parseDesign`). Flipping this body to `serializeDesignHtml(normalized)` is
 *  the whole launch. */
export function stringifyDesign(document) {
  const normalized = normalizedDesign(migrateLegacyDesignLayout(document));
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
        hasValidLayout(entry.layout, `artboards[${index}].layout`, errors);
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
    if (entry.type === "polygon") hasFiniteShapeCount(entry, "sides", `objects.${id}`, errors);
    if (entry.type === "star") hasFiniteShapeCount(entry, "points", `objects.${id}`, errors);
    hasValidLayout(entry.layout, `objects.${id}.layout`, errors);
    hasValidLayoutItem(entry.layoutItem, `objects.${id}.layoutItem`, errors);
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
function layoutContainer(document, containerId) {
  const artboard = document.artboards.find((entry) => entry.id === containerId);
  if (artboard) return artboard;
  const object = Object.hasOwn(document.objects, containerId)
    ? document.objects[containerId]
    : undefined;
  if (!object) error("not_found", `Layout container not found: ${containerId}`);
  if (object.type !== "group")
    error("invalid_container", `Object is not an artboard or a group: ${containerId}`);
  return object;
}
/**
 * Lay a group's or an artboard's children out, or with `null` stop doing so.
 * Removal deletes the key, because the model has no disabled layout: any value
 * stored under it is one, and the format emits no `layout` for a container
 * that has none.
 */
export function setDesignLayout(document, containerId, layout) {
  return mutate(document, (next) => {
    const container = layoutContainer(next, containerId);
    if (layout === null) delete container.layout;
    else container.layout = cloneJson(layout);
  });
}
/** Set or, with `null`, remove one object's overrides within its container. */
export function setDesignLayoutItem(document, objectId, item) {
  return mutate(document, (next) => {
    const object = Object.hasOwn(next.objects, objectId) ? next.objects[objectId] : undefined;
    if (!object) error("not_found", `Object not found: ${objectId}`);
    if (item === null) delete object.layoutItem;
    else object.layoutItem = cloneJson(item);
  });
}
function finiteField(value, field) {
  const number = value?.[field];
  return typeof number === "number" && Number.isFinite(number) ? number : undefined;
}
/**
 * An artboard holds no `children`, so a root object belongs to one by geometry:
 * the frame-centre test `design-html.ts` also uses to decide which
 * `<section data-arg-artboard>` a layer serializes inside.
 */
function artboardOwning(document, object) {
  const frame = record(object.frame);
  const x = finiteField(frame, "x");
  const y = finiteField(frame, "y");
  const width = finiteField(frame, "width");
  const height = finiteField(frame, "height");
  if (x === undefined || y === undefined || width === undefined || height === undefined)
    return undefined;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  return document.artboards.find((artboard) => {
    const left = finiteField(artboard, "x");
    const top = finiteField(artboard, "y");
    const artboardWidth = finiteField(artboard, "width");
    const artboardHeight = finiteField(artboard, "height");
    if (
      left === undefined ||
      top === undefined ||
      artboardWidth === undefined ||
      artboardHeight === undefined
    )
      return false;
    return (
      centerX >= left &&
      centerX <= left + artboardWidth &&
      centerY >= top &&
      centerY <= top + artboardHeight
    );
  });
}
/**
 * The same test the solver applies: a `layout` it can read no `mode` from lays
 * nothing out, so a document that carries one derives no frame from it. Reading
 * the untrusted key more loosely than the solver does would report a container
 * that never places its children — leaving them unmovable, since the editor
 * stops offering a free drag as soon as this answers non-null.
 */
function isSolvedLayout(value) {
  return isJsonObject(value) && (value.mode === "flex" || value.mode === "grid");
}
/**
 * The id of the container laying this object out, or `null` when nothing does.
 * A non-null answer means the object's `frame` position is derived — the solver
 * recomputes it — so writing `frame.x`/`frame.y` on it has no lasting effect.
 */
export function designLayoutContainerId(document, objectId) {
  if (!Object.hasOwn(document.objects, objectId)) return null;
  for (const [id, object] of Object.entries(document.objects)) {
    if (!isJsonObject(object) || !groupChildren(object)?.includes(objectId)) continue;
    return isSolvedLayout(object.layout) ? id : null;
  }
  if (!document.order.includes(objectId)) return null;
  const artboard = artboardOwning(document, document.objects[objectId]);
  return artboard && isSolvedLayout(artboard.layout) ? artboard.id : null;
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
 * anywhere in the document, or another token's `{id}` alias. Walked
 * structurally rather than field by field: the format carries token refs on
 * fills, gradient stops, strokes, effects, text styles, layout gaps, padding
 * and corner radius, and a hand-maintained list of those would drift behind
 * the next one added.
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
