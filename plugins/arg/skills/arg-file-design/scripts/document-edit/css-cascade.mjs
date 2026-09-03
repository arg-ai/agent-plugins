// Generated from sdk/typescript/src/documents/css-cascade.ts. Do not edit directly.
/**
 * Resolve a `.design` document's own `<style>` sheet.
 *
 * A canvas-owned HTML projection uses HTML/CSS, and the skill tells agents the
 * markup and the stylesheet are authoritative. The reader only ever looked at
 * Tailwind utility classes and the inline `style` attribute, so a document that
 * wrote its geometry and typography as CSS rules — the natural way to write
 * HTML — parsed to objects with no frame, no fills and no text style.
 *
 * This is the missing bottom layer of the cascade: given the parsed DOM it
 * indexes the document's rules, matches them per element, resolves `var()`
 * against the element's inherited custom properties, and expands the shorthands
 * whose longhands the codec reads.
 *
 * Deliberately a subset, and it says so rather than guessing. `@media`,
 * `@supports`, `@keyframes` and every other at-rule are skipped whole, and a
 * selector carrying a pseudo-class or pseudo-element is dropped rather than
 * applied without its condition — `::after` content in particular must never
 * become a layer. `:root` is the one exception, because that is where a document
 * keeps its palette.
 *
 * Repair-forward and never throws, the same posture as the rest of the codec: an
 * unterminated block, a stray `}` and a combinator this does not implement all
 * resolve to "contributes nothing" and parsing continues.
 */
import { parseStyleAttribute } from "./css-values.mjs";
import { getAttribute } from "./html-dom.mjs";
const IDENT_CHARS = /[-\w\u0080-\uffff]/;
function isIdentStart(char) {
  return char !== undefined && (IDENT_CHARS.test(char) || char === "\\");
}
function readIdent(source, from) {
  let index = from;
  let value = "";
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      // Only the literal-next-character form; a `\26 B` hex escape is not one
      // the codec's own class names ever need.
      const next = source[index + 1];
      if (next === undefined) break;
      value += next;
      index += 2;
      continue;
    }
    if (!IDENT_CHARS.test(char)) break;
    value += char;
    index += 1;
  }
  return { value, end: index };
}
function isWhitespace(char) {
  return char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f";
}
/** Index of the quote closing the one at `open`, or `source.length` when unterminated. */
function closingQuote(source, open) {
  const quote = source[open];
  for (let index = open + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === quote) return index;
  }
  return source.length;
}
/** Index of the `)` matching the `(` at `open`, or -1 when unterminated. */
function matchingParen(source, open) {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' || char === "'") {
      index = closingQuote(source, index);
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}
/** First index at or after `from` holding one of `stops` outside quotes, parens and brackets. */
function findTopLevel(source, from, stops) {
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' || char === "'") {
      index = closingQuote(source, index);
      continue;
    }
    if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") {
      if (depth > 0) depth -= 1;
    } else if (depth === 0 && stops.includes(char)) return index;
  }
  return -1;
}
/** Split on a separator outside quotes, parens and brackets. */
function splitTopLevel(source, separator) {
  const parts = [];
  let start = 0;
  for (;;) {
    const at = findTopLevel(source, start, separator);
    if (at < 0) break;
    parts.push(source.slice(start, at));
    start = at + 1;
  }
  parts.push(source.slice(start));
  return parts;
}
/** Whitespace-separated tokens, keeping quoted and parenthesised runs whole. */
function valueTokens(value) {
  const tokens = [];
  let index = 0;
  while (index < value.length) {
    while (index < value.length && isWhitespace(value[index])) index += 1;
    if (index >= value.length) break;
    const start = index;
    let depth = 0;
    while (index < value.length) {
      const char = value[index];
      if (char === '"' || char === "'") {
        index = closingQuote(value, index) + 1;
        continue;
      }
      if (char === "(") depth += 1;
      else if (char === ")") {
        if (depth > 0) depth -= 1;
      } else if (depth === 0 && isWhitespace(char)) break;
      index += 1;
    }
    tokens.push(value.slice(start, index));
  }
  return tokens;
}
const ATTRIBUTE_SELECTOR = /^([-\w\u0080-\uffff]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\]]*))?$/;
/**
 * Parse one selector (no commas) into compounds, left to right.
 *
 * Returns null for anything outside the supported subset — a sibling
 * combinator, a pseudo other than `:root`, an attribute operator that is not
 * `=`. A null selector contributes nothing, which is the whole point: applying
 * `.a:hover` unconditionally would paint every element as if hovered.
 */
