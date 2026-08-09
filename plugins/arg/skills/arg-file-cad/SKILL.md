---
name: arg-file-cad
version: "1.0.0"
description: Create, read, update, and delete .cad files in Arg — the native parametric CAD format for interior floor plans, buildings, site plans, structural frames and bridges. Also covers reconstructing an accurate measured drawing from a LiDAR scan (.glb/.gltf mesh, or .las/.ply/.xyz/.pts point cloud). Load when authoring or editing architectural, structural or civil drawings, or when working from a scan.
---

# CAD files (`.cad`)

`.cad` is Arg's native parametric CAD format: dimensioned 2D drawings for interior layouts, buildings, site plans, structural frames and bridges. It is JSON on disk and opens in an editor with two surfaces — a simplified **Design** view and a full **Draft** view — over one document.

Imported AutoCAD drawings (`.dxf`, `.dwg`) open in a separate **read-only** viewer. DWG has no open write path and DXF cannot carry a parametric model, so **author new work as `.cad`**, not as DXF.

## CRUD

Use your active Arg access method (`arg-mcp` / `arg-cli` — see `arg-files`) and the shared rules in `arg-files`. `.cad` is text — read and edit the JSON directly.

## The one rule that matters

**Store intent, not baked geometry.** A `.cad` file records wall centrelines, hosted openings, parameters and grids; the editor derives the polygons. Never pre-compute a wall's outline, never cut an opening out of a wall's path, never hard-code a dimension you could drive from a parameter. A drawing that stores intent stays editable; one that stores geometry is a picture.

## Units and axes

- **All lengths are millimetres.** `units` is a _display_ preference only (`"mm"`, `"cm"`, `"m"`, `"in"`, `"ft"`) and never changes stored values.
- **All angles are degrees**, clockwise.
- **y grows downward** (screen/SVG orientation). A room at `y: 0..4000` sits below the origin on screen.
- Points are `{ "x": 0, "y": 0 }` or the compact `[x, y]`.

## Top level

```json
{
  "version": 1,
  "units": "mm",
  "metadata": {
    "title": "Apartment",
    "discipline": "architectural",
    "defaultView": "design",
    "scale": 100
  },
  "parameters": { "wallThickness": 100, "wallHeight": 2700 },
  "layers": { "...": {} },
  "levels": [{ "id": "level-0", "name": "Ground floor", "elevation": 0, "height": 2700 }],
  "materials": { "...": {} },
  "blocks": { "...": {} },
  "entities": { "...": {} },
  "order": ["wall-1", "room-1"]
}
```

- `metadata.defaultView` — `"design"` (simplified; use for interior/residential plans) or `"draft"` (full drafting; use for structural, civil and anything dimensioned for construction).
- `order` is draw order. An entity missing from `order` still draws, last — so appending to `entities` alone is safe.
- `layers`, `levels` and `materials` are all optional; sensible defaults are supplied.

## Parameters

Named numbers, or expression strings over other parameters. Any entity length field accepts a number **or** an expression string.

```json
"parameters": {
  "wallThickness": 100,
  "wallHeight": 2700,
  "headHeight": "wallHeight - 600"
}
```

Expressions support `+ - * / % ^`, parentheses, `pi`/`e`, `min max abs round floor ceil sqrt sign hypot pow`, degree-based `sin cos tan asin acos atan atan2`, and unit-suffixed literals (`3.5m`, `18in`). They are parsed, not evaluated — no host access.

**Drive repeated dimensions from parameters.** Changing `wallThickness` should re-derive every wall.

## Entities

`entities` is an id-keyed map. Every entity has `id`, `type`, and optional `name`, `layer`, `level`, `material`, `locked`, `hidden`.

| Type                                    | Key fields                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `wall`                                  | `path` (centreline points), `thickness`, `height?`, `closed?`, `alignment?` (`center`\|`left`\|`right`)                              |
| `opening`                               | `kind` (`door`\|`window`\|`opening`), `host` (wall id), `distance` along that wall, `width`, `height`, `sill?`, `swing?`, `flipped?` |
| `room`                                  | `boundary` polygon, `name?`, `roomNumber?`, `finish?`                                                                                |
| `slab`                                  | `boundary`, `thickness`, `holes?` (rings), `elevation?`                                                                              |
| `column`                                | `at`, `profile`, `height?`, `rotation?`                                                                                              |
| `beam`                                  | `start`, `end`, `profile`, `elevation?`                                                                                              |
| `grid`                                  | `origin`, `xSpacings`, `ySpacings`, `xLabels?`, `yLabels?`, `extension?`                                                             |
| `truss`                                 | `start`, `end`, `depth`, `panels`, `style`, `deck?`, `camber?`                                                                       |
| `cable`                                 | `start`, `end`, `sag`, `profile?`, `hangers?`, `deckY?`                                                                              |
| `dimension`                             | `style`, `from`, `to`, `offset?`, `text?`                                                                                            |
| `text`                                  | `at`, `text`, `height?`, `rotation?`, `align?`, `leader?`                                                                            |
| `polyline` / `circle` / `arc` / `hatch` | plain drafting geometry                                                                                                              |
| `blockRef`                              | `block` (id in `blocks`), `placement` `{ position, rotation?` (degrees)`, scale?, mirrored? }`                                       |
| `group`                                 | `children` (entity ids)                                                                                                              |
| `camera`                                | `at`, `height?` (eye level, default 1600), `rotation?` (bearing, degrees), `pitch?`, `fov?` (default 60), `shot?`                    |

