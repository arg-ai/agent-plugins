// Generated from sdk/typescript/src/documents/layout.ts. Do not edit directly.
/**
 * Flex and grid layout for `.design`.
 *
 * The exact HTML projection uses CSS layout but its canvas is SVG, and SVG has no
 * box-layout engine — every object paints at an absolute `frame` in document
 * space. So a layout container's children have *computed* frames, and this
 * module is the single place that geometry is derived, mirroring `@arg/cad`'s
 * `evaluate.ts`. Everything downstream (renderer, drag, snapping, export) keeps
 * consuming frames and learns no new concept.
 *
 * Pure and synchronous, so the SVG export path can call it. Every input is
 * untrusted — a canvas-owned HTML projection can be hand-authored — so a
 * malformed track list, a negative gap or a NaN clamps to a documented default
 * rather than throwing.
 *
 * Known divergences from a real browser are marked `// DIVERGENCE:` below.
 */
import { isJsonObject } from "./common.mjs";
export const LAYOUT_MODES = ["flex", "grid"];
export const LAYOUT_DIRECTIONS = ["row", "column", "row-reverse", "column-reverse"];
export const LAYOUT_WRAPS = ["nowrap", "wrap", "wrap-reverse"];
export const LAYOUT_JUSTIFY_VALUES = [
  "start",
  "center",
  "end",
  "space-between",
  "space-around",
  "space-evenly",
];
export const LAYOUT_ALIGN_VALUES = ["start", "center", "end", "stretch"];
export const LAYOUT_AUTO_FLOWS = ["row", "column"];
// ---------- normalization ----------
/**
 * Free space this small is treated as none.
 *
 * `applyDesignLayout` is idempotent only because a solved container has no free
 * space left to distribute; float error in that distribution leaves a residue
 * of a few ulps, which without a threshold would nudge every size again on the
 * next solve and never settle.
 */
const EPSILON = 1e-9;
/** Placement scans are bounded so a pathological span can never spin forever. */
const MAX_TRACKS = 4096;
/**
 * Cells one grid item may occupy.
 *
 * Bounding each axis at `MAX_TRACKS` does not bound their PRODUCT, and the
 * occupancy set is walked cell by cell: two items spanning 4000x4000 ask for
 * 32M entries, which takes ~15s and then exceeds V8's maximum `Set` size. The
 * throw escaped `parseDesignHtml` as a blank document — silently discarding the
 * user's artwork — and escaped `stringifyDesign` entirely, so a save could
 * fail. A span past this is clamped, which is a wrong layout for a document no
 * browser would render either.
 */
const MAX_GRID_CELLS_PER_ITEM = 65536;
/** The same bound across a whole grid, so many items cannot sum past it. */
const MAX_GRID_CELLS_PER_CONTAINER = 1_048_576;
function finiteNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function nonNegative(value, fallback) {
  const parsed = finiteNumber(value, fallback);
  return parsed > 0 ? parsed : 0;
}
function readEnum(allowed, value, fallback) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}
function readPadding(value) {
  const source = isJsonObject(value) ? value : {};
  return {
    top: nonNegative(source.top, 0),
    right: nonNegative(source.right, 0),
    bottom: nonNegative(source.bottom, 0),
    left: nonNegative(source.left, 0),
  };
}
function readTrackList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => typeof entry === "string");
}
function normalizeLayout(layout) {
  const source = isJsonObject(layout) ? layout : {};
  return {
    mode: readEnum(LAYOUT_MODES, source.mode, "flex"),
    direction: readEnum(LAYOUT_DIRECTIONS, source.direction, "row"),
    wrap: readEnum(LAYOUT_WRAPS, source.wrap, "nowrap"),
    justify: readEnum(LAYOUT_JUSTIFY_VALUES, source.justify, "start"),
    // CSS's initial `align-items: normal` behaves as stretch, and the codec
    // omits a default-valued field, so any other default here would make a
    // browser and the canvas disagree about a container that sets nothing.
    align: readEnum(LAYOUT_ALIGN_VALUES, source.align, "stretch"),
    alignContent: readEnum(LAYOUT_JUSTIFY_VALUES, source.alignContent, "start"),
    rowGap: nonNegative(source.rowGap, 0),
    columnGap: nonNegative(source.columnGap, 0),
    padding: readPadding(source.padding),
    columns: readTrackList(source.columns),
    rows: readTrackList(source.rows),
    autoFlow: readEnum(LAYOUT_AUTO_FLOWS, source.autoFlow, "row"),
  };
}
function normalizeItem(input, index) {
  const raw = input === undefined || input === null ? undefined : input.item;
  const source = isJsonObject(raw) ? raw : {};
  const basis = source.basis;
  const alignSelf = source.alignSelf;
  return {
    index,
    width: nonNegative(input?.width, 0),
    height: nonNegative(input?.height, 0),
    grow: nonNegative(source.grow, 0),
    shrink: nonNegative(source.shrink, 1),
    basis: typeof basis === "number" && Number.isFinite(basis) ? Math.max(0, basis) : "auto",
    align:
      typeof alignSelf === "string" && LAYOUT_ALIGN_VALUES.includes(alignSelf) ? alignSelf : null,
    order: finiteNumber(source.order, 0),
    column: typeof source.column === "string" ? source.column : "",
    row: typeof source.row === "string" ? source.row : "",
  };
}
/** Placement order: by `order`, ties keeping document order, as CSS does. */
function inOrder(items) {
  return [...items].sort((a, b) => a.order - b.order || a.index - b.index);
}
// ---------- shared distribution ----------
/**
 * Start offsets for a run of boxes distributed along one axis.
 *
 * Shared by every axis that has a distribution keyword — flex items on the main
 * axis, wrapped flex lines, grid columns and grid rows — so the six values
 * cannot mean one thing in flex and another in grid.
 */
