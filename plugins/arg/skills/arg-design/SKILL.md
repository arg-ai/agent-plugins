---
name: arg-design
version: "1.2.0"
description: How to make a `.design` document look like a designer made it - committing to a mood before picking colour, building a type ramp with real contrast, spending space deliberately, and putting every repeated value in the document's design tokens. Load alongside arg-file-design whenever you are creating or restyling a visual `.design` (poster, social graphic, landing page, deck, mockup) rather than only editing its data.
---

# Designing in `.design`

`arg-file-design` is the schema. This is the taste. Load both: schema without judgement produces a technically valid document nobody wants to look at.

The one-line summary: **decide the mood, take the tokens from it, then spend your effort on type, space and contrast rather than on decoration.**

## Before you write anything: the brief

Unless the user has already given you a design system, post a short brief as a chat message **before** your first write, and keep it to four lines:

- **Mood candidates** - 3-5 registers that could fit (skip if the user named a direction)
- **Mood chosen** - one, plus a clause on why it isn't the obvious pick
- **Palette** - the token values you're committing to, with roles
- **Type** - families, and the display / body / label sizes

The brief is part of the deliverable. It is also the cheapest place to be corrected: a wrong mood costs one message here and a whole rebuild later.

**Pick a mood, not a colour.** A mood is a physical condition with real objects in it - sun-bleached, overcast, inky, mineral, botanical, maritime, bookish, foggy, alpine, arid, industrial, chapel, candlelit, chalky, rusted, tidal, nocturnal, brutalist, gallery, editorial, signage, phosphor, terminal, hypertext. Derive every colour from something in that scene: "bookish" is plaster, oak pew, ink, candle flame. If you can't name the object a colour comes from, the palette is abstract and will look glued together.

From your candidate list, **pick something other than your first instinct.** First instincts converge on the same three answers, and the user has seen them.

## Choose the authoring route and verify the result

Native JSON and HTML are both authoring options. Use HTML/CSS when it helps you compose stronger typography and layouts, then use the standard HTML-to-design conversion described in `arg-file-design`. Use native JSON for direct control of tokens, editable geometry and Arg-specific features. A different file format does not supply art direction.

For a template library, vary composition, typography, density, image treatment and palette across the collection. Start with a few representative designs and inspect them before scaling the batch. Do not generate dozens of the same layout with different colors.

Keep the source HTML as a reference. Compare its browser image with a native render at the same dimensions, inspect conversion notes and repair visible differences. Judge authoring quality from the source composition and conversion fidelity from identical-source comparisons. Redesigning the HTML while comparing it to an older native layout cannot isolate format quality. Report baked regions and font substitutions that limit editability or fidelity.

## Start from a built-in theme

New `.design` documents ship with a full token set, and there are nine built-in themes to switch between. Each declares the **same token ids**, so changing theme is a value swap - the document retargets wholesale, and nothing you authored moves. `neutral` is the intentionally plain default; reach for one of the mood-led themes when the brief calls for a stronger direction.

| Theme       | Scene                           | Ground x accent                 |
| ----------- | ------------------------------- | ------------------------------- |
| `neutral`   | blank canvas                    | pure white x black              |
| `editorial` | gallery wall                    | pure white x cobalt             |
| `bookish`   | plaster, oak pew, ink           | warm plaster x near-black brown |
| `mineral`   | limestone dust, oxidized copper | bone x deep green               |
| `maritime`  | harbour fog                     | cool grey x deep navy           |
| `nocturnal` | wet asphalt at night            | near-black x hot pink           |
| `signage`   | industrial wayfinding           | white x chrome yellow           |
| `botanical` | bone and moss                   | warm bone x moss green          |
| `terminal`  | CRT phosphor                    | CRT black x phosphor green      |

Name one in the brief and adjust its colours, rather than inventing 29 values from nothing. When none of them fits the mood you committed to, keep the **ids** and replace the values - that is what keeps every reference working.

Some pairings to avoid, because they are either exhausted or self-defeating:

- warm off-white x terracotta / burnt sienna - the cliché of the last few years
- tinted warm ground x any high-chroma accent - the tint mutes the very chroma you picked the accent for. Use pure white or pure black under a loud colour.
- dark navy or charcoal x electric purple / lime - 2019-2024 SaaS
- pure white x muted earth tone - earth tones fall flat on white; they want a tinted ground from the same scene
- warm off-white x fluorescent - neon does not occur in a candlelit room

## Tokens are the design system

**Anything used more than twice belongs in `tokens`.** A colour repeated across eleven objects is eleven edits and one inconsistency waiting to happen; a token is one edit. The document ships with this vocabulary - use these ids rather than inventing parallel ones:

