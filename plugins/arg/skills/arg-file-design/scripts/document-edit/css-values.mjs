// Generated from sdk/typescript/src/documents/css-values.ts. Do not edit directly.
/**
 * Bidirectional codecs between `.design` model values and CSS strings.
 *
 * Every codec comes in a `to*` / `from*` pair and round-trips exactly: a value
 * that `to*` encodes is one `from*` reproduces byte-identically. Anything that
 * cannot be encoded exactly reports itself as unencodable rather than encoding
 * approximately, so `design-html.ts` can route it to a typed data attribute and
 * the document stays lossless.
 *
 * Pure and dependency-free — no DOM, no CSSOM. Style attributes are parsed by
 * hand precisely so values survive verbatim; handing them to a CSSOM would
 * re-serialize `#FFF` as `rgb(255, 255, 255)` and lose the author's spelling.
 */
import { isJsonObject } from "./common.mjs";
// ---------- numbers ----------
/** Shortest round-trippable spelling of a finite number, or null. */
export function formatNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
}
export function parseNumber(value) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}
/**
 * A 0..1 fraction as a CSS percentage, but only when the multiplication is
 * exactly reversible — `0.333 * 100 / 100` is not `0.333`, and a gradient stop
 * that drifts by one ulp on every save is a slow corruption.
 */
export function toExactPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const scaled = value * 100;
  return scaled / 100 === value ? String(scaled) : null;
}
export function fromExactPercent(value) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed.endsWith("%")) return undefined;
  const parsed = parseNumber(trimmed.slice(0, -1));
  return parsed === undefined ? undefined : parsed / 100;
}
// ---------- lengths, opacity, rotation ----------
export function toLength(value) {
  const formatted = formatNumber(value);
  return formatted === null ? null : `${formatted}px`;
}
export function fromLength(value) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  // CSS lets a zero length drop its unit, and `padding: 12px 0` / `box-shadow: 0
  // 2px …` are how a hand-written or agent-written file usually spells one.
  if (trimmed === "0") return 0;
  if (!trimmed.endsWith("px")) return undefined;
  return parseNumber(trimmed.slice(0, -2));
}
export function toOpacity(value) {
  return formatNumber(value);
}
export function fromOpacity(value) {
  return parseNumber(value);
}
/** Frame rotation in degrees as a `transform` value. */
export function toRotation(degrees) {
  const formatted = formatNumber(degrees);
  return formatted === null ? null : `rotate(${formatted}deg)`;
}
export function fromRotation(value) {
  if (value === undefined) return undefined;
  const match = /^rotate\(\s*(-?[\d.eE+-]+)deg\s*\)$/.exec(value.trim());
  return match ? parseNumber(match[1]) : undefined;
}
// ---------- colors ----------
/**
 * Colors are stored verbatim so `#FFF`, `red` and `rgb(1 2 3)` all survive a
 * save unchanged. The only requirement is that the string cannot break out of
 * the CSS value it is interpolated into.
 */