function distributePositions(sizes, gap, extent, mode) {
  const count = sizes.length;
  if (count === 0) return [];
  let used = gap * (count - 1);
  for (const size of sizes) used += size;
  const free = extent - used;
  let offset = 0;
  let spacing = gap;
  // With not enough room CSS falls back rather than overflowing both edges:
  // space-between packs at the start, space-around and space-evenly centre.
  const overflowing = free < -EPSILON;
  const resolved =
    overflowing && mode === "space-between"
      ? "start"
      : overflowing && (mode === "space-around" || mode === "space-evenly")
        ? "center"
        : mode;
  if (resolved === "center") offset = free / 2;
  else if (resolved === "end") offset = free;
  else if (resolved === "space-between") {
    if (count > 1) spacing = gap + free / (count - 1);
  } else if (resolved === "space-around") {
    offset = free / (count * 2);
    spacing = gap + free / count;
  } else if (resolved === "space-evenly") {
    offset = free / (count + 1);
    spacing = gap + free / (count + 1);
  }
  const positions = [];
  let cursor = offset;
  for (let index = 0; index < count; index += 1) {
    positions.push(cursor);
    cursor += sizes[index] + spacing;
  }
  return positions;
}
/** Offset of a box of `size` inside a `extent`-long slot. */
function alignOffset(align, size, extent) {
  if (align === "center") return (extent - size) / 2;
  if (align === "end") return extent - size;
  return 0;
}
/**
 * CSS 2.1 §9.7 "resolving flexible lengths", minus the max-size clamp — the
 * model has no min/max size properties, so the only violation an item can
 * commit is shrinking past zero.
 *
 * Running the real freeze-and-redistribute loop rather than a single pass is
 * also what makes the solver idempotent: it leaves the line with exactly zero
 * free space, so solving the written-back sizes again changes nothing.
 */
