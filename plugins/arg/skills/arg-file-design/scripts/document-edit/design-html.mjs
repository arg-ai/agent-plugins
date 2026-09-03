// Generated from sdk/typescript/src/documents/design-html.ts. Do not edit directly.
/**
 * The `.design` HTML codec: a bidirectional, round-trip-lossless translation
 * between the `DesignDocument` model and an HTML/CSS/Tailwind document.
 *
 * The design file *is* the markup. HTML and CSS are authoritative — geometry is
 * `left`/`top`/`width`/`height`, paint is `background-image` layers, strokes are
 * `box-shadow` rings, effects are a `filter` chain, and a value that lands on
 * Tailwind's default scale is emitted as its utility class. `data-arg-*`
 * attributes carry only what CSS genuinely cannot say: an object's type, a
 * star's point count, a path's anchor list, the parameters of a live shader or
 * video paint. Text objects hold their real text, so a `.design` file is
 * greppable and hand-editable.
 *
 * Two properties make that safe to build on.
 *
 * **Field preservation.** Any property the codec does not explicitly map to CSS
 * survives in a compact residual `data-arg-x` attribute on the node that owns
 * it. The model is deliberately loose and still growing, so an exhaustive
 * per-field mapping is a progressive enhancement — never a correctness
 * requirement. A field nobody has taught the codec about is carried, not lost.
 *
 * **Self-verification.** `serializeDesignHtml` re-parses its own output and
 * compares it against the input. On any mismatch it appends a
 * `data-arg-fallback` script holding the exact document JSON and marks the
 * document lossy, so a save can never lose data even if a mapping is wrong.
 *
 * Repair-forward and never throws, the same posture as `@arg/cad`'s parser:
 * unknown elements are skipped, malformed values fall back to defaults, and
 * empty or garbage input yields a blank document.
 */
import { isJsonObject } from "./common.mjs";
import { buildCssCascade } from "./css-cascade.mjs";
import * as css from "./css-values.mjs";
import {
  childElements,
  element,
  findByTag,
  getAttribute,
  hasAttribute,
  parseHtml,
  serializeHtml,
  text,
  textContent,
} from "./html-dom.mjs";
import { applyDesignLayout } from "./layout.mjs";
import { buildUtilityStylesheet, fromTailwind, toTailwind } from "./tailwind-classes.mjs";
const DESIGN_HTML_VERSION = "1";
const MAX_DIFF_ENTRIES = 24;
/** Object types rendered as inline SVG because CSS cannot express their geometry. */
const SVG_TYPES = new Set(["polygon", "star", "line", "path"]);
// ---------- small JSON helpers ----------
function asArray(value) {
  return Array.isArray(value) ? value : undefined;
}
function objectArray(value) {
  const list = asArray(value);
  if (!list) return undefined;
  return list.every(isJsonObject) ? list : undefined;
}
function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}
/** Own keys with a defined value that `consumed` did not claim. */
function residualOf(source, consumed) {
  const rest = {};
  let any = false;
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || consumed.has(key)) continue;
    rest[key] = value;
    any = true;
  }
  return any ? cloneValue(rest) : undefined;
}
/**
 * The residual for a NESTED object (a frame, a text style, the canvas). An empty
 * object is its own residual: `{}` and "absent" are different documents, and only
 * the residual can tell the parser which one it is looking at.
 */
function residualForNested(source, consumed) {
  const rest = residualOf(source, consumed);
  if (rest) return rest;
  return consumed.size === 0 ? {} : undefined;
}
/**
 * Keys that address the prototype chain rather than the node being built.
 *
 * `JSON.parse` makes `__proto__` an ordinary OWN property, so it survives
 * `Object.entries` — and `target["__proto__"]` then reads `Object.prototype`,
 * which is a plain object, so the recursion below would write the attacker's
 * keys onto every object in the isolate. A document is untrusted input and this
 * parser runs in the Worker as well as the editor, so the keys are refused
 * rather than assigned through.
 */
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
/** Merge a residual over a codec-derived node, recursing into plain objects. */
function mergeResidual(target, residual) {
  if (!isJsonObject(residual)) return;
  for (const [key, value] of Object.entries(residual)) {
    if (value === undefined || PROTOTYPE_KEYS.has(key)) continue;
    const existing = target[key];
    if (isJsonObject(existing) && isJsonObject(value)) mergeResidual(existing, value);
    else target[key] = cloneValue(value);
  }
}
function encodeJsonAttribute(value) {
  return JSON.stringify(value);
}
function decodeJsonAttribute(value) {
  if (value === undefined || value === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
/** JSON safe to sit inside a raw-text `<script>` body. */
function encodeScriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
// ---------- structural equality ----------
function normalizedForCompare(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map((entry) => normalizedForCompare(entry) ?? null);
  if (isJsonObject(value)) {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const normalized = normalizedForCompare(value[key]);
      if (normalized !== undefined) out[key] = normalized;
    }
    return out;
  }
  return value;
}
/**
 * Structural JSON equality with an early exit, treating an `undefined`-valued
 * key as absent.
 *
 * The self-verify runs on every save, so its happy path is the one that has to
 * be cheap. Comparing two documents by stringifying both was a second full
 * serialization of a multi-megabyte file, to answer a question that usually
 * fails on the first differing key — or succeeds without needing the strings at
 * all.
 */
function jsonEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
      if (!jsonEqual(a[index], b[index])) return false;
    }
    return true;
  }
  if (typeof a !== "object" || typeof b !== "object") return false;
  // `for...in` rather than `Object.keys`: this runs over every node of the
  // document on every save, and the key arrays were pure garbage.
  let defined = 0;
  for (const key in a) {
    const value = a[key];
    if (value === undefined) continue;
    defined += 1;
    if (!jsonEqual(value, b[key])) return false;
  }
  for (const key in b) {
    if (b[key] !== undefined) defined -= 1;
  }
  return defined === 0;
}
function collectDiff(a, b, path, out) {
  if (out.length >= MAX_DIFF_ENTRIES) return;
  const left = normalizedForCompare(a);
  const right = normalizedForCompare(b);
  if (JSON.stringify(left) === JSON.stringify(right)) return;
  if (Array.isArray(left) && Array.isArray(right)) {
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      collectDiff(left[index], right[index], `${path}[${index}]`, out);
    }
    return;
  }
  if (isJsonObject(left) && isJsonObject(right)) {
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
      collectDiff(left[key], right[key], path ? `${path}.${key}` : key, out);
    }
    return;
  }
  out.push(path || "<document>");
}
// ---------- geometry mirrored from the editor ----------
// Mirrors `polygonPoints` / `starPoints` in
// frontend/src/components/editors/design-editor/svg-helpers.ts. This geometry is
// derived from `sides` / `points` / `innerRatio`, never read back, so the copy
// only has to agree visually.
/**
 * `MAX_SHAPE_POINTS` exists ONLY to bound the loops below, which emit one
 * coordinate per step: `sides: Infinity` never terminates, and an
 * out-of-memory abort is the one failure the "a design file must never fail to
 * save" catch in `serializeDesignHtmlChecked` cannot absorb.
 *
 * It is deliberately far above anything a document would hold — the editor's
 * own Sides/Points spinners stop at 20, and a few hundred vertices is already
 * indistinguishable from a circle at any zoom — because it is a safety bound,
 * not a style bound. An agent authoring through the SDK may legitimately write
 * a 24-sided polygon and `validateDesign` accepts it, so anything low enough to
 * round a real document down would make this renderer disagree with the
 * editor's SVG canvas about the same file. Keep the two in step: the mirror is
 * `frontend/src/components/editors/design-editor/svg-helpers.ts`.
 *
 * `sides` / `points` themselves ride `data-arg-sides` / `data-arg-points`
 * verbatim either way, so the model is never rounded — only a pathological
 * drawing is.
 */
