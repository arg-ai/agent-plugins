---
name: arg-design
version: "1.4.0"
description: How to make a `.design` document look like a designer made it - choosing (or researching and inventing) a named design language instead of the default AI look, committing to a mood before picking colour, letting one oversized element carry the piece, building a type ramp with real contrast, sizing text for the format it is read in (feed, slide, print, banner), keeping decks and carousels one system, composing around a shader or 3D hero, and putting every repeated value in the document's design tokens. Load alongside arg-file-design whenever you are creating or restyling a visual `.design` (poster, social graphic, landing page, deck, mockup) rather than only editing its data.
---

# Designing in `.design`

`arg-file-design` is the schema. This is the taste. Load both: schema without judgement produces a technically valid document nobody wants to look at.

The one-line summary: **name the design language, decide the mood, take the tokens from them, let one element be enormous, then spend your effort on type, space and contrast rather than on decoration.**

The numbers below are measured from a library of several hundred hand-art-directed Arg templates (posters, decks, social, print, office documents, shader and 3D pieces), comparing the strongest against the weakest. Where a rule gives a ratio, it is the range the strong pieces actually used.

## Before you write anything: the brief

Unless the user has already given you a design system, post a short brief as a chat message **before** your first write, and keep it to five lines:

- **Design language** - the named style you are working in and the one you are deliberately not (see below); offer a shortlist of 3-5 across different families when the user hasn't named one
- **Mood candidates** - 3-5 registers that could fit (skip if the user named a direction)
- **Mood chosen** - one, plus a clause on why it isn't the obvious pick
- **Palette** - the token values you're committing to, with roles
- **Type** - families, and the display / body / label sizes

The brief is part of the deliverable. It is also the cheapest place to be corrected: a wrong mood costs one message here and a whole rebuild later.

**Pick a mood, not a colour.** A mood is a physical condition with real objects in it - sun-bleached, overcast, inky, mineral, botanical, maritime, bookish, foggy, alpine, arid, industrial, chapel, candlelit, chalky, rusted, tidal, nocturnal, brutalist, gallery, editorial, signage, phosphor, terminal, hypertext. Derive every colour from something in that scene: "bookish" is plaster, oak pew, ink, candle flame. If you can't name the object a colour comes from, the palette is abstract and will look glued together.

From your candidate list, **pick something other than your first instinct.** First instincts converge on the same three answers, and the user has seen them.

## Name a design language, not a vibe

Generated design has a house look: the same centred layout, soft gradient, rounded cards and friendly sans on every brief. Nothing is wrong with any one of them; the problem is that the reader has seen it a hundred times, so it reads as "made by default". For event and community pieces the default is the craft-fayre template - bunting, hand-drawn florals, pastel palettes, airbrushed or oil-painted art, stock smiling people. A piece stands out first by simply being _different_, before it is anything else.

Adjectives do not get you out of it. "Clean, bold, bright, modern" still lands on the default. What works is **a named style with a real history**: a movement, a studio, a decade, a print process or a scene - "Bauhaus", "Swiss International", "risograph two-ink", "1968 Atelier Populaire stencil", "Blue Note sleeve", "90s drum and bass flyer". A name carries a whole coherent vocabulary (palette rule, type, composition, texture) that a list of adjectives never will.

1. **Write down the default first, and treat it as what not to do.** Before choosing, say in one clause what the obvious version would look like. Then choose against it: "not wrong, but we want ours to stand out from everything that looks like it."
2. **Offer a shortlist across families**, not five variants of one idea: e.g. one modernist, one print-process, one vernacular, one bold/unusual, one quiet. The reliable stand-outs for everyday briefs are risograph, cut paper (Matisse), brutalist (toned down), Japanese minimal and wayfinding / signage.
3. **Know what the language actually does, then do all of it.** Write a one-line style card before drawing: _palette rule · type · composition · photo treatment · texture/process · signature device · what it forbids._
   - Bauhaus: primaries + black on off-white · geometric sans, often lowercase · asymmetric, diagonal, circle/square/triangle · flat · a bar or rule cutting the field · no ornament, no gradients.
   - Swiss: black/white + one accent · one grotesk at two weights, flush-left ragged-right · strict grid, lots of white · objective photo or none · type as image · no decoration.
   - Risograph: 2-3 spot inks · clean sans or simple serif in solid fills · bold simplified shapes · duotone photos in one ink, ±2-3° rotation · grain, slight misregistration, overprint mixing · halftone · no smooth gradients or photoreal colour.
   - Japanese minimal: paper ground, one dark ink, one red · restrained serif or light sans, vertical text where it belongs · one strong element in a lot of space · hanko-style seal · no clutter. **Minimal is not small**: the one element is still large (a 44pt title, a seal, a single object). Every weak "minimal" template in the library had huge white space _and_ tiny type, and read as unfinished.
   - Wayfinding: signage yellow/black or transit colours · DIN-like sans · pictograms, arrows, numbered routes · everything reads as information · no decorative illustration.
   - Constructivist: red/black on paper · heavy condensed sans · -12° to -30° diagonals bleeding past the edges · greyscale high-contrast photomontage, often cut to a wedge or circle · agitprop slogans · no softness.
   - Photojournalism: black/white + one red · newspaper serif + grotesk · full-bleed greyscale photos, a masthead rule repeated on every page · no tinting, no rounded anything.
     A language applied as a costume fails: a generic card grid with Y2K chrome on the cards, or a form inside a fake browser window, uses the style's frame as the whole idea. The language has to change the composition and the type, not just the wrapper.