function parseSelector(text) {
  const compounds = [];
  let simples = [];
  let leading;
  let pending;
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (isWhitespace(char)) {
      if (simples.length > 0 && pending === undefined) pending = "descendant";
      index += 1;
      continue;
    }
    if (char === ">") {
      if (simples.length === 0) return null;
      pending = "child";
      index += 1;
      continue;
    }
    if (char === "+" || char === "~" || char === "|") return null;
    if (pending !== undefined) {
      compounds.push(leading === undefined ? { simples } : { simples, combinator: leading });
      leading = pending;
      pending = undefined;
      simples = [];
    }
    if (char === "*") {
      simples.push({ kind: "universal" });
      index += 1;
      continue;
    }
    if (char === "." || char === "#") {
      const ident = readIdent(text, index + 1);
      if (!ident.value) return null;
      simples.push(
        char === "." ? { kind: "class", name: ident.value } : { kind: "id", name: ident.value },
      );
      index = ident.end;
      continue;
    }
    if (char === "[") {
      const close = text.indexOf("]", index);
      if (close < 0) return null;
      const match = ATTRIBUTE_SELECTOR.exec(text.slice(index + 1, close).trim());
      if (!match) return null;
      const raw = match[2];
      const value =
        raw === undefined
          ? undefined
          : raw.startsWith('"') || raw.startsWith("'")
            ? raw.slice(1, -1)
            : raw.trim();
      simples.push({ kind: "attribute", name: match[1].toLowerCase(), value });
      index = close + 1;
      continue;
    }
    if (char === ":") {
      const ident = readIdent(text, text[index + 1] === ":" ? index + 2 : index + 1);
      if (ident.value.toLowerCase() !== "root" || text[index + 1] === ":") return null;
      simples.push({ kind: "root" });
      index = ident.end;
      continue;
    }
    if (isIdentStart(char)) {
      const ident = readIdent(text, index);
      if (!ident.value) return null;
      simples.push({ kind: "tag", name: ident.value.toLowerCase() });
      index = ident.end;
      continue;
    }
    return null;
  }
  if (simples.length === 0) return null;
  compounds.push(leading === undefined ? { simples } : { simples, combinator: leading });
  return compounds;
}
const SPECIFICITY_ID = 1 << 20;
const SPECIFICITY_CLASS = 1 << 10;
function specificityOf(compounds) {
  let total = 0;
  for (const compound of compounds) {
    for (const simple of compound.simples) {
      if (simple.kind === "id") total += SPECIFICITY_ID;
      else if (simple.kind === "class" || simple.kind === "attribute" || simple.kind === "root") {
        total += SPECIFICITY_CLASS;
      } else if (simple.kind === "tag") total += 1;
    }
  }
  return total;
}
// ---------- stylesheet text ----------
/** Remove `/* … *​/` comments, leaving quoted strings alone. */
function stripComments(source) {
  if (!source.includes("/*")) return source;
  let out = "";
  let start = 0;
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '"' || char === "'") {
      index = closingQuote(source, index) + 1;
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      const close = source.indexOf("*/", index + 2);
      out += `${source.slice(start, index)} `;
      index = close < 0 ? source.length : close + 2;
      start = index;
      continue;
    }
    index += 1;
  }
  return out + source.slice(start);
}
/** Index of the `}` closing the block opened at `open`, or -1 when unterminated. */
function blockEnd(source, open) {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' || char === "'") {
      index = closingQuote(source, index);
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}
function addRule(index, rule) {
  const subject = rule.compounds[rule.compounds.length - 1];
  let bucket;
  let key;
  for (const simple of subject.simples) {
    if (simple.kind === "id") {
      bucket = index.byId;
      key = simple.name;
      break;
    }
    if (simple.kind === "class" && key === undefined) {
      bucket = index.byClass;
      key = simple.name;
    } else if (simple.kind === "tag" && key === undefined) {
      bucket = index.byTag;
      key = simple.name;
    }
  }
  index.count += 1;
  if (!bucket || key === undefined) {
    index.unbucketed.push(rule);
    return;
  }
  const list = bucket.get(key);
  if (list) list.push(rule);
  else bucket.set(key, [rule]);
}
function parseStylesheetInto(source, index, nextOrder) {
  const text = stripComments(source);
  let cursor = 0;
  while (cursor < text.length) {
    const char = text[cursor];
    if (isWhitespace(char) || char === ";") {
      cursor += 1;
      continue;
    }
    // A stray close brace belongs to nothing; stepping over it lets the rules
    // after it still be read.
    if (char === "}") {
      cursor += 1;
      continue;
    }
    if (char === "@") {
      const stop = findTopLevel(text, cursor, "{;");
      if (stop < 0) return;
      if (text[stop] !== "{") {
        cursor = stop + 1;
        continue;
      }
      const close = blockEnd(text, stop);
      if (close < 0) return;
      cursor = close + 1;
      continue;
    }
    const open = findTopLevel(text, cursor, "{");
    // An unterminated selector at the end of the sheet has no declarations.
    if (open < 0) return;
    const prelude = text.slice(cursor, open);
    const close = blockEnd(text, open);
    const body = text.slice(open + 1, close < 0 ? text.length : close);
    cursor = close < 0 ? text.length : close + 1;
    const declarations = Object.entries(parseStyleAttribute(body));
    if (declarations.length === 0) continue;
    // Separated once here so the variable scope of every matched element is not
    // a second walk over every declaration looking for a `--` prefix.
    const custom = declarations.filter(([property]) => property.startsWith("--"));
    for (const part of splitTopLevel(prelude, ",")) {
      const selector = part.trim();
      if (!selector) continue;
      const compounds = parseSelector(selector);
      if (!compounds) continue;
      addRule(index, {
        compounds,
        specificity: specificityOf(compounds),
        order: nextOrder(),
        declarations,
        custom: custom.length > 0 ? custom : undefined,
      });
    }
  }
}
// ---------- var() ----------
/** Deep enough for any hand-authored palette; a longer chain is treated as unresolvable. */
const MAX_VAR_DEPTH = 16;
/** A substitution that grows a value past this is refused rather than expanded further. */
const MAX_RESOLVED_LENGTH = 65536;
/**
 * Total substitutions one declaration may perform.
 *
 * Depth and output length together do NOT bound the work: a chain where every
 * level references the next several times, ending in a variable that resolves
 * to nothing, keeps the output empty while the tree it walks is fan-out^depth.
 * A ~900-byte document took over seven seconds that way, and this parser runs on
 * the Worker's search-indexing path, so the count is capped as well.
 */
