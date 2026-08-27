---
name: arg-design
version: "1.0.0"
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

Hierarchy is made of **contrast**, not of many sizes. Three or four steps is a system; seven is indecision.

- Pair a heavy display weight against a light or regular label weight. Maximise the gap - `weight.display` 700 against `weight.body` 400 is the floor, not the target.
- Large type wants **tighter** tracking (`tracking.display` is negative); small caps and tiny labels want it **open** (`tracking.label` is positive). The two corrections point in opposite directions.
- `lineHeight` in `.design` is a **ratio of the font size**, not pixels. Display type sits near `1.0`-`1.1`; body text wants `1.5`-`1.65`. Writing `76` here is a 76x line - the single most common way to destroy a layout.
- `letterSpacing` **is** in document pixels, unlike line height. At 72px, `-2` is a normal tightening.
- Never go below 13px, and treat 13px as needing a reason - all-caps with open tracking is one. Body copy is 16px+.
- Cap a paragraph's measure with `layoutConstraints.maxWidth` (about 60-70 characters) rather than letting it run the full width. A hug-height text box wraps at the cap and its height follows.

## Space

- **Vary spacing deliberately.** Tight inside a group, generous between groups. Uniform gaps everywhere read as a wireframe. `space.2` binds a label to its value; `space.5`/`space.6` separates sections.
- White space is the feature. Give hero content room; resist filling a quiet area.
- Use `layoutRoot` + `layoutSizing: { height: "hug" }` on the artboard so the page **grows with its content** instead of you guessing a pixel height. Never hand-tune an artboard height to stop clipping.
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
- Repeated rows (lists, tables, nav) must form **vertical lanes**. Give icons and trailing actions a fixed-width slot - a fixed `frame.width` with no `fill` sizing - even when a row's slot is empty. Never rely on `gap` alone to line columns up across rows with different content.
- Reach for `layout` before coordinates. Anything repeated is fewer tokens and re-flows when it changes.
- Use `layoutConstraints` instead of falling back to hand-placed numbers: `maxWidth` for a measure, `minWidth` so a column can't collapse, `aspectRatio` for media.

## Placeholder content

Write realistic placeholder copy - real sentences, plausible names, believable figures. Lorem ipsum and "Card title / Description goes here" make a design impossible to judge. When the example needs a design tool, use **Arg**.

## Review your own work

You cannot judge a layout from its JSON. After each meaningful section, **render it and look**:

```
run_action render_design { "source_path": "/poster.design", "format": "png", "scale": 2 }
```

then read the PNG back. Offline, `arg design render` does the same. Check, in order:

1. **Artboard fit** - anything clipped at an edge? Switch the artboard to `layoutRoot` + `layoutSizing: { height: "hug" }` rather than guessing a taller number.
2. **Spacing** - uneven gaps, cramped groups, or a region that is empty by accident rather than by choice?
3. **Typography** - is the smallest text readable? Is there a real step between heading, body and caption?
4. **Contrast** - does anything disappear into its background?
5. **Alignment** - do elements that should share a lane actually share it? Trace a vertical line through the icons of three repeated rows.
6. **Repetition** - is it uniform to the point of dullness? Vary scale, weight or spacing.

Fix what you find with targeted edits. **Do not delete the work and start over** - rebuilding is slow and reads as flailing. An overflowing frame is a sizing fix, not a reason to rewrite the frame.

## Build it up in pieces

Write one visual group per edit - a header, a row, a card, a footer - rather than one call that emits the whole document. The user watches it appear, and a mistake costs one group instead of the page. It also keeps each diff small enough to check.