const MIN_SHAPE_POINTS = 3;
const MAX_SHAPE_POINTS = 10_000;
/** What `createStar` seeds; a polygon's is the minimum, as `createPolygon` seeds. */
const DEFAULT_STAR_POINTS = 5;
/** A drawable point count. A non-finite one is no count at all, so it defaults. */
function shapePointCount(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(MAX_SHAPE_POINTS, Math.max(MIN_SHAPE_POINTS, Math.round(value)));
}
function polygonPoints(width, height, sides) {
  const points = [];
  const count = shapePointCount(sides, MIN_SHAPE_POINTS);
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    points.push({
      x: width / 2 + (width / 2) * Math.cos(angle),
      y: height / 2 + (height / 2) * Math.sin(angle),
    });
  }
  return points;
}
function starPoints(width, height, count, innerRatio) {
  const points = [];
  const inner = Math.max(0.05, Math.min(0.95, innerRatio));
  const total = shapePointCount(count, DEFAULT_STAR_POINTS) * 2;
  for (let index = 0; index < total; index += 1) {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const radius = index % 2 === 0 ? 1 : inner;
    points.push({
      x: width / 2 + (width / 2) * radius * Math.cos(angle),
      y: height / 2 + (height / 2) * radius * Math.sin(angle),
    });
  }
  return points;
}
function formatPoints(points) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}
function cssPolygon(points) {
  return `polygon(${points.map((point) => `${point.x}px ${point.y}px`).join(", ")})`;
}
function paintModeFor(type) {
  if (type === "text") return { fills: "text", strokes: "glyph" };
  if (type === "group") return { fills: "data", strokes: "data" };
  // A line paints no fill at all in the SVG export; the other three paint theirs
  // through `background-image` + a `clip-path` cut to the silhouette.
  if (SVG_TYPES.has(type)) return { fills: type === "line" ? "data" : "css", strokes: "data" };
  return { fills: "css", strokes: "css" };
}
/** The top visible layer — the one the editor's text renderer actually paints. */
function topVisible(layers) {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    const layer = layers[index];
    if (layer && layer.visible !== false) return layer;
  }
  return undefined;
}
const GLYPH_PAINTING_FILL_TYPES = new Set([
  "solid",
  "linear-gradient",
  "radial-gradient",
  "angular-gradient",
  "diamond-gradient",
  "webcam",
]);
/**
 * Whether a fill can paint glyphs, mirroring `resolveTextPaint` in the editor —
 * including its guard that a source-less image placeholder does not yet paint,
 * so the legacy `color` stays the fallback.
 */
function paintsGlyphs(fill) {
  if (!fill) return false;
  if (fill.type === "file" && fill.fileType === "image") {
    return typeof fill.src === "string" && fill.src.length > 0;
  }
  return typeof fill.type === "string" && GLYPH_PAINTING_FILL_TYPES.has(fill.type);
}
/**
 * A stroke's `-webkit-text-stroke` value. `exact` marks the ones whose whole
 * model that declaration reproduces; the rest are rendering hints only, emitted
 * beside the authoritative `data-arg-strokes` so a dashed or stacked outline
 * still draws round the glyphs instead of vanishing.
 */
function textStrokeValue(stroke) {
  if (!stroke || stroke.visible === false) return null;
  const width = css.toLength(stroke.width);
  const color = css.toCssColor(stroke.color, stroke.opacity);
  if (width === null || color === null) return null;
  // `visible` is absent for the same reason it is absent from the box-shadow
  // path: the declaration cannot say it, so a stroke carrying one is a
  // rendering hint whose model has to travel in `data-arg-strokes`.
  const allowed = new Set(["color", "width", "opacity"]);
  const exact = Object.keys(stroke).every((key) => allowed.has(key) || stroke[key] === undefined);
  return { value: `${width} ${color}`, exact };
}
function readFrame(value) {
  const frame = isJsonObject(value) ? value : {};
  const read = (key, fallback) =>
    typeof frame[key] === "number" && Number.isFinite(frame[key]) ? frame[key] : fallback;
  return { x: read("x", 0), y: read("y", 0), width: read("width", 0), height: read("height", 0) };
}
/** Paint a fill stack onto the glyphs rather than the box. */
function applyTextFills(fills, build) {
  const only = fills.length === 1 ? fills[0] : undefined;
  if (only && only.type === "solid" && only.visible !== false) {
    const allowed = new Set(["type", "color", "opacity"]);
    const plain = Object.keys(only).every((key) => allowed.has(key) || only[key] === undefined);
    const color = plain ? css.toCssColor(only.color, only.opacity) : null;
    if (color !== null) {
      build.declarations.color = color;
      return "color";
    }
  }
  const encoded = css.toBackgroundLayers(fills);
  Object.assign(build.declarations, encoded.declarations);
  // The standard gradient-text technique: the background paints only inside the
  // glyph shapes. Without it a gradient-filled heading renders as a gradient
  // rectangle, which is what the box-paint model got wrong.
  build.declarations["background-clip"] = "text";
  build.declarations["-webkit-background-clip"] = "text";
  if (encoded.residual.some((entry) => entry !== null)) {
    build.attributes["data-arg-fills"] = encodeJsonAttribute(encoded.residual);
  }
  return "background";
}
function applyLayerArrays(source, consumed, build, mode) {
  const fills = objectArray(source.fills);
  if (fills) {
    consumed.add("fills");
    if (mode.fills === "data") {
      build.attributes["data-arg-fills"] = encodeJsonAttribute(fills);
    } else if (mode.fills === "text") {
      applyTextFills(fills, build);
    } else {
      const encoded = css.toBackgroundLayers(fills);
      Object.assign(build.declarations, encoded.declarations);
      if (encoded.residual.some((entry) => entry !== null)) {
        build.attributes["data-arg-fills"] = encodeJsonAttribute(encoded.residual);
      }
    }
  }
  const strokes = objectArray(source.strokes);
  if (strokes) {
    consumed.add("strokes");
    if (mode.strokes === "css") {
      const encoded = css.toBoxShadow(strokes);
      Object.assign(build.declarations, encoded.declarations);
      if (encoded.residual.some((entry) => entry !== null)) {
        build.attributes["data-arg-strokes"] = encodeJsonAttribute(encoded.residual);
      }
    } else if (mode.strokes === "glyph") {
      // One plain stroke is a glyph outline CSS can draw; anything more (a
      // stack, a dash, a gradient paint) has no text-stroke spelling, so the
      // array travels whole and the top layer still draws the outline.
      const single = strokes.length === 1 ? textStrokeValue(strokes[0]) : null;
      const outline = single ?? textStrokeValue(topVisible(strokes));
      if (outline) {
        build.declarations["-webkit-text-stroke"] = outline.value;
        build.declarations["paint-order"] = "stroke fill";
      }
      if (!single?.exact) {
        build.attributes["data-arg-strokes"] = encodeJsonAttribute(strokes);
      }
    } else {
      // A line has no box for a `box-shadow` ring to trace, and a polygon's box
      // is not its silhouette; both stroke through SVG presentation attributes.
      build.attributes["data-arg-strokes"] = encodeJsonAttribute(strokes);
    }
  }
  const effects = objectArray(source.effects);
  if (effects) {
    consumed.add("effects");
    const encoded = css.toFilter(effects);
    Object.assign(build.declarations, encoded.declarations);
    if (encoded.residual.some((entry) => entry !== null)) {
      build.attributes["data-arg-effects"] = encodeJsonAttribute(encoded.residual);
    }
  }
}
// ---------- layout ----------
/**
 * Whether a container's `layout` reaches the page as CSS, and so whether its
 * children are laid out by it rather than absolutely placed.
 *
 * A hidden container is excluded because `display` is one property: it cannot
 * say both `none` and `flex`, so the hiding wins and the layout travels in the
 * residual instead. Its children then keep their `left`/`top`, which is the
 * only reading consistent with a file that no longer says anything lays them
 * out — and it costs nothing, since a browser renders none of that subtree.
 */
function laysOutChildren(source) {
  if (source.visible === false) return false;
  const layout = source.layout;
  return isJsonObject(layout) && (layout.mode === "flex" || layout.mode === "grid");
}
/**
 * Whether a frame can be omitted from the CSS in favour of the solver.
 *
 * The solve that runs at the end of a parse writes all four components, so a
 * frame that states only some of them would come back with the rest — the same
 * "decoded a field the source never had" mismatch the self-verify exists to
 * catch. Such a frame keeps its `left`/`top` and is placed absolutely; the
 * solver moves it either way, so the two directions still agree.
 */
function hasSolvableFrame(value) {
  if (!isJsonObject(value)) return false;
  for (const key of ["x", "y", "width", "height"]) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])) return false;
  }
  return true;
}
/**
 * Whether an object AND every descendant state a frame the solver reproduces.
 *
 * The subtree matters, not just the object: a laid-out child is written with no
 * position, so the solve that closes a parse has to move it back — and moving a
 * group carries its whole subtree along, which materializes a frame on any
 * descendant that had none. The serialize side had nothing to move and so left
 * that descendant frameless, and the two disagree. Placing such a child
 * absolutely keeps both sides on the frames the document actually states.
 */
function hasSolvableSubtree(id, context) {
  const cached = context.solvable.get(id);
  if (cached !== undefined) return cached;
  // Seeded before recursing, so a malformed `children` cycle resolves to
  // "place it absolutely" instead of spinning.
  context.solvable.set(id, false);
  const source = context.objects[id];
  let solvable = source !== undefined && hasSolvableFrame(source.frame);
  if (solvable) {
    for (const childId of asArray(source.children) ?? []) {
      if (typeof childId !== "string" || context.objects[childId] === undefined) continue;
      if (hasSolvableSubtree(childId, context)) continue;
      solvable = false;
      break;
    }
  }
  context.solvable.set(id, solvable);
  return solvable;
}
/** The layout/item fields the emitted declarations read back as their own value. */
function consumedFields(decoded, source) {
  const consumed = new Set();
  for (const key of Object.keys(decoded)) {
    if (jsonEqual(decoded[key], source[key])) consumed.add(key);
  }
  return consumed;
}
/**
 * Emit a container's layout as real CSS, reporting the fields it reproduces.
 *
 * Anything left unreported rides the residual: a field already at its default
 * (which writes no CSS), and a track list `toLayout` declines because an entry
 * would not read back as one token.
 *
 * `padding` additionally drops its declaration when it does not read back
 * exactly, because a residual MERGES into the parsed value rather than
 * replacing it — a partly reproduced padding would keep the sides the shorthand
 * filled in and the model never had.
 */