export function isCssSafeColor(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed !== value) return false;
  if (/[;{}"'\\]/.test(trimmed) || trimmed.includes("/*")) return false;
  let depth = 0;
  for (const char of trimmed) {
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}
/**
 * A color plus an optional layer opacity, as one CSS color value. Opacity rides
 * a `color-mix` against `transparent` because a background layer has no
 * per-layer opacity property, and folding alpha into the color itself would
 * destroy the author's spelling of it.
 */
export function toCssColor(color, opacity) {
  if (!isCssSafeColor(color)) return null;
  if (opacity === undefined) return color;
  const percent = toExactPercent(opacity);
  return percent === null ? null : `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
export function fromCssColor(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match =
    /^color-mix\(\s*in srgb\s*,\s*([\s\S]+)\s+(-?[\d.eE+-]+)%\s*,\s*transparent\s*\)$/.exec(
      trimmed,
    );
  if (!match) return { color: trimmed };
  const color = match[1].trim();
  const opacity = parseNumber(match[2]);
  if (!color || opacity === undefined) return null;
  return { color, opacity: opacity / 100 };
}
// ---------- style attribute ----------
const CHAR_QUOTE_DOUBLE = 34;
const CHAR_QUOTE_SINGLE = 39;
const CHAR_PAREN_OPEN = 40;
const CHAR_PAREN_CLOSE = 41;
const CHAR_BACKSLASH = 92;
/** Anything that can nest or quote, and so defeat a plain `String.split`. */
const NESTING_CHARS = /[("']/;
function isWhitespaceCode(code) {
  return code === 32 || code === 9 || code === 10 || code === 13 || code === 12;
}
/** `value.slice(start, end).trim()` in one copy instead of two. */
function sliceTrimmed(value, start, end) {
  let from = start;
  let to = end;
  while (from < to && isWhitespaceCode(value.charCodeAt(from))) from += 1;
  while (to > from && isWhitespaceCode(value.charCodeAt(to - 1))) to -= 1;
  return from === 0 && to === value.length ? value : value.slice(from, to);
}
/**
 * Walk `value` reporting each separator at paren/quote depth zero.
 *
 * A single `data:` image fill is one ~165 KB declaration, and this scanner runs
 * over it several times per node, so it must not build its output a character
 * at a time — accumulating with `+=` made this and the garbage it produced 77%
 * of a save. Indices only; callers slice once at the end.
 */
/**
 * Index of the quote closing the one at `open`, honouring backslash escapes.
 *
 * Jumping the span with `indexOf` rather than walking it is what keeps a `data:`
 * URL cheap: the whole 165 KB of an image fill sits inside one pair of quotes,
 * so the scanner never has to look at those bytes one at a time.
 */
function closingQuote(value, open) {
  const quote = value[open];
  let from = open + 1;
  for (;;) {
    const at = value.indexOf(quote, from);
    if (at < 0) return value.length;
    let backslashes = 0;
    for (
      let probe = at - 1;
      probe > open && value.charCodeAt(probe) === CHAR_BACKSLASH;
      probe -= 1
    ) {
      backslashes += 1;
    }
    if (backslashes % 2 === 0) return at;
    from = at + 1;
  }
}
function scanTopLevel(value, separator, onSeparator) {
  const target = separator.charCodeAt(0);
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === CHAR_QUOTE_DOUBLE || code === CHAR_QUOTE_SINGLE) {
      index = closingQuote(value, index);
      continue;
    }
    if (code === CHAR_PAREN_OPEN) depth += 1;
    else if (code === CHAR_PAREN_CLOSE) {
      if (depth > 0) depth -= 1;
    } else if (code === target && depth === 0 && !onSeparator(index)) return;
  }
}
/** Split on a separator at paren/quote depth zero. */
export function splitTopLevel(value, separator) {
  if (!NESTING_CHARS.test(value)) return value.split(separator);
  const parts = [];
  let start = 0;
  scanTopLevel(value, separator, (index) => {
    parts.push(value.slice(start, index));
    start = index + 1;
    return true;
  });
  parts.push(value.slice(start));
  return parts;
}
/** The same split with each part trimmed, without a second copy per part. */
function splitTopLevelTrimmed(value, separator) {
  if (!NESTING_CHARS.test(value)) return value.split(separator).map((part) => part.trim());
  const parts = [];
  let start = 0;
  scanTopLevel(value, separator, (index) => {
    parts.push(sliceTrimmed(value, start, index));
    start = index + 1;
    return true;
  });
  parts.push(sliceTrimmed(value, start, value.length));
  return parts;
}
/** Index of the first separator at depth zero, or -1. Stops as soon as it finds one. */
function indexOfTopLevel(value, separator) {
  let found = -1;
  scanTopLevel(value, separator, (index) => {
    found = index;
    return false;
  });
  return found;
}
export function parseStyleAttribute(value) {
  const declarations = {};
  if (!value) return declarations;
  let start = 0;
  const declaration = (from, to) => {
    // Find the property/value colon by index: splitting the whole declaration
    // would walk the entire 165 KB value to reach a colon at offset ~16.
    const chunk = value.slice(from, to);
    const colon = indexOfTopLevel(chunk, ":");
    if (colon < 0) return;
    const property = sliceTrimmed(chunk, 0, colon).toLowerCase();
    if (!property) return;
    declarations[property] = sliceTrimmed(chunk, colon + 1, chunk.length);
  };
  scanTopLevel(value, ";", (index) => {
    declaration(start, index);
    start = index + 1;
    return true;
  });
  declaration(start, value.length);
  return declarations;
}
export function formatStyleAttribute(declarations) {
  const parts = [];
  for (const property in declarations) parts.push(`${property}:${declarations[property]}`);
  return parts.join(";");
}
// ---------- corner radius ----------
export function toCornerRadius(value) {
  if (typeof value === "number") return toLength(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const corner = value;
  if (Object.keys(corner).length !== 4) return null;
  const parts = [];
  // CSS orders border-radius top-left, top-right, bottom-right, bottom-left.
  for (const key of ["tl", "tr", "br", "bl"]) {
    const length = toLength(corner[key]);
    if (length === null) return null;
    parts.push(length);
  }
  return parts.join(" ");
}
export function fromCornerRadius(value) {
  if (value === undefined) return undefined;
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return fromLength(parts[0]);
  if (parts.length !== 4) return undefined;
  const [tl, tr, br, bl] = parts.map((part) => fromLength(part));
  if (tl === undefined || tr === undefined || br === undefined || bl === undefined)
    return undefined;
  return { tl, tr, br, bl };
}
// ---------- blend mode ----------
export const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
];
const BLEND_MODE_SET = new Set(BLEND_MODES);
export function toBlendMode(value) {
  return typeof value === "string" && BLEND_MODE_SET.has(value) ? value : null;
}
export function fromBlendMode(value) {
  const trimmed = value?.trim();
  return trimmed && BLEND_MODE_SET.has(trimmed) ? trimmed : undefined;
}
// ---------- text style ----------
/** Model keys of `TextStyle` this codec maps onto CSS. */
export const TEXT_STYLE_KEYS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "textDecoration",
  "letterSpacing",
  "lineHeight",
  "align",
  "verticalAlign",
];
const VERTICAL_ALIGN_TO_JUSTIFY = {
  top: "flex-start",
  middle: "center",
  bottom: "flex-end",
};
const JUSTIFY_TO_VERTICAL_ALIGN = {
  "flex-start": "top",
  center: "middle",
  "flex-end": "bottom",
};
/** The writing modes the model carries. `sideways-*` is excluded: it has no
 *  SVG equivalent, so accepting it would render one way on the canvas and
 *  another on export. */
const WRITING_MODES = new Set(["horizontal-tb", "vertical-rl", "vertical-lr"]);
const TEXT_ALIGNS = new Set(["left", "center", "right", "justify"]);
/**
 * Encode a text style. Returns the CSS declarations plus the style keys that
 * were consumed, so the caller can carry the rest as residual.
 */
/**
 * A family name as a `font-family` value a browser will actually accept.
 *
 * Unquoted, the value is a sequence of CSS identifiers, and an identifier
 * cannot start with a digit — so `Exo 2`, `Source Sans 3` and `Source Serif 4`
 * are invalid unquoted and a browser drops the whole declaration, falling the
 * text back to the platform default with no error anywhere. Single quotes
 * rather than double: the value is interpolated into a `style` attribute the
 * HTML serializer escapes, and a double quote costs a `&quot;` entity on the
 * way out and back for no benefit. A name containing a quote or a backslash
 * never reaches here — {@link toTextStyle} rejects it before this is called.
 */
export function quoteFontFamily(family) {
  // A comma means the author wrote a stack, not a family. Quoting one would
  // turn a fallback list into a single nonexistent family name, so it travels
  // exactly as written and stays the author's business.
  if (family.includes(",")) return family;
  return /^[A-Za-z_-][A-Za-z0-9_-]*(?: [A-Za-z_-][A-Za-z0-9_-]*)*$/.test(family)
    ? family
    : `'${family}'`;
}
/**
 * The family name inside a `font-family` value, quoted or not.
 *
 * Only a value that IS one quoted string is unwrapped. A stack whose first and
 * last entries happen to both be quoted — `"Helvetica Neue", "Arial"`, which is
 * what a design tool or a Google Fonts snippet writes — starts and ends with a
 * quote without being one, and slicing its ends yields a single family nobody
 * can spell back out. Nothing we serialize can produce that ({@link
 * quoteFontFamily} leaves a stack alone and {@link toTextStyle} rejects a family
 * containing a quote), but a hand-authored `<style>` block reaches here through
 * the cascade, and once the corrupt name is in the model the next save cannot
 * emit it as CSS at all — the typeface drops to residual and the browser paints
 * its default.
 */
export function unquoteFontFamily(value) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const quote = trimmed[0];
  if (quote !== "'" && quote !== '"') return trimmed;
  const close = trimmed.indexOf(quote, 1);
  return close === trimmed.length - 1 ? trimmed.slice(1, -1) : trimmed;
}
export function toTextStyle(style) {
  const declarations = {};
  const consumed = new Set();
  const family = style.fontFamily;
  // A font stack is interpolated into a declaration, so it must not be able to
  // terminate one. The empty string is excluded because `font-family:` with no
  // value reads back as absent, not as `""`.
  if (
    typeof family === "string" &&
    family &&
    family.trim() === family &&
    !/[;{}"'\\]/.test(family)
  ) {
    declarations["font-family"] = quoteFontFamily(family);
    consumed.add("fontFamily");
  }
  const size = toLength(style.fontSize);
  if (size !== null) {
    declarations["font-size"] = size;
    consumed.add("fontSize");
  }
  const weight = formatNumber(style.fontWeight);
  if (weight !== null) {
    declarations["font-weight"] = weight;
    consumed.add("fontWeight");
  }
  if (style.fontStyle === "italic" || style.fontStyle === "normal") {
    declarations["font-style"] = style.fontStyle;
    consumed.add("fontStyle");
  }
  if (
    style.textDecoration === "none" ||
    style.textDecoration === "underline" ||
    style.textDecoration === "line-through"
  ) {
    declarations["text-decoration-line"] = style.textDecoration;
    consumed.add("textDecoration");
  }
  const letterSpacing = toLength(style.letterSpacing);
  if (letterSpacing !== null) {
    declarations["letter-spacing"] = letterSpacing;
    consumed.add("letterSpacing");
  }
  const lineHeight = formatNumber(style.lineHeight);
  if (lineHeight !== null) {
    declarations["line-height"] = lineHeight;
    consumed.add("lineHeight");
  }
  if (typeof style.align === "string" && TEXT_ALIGNS.has(style.align)) {
    declarations["text-align"] = style.align;
    consumed.add("align");
  }
  const justify =
    typeof style.verticalAlign === "string"
      ? VERTICAL_ALIGN_TO_JUSTIFY[style.verticalAlign]
      : undefined;
  if (justify) {
    declarations["justify-content"] = justify;
    consumed.add("verticalAlign");
  }
  // Stored as the CSS keyword, so this is a copy rather than a translation.
  if (typeof style.writingMode === "string" && WRITING_MODES.has(style.writingMode)) {
    declarations["writing-mode"] = style.writingMode;
    consumed.add("writingMode");
  }
  return { declarations, consumed };
}
export function fromTextStyle(declarations) {
  const style = {};
  const family = unquoteFontFamily(declarations["font-family"]);
  if (family) style.fontFamily = family;
  const size = fromLength(declarations["font-size"]);
  if (size !== undefined) style.fontSize = size;
  const weight = parseNumber(declarations["font-weight"]);
  if (weight !== undefined) style.fontWeight = weight;
  const fontStyle = declarations["font-style"];
  if (fontStyle === "italic" || fontStyle === "normal") style.fontStyle = fontStyle;
  const decoration = declarations["text-decoration-line"];
  if (decoration === "none" || decoration === "underline" || decoration === "line-through") {
    style.textDecoration = decoration;
  }
  const letterSpacing = fromLength(declarations["letter-spacing"]);
  if (letterSpacing !== undefined) style.letterSpacing = letterSpacing;
  const lineHeight = parseNumber(declarations["line-height"]);
  if (lineHeight !== undefined) style.lineHeight = lineHeight;
  const align = declarations["text-align"];
  if (align && TEXT_ALIGNS.has(align)) style.align = align;
  const justify = declarations["justify-content"];
  const verticalAlign = justify ? JUSTIFY_TO_VERTICAL_ALIGN[justify] : undefined;
  if (verticalAlign) style.verticalAlign = verticalAlign;
  const writingMode = declarations["writing-mode"];
  if (writingMode && WRITING_MODES.has(writingMode)) style.writingMode = writingMode;
  return style;
}
// ---------- layout ----------
/**
 * A layout container and its items encode to real CSS — `display:flex` and
 * friends — rather than to a private re-encoding, because the point of the
 * format being HTML is that a browser lays the file out the same way the
 * solver does. Only the fields that differ from their documented default are
 * written, so an object with a plain default-valued layout still serializes
 * byte-identically to one with none.
 */
const LAYOUT_JUSTIFY_VALUES = new Set([
  "start",
  "center",
  "end",
  "space-between",
  "space-around",
  "space-evenly",
]);
const LAYOUT_ALIGN_VALUES = new Set(["start", "center", "end", "stretch"]);
/** CSS spells the two edge keywords `flex-start`/`flex-end` in a flex container. */
function toAlignmentKeyword(value, flex) {
  if (!flex) return value;
  if (value === "start") return "flex-start";
  if (value === "end") return "flex-end";
  return value;
}
function fromAlignmentKeyword(value, allowed) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const model = trimmed === "flex-start" ? "start" : trimmed === "flex-end" ? "end" : trimmed;
  return allowed.has(model) ? model : undefined;
}
/** A track list survives verbatim only when no entry can be mistaken for two. */
function isEncodableTrack(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed !== value) return false;
  if (/[;{}"'\\]/.test(trimmed) || trimmed.includes("/*")) return false;
  return splitTopLevel(trimmed, " ").length === 1;
}
function toTrackList(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value.every(isEncodableTrack) ? value.join(" ") : null;
}
function fromTrackList(value) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const tracks = splitTopLevel(trimmed, " ")
    .map((part) => part.trim())
    .filter(Boolean);
  return tracks.length > 0 ? tracks : undefined;
}
const BOX_SIDES = ["top", "right", "bottom", "left"];
function toPaddingShorthand(value) {
  if (!isObject(value)) return null;
  const lengths = [];
  for (const side of BOX_SIDES) {
    const length = toLength(value[side] ?? 0);
    if (length === null) return null;
    lengths.push(length);
  }
  const [top, right, bottom, left] = lengths;
  if (top === right && right === bottom && bottom === left) return top === "0px" ? null : top;
  if (top === bottom && right === left) return `${top} ${right}`;
  if (right === left) return `${top} ${right} ${bottom}`;
  return `${top} ${right} ${bottom} ${left}`;
}
function fromPaddingShorthand(value) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parts = splitTopLevelTrimmed(trimmed, " ")
    .filter(Boolean)
    .map((part) => fromLength(part));
  if (parts.some((part) => part === undefined) || parts.length === 0 || parts.length > 4) {
    return undefined;
  }
  const [a, b, c, d] = parts;
  const top = a;
  const right = parts.length > 1 ? b : a;
  const bottom = parts.length > 2 ? c : top;
  const left = parts.length > 3 ? d : right;
  return { top, right, bottom, left };
}
/** The four resolved paddings, or undefined when every side is the zero default. */
function fromPadding(declarations) {
  const shorthand = fromPaddingShorthand(declarations.padding);
  const padding = { top: 0, right: 0, bottom: 0, left: 0 };
  let styled = false;
  for (const side of BOX_SIDES) {
    // A longhand outranks the shorthand, as the cascade would resolve them.
    const length = fromLength(declarations[`padding-${side}`]) ?? shorthand?.[side];
    if (length === undefined) continue;
    padding[side] = length;
    if (length !== 0) styled = true;
  }
  return styled ? padding : undefined;
}
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readEnumValue(value, allowed) {
  return typeof value === "string" && allowed.has(value) ? value : null;
}
/** Encode an `ObjectLayout`. Returns no declarations for a layout with no mode. */
export function toLayout(layout) {
  const declarations = {};
  const mode = layout.mode;
  if (mode !== "flex" && mode !== "grid") return declarations;
  const flex = mode === "flex";
  declarations.display = mode;
  if (flex) {
    if (
      layout.direction === "row-reverse" ||
      layout.direction === "column" ||
      layout.direction === "column-reverse"
    ) {
      declarations["flex-direction"] = layout.direction;
    }
    if (layout.wrap === "wrap" || layout.wrap === "wrap-reverse") {
      declarations["flex-wrap"] = layout.wrap;
    }
  }
  const justify = readEnumValue(layout.justify, LAYOUT_JUSTIFY_VALUES);
  if (justify !== null && justify !== "start") {
    declarations["justify-content"] = toAlignmentKeyword(justify, flex);
  }
  const align = readEnumValue(layout.align, LAYOUT_ALIGN_VALUES);
  // `align` defaults to stretch, matching CSS's initial `normal`, so that is
  // the value with no CSS to write.
  if (align !== null && align !== "stretch") {
    declarations["align-items"] = toAlignmentKeyword(align, flex);
  }
  const alignContent = readEnumValue(layout.alignContent, LAYOUT_JUSTIFY_VALUES);
  if (alignContent !== null && alignContent !== "start") {
    declarations["align-content"] = toAlignmentKeyword(alignContent, flex);
  }
  const rowGap = toLength(layout.rowGap ?? 0);
  const columnGap = toLength(layout.columnGap ?? 0);
  if (rowGap !== null && rowGap === columnGap) {
    if (rowGap !== "0px") declarations.gap = rowGap;
  } else {
    if (rowGap !== null && rowGap !== "0px") declarations["row-gap"] = rowGap;
    if (columnGap !== null && columnGap !== "0px") declarations["column-gap"] = columnGap;
  }
  const padding = toPaddingShorthand(layout.padding);
  if (padding !== null) declarations.padding = padding;
  if (!flex) {
    const columns = toTrackList(layout.columns);
    if (columns !== null) declarations["grid-template-columns"] = columns;
    const rows = toTrackList(layout.rows);
    if (rows !== null) declarations["grid-template-rows"] = rows;
    if (layout.autoFlow === "column") declarations["grid-auto-flow"] = "column";
  }
  return declarations;
}
export function fromLayout(declarations) {
  const display = declarations.display?.trim();
  if (display !== "flex" && display !== "grid") return undefined;
  const layout = { mode: display };
  if (display === "flex") {
    const direction = declarations["flex-direction"]?.trim();
    if (direction === "row-reverse" || direction === "column" || direction === "column-reverse") {
      layout.direction = direction;
    }
    const wrap = declarations["flex-wrap"]?.trim();
    if (wrap === "wrap" || wrap === "wrap-reverse") layout.wrap = wrap;
  }
  const justify = fromAlignmentKeyword(declarations["justify-content"], LAYOUT_JUSTIFY_VALUES);
  if (justify !== undefined && justify !== "start") layout.justify = justify;
  // An `align-items` the model cannot spell — `normal`, `baseline` — reads back
  // as absent, which is the stretch default and so what a browser renders.
  const align = fromAlignmentKeyword(declarations["align-items"], LAYOUT_ALIGN_VALUES);
  if (align !== undefined && align !== "stretch") layout.align = align;
  const alignContent = fromAlignmentKeyword(declarations["align-content"], LAYOUT_JUSTIFY_VALUES);
  if (alignContent !== undefined && alignContent !== "start") layout.alignContent = alignContent;
  // `gap` seeds both axes and the longhands override it, exactly as the cascade
  // would resolve them.
  const shorthand = declarations.gap?.trim().split(/\s+/) ?? [];
  const shorthandRow = fromLength(shorthand[0]);
  const shorthandColumn = fromLength(shorthand[1] ?? shorthand[0]);
  const rowGap = fromLength(declarations["row-gap"]) ?? shorthandRow;
  const columnGap = fromLength(declarations["column-gap"]) ?? shorthandColumn;
  if (rowGap !== undefined && rowGap !== 0) layout.rowGap = rowGap;
  if (columnGap !== undefined && columnGap !== 0) layout.columnGap = columnGap;
  const padding = fromPadding(declarations);
  if (padding) layout.padding = padding;
  if (display === "grid") {
    const columns = fromTrackList(declarations["grid-template-columns"]);
    if (columns) layout.columns = columns;
    const rows = fromTrackList(declarations["grid-template-rows"]);
    if (rows) layout.rows = rows;
    if (declarations["grid-auto-flow"]?.trim() === "column") layout.autoFlow = "column";
  }
  return layout;
}
/** Encode an `ObjectLayoutItem`. */
export function toLayoutItem(item) {
  const declarations = {};
  const grow = formatNumber(item.grow ?? 0);
  const shrink = formatNumber(item.shrink ?? 1);
  const basis = item.basis === undefined || item.basis === "auto" ? "auto" : toLength(item.basis);
  // The three-part form is emitted whole because the one-value `flex: 1`
  // shorthand means `1 1 0%`, not `1 1 auto`, and the model's basis default is
  // `auto`.
  if (grow !== null && shrink !== null && basis !== null) {
    if (grow !== "0" || shrink !== "1" || basis !== "auto") {
      declarations.flex = `${grow} ${shrink} ${basis}`;
    }
  }
  const alignSelf = readEnumValue(item.alignSelf, LAYOUT_ALIGN_VALUES);
  if (alignSelf !== null) declarations["align-self"] = alignSelf;
  const order = formatNumber(item.order ?? 0);
  if (order !== null && order !== "0") declarations.order = order;
  if (typeof item.column === "string" && isCssSafeValue(item.column)) {
    declarations["grid-column"] = item.column;
  }
  if (typeof item.row === "string" && isCssSafeValue(item.row)) {
    declarations["grid-row"] = item.row;
  }
  return declarations;
}
function isCssSafeValue(value) {
  const trimmed = value.trim();
  return Boolean(trimmed) && trimmed === value && !/[;{}"'\\]/.test(trimmed);
}
/** Whole triples the shorthand names with a single keyword. */
const FLEX_KEYWORDS = {
  none: { grow: 0, shrink: 0, basis: "auto" },
  initial: { grow: 0, shrink: 1, basis: "auto" },
  unset: { grow: 0, shrink: 1, basis: "auto" },
  auto: { grow: 1, shrink: 1, basis: "auto" },
};
const CASCADE_KEYWORDS = new Set(["inherit", "revert", "revert-layer"]);
/**
 * The `flex` shorthand resolved to the three longhands a browser gives it.
 *
 * Two of its rules make a positional read wrong rather than merely incomplete:
 * an omitted component takes the *shorthand's* default (grow 1, shrink 1, basis
 * `0%`) and not the longhand's initial value, and a lone unitless number is a
 * grow while a lone length is a basis. So `flex: 1` is `1 1 0%` — an equal share
 * of the container, not of the slack — and `flex: 30px` is `1 1 30px`.
 */
function fromFlexShorthand(value) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parts = splitTopLevelTrimmed(trimmed, " ").filter(Boolean);
  if (parts.length === 0 || parts.length > 3) return undefined;
  if (parts.length === 1) {
    const keyword = FLEX_KEYWORDS[parts[0].toLowerCase()];
    if (keyword) return keyword;
    // `inherit` and `revert` resolve against a parent or an origin this codec
    // cannot see, so they read back as no item at all rather than as a basis.
    if (CASCADE_KEYWORDS.has(parts[0].toLowerCase())) return undefined;
  }
  const numbers = parts.map((part) => parseNumber(part));
  let index = 0;
  let basis;
  // The shorthand's grammar is `[ <grow> <shrink>? || <basis> ]`, so the basis
  // may lead: `flex: 30px 2` is as valid as `flex: 2 30px`.
  if (numbers[0] === undefined) {
    basis = parts[0];
    index = 1;
  }
  const grow = numbers[index] !== undefined ? numbers[index++] : undefined;
  const shrink = grow !== undefined && numbers[index] !== undefined ? numbers[index++] : undefined;
  if (index < parts.length) {
    if (basis !== undefined) return undefined;
    basis = parts[index++];
  }
  if (index !== parts.length) return undefined;
  return { grow: grow ?? 1, shrink: shrink ?? 1, basis: basis ?? "0%" };
}
/**
 * `flex-basis` as the model's px number. `auto`, and any width the model has no
 * field for (`content`, `50%`, `10em`), read back as the `auto` default.
 */
function fromFlexBasis(value) {
  // A zero basis is the whole difference between sharing the container and
  // sharing only the slack, and `0%` is how the shorthand spells it.
  return value.trim() === "0%" ? 0 : fromLength(value);
}
export function fromLayoutItem(declarations) {
  const item = {};
  const shorthand = fromFlexShorthand(declarations.flex);
  const grow = parseNumber(declarations["flex-grow"]) ?? shorthand?.grow;
  const shrink = parseNumber(declarations["flex-shrink"]) ?? shorthand?.shrink;
  const basisValue = declarations["flex-basis"] ?? shorthand?.basis;
  if (grow !== undefined && grow !== 0) item.grow = grow;
  if (shrink !== undefined && shrink !== 1) item.shrink = shrink;
  if (basisValue !== undefined) {
    const basis = fromFlexBasis(basisValue);
    if (basis !== undefined) item.basis = basis;
  }
  const alignSelf = fromAlignmentKeyword(declarations["align-self"], LAYOUT_ALIGN_VALUES);
  if (alignSelf !== undefined) item.alignSelf = alignSelf;
  const order = parseNumber(declarations.order);
  if (order !== undefined && order !== 0) item.order = order;
  const column = declarations["grid-column"]?.trim();
  if (column) item.column = column;
  const row = declarations["grid-row"]?.trim();
  if (row) item.row = row;
  return Object.keys(item).length > 0 ? item : undefined;
}
const PLACEHOLDER_LAYER = {
  image: "none",
  size: "auto",
  position: "0% 0%",
  repeat: "repeat",
};
/** Neutral paint a plain browser shows for a fill kind CSS cannot run. */
const FILL_PLACEHOLDER_COLOR = {
  webcam: "#737373",
  shader: "#7c3aed",
  video: "#e5e5e5",
  model3d: "#e5e5e5",
  design: "#e5e5e5",
  kml: "#e5e5e5",
  cad: "#e5e5e5",
};
function solidLayer(color) {
  return { ...PLACEHOLDER_LAYER, image: `linear-gradient(${color}, ${color})` };
}
/**
 * A centre-based gradient sized the way the canvas sizes it: a half-box radius
 * on each axis, wherever the centre sits.
 *
 * The explicit `50% 50%` is load-bearing. Neither keyword spelling matches —
 * `closest-side` shrinks the gradient to the nearest edge and `farthest-side`
 * stretches it to the furthest, so both agree with the canvas only while the
 * centre is exactly halfway and the box is square. An off-centre gradient
 * written with a keyword paints at visibly the wrong size, which is what
 * `radial-gradient(closest-side at 20% 80%, …)` did.
 */
function radialGradientImage(cx, cy, stops) {
  return `radial-gradient(50% 50% at ${cx}% ${cy}%, ${stops})`;
}
/**
 * Quote a URL for `url(...)`.
 *
 * Single quotes, because the result is interpolated into a `style` attribute the
 * HTML serializer then escapes: a double quote there becomes `&quot;`, which
 * costs a full entity-encode on the way out and a full entity-decode on the way
 * back in for every ~165 KB `data:` fill. A single quote needs neither, and
 * reads better in the file.
 */
function escapeCssUrl(value) {
  if (/[\n\r]/.test(value)) return null;
  return /['\\]/.test(value) ? value.replace(/\\/g, "\\\\").replace(/'/g, "\\'") : value;
}
/**
 * The URL inside `url('…')` / `url("…")`, or null.
 *
 * Hand-rolled rather than a regex: `^url\(\s*"([\s\S]*)"\s*\)$` backtracks
 * across the whole of a 165 KB `data:` URL. Both quote styles are accepted so a
 * hand-edited file still reads.
 */
function parseCssUrl(image) {
  if (!image.startsWith("url(") || image.charCodeAt(image.length - 1) !== CHAR_PAREN_CLOSE) {
    return null;
  }
  let start = 4;
  let end = image.length - 1;
  while (start < end && isWhitespaceCode(image.charCodeAt(start))) start += 1;
  while (end > start && isWhitespaceCode(image.charCodeAt(end - 1))) end -= 1;
  const quote = image.charCodeAt(start);
  if (quote !== CHAR_QUOTE_DOUBLE && quote !== CHAR_QUOTE_SINGLE) return null;
  if (end - start < 2 || image.charCodeAt(end - 1) !== quote) return null;
  return unescapeCssUrl(image.slice(start + 1, end - 1));
}
function unescapeCssUrl(value) {
  return value.includes("\\") ? value.replace(/\\(.)/g, "$1") : value;
}
const IMAGE_FIT_LAYOUT = {
  cover: { size: "cover", position: "50% 50%", repeat: "no-repeat" },
  contain: { size: "contain", position: "50% 50%", repeat: "no-repeat" },
  fill: { size: "100% 100%", position: "50% 50%", repeat: "no-repeat" },
  tile: { size: "auto", position: "0% 0%", repeat: "repeat" },
};
/** The `fit`-less image layout, distinguished from `tile` by `no-repeat`. */
const IMAGE_NO_FIT_LAYOUT = { size: "auto", position: "50% 50%", repeat: "no-repeat" };
function fitFromLayout(layout) {
  for (const [fit, candidate] of Object.entries(IMAGE_FIT_LAYOUT)) {
    if (
      candidate.size === layout.size &&
      candidate.position === layout.position &&
      candidate.repeat === layout.repeat
    ) {
      return fit;
    }
  }
  return null;
}
function encodeStops(stops) {
  if (!Array.isArray(stops) || stops.length === 0) return null;
  const parts = [];
  for (const entry of stops) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const stop = entry;
    const extra = Object.keys(stop).filter(
      (key) => key !== "offset" && key !== "color" && key !== "opacity",
    );
    if (extra.length > 0) return null;
    const color = toCssColor(stop.color, stop.opacity);
    const offset = toExactPercent(stop.offset);
    if (color === null || offset === null) return null;
    parts.push(`${color} ${offset}%`);
  }
  return parts.join(", ");
}
function decodeStops(body) {
  const stops = [];
  for (const token of body) {
    const trimmed = token.trim();
    const split = /^([\s\S]+?)\s+(-?[\d.eE+-]+)%$/.exec(trimmed);
    if (!split) return null;
    const color = fromCssColor(split[1]);
    const offset = parseNumber(split[2]);
    if (!color || offset === undefined) return null;
    const stop = { offset: offset / 100, color: color.color };
    if (color.opacity !== undefined) stop.opacity = color.opacity;
    stops.push(stop);
  }
  return stops.length > 0 ? stops : null;
}
/** The keys every fill kind may carry without becoming unencodable. */
function fillExtraKeys(fill, allowed) {
  const permitted = new Set([...allowed, "type"]);
  return Object.keys(fill).every((key) => permitted.has(key) || fill[key] === undefined);
}
/**
 * Flags whose stated default means exactly what their absence means — the value
 * a layer editor writes back after toggling one off and on again.
 *
 * CSS has no spelling for any of them (a layer that paints is already visible;
 * a `drop-shadow` is already not inner), so none appears in an `allowed` list:
 * the layer reports itself unencodable and its exact model travels in the
 * residual. Listing one as encodable instead means it is neither emitted nor
 * decoded, which fails the self-verify and drops the whole document onto the
 * `data-arg-fallback` path, where later edits to the markup are discarded.
 */
const DEFAULT_FLAGS = {
  visible: true,
  inner: false,
  layer: false,
};
/** The same layer with any default-valued flag dropped, so it still paints. */
function withoutDefaultFlags(layer) {
  let stripped = layer;
  for (const [key, value] of Object.entries(DEFAULT_FLAGS)) {
    if (stripped[key] !== value) continue;
    const { [key]: _flag, ...rest } = stripped;
    stripped = rest;
  }
  return stripped;
}
/** True when a layer carries a flag written out at its own default value. */
function hasDefaultFlag(layer) {
  return withoutDefaultFlags(layer) !== layer;
}
/** Encode one fill layer, or null when CSS cannot express it exactly. */
function encodeFill(fill) {
  // A hidden layer must not paint, and "hidden" is not a background-layer
  // concept, so it always travels as data.
  if (fill.visible === false) return null;
  const type = fill.type;
  if (type === "none") {
    return fillExtraKeys(fill, []) ? { ...PLACEHOLDER_LAYER } : null;
  }
  if (type === "solid") {
    if (!fillExtraKeys(fill, ["color", "opacity"])) return null;
    const color = toCssColor(fill.color, fill.opacity);
    return color === null ? null : solidLayer(color);
  }
  if (type === "linear-gradient") {
    // Explicit endpoints, a coordinate space, and a layer-level opacity all
    // describe things one CSS gradient function cannot; those travel as data.
    if (!fillExtraKeys(fill, ["angle", "stops"])) return null;
    const angle = formatNumber(fill.angle);
    const stops = encodeStops(fill.stops);
    if (angle === null || stops === null) return null;
    // The model's angle IS the CSS angle — `angleToGradientLine` places the
    // first stop at the bottom for 0° and at the left for 90°, which is what
    // `linear-gradient(0deg, …)` and `linear-gradient(90deg, …)` do. Offsetting
    // by half a turn here round-trips perfectly and paints every gradient in
    // the document backwards, which is why only a render comparison catches it.
    return {
      ...PLACEHOLDER_LAYER,
      image: `linear-gradient(${angle}deg, ${stops})`,
    };
  }
  if (type === "radial-gradient" || type === "diamond-gradient") {
    // Only the default-geometry radial is exact; a custom radius/width ellipse
    // and every diamond keep their model in data and paint an approximation.
    if (type === "diamond-gradient") return null;
    if (!fillExtraKeys(fill, ["cx", "cy", "stops"])) return null;
    const cx = toExactPercent(fill.cx);
    const cy = toExactPercent(fill.cy);
    const stops = encodeStops(fill.stops);
    if (cx === null || cy === null || stops === null) return null;
    return { ...PLACEHOLDER_LAYER, image: radialGradientImage(cx, cy, stops) };
  }
  if (type === "angular-gradient") {
    if (!fillExtraKeys(fill, ["cx", "cy", "rotation", "stops"])) return null;
    const cx = toExactPercent(fill.cx);
    const cy = toExactPercent(fill.cy);
    const rotation = formatNumber(fill.rotation);
    const stops = encodeStops(fill.stops);
    if (cx === null || cy === null || rotation === null || stops === null) return null;
    return {
      ...PLACEHOLDER_LAYER,
      image: `conic-gradient(from ${rotation}deg at ${cx}% ${cy}%, ${stops})`,
    };
  }
  if (type === "file" && fill.fileType === "image") {
    if (!fillExtraKeys(fill, ["fileType", "src", "fit"])) return null;
    if (typeof fill.src !== "string" || !fill.src) return null;
    const url = escapeCssUrl(fill.src);
    if (url === null) return null;
    const layout =
      fill.fit === undefined
        ? IMAGE_NO_FIT_LAYOUT
        : typeof fill.fit === "string"
          ? IMAGE_FIT_LAYOUT[fill.fit]
          : undefined;
    if (!layout) return null;
    return { image: `url('${url}')`, ...layout };
  }
  return null;
}
/**
 * The nearest CSS gradient to a gradient the exact encoder turned down.
 *
 * Every gradient kind in the model has a CSS function that is at least the
 * right family, so a gradient held back by geometry CSS cannot state exactly —
 * a diamond, an ellipse with explicit radius handles, a linear with endpoints
 * instead of an angle — should still paint that family rather than fall through
 * to the no-paint placeholder and disappear from the page entirely.
 */
function gradientApproximation(fill) {
  const stops = encodeStops(lenientStops(fill.stops));
  if (stops === null) return null;
  const type = fill.type;
  if (type === "linear-gradient") {
    const angle = typeof fill.angle === "number" ? fill.angle : linearAngleFromEndpoints(fill);
    // `typeof NaN === "number"`, so the null check above does not cover it and
    // `formatNumber` does. A background-image is one comma-joined list, so an
    // `Infinitydeg` layer would take every other fill on the element down with it.
    const degrees = formatNumber(angle);
    if (degrees === null) return null;
    return { ...PLACEHOLDER_LAYER, image: `linear-gradient(${degrees}deg, ${stops})` };
  }
  if (type === "radial-gradient" || type === "diamond-gradient") {
    const cx = toExactPercent(typeof fill.cx === "number" ? fill.cx : 0.5);
    const cy = toExactPercent(typeof fill.cy === "number" ? fill.cy : 0.5);
    if (cx === null || cy === null) return null;
    return { ...PLACEHOLDER_LAYER, image: radialGradientImage(cx, cy, stops) };
  }
  if (type === "angular-gradient") {
    const cx = toExactPercent(typeof fill.cx === "number" ? fill.cx : 0.5);
    const cy = toExactPercent(typeof fill.cy === "number" ? fill.cy : 0.5);
    const rotation = formatNumber(typeof fill.rotation === "number" ? fill.rotation : 0);
    if (cx === null || cy === null || rotation === null) return null;
    return {
      ...PLACEHOLDER_LAYER,
      image: `conic-gradient(from ${rotation}deg at ${cx}% ${cy}%, ${stops})`,
    };
  }
  return null;
}
/** The gradient line's direction as a CSS angle, for a linear fill that carries
 *  explicit endpoints instead of one. CSS can state the direction but not the
 *  line's position or length, so this is an approximation by construction. */
function linearAngleFromEndpoints(fill) {
  const start = isJsonObject(fill.start) ? fill.start : null;
  const end = isJsonObject(fill.end) ? fill.end : null;
  if (!start || !end) return null;
  const dx = Number(end.x) - Number(start.x);
  const dy = Number(end.y) - Number(start.y);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  return ((((Math.atan2(dy, dx) * 180) / Math.PI + 90) % 360) + 360) % 360;
}
/** Stops with only the keys a CSS stop can carry, so a stop annotated with
 *  something the exact encoder rejects still paints its colour. */
function lenientStops(stops) {
  if (!Array.isArray(stops)) return stops;
  return stops.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    const stop = entry;
    const kept = {};
    for (const key of ["offset", "color", "opacity"]) {
      if (stop[key] !== undefined) kept[key] = stop[key];
    }
    return kept;
  });
}
/** Best-effort static paint for a fill CSS cannot run, so a browser shows something. */
function placeholderFor(fill) {
  if (fill.visible === false) return { ...PLACEHOLDER_LAYER };
  // A layer held back only by a flag stating its own default still paints
  // exactly; it is the *model* that has to travel as data, not the pixels.
  const exact = hasDefaultFlag(fill) ? encodeFill(withoutDefaultFlags(fill)) : null;
  if (exact) return exact;
  const gradient = gradientApproximation(fill);
  if (gradient) return gradient;
  if (fill.type === "file" && typeof fill.src === "string" && fill.src) {
    if (fill.fileType === "image") {
      const url = escapeCssUrl(fill.src);
      if (url !== null) return { image: `url('${url}')`, ...IMAGE_FIT_LAYOUT.cover };
    }
  }
  const kind =
    fill.type === "file" && typeof fill.fileType === "string"
      ? fill.fileType
      : typeof fill.type === "string"
        ? fill.type
        : "";
  const color =
    kind === "webcam" && isCssSafeColor(fill.color)
      ? fill.color
      : (FILL_PLACEHOLDER_COLOR[kind] ?? null);
  return color === null ? { ...PLACEHOLDER_LAYER } : solidLayer(color);
}
/**
 * Encode a fill stack as `background-*` layers.
 *
 * `fills` is bottom→top in array order, but a CSS background paints its FIRST
 * layer on top, so the emitted lists are the reverse of the model's. Getting
 * this backwards silently inverts every stacked paint in the document.
 */
export function toBackgroundLayers(fills) {
  const residual = [];
  const layers = [];
  for (const fill of fills) {
    const encoded = encodeFill(fill);
    residual.push(encoded ? null : fill);
    layers.push(encoded ?? placeholderFor(fill));
  }
  const declarations = {};
  if (layers.length === 0) {
    // An explicitly empty fill stack is not the same as an absent one, and CSS
    // has no zero-layer spelling: `none` already means one no-paint layer, so
    // the "no layers at all" case takes the other paints-nothing keyword.
    declarations["background-image"] = "initial";
    return { declarations, residual };
  }
  const ordered = [...layers].reverse();
  declarations["background-image"] = ordered.map((layer) => layer.image).join(", ");
  const needsLayout = ordered.some(
    (layer) =>
      layer.size !== PLACEHOLDER_LAYER.size ||
      layer.position !== PLACEHOLDER_LAYER.position ||
      layer.repeat !== PLACEHOLDER_LAYER.repeat,
  );
  if (needsLayout) {
    declarations["background-size"] = ordered.map((layer) => layer.size).join(", ");
    declarations["background-position"] = ordered.map((layer) => layer.position).join(", ");
    declarations["background-repeat"] = ordered.map((layer) => layer.repeat).join(", ");
  }
  return { declarations, residual };
}
function decodeLayer(layer) {
  const image = layer.image.trim();
  if (image === "none") return { type: "none" };
  const url = parseCssUrl(image);
  if (url !== null) {
    const fill = { type: "file", fileType: "image", src: url };
    const fit = fitFromLayout(layer);
    if (fit) fill.fit = fit;
    else if (
      layer.size !== IMAGE_NO_FIT_LAYOUT.size ||
      layer.position !== IMAGE_NO_FIT_LAYOUT.position ||
      layer.repeat !== IMAGE_NO_FIT_LAYOUT.repeat
    ) {
      return null;
    }
    return fill;
  }
  const gradient = /^(linear-gradient|radial-gradient|conic-gradient)\(([\s\S]*)\)$/.exec(image);
  if (!gradient) return null;
  const body = splitTopLevelTrimmed(gradient[2], ",");
  const kind = gradient[1];
  if (kind === "linear-gradient") {
    // A solid is the degenerate two-identical-endpoints gradient; it carries no
    // angle and no stop offsets, which is what tells it apart from a real one.
    if (body.length === 2 && body[0] === body[1] && !body[0].endsWith("%")) {
      const color = fromCssColor(body[0]);
      if (!color) return null;
      const fill = { type: "solid", color: color.color };
      if (color.opacity !== undefined) fill.opacity = color.opacity;
      return fill;
    }
    const angleMatch = /^(-?[\d.eE+-]+)deg$/.exec(body[0] ?? "");
    if (!angleMatch) return null;
    const cssAngle = parseNumber(angleMatch[1]);
    const stops = decodeStops(body.slice(1));
    if (cssAngle === undefined || !stops) return null;
    return { type: "linear-gradient", angle: cssAngle, stops };
  }
  // `closest-side` is the spelling earlier writers used for the same fill, so it
  // still reads even though nothing emits it any more.
  const head =
    /^(?:closest-side\s+|-?[\d.eE+-]+%\s+-?[\d.eE+-]+%\s+)?at\s+(-?[\d.eE+-]+)%\s+(-?[\d.eE+-]+)%$/.exec(
      body[0] ?? "",
    );
  const conicHead = /^from\s+(-?[\d.eE+-]+)deg\s+at\s+(-?[\d.eE+-]+)%\s+(-?[\d.eE+-]+)%$/.exec(
    body[0] ?? "",
  );
  const stops = decodeStops(body.slice(1));
  if (!stops) return null;
  if (kind === "radial-gradient" && head) {
    const cx = parseNumber(head[1]);
    const cy = parseNumber(head[2]);
    if (cx === undefined || cy === undefined) return null;
    return { type: "radial-gradient", cx: cx / 100, cy: cy / 100, stops };
  }
  if (kind === "conic-gradient" && conicHead) {
    const rotation = parseNumber(conicHead[1]);
    const cx = parseNumber(conicHead[2]);
    const cy = parseNumber(conicHead[3]);
    if (rotation === undefined || cx === undefined || cy === undefined) return null;
    return { type: "angular-gradient", cx: cx / 100, cy: cy / 100, rotation, stops };
  }
  return null;
}
/** Decode `background-*` declarations back to a bottom→top fill stack. */
export function fromBackgroundLayers(declarations) {
  const image = declarations["background-image"];
  if (!image) return [];
  if (image.trim() === "initial") return [];
  const images = splitTopLevelTrimmed(image, ",");
  const read = (property, fallback) => {
    const raw = declarations[property];
    if (!raw) return images.map(() => fallback);
    const parts = splitTopLevelTrimmed(raw, ",");
    return images.map((_, index) => parts[index] ?? fallback);
  };
  const sizes = read("background-size", PLACEHOLDER_LAYER.size);
  const positions = read("background-position", PLACEHOLDER_LAYER.position);
  const repeats = read("background-repeat", PLACEHOLDER_LAYER.repeat);
  const decoded = images.map((value, index) =>
    decodeLayer({
      image: value,
      size: sizes[index],
      position: positions[index],
      repeat: repeats[index],
    }),
  );
  // Undo the paint-order inversion: the last CSS layer is `fills[0]`.
  return decoded.reverse();
}
// ---------- strokes → box-shadow rings ----------
const STROKE_ALIGNMENTS = new Set(["center", "inside", "outside"]);
/**
 * Strokes become `box-shadow` rings rather than a `border`, because an object
 * carries a *stack* of strokes and an element has exactly one border. A ring is
 * `offset-x offset-y blur spread color` with zero offset and zero blur, so the
 * spread is the stroke width; `inset` carries `align: "inside"`.
 *
 * `strokes` is bottom→top in array order (the same rule as `fills`), and a
 * `box-shadow` paints its FIRST ring on top, so the emitted list is the reverse
 * of the model's — matching `toBackgroundLayers` and the SVG exporter, which
 * paints the stack in document order. The residual stays in model order.
 */
export function toBoxShadow(strokes) {
  const residual = [];
  const rings = [];
  for (const stroke of strokes) {
    const ring = encodeStroke(stroke);
    residual.push(ring === null ? stroke : null);
    // A ring the CSS cannot express still occupies its index; a zero-spread
    // transparent ring paints nothing and keeps the lists aligned. A stroke held
    // back only by a default-valued flag still paints its real ring.
    rings.push(ring ?? encodeStroke(withoutDefaultFlags(stroke)) ?? "0 0 0 0 transparent");
  }
  const declarations = {};
  declarations["box-shadow"] = rings.length > 0 ? rings.reverse().join(", ") : "none";
  return { declarations, residual };
}
function encodeStroke(stroke) {
  if (stroke.visible === false) return null;
  const allowed = new Set(["color", "width", "opacity", "align"]);
  if (!Object.keys(stroke).every((key) => allowed.has(key) || stroke[key] === undefined)) {
    return null;
  }
  const width = toLength(stroke.width);
  const color = toCssColor(stroke.color, stroke.opacity);
  if (width === null || color === null) return null;
  const align = stroke.align;
  if (align !== undefined && (typeof align !== "string" || !STROKE_ALIGNMENTS.has(align))) {
    return null;
  }
  // `center` and `outside` both paint an outset ring, so only the two forms CSS
  // can tell apart round-trip through it; the rest travel as data.
  if (align === "center" || align === "outside") return null;
  return align === "inside"
    ? `inset 0px 0px 0px ${width} ${color}`
    : `0px 0px 0px ${width} ${color}`;
}
export function fromBoxShadow(declarations) {
  const value = declarations["box-shadow"];
  if (!value || value.trim() === "none") return [];
  const decoded = splitTopLevel(value, ",").map((entry) => {
    const trimmed = entry.trim();
    const inset = trimmed.startsWith("inset ");
    const body = inset ? trimmed.slice(6).trim() : trimmed;
    const match = /^0px 0px 0px (-?[\d.eE+-]+px)\s+([\s\S]+)$/.exec(body);
    if (!match) return null;
    const width = fromLength(match[1]);
    const color = fromCssColor(match[2]);
    if (width === undefined || !color) return null;
    const stroke = { color: color.color, width };
    if (color.opacity !== undefined) stroke.opacity = color.opacity;
    if (inset) stroke.align = "inside";
    return stroke;
  });
  // Undo the paint-order inversion: the last ring is `strokes[0]`.
  return decoded.reverse();
}
// ---------- effects → filter ----------
/**
 * Effects become a `filter` chain. A glow and a zero-offset shadow would both
 * spell `drop-shadow(0 0 r c)`, so a shadow with no offset is deliberately NOT
 * encodable — which leaves `drop-shadow` with zero offsets unambiguously a
 * glow. Inner shadows and background blurs have no filter form at all and keep
 * their model in data behind a no-op `opacity(1)` placeholder.
 */
export function toFilter(effects) {
  const residual = [];
  const parts = [];
  for (const effect of effects) {
    const encoded = encodeEffect(effect);
    residual.push(encoded === null ? effect : null);
    // An effect held back only by a default-valued flag still renders.
    parts.push(encoded ?? encodeEffect(withoutDefaultFlags(effect)) ?? "opacity(1)");
  }
  const declarations = {};
  declarations.filter = parts.length > 0 ? parts.join(" ") : "none";
  return { declarations, residual };
}
function encodeEffect(effect) {
  const allowed = {
    shadow: ["offsetX", "offsetY", "blur", "color"],
    blur: ["radius"],
    glow: ["radius", "color"],
  };
  const type = typeof effect.type === "string" ? effect.type : "";
  const permitted = allowed[type];
  if (!permitted) return null;
  const keys = new Set([...permitted, "type"]);
  if (!Object.keys(effect).every((key) => keys.has(key) || effect[key] === undefined)) return null;
  if (type === "shadow") {
    const offsetX = toLength(effect.offsetX);
    const offsetY = toLength(effect.offsetY);
    const blur = toLength(effect.blur);
    const color = toCssColor(effect.color);
    if (offsetX === null || offsetY === null || blur === null || color === null) return null;
    if (effect.offsetX === 0 && effect.offsetY === 0) return null;
    return `drop-shadow(${offsetX} ${offsetY} ${blur} ${color})`;
  }
  if (type === "blur") {
    const radius = toLength(effect.radius);
    return radius === null ? null : `blur(${radius})`;
  }
  const radius = toLength(effect.radius);
  const color = toCssColor(effect.color);
  return radius === null || color === null ? null : `drop-shadow(0px 0px ${radius} ${color})`;
}
export function fromFilter(declarations) {
  const value = declarations.filter;
  if (!value || value.trim() === "none") return [];
  // Split the chain by paren depth, the way fills and strokes are split.
  // `isCssSafeColor` accepts a colour nested to any depth, so an effect colour
  // can be `light-dark(rgb(1 2 3), rgb(4 5 6))`; a regex that hard-codes one
  // level of nesting stops matching at the inner `)` and drops the effect.
  const parts = splitTopLevelTrimmed(value, " ").filter((part) => part !== "");
  return parts.map((part) => {
    const match = /^([a-z-]+)\(([\s\S]*)\)$/.exec(part);
    if (!match) return null;
    const fn = match[1];
    const body = match[2].trim();
    if (fn === "blur") {
      const radius = fromLength(body);
      return radius === undefined ? null : { type: "blur", radius };
    }
    if (fn !== "drop-shadow") return null;
    const shadow = /^(-?[\d.eE+-]+px)\s+(-?[\d.eE+-]+px)\s+(-?[\d.eE+-]+px)\s+([\s\S]+)$/.exec(
      body,
    );
    if (!shadow) return null;
    const offsetX = fromLength(shadow[1]);
    const offsetY = fromLength(shadow[2]);
    const blur = fromLength(shadow[3]);
    const color = fromCssColor(shadow[4]);
    if (offsetX === undefined || offsetY === undefined || blur === undefined || !color) return null;
    if (offsetX === 0 && offsetY === 0) return { type: "glow", radius: blur, color: color.color };
    return { type: "shadow", offsetX, offsetY, blur, color: color.color };
  });
}