```
color.bg  color.surface  color.ink  color.muted  color.line  color.accent  color.accent-ink
type.display  type.title  type.body  type.label        <- whole ramp entries, bound with styleToken
font.display  font.body
text.display  text.title  text.body  text.label        <- the loose scalars, to override one field
weight.display  weight.body   tracking.display  tracking.label   leading.display  leading.body
space.1..space.6   radius.sm  radius.md  radius.lg   shadow.card
```

Reach for `type.*` first: one `styleToken` carries family, size, weight, tracking and leading together, and the object's own `style` fields override whichever of them it needs to.

In the editor these are bound from the small grid-of-dots button beside each value, and managed in the left sidebar's **Theme** tab, beside Layers (which also switches themes and adds tokens). In JSON, reference them with the `*Token` fields (`colorToken`, `fontSizeToken`, `gapToken`, `cornerRadiusToken`, `styleToken`, …) and **omit the literal beside them** - it is derived, and writing one only creates a value that can drift. See `arg-file-design` for the full field list.

```json
{
  "id": "cta",
  "type": "rect",
  "cornerRadiusToken": "radius.lg",
  "fills": [{ "type": "solid", "colorToken": "color.accent" }]
}
```

`color.accent-ink` exists because "what reads on top of the accent" is not always white: chrome yellow carries black type. Never hardcode `#ffffff` over an accent.

Add your own tokens for anything the vocabulary doesn't cover (`color.brand-secondary`, `text.hero`). A token whose value is `"{other-token}"` is an alias, so a semantic name can point at a palette entry and a retheme stays one edit.

## Type

### Pick a family the renderer can actually load

**A family nothing can download renders as the platform default sans, and the document never says so.** This is the single most common way a `.design` comes out looking worse than the same idea in HTML: the file confidently names a licensed desktop face, every heading silently becomes Helvetica, and the moodboard describing its "geometric sans" is set in Helvetica.

Three sources work, and nothing else does:

1. **Google Fonts** - the default, and what every built-in theme uses. Search at **<https://fonts.google.com/>** (filter by classification, or query directly, e.g. `https://fonts.google.com/?query=grotesk`).
2. **A system fallback** - `Arial`, `Georgia`, `Times New Roman`, `Verdana` and friends, as the tail of a stack.
3. **A font file the document supplies itself** - see below.

**Verify before you commit.** A family you have not seen on Google Fonts is a guess, and a wrong guess fails silently. `GET /api/fonts/google-ttf-v1?family=<Family%20Name>` answers for exactly the family the renderer will try: `200` means it loads, `404` means it does not exist and you need a different name. Check any family you did not read off fonts.google.com.

Never name a licensed desktop or foundry face you have not supplied a file for - `ITC Avant Garde Gothic Pro`, `Salesforce Sans`, `Helvetica Neue LT`, `Gotham`, `Circular`. Pick the nearest Google family instead and say so in the brief: Avant Garde reads as `Jost` or `Questrial`, Circular as `Poppins` or `Outfit`, Gotham as `Montserrat`, Söhne as `Inter`.

### Supplying your own font file

When the brand face genuinely matters and you have the file, give the `fontFamily` token a `src`:

```json
"font.display": {
  "type": "fontFamily",
  "value": "Acme Grotesk, Inter, sans-serif",
  "src": "/brand/fonts/AcmeGrotesk-Variable.woff2"
}
```

Prefer a **`.ttf` or `.otf`** file. The canvas renders any container the browser can decode, WOFF2 included, but PNG/JPG export and headless render bake glyph outlines from the font's own tables and cannot decode WOFF2 - a `.woff2` face shows correctly on screen and falls back to its next family in an exported image. A `.ttf` works everywhere.