function applyLayout(layout, build) {
  const declarations = css.toLayout(layout);
  let decoded = css.fromLayout(declarations) ?? {};
  if (decoded.padding !== undefined && !jsonEqual(decoded.padding, layout.padding)) {
    delete declarations.padding;
    decoded = css.fromLayout(declarations) ?? {};
  }
  Object.assign(build.declarations, declarations);
  return consumedFields(decoded, layout);
}
function applyLayoutItem(item, build) {
  const declarations = css.toLayoutItem(item);
  Object.assign(build.declarations, declarations);
  return consumedFields(css.fromLayoutItem(declarations) ?? {}, item);
}
/** Write a container's or item's layout CSS and stash what CSS could not say. */
function applyLayoutField(source, key, consumed, build, residual) {
  const value = source[key];
  if (!isJsonObject(value)) return;
  const written = key === "layout" ? applyLayout(value, build) : applyLayoutItem(value, build);
  const rest = residualForNested(value, written);
  if (rest) residual[key] = rest;
  consumed.add(key);
}
function applyCommonPaint(
  source,
  consumed,
  build,
  frameResidual,
  origin,
  frameValue,
  rotationAsVariable,
  placeInFlow,
) {
  const frame = readFrame(frameValue);
  const raw = isJsonObject(frameValue) ? frameValue : {};
  const frameConsumed = new Set();
  const place = (key, property, base) => {
    const value = raw[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    const relative = value - base;
    // Only claim the coordinate when the parser's `relative + base` reproduces
    // it bit-for-bit; otherwise the exact value rides the residual and the CSS
    // is purely presentational.
    if (relative + base !== value) return;
    const length = css.toLength(relative);
    if (length === null) return;
    build.declarations[property] = length;
    frameConsumed.add(key);
  };
  if (placeInFlow) {
    // A layout container's children are in normal flow, so CSS states no
    // position for them and the solver derives one on both sides of the round
    // trip — which is the whole point of the file laying out in a browser.
    frameConsumed.add("x");
    frameConsumed.add("y");
  } else {
    place("x", "left", origin ? origin.x : 0);
    place("y", "top", origin ? origin.y : 0);
  }
  for (const [key, property] of [
    ["width", "width"],
    ["height", "height"],
  ]) {
    const length = css.toLength(raw[key]);
    if (length === null) continue;
    build.declarations[property] = length;
    frameConsumed.add(key);
  }
  if (typeof raw.rotation === "number" && Number.isFinite(raw.rotation)) {
    if (rotationAsVariable) {
      // A container's children are stored in document space and already carry
      // the composed rotation, so rotating the container would double-transform
      // every descendant. The angle is carried inert as a custom property.
      build.declarations["--arg-rotate"] = `${css.formatNumber(raw.rotation)}deg`;
      frameConsumed.add("rotation");
    } else {
      const rotation = css.toRotation(raw.rotation);
      if (rotation !== null) {
        build.declarations.transform = rotation;
        frameConsumed.add("rotation");
      }
    }
  }
  if (isJsonObject(frameValue)) {
    const rest = residualForNested(raw, frameConsumed);
    if (rest) frameResidual.frame = rest;
    consumed.add("frame");
  }
  if (typeof source.name === "string") {
    build.attributes["data-arg-name"] = source.name;
    consumed.add("name");
  }
  const opacity = css.toOpacity(source.opacity);
  if (opacity !== null) {
    build.declarations.opacity = opacity;
    consumed.add("opacity");
  }
  const blend = css.toBlendMode(source.blendMode);
  if (blend !== null) {
    build.declarations["mix-blend-mode"] = blend;
    consumed.add("blendMode");
  }
  if (source.visible === false) {
    build.declarations.display = "none";
    consumed.add("visible");
  }
  return frame;
}
function styleAttributes(build, extraClasses, used) {
  const split = toTailwind(build.declarations);
  for (const name of split.classes) used.add(name);
  const classes = [...split.classes, ...extraClasses];
  const style = css.formatStyleAttribute(split.style);
  return {
    className: classes.length > 0 ? classes.join(" ") : undefined,
    style: style || undefined,
  };
}
/**
 * SVG stroke presentation attributes for the top visible stroke — the only one
 * the editor's own export paints on these shapes. A `box-shadow` ring would
 * trace the element's rectangle, which for a star or a line is not its outline.
 */
function svgStrokeAttributes(source) {
  const top = topVisible(objectArray(source.strokes) ?? []);
  if (!top) return { stroke: "none" };
  const width = css.formatNumber(top.width) ?? "1";
  const numericWidth = typeof top.width === "number" && top.width > 0 ? top.width : 1;
  // Mirrors `dashArrayFor` in the editor's svg-helpers.
  const dash =
    top.dash === "dot"
      ? `${numericWidth} ${numericWidth * 2}`
      : top.dash === "dash"
        ? `${numericWidth * 3} ${numericWidth * 2}`
        : undefined;
  return {
    stroke: css.isCssSafeColor(top.color) ? top.color : "currentColor",
    "stroke-width": width,
    "stroke-opacity":
      typeof top.opacity === "number" ? (css.formatNumber(top.opacity) ?? undefined) : undefined,
    "stroke-dasharray": dash,
    "stroke-linecap": typeof top.cap === "string" ? top.cap : undefined,
    "stroke-linejoin": typeof top.join === "string" ? top.join : undefined,
  };
}
function svgGeometryChild(type, source, frame) {
  const stroke = svgStrokeAttributes(source);
  if (type === "polygon") {
    const sides = typeof source.sides === "number" ? source.sides : MIN_SHAPE_POINTS;
    return element("polygon", {
      points: formatPoints(polygonPoints(frame.width, frame.height, sides)),
      fill: "none",
      ...stroke,
    });
  }
  if (type === "star") {
    const points = typeof source.points === "number" ? source.points : DEFAULT_STAR_POINTS;
    const innerRatio = typeof source.innerRatio === "number" ? source.innerRatio : 0.5;
    return element("polygon", {
      points: formatPoints(starPoints(frame.width, frame.height, points, innerRatio)),
      fill: "none",
      ...stroke,
    });
  }
  if (type === "line") {
    const num = (key) => css.formatNumber(source[key]) ?? "0";
    return element("line", {
      x1: num("x1"),
      y1: num("y1"),
      x2: num("x2"),
      y2: num("y2"),
      ...stroke,
    });
  }
  if (type === "path") {
    return element("path", {
      d: typeof source.d === "string" ? source.d : "",
      "fill-rule":
        source.fillRule === "evenodd" || source.fillRule === "nonzero"
          ? source.fillRule
          : undefined,
      fill: "none",
      ...stroke,
      // The path's own coordinate system is scaled by its viewBox; without this
      // the stroke width would scale with it, as it does in the SVG export.
      "vector-effect": isJsonObject(source.viewBox) ? "non-scaling-stroke" : undefined,
    });
  }
  return null;
}
function serializeObject(id, source, origin, zIndex, context, laidOutByParent) {
  context.emitted.add(id);
  const type = typeof source.type === "string" ? source.type : "rect";
  const consumed = new Set();
  if (source.id === id) consumed.add("id");
  if (typeof source.type === "string") consumed.add("type");
  // A hidden object is out of a browser's flow and out of the solver's, so it
  // stays absolutely placed even inside a layout container.
  const inFlow = laidOutByParent && source.visible !== false && hasSolvableSubtree(id, context);
  const build = {
    declarations: inFlow ? {} : { position: "absolute" },
    attributes: {},
  };
  const residual = {};
  const isGroup = type === "group";
  const frame = applyCommonPaint(
    source,
    consumed,
    build,
    residual,
    origin,
    source.frame,
    isGroup,
    inFlow,
  );
  applyLayoutField(source, "layoutItem", consumed, build, residual);
  if (source.locked === true) {
    build.attributes["data-arg-locked"] = "";
    consumed.add("locked");
  }
  const flip = `${source.flipH === true ? "h" : ""}${source.flipV === true ? "v" : ""}`;
  if (flip) {
    // Flips mirror the object's raster fill content, not its box; a CSS
    // transform would move the element itself, so the axes travel as data.
    build.attributes["data-arg-flip"] = flip;
    if (source.flipH === true) consumed.add("flipH");
    if (source.flipV === true) consumed.add("flipV");
  }
  if (zIndex !== null) build.declarations["z-index"] = String(zIndex);
  const paint = paintModeFor(type);
  applyLayerArrays(source, consumed, build, paint);
  const extraClasses = [];
  const children = [];
  if (type === "rect" || isGroup) {
    const radius = css.toCornerRadius(source.cornerRadius);
    if (radius !== null) {
      build.declarations["border-radius"] = radius;
      consumed.add("cornerRadius");
    }
  }
  if (type === "ellipse") build.declarations["border-radius"] = "50%";
  if (isGroup) {
    // A group is its own stacking context, exactly as the SVG export's `<g>` is,
    // so its children stack inside it in DOM order rather than against the
    // document's global z-index ladder.
    build.declarations.isolation = "isolate";
    if (source.clipChildren === true) {
      build.declarations.overflow = "hidden";
      consumed.add("clipChildren");
    }
    const laysOut = laysOutChildren(source);
    if (laysOut) applyLayoutField(source, "layout", consumed, build, residual);
    const childIds = asArray(source.children);
    if (
      childIds &&
      childIds.every((entry) => typeof entry === "string" && context.objects[entry] !== undefined)
    ) {
      consumed.add("children");
      for (const childId of childIds) {
        children.push(
          serializeObject(childId, context.objects[childId], frame, null, context, laysOut),
        );
      }
    }
  }
  if (type === "text") {
    extraClasses.push("arg-text");
    if (source.textMode === "point" || source.textMode === "area") {
      build.declarations["white-space"] = source.textMode === "point" ? "pre" : "pre-wrap";
      consumed.add("textMode");
    }
    if (isJsonObject(source.style)) {
      const encoded = css.toTextStyle(source.style);
      Object.assign(build.declarations, encoded.declarations);
      const rest = residualForNested(source.style, encoded.consumed);
      if (rest) residual.style = rest;
      consumed.add("style");
    }
    // `color` on a text element is the glyph paint, whichever model field
    // supplied it. Three sources can: a single solid fill (written as `color`
    // directly), a background clipped to the glyphs (`color: transparent` so the
    // background shows through), and the legacy `TextObject.color` compatibility
    // field. Only the last needs telling apart on the way back in, because it is
    // the one that must NOT be read as a fill — hence the marker attribute.
    const fills = objectArray(source.fills);
    const glyphPaintFromFills = fills !== undefined && paintsGlyphs(topVisible(fills));
    if (!glyphPaintFromFills && css.isCssSafeColor(source.color)) {
      build.declarations.color = source.color;
      build.attributes["data-arg-text-color"] = "";
      consumed.add("color");
    } else if (fills !== undefined && build.declarations["background-clip"] === "text") {
      build.declarations.color = "transparent";
    }
    if (typeof source.text === "string") {
      consumed.add("text");
      if (source.text) children.push(text(source.text));
    }
  }
  if (SVG_TYPES.has(type)) {
    extraClasses.push("arg-shape");
    if (type === "polygon" && typeof source.sides === "number") {
      build.attributes["data-arg-sides"] = String(source.sides);
      consumed.add("sides");
    }
    if (type === "star") {
      if (typeof source.points === "number") {
        build.attributes["data-arg-points"] = String(source.points);
        consumed.add("points");
      }
      if (typeof source.innerRatio === "number") {
        build.attributes["data-arg-inner-ratio"] = String(source.innerRatio);
        consumed.add("innerRatio");
      }
    }
    if (type === "line") {
      for (const key of ["x1", "y1", "x2", "y2"]) {
        const formatted = css.formatNumber(source[key]);
        if (formatted === null) continue;
        build.attributes[`data-arg-${key}`] = formatted;
        consumed.add(key);
      }
      for (const [key, attribute] of [
        ["markerStart", "data-arg-marker-start"],
        ["markerEnd", "data-arg-marker-end"],
      ]) {
        if (typeof source[key] !== "string") continue;
        build.attributes[attribute] = source[key];
        consumed.add(key);
      }
    }
    if (type === "path") {
      if (typeof source.d === "string") consumed.add("d");
      if (source.fillRule === "evenodd" || source.fillRule === "nonzero") consumed.add("fillRule");
      if (source.closed === true) {
        build.attributes["data-arg-closed"] = "";
        consumed.add("closed");
      }
      const anchors = asArray(source.anchors);
      if (anchors) {
        build.attributes["data-arg-anchors"] = encodeJsonAttribute(anchors);
        consumed.add("anchors");
      }
      if (isJsonObject(source.viewBox)) {
        const width = css.formatNumber(source.viewBox.width);
        const height = css.formatNumber(source.viewBox.height);
        if (width !== null && height !== null && Object.keys(source.viewBox).length === 2) {
          build.attributes["data-arg-view-box"] = `${width} ${height}`;
          consumed.add("viewBox");
        }
      }
    }
    const geometry = svgGeometryChild(type, source, frame);
    if (geometry) children.push(geometry);
    // A shape's CSS paint is clipped to its silhouette where a basic shape can
    // express it, so the background layers land on the shape and not its box.
    if (type === "polygon" && typeof source.sides === "number") {
      build.declarations["clip-path"] = cssPolygon(
        polygonPoints(frame.width, frame.height, source.sides),
      );
    } else if (type === "star" && typeof source.points === "number") {
      build.declarations["clip-path"] = cssPolygon(
        starPoints(
          frame.width,
          frame.height,
          source.points,
          typeof source.innerRatio === "number" ? source.innerRatio : 0.5,
        ),
      );
    } else if (type === "path" && typeof source.d === "string" && !isJsonObject(source.viewBox)) {
      build.declarations["clip-path"] = `path("${source.d.replace(/["\\]/g, "\\$&")}")`;
    }
  }
  const rest = residualOf(source, consumed);
  if (rest) mergeResidual(residual, rest);
  if (Object.keys(residual).length > 0) {
    build.attributes["data-arg-x"] = encodeJsonAttribute(residual);
  }
  const { className, style } = styleAttributes(build, extraClasses, context.used);
  const tag = SVG_TYPES.has(type) ? "svg" : type === "text" ? "p" : "div";
  const attributes = {
    id,
    "data-arg-type": type,
    ...build.attributes,
    class: className,
    style,
  };
  if (tag === "svg") {
    const viewBox = build.attributes["data-arg-view-box"];
    const box = viewBox ? viewBox.split(/\s+/) : null;
    attributes.viewBox = box ? `0 0 ${box[0]} ${box[1]}` : `0 0 ${frame.width} ${frame.height}`;
    attributes.preserveAspectRatio = "none";
    attributes.xmlns = "http://www.w3.org/2000/svg";
  }
  return element(tag, attributes, children);
}
function serializeArtboard(artboard, used, children) {
  const consumed = new Set();
  if (typeof artboard.id === "string") consumed.add("id");
  const build = { declarations: { position: "absolute" }, attributes: {} };
  const residual = {};
  const frameConsumed = new Set();
  for (const [key, property] of [
    ["x", "left"],
    ["y", "top"],
    ["width", "width"],
    ["height", "height"],
  ]) {
    const length = css.toLength(artboard[key]);
    if (length === null) continue;
    build.declarations[property] = length;
    frameConsumed.add(key);
  }
  for (const key of frameConsumed) consumed.add(key);
  if (typeof artboard.rotation === "number" && Number.isFinite(artboard.rotation)) {
    // Artboard rotation is cosmetic frame chrome that never moves the objects
    // it contains, so it is carried inert rather than applied to the section.
    build.declarations["--arg-rotate"] = `${css.formatNumber(artboard.rotation)}deg`;
    consumed.add("rotation");
  }
  if (typeof artboard.name === "string") {
    build.attributes["data-arg-name"] = artboard.name;
    consumed.add("name");
  }
  const radius = css.toCornerRadius(artboard.cornerRadius);
  if (radius !== null) {
    build.declarations["border-radius"] = radius;
    consumed.add("cornerRadius");
  }
  if (artboard.clipContent === true) {
    build.declarations.overflow = "hidden";
    consumed.add("clipContent");
  }
  if (typeof artboard.notes === "string") {
    build.attributes["data-arg-notes"] = artboard.notes;
    consumed.add("notes");
  }
  if (artboard.skipped === true) {
    build.attributes["data-arg-skipped"] = "";
    consumed.add("skipped");
  }
  const exportSettings = asArray(artboard.exportSettings);
  if (exportSettings) {
    build.attributes["data-arg-export"] = encodeJsonAttribute(exportSettings);
    consumed.add("exportSettings");
  }
  if (laysOutChildren(artboard)) applyLayoutField(artboard, "layout", consumed, build, residual);
  applyLayerArrays(artboard, consumed, build, { fills: "css", strokes: "css" });
  const rest = residualOf(artboard, consumed);
  if (rest) mergeResidual(residual, rest);
  if (Object.keys(residual).length > 0) {
    build.attributes["data-arg-x"] = encodeJsonAttribute(residual);
  }
  const { className, style } = styleAttributes(build, [], used);
  return element(
    "section",
    {
      id: typeof artboard.id === "string" ? artboard.id : undefined,
      "data-arg-artboard": "",
      ...build.attributes,
      class: className,
      style,
    },
    children,
  );
}
function frameCenterInside(frame, artboard) {
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  return (
    cx >= artboard.x &&
    cx <= artboard.x + artboard.width &&
    cy >= artboard.y &&
    cy <= artboard.y + artboard.height
  );
}
const INLINE_TAGS = new Set(["p", "script", "style", "title", "svg"]);
function renderNode(node, indent) {
  if (node.type !== "element") return `${indent}${serializeHtml(node)}`;
  if (INLINE_TAGS.has(node.tag) || node.children.length === 0) {
    return `${indent}${serializeHtml(node)}`;
  }
  const open = serializeHtml({ ...node, children: [] });
  const openTag = open.slice(0, open.length - `</${node.tag}>`.length);
  const inner = node.children.map((child) => renderNode(child, `${indent}  `)).join("\n");
  return `${indent}${openTag}\n${inner}\n${indent}</${node.tag}>`;
}
/**
 * CSS generic families and keywords, which name no downloadable typeface.
 */
const NON_DOWNLOADABLE_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
  "emoji",
  "fangsong",
  "inherit",
  "initial",
  "unset",
  "revert",
]);
/**
 * Families a browser already has and Google does not serve. Deliberately short:
 * a family wrongly listed here loses its typeface, while one wrongly omitted
 * costs a stylesheet request that 404s silently — so the list only holds names
 * that are unambiguously desktop fonts.
 */