### Openings are hosted, never cut

An `opening` names a `host` wall and a `distance` along that wall's centreline. The editor splits the wall around it. Sliding a door is a one-number edit.

```json
"door-1": { "type": "opening", "kind": "door", "host": "wall-1", "distance": 2500, "width": 900, "height": 2100 }
```

### Structural profiles

`profile` is one of `rect` (`width`,`height`), `circle` (`diameter`), `hollow-rect` (+`thickness`), `hollow-circle` (+`thickness`), `i-beam`/`channel` (+`webThickness`,`flangeThickness`), `angle` (+`thickness`). A `name` may carry a catalogue designation (`"UC 305x305x97"`).

### Trusses generate their own web

Give a truss its `start`, `end`, `depth`, `panels` and `style` (`warren`, `warren-verticals`, `pratt`, `howe`, `k`) — do not draw individual members. `deck: "top"` hangs the truss below its baseline.

### Cameras are viewpoints, not geometry

A `camera` marks where someone stands and what they look at. It is stored as a
plan position plus a bearing and a pitch rather than as a matrix, so dragging it
in plan or spinning its cone is an edit of two numbers and the 3D view derives
the rest. Heights are measured from the level's floor, so a camera stays at eye
level when the storey height changes.

Cameras carry no volume, mass or bounds — they are annotations, and
`buildSolids` returns them in a separate `cameras` array so they stay out of
every take-off. Put them on `layer-annotation`. In the editor they can be placed
in plan or dropped from the 3D view, and the 3D view can look through any of
them.

## Built-in layers and materials

Layers: `layer-walls`, `layer-openings`, `layer-rooms`, `layer-structure`, `layer-grid`, `layer-annotation`, `layer-dimensions`, `layer-default`.

A new drawing starts with six materials: `mat-concrete`, `mat-steel`, `mat-timber`, `mat-brick`, `mat-glass`, `mat-plaster`. Assigning one gives an entity a computed mass and cost, which roll up into the drawing totals, and sets how it looks in 3D.

Around 120 more are available across eight categories — `concrete`, `steel`, `timber`, `masonry`, `glass`, `finish`, `soil`, `other` — including `mat-oak`, `mat-brick-engineering`, `mat-stone-limestone`, `mat-terrazzo`, `mat-timber-floor`, `mat-asphalt`, and one entry per texture in the bundled PBR library (`mat-marble012`, `mat-woodfloor041`, …). Every catalogue material except glass carries a `pbr` texture reference in its appearance, so picking any of them renders a real surface in 3D — there is no separate texture field to set. **Copy the definition into the file's `materials` map** when you use one that isn't a starter, exactly as you would a block — a drawing that references a material it does not define reports no mass for it. `standardMaterial(id)` and `searchMaterials(query, category)` in `@arg/cad` return them.

## Furniture and fittings

Place library blocks with `blockRef`: `sofa-2`, `sofa-3`, `armchair`, `chair`, `table-dining-6`, `table-round`, `table-coffee`, `desk`, `bed-single`, `bed-double`, `bed-king`, `wardrobe`, `bookshelf`, `kitchen-sink`, `cooker`, `fridge`, `worktop-run`, `wc`, `basin`, `bath`, `shower`, `stair-straight`, `lift`, `tree`, `car`, `parking-bay`, `north-arrow`.

Copy the definition into the file's `blocks` map so the drawing renders standalone (the SDK's `place()` does this automatically).

### Real products: blocks that carry a mesh

A block can reference an external 3D model instead of authoring `solid` prisms:

```json
{
  "id": "ikea-70217685",
  "name": "HEMNES High cabinet",
  "entities": [
    /* plan footprint */
  ],
  "height": 2000,
  "model": {
    "url": "https://cdn.arg.ai/…/70217685_….glb",
    "source": "ikea",
    "reference": "70217685"
  }
}
```