const MAX_VAR_SUBSTITUTIONS = 10_000;
function isIdentChar(char) {
  return char !== undefined && IDENT_CHARS.test(char);
}
function resolveVars(value, variables, seen, depth, budget) {
  if (depth > MAX_VAR_DEPTH || value.length > MAX_RESOLVED_LENGTH) return value;
  if (budget.remaining <= 0) return value;
  let out = "";
  let start = 0;
  let cursor = 0;
  while (cursor < value.length) {
    const at = value.indexOf("var(", cursor);
    if (at < 0) break;
    if (isIdentChar(value[at - 1])) {
      cursor = at + 4;
      continue;
    }
    const close = matchingParen(value, at + 3);
    if (close < 0) break;
    const inside = value.slice(at + 4, close);
    const comma = findTopLevel(inside, 0, ",");
    const name = (comma < 0 ? inside : inside.slice(0, comma)).trim().toLowerCase();
    const fallback = comma < 0 ? undefined : inside.slice(comma + 1).trim();
    let replacement;
    // A name already on the resolution stack is a reference cycle. Treating it
    // as undefined lets the fallback (or the verbatim text) end the recursion.
    if (name.startsWith("--") && !seen.includes(name)) {
      const raw = variables[name];
      if (raw !== undefined) {
        seen.push(name);
        replacement = resolveVars(raw, variables, seen, depth + 1, budget);
        seen.pop();
      }
    }
    if (replacement === undefined && fallback !== undefined) {
      replacement = resolveVars(fallback, variables, seen, depth + 1, budget);
    }
    if (replacement === undefined) {
      cursor = close + 1;
      continue;
    }
    budget.remaining -= 1;
    out += value.slice(start, at) + replacement;
    if (out.length > MAX_RESOLVED_LENGTH) return value;
    start = close + 1;
    cursor = start;
  }
  return start === 0 ? value : out + value.slice(start);
}
// ---------- shorthands ----------
/** The 1-2-3-4 value rule shared by `inset`, `margin` and `padding`. */
function edgeValues(parts) {
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  if (parts.length === 4) return [parts[0], parts[1], parts[2], parts[3]];
  return null;
}
const EDGES = ["top", "right", "bottom", "left"];
function expandEdges(out, value, prefix) {
  const edges = edgeValues(valueTokens(value));
  if (!edges) return;
  for (let index = 0; index < 4; index += 1) out[`${prefix}${EDGES[index]}`] = edges[index];
}
const FONT_STYLES = new Set(["italic", "oblique"]);
const FONT_WEIGHTS = new Set(["bold", "bolder", "lighter"]);
const FONT_SKIPPED = new Set([
  "normal",
  "small-caps",
  "ultra-condensed",
  "extra-condensed",
  "condensed",
  "semi-condensed",
  "semi-expanded",
  "expanded",
  "extra-expanded",
  "ultra-expanded",
]);
/**
 * `font: [style] [variant] [weight] [stretch] size[/line-height] family`.
 *
 * The leading keywords are optional and order-free, so they are consumed until a
 * token that is not one of them — that token is the size, and everything after
 * it is the family. A value with no family left over is not the shorthand (the
 * system-font keywords, `font: menu`) and expands to nothing.
 */