4. **Decide whether the language is a container or has its own subject.** Container styles (Swiss, risograph, monochrome + accent) take whatever picture the brief needs. Subject styles (Art Nouveau, Pre-Raphaelite, Madhubani, calavera) are built around their figures and ornament; strip those out and the style collapses, so either commit to its subject matter or choose a different language.
5. **Shortlist the picture, then commit to one.** Name three or four things in the brief that could each carry the image, and pick one - not automatically the boldest or strangest. One piece of wit is allowed, and only one: inside the chosen subject or at its edge, never as a second element competing with it.
6. **When you change direction, restart from the brief.** Restyling the previous iteration drags its trappings along - a switch to Designers Republic will happily add fake codes and extra text, and a switch back keeps them. Ask for the style you want from scratch rather than accumulating it.
7. **Be honest about what's on offer.** The design promises only what the event or product actually has: no marquee that isn't there, no invented crowd, band or venue detail, no focal point so large it overstates the thing. Colour stays clean and newly printed - no accidental sepia or "aged" wash unless ageing is the point.
8. **Change one thing per iteration**, and zoom in before calling it done: legibility at the real size, the headline, the date/time/place, nothing duplicated or garbled.

A distinctive result may still be recognisably machine-made. That's fine - the goal is not to hide how it was made but to avoid the look everyone is tired of.

## A map of design languages