The document records the URL, never the geometry, so a plan stays kilobytes
while specifying an actual product. The 2D views draw the block's own footprint
and never fetch the mesh — a plan opens and prints with no network — and only
the 3D view loads it. The URL must be absolute `http(s)`; a relative one is
rejected, because a drawing is shared and would otherwise resolve against
whoever opened it.

`model.plan` is a top-down orthographic render of the product, drawn into the
2D views _behind_ the block's own footprint — the drawn outline stays
authoritative, so a plan is still complete and printable if the image never
loads.

The editor ships the IKEA library (6,687 fittings with models, 23 categories)
under Furniture & fittings. Its footprints are measured off the meshes
themselves rather than read from the listings, which are rounded display
strings and are missing or partial for much of the library. Always set a real `height` and a footprint at the
product's measured size — the mesh is authoritative in 3D, but the plan is what
gets dimensioned and built from.

## Prefer the SDK

When `run_bash` is available, use the `@arg/cad` TypeScript SDK rather than hand-writing JSON. It owns id generation, draw order and defaults, and its output is deterministic — the same script produces byte-identical bytes, so a generated drawing reviews as a clean diff.

```ts
import { CadBuilder, vec } from "@arg/cad";

const cad = new CadBuilder({ title: "Apartment", defaultView: "design" });
cad.parameters({ wallThickness: 100, wallHeight: 2700 });

const living = cad.roomWithWalls(
  { x: 0, y: 0, width: 5000, height: 4000 },
  { name: "Living", thickness: "wallThickness", height: "wallHeight" },
);
cad.door(living.walls, 2500);
cad.window(living.walls, 7000);
cad.place("sofa-3", vec(2500, 800), { rotation: Math.PI });
cad.dimension(vec(0, 0), vec(5000, 0), { offset: -1200 });

await writeFile("plans/apartment.cad", cad.toJSON());
```

One-call generators for whole drawings:

```ts
import { bridge, building, floorPlan } from "@arg/cad";

floorPlan({ rooms: [{ x: 0, y: 0, width: 5000, height: 4000, name: "Living" }] }).toJSON();
building({ xBays: [7500, 7500, 7500], yBays: [6000, 6000], storeys: 3 }).toJSON();
bridge({ span: 40_000, type: "truss", trussStyle: "warren" }).toJSON();
```

`bridge` types: `truss`, `beam`, `suspension`, `cable-stayed`, `arch`.

Read `cad.evaluate()` for derived measurements — per-entity length, area, volume, mass, plus document totals — without opening the editor.

## The 3D view

A `.cad` document has a third view — **3D** — beside Design and Draft. It is not a separate model: `buildSolids(document)` derives solids from the same drawing, so a wall you move in plan moves in 3D.