function resolveFlexibleLengths(line, contentMain, gap) {
  const totalGap = gap * Math.max(0, line.length - 1);
  let sumBase = 0;
  for (const entry of line) sumBase += entry.base;
  const initialFree = contentMain - totalGap - sumBase;
  for (const entry of line) {
    entry.main = entry.base;
    entry.frozen = false;
  }
  if (Math.abs(initialFree) <= EPSILON) return;
  const growing = initialFree > 0;
  for (const entry of line) {
    if ((growing ? entry.item.grow : entry.item.shrink) <= 0) entry.frozen = true;
  }
  for (let pass = 0; pass <= line.length; pass += 1) {
    const unfrozen = line.filter((entry) => !entry.frozen);
    if (unfrozen.length === 0) return;
    let used = totalGap;
    for (const entry of line) used += entry.frozen ? entry.main : entry.base;
    let remaining = contentMain - used;
    let sumFactors = 0;
    for (const entry of unfrozen) sumFactors += growing ? entry.item.grow : entry.item.shrink;
    if (sumFactors <= 0) return;
    // A total flex factor below 1 distributes only that fraction of the space,
    // which is what makes `flex-grow: 0.5` grow by half the free space.
    if (sumFactors < 1) {
      const partial = initialFree * sumFactors;
      if (Math.abs(partial) < Math.abs(remaining)) remaining = partial;
    }
    let violation = 0;
    if (growing) {
      for (const entry of unfrozen) {
        entry.main = entry.base + (remaining * entry.item.grow) / sumFactors;
      }
    } else {
      // The shrink factor is weighted by the base size, so a large item gives
      // up more than a small one with the same `flex-shrink`.
      let scaledTotal = 0;
      for (const entry of unfrozen) scaledTotal += entry.item.shrink * entry.base;
      if (scaledTotal <= 0) return;
      for (const entry of unfrozen) {
        const share = (entry.item.shrink * entry.base) / scaledTotal;
        const unclamped = entry.base - Math.abs(remaining) * share;
        entry.main = Math.max(0, unclamped);
        violation += entry.main - unclamped;
      }
    }
    if (violation <= EPSILON) {
      for (const entry of unfrozen) entry.frozen = true;
      return;
    }
    // Only the items that hit the zero floor are frozen; the rest take another
    // pass over the space those could not absorb.
    for (const entry of unfrozen) {
      if (entry.main <= EPSILON) entry.frozen = true;
      else entry.main = entry.base;
    }
  }
}
function solveFlex(layout, contentWidth, contentHeight, items, rects) {
  const horizontal = layout.direction === "row" || layout.direction === "row-reverse";
  const reverseMain = layout.direction === "row-reverse" || layout.direction === "column-reverse";
  const reverseCross = layout.wrap === "wrap-reverse";
  const contentMain = horizontal ? contentWidth : contentHeight;
  const contentCross = horizontal ? contentHeight : contentWidth;
  // The gaps are physical, exactly as CSS means them: the horizontal gap is the
  // one between items in a `row` container and the one between lines in a
  // `column` container.
  const mainGap = horizontal ? layout.columnGap : layout.rowGap;
  const crossGap = horizontal ? layout.rowGap : layout.columnGap;
  const resolved = inOrder(items).map((item) => {
    const authoredMain = horizontal ? item.width : item.height;
    const base = item.basis === "auto" ? authoredMain : item.basis;
    return {
      item,
      base,
      main: base,
      cross: horizontal ? item.height : item.width,
      align: item.align ?? layout.align,
      frozen: false,
    };
  });
  const lines = [];
  if (layout.wrap === "nowrap" || resolved.length === 0) {
    if (resolved.length > 0) lines.push(resolved);
  } else {
    let current = [];
    let used = 0;
    for (const entry of resolved) {
      const next = current.length === 0 ? entry.base : used + mainGap + entry.base;
      if (current.length > 0 && next > contentMain + EPSILON) {
        lines.push(current);
        current = [entry];
        used = entry.base;
        continue;
      }
      current.push(entry);
      used = next;
    }
    if (current.length > 0) lines.push(current);
  }
  const lineCrossSizes = [];
  for (const line of lines) {
    resolveFlexibleLengths(line, contentMain, mainGap);
    if (layout.wrap === "nowrap") {
      // A single-line container's line fills the container's cross size, so
      // `stretch` reaches the container edge even when the items are shorter.
      lineCrossSizes.push(contentCross);
      continue;
    }
    let tallest = 0;
    for (const entry of line) tallest = Math.max(tallest, entry.cross);
    lineCrossSizes.push(tallest);
  }
  const linePositions =
    layout.wrap === "nowrap"
      ? lines.map(() => 0)
      : distributePositions(lineCrossSizes, crossGap, contentCross, layout.alignContent);
  lines.forEach((line, lineIndex) => {
    const lineCross = lineCrossSizes[lineIndex];
    const lineStart = linePositions[lineIndex];
    const mainSizes = line.map((entry) => entry.main);
    const mainPositions = distributePositions(mainSizes, mainGap, contentMain, layout.justify);
    line.forEach((entry, index) => {
      const crossSize = entry.align === "stretch" ? lineCross : entry.cross;
      const logicalMain = mainPositions[index];
      const logicalCross = lineStart + alignOffset(entry.align, crossSize, lineCross);
      // Reversing mirrors the axis rather than the item list, which is what
      // makes `justify: start` pack against the far edge as CSS does.
      const main = reverseMain ? contentMain - logicalMain - entry.main : logicalMain;
      const cross = reverseCross ? contentCross - logicalCross - crossSize : logicalCross;
      rects[entry.item.index] = horizontal
        ? { x: main, y: cross, width: entry.main, height: crossSize }
        : { x: cross, y: main, width: crossSize, height: entry.main };
    });
  });
}
const AUTO_TRACK = { min: { kind: "auto" }, max: { kind: "auto" } };
function parseTrackMax(text) {
  const value = text.trim().toLowerCase();
  if (value === "auto" || value === "min-content" || value === "max-content")
    return { kind: "auto" };
  if (value.endsWith("fr")) {
    const parsed = Number(value.slice(0, -2));
    return Number.isFinite(parsed) && parsed >= 0 ? { kind: "fr", value: parsed } : null;
  }
  if (value.endsWith("px")) {
    const parsed = Number(value.slice(0, -2));
    return Number.isFinite(parsed) ? { kind: "px", value: Math.max(0, parsed) } : null;
  }
  return null;
}
/**
 * One CSS track sizing function.
 *
 * DIVERGENCE: percentages, `repeat()`, `fit-content()` and named lines are not
 * supported in this pass; per the format contract an unrecognised track falls
 * back to `auto`. `min-content`/`max-content` collapse to `auto` too, because
 * the solver cannot measure content.
 */