Reach across families, not within one. Names to start from (after John Hartnup's catalogue of one hundred poster styles, <https://john.hartnup.uk/poster-prompts/>):

- **Graphic design movements** - Arts and Crafts, Art Nouveau, Glasgow Style, Vienna Secession, Art Deco, Streamline Moderne, Bauhaus, Constructivist, De Stijl, Swiss / International Typographic, mid-century modern, Push Pin Studios, New Wave typography (Weingart, Greiman), Memphis, grunge typography (Carson), brutalist, contemporary editorial, wayfinding / signage.
- **Fine art** - Japonisme, Belle Époque lithograph, Futurist, Vorticist, Suprematist, Orphism, Dada collage, Cubist exhibition poster, Surrealist, Expressionist woodcut, Neue Sachlichkeit, CoBrA, Concrete art, Pop, Op, psychedelic sixties, minimalism, graffiti / street art.
- **Print processes** - risograph, letterpress / woodtype, screenprint, cyanotype / blueprint, etching and engraving, halftone newsprint, mimeograph purple, stamp, cut paper, botanical scientific plate, monochrome + single accent.
- **Folk and vernacular** - child's poster paint with professional typography, school cut-out collage, crayon folk, punk photocopy fanzine, zine cut-and-paste, Posada calavera, Pennsylvania Dutch fraktur, Madhubani, Scandinavian rosemaling. Folk traditions belong to living cultures: draw on them with respect and specificity, never as costume, and never borrow sacred imagery for a sale.
- **National and era** - Polish poster school, golden-age travel poster (Cassandre), Festival of Britain, Taisho modern, Shanghai calendar poster, East German DEFA, Zagreb school animation, German Expressionist film, Hong Kong cinema, Tropicália, ukiyo-e, neon diner Americana.
- **Political and activist** - WPA / New Deal, Soviet and Soviet space programme, Cuban OSPAAAL and ICAIC, Atelier Populaire (Paris 1968), ACT UP.
- **Music scenes** - Blue Note, Factory / Haçienda, 4AD, 90s rave and acid, drum and bass, reggae sound system, 80s NYC hip hop, heavy metal, indie festival line-up, skate graphics.
- **Digital and contemporary** - The Designers Republic, NASA worm modernism, seventies corporate psychedelia, Y2K chrome, vaporwave, synthwave, glitch, pixel, low poly, flat illustration, neo-brutalist web, bento grids, kinetic / variable type, big editorial serif, grain and duotone.

## Research and invent languages

The map is a starting point, not a menu to exhaust. When the brief deserves something fresh - or the user asks for it - go and find or make a language:

- **Research the history.** Use web search and fetch tools where available: museum and archive collections (V&A, Cooper Hewitt, MoMA, Poster House, Letterform Archive, Design Museum), Fonts In Use, studio monographs and type foundry specimens. Look for a specific designer, year or artefact, not a genre page.
- **Mine the subject's own visual culture.** Every field has printed matter nobody designed for show: seed packets, match-day programmes, airline safety cards, lab notebooks, shipping labels, transit maps, pharmacy packaging, railway timetables, museum tickets. A conference that looks like a timetable or a bakery that looks like a 1950s bread wrapper is instantly its own thing. To make a vernacular convincing:
  - **Reproduce the artefact's real field structure, then write the content in its grammar.** A receipt has a store line, till and date, right-aligned mono figures, a dashed rule, TOTAL, a comparison line, a barcode and a sign-off - so a monthly recap reads "KILN FIRINGS 11 / VS AUGUST +22%". A departure board has TIME / SPECIAL / PRICE / STATUS columns with coloured statuses; an agenda set that way reads like one.
  - **Add exactly one hand-made mark, in one colour, over the deadpan artefact**: a blue-pen note on the receipt, red grease-pencil ellipses on a contact sheet, a marker arrow on an index card. The contrast between machine-set and hand-made is what sells it; two kinds of annotation is clutter.
  - Keep the artefact's own rotation small (±1-2°) and keep it large - a receipt shrunk into a corner of a photo is a prop, not the design.
- **Invent by combination, with rules.** Useful formulas:
  - _Technique × period × subject_ - "risograph 1978 science-fair".
  - _Transposition_ - one field's vernacular applied to another: "airline safety card for an onboarding deck", "seed packet for a SaaS launch".
  - _Naive × expert_ - "a child's poster-paint drawing set in precise Swiss typography".
  - _Constraint-led_ - two inks and one typeface; only circles; everything drawn with a single stroke weight.
- **Name what you invented and write its style card** (palette rule, type, composition, texture, signature device, what it forbids), then hold every artboard to it. An invented language that bends on page three was never a language.
- **Check it still does the job.** The headline reads from across the room, the facts are findable, and contrast holds. A striking language that hides the date has failed.

In `.design`, a language's palette goes into the `color.*` tokens and its faces into `font.*`, so the whole piece can be re-themed at once. Keep text live; textures the canvas can't draw natively (grain, halftone) can be a subtle image or shader fill layered behind live type.

## Choose the authoring route and verify the result

Native JSON and HTML are both authoring options. Use HTML/CSS when it helps you compose stronger typography and layouts, then use the standard HTML-to-design conversion described in `arg-file-design`. Use native JSON for direct control of tokens, editable geometry and Arg-specific features. A different file format does not supply art direction.

For a template library, vary composition, typography, density, image treatment and palette across the collection. Start with a few representative designs and inspect them before scaling the batch. Do not generate dozens of the same layout with different colors.

Keep the source HTML as a reference. Compare its browser image with a native render at the same dimensions, inspect conversion notes and repair visible differences. Judge authoring quality from the source composition and conversion fidelity from identical-source comparisons. Redesigning the HTML while comparing it to an older native layout cannot isolate format quality. Report baked regions and font substitutions that limit editability or fidelity.

Read the import report: it names every region that was baked or dropped. When you author HTML for conversion, design around what does not come through as editable layers:

- **CSS `filter` chains and complex `background:` patterns are baked into an image fill.** That keeps the look but ties it to that photo: a user who replaces the photo loses its duotone or grain. For a template, prefer a plain photo plus a separate tint or texture layer above it, so the treatment survives a swap.
- **A radial gradient survives as an editable gradient only in an explicit form** - `radial-gradient(ellipse 50% 50% at 50% 50.01%, …)`. Keywords like `ellipse at center` or `closest-side` bake to an image, which matters because every drawn shadow and glow is a radial gradient.
- **Rotate about the element's centre.** A rotation with a moved `transform-origin` falls back rather than becoming a rotated layer.
- **`@font-face` faces measure the page but are not carried into the document.** Use Google families by name (or a token `src`, below), or the export substitutes a face.
- **The importer names a text layer after its words**, ignoring `layer-name`, so anything keyed by a text layer's name (a shader fill on a word) must use the word itself.

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

**The same goes for the faces that ship with an operating system.** `Didot`, `Baskerville`, `Futura`, `Gill Sans`, `Impact`, `Arial Rounded MT Bold`, `Avenir` and `Helvetica Neue` are installed on a Mac, so they look fine locally and are exactly what you reach for - and the renderer cannot load any of them. An earlier batch of native templates named these and defaulted body text to Arial, and it was visibly weaker than the same briefs redone in Google families. Use `Bodoni Moda` or `Playfair Display` for Didot, `Libre Baskerville` for Baskerville, `Jost` for Futura, `Anton` or `Oswald` for Impact.

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

Hierarchy is made of **contrast**, not of many sizes. Three or four steps is a system; seven is indecision. **Derive the ramp from the artboard for every piece**: one shared `72 / 36 / 18 / 14` ramp across thirty templates is the single clearest reason that earlier batch looked machine-made - a 72px headline is a shout on a business card and a whisper on a 1080 post.

- **Measure the gap between the largest and smallest text.** In the strong templates the largest size is **12-38x** the smallest (a poster's 640px numeral over 18px small print, a social post's 410px "10K" over 16px); in the weak ones it is **3-6x**. This is a better test than counting steps: a piece can use only three sizes (`200 / 25 / 18`) and still have the gap.
- Pair a heavy display weight against a light or regular label weight. Maximise the gap - `weight.display` 700 against `weight.body` 400 is the floor, not the target. A thin or outlined display face at headline size cannot be read across a room; save hairline display for pieces read at arm's length.
- **Think in em, then convert.** `letterSpacing` is in document pixels (unlike line height), so a value that is right at one size is wrong at another. Work out `em × fontSize`:
  - heavy grotesk or geometric display above ~150px: **-0.05 to -0.09em** (410px at -0.073em is -30px);
  - display around 80-150px, and condensed faces (Anton, Oswald) at any size: **-0.02 to -0.04em**;
  - display serif: about **-0.02em**; quiet serif in a restrained language may even open slightly;
  - small caps labels, eyebrows, handles: **+0.12 to +0.16em**, up to +0.3-0.5em for Deco or Japanese spaced labels.
- `lineHeight` in `.design` is a **ratio of the font size**, not pixels. Writing `76` here is a 76x line - the single most common way to destroy a layout. Stacked heavy or condensed caps want **0.8-0.92**; a two-line display serif about 0.95-1.05; body text 1.4-1.65. Display set at 1.02-1.08 is one of the things that made weak templates look slack.
- **Pull big type to the optical edge.** A 400px headline aligned to the same `x` as the body text looks indented, because its side bearing is wide. Shift it left by roughly 0.05em (or let it bleed off the edge on purpose) so the stem lines up with the text below.
- **The italic swap**: set one word or the second line of a headline in the same family's italic, often indented - "Keep it / _simple._", "thirty-_six_". It adds a voice without adding a family, and it is the cheapest way to make an editorial headline feel set by hand.
- **A mono third voice for metadata.** Display face + text face + a mono (`DM Mono`, `JetBrains Mono`, `Space Mono`, `IBM Plex Mono`) for dates, codes, prices, folios and labels appeared in half of the strong pieces. Mono with tabular figures is also how numbers line up in a column. Beyond those three, a new family needs a reason; only period letterpress and punk earn four or more, and even there the six-face poster was the weakest of its set.
- **Never split a word across lines or colours for effect**, and never hyphenate a display heading. "Week / ly" in two colours reads as broken. If a headline doesn't fit, change its size, measure or wording - and because nothing measures text, give each display line its own layer or a fixed width that holds it, so an edited word changes the size rather than wrapping.
- **Size floors depend on how the piece is read** - see [Format floors](#format-floors). A screen-UI floor like "body 16px" is wrong for an A4 artboard and far too small for a 1080 post seen on a phone.
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
      <p style="font:700 12px Jost;letter-spacing:1.6px">BRAND MOODBOARD</p>
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

## Scale: one element does the shouting

The difference between the strongest and weakest templates in the library was almost never palette or style. It was **nerve**: the strong ones let one element be enormous.

- **The dominant element spans 20-50% of the artboard width** - a headline, a numeral, a shape or an object. Poster headlines sat at 0.30-0.52 of the width, social numerals at 0.20-0.40, deck hero numbers at 28-44% of the slide height. Every weak piece in every collection had its headline at **7-13%** of the width. When the type is deliberately quiet, a shape must carry the scale instead: a single circle at about 55% of the width, a model filling two-thirds of the frame.
- **Let it bleed or crop.** The biggest element running off one or two edges (a word cut by the trim, a photo bleeding off the top-right) tells the eye the frame was chosen, not filled.
- **Cross the seam.** Where a piece splits into image and panel (around 60/40), put one element across the line between them - the headline overlapping the photo's bottom edge, a date block straddling the join, a sticker over the boundary of two colour blocks. That one overlap ties the two zones together; without it they read as two pictures stuck side by side.
- **Type and image should touch.** In the weak native batch the picture sat in a circle or arch frame and the type sat politely below it, never touching. The strong versions put the headline across the photo, behind the subject or bleeding with it.
- **Rotation comes in two kinds only**: structural diagonals of **-12° to -30°** that cross the full field and bleed past the edges, and paste-up jitter of **±1-3°** (up to ±8° for stickers and annotations). Anything in between - a 10° tilted card - looks accidental.
- **Flush left by default.** Centring is a choice for invitations, ceremonies and symmetrical languages (Art Deco); as a default it produced the flattest pieces in the library, especially inside a decorative frame.
- **Don't nest frames.** A double rule border plus an arch window shrinks the live area by about 15% and makes everything inside it smaller.

## Space

- **Vary spacing deliberately.** Tight inside a group, generous between groups. Uniform gaps everywhere read as a wireframe. `space.2` binds a label to its value; `space.5`/`space.6` separates sections.
- **Margins are 4-6% of the short side for loud pieces and about 8% for quiet ones.** Margins of 8-14% on a loud piece read as timid rather than generous - the content shrinks to fit them. On a 1920 slide that is 43-65px (about 86px for a quiet one); on a 1080 post 40-56px (84px for a quiet one); on A4 at 150ppi 60-80px.
- White space is the feature. Give hero content room; resist filling a quiet area - but white space only works around something large.
- An artboard is a fixed rectangle and nothing measures content, so size it deliberately: pick the format's height first, then fit the content to it. When the render shows clipping, grow the artboard or cut content - never let a stack of `space.*` gaps silently push the last section off the page.
- Favour asymmetry and scale contrast over a tidy grid: one very large headline beside small muted text beats four equal columns.

## Format floors

The right minimum size depends on how far away the piece is read and how much it is scaled down. Sizes are in document pixels at the artboard sizes given.

| Format             | Artboard                           | Smallest text                            | Body / facts                      | Dominant element                                       | Also                                                                               |
| ------------------ | ---------------------------------- | ---------------------------------------- | --------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Instagram post     | 1080 × 1080 / 1350                 | 15-18px, only for folios, handles, codes | **24px+**; date, price, CTA 28px+ | 20-40% of width                                        | Shown at ~390pt wide, so divide by 2.8 to get what the reader sees                 |
| Story / reel cover | 1080 × 1920                        | 22px                                     | 30px+                             |                                                        | Nothing essential in the top 250px or bottom 340px; leave room for native stickers |
| Pinterest pin      | 1000 × 1500                        | 22px                                     | 28px+                             | Headline 90px+ (9%+ of width) in the top third         | Pins show ~236px wide in the grid                                                  |
| Link ad            | 1200 × 628                         | ~24px                                    |                                   |                                                        | Treat as a billboard: at most three sizes                                          |
| LinkedIn banner    | 1584 × 396                         |                                          |                                   |                                                        | Avatar covers about x 0-380, y 200-396; keep content in the right two-thirds       |
| Slide              | 1920 × 1080                        | 15px for sources only; labels 17px+      | **24-34px**                       | Cover headline 190-260px; hero number 300-480px        | Under ~22px reads as a document, not a slide                                       |
| A4 / A3 print      | 1240 × 1754 / 1754 × 2480 (150ppi) | 15px (7pt) labels in ink, not pale grey  | 17-24px (8.5-11pt)                | Poster headline 0.3+ of width; A3 190px+ to read at 5m | Text 60px+ inside the trim; export at scale 2                                      |
| A5 / DL flyer      | 874 × 1240 / 585 × 1240            | 16px                                     | 18-21px for values                |                                                        | 40px safe margin                                                                   |
| Business card      | 1050 × 600 (300ppi)                | 22px (~5pt)                              | Contact 24px on a 1.4 line        | Name 72-112px, or one gesture on the back              | Margins 52-60px                                                                    |
| Roll-up banner     | 850 × 2000 (1px = 1mm)             | 17px                                     |                                   | Headline cap height 100px+, in y 200-800               | Bottom 120px is background only (lost in the base); QR 170px+ above y 1850         |
| Landing page       | 1440, checked at 390               |                                          | 17-20px, measure 52-62ch          | Hero 9-10.4vw                                          | Change the ground every 1-2 sections; end on a solid-accent CTA band               |

Print pieces are trim size without bleed: anything meant to bleed must run past the trim, and the printer adds 3mm.

## Colour

- **One intense colour moment beats five polite ones.** The accent should appear once or twice with conviction, not tinted across every element.
- **Put the accent on the answer** - the one value the reader came for. The amount due on an invoice, the most-booked package on a rate card, tonight's special on a menu, the winning bar in a chart, the net-profit row in a P&L. Everything else stays ink. A muted accent that never reaches full strength anywhere means the piece has no hero moment.
- **Tonal separation before hue.** Pink type on a pink-and-yellow bloom fails however good the hues are; the type needs a clearly lighter or darker value than whatever sits behind it.
- Contrast is non-negotiable. Muted text is a hierarchy tool, not a default - if you have to squint, it fails. Be strictest below 16px.
- Secondary accents are for when they do work: categories, series in a chart, semantic states. Pull them from the same scene as the primary. If you add them, spend less elsewhere - more colours already add the complexity a flourish would have.
- Default to light mode unless asked otherwise.
- Skip the late-2010s reflexes: gradient-on-everything, stacked soft shadows, glassmorphism. One deliberate gradient or one offset shadow, used with intent, is fine.

## Structure

- **Prefer surfaces to boxes.** Information sitting directly on the page usually beats the same information in a card. Reach for a card when it groups something genuinely separable.
- **Web furniture does not belong on print.** Pill chips, rounded cards and a friendly sans turn a roll-up banner or poster into a website screenshot. Print pieces take rules, blocks and type.
- A container with a `layout` paints its own background, radius, stroke and shadow - so a card is **one** object, not a rectangle plus a group whose frames you keep in step. A plain group (no `layout`) paints nothing, which is the Frame-versus-Group rule.
- Repeated rows (lists, tables, nav) must form **vertical lanes**. Give icons and trailing actions a fixed-width slot - a fixed `frame.width` with `grow: 0` and `shrink: 0` - even when a row's slot is empty. Never rely on `gap` alone to line columns up across rows with different content.
- Reach for `layout` before coordinates. Anything repeated is fewer tokens and re-flows when it changes.
- Reach for the layout item's own controls instead of hand-placed numbers: `basis` with `grow: 0` and `shrink: 0` for a column that must hold its width, `alignSelf: "stretch"` to fill the cross axis, and a fixed `frame` for media so it keeps its aspect ratio.

## Facts, data and documents

The date, place, price and CTA are what a poster is _for_, and an invoice or rate card is nothing else. Information set well looks designed; information set as an afterthought sinks a striking piece.

- **Facts as a label / value table.** Small tracked caps labels (often mono) in one column or above, values in the body face at a clearly larger size or weight, hairline rules between rows, laid out in a 2-3 column grid. It reads instantly and looks like printed matter. Decorative display faces never carry information - a date in Cinzel Decorative or Shrikhand at 16px is a failure.
- **The meta strip.** Directly under a document's title, a row of 3-5 tracked caps labels over values: _Client / Industry / Region / Date_, or _Date / Time / Where / Chair_. Almost every strong functional document had one.
- **Edge furniture.** 11-15px tracked mono at the corners and edges - an issue number, a date, "FREE ENTRY", a vertical side label, a folio - is what makes a social graphic or poster read as printed matter. The weak native batch had 3-6 text layers per piece; the strong redesigns had 10-15, most of them this kind of small furniture around one huge element.
- **Rules by meaning, in three weights**: a hairline in a tint between rows, a slightly heavier rule under a running header and over the footer, a full ink rule under a section head. Heavy rules everywhere only when the language demands them (Constructivist).
- **Tables**: horizontal hairlines only, no vertical rules; header row in tracked caps; totals marked by a heavier rule or a single band; numbers right-aligned in mono or tabular figures. More than about 8 columns does not fit A4 portrait - go landscape rather than shrinking the type.
- **Numbered sections**: "01" in the accent, mono, about 60% of the heading size, sharing its baseline, with a muted right-aligned qualifier ("PER UNIT").
- **Running header and footer**: mono caps in a muted colour, three slots - organisation, document number, "1 / 2".
- **Charts in the language's own vocabulary.** A Bauhaus pie built from its circles, a timeline drawn as an orbit or a transit line with stops, a terminal deck plotting with `> plot`. One series in the accent - the answer - and the rest in ink or greys; a colour per series only when the series are the subject.
- **Colour encodes role in data**: input cells one tint, subtotal rows a full-width band, a status colour only on the values that need attention.
- **The style survives in the vernacular devices, not the ornament**: a boarding-pass stub on an itinerary, departure-board times on an agenda, a rotated hanko seal on an invoice. One signature device at the masthead, then the body stays functional.

## Photos and texture

- **The photo treatment is part of the language**, so put it on the style card: greyscale with high contrast for Swiss, brutalist and constructivist; one-ink duotone for risograph and Blue Note; slightly desaturated (about 70% saturation) for editorial; untouched colour only when the colour is the point.
- **A photo bleeds off one or two edges and takes 55-70% of one axis**; type owns the opposite column or band. An inset photo with a margin all round is a postage stamp.
- **Never set type on a busy part of a photo** without a band, a shade or a duotone flat enough to carry it. A duotone is often the whole fix: white type sits on a dark one-ink photo with no scrim.
- **Cut-out shapes**: a photo in an arch window, a parallelogram, a circle. The shape belongs to the language - an arch is a window, a wedge is agitprop.
- **Prefer objects, places, textures and hands to posed people.** Generic smiling stock is the default look.
- **Texture is quiet and on top**: a fine grain (1px dots at 5-6px spacing, 5-10% opacity), a halftone, a misregistration offset of 2-5px. Texture over the facts makes them unreadable; keep the information on clean ground.
- **Don't simulate a finish the screen can't show.** A tone-on-tone deboss at 1.1:1 contrast is invisible; foil, emboss and spot varnish need a real print spec, not a picture of one.

## Sets: decks, carousels, front and back

A multi-artboard piece must read as one system and still not repeat itself.

- **Fixed chrome, varied field.** Hold the left margin, the kicker (caps, tracked, in the accent, numbered "2 · The evidence"), the running rule or folio, and the two faces constant on every artboard. Vary the ground (paper, ink, accent), the split ratio and the scale from one to the next.
- **The cover is the loudest artboard and different from the rest** - it is the thumbnail. The swipe cue goes on the cover only.
- **The close inverts the cover**: white to solid red, cream to black. It tells the reader they have reached the end.
- **One hero-number slide per deck**, set larger than anything else in the deck (300-480px on 1080), with the chart beside it and the accent on the bar that answers.
- **Pick slide archetypes and vary them**: cover, numbered agenda (numerals at display size, not a list of 15px items), photo and text split, hero number with chart, quote or comparison, CTA. One idea per slide; a table belongs on at most one slide, and dense tables go in an appendix.
- **Carousel narratives that work**: overview then zoom (a contact sheet, then one frame with crop marks), one concept per slide then a recombined summary, a colour-flipped slide for the numbers. The last slide asks something ("Which one hit hardest?"). Seven identical cards in a row is monotony.
- **Front and back have different jobs.** A business card's front is the person - quiet, flush left, contact in aligned columns. Its back is the brand - one oversized gesture (a glyph cropped by the trim, a shape cut by a bar), at most two text items. A flyer's front sells; its back serves (map, menu, set list) and keeps the front's display face for its heads while dropping the imagery. Tie the sides with the same family and mark, and an inverted ground.

## Composing around a shader or a 3D model

A shader fill or a live model is not wallpaper behind a normal layout. Compose around it.

- **Either the hero or the type shouts, not both.** When the shader or model is the hero, give it 60-90% of the short side and step the headline down to 6-10% of the width. When the shader paints the type, use a heavy face at 20-45% of the width.
- **Put the shader in a named shape and keep the copy on flat ground.** The strongest pieces clipped it to a disc, an arch, a pill, a band, a silhouette (crackle glaze inside a vase) - not a full-bleed rectangle with text over it.
- **Make the shader's ground uniform the artboard's background colour**, so the shape dissolves into the page instead of reading as a pasted rectangle. Take the one type accent from one of the shader's inks; the rest of the palette is ground, ink and that accent.
- **If copy must sit on the shader, build the protection into the shader** as a named uniform ("Shade under type", "Clear area", a movable "Glow centre"), so a user who rethemes it keeps the text legible. A 40% shade is not enough over high-frequency detail like bokeh or rain. A shader on text needs about 3:1 between the fill's darkest value and the ground, or the letterforms lose their edges.
- **Choose the first frame.** Thumbnails and exports render `uTime = 0`, so offset time (`uTime * k + 3.7`) until that frame is the beautiful one. Posters move slowly (`k` around 0.05); social and screens 0.35-1.
- **Name uniforms by role in plain words** ("Ground", "Sumi ink", "Ring density") and expose only 1-4 floats that mean something.
- **Exported shaders bake at most 1024px on the longest side**, so a full-bleed A3 shader is upscaled about 2.4x in print. Use soft shaders (noise, gradients, marbling) for large print layers and keep crisp-line ones (moiré, contours, Truchet) on smaller layers.
- **Ground a 3D object**: a horizon line at about 70% of the height, a plinth or surface, a contact shadow (an ellipse 6-9% as tall as it is wide, about 75% of the object's width, painted below the model and tinted with a darkened ground hue - never black on a light ground), and a soft glow in the material's colour behind it. Let the model's box overlap the shadow slightly so it sits into it rather than hovering.
- **Pose like a product photographer**: a narrow `fov` of 24-28, a three-quarter `yaw` of 15-40 (never 0), `pitch` 4-22. A pair faces inward with opposite yaws. A detail inset of the same model, much closer, in a small circle gives a 3-5x scale jump.
- **Let type and object interleave**: a huge word behind the object with the object crossing in front of it, tone-on-tone numerals behind a product, a disc the object breaks out of.
- **Avoid**: a dark object on a dark environment over a dark floor (the shadow vanishes), glass and transparent materials (they render flat grey), raymarching a recognisable product in a shader (it reads as CG - use a real model), and leader lines hand-placed against a pose a user can change.

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
4. **Scale** - measure it rather than eyeballing it. Is the dominant element at least 20% of the artboard width (30%+ on a poster)? Is the largest text at least ~12x the smallest? If the answer is "about 10%" and "about 5x", the piece is timid however good the palette is; make the one element bigger before touching anything else.
5. **Spacing** - uneven gaps, cramped groups, or a region that is empty by accident rather than by choice?
6. **Typography** - is the smallest text above the floor for this format, read at the size the reader will actually see it (a phone, a slide across a room, a pin in a grid)? Is there a real step between heading, body and caption? Is any word split across lines or colours?
7. **Contrast** - does anything disappear into its background? Pale grey labels at small sizes and type on a busy photo are the usual culprits.
8. **Alignment** - do elements that should share a lane actually share it? Trace a vertical line through the icons of three repeated rows.
9. **Repetition** - is it uniform to the point of dullness? Vary scale, weight or spacing. Across a set, would the artboards still read as one system with the colour removed?
10. **Flatness** - count what you used. A document with no `effects`, no `layout` and no gradient across dozens of objects is a wireframe, whatever its palette: every card is a flat rounded rectangle with no edge and no elevation. `shadow.card` on the surfaces that are genuinely lifted is usually the whole fix.

Fix what you find with targeted edits. **Do not delete the work and start over** - rebuilding is slow and reads as flailing. An overflowing frame is a sizing fix, not a reason to rewrite the frame.

When the user needs the finished design deck as PowerPoint, discover and run the `design_to_pptx` action. It writes an editable `.pptx` into the workspace with slide order, notes, sections, hidden slides, shapes, text, media and fonts preserved where PowerPoint supports them. Keep the `.design` as the primary editable source; do not rebuild the deck with `python-pptx`.

## Build it up in pieces

Write one visual group per edit - a header, a row, a card, a footer - rather than one call that emits the whole document. The user watches it appear, and a mistake costs one group instead of the page. It also keeps each diff small enough to check.
