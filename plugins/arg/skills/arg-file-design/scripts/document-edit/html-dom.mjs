// Generated from sdk/typescript/src/documents/html-dom.ts. Do not edit directly.
/**
 * A dependency-free HTML tokenizer and minimal DOM.
 *
 * `.design` bytes are read by four runtimes — the browser editor, this Node SDK
 * (and the `.mjs` copies `pnpm gen:skill-editors` emits into `skills/`), the
 * Workers backend, and the Go CLI's render harness. `DOMParser` exists in only
 * one of them and the monorepo carries no HTML parser dependency, so the codec
 * brings its own.
 *
 * The posture is `@arg/cad`'s: dependency-free, repair-forward, never throws.
 * Malformed markup recovers (a stray close tag is dropped, an unclosed element
 * is closed at EOF, a lone `<` is text) rather than failing the read — a design
 * file that a human hand-edited into an odd state must still open.
 *
 * This is not a spec-complete HTML parser. It handles the subset the codec
 * emits plus reasonable hand edits: elements, quoted/unquoted/bare attributes,
 * text, comments, doctypes, void elements and raw-text elements. It does not
 * implement the spec's implied-end-tag rules (`<p>a<p>b` nests rather than
 * siblings), tag-omission, or foster parenting.
 */
/** Elements that never have children or a closing tag. */
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
/** Elements whose content is consumed verbatim, entities included. */
const RAW_TEXT_TAGS = new Set(["script", "style"]);
/** Elements whose content is consumed verbatim but entity-decoded. */
const ESCAPABLE_RAW_TEXT_TAGS = new Set(["title", "textarea"]);
/**
 * The offset of a raw-text element's closing tag, as an index into `source`.
 *
 * Case-folding one candidate at a time rather than lowercasing the whole source
 * is what makes the result an index into the ORIGINAL string. `toLowerCase` is
 * not length-preserving — U+0130 ("İ", an ordinary letter in Turkish text)
 * folds to two code units — so an offset found in a lowercased copy drifts past
 * the real close tag once any such character precedes it, and the element's
 * body is sliced too long: a `<script>` full of JSON picks up a stray `<` and
 * stops parsing. It also avoids allocating a copy of the whole document per
 * raw-text element, which was quadratic on a page with many `<style>` blocks.
 */
function indexOfCloser(source, closer, from) {
  for (
    let probe = source.indexOf("</", from);
    probe >= 0;
    probe = source.indexOf("</", probe + 2)
  ) {
    if (source.slice(probe, probe + closer.length).toLowerCase() === closer) return probe;
  }
  return -1;
}
const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
function isAsciiAlpha(code) {
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
}
function isWhitespace(char) {
  return char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f";
}
/**
 * Decode the entity forms the serializer emits plus the handful a hand editor
 * is likely to type. An unrecognised `&…;` is left verbatim, which is both what
 * browsers do for unknown references and the repair-forward answer.
 */