function parseTrack(text) {
  const value = text.trim();
  const minmax = /^minmax\(([^,]+),(.+)\)$/i.exec(value);
  if (minmax) {
    const min = parseTrackMax(minmax[1]);
    const max = parseTrackMax(minmax[2]);
    // An `fr` minimum is invalid CSS; it degrades to the intrinsic minimum.
    const resolvedMin = min && min.kind === "px" ? min : { kind: "auto" };
    return { min: resolvedMin, max: max ?? { kind: "auto" } };
  }
  const size = parseTrackMax(value);
  if (!size) return AUTO_TRACK;
  if (size.kind === "px") return { min: size, max: size };
  // `1fr` is `minmax(auto, 1fr)`. That `auto` minimum is a MIN-CONTENT floor in
  // CSS, and this solver has no intrinsic sizing, so `sizeTracks` deliberately
  // takes no floor from the items in a flexible track — see the note there.
  return { min: { kind: "auto" }, max: size };
}
const AUTO_LINE = { start: null, span: 1 };
function parseLineToken(token) {
  const value = token.trim().toLowerCase();
  if (!value || value === "auto") return { line: null, span: null };
  const span = /^span\s+(\d+)$/.exec(value);
  if (span) return { line: null, span: Math.max(1, Number(span[1])) };
  if (/^-?\d+$/.test(value)) {
    const parsed = Number(value);
    // DIVERGENCE: a negative line counts back from the end of the explicit
    // grid, which needs a track count the auto-placement has not fixed yet;
    // it is treated as auto instead.
    return { line: parsed > 0 ? parsed : null, span: null };
  }
  return { line: null, span: null };
}
/** A `grid-column` / `grid-row` value as a zero-based start plus a span. */
function parseGridLine(text) {
  if (!text.trim()) return AUTO_LINE;
  const parts = text.split("/");
  if (parts.length > 2) return AUTO_LINE;
  const first = parseLineToken(parts[0]);
  if (parts.length === 1) {
    if (first.line !== null) return { start: first.line - 1, span: 1 };
    if (first.span !== null) return { start: null, span: first.span };
    return AUTO_LINE;
  }
  const second = parseLineToken(parts[1]);
  if (first.line !== null) {
    const start = first.line - 1;
    if (second.span !== null) return { start, span: second.span };
    if (second.line !== null) return { start, span: Math.max(1, second.line - first.line) };
    return { start, span: 1 };
  }
  if (first.span !== null && second.line !== null) {
    return { start: Math.max(0, second.line - 1 - first.span), span: first.span };
  }
  if (first.span !== null) return { start: null, span: first.span };
  if (second.line !== null) return { start: Math.max(0, second.line - 2), span: 1 };
  return AUTO_LINE;
}
/**
 * CSS grid auto-placement, sparse packing.
 *
 * Written against a (major, minor) pair rather than (row, column) so the
 * `grid-auto-flow: column` case is the same code with the axes swapped — the
 * two flows differing by a transpose is the whole of their difference.
 */