function expandFont(out, value) {
  const tokens = valueTokens(value);
  let index = 0;
  let style;
  let weight;
  while (index < tokens.length) {
    const token = tokens[index].toLowerCase();
    if (FONT_STYLES.has(token)) style = token;
    else if (FONT_WEIGHTS.has(token) || /^[1-9]00$/.test(token)) weight = token;
    else if (!FONT_SKIPPED.has(token)) break;
    index += 1;
  }
  const size = tokens[index];
  const family = tokens.slice(index + 1).join(" ");
  if (size === undefined || !family) return;
  const slash = findTopLevel(size, 0, "/");
  if (style !== undefined) out["font-style"] = style;
  if (weight !== undefined) out["font-weight"] = weight === "bold" ? "700" : weight;
  out["font-size"] = slash < 0 ? size : size.slice(0, slash);
  if (slash >= 0) out["line-height"] = size.slice(slash + 1);
  out["font-family"] = family;
}
const BORDER_STYLES = new Set([
  "none",
  "hidden",
  "dotted",
  "dashed",
  "solid",
  "double",
  "groove",
  "ridge",
  "inset",
  "outset",
]);
const BORDER_WIDTH_KEYWORDS = new Set(["thin", "medium", "thick"]);
const LENGTH = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[a-z%]+)?$/i;
function expandBorder(out, value) {
  for (const token of valueTokens(value)) {
    const lower = token.toLowerCase();
    if (BORDER_STYLES.has(lower)) out["border-style"] = lower;
    else if (BORDER_WIDTH_KEYWORDS.has(lower) || LENGTH.test(token)) out["border-width"] = token;
    else out["border-color"] = token;
  }
}
const BACKGROUND_REPEATS = new Set([
  "repeat",
  "no-repeat",
  "repeat-x",
  "repeat-y",
  "space",
  "round",
]);
const BACKGROUND_IGNORED = new Set([
  "scroll",
  "fixed",
  "local",
  "border-box",
  "padding-box",
  "content-box",
  "text",
]);
const BACKGROUND_POSITIONS = new Set(["left", "right", "top", "bottom", "center"]);
const BACKGROUND_IMAGE_FUNCTION =
  /^(?:-webkit-)?(?:repeating-)?(?:linear-gradient|radial-gradient|conic-gradient|url|image-set|cross-fade|element|paint|image)\(/i;
/**
 * `background: <layer>#, <final-layer>`.
 *
 * Only the last layer may carry the colour. The layout longhands are emitted
 * only when a layer actually spelled one, because the codec's absent-property
 * defaults are already the CSS initial values.
 */
function expandBackground(out, value) {
  const layers = splitTopLevel(value, ",");
  const images = [];
  const sizes = [];
  const positions = [];
  const repeats = [];
  let color;
  let sawLayout = false;
  for (let layer = 0; layer < layers.length; layer += 1) {
    const tokens = valueTokens(layers[layer]);
    let image;
    let repeat = "repeat";
    const placement = [];
    let size;
    let afterSlash = false;
    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (BACKGROUND_IMAGE_FUNCTION.test(token) || lower === "none") {
        image = token;
        continue;
      }
      if (BACKGROUND_REPEATS.has(lower)) {
        repeat = lower;
        sawLayout = true;
        continue;
      }
      if (BACKGROUND_IGNORED.has(lower)) continue;
      const slash = findTopLevel(token, 0, "/");
      if (slash >= 0) {
        const before = token.slice(0, slash);
        const after = token.slice(slash + 1);
        if (before) placement.push(before);
        size = after || undefined;
        afterSlash = true;
        sawLayout = true;
        continue;
      }
      if (afterSlash) {
        size = size === undefined ? token : `${size} ${token}`;
        continue;
      }
      if (BACKGROUND_POSITIONS.has(lower) || LENGTH.test(token)) {
        placement.push(token);
        sawLayout = true;
        continue;
      }
      if (layer === layers.length - 1) color = token;
    }
    // The final layer is where the colour lives, and a layer that is nothing but
    // that colour is left out of the image list entirely: emitting `none` for it
    // would read back as a real no-paint fill sitting under the stack.
    if (image === undefined && layer === layers.length - 1 && color !== undefined) continue;
    images.push(image ?? "none");
    sizes.push(size ?? "auto");
    positions.push(placement.length > 0 ? placement.join(" ") : "0% 0%");
    repeats.push(repeat);
  }
  if (color !== undefined) out["background-color"] = color;
  if (images.length === 0) return;
  out["background-image"] = images.join(", ");
  if (sawLayout) {
    out["background-size"] = sizes.join(", ");
    out["background-position"] = positions.join(", ");
    out["background-repeat"] = repeats.join(", ");
  }
}
/**
 * Multi-value `border-radius` normalised to the four-corner form.
 *
 * One and four values are already what the corner-radius reader accepts, and
 * rewriting them would change what a document the serializer wrote reads back
 * as, so those are left exactly as authored.
 */