Everything becomes one of two primitives, and **no CSG is involved anywhere**: a wall with a door is emitted as the solid runs either side plus a lintel over it (and a spandrel under a window's sill), which is exact and cheap.

| Element                                      | 3D form                                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| `wall`                                       | Extruded between its base and height, split around its openings |
| `opening`                                    | A glazed pane for windows; doors are voids                      |
| `slab`                                       | Extruded down from its top surface, voids carried through       |
| `column`                                     | Its profile extruded to its height                              |
| `beam`, `truss`, `cable`                     | Bars with the member's cross-section                            |
| `blockRef`                                   | The block's authored `solid` prisms                             |
| `room`, `grid`, `dimension`, `text`, `hatch` | Annotation — no 3D form                                         |

Two render modes: a realtime one with ambient occlusion, and a progressive **ray-traced** one that accumulates while the camera is still. Both read the same materials, so `mat-glass` is transparent in each.

**Projection.** A plan is extruded upward. A bridge or a section is authored as an _elevation_ — its drawing plane is already vertical — so the view reads `metadata.discipline === "civil"` and switches. Set the discipline correctly and the 3D view stands your bridge up rather than laying it flat.

## Giving a block a 3D form

A block with no `solid` is extruded from its 2D footprint, which reads as a solid slab — right for a worktop, wrong for a chair. Real furniture carries prisms:

```json
"blocks": {
  "table": {
    "id": "table", "name": "Table", "color": "#b98b5e",
    "entities": [ /* the plan symbol */ ],
    "solid": [
      { "points": [[-800,-400],[800,-400],[800,400],[-800,400]], "base": 720, "top": 760 },
      { "points": [[-40,-40],[40,-40],[40,40],[-40,40]], "base": 0, "top": 720 }
    ]
  }
}
```

A prism is a footprint ring extruded between `base` and `top` (millimetres above the block's insertion plane), with an optional `color` and `opacity`. One primitive covers boxes, cylinders (a tessellated ring) and arbitrary profiles, so there is never a choice of representation to get wrong.

The built-in library ships plan symbols _and_ 3D forms for everything except the drawing furniture (north arrow, scale bar, section mark), which is annotation.

### The 3D view is editable

Clicking a solid selects the entity it came from, and dragging an
already-selected one slides it on the floor plane. The drag is gated on prior
selection so orbiting still works from every other surface, and it runs through
the same transform code as a plan drag, so it is one undo step and cannot
disagree with what the 2D views show.

## Editing an existing drawing

`translateEntity`, `rotateEntity` and `scaleEntity` move a single entity; `transformEntities(document, ids, transform)` moves a set as one rigid body. Two behaviours worth knowing:

- An `opening` is a no-op under all three. It rides its host wall, so moving the wall carries it — transforming both would move it twice.
- Rotation advances an entity's _own_ orientation as well as its position, so a rotated plan doesn't leave every column facing its original way.

`scaleEntity` and the `scale` transform take either a uniform number or `{ x, y }` for a box resize. Point geometry stretches on each axis independently; anything the format can only express uniformly — a circle's radius, a structural profile, a text height, a block instance — scales by the mean of the two, because the alternative is inventing ellipses and squashed I-sections the model has no way to store.

Openings are resized and slid with their own operations, since they are positioned by a `distance` along a wall and a `width` rather than by points:

```ts
resizeOpening(document, "window-1", "start", vec(2000, 0)); // drag one jamb
moveOpeningAlongWall(document, "door-1", vec(3500, 0)); // slide it along the wall
```

Both project the point onto the host wall's centreline (resolved exactly as the renderer resolves it, `alignment` included), hold the opposite jamb still, and clamp to the wall's run so an opening can never hang off its own wall. Widths never fall below `MIN_OPENING_WIDTH`.

## Reconstructing a drawing from a LiDAR scan

`@arg/cad` reads scans and reconstructs an accurate, editable plan:

| Format                 | Notes                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.glb`, `.gltf`        | **What a phone scan usually is.** Polycam, Scaniverse and Room Plan all export a mesh. Triangle faces are sampled, not just their corners, because a scan mesh is sparse across a flat wall and vertices alone under-fill it. |
| `.las`                 | Uncompressed survey point cloud.                                                                                                                                                                                              |
| `.ply`                 | ASCII and binary.                                                                                                                                                                                                             |
| `.xyz`, `.pts`, `.asc` | Plain text.                                                                                                                                                                                                                   |

`.laz` is **not** supported — it needs a dedicated decompressor; ask the user to export uncompressed `.las`.

```ts
import { parsePointCloud, reconstructFloorPlan } from "@arg/cad";

const { cloud } = parsePointCloud(
  await readFileBytes("scans/ground-floor.glb"),
  "ground-floor.glb",
);
const { document, report } = reconstructFloorPlan(cloud, { source: "ground-floor.glb" });

await writeFile("plans/ground-floor.cad", JSON.stringify(document, null, 2));
```

The pipeline slices the cloud above furniture height, extracts wall faces by RANSAC, squares them onto the building's own axes, **pairs opposite faces to measure each wall's real thickness**, and closes corners the scanner could not see into.

**Always report the accuracy.** `report` carries `rms` (the fit residual in mm), `wallsCreated`, `wallsMeasured` (walls whose thickness was measured rather than assumed), `ceilingHeight`, `dominantAngleDegrees` and `storeys`. A reconstruction is a measurement; presenting it without its uncertainty invites someone to build from it.

The building's grid is measured once from the raw detections and every later stage is held to it, so a room scanned at 7° comes back as a clean 7° plan rather than a spray of nearly-parallel walls.

Useful options: `sliceHeight` (default 1200 mm), `voxelSize`, `pair.defaultThickness`, `regularize.manhattan` (force square — off by default, because plenty of real buildings genuinely aren't), and `offGridMinLength` (default 1500 mm — how long an off-grid segment must be before it counts as a wall rather than as furniture the slice cut through; set it to 0 to keep every detection).

A real handheld scan does not come back as a closed set of rooms: a scanner sees what it was pointed at, so expect gaps where a wall was occluded, and expect to draw those few runs in by hand. Reconstruction gets the measurements right; it does not invent the parts nobody scanned.

Multi-storey scans reconstruct the **lowest** storey and warn; re-run per storey using `detectStoreys(cloud)` to find the others.

## Drawing conventions

- Draw to real dimensions: 900 mm doors, 100 mm partitions, 200 mm external walls, 2700 mm ceilings, 300 mm stair goings.
- Name and number rooms; the editor computes and labels their areas.
- Dimension the overall envelope, and each structural bay.
- Put a structural grid on anything with columns — it is how a building is set out and how it gets referred to on site.
- Assign materials on structural elements so the drawing can report a mass.