function placeGridItems(items, explicitMinor, rowFlow) {
  const ordered = inOrder(items);
  const specs = ordered.map((item) => {
    const rowSpec = parseGridLine(item.row);
    const columnSpec = parseGridLine(item.column);
    return {
      item,
      major: rowFlow ? rowSpec : columnSpec,
      minor: rowFlow ? columnSpec : rowSpec,
    };
  });
  let minorCount = Math.max(1, explicitMinor);
  for (const spec of specs) {
    const span = Math.min(MAX_TRACKS, Math.max(1, spec.minor.span));
    if (spec.minor.start !== null) minorCount = Math.max(minorCount, spec.minor.start + span);
    else minorCount = Math.max(minorCount, span);
  }
  minorCount = Math.min(minorCount, MAX_TRACKS);
  const occupied = new Set();
  const free = (major, minor, majorSpan, minorSpan) => {
    for (let m = major; m < major + majorSpan; m += 1) {
      for (let n = minor; n < minor + minorSpan; n += 1) {
        if (occupied.has(`${m},${n}`)) return false;
      }
    }
    return true;
  };
  const occupy = (major, minor, majorSpan, minorSpan) => {
    for (let m = major; m < major + majorSpan; m += 1) {
      for (let n = minor; n < minor + minorSpan; n += 1) occupied.add(`${m},${n}`);
    }
  };
  const placements = [];
  let cursorMajor = 0;
  let cursorMinor = 0;
  let cellsRemaining = MAX_GRID_CELLS_PER_CONTAINER;
  for (const spec of specs) {
    const minorSpan = Math.min(minorCount, Math.max(1, spec.minor.span));
    const majorSpan = Math.min(
      MAX_TRACKS,
      Math.max(1, Math.floor(MAX_GRID_CELLS_PER_ITEM / minorSpan)),
      Math.max(1, Math.floor(cellsRemaining / minorSpan)),
      Math.max(1, spec.major.span),
    );
    cellsRemaining = Math.max(0, cellsRemaining - majorSpan * minorSpan);
    let major = spec.major.start;
    let minor = spec.minor.start;
    if (major !== null && minor !== null) {
      // Both axes definite: the item sits exactly where it was asked to.
    } else if (minor !== null) {
      if (minor < cursorMinor) cursorMajor += 1;
      cursorMinor = minor;
      major = cursorMajor;
      while (major < MAX_TRACKS && !free(major, minor, majorSpan, minorSpan)) major += 1;
      cursorMajor = major;
    } else if (major !== null) {
      minor = 0;
      while (minor + minorSpan <= minorCount && !free(major, minor, majorSpan, minorSpan)) {
        minor += 1;
      }
      if (minor + minorSpan > minorCount) {
        minorCount = Math.min(MAX_TRACKS, minor + minorSpan);
      }
    } else {
      major = cursorMajor;
      minor = cursorMinor;
      for (let guard = 0; guard < MAX_TRACKS; guard += 1) {
        if (minor + minorSpan > minorCount) {
          major += 1;
          minor = 0;
          continue;
        }
        if (free(major, minor, majorSpan, minorSpan)) break;
        minor += 1;
      }
      cursorMajor = major;
      cursorMinor = minor + minorSpan;
    }
    const finalMajor = Math.max(0, Math.min(major ?? 0, MAX_TRACKS - 1));
    const finalMinor = Math.max(0, Math.min(minor ?? 0, MAX_TRACKS - 1));
    occupy(finalMajor, finalMinor, majorSpan, minorSpan);
    placements.push({
      item: spec.item,
      row: rowFlow ? finalMajor : finalMinor,
      rowSpan: rowFlow ? majorSpan : minorSpan,
      column: rowFlow ? finalMinor : finalMajor,
      columnSpan: rowFlow ? minorSpan : majorSpan,
    });
  }
  let majorCount = 1;
  for (const placement of placements) {
    const start = rowFlow ? placement.row : placement.column;
    const span = rowFlow ? placement.rowSpan : placement.columnSpan;
    majorCount = Math.max(majorCount, start + span);
  }
  return { placements, minorCount, majorCount };
}
/**
 * Track sizes along one axis.
 *
 * `auto` is the largest authored item size in the track — the format contract
 * is explicit that there is no intrinsic sizing here, because a dependency-free
 * pure solver cannot measure text.
 *
 * DIVERGENCE: leftover space beyond the tracks is distributed by `justify` /
 * `alignContent` and never absorbed by the `auto` tracks themselves. CSS's
 * final "stretch auto tracks" step runs when the distribution is `normal`,
 * which the format has no spelling for — its default is `start`.
 */