function expandBorderRadius(out, value) {
  if (findTopLevel(value, 0, "/") >= 0) return;
  const parts = valueTokens(value);
  if (parts.length !== 2 && parts.length !== 3) return;
  const edges = edgeValues(parts);
  if (edges) out["border-radius"] = edges.join(" ");
}
const SHORTHANDS = {
  font: expandFont,
  border: expandBorder,
  background: expandBackground,
  "border-radius": expandBorderRadius,
  inset: (out, value) => expandEdges(out, value, ""),
  margin: (out, value) => expandEdges(out, value, "margin-"),
  padding: (out, value) => expandEdges(out, value, "padding-"),
  gap: (out, value) => {
    const parts = valueTokens(value);
    if (parts.length < 1 || parts.length > 2) return;
    out["row-gap"] = parts[0];
    out["column-gap"] = parts[1] ?? parts[0];
  },
};
const SHORTHAND_NAMES = Object.keys(SHORTHANDS);
function hasShorthand(declarations) {
  for (const name of SHORTHAND_NAMES) if (declarations[name] !== undefined) return true;
  return false;
}
/**
 * Expand one shorthand into the longhands the codec's readers look for.
 *
 * Returns undefined for a property this does not expand. The shorthand itself is
 * the caller's to keep — a consumer that reads it directly must still find it.
 */
export function expandCssShorthand(property, value) {
  const expand = SHORTHANDS[property];
  if (!expand) return undefined;
  const out = {};
  expand(out, value);
  return out;
}
/**
 * The properties whose only reader is the codec's `px`-suffixed length parser.
 *
 * CSS lets a zero length drop its unit, and a hand-authored `inset: 0` or
 * `left: 0` is the common spelling — but a bare `0` reads back as no value at
 * all, which is a layer with no geometry. Spelling it out is safe precisely
 * because these six are never read as a bare number the way `line-height` is.
 */