const SYSTEM_FAMILIES = new Set([
  "arial",
  "arial black",
  "arial narrow",
  "calibri",
  "cambria",
  "candara",
  "comic sans ms",
  "consolas",
  "constantia",
  "corbel",
  "courier",
  "courier new",
  "franklin gothic medium",
  "garamond",
  "georgia",
  "helvetica",
  "helvetica neue",
  "impact",
  "lucida console",
  "lucida sans unicode",
  "palatino",
  "palatino linotype",
  "segoe ui",
  "tahoma",
  "times",
  "times new roman",
  "trebuchet ms",
  "verdana",
]);
/**
 * The `<link>`s that make the document's typography survive being opened as a
 * page.
 *
 * A `.design` file is HTML, so its type has to render wherever HTML renders —
 * and the canvas gets its faces from the app's font loader, which is not
 * something the file carries. Without these every text object falls back to the
 * platform default the moment the file leaves the editor: in a browser tab, in
 * an `<iframe>` preview, in anything that is not our canvas.
 *
 * Two hrefs per family, mirroring what the app's runtime loader requests. The
 * axis-specific sheet is the one that delivers the weights and italics the
 * document actually uses, but Google rejects the WHOLE request with a 400 when
 * any listed combination doesn't exist — a single-weight family like Bebas Neue
 * asked for at 700 would otherwise load nothing at all. The bare request always
 * succeeds with the family's default faces, so the pair degrades instead of
 * failing. Both sheets name the same font files, and the browser downloads each
 * once.
 */