function sizeTracks(tracks, gap, extent, contributions) {
  const count = tracks.length;
  if (count === 0) return [];
  const base = [];
  const limit = [];
  for (const track of tracks) base.push(track.min.kind === "px" ? track.min.value : 0);
  // A flexible track takes no floor from an item the solver itself sized.
  //
  // `1fr` is `minmax(auto, 1fr)`, and in CSS that `auto` minimum is the item's
  // MIN-CONTENT size — which this solver does not have and says so: it cannot
  // measure text, so it reads an item's frame instead. For a track sized purely
  // by content that frame is the authored size and reading it is right. For an
  // `fr` track holding a STRETCHED item it is not: the last pass stretched that
  // item to the track and wrote the size back, so using it as a floor makes the
  // solve a function of its own previous output. A spanning item then raised its
  // tracks again on every pass — the layout drifted with each save, and, because
  // the serializer re-solves to verify itself, a document with an ordinary
  // spanning grid item was written as an embedded JSON fallback instead of HTML.
  //
  // A non-stretch item is the case that must keep its floor: `solveGrid` leaves
  // its frame at the authored width, which is an input the solver never wrote,
  // so it is both safe to read and the only size CSS has to go on. Dropping it
  // too let a 400px item's neighbour start at the track's `fr` share instead of
  // past it, so the canvas drew the two overlapping while a browser — which
  // still floors the track at min-content — did not.
  const takesItsFloorFromItems = (index, stretched) =>
    tracks[index].min.kind === "auto" && (!stretched || tracks[index].max.kind !== "fr");
  for (const contribution of contributions) {
    if (contribution.span !== 1) continue;
    const index = contribution.start;
    if (index < 0 || index >= count) continue;
    if (takesItsFloorFromItems(index, contribution.stretched)) {
      base[index] = Math.max(base[index], contribution.size);
    }
  }
  // A spanning item raises only the intrinsic tracks it crosses, and raises
  // them equally, which is CSS's fallback when no track is more responsible for
  // the item than another.
  for (const contribution of contributions) {
    if (contribution.span <= 1) continue;
    const start = Math.max(0, contribution.start);
    const end = Math.min(count, contribution.start + contribution.span);
    if (end <= start) continue;
    let covered = gap * (end - start - 1);
    const flexible = [];
    for (let index = start; index < end; index += 1) {
      covered += base[index];
      if (takesItsFloorFromItems(index, contribution.stretched)) flexible.push(index);
    }
    const deficit = contribution.size - covered;
    if (deficit <= EPSILON || flexible.length === 0) continue;
    const share = deficit / flexible.length;
    for (const index of flexible) base[index] = base[index] + share;
  }
  for (let index = 0; index < count; index += 1) {
    const max = tracks[index].max;
    // A flexible track's growth limit is its base size, so the maximize step
    // leaves the space for the `fr` distribution below.
    limit.push(max.kind === "px" ? Math.max(max.value, base[index]) : base[index]);
  }
  const totalGap = gap * (count - 1);
  let used = totalGap;
  for (const size of base) used += size;
  const flexTotal = tracks.reduce(
    (sum, track) => sum + (track.max.kind === "fr" ? track.max.value : 0),
    0,
  );
  if (flexTotal <= 0) {
    // Maximize tracks: grow every track towards its growth limit, equally.
    let remaining = extent - used;
    for (let pass = 0; pass < count && remaining > EPSILON; pass += 1) {
      const growable = [];
      for (let index = 0; index < count; index += 1) {
        if (limit[index] - base[index] > EPSILON) growable.push(index);
      }
      if (growable.length === 0) break;
      const share = remaining / growable.length;
      let spent = 0;
      for (const index of growable) {
        const growth = Math.min(share, limit[index] - base[index]);
        base[index] = base[index] + growth;
        spent += growth;
      }
      remaining -= spent;
      if (spent <= EPSILON) break;
    }
    return base;
  }
  // Expand flexible tracks: the `fr` unit is the leftover divided by the flex
  // total, and a track whose content already exceeds its share stops flexing
  // and its space leaves the pool — hence the loop rather than one division.
  const frozen = new Array(count).fill(false);
  for (let pass = 0; pass <= count; pass += 1) {
    let leftover = extent - totalGap;
    let flexSum = 0;
    for (let index = 0; index < count; index += 1) {
      const max = tracks[index].max;
      if (max.kind !== "fr" || frozen[index]) leftover -= base[index];
      else flexSum += Math.max(max.value, 1e-6);
    }
    if (flexSum <= 0) break;
    const unit = Math.max(0, leftover) / flexSum;
    let violated = false;
    for (let index = 0; index < count; index += 1) {
      const max = tracks[index].max;
      if (max.kind !== "fr" || frozen[index]) continue;
      const share = unit * Math.max(max.value, 1e-6);
      if (share < base[index] - EPSILON) {
        frozen[index] = true;
        violated = true;
      }
    }
    if (violated) continue;
    for (let index = 0; index < count; index += 1) {
      const max = tracks[index].max;
      if (max.kind !== "fr" || frozen[index]) continue;
      base[index] = unit * Math.max(max.value, 1e-6);
    }
    break;
  }
  return base;
}
function solveGrid(layout, contentWidth, contentHeight, items, rects) {
  const rowFlow = layout.autoFlow === "row";
  const explicitColumns = layout.columns.map(parseTrack);
  const explicitRows = layout.rows.map(parseTrack);
  const explicitMinor = rowFlow ? explicitColumns.length : explicitRows.length;
  const { placements, minorCount, majorCount } = placeGridItems(items, explicitMinor, rowFlow);
  const columnCount = Math.max(
    explicitColumns.length,
    rowFlow ? minorCount : majorCount,
    placements.length > 0 ? 1 : 0,
  );
  const rowCount = Math.max(
    explicitRows.length,
    rowFlow ? majorCount : minorCount,
    placements.length > 0 ? 1 : 0,
  );
  // Implicit tracks are `auto`; the model has no `grid-auto-columns`/`-rows`.
  const columns = [];
  for (let index = 0; index < columnCount; index += 1) {
    columns.push(explicitColumns[index] ?? AUTO_TRACK);
  }
  const rows = [];
  for (let index = 0; index < rowCount; index += 1) rows.push(explicitRows[index] ?? AUTO_TRACK);
  const columnSizes = sizeTracks(
    columns,
    layout.columnGap,
    contentWidth,
    placements.map((placement) => ({
      start: placement.column,
      span: placement.columnSpan,
      size: placement.item.width,
      stretched: (placement.item.align ?? layout.align) === "stretch",
    })),
  );
  const rowSizes = sizeTracks(
    rows,
    layout.rowGap,
    contentHeight,
    placements.map((placement) => ({
      start: placement.row,
      span: placement.rowSpan,
      size: placement.item.height,
      stretched: (placement.item.align ?? layout.align) === "stretch",
    })),
  );
  const columnPositions = distributePositions(
    columnSizes,
    layout.columnGap,
    contentWidth,
    layout.justify,
  );
  const rowPositions = distributePositions(
    rowSizes,
    layout.rowGap,
    contentHeight,
    layout.alignContent,
  );
  const cell = (positions, sizes, gap, start, span) => {
    const first = Math.max(0, Math.min(start, sizes.length - 1));
    const last = Math.max(first, Math.min(start + span, sizes.length) - 1);
    let size = gap * (last - first);
    for (let index = first; index <= last; index += 1) size += sizes[index];
    return { offset: positions[first] ?? 0, size };
  };
  for (const placement of placements) {
    // The model has no `justifyItems`/`justifySelf`, so `align` governs both
    // grid axes. Its `stretch` default therefore fills the cell in both
    // directions, which is what a browser does with `align-items`/
    // `justify-items` both at their initial `normal`.
    //
    // DIVERGENCE: an explicitly non-stretch `align` is applied to the inline
    // axis too — per §3 of the format contract, a non-stretch alignment means
    // the item does not fill its cell on an axis a track sizes — where a
    // browser would still stretch it to the column width.
    const align = placement.item.align ?? layout.align;
    const column = cell(
      columnPositions,
      columnSizes,
      layout.columnGap,
      placement.column,
      placement.columnSpan,
    );
    const row = cell(rowPositions, rowSizes, layout.rowGap, placement.row, placement.rowSpan);
    const width = align === "stretch" ? column.size : placement.item.width;
    const height = align === "stretch" ? row.size : placement.item.height;
    rects[placement.item.index] = {
      x: column.offset + alignOffset(align, width, column.size),
      y: row.offset + alignOffset(align, height, row.size),
      width,
      height,
    };
  }
}
// ---------- entry point ----------
/**
 * Resolve child rects relative to the container's top-left, padding included in
 * the returned coordinates. One rect per input, in the same order as `items` —
 * `order` reorders placement, never the array.
 */
