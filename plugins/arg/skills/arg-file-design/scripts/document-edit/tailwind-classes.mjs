// Generated from sdk/typescript/src/documents/tailwind-classes.ts. Do not edit directly.
/**
 * A bidirectional table between exact CSS declarations and Tailwind default-scale
 * utility classes.
 *
 * The rule is exactness in both directions: a class is emitted only when its
 * declaration is reproduced byte-identically by `fromTailwind`, so a value one
 * step off the default scale falls to inline `style` rather than being rounded
 * onto the nearest utility. That keeps `.design` markup reading like hand-written
 * Tailwind without the codec ever quietly changing a number.
 *
 * `buildUtilityStylesheet` emits the rules for the classes a document actually
 * uses, so the saved file renders in a plain browser with no Tailwind build.
 */
import { BLEND_MODES } from "./css-values.mjs";
function scale(property, entries, prefix) {
  return Object.entries(entries).map(([suffix, value]) => ({
    className: prefix(suffix),
    property,
    value,
  }));
}
const OPACITY_STEPS = {};
for (let step = 0; step <= 100; step += 5) OPACITY_STEPS[String(step)] = String(step / 100);
const UTILITY_ENTRIES = [
  { className: "absolute", property: "position", value: "absolute" },
  { className: "relative", property: "position", value: "relative" },
  { className: "hidden", property: "display", value: "none" },
  { className: "block", property: "display", value: "block" },
  { className: "flex", property: "display", value: "flex" },
  { className: "overflow-hidden", property: "overflow", value: "hidden" },
  { className: "overflow-visible", property: "overflow", value: "visible" },
  { className: "isolate", property: "isolation", value: "isolate" },
  { className: "italic", property: "font-style", value: "italic" },
  { className: "not-italic", property: "font-style", value: "normal" },
  { className: "underline", property: "text-decoration-line", value: "underline" },
  { className: "line-through", property: "text-decoration-line", value: "line-through" },
  { className: "no-underline", property: "text-decoration-line", value: "none" },
  { className: "whitespace-pre", property: "white-space", value: "pre" },
  { className: "whitespace-pre-wrap", property: "white-space", value: "pre-wrap" },
  ...scale(
    "border-radius",
    {
      none: "0px",
      sm: "2px",
      md: "6px",
      lg: "8px",
      xl: "12px",
      "2xl": "16px",
      "3xl": "24px",
      full: "9999px",
    },
    (suffix) => `rounded-${suffix}`,
  ),
  ...scale("opacity", OPACITY_STEPS, (suffix) => `opacity-${suffix}`),
  ...scale(
    "font-weight",
    {
      thin: "100",
      extralight: "200",
      light: "300",
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
      black: "900",
    },
    (suffix) => `font-${suffix}`,
  ),
  ...scale(
    "text-align",
    { left: "left", center: "center", right: "right", justify: "justify" },
    (suffix) => `text-${suffix}`,
  ),
  ...scale(
    "align-items",
    { start: "flex-start", center: "center", end: "flex-end" },
    (suffix) => `items-${suffix}`,
  ),
  ...scale(
    "justify-content",
    { start: "flex-start", center: "center", end: "flex-end" },
    (suffix) => `justify-${suffix}`,
  ),
  ...BLEND_MODES.map((mode) => ({
    className: `mix-blend-${mode}`,
    property: "mix-blend-mode",
    value: mode,
  })),
];
const BY_CLASS = new Map();
// Nested rather than keyed on `property|value`: `toTailwind` runs on every
// declaration of every node, and building a joined key allocated a string per
// lookup for no benefit over two map hits.
const BY_DECLARATION = new Map();
for (const entry of UTILITY_ENTRIES) {
  // A duplicate class name would make the table non-invertible, so first wins
  // in both directions and the table stays a bijection over what it covers.
  if (!BY_CLASS.has(entry.className)) BY_CLASS.set(entry.className, entry);
  let values = BY_DECLARATION.get(entry.property);
  if (!values) {
    values = new Map();
    BY_DECLARATION.set(entry.property, values);
  }
  if (!values.has(entry.value)) values.set(entry.value, entry.className);
}
/** Split declarations into the ones a utility class expresses exactly and the rest. */
export function toTailwind(declarations) {
  const classes = [];
  const style = {};
  for (const property in declarations) {
    const value = declarations[property];
    const className = BY_DECLARATION.get(property)?.get(value);
    if (className) classes.push(className);
    else style[property] = value;
  }
  return { classes, style };
}
/** The declarations a class list implies. Unknown classes are ignored. */
export function fromTailwind(classAttribute) {
  const declarations = {};
  if (!classAttribute) return declarations;
  for (const token of classAttribute.split(/\s+/)) {
    const entry = BY_CLASS.get(token);
    if (entry) declarations[entry.property] = entry.value;
  }
  return declarations;
}
/** Every class name the table can emit, for stylesheet generation and tests. */
export function utilityClassNames() {
  return [...BY_CLASS.keys()];
}
function escapeClassSelector(className) {
  // A leading digit or a `:`/`.`/`/` in a utility name needs escaping in a
  // selector; the default scale only ever produces a leading digit (`2xl`).
  return className.replace(/^(\d)/, "\\3$1 ").replace(/([:.\\/])/g, "\\$1");
}
/**
 * A minimal stylesheet defining only the utilities used, plus the structural
 * primitives. `.hidden` is emitted last so it wins over `.arg-text`'s `display`
 * at equal specificity — an invisible text object must not lay itself out.
 */
export function buildUtilityStylesheet(usedClasses) {
  const used = new Set(usedClasses);
  const rules = [
    "*,::before,::after{box-sizing:border-box}",
    "body{margin:0;position:relative;overflow:hidden}",
    "[data-arg-artboard]{position:absolute}",
    ".arg-text{display:flex;flex-direction:column;margin:0}",
    ".arg-shape{overflow:visible}",
  ];
  for (const entry of UTILITY_ENTRIES) {
    if (!used.has(entry.className) || entry.className === "hidden") continue;
    rules.push(`.${escapeClassSelector(entry.className)}{${entry.property}:${entry.value}}`);
  }
  if (used.has("hidden")) rules.push(".hidden{display:none}");
  return rules.join("\n");
}