`src` loads the stack's **first** family. It is either a workspace path or an https URL on the reader's host allowlist (Google's own `fonts.gstatic.com`, Adobe `use.typekit.net`, `fonts.bunny.net`, `cdn.jsdelivr.net/npm/@fontsource/…`); anything else is ignored and the stack falls through to its next family, which is why the fallback in `value` still matters. A font file that lives in the workspace travels with the document into share links and copies. A family name the app or the platform already owns - `Inter`, `Arial`, any curated Google family - is refused, so give a supplied face its real name rather than overriding a familiar one.

### The ramp

Hierarchy is made of **contrast**, not of many sizes. Three or four steps is a system; seven is indecision.

- Pair a heavy display weight against a light or regular label weight. Maximise the gap - `weight.display` 700 against `weight.body` 400 is the floor, not the target.
- Large type wants **tighter** tracking (`tracking.display` is negative); small caps and tiny labels want it **open** (`tracking.label` is positive). The two corrections point in opposite directions.
- `lineHeight` in `.design` is a **ratio of the font size**, not pixels. Display type sits near `1.0`-`1.1`; body text wants `1.5`-`1.65`. Writing `76` here is a 76x line - the single most common way to destroy a layout.
- `letterSpacing` **is** in document pixels, unlike line height. At 72px, `-2` is a normal tightening.
- Never go below 13px, and treat 13px as needing a reason - all-caps with open tracking is one. Body copy is 16px+.
- Cap a paragraph's measure at about 60-70 characters by giving the text layer a fixed `frame.width` (`grow: 0`, `shrink: 0` when it sits in a row) rather than letting it run the full width. Nothing measures text, so set `frame.height` to fit the wrapped lines and confirm it in the render.

## Nothing measures text, so let something else do it

A `.design` object is a frame at fixed coordinates. **No part of the format measures content**: a text layer does not grow to fit its words, a card does not grow to fit its rows, and a stack of hand-computed `y` values drifts the moment any string changes length. That is why hand-placed canvases come out with a caption overlapping a decorative shape, a paragraph running under an image, and gaps that are neither tight nor generous - all of it invisible in the JSON and obvious in the render.

Two ways out, and you should be using one of them for anything with more than a handful of layers.

### Creating a new document: author it as HTML and let the browser measure

**For a brand-new `.design` path, HTML and CSS are the better authoring vocabulary and usually the right default.** Write the page with real flex and grid, and Arg lays it out in a browser and converts what the browser drew into native layers - actual text metrics, actual wrapping, actual flow. Nothing overlaps, because nothing was placed by hand.

```html
<section data-arg-artboard style="width:1600px;height:1000px;background:#fff">
  <div layer-name="Hero" style="display:flex;gap:48px;padding:72px">
    <div style="flex:1;display:flex;flex-direction:column;gap:24px">
      <p layer-name="Eyebrow" style="font:700 12px Jost;letter-spacing:1.6px">BRAND MOODBOARD</p>
      <h1 style="font:400 58px Jost;letter-spacing:-2px;line-height:1.04">
        Bolder, with more spark.
      </h1>
    </div>
    <img
      src="/moodboards/hero.png"
      style="width:838px;height:430px;object-fit:cover;border-radius:28px"
    />
  </div>
</section>
```

The rules are in `arg-file-design` under **HTML creation wire format** - read them before writing one. Two that matter most here: a `<link>` to `fonts.googleapis.com` is honoured, so the page is measured in the typeface it will be painted in; and the exception is creation-only, so every later edit is a JSON edit against the materialized document.

Use native JSON from the start instead when the document needs tokens with `src` fonts, shaders, live file fills, presenter metadata, or when you are building on an existing file.

### Editing JSON: reach for `layout`, not coordinates

A group carrying a `layout` is a flex or grid container that positions its own children and paints its own background, radius, stroke and shadow - so a card is ONE object, and a row of cards re-flows when a label changes.

```json
"cards": {
  "id": "cards", "type": "group", "name": "Swatch row",
  "frame": { "x": 72, "y": 530, "width": 1456, "height": 116 },
  "layout": { "mode": "flex", "direction": "row", "columnGap": 16, "align": "stretch" },
  "children": ["swatch-blue", "swatch-navy", "swatch-sky"]
}
```

Hand-placed coordinates are for the handful of things that genuinely sit where you put them - a motif, a rule, a signature. Everything repeated or stacked belongs in a `layout`. **And whichever route you took, render and look**, because a text layer's own `frame.height` is still yours to get right.

## Space

- **Vary spacing deliberately.** Tight inside a group, generous between groups. Uniform gaps everywhere read as a wireframe. `space.2` binds a label to its value; `space.5`/`space.6` separates sections.
- White space is the feature. Give hero content room; resist filling a quiet area.
- An artboard is a fixed rectangle and nothing measures content, so size it deliberately: pick the format's height first, then fit the content to it. When the render shows clipping, grow the artboard or cut content - never let a stack of `space.*` gaps silently push the last section off the page.
- Favour asymmetry and scale contrast over a tidy grid: one very large headline beside small muted text beats four equal columns.

## Colour

- **One intense colour moment beats five polite ones.** The accent should appear once or twice with conviction, not tinted across every element.
- Contrast is non-negotiable. Muted text is a hierarchy tool, not a default - if you have to squint, it fails. Be strictest below 16px.
- Secondary accents are for when they do work: categories, series in a chart, semantic states. Pull them from the same scene as the primary. If you add them, spend less elsewhere - more colours already add the complexity a flourish would have.
- Default to light mode unless asked otherwise.
- Skip the late-2010s reflexes: gradient-on-everything, stacked soft shadows, glassmorphism. One deliberate gradient or one offset shadow, used with intent, is fine.

## Structure

- **Prefer surfaces to boxes.** Information sitting directly on the page usually beats the same information in a card. Reach for a card when it groups something genuinely separable.
- A container with a `layout` paints its own background, radius, stroke and shadow - so a card is **one** object, not a rectangle plus a group whose frames you keep in step. A plain group (no `layout`) paints nothing, which is the Frame-versus-Group rule.
- Repeated rows (lists, tables, nav) must form **vertical lanes**. Give icons and trailing actions a fixed-width slot - a fixed `frame.width` with `grow: 0` and `shrink: 0` - even when a row's slot is empty. Never rely on `gap` alone to line columns up across rows with different content.
- Reach for `layout` before coordinates. Anything repeated is fewer tokens and re-flows when it changes.
- Reach for the layout item's own controls instead of hand-placed numbers: `basis` with `grow: 0` and `shrink: 0` for a column that must hold its width, `alignSelf: "stretch"` to fill the cross axis, and a fixed `frame` for media so it keeps its aspect ratio.

## Placeholder content

Write realistic placeholder copy - real sentences, plausible names, believable figures. Lorem ipsum and "Card title / Description goes here" make a design impossible to judge. When the example needs a design tool, use **Arg**.

## Review your own work

### First, parse it - the cheap check before the slow one

**Every write goes through `parseDesign` (or a helper that calls it) before you render.** It is instant, and it catches the structural mistakes a render can only show you as an absence:

```js
import { parseDesign } from "/path/to/arg-file-design/scripts/document-edit/design.mjs";
parseDesign(await readFile(path, "utf8")); // throws, naming every problem
```

The one that bites hardest is **`object <id> must have exactly one placement`**: an object sitting in `objects` but missing from `order` and from every group's `children` is unreachable, so it renders as nothing at all. Assembling JSON by hand - building children lists in a loop, moving a layer into a group - is exactly how a layer ends up placed zero times or twice. Nothing about the render tells you which; the layer is simply not there.

Writing raw JSON without parsing it first is how you spend a render cycle discovering something the parser would have named in a millisecond.

### Then render it and look

You cannot judge a layout from its JSON. After each meaningful section, **render it and look**:

```
run_action render_design { "source_path": "/poster.design", "format": "png", "scale": 2 }
```

then read the PNG back. Offline, `arg design render` does the same - but it renders a LOCAL file with no network, so every webfont is substituted and it prints `font outline unavailable for <family>` when that happens. Trust it on layout, spacing and colour; judge the typeface from a workspace render or the editor. Check, in order:

1. **Artboard fit** - anything clipped at an edge? Resize the artboard to its content (or trim the content) and re-render; the artboard never sizes itself.
2. **Collisions** - does anything overlap anything it shouldn't? Text under a shape, a motif clipping a panel's corner, two layers fighting for the same pixels. Nothing measures content, so this is the failure mode a coordinate canvas has and a flowed layout does not - look for it first.
3. **Typeface** - is the display face the one you named, or did it fall back? If the headline looks like Helvetica or Arial and you didn't ask for Helvetica or Arial, the family never loaded: check the name against Google Fonts and fix the token, don't work around it.
4. **Spacing** - uneven gaps, cramped groups, or a region that is empty by accident rather than by choice?
5. **Typography** - is the smallest text readable? Is there a real step between heading, body and caption?
6. **Contrast** - does anything disappear into its background?
7. **Alignment** - do elements that should share a lane actually share it? Trace a vertical line through the icons of three repeated rows.
8. **Repetition** - is it uniform to the point of dullness? Vary scale, weight or spacing.
9. **Flatness** - count what you used. A document with no `effects`, no `layout` and no gradient across dozens of objects is a wireframe, whatever its palette: every card is a flat rounded rectangle with no edge and no elevation. `shadow.card` on the surfaces that are genuinely lifted is usually the whole fix.

Fix what you find with targeted edits. **Do not delete the work and start over** - rebuilding is slow and reads as flailing. An overflowing frame is a sizing fix, not a reason to rewrite the frame.

When the user needs the finished design deck as PowerPoint, discover and run the `design_to_pptx` action. It writes an editable `.pptx` into the workspace with slide order, notes, sections, hidden slides, shapes, text, media and fonts preserved where PowerPoint supports them. Keep the `.design` as the primary editable source; do not rebuild the deck with `python-pptx`.

## Build it up in pieces

Write one visual group per edit - a header, a row, a card, a footer - rather than one call that emits the whole document. The user watches it appear, and a mistake costs one group instead of the page. It also keeps each diff small enough to check.