export function resolveLayout(container, layout, items) {
  const list = Array.isArray(items) ? items : [];
  const normalized = normalizeLayout(layout);
  const width = nonNegative(container?.width, 0);
  const height = nonNegative(container?.height, 0);
  const padding = normalized.padding;
  const contentWidth = Math.max(0, width - padding.left - padding.right);
  const contentHeight = Math.max(0, height - padding.top - padding.bottom);
  const normalizedItems = list.map((entry, index) => normalizeItem(entry, index));
  const rects = normalizedItems.map((item) => ({
    x: 0,
    y: 0,
    width: item.width,
    height: item.height,
  }));
  if (normalizedItems.length > 0) {
    if (normalized.mode === "grid") {
      solveGrid(normalized, contentWidth, contentHeight, normalizedItems, rects);
    } else {
      solveFlex(normalized, contentWidth, contentHeight, normalizedItems, rects);
    }
  }
  for (const rect of rects) {
    rect.x = finiteNumber(rect.x, 0) + padding.left;
    rect.y = finiteNumber(rect.y, 0) + padding.top;
    rect.width = nonNegative(rect.width, 0);
    rect.height = nonNegative(rect.height, 0);
  }
  return rects;
}
function readRect(value) {
  const source = isJsonObject(value) ? value : {};
  return {
    x: finiteNumber(source.x, 0),
    y: finiteNumber(source.y, 0),
    width: finiteNumber(source.width, 0),
    height: finiteNumber(source.height, 0),
  };
}
/** The container layout on an object or artboard, or undefined when it has none. */
function containerLayout(source) {
  const layout = source?.layout;
  if (!isJsonObject(layout)) return undefined;
  return layout.mode === "flex" || layout.mode === "grid" ? layout : undefined;
}
function itemLayout(source) {
  return isJsonObject(source.layoutItem) ? source.layoutItem : undefined;
}
function childIds(source, objects) {
  if (!source || source.type !== "group" || !Array.isArray(source.children)) return [];
  return source.children.filter((id) => typeof id === "string" && isJsonObject(objects[id]));
}
/**
 * Recompute every layout container's descendants' frames, depth-first. Returns
 * a new document, or the input itself when no frame moved.
 *
 * Idempotent: a solved container has no free space left to distribute and its
 * `auto` tracks already measure the sizes the previous solve wrote, so solving
 * the result again reproduces it.
 */