function webFontLinks(objects) {
  const axesByFamily = new Map();
  for (const object of Object.values(objects)) {
    if (object.type !== "text" || !isJsonObject(object.style)) continue;
    const raw = object.style.fontFamily;
    if (typeof raw !== "string") continue;
    // A stack is the author's own fallback chain; its first entry is the face
    // they actually asked for.
    const family = (raw.split(",")[0] ?? "").trim().replace(/^['"]|['"]$/g, "");
    if (!family || family.length > 64) continue;
    const key = family.toLowerCase();
    if (NON_DOWNLOADABLE_FAMILIES.has(key) || SYSTEM_FAMILIES.has(key)) continue;
    // Only typeface-shaped names, so a CSS variable or a stray identifier that
    // landed in `fontFamily` is not sent to a third party. A bare lowercase word
    // passes the shape test but reads as an identifier rather than a typeface,
    // and unlike the app's runtime loader — which probes and forgets — a link
    // emitted here is written into the file, so the name keeps being sent on
    // every later open. Mirrors `shouldBestEffortLoad` in the frontend's
    // `google-fonts.ts`, which turns the same requests away for the same reason.
    if (!/^[A-Za-z][A-Za-z0-9]*(?:[ -](?:[A-Za-z][A-Za-z0-9]*|[0-9]+))*$/.test(family)) continue;
    if (!/\s/.test(family) && !/^[A-Z]/.test(family)) continue;
    const weight =
      typeof object.style.fontWeight === "number" && Number.isFinite(object.style.fontWeight)
        ? Math.min(900, Math.max(100, Math.round(object.style.fontWeight / 100) * 100))
        : 400;
    const italic = object.style.fontStyle === "italic" ? 1 : 0;
    let axes = axesByFamily.get(family);
    if (!axes) {
      axes = new Set();
      axesByFamily.set(family, axes);
    }
    axes.add(`${italic},${weight}`);
  }
  const links = [];
  for (const family of [...axesByFamily.keys()].sort()) {
    const encoded = encodeURIComponent(family).replace(/%20/g, "+");
    const axes = [...axesByFamily.get(family)].sort((a, b) => {
      const [ai, aw] = a.split(",").map(Number);
      const [bi, bw] = b.split(",").map(Number);
      return ai - bi || aw - bw;
    });
    links.push(
      element("link", {
        rel: "stylesheet",
        href: `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@${axes.join(";")}&display=swap`,
      }),
      element("link", {
        rel: "stylesheet",
        href: `https://fonts.googleapis.com/css2?family=${encoded}&display=swap`,
      }),
    );
  }
  return links;
}
function buildDocumentTree(document, fallback) {
  const used = new Set();
  const objects = {};
  const rawObjects = isJsonObject(document.objects) ? document.objects : {};
  for (const [id, value] of Object.entries(rawObjects)) {
    if (isJsonObject(value)) objects[id] = value;
  }
  const artboards = objectArray(document.artboards) ?? [];
  const order = (asArray(document.order) ?? []).filter((entry) => typeof entry === "string");
  const context = {
    objects,
    used,
    emitted: new Set(),
    solvable: new Map(),
  };
  const artboardFrames = artboards.map((artboard) => readFrame(artboard));
  const artboardLaysOut = artboards.map((artboard) => laysOutChildren(artboard));
  const artboardChildren = artboards.map(() => []);
  const bodyChildren = [];
  order.forEach((id, index) => {
    const source = objects[id];
    if (!source) return;
    const frame = readFrame(source.frame);
    const owning = artboardFrames.findIndex((candidate) => frameCenterInside(frame, candidate));
    const origin = owning >= 0 ? artboardFrames[owning] : null;
    const node = serializeObject(
      id,
      source,
      origin,
      index + 1,
      context,
      owning >= 0 && artboardLaysOut[owning],
    );
    if (owning >= 0) artboardChildren[owning].push(node);
    else bodyChildren.push(node);
  });
  const sections = artboards.map((artboard, index) =>
    serializeArtboard(artboard, used, artboardChildren[index]),
  );
  // Objects reachable from neither `order` nor a group still have to survive, or
  // reopening the file would delete them.
  const detached = [];
  for (const [id, source] of Object.entries(objects)) {
    if (context.emitted.has(id)) continue;
    const node = serializeObject(id, source, null, null, context, false);
    node.attributes.push({ name: "data-arg-detached", value: "" });
    detached.push(node);
  }
  const consumed = new Set(["version", "artboards", "objects", "order"]);
  const bodyAttributes = {};
  const residual = {};
  const canvas = isJsonObject(document.canvas) ? document.canvas : {};
  const canvasConsumed = new Set();
  const bodyStyle = {};
  for (const key of ["width", "height"]) {
    const length = css.toLength(canvas[key]);
    if (length === null) continue;
    bodyStyle[key] = length;
    canvasConsumed.add(key);
  }
  const canvasRest = residualForNested(canvas, canvasConsumed);
  if (canvasRest) residual.canvas = canvasRest;
  consumed.add("canvas");
  const metadata = isJsonObject(document.metadata) ? document.metadata : undefined;
  if (metadata) {
    const metadataConsumed = new Set();
    if (typeof metadata.defaultView === "string") {
      bodyAttributes["data-arg-default-view"] = metadata.defaultView;
      metadataConsumed.add("defaultView");
    }
    const metadataSections = asArray(metadata.sections);
    if (metadataSections) {
      bodyAttributes["data-arg-sections"] = encodeJsonAttribute(metadataSections);
      metadataConsumed.add("sections");
    }
    const metadataRest = residualForNested(metadata, metadataConsumed);
    if (metadataRest) residual.metadata = metadataRest;
    consumed.add("metadata");
  }
  const shaders = isJsonObject(document.shaders) ? document.shaders : undefined;
  if (shaders) consumed.add("shaders");
  // `z-index` reconstructs the root order from the DOM, but only for ids that
  // actually reach the DOM as a root element. An id with no object behind it, or
  // one a group also claims, cannot — so those (invalid) documents keep the whole
  // array in the residual rather than silently reordering on save.
  const groupedIds = new Set();
  for (const value of Object.values(objects)) {
    if (value.type !== "group" || !Array.isArray(value.children)) continue;
    for (const child of value.children) if (typeof child === "string") groupedIds.add(child);
  }
  const rawOrder = asArray(document.order) ?? [];
  if (
    order.length !== rawOrder.length ||
    order.some((id) => objects[id] === undefined || groupedIds.has(id))
  ) {
    residual.order = cloneValue(rawOrder);
  }
  const documentRest = residualOf(document, consumed);
  if (documentRest) mergeResidual(residual, documentRest);
  if (Object.keys(residual).length > 0) {
    bodyAttributes["data-arg-x"] = encodeJsonAttribute(residual);
  }
  const scripts = [];
  if (shaders) {
    scripts.push(
      element("script", { type: "application/json", "data-arg-shaders": "" }, [
        text(encodeScriptJson(shaders)),
      ]),
    );
  }
  if (fallback) {
    scripts.push(
      element("script", { type: "application/json", "data-arg-fallback": "" }, [text(fallback)]),
    );
  }
  const bodyStyleText = css.formatStyleAttribute(bodyStyle);
  const firstArtboardName = artboards[0]?.name;
  const head = element("head", {}, [
    element("meta", { charset: "utf-8" }),
    element("meta", { name: "generator", content: "arg-design" }),
    element("meta", { name: "arg-design-version", content: DESIGN_HTML_VERSION }),
    element("title", {}, [
      text(typeof firstArtboardName === "string" ? firstArtboardName : "Design"),
    ]),
    ...webFontLinks(objects),
    element("style", {}, [text(buildUtilityStylesheet(used))]),
  ]);
  const body = element("body", { ...bodyAttributes, style: bodyStyleText || undefined }, [
    ...sections,
    ...bodyChildren,
    ...detached,
    ...scripts,
  ]);
  return {
    type: "document",
    children: [
      { type: "doctype", value: "doctype html" },
      element(
        "html",
        {
          lang: "en",
          "data-arg-design": DESIGN_HTML_VERSION,
          "data-arg-lossy": fallback ? "1" : undefined,
        },
        [head, body],
      ),
    ],
  };
}
function renderDocument(tree) {
  return `${tree.children.map((child) => renderNode(child, "")).join("\n")}\n`;
}
/**
 * Serialize a design document to HTML, self-verifying the result.
 *
 * The output is re-parsed and compared against the input; on any mismatch an
 * exact-JSON `data-arg-fallback` block is appended and `lossy` is set, so a save
 * can never lose data even when a CSS mapping is wrong or incomplete.
 */
export function serializeDesignHtmlChecked(document) {
  // A layout child's position is not written to the file at all, so both
  // directions have to derive it from the same solve for the comparison below
  // to be about the CSS mapping rather than about which side solved. This
  // identity-returns a document with no layout container, and only replaces the
  // objects whose frames move otherwise — the emitter reads its input and never
  // needs a defensive deep copy of a multi-megabyte document.
  //
  // Inside the `try` with the emitter: the solve is the one step here that walks
  // author-controlled span/track counts, so it is exactly as capable of throwing
  // as the emitter is, and the fallback below is the answer in both cases.
  let source = document;
  let firstPass;
  try {
    source = applyDesignLayout(document);
    firstPass = renderDocument(buildDocumentTree(source, null));
  } catch {
    // Nothing in the emitter is expected to throw, but a design file must never
    // fail to save; a pure-fallback document is still a readable design file.
    const fallbackOnly = renderDocument(
      buildDocumentTree(
        { version: 1, canvas: {}, artboards: [], objects: {}, order: [] },
        encodeScriptJson(source),
      ),
    );
    return { html: fallbackOnly, lossy: true, diff: ["<document>"] };
  }
  const diff = [];
  try {
    const reparsed = parseDesignHtml(firstPass);
    // Only pay for the path-collecting walk once something is already wrong.
    if (jsonEqual(reparsed, source)) return { html: firstPass, lossy: false, diff };
    collectDiff(reparsed, source, "", diff);
    if (diff.length === 0) diff.push("<document>");
  } catch {
    diff.push("<document>");
  }
  return {
    html: renderDocument(buildDocumentTree(source, encodeScriptJson(source))),
    lossy: true,
    diff,
  };
}
export function serializeDesignHtml(document, options) {
  const result = serializeDesignHtmlChecked(document);
  if (result.lossy) options?.onLossy?.(result.diff);
  return result.html;
}
// ---------- parsing ----------
/** The size a `.design` document gets when nothing in the file implies one. */
const DEFAULT_CANVAS_SIZE = 1080;
/**
 * The canvas is the artboards' bounding box, so hand-written markup does not
 * have to state it — and must not end up without one. `width`/`height` are
 * required by every consumer that frames the document (a missing one makes the
 * editor's fit-to-container compute a `NaN` zoom), and a document that already
 * carries artboards never reaches the frontend's back-compat path that would
 * otherwise recompute it.
 *
 * Mirrors the editor's own `withRecomputedCanvas`: the extent of the artboards,
 * clamped so a degenerate document still has a canvas with area.
 */
function fillInCanvasSize(canvas, artboards) {
  const missing = ["width", "height"].filter(
    (key) => typeof canvas[key] !== "number" || !Number.isFinite(canvas[key]),
  );
  if (missing.length === 0) return;
  let maxX = 0;
  let maxY = 0;
  for (const artboard of artboards) {
    const frame = readFrame(artboard);
    maxX = Math.max(maxX, frame.x + frame.width);
    maxY = Math.max(maxY, frame.y + frame.height);
  }
  const extent = { width: maxX, height: maxY };
  for (const key of missing) {
    canvas[key] = Math.max(artboards.length > 0 ? 1 : DEFAULT_CANVAS_SIZE, extent[key]);
  }
}
function blankDesignDocument() {
  return {
    version: 1,
    metadata: { defaultView: "design" },
    canvas: { width: 1080, height: 1080 },
    artboards: [
      {
        id: "artboard-1",
        name: "Artboard 1",
        x: 0,
        y: 0,
        width: 1080,
        height: 1080,
        fills: [{ type: "solid", color: "#ffffff" }],
      },
    ],
    objects: {},
    order: [],
  };
}
function elementDeclarations(node, styles) {
  const cached = styles.cache.get(node);
  if (cached) return cached;
  // The sheet is the bottom layer, under both a Tailwind utility class and the
  // inline style attribute, so a document the serializer wrote — whose own
  // `<style>` restates exactly what `fromTailwind` derives — resolves to what it
  // resolved to before the sheet was read at all.
  const declarations = styles.cascade.declarationsFor(
    node,
    fromTailwind(getAttribute(node, "class")),
    css.parseStyleAttribute(getAttribute(node, "style")),
  );
  styles.cache.set(node, declarations);
  return declarations;
}
function readLayerResidual(node, attribute) {
  const raw = decodeJsonAttribute(getAttribute(node, attribute));
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => (isJsonObject(entry) ? entry : null));
}
/** Merge a CSS-derived layer list with its index-aligned data overrides. */
function mergeLayers(derived, overrides) {
  const length = Math.max(derived.length, overrides.length);
  const layers = [];
  for (let index = 0; index < length; index += 1) {
    const override = overrides[index];
    if (override) {
      layers.push(cloneValue(override));
      continue;
    }
    const value = derived[index];
    if (value) layers.push(value);
  }
  return layers;
}
/**
 * One axis of a box the CSS may have placed from either edge.
 *
 * The serializer always writes `left`/`top`, but a hand-authored layer is as
 * likely to be pinned to the far edge or stretched between both — the two
 * spellings that state no near edge and, for the stretch, no size either. Both
 * need the containing block's extent, so an object with no containing frame
 * (one sitting directly in the body) resolves neither.
 */
function resolveAxis(near, far, size, origin) {
  if (near !== undefined) {
    const stretched = size === undefined && far !== undefined && origin;
    return {
      position: near + (origin ? origin.start : 0),
      size: stretched ? origin.extent - near - far : undefined,
    };
  }
  if (far === undefined || !origin) return {};
  return { position: origin.start + origin.extent - far - (size ?? 0) };
}
function parseFrame(declarations, origin, rotationAsVariable, laidOutByParent) {
  const frame = {};
  const width = css.fromLength(declarations.width);
  const height = css.fromLength(declarations.height);
  const horizontal = resolveAxis(
    css.fromLength(declarations.left),
    css.fromLength(declarations.right),
    width,
    origin && { start: origin.x, extent: origin.width },
  );
  const vertical = resolveAxis(
    css.fromLength(declarations.top),
    css.fromLength(declarations.bottom),
    height,
    origin && { start: origin.y, extent: origin.height },
  );
  // A layout container's child states no position, and the solve that closes
  // the parse writes only the frames it moves — a child that solves to exactly
  // (0, 0) would otherwise come back with no coordinates at all.
  const derived =
    laidOutByParent && horizontal.position === undefined && vertical.position === undefined;
  if (horizontal.position !== undefined) frame.x = horizontal.position;
  else if (derived) frame.x = 0;
  if (vertical.position !== undefined) frame.y = vertical.position;
  else if (derived) frame.y = 0;
  const resolvedWidth = width ?? horizontal.size;
  const resolvedHeight = height ?? vertical.size;
  if (resolvedWidth !== undefined) frame.width = resolvedWidth;
  if (resolvedHeight !== undefined) frame.height = resolvedHeight;
  const rotation = rotationAsVariable
    ? css.parseNumber(declarations["--arg-rotate"]?.replace(/deg$/, ""))
    : css.fromRotation(declarations.transform);
  if (rotation !== undefined) frame.rotation = rotation;
  return frame;
}
/**
 * Read a text object's fill stack back. `color` is a single solid fill unless
 * the marker says it is the legacy compatibility field; a glyph-clipped
 * background is the layer stack, and its `color: transparent` is derived.
 */
function parseTextFills(node, declarations) {
  if (declarations["background-image"] !== undefined) {
    return mergeLayers(
      css.fromBackgroundLayers(declarations),
      readLayerResidual(node, "data-arg-fills"),
    );
  }
  if (hasAttribute(node, "data-arg-text-color") || !declarations.color) return undefined;
  const color = css.fromCssColor(declarations.color);
  if (!color) return undefined;
  const fill = { type: "solid", color: color.color };
  if (color.opacity !== undefined) fill.opacity = color.opacity;
  return [fill];
}
function parseTextStroke(declarations) {
  const value = declarations["-webkit-text-stroke"];
  if (!value) return undefined;
  const match = /^(\S+px)\s+([\s\S]+)$/.exec(value.trim());
  if (!match) return undefined;
  const width = css.fromLength(match[1]);
  const color = css.fromCssColor(match[2]);
  if (width === undefined || !color) return undefined;
  const stroke = { color: color.color, width };
  if (color.opacity !== undefined) stroke.opacity = color.opacity;
  return stroke;
}
function parseObjectElement(node, origin, into, styles, laidOutByParent, allocateId) {
  const authoredId = getAttribute(node, "id");
  const id =
    authoredId && !Object.prototype.hasOwnProperty.call(into, authoredId)
      ? authoredId
      : allocateId();
  const type = getAttribute(node, "data-arg-type");
  if (!type) return null;
  // `into` is a plain object keyed by document-supplied ids, so a prototype key
  // would reassign its prototype instead of storing the object — the element
  // would vanish from the document with no error. Skipping it keeps the rest of
  // the document readable, which is what repair-forward means everywhere else.
  if (PROTOTYPE_KEYS.has(id)) return null;
  const declarations = elementDeclarations(node, styles);
  const isGroup = type === "group";
  const object = { id, type };
  const frame = parseFrame(declarations, origin, isGroup, laidOutByParent);
  if (Object.keys(frame).length > 0) object.frame = frame;
  const frameRect = readFrame(frame);
  const name = getAttribute(node, "data-arg-name");
  if (name !== undefined) object.name = name;
  const opacity = css.fromOpacity(declarations.opacity);
  if (opacity !== undefined) object.opacity = opacity;
  const blend = css.fromBlendMode(declarations["mix-blend-mode"]);
  if (blend !== undefined) object.blendMode = blend;
  if (declarations.display === "none") object.visible = false;
  if (hasAttribute(node, "data-arg-locked")) object.locked = true;
  const flip = getAttribute(node, "data-arg-flip");
  if (flip?.includes("h")) object.flipH = true;
  if (flip?.includes("v")) object.flipV = true;
  const layoutItem = css.fromLayoutItem(declarations);
  if (layoutItem) object.layoutItem = layoutItem;
  // The same paint-mode table the serializer used, so the two cannot disagree
  // about whether `data-arg-fills` holds index-aligned overrides or a whole array.
  const paint = paintModeFor(type);
  const wholeArray = (attribute) => {
    const value = decodeJsonAttribute(getAttribute(node, attribute));
    return Array.isArray(value) ? value.filter(isJsonObject) : undefined;
  };
  if (paint.fills === "data") {
    const fills = wholeArray("data-arg-fills");
    if (fills) object.fills = fills;
  } else if (paint.fills === "text") {
    const fills = parseTextFills(node, declarations);
    if (fills) object.fills = fills;
  } else {
    const fills = mergeLayers(
      css.fromBackgroundLayers(declarations),
      readLayerResidual(node, "data-arg-fills"),
    );
    if (fills.length > 0 || declarations["background-image"] !== undefined) object.fills = fills;
  }
  if (paint.strokes === "css") {
    const strokes = mergeLayers(
      css.fromBoxShadow(declarations),
      readLayerResidual(node, "data-arg-strokes"),
    );
    if (strokes.length > 0 || declarations["box-shadow"] !== undefined) object.strokes = strokes;
  } else {
    const strokes = wholeArray("data-arg-strokes");
    if (strokes) object.strokes = strokes;
    else if (paint.strokes === "glyph") {
      const outline = parseTextStroke(declarations);
      if (outline) object.strokes = [outline];
    }
  }
  const effects = mergeLayers(
    css.fromFilter(declarations),
    readLayerResidual(node, "data-arg-effects"),
  );
  if (effects.length > 0 || declarations.filter !== undefined) object.effects = effects;
  if (type === "rect" || isGroup) {
    const radius = css.fromCornerRadius(declarations["border-radius"]);
    if (radius !== undefined) object.cornerRadius = radius;
  }
  if (isGroup) {
    if (declarations.overflow === "hidden") object.clipChildren = true;
    // Only a group carries a container layout, and reading `display` on
    // anything else would invent one everywhere: the emitted stylesheet lays
    // every text object out as `display:flex;flex-direction:column` to stack
    // its lines, which is typography rather than a layout the model owns.
    const layout = css.fromLayout(declarations);
    if (layout) object.layout = layout;
    const children = [];
    for (const child of childElements(node)) {
      const childId = parseObjectElement(
        child,
        frameRect,
        into,
        styles,
        layout !== undefined,
        allocateId,
      );
      if (childId) children.push(childId);
    }
    object.children = children;
  }
  if (type === "text") {
    const whiteSpace = declarations["white-space"];
    if (whiteSpace === "pre") object.textMode = "point";
    else if (whiteSpace === "pre-wrap") object.textMode = "area";
    const style = css.fromTextStyle(declarations);
    if (Object.keys(style).length > 0) object.style = style;
    // Only a marked `color` is the legacy field; an unmarked one is glyph paint
    // the fill stack already accounted for.
    if (hasAttribute(node, "data-arg-text-color") && declarations.color) {
      object.color = declarations.color;
    }
    object.text = textContent(node);
  }
  if (type === "polygon") {
    const sides = css.parseNumber(getAttribute(node, "data-arg-sides"));
    if (sides !== undefined) object.sides = sides;
  }
  if (type === "star") {
    const points = css.parseNumber(getAttribute(node, "data-arg-points"));
    if (points !== undefined) object.points = points;
    const innerRatio = css.parseNumber(getAttribute(node, "data-arg-inner-ratio"));
    if (innerRatio !== undefined) object.innerRatio = innerRatio;
  }
  if (type === "line") {
    for (const key of ["x1", "y1", "x2", "y2"]) {
      const value = css.parseNumber(getAttribute(node, `data-arg-${key}`));
      if (value !== undefined) object[key] = value;
    }
    const markerStart = getAttribute(node, "data-arg-marker-start");
    if (markerStart !== undefined) object.markerStart = markerStart;
    const markerEnd = getAttribute(node, "data-arg-marker-end");
    if (markerEnd !== undefined) object.markerEnd = markerEnd;
  }
  if (type === "path") {
    const geometry = childElements(node).find((child) => child.tag === "path");
    if (geometry) {
      const d = getAttribute(geometry, "d");
      if (d !== undefined) object.d = d;
      const fillRule = getAttribute(geometry, "fill-rule");
      if (fillRule === "evenodd" || fillRule === "nonzero") object.fillRule = fillRule;
    }
    if (hasAttribute(node, "data-arg-closed")) object.closed = true;
    const anchors = decodeJsonAttribute(getAttribute(node, "data-arg-anchors"));
    if (Array.isArray(anchors)) object.anchors = anchors;
    const viewBox = getAttribute(node, "data-arg-view-box");
    if (viewBox) {
      const [width, height] = viewBox.split(/\s+/).map((part) => css.parseNumber(part));
      if (width !== undefined && height !== undefined) object.viewBox = { width, height };
    }
  }
  mergeResidual(object, decodeJsonAttribute(getAttribute(node, "data-arg-x")));
  into[id] = object;
  return id;
}
function parseArtboardElement(node, styles) {
  const declarations = elementDeclarations(node, styles);
  const artboard = {};
  const artboardId = getAttribute(node, "id");
  if (artboardId !== undefined) artboard.id = artboardId;
  for (const [key, property] of [
    ["x", "left"],
    ["y", "top"],
    ["width", "width"],
    ["height", "height"],
  ]) {
    const value = css.fromLength(declarations[property]);
    if (value !== undefined) artboard[key] = value;
  }
  const rotation = css.parseNumber(declarations["--arg-rotate"]?.replace(/deg$/, ""));
  if (rotation !== undefined) artboard.rotation = rotation;
  const name = getAttribute(node, "data-arg-name");
  if (name !== undefined) artboard.name = name;
  const radius = css.fromCornerRadius(declarations["border-radius"]);
  if (radius !== undefined) artboard.cornerRadius = radius;
  if (declarations.overflow === "hidden") artboard.clipContent = true;
  const layout = css.fromLayout(declarations);
  if (layout) artboard.layout = layout;
  const notes = getAttribute(node, "data-arg-notes");
  if (notes !== undefined) artboard.notes = notes;
  if (hasAttribute(node, "data-arg-skipped")) artboard.skipped = true;
  const exportSettings = decodeJsonAttribute(getAttribute(node, "data-arg-export"));
  if (Array.isArray(exportSettings)) artboard.exportSettings = exportSettings;
  const fills = mergeLayers(
    css.fromBackgroundLayers(declarations),
    readLayerResidual(node, "data-arg-fills"),
  );
  if (fills.length > 0 || declarations["background-image"] !== undefined) artboard.fills = fills;
  const strokes = mergeLayers(
    css.fromBoxShadow(declarations),
    readLayerResidual(node, "data-arg-strokes"),
  );
  if (strokes.length > 0 || declarations["box-shadow"] !== undefined) artboard.strokes = strokes;
  const effects = mergeLayers(
    css.fromFilter(declarations),
    readLayerResidual(node, "data-arg-effects"),
  );
  if (effects.length > 0 || declarations.filter !== undefined) artboard.effects = effects;
  mergeResidual(artboard, decodeJsonAttribute(getAttribute(node, "data-arg-x")));
  return artboard;
}
function scriptJson(body, attribute) {
  const found = findElementDeep(
    body,
    (node) => node.tag === "script" && hasAttribute(node, attribute),
  );
  if (!found) return undefined;
  try {
    return JSON.parse(textContent(found));
  } catch {
    return undefined;
  }
}
function findElementDeep(node, predicate) {
  for (const child of childElements(node)) {
    if (predicate(child)) return child;
    const nested = findElementDeep(child, predicate);
    if (nested) return nested;
  }
  return undefined;
}
/** Cheap sniff distinguishing HTML design bytes from legacy `.design` JSON. */
export function isDesignHtml(source) {
  const head = source.slice(0, 4096);
  if (!head.trim()) return false;
  return (
    /data-arg-design\s*=/.test(head) ||
    (/^\s*<!\s*doctype\s+html/i.test(head) && /<html/i.test(head))
  );
}
/**
 * Parse an HTML design document. Repair-forward and never throws: unknown
 * elements are skipped, malformed values fall back to defaults, and empty or
 * unrecognisable input yields a blank document.
 *
 * The DOM is preferred. The `data-arg-fallback` block is only consulted when
 * the serializer marked the document lossy or the DOM yielded no artboards —
 * it exists precisely because the DOM could not carry the whole document.
 */
export function parseDesignHtml(source) {
  try {
    // The counterpart of the solve the serializer runs: a layout child's markup
    // carries its size but no position, so the frame every consumer reads is
    // derived here rather than transported through CSS. Idempotent, so a
    // `data-arg-fallback` document that was already solved is unchanged.
    return applyDesignLayout(parseDesignHtmlInner(source));
  } catch {
    return blankDesignDocument();
  }
}
function parseDesignHtmlInner(source) {
  if (!source.trim()) return blankDesignDocument();
  const tree = parseHtml(source);
  const html = findByTag(tree, "html");
  const body = html ? findByTag(html, "body") : findByTag(tree, "body");
  if (!body) return blankDesignDocument();
  const lossy = html ? hasAttribute(html, "data-arg-lossy") : false;
  const fallback = scriptJson(body, "data-arg-fallback");
  const useFallback = lossy && isJsonObject(fallback);
  if (useFallback) return fallback;
  // Once per document, from the whole tree: a `<style>` may sit in either the
  // head or the body, and a descendant selector has to see the ancestors of the
  // elements it is matched against.
  const styles = { cascade: buildCssCascade(tree), cache: new WeakMap() };
  const objects = {};
  const artboards = [];
  const usedArtboardIds = new Set();
  const ordered = [];
  let counter = 0;
  const reservedIds = new Set();
  const reserveAuthoredIds = (node) => {
    for (const child of childElements(node)) {
      const id = getAttribute(child, "id");
      if (id) reservedIds.add(id);
      reserveAuthoredIds(child);
    }
  };
  reserveAuthoredIds(body);
  let generatedObjectId = 0;
  const allocateObjectId = () => {
    let id;
    do {
      generatedObjectId += 1;
      id = `html_object_${generatedObjectId}`;
    } while (reservedIds.has(id) || Object.prototype.hasOwnProperty.call(objects, id));
    return id;
  };
  const collect = (node, origin, laysOut) => {
    for (const child of childElements(node)) {
      if (!hasAttribute(child, "data-arg-type")) continue;
      const id = parseObjectElement(child, origin, objects, styles, laysOut, allocateObjectId);
      if (!id) continue;
      counter += 1;
      if (hasAttribute(child, "data-arg-detached")) continue;
      const z = css.parseNumber(elementDeclarations(child, styles)["z-index"]);
      ordered.push({ id, z: z ?? Number.MAX_SAFE_INTEGER, index: counter });
    }
  };
  for (const child of childElements(body)) {
    if (hasAttribute(child, "data-arg-artboard")) {
      const artboard = parseArtboardElement(child, styles);
      if (typeof artboard.id !== "string" || !artboard.id || usedArtboardIds.has(artboard.id)) {
        let index = artboards.length + 1;
        while (
          reservedIds.has(`html_artboard_${index}`) ||
          usedArtboardIds.has(`html_artboard_${index}`)
        ) {
          index += 1;
        }
        artboard.id = `html_artboard_${index}`;
      }
      usedArtboardIds.add(artboard.id);
      artboards.push(artboard);
      collect(child, readFrame(artboard), artboard.layout !== undefined);
      continue;
    }
    if (hasAttribute(child, "data-arg-type")) {
      const id = parseObjectElement(child, null, objects, styles, false, allocateObjectId);
      if (!id) continue;
      counter += 1;
      if (hasAttribute(child, "data-arg-detached")) continue;
      const z = css.parseNumber(elementDeclarations(child, styles)["z-index"]);
      ordered.push({ id, z: z ?? Number.MAX_SAFE_INTEGER, index: counter });
    }
  }
  // `z-index` IS the document's stacking order, so the root order is read back
  // from it; DOM order only breaks ties.
  ordered.sort((a, b) => a.z - b.z || a.index - b.index);
  const childIds = new Set();
  for (const value of Object.values(objects)) {
    if (value.type !== "group" || !Array.isArray(value.children)) continue;
    for (const child of value.children) if (typeof child === "string") childIds.add(child);
  }
  const order = ordered.filter((entry) => !childIds.has(entry.id)).map((entry) => entry.id);
  const bodyStyle = css.parseStyleAttribute(getAttribute(body, "style"));
  const canvas = {};
  const canvasWidth = css.fromLength(bodyStyle.width);
  const canvasHeight = css.fromLength(bodyStyle.height);
  if (canvasWidth !== undefined) canvas.width = canvasWidth;
  if (canvasHeight !== undefined) canvas.height = canvasHeight;
  const document = { version: 1, canvas, artboards, objects, order };
  const defaultView = getAttribute(body, "data-arg-default-view");
  const sections = decodeJsonAttribute(getAttribute(body, "data-arg-sections"));
  if (defaultView !== undefined || Array.isArray(sections)) {
    const metadata = {};
    if (defaultView !== undefined) metadata.defaultView = defaultView;
    if (Array.isArray(sections)) metadata.sections = sections;
    document.metadata = metadata;
  }
  const shaders = scriptJson(body, "data-arg-shaders");
  if (isJsonObject(shaders)) document.shaders = shaders;
  mergeResidual(document, decodeJsonAttribute(getAttribute(body, "data-arg-x")));
  // After the residual, which is the authoritative source for a canvas size CSS
  // could not carry.
  if (isJsonObject(document.canvas)) fillInCanvasSize(document.canvas, artboards);
  if (artboards.length === 0 && isJsonObject(fallback)) return fallback;
  return document;
}