export function decodeEntities(text) {
  if (!text.includes("&")) return text;
  return text.replace(/&(#[Xx][0-9A-Fa-f]+|#\d+|[A-Za-z][A-Za-z0-9]*);/g, (match, body) => {
    if (body.startsWith("#")) {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}
/** Characters that need escaping in a text run / in an attribute value. */
const TEXT_NEEDS_ESCAPE = /[&<>\r]/;
const ATTRIBUTE_NEEDS_ESCAPE = /[&"<>\r\n\t]/;
const TEXT_ESCAPE_ALL = /[&<>\r]/g;
const ATTRIBUTE_ESCAPE_ALL = /[&"<>\r\n\t]/g;
// A literal CR is normalised to LF by every HTML parser's input stream, so text
// carrying one only survives as a numeric reference.
const TEXT_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\r": "&#13;",
};
const ATTRIBUTE_ESCAPES = {
  ...TEXT_ESCAPES,
  '"': "&quot;",
  "\n": "&#10;",
  "\t": "&#9;",
};
/**
 * Escape a run of text for a normal (non-raw-text) element body.
 *
 * One test, then one pass. A `data:` image fill is a single ~165 KB value, and a
 * chain of `.replace` calls rebuilt the whole string once per escaped character
 * class whether or not that class occurred in it.
 */
export function escapeHtmlText(text) {
  return TEXT_NEEDS_ESCAPE.test(text)
    ? text.replace(TEXT_ESCAPE_ALL, (char) => TEXT_ESCAPES[char])
    : text;
}
/** Escape a value for a double-quoted attribute. */
export function escapeHtmlAttribute(value) {
  return ATTRIBUTE_NEEDS_ESCAPE.test(value)
    ? value.replace(ATTRIBUTE_ESCAPE_ALL, (char) => ATTRIBUTE_ESCAPES[char])
    : value;
}
function readOpenTag(source, start) {
  let index = start + 1;
  let name = "";
  while (index < source.length) {
    const char = source[index];
    if (isWhitespace(char) || char === ">" || char === "/") break;
    name += char;
    index += 1;
  }
  if (!name) return null;
  const attributes = [];
  let selfClosing = false;
  while (index < source.length) {
    while (index < source.length && isWhitespace(source[index])) index += 1;
    const char = source[index];
    if (char === undefined) break;
    if (char === ">") {
      index += 1;
      break;
    }
    if (char === "/") {
      index += 1;
      if (source[index] === ">") {
        selfClosing = true;
        index += 1;
        break;
      }
      continue;
    }
    let attrName = "";
    while (index < source.length) {
      const next = source[index];
      if (isWhitespace(next) || next === "=" || next === ">" || next === "/") break;
      attrName += next;
      index += 1;
    }
    if (!attrName) {
      // Nothing consumable here — step over the byte so a malformed tag can't
      // spin the loop.
      index += 1;
      continue;
    }
    while (index < source.length && isWhitespace(source[index])) index += 1;
    let value = "";
    if (source[index] === "=") {
      index += 1;
      while (index < source.length && isWhitespace(source[index])) index += 1;
      const quote = source[index];
      if (quote === '"' || quote === "'") {
        index += 1;
        const close = source.indexOf(quote, index);
        const stop = close < 0 ? source.length : close;
        value = source.slice(index, stop);
        index = close < 0 ? source.length : close + 1;
      } else {
        const from = index;
        while (index < source.length) {
          const next = source[index];
          if (isWhitespace(next) || next === ">") break;
          index += 1;
        }
        value = source.slice(from, index);
      }
    }
    attributes.push({ name: attrName.toLowerCase(), value: decodeEntities(value) });
  }
  return { tag: name.toLowerCase(), attributes, selfClosing, end: index };
}
/**
 * Parse an HTML source string into a document node. Never throws: anything the
 * tokenizer cannot make sense of becomes text.
 */
export function parseHtml(source) {
  const document = { type: "document", children: [] };
  const stack = [];
  const push = (node) => {
    const parent = stack[stack.length - 1];
    (parent ? parent.children : document.children).push(node);
  };
  const pushText = (raw) => {
    if (!raw) return;
    push({ type: "text", value: decodeEntities(raw) });
  };
  let index = 0;
  while (index < source.length) {
    const lt = source.indexOf("<", index);
    if (lt < 0) {
      pushText(source.slice(index));
      break;
    }
    if (lt > index) pushText(source.slice(index, lt));
    if (source.startsWith("<!--", lt)) {
      const close = source.indexOf("-->", lt + 4);
      const stop = close < 0 ? source.length : close;
      push({ type: "comment", value: source.slice(lt + 4, stop) });
      index = close < 0 ? source.length : close + 3;
      continue;
    }
    if (source.startsWith("<!", lt)) {
      const close = source.indexOf(">", lt + 2);
      const stop = close < 0 ? source.length : close;
      push({ type: "doctype", value: source.slice(lt + 2, stop) });
      index = close < 0 ? source.length : close + 1;
      continue;
    }
    if (source.startsWith("</", lt)) {
      const close = source.indexOf(">", lt + 2);
      const stop = close < 0 ? source.length : close;
      const name = source
        .slice(lt + 2, stop)
        .trim()
        .toLowerCase();
      index = close < 0 ? source.length : close + 1;
      // Close the nearest matching ancestor; a close tag with no open element
      // is dropped rather than reparenting everything after it.
      for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
        if (stack[depth].tag === name) {
          stack.length = depth;
          break;
        }
      }
      continue;
    }
    if (!isAsciiAlpha(source.charCodeAt(lt + 1))) {
      pushText("<");
      index = lt + 1;
      continue;
    }
    const open = readOpenTag(source, lt);
    if (!open) {
      pushText("<");
      index = lt + 1;
      continue;
    }
    const element = {
      type: "element",
      tag: open.tag,
      attributes: open.attributes,
      children: [],
    };
    push(element);
    index = open.end;
    if (open.selfClosing || VOID_TAGS.has(open.tag)) continue;
    const raw = RAW_TEXT_TAGS.has(open.tag);
    const escapableRaw = ESCAPABLE_RAW_TEXT_TAGS.has(open.tag);
    if (raw || escapableRaw) {
      const closer = `</${open.tag}`;
      const at = indexOfCloser(source, closer, index);
      const stop = at < 0 ? source.length : at;
      const body = source.slice(index, stop);
      if (body) element.children.push({ type: "text", value: raw ? body : decodeEntities(body) });
      if (at < 0) {
        index = source.length;
      } else {
        const close = source.indexOf(">", at);
        index = close < 0 ? source.length : close + 1;
      }
      continue;
    }
    stack.push(element);
  }
  return document;
}
function serializeChildren(node, raw) {
  let out = "";
  for (const child of node.children) {
    out += raw && child.type === "text" ? child.value : serializeHtml(child);
  }
  return out;
}
/** Serialize a node back to HTML source. */
export function serializeHtml(node) {
  switch (node.type) {
    case "document":
      return serializeChildren(node, false);
    case "text":
      return escapeHtmlText(node.value);
    case "comment":
      return `<!--${node.value}-->`;
    case "doctype":
      return `<!${node.value}>`;
    case "element": {
      let out = `<${node.tag}`;
      for (const attribute of node.attributes) {
        out += attribute.value
          ? ` ${attribute.name}="${escapeHtmlAttribute(attribute.value)}"`
          : ` ${attribute.name}=""`;
      }
      if (VOID_TAGS.has(node.tag)) return `${out} />`;
      out += ">";
      out += serializeChildren(node, RAW_TEXT_TAGS.has(node.tag));
      return `${out}</${node.tag}>`;
    }
  }
}
/** Build an element, dropping attributes whose value is `undefined`. */
export function element(tag, attributes, children = []) {
  const list = [];
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined) list.push({ name, value });
  }
  return { type: "element", tag, attributes: list, children };
}
export function text(value) {
  return { type: "text", value };
}
export function getAttribute(node, name) {
  for (const attribute of node.attributes) {
    if (attribute.name === name) return attribute.value;
  }
  return undefined;
}
export function hasAttribute(node, name) {
  return node.attributes.some((attribute) => attribute.name === name);
}
export function setAttribute(node, name, value) {
  const existing = node.attributes.find((attribute) => attribute.name === name);
  if (existing) existing.value = value;
  else node.attributes.push({ name, value });
}
/** Direct element children, in document order. */
export function childElements(node) {
  return node.children.filter((child) => child.type === "element");
}
/** Depth-first search for the first element matching `predicate`. */
export function findElement(node, predicate) {
  for (const child of node.children) {
    if (child.type !== "element") continue;
    if (predicate(child)) return child;
    const nested = findElement(child, predicate);
    if (nested) return nested;
  }
  return undefined;
}
/** Depth-first search for the first element with the given tag. */
export function findByTag(node, tag) {
  return findElement(node, (candidate) => candidate.tag === tag);
}
/** Concatenated text of a node and its descendants. */
export function textContent(node) {
  if (node.type === "text") return node.value;
  if (node.type !== "element" && node.type !== "document") return "";
  let out = "";
  for (const child of node.children) out += textContent(child);
  return out;
}