export function applyDesignLayout(doc) {
  if (!isJsonObject(doc)) return doc;
  const rawObjects = isJsonObject(doc.objects) ? doc.objects : {};
  const objects = {};
  for (const [id, value] of Object.entries(rawObjects)) {
    if (isJsonObject(value)) objects[id] = value;
  }
  const order = (Array.isArray(doc.order) ? doc.order : []).filter(
    (id) => typeof id === "string" && objects[id] !== undefined,
  );
  const artboards = (Array.isArray(doc.artboards) ? doc.artboards : []).filter(isJsonObject);
  const frames = new Map();
  const frameOf = (id) => {
    const existing = frames.get(id);
    if (existing) return existing;
    const rect = readRect(objects[id]?.frame);
    frames.set(id, rect);
    return rect;
  };
  const moved = new Set();
  const visited = new Set();
  const translate = (id, dx, dy) => {
    if (dx === 0 && dy === 0) return;
    const stack = [...childIds(objects[id], objects)];
    const seen = new Set();
    while (stack.length > 0) {
      const childId = stack.pop();
      if (seen.has(childId)) continue;
      seen.add(childId);
      const rect = frameOf(childId);
      frames.set(childId, { ...rect, x: rect.x + dx, y: rect.y + dy });
      moved.add(childId);
      stack.push(...childIds(objects[childId], objects));
    }
  };
  const place = (id, rect) => {
    const current = frameOf(id);
    // A group carries its subtree with it; nothing here scales a subtree, so a
    // resized group keeps its descendants at their authored sizes.
    translate(id, rect.x - current.x, rect.y - current.y);
    frames.set(id, rect);
    moved.add(id);
  };
  const solveContainer = (layout, origin, ids) => {
    const inputs = ids.map((id) => {
      const rect = frameOf(id);
      return { width: rect.width, height: rect.height, item: itemLayout(objects[id]) };
    });
    const rects = resolveLayout({ width: origin.width, height: origin.height }, layout, inputs);
    ids.forEach((id, index) => {
      const rect = rects[index];
      place(id, {
        x: origin.x + rect.x,
        y: origin.y + rect.y,
        width: rect.width,
        height: rect.height,
      });
    });
  };
  const visit = (id) => {
    if (visited.has(id)) return;
    visited.add(id);
    const source = objects[id];
    if (!source) return;
    const children = childIds(source, objects);
    const layout = containerLayout(source);
    // A hidden object serializes to `display: none`, which takes it out of a
    // browser's layout; excluding it here keeps the two renderings the same.
    const laidOut = children.filter((childId) => objects[childId].visible !== false);
    if (layout && laidOut.length > 0) solveContainer(layout, frameOf(id), laidOut);
    for (const childId of children) visit(childId);
  };
  const rootOwners = new Map();
  const roots = [];
  const artboardRects = artboards.map((artboard) => readRect(artboard));
  for (const id of order) {
    const rect = frameOf(id);
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    // The same containment test the HTML serializer uses to decide which
    // artboard section an object belongs to, so layout and serialization can
    // never disagree about an artboard's children.
    const owning = artboardRects.findIndex(
      (candidate) =>
        cx >= candidate.x &&
        cx <= candidate.x + candidate.width &&
        cy >= candidate.y &&
        cy <= candidate.y + candidate.height,
    );
    if (owning < 0) {
      roots.push(id);
      continue;
    }
    const bucket = rootOwners.get(owning);
    if (bucket) bucket.push(id);
    else rootOwners.set(owning, [id]);
  }
  artboards.forEach((artboard, index) => {
    const layout = containerLayout(artboard);
    const owned = rootOwners.get(index) ?? [];
    if (layout) {
      const laidOut = owned.filter((id) => objects[id].visible !== false);
      if (laidOut.length > 0) solveContainer(layout, artboardRects[index], laidOut);
    }
    for (const id of owned) visit(id);
  });
  for (const id of roots) visit(id);
  // An object reachable from neither `order` nor a group still survives a save,
  // so a container stranded there still has to solve its own children. Only
  // parentless objects seed that sweep, or a subtree could be entered from the
  // middle and laid out before the group that positions it.
  const parented = new Set();
  for (const source of Object.values(objects)) {
    for (const childId of childIds(source, objects)) parented.add(childId);
  }
  for (const id of Object.keys(objects)) {
    if (!parented.has(id)) visit(id);
  }
  const changed = [];
  for (const id of moved) {
    const rect = frames.get(id);
    const current = readRect(objects[id]?.frame);
    if (
      rect.x !== current.x ||
      rect.y !== current.y ||
      rect.width !== current.width ||
      rect.height !== current.height
    ) {
      changed.push(id);
    }
  }
  if (changed.length === 0) return doc;
  const nextObjects = { ...doc.objects };
  for (const id of changed) {
    const source = objects[id];
    const rect = frames.get(id);
    const frame = isJsonObject(source.frame) ? source.frame : {};
    nextObjects[id] = { ...source, frame: { ...frame, ...rect } };
  }
  return { ...doc, objects: nextObjects };
}