const ZERO_LENGTH_PROPERTIES = ["left", "top", "right", "bottom", "width", "height"];
function normalizeZeroLengths(out) {
  for (const property of ZERO_LENGTH_PROPERTIES) {
    if (out[property]?.trim() === "0") out[property] = "0px";
  }
}
const COLOR_UNSAFE = /[;{}"'\\]/;
/**
 * A `background-color` becomes the bottom `background-image` layer.
 *
 * The fill reader knows only `background-image`, and a CSS background colour
 * paints underneath every layer — which, because the codec's fill array is
 * bottom-to-top and a CSS layer list is top-to-bottom, is the list's last entry.
 * Without this a hand-authored `background: #111` is simply not painted.
 */
function synthesizeColorLayer(out) {
  const color = out["background-color"];
  if (color === undefined) return;
  const trimmed = color.trim();
  if (!trimmed || COLOR_UNSAFE.test(trimmed) || trimmed === "transparent") return;
  const layer = `linear-gradient(${trimmed}, ${trimmed})`;
  const image = out["background-image"];
  out["background-image"] = image === undefined ? layer : `${image}, ${layer}`;
}
const NO_VARIABLES = {};
const NO_RULES = [];
const NO_CLASSES = new Set();
/**
 * Index every `<style>` in `root` and return a resolver over the elements
 * beneath it.
 *
 * Per document, never shared: the memos are keyed by the nodes of this parse, so
 * a second document cannot read the first document's resolution.
 */
export function buildCssCascade(root) {
  const index = {
    byId: new Map(),
    byClass: new Map(),
    byTag: new Map(),
    unbucketed: [],
    count: 0,
  };
  const parents = new WeakMap();
  let order = 0;
  const nextOrder = () => {
    order += 1;
    return order;
  };
  const walk = (node) => {
    for (const child of node.children) {
      if (child.type !== "element") continue;
      if (node.type === "element") parents.set(child, node);
      if (child.tag === "style") {
        let source = "";
        for (const text of child.children) if (text.type === "text") source += text.value;
        if (source) parseStylesheetInto(source, index, nextOrder);
        continue;
      }
      walk(child);
    }
  };
  walk(root);
  const classCache = new WeakMap();
  const classesOf = (node) => {
    const cached = classCache.get(node);
    if (cached) return cached;
    const attribute = getAttribute(node, "class");
    if (!attribute) {
      classCache.set(node, NO_CLASSES);
      return NO_CLASSES;
    }
    const classes = new Set();
    for (const token of attribute.split(/\s+/)) if (token) classes.add(token);
    classCache.set(node, classes);
    return classes;
  };
  const matchesSimple = (simple, node) => {
    switch (simple.kind) {
      case "universal":
        return true;
      case "root":
        return node.tag === "html" || parents.get(node) === undefined;
      case "tag":
        return node.tag === simple.name;
      case "class":
        return classesOf(node).has(simple.name);
      case "id":
        return getAttribute(node, "id") === simple.name;
      case "attribute": {
        const value = getAttribute(node, simple.name);
        return value !== undefined && (simple.value === undefined || value === simple.value);
      }
    }
  };
  const matchesCompound = (compound, node) => {
    for (const simple of compound.simples) if (!matchesSimple(simple, node)) return false;
    return true;
  };
  // A descendant combinator retries the rest of the selector against every
  // ancestor, so without memoization a selector with k descendant compounds
  // costs O(depth^k) on the ancestor chain whenever its leftmost compound fails
  // — a 3 KB document took 18 seconds. Each (compound index, element) pair has
  // one answer, so caching them makes the whole match O(k x depth). Cleared per
  // `buildCssCascade`, alongside the rule and variable caches.
  const matchCache = new Map();
  const matchesFrom = (compounds, at, node) => {
    const compound = compounds[at];
    let byNode = matchCache.get(compound);
    if (!byNode) {
      byNode = new WeakMap();
      matchCache.set(compound, byNode);
    }
    const cached = byNode.get(node);
    if (cached !== undefined) return cached;
    const result = matchesFromUncached(compounds, at, node);
    byNode.set(node, result);
    return result;
  };
  const matchesFromUncached = (compounds, at, node) => {
    if (!matchesCompound(compounds[at], node)) return false;
    if (at === 0) return true;
    const parent = parents.get(node);
    if (compounds[at].combinator === "child") {
      return parent !== undefined && matchesFrom(compounds, at - 1, parent);
    }
    for (let ancestor = parent; ancestor; ancestor = parents.get(ancestor)) {
      if (matchesFrom(compounds, at - 1, ancestor)) return true;
    }
    return false;
  };
  const ruleCache = new WeakMap();
  const rulesFor = (node) => {
    const cached = ruleCache.get(node);
    if (cached) return cached;
    if (index.count === 0) {
      ruleCache.set(node, NO_RULES);
      return NO_RULES;
    }
    const matched = [];
    const consider = (candidates) => {
      if (!candidates) return;
      for (const rule of candidates) {
        if (matchesFrom(rule.compounds, rule.compounds.length - 1, node)) matched.push(rule);
      }
    };
    const id = getAttribute(node, "id");
    if (id !== undefined) consider(index.byId.get(id));
    for (const className of classesOf(node)) consider(index.byClass.get(className));
    consider(index.byTag.get(node.tag));
    consider(index.unbucketed);
    matched.sort((a, b) => a.specificity - b.specificity || a.order - b.order);
    ruleCache.set(node, matched);
    return matched;
  };
  const variableCache = new WeakMap();
  const variablesFor = (node) => {
    const cached = variableCache.get(node);
    if (cached) return cached;
    const parent = parents.get(node);
    const inherited = parent ? variablesFor(parent) : NO_VARIABLES;
    let own;
    for (const rule of rulesFor(node)) {
      if (!rule.custom) continue;
      for (const [property, value] of rule.custom) (own ??= {})[property] = value;
    }
    const inline = getAttribute(node, "style");
    if (inline?.includes("--")) {
      const declarations = parseStyleAttribute(inline);
      for (const property in declarations) {
        if (property.startsWith("--")) (own ??= {})[property] = declarations[property];
      }
    }
    const result = own ? { ...inherited, ...own } : inherited;
    variableCache.set(node, result);
    return result;
  };
  const apply = (out, property, value, variables, hasVariables) => {
    const resolved =
      hasVariables && value.includes("var(")
        ? resolveVars(value, variables, [], 0, { remaining: MAX_VAR_SUBSTITUTIONS })
        : value;
    out[property] = resolved;
    SHORTHANDS[property]?.(out, resolved);
  };
  /**
   * The sheet's contribution, interned by (variable scope, matched rule set).
   *
   * A design file's objects carry the same handful of utility classes over and
   * over, so a few thousand of them resolve the same rules to the same
   * declarations; this turns that into one resolution plus a copy. The variable
   * scope is part of the key because two elements matching the same rules can
   * still resolve `var()` differently — and it can be a WeakMap key because
   * `variablesFor` hands the same record to every element that inherits it.
   */
  const resolvedSheets = new WeakMap();
  const sheetDeclarations = (node, variables, hasVariables) => {
    const rules = rulesFor(node);
    if (rules.length === 0) return undefined;
    let byRules = resolvedSheets.get(variables);
    if (!byRules) {
      byRules = new Map();
      resolvedSheets.set(variables, byRules);
    }
    let key = "";
    for (const rule of rules) key += `${rule.order},`;
    let resolved = byRules.get(key);
    if (!resolved) {
      resolved = {};
      for (const rule of rules) {
        for (const [property, value] of rule.declarations) {
          apply(resolved, property, value, variables, hasVariables);
        }
      }
      byRules.set(key, resolved);
    }
    return resolved;
  };
  return {
    empty: index.count === 0,
    declarationsFor(node, ...overlays) {
      const variables = variablesFor(node);
      // Identity, not emptiness: an element with no custom property of its own
      // inherits the shared empty record, so a document that defines none never
      // pays for the `var(` scan over every `data:` image fill in the file.
      const hasVariables = variables !== NO_VARIABLES;
      const sheet = sheetDeclarations(node, variables, hasVariables);
      const out = sheet ? { ...sheet } : {};
      for (const overlay of overlays) {
        if (!overlay) continue;
        // Nothing to resolve and nothing to expand is the overwhelmingly common
        // case for an overlay — a native copy beats walking it property by
        // property, and the check that it applies is a fixed eight lookups.
        if (!hasVariables && !hasShorthand(overlay)) {
          Object.assign(out, overlay);
          continue;
        }
        for (const property in overlay) {
          apply(out, property, overlay[property], variables, hasVariables);
        }
      }
      normalizeZeroLengths(out);
      synthesizeColorLayer(out);
      return out;
    },
  };
}
