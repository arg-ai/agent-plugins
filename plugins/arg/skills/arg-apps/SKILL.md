---
name: arg-apps
version: "2.11.1"
description: Build React previews and arg-apps in Arg. Covers live .tsx/.jsx apps with relative workspace modules, @arg/ui, @arg/actions, versioned npm imports, plus self-contained .html apps using window.arg for files, identity, and Actions, responsive layout and safe areas for the full-screen iOS and Android web views, HyperFrames .html motion-graphic compositions that play in the editor and render into .video timelines, and .server files that call third-party APIs through the integration broker.
---

# React previews and arg-apps (`.tsx`, `.jsx`, `.html`, `.htm`)

Use `.tsx` or `.jsx` for a React component, UI prototype, or small app that benefits from modules and npm packages. The editor compiles the unsaved source and runs the result only on the file's isolated `sitearg.com` preview origin.

Every React preview must export one component as its default export:

```tsx
import { useState } from "react";
import { Button, Card } from "@arg/ui";

export default function Welcome() {
  const [welcomed, setWelcomed] = useState(false);

  return (
    <Card>
      <h1>Welcome</h1>
      <p>{welcomed ? "Hello!" : "This component renders live in Arg."}</p>
      <Button onClick={() => setWelcomed(true)}>Say hello</Button>
    </Card>
  );
}
```

React previews support:

- Relative imports from workspace `.tsx`, `.ts`, `.jsx`, `.js`, `.json`, and `.css` files. Resolution is relative to the importing file and supports extension and `index.*` fallback.
- `@arg/ui`, the same component package Arg uses internally, bundled with standalone theme styles for the isolated preview.
- `@arg/actions`, the typed facade for Action discovery, schema reflection, execution, and run history.
- Bare npm imports when the package has an exact version in the nearest workspace `package.json`. React and React DOM are pinned by the editor. A versioned `https://esm.sh/package@version` import is also accepted.

Static workspace JSON uses a normal default import in both `.tsx` and `.jsx`:

```tsx
import runs from "./data/runs.json";

export default function RunCount() {
  return <p>{runs.length} runs</p>;
}
```

Named and namespace imports work too, and an imported module may be up to 100 MB, so a real dataset can be bundled rather than fetched.

Use `window.arg.fs.readJSON()` plus `window.arg.fs.watch()` when data changes must update the mounted app without rebuilding it. A static workspace import is part of the bundle, so changing that imported file rebuilds and restarts the preview.

```tsx
import { useEffect, useState } from "react";

export default function LiveRunCount() {
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    let active = true;
    let stop = () => {};
    const refresh = async () => {
      const next = await window.arg.fs.readJSON("./data/runs.json", { fresh: true });
      if (active) setRuns(next);
    };
    void (async () => {
      if (!window.arg?.fs) return;
      await window.arg.ready;
      if (!active) return;
      await refresh();
      if (active) stop = window.arg.fs.watch("./data/runs.json", refresh);
    })();
    return () => {
      active = false;
      stop();
    };
  }, []);

  return <p>{runs.length} runs</p>;
}
```

The watcher is format-agnostic. Re-read JSON with `readJSON`, CSV/YAML/XML/text with `read`, Excel and other binary data with `readBytes`, or rerun `arg.db.query` for SQLite. Always request `{ fresh: true }` in the callback and return the watcher's stop function from the effect. This updates only React state; it does not reload the document or reset unrelated component state.

On web and desktop, after a workspace `.tsx`/`.jsx` or `.html`/`.htm` app has been shown, switching to another tab or the Files browser keeps that app runtime mounted and backgrounded; returning reveals the same component/DOM state and watcher session. Closing the tab still tears it down, so persist durable state in workspace files rather than relying on the retained runtime.

While an app is backgrounded, Arg revokes its Actions bridge without replacing the document. Filesystem watches and in-memory UI state stay live, but hidden code cannot start billable Actions; returning restores the unchanged runtime and its eligible session grant.

React previews use the typed `@arg/actions` module for Action discovery, schema reflection, execution, and run history. It delegates to the same isolated `window.arg.actions` bridge used by HTML; it does not fetch directly or expose a token. The viewer must explicitly click **Allow Actions** for the current file session before a call succeeds. The grant is separate from filesystem access because Actions are workspace-wide and may spend credits or use the viewer's connected services.

```tsx
import { actions } from "@arg/actions";

export default function GenerateButton() {
  async function generate() {
    await actions.ready;
    const schema = await actions.schema("image_generate");
    console.log(schema.inputSchema);
    const run = await actions.run("image_generate", {
      prompt: "A red bicycle on a beach at sunset",
      output_path: "/images/bicycle.png",
    });
    if (run.status === "queued" || run.status === "running") {
      console.log(await actions.getRun(run.runId));
    }
  }
  return <button onClick={generate}>Generate</button>;
}
```

The TSX/JSX editor supplies autocomplete and diagnostics for the package and browser contract. Action ids and per-action inputs remain registry-driven: use `list()`, `schema()`, and `describe()` rather than guessing, and expect the backend to validate the input against the current Action schema.

### Arg UI components

`@arg/ui` exports Arg's exact shared `Button`, `IconButton`, `Card`, `FormInput` (`Input` is an alias), `FormTextarea` (`Textarea` is an alias), `KeyboardShortcut`, `Dropdown`, and `ContextMenu` primitives. The preview supplies the active Arg theme as `light`, `focus`, or `dark`; `focus` is the fallback when no explicit theme is present.

Existing previews may also import the legacy `Badge`, `Heading`, `Text`, `Stack`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter` layout helpers. They remain available for compatibility, but new previews should prefer semantic HTML composed with the exact shared primitives above.

Use `Dropdown` for a controlled select. Its API matches Arg's picker: `options` contain `value`, `label`, and optional `description` or `icon`; `triggerVariant` accepts `"default"`, `"field"`, or `"ghost"`; and `searchable` adds a filter input.

```tsx
import { useState } from "react";
import { Dropdown } from "@arg/ui";

const options = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact", description: "Fit more rows on screen" },
];

export default function DensityPicker() {
  const [density, setDensity] = useState("comfortable");
  return (
    <Dropdown
      options={options}
      value={density}
      onChange={setDensity}
      triggerVariant="field"
      searchable
    />
  );
}
```

`ContextMenu` is rendered only while a right-click anchor exists. Pass viewport coordinates in `position`, clear the anchor in `onClose`, and build `items` from `item`, `separator`, `header`, `checkbox`, `submenu`, or `stepper` entries.

```tsx
import { useState } from "react";
import { ContextMenu } from "@arg/ui";

export default function ContextMenuExample() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [pinned, setPinned] = useState(false);

  return (
    <div
      onContextMenu={(event) => {
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      Right-click here
      {menu ? (
        <ContextMenu
          position={menu}
          ariaLabel="Item actions"
          onClose={() => setMenu(null)}
          items={[
            { kind: "item", id: "open", label: "Open", onClick: () => {} },
            {
              kind: "checkbox",
              id: "pin",
              label: "Pin",
              checked: pinned,
              onClick: () => setPinned((value) => !value),
            },
            { kind: "separator", id: "divider" },
            {
              kind: "item",
              id: "delete",
              label: "Delete",
              danger: true,
              onClick: () => {},
            },
          ]}
        />
      ) : null}
    </div>
  );
}
```

### File-type icons

`@arg/ui` also ships the file icons Arg itself draws, so a preview that lists workspace files looks like the product rather than approximating it. Import them from the `@arg/ui/file-type-icons` and `@arg/ui/file-types` subpaths, or from `@arg/ui` directly.

- `FileTypeIcon` - the framed document silhouette used in the file tree, list and grid. Takes `filename`, optional `size` (default 32) and `className`.
- `FileTypeLogo` - the frame-less brand mark for the same type, same props.
- `FolderGlyph` - the folder icon, tinted for the `.skills` / `.agents` / `.arg` capability folders. Takes `name`, `size` and optional `className`.
- `getFileIconType(filename)` and `FILE_ICON_TYPE_BY_EXTENSION` - the extension to icon-type mapping behind all three, if you need to group or filter by type yourself. `getFileLogoGroup(filename)` reports a logo's footprint as `"square"`, `"horizontal"` or `"vertical"`.

Pass the whole filename, not the extension - the mapping reads the extension itself, and an unknown one falls back to a generic file icon rather than failing.

```tsx
import { FileTypeIcon, FolderGlyph } from "@arg/ui";

export default function FileRow({ name, isFolder }: { name: string; isFolder: boolean }) {
  return (
    <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
      {isFolder ? (
        <FolderGlyph name={name} size={20} />
      ) : (
        <FileTypeIcon filename={name} size={20} />
      )}
      <span>{name}</span>
    </div>
  );
}
```

The icons carry their own colours and retint with the preview theme, so they need no styling from you.

React previews expose Actions through `@arg/actions` (backed by `window.arg.actions`) and scoped persistent workspace files through `window.arg.fs`, with independent grants. Enabling one never enables the other.

React previews start with folder-scoped, read-only Workspace access and receive `window.arg` automatically. The user can turn it off or grant Read and write in the preview permissions menu. Keep filesystem capability-dependent code behind `if (window.arg)` and `await arg.ready`; use `.html` when a build-free, single-document arg-app is the better fit.

An **arg-app** is an internal app your team builds and runs inside Arg: a single self-contained `.html` file that becomes its own backend by reading and writing real workspace files — and reading the signed-in user's identity — **at runtime** via the `window.arg` FS SDK. Data persists as ordinary workspace files, so a page turns into a durable tool: dashboards, CRMs, admin panels, trackers, note apps, blogs. No server, no database, no build step — just an HTML file sitting on the workspace filesystem.

Arg renders `.html` in a live-preview editor. Cloud workspaces use a per-file `sitearg.com` origin; local desktop workspaces use a sandboxed inline preview. Plain HTML files are created with `write_file` using standard markup. Filesystem access starts on in folder-scoped Read mode; Actions use a separate session-only **Actions access** grant on the isolated web preview.

## CRUD

`.html`/`.htm` are plain text — use your active Arg access method (`arg-mcp` / `arg-cli` — see `arg-files`). A static page needs nothing more. The rest of this skill covers the runtime `window.arg` FS SDK that turns a static page into an arg-app.

## Runtime theme

HTML that receives the `window.arg` SDK also receives the active Arg theme as exactly one runtime `<body>` class: `light`, `dark`, or `focus`. Theme generated SDK-enabled pages - including `/me` pages - with explicit styles for all three classes, treating `focus` as its own design rather than a light alias. Use these classes instead of `prefers-color-scheme`, which may disagree with the user's selected Arg theme.

## Building an arg-app with the `window.arg` FS SDK

A `.html` page can read/write workspace files and read the signed-in user's identity at runtime, so a single self-contained page becomes its own backend — data persists as ordinary workspace files. Load `arg-fs-js-sdk` for the full SDK reference.

### The three rules (follow these)

1. **There is NO import.** Never add `<script src>`, npm, ESM, or a CDN tag for it. The editor injects `window.arg` inline when **Scripts** and **Workspace access** are on; both start on for an ordinary workspace HTML preview.
2. **Feature-detect with `if (window.arg)` and degrade gracefully.** It's absent when the page is opened outside Arg or Workspace access is unavailable or turned off. After `arg.ready`, check `arg.canWrite` before showing mutation controls; reads remain available, while `write`, `remove`, `mkdir`, `move`, `copy`, and `db.exec` reject with `read_only`. Workspace access starts enabled as **Read**, so a page that writes must degrade gracefully until it receives **Read and write**. `arg.canWrite` covers both that choice and a read-only host; `arg.readOnly` reports only the host.
3. **Build a single-document app.** Never `<a href="page.html">` to another HTML file — that reloads the sandboxed preview and **drops `window.arg`**. Change views with in-page state (buttons / click handlers / `location.hash` + a `hashchange` listener) and render from `arg.fs` reads. Treat workspace files as the data store, not as pages.

## Calling the Action registry from HTML

On an in-app cloud HTML preview, the separate `window.arg.actions` namespace exposes:

| Method                                                              | Result                                              |
| ------------------------------------------------------------------- | --------------------------------------------------- |
| `list({ query?, category?, runtime?, backend?, includeSchema? })`   | Matching Action catalog entries                     |
| `schema(actionId)`                                                  | `{ id, inputSchema }`                               |
| `describe(actionId, { field?, value?, query?, category?, limit? })` | Base or dynamic-field schema/options                |
| `run(actionId, input, { idempotencyKey? })`                         | `{ runId, status, output?, error? }`                |
| `runBatch([{ actionId, input?, idempotencyKey? }, ...])`            | Positionally aligned per-call success/error results |
| `getRun(runId)`                                                     | One durable run record with status/progress/output  |
| `listRuns({ actionId?, status?, limit? })`                          | Recent run records                                  |

There is no import and no token in authored code. The isolated iframe sends an origin-pinned `postMessage` to the Arg editor; the parent fixes the current workspace and audit surface, calls the normal authenticated Action API as the signed-in viewer, and the backend rechecks workspace permissions plus the Action's current Zod schema. Call `await window.arg.actions.ready`, then check `window.arg.actions.enabled`.

`runBatch` accepts 1-50 independent calls in one round trip. It is not a transaction: every result has its own `ok` discriminator, one failed call does not reject or roll back its siblings, and results stay in request order. Use it for independent reads or other fan-out where partial success is useful; do not use it when later calls depend on earlier outputs. If a transport failure makes a retry necessary, every write, billable, or provider-backed call needs its own stable `idempotencyKey`.

This is a broad whole-workspace authority, not an extension of the filesystem folder scope. The viewer must explicitly grant it for that file session. Degrade gracefully when it is disabled, and never auto-retry an expensive Action without a stable `idempotencyKey`.

This API exists only inside Arg: framed `r-*.sitearg.com` previews on web and desktop, and the native `.html` viewers on iOS and Android, which inject the same namespace over a platform transport instead of `postMessage`. A deployed top-level `<slug>.sitearg.com` Site has no authenticated Arg parent and cannot run as its current viewer; use a reviewed `.server`/worker backend or an explicit external sign-in/API design for deployed sites.

External links in an authenticated workspace preview can use `<a href="https://example.com" target="_blank" rel="noopener noreferrer">`; the user click opens a sandboxed popup without replacing the live preview. Do not target `_top`. Anonymous public previews keep popups disabled, so they must provide a copyable URL or another non-popup fallback.

HTML and React previews remove the browser's default `html`/`body` margin so apps render edge to edge. Set an explicit `body` margin or padding when the design needs an inset; authored styles override the host reset.

### Boilerplate

A classic `<script>` has no top-level `await` — wrap calls in an async IIFE and `await arg.ready` (it rejects after ~4s if the capability is off):

```html
<script>
  (async () => {
    if (!window.arg) return; // opened outside Arg - degrade gracefully
    try {
      await arg.ready;
    } catch {
      /* capability off — show a hint */ return;
    }
    const FILE = "notes.json";
    const notes = (await arg.fs.exists(FILE)) ? await arg.fs.readJSON(FILE) : [];
    if (arg.readOnly) return; // keep the loaded data visible without offering mutations
    notes.push({ text: "New note", by: arg.me.name, at: Date.now() });
    await arg.fs.writeJSON(FILE, notes); // creates the file (and parent folders) if missing
  })();
</script>
```

### Files API — `arg.fs.*`

File operations return Promises. `watch*()` returns its stop function synchronously.

| Method                                                            | Returns                                           | Notes                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `read(path, opts?)`                                               | `string \| Uint8Array \| ArrayBuffer \| FileData` | Text by default. For binary files, pass `{ encoding: "base64" \| "dataUrl" \| "bytes" \| "arrayBuffer" \| "file" }`. |
| `readJSON(path, opts?)`                                           | parsed value                                      | `JSON.parse(await read(path, opts))`.                                                                                |
| `readById(id, opts?)` / `readJSONById(id, opts?)`                 | same as path variants                             | Start from a stable file id (`argfile_<uuid>`), then apply access scope.                                             |
| `readBytes(path, opts?)` / `readBytesById(id, opts?)`             | `Uint8Array`                                      | Convenience for `{ ...opts, encoding: "bytes" }`.                                                                    |
| `readFile(path)` / `readFileById(id)`                             | `FileData`                                        | Full file payload. Binary content is base64 plus a ready `dataUrl`.                                                  |
| `dataUrl(path)` / `dataUrlById(id)`                               | `string`                                          | Good for small inline assets.                                                                                        |
| `assetUrl(path)` / `assetUrlById(id)`                             | `AssetUrl`                                        | Short-lived signed URL for normal `<img>`, `<video>`, `<audio>`, `<embed>` sources; prefer for large media.          |
| `open(path)` / `openById(id)`                                     | `OpenResult`                                      | Ask the Arg host to open the file in an editor tab. May reject with `unavailable`.                                   |
| `resolveId(id)`                                                   | `string \| null`                                  | Resolve a file id (`argfile_<uuid>`) to its current workspace path; `null` if deleted.                               |
| `getId(path)`                                                     | `string`                                          | Get or create the stable file id (`argfile_<uuid>`) for a scoped path.                                               |
| `write(path, text)`                                               | `{ path, revision }`                              | Creates the file + any missing parent folders.                                                                       |
| `writeJSON(path, value)`                                          | `{ path, revision }`                              | Pretty-prints with 2 spaces.                                                                                         |
| `list(dir?)`                                                      | `Entry[]`                                         | Lists one directory (defaults to the scope root).                                                                    |
| `glob(pattern, { cwd }?)`                                         | `string[]`                                        | `*` within a segment, `**` spans `/`, `?` one char.                                                                  |
| `search(query, { path, include }?)`                               | `Match[]`                                         | Full-text search.                                                                                                    |
| `info(path)` / `infoById(id)`                                     | `Entry \| null`                                   | Storage metadata plus best-effort id/audit attribution; `null` if missing/deleted.                                   |
| `watch(path, callback, opts?)` / `watchById(id, callback, opts?)` | stop function                                     | Format-agnostic create/modify/delete watching without restarting the app.                                            |
| `exists(path)`                                                    | `boolean`                                         | Convenience over `info()`.                                                                                           |
| `remove(path)`                                                    | `{ deleted }`                                     | Alias `arg.fs.delete(path)`.                                                                                         |
| `mkdir(path)`                                                     | `{ path }`                                        | Create a folder.                                                                                                     |
| `move(from, to)` / `copy(from, to)`                               | `{ from, to, path }`                              | Move/rename or copy.                                                                                                 |

Core shapes:

```ts
Entry = {
  id?: string;
  name: string;
  path: string;
  type: "file" | "folder";
  size: number;
  modified?: string;
  mimeType?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  ownerId?: string | null;
  ownerKind?: string | null;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  createdBy?: { id: string; kind: string; userId?: string | null } | null;
  updatedBy?: { id: string; kind: string; userId?: string | null } | null;
}

FileData = {
  path: string;
  name: string;
  type: "file";
  content: string;               // utf-8 text or base64 bytes
  encoding: "utf-8" | "base64";
  mimeType: string;
  size: number;
  revision: string | null;
  dataUrl: string;
}

AssetUrl = { url: string; expiresAt: number; size: number; contentType: string }
OpenResult = { opened: true; name: string; path: string; type: "file"; size: number }
Match = { path: string; line: number; text: string }
```

Plain `read(path)` / `readById(id)` stay text-first for backwards compatibility and throw `binary_file` on images, PDFs, audio, video, and other binary files. For media, choose the representation explicitly:

```js
const bytes = await arg.fs.readBytes("hero.png");
const inline = await arg.fs.dataUrl("hero.png");
const asset = await arg.fs.assetUrl("hero.png");
img.src = asset.url;
```

Relative paths plus canonical Arg file URLs and `arg://` workspace URIs in `fetch()` calls use the same file bridge and permissions:

```js
const res = await fetch("magic-numbers.csv", { cache: "no-store" });
if (!res.ok) throw new Error(`Could not load CSV (${res.status})`);
const csv = await res.text();

await fetch("magic-numbers.csv", {
  method: "PUT",
  body: "4,5,6\n",
});
```

`GET`/`HEAD` read files, `POST`/`PUT`/`PATCH` replace the entire file with the exact request-body bytes, `DELETE` removes it, and `OPTIONS` reports the supported methods. The three write methods are whole-file upsert aliases - `PATCH` is not a partial merge. Successful mutations return status 200 with the bridge result as JSON. Relative paths resolve beside the preview file and a leading `/` starts at the workspace root. Canonical `https://arg.ai/.../files/workspace/<id>/file/...` links, Arg-owned `*.arg.ai` preview links, and `arg://<org>/w/<workspace>/...` URIs resolve only when their workspace id exactly matches `arg.workspaceId`; a different workspace returns 403 without reaching the network. String, `URL`, and `Request` inputs are supported. Query/hash suffixes are ignored for file lookup. Reads and write bodies are binary-safe and capped at 16 MB. Abort prevents a mutation before bridge dispatch; after dispatch, fetch reports the real mutation result. Other absolute URLs, protocol-relative URLs, and unsupported methods keep native browser behavior, while recognized mutations fail closed when Workspace access is disabled. Request headers do not set file metadata or conditional-write behavior. Large streaming reads should use `arg.fs.assetUrl()`.

Static classic scripts, stylesheets, and media can also live beside the HTML:

```html
<link rel="stylesheet" href="styles/app.css" />
<script src="scripts/app.js" defer></script>
<img src="arg://acme/w/workspace-id/media/hero.png" />
<video src="https://arg.ai/o/acme/files/workspace/workspace-id/file/media/demo.mp4"></video>
```

With Scripts and Workspace access enabled, static `img`, `video`, `audio`, `source`, and `track` sources plus video posters resolve before browser parsing through short-lived `assetUrl()` capabilities. Runtime media setters use the same resolver before native loading, including on detached elements created by React, and a resolved child `<source>` restarts its parent media element. Cross-workspace references and failed URL mints remain inert instead of loading the authored Arg URL directly. Relative paths and matching-workspace canonical Arg/`arg://` references all retain the selected folder/workspace scope and per-file read permissions. Classic script order, `async`, `defer`, and other attributes stay native. Module scripts, preload links, `srcset`, CSS `@import`, and relative `url()` dependencies are not rewritten.

Actor metadata intentionally omits member emails. Use `arg.me.email` only for the current signed-in user.

### Rendering MDX `FileEmbed` images

MDX documents embed workspace files by path plus a stable file id (`argfile_<uuid>`); the id is authoritative for resolution and survives renames/moves:

```mdx
<FileEmbed
  path="charts/q3-revenue.png"
  id="argfile_5286c2f0-18ea-4817-b27b-5be456fa3f46"
  height={506}
/>
```

In a custom `.html` preview, use the id helpers rather than guessing a path. Prefer `assetUrlById(id).url` for normal image/media rendering:

```html
<script>
  async function renderFileEmbedImage(id, height) {
    const asset = await arg.fs.assetUrlById(id);
    const img = document.createElement("img");
    img.src = asset.url;
    img.style.maxWidth = "100%";
    if (height) img.style.maxHeight = `${height}px`;
    return img;
  }
</script>
```

Use `dataUrlById(id)` only for small inline images. Id helpers resolve id-to-path first, then apply the active access scope; if a `FileEmbed` points outside this HTML file's folder, the preview must use the `"workspace"` access scope.

### Identity & context

- `arg.me` → `{ id, name, email, avatarUrl }` (`null` until the capability is on; use for the current user's email).
- `arg.team.members()` (alias `arg.team.list()`) → members `{ id, name, avatarUrl, role, kind, isMe }` — **names + avatars only, no emails**.
- Identity `avatarUrl` values are absolute and can be passed directly to `<img src>` from the isolated preview.
- `arg.dir` (this file's folder), `arg.path`, `arg.name`, `arg.workspaceId`, `arg.scope` (`"folder"` | `"workspace"`), `arg.enabled`, `arg.readOnly`, `arg.ready`, `arg.version`.

### Paths, scope & errors

- Relative paths (`"data/x.json"`) resolve against this file's folder (`arg.dir`); a **leading `/`** is workspace-root-relative.
- The user's access scope bounds every **file** path: `"folder"` (this subtree) or `"workspace"` (everything). Identity is workspace-level regardless. The backend still enforces the user's own permissions.
- Id helpers (`readById`, `assetUrlById`, `resolveId`, `infoById`, etc.) accept a prefixed `argfile_<uuid>` (or a bare legacy UUID), resolve the id to its current path first, then enforce the same scope.
- Calls reject with an `Error` whose `.code` is one of `out_of_scope`, `bad_request`, `access_denied`, `not_found`, `binary_file`, `request_failed`, `disabled`, `read_only`, `unavailable`, `unknown_op`. Wrap in `try/catch`; treat `not_found` / a `null` `info()` as first-run and seed defaults. Treat `read_only` as a host-level mutation lock, and treat `unavailable` from `open()` / `openById()` as "this host cannot open editor tabs".

## Layout: mobile web, iOS, and Android

Every arg-app is also a mobile app. The iOS and Android Arg apps open workspace files in **full-screen web views**, and on the web an app renders in a pane that can be half a window wide. Author for the narrow end from the start — a layout that only holds together at desktop width ships as a broken phone app.

How much of the screen the app owns depends on the file type, and only one of them has to think about the notch:

| surface        | how the mobile apps host it                                                                                                                                                                | what to handle               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `.html`/`.htm` | the **top-level document of an edge-to-edge web view** — it draws behind the status bar, notch, and home indicator, with the native back / chat / "…" controls floating on top of the page | breakpoints _and_ safe areas |
| `.tsx`/`.jsx`  | the editor host, which already reserves room for the native chrome above the preview and the composer below it                                                                             | breakpoints only             |
| `.server`      | a full-screen view with a real native top bar above the web view                                                                                                                           | breakpoints only             |

### Breakpoints

Every one of those surfaces runs the app in its own frame or web view, so `@media (max-width: …)` and `100vw` measure **the pane the app is in**, not the device. That is what you want: one set of queries gives you a phone layout on a phone and a narrow-pane layout when the app sits beside the code editor on desktop. Author mobile-first, then widen.

```css
/* base: one column, comfortable at ~320px */
.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}
@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  } /* large phone, narrow pane */
}
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  } /* tablet, desktop */
}
```

- Assume the narrowest real width is **320 CSS px**. Don't put a fixed width or a `min-width` wider than that on a top-level container, and let tables, toolbars, and card rows wrap or scroll rather than overflow.
- Use `100dvh` rather than `100vh` for a full-height shell — mobile browser chrome makes `vh` overshoot.
- Touch targets want ~44px of height, and a control that only appears on `:hover` has no equivalent on touch — keep the action visible or reachable from a tap.
- Give text inputs `font-size: 16px` or larger. iOS zooms the page in when a smaller input takes focus.

### Safe areas (`.html` apps)

An `.html` app is the top-level document and nothing is injected into its `<head>`, so the viewport tag is yours to write. Write it **together with** the padding below, never on its own:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

`viewport-fit=cover` does two things at once. It makes `env(safe-area-inset-*)` report real values on iOS — without it they are all `0` and safe-area padding silently does nothing — and it opts the page into drawing under the system chrome, which iOS otherwise keeps a scrolling page clear of on its own. Adding the tag and then padding only a fixed header pushes the rest of the body under the clock, so take both halves or neither.

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}

/* Android's web view reports the status bar as 0 - it tracks display cutouts only -
   so the native case needs a floor of its own. The mobile apps load an .html app as
   the top-level document; inside Arg on the web it is framed, with app chrome around
   it and no system chrome behind it. */
html[data-arg-fullscreen] {
  --safe-top: max(env(safe-area-inset-top, 0px), 24px);
  --safe-bottom: max(env(safe-area-inset-bottom, 0px), 16px);
}

.app-bar {
  padding-top: var(--safe-top);
}
.bottom-bar {
  padding-bottom: var(--safe-bottom);
}
.page {
  padding-left: max(var(--safe-left), 1rem);
  padding-right: max(var(--safe-right), 1rem);
}
```

```html
<script>
  if (window.top === window.self) document.documentElement.dataset.argFullscreen = "";
</script>
```

This costs nothing anywhere else: the insets resolve to `0` in a framed preview on desktop and mobile web, and the floor only applies to the top-level native case, so every other layout renders exactly as it did.

**The native controls float over the page rather than beside it.** iOS puts back at the top-left, chat and "…" at the top-right, and a collapsed chat control at the bottom-left that expands into a full composer; Android puts back at the top-left, "…" at the top-right, and chat at the bottom-left. Keep your own controls out of those corners at narrow widths, or put them in a bar that the safe-area padding above has already pushed clear.

A `.tsx`/`.jsx` app needs none of this, and cannot do it anyway: Arg builds that document, so the viewport tag is not yours, and a nested preview frame never inherits the device insets — `env(safe-area-inset-*)` is `0` there on every platform. The host reserves the room instead. Reach for `.html` when an app genuinely has to sit against a phone's edges.

None of this applies to a HyperFrames composition — those are fixed-resolution motion graphics and scale through the `html { font-size: min(…vw, …vh) }` rule described below, not through breakpoints.

## Motion graphics: HyperFrames compositions (`.html`)

An `.html` file can also be a **[HyperFrames](https://hyperframes.heygen.com) composition** — HeyGen's "write HTML, render video" format. Arg detects one from its markup, gives its preview a video transport, and lets a `.video` project carry it as a timeline clip that seeks with the playhead and rasterises into the exported MP4.

Reach for it when the user asks for a **motion graphic**: an animated title card, a kinetic-typography intro, a lower third, an animated explainer, a launch or release video. Use a plain `.html` page for anything interactive, and `.design` for a static layout.

A composition is an ordinary HTML document plus two things:

1. **A declaration on `<html>`** — `data-composition-id`, `data-composition-duration` (seconds), and `data-resolution` (e.g. `1920x1080`).
2. **A seekable animation.** A **paused** GSAP timeline is the norm; Lottie and CSS/Web Animations also work.

```html
<!DOCTYPE html>
<html data-composition-id="intro" data-composition-duration="6" data-resolution="1920x1080">
  <head>
    <style>
      html,
      body {
        margin: 0;
        background: #07080b;
      }
      #title {
        position: absolute;
        top: 40%;
        left: 120px;
        font: 800 140px system-ui;
        color: #fff;
      }
    </style>
  </head>
  <body>
    <div id="title">Ship it</div>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#title", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1 }, 0.2);
    </script>
  </body>
</html>
```

That example loads no GSAP: **you do not need a `<script src>` for it.** When a document declares the composition attributes but no animation library, Arg supplies a pinned GSAP build. Add your own tag only to pin a different version or to use Lottie.

Rules that decide whether it renders at all:

- **The timeline must be `paused: true` and driven only by seeking.** Never animate from `setInterval`, `requestAnimationFrame` state, or a wall clock — none of those can be parked on a frame, so the composition exports as a frozen or wrong frame even though it looks right playing.
- **Prefer `fromTo` with explicit endpoints.** GSAP applies a `fromTo`'s from-state when the tween is built, so a scene's _exit_ tween can overwrite its _entry_ — give exits `immediateRender: false`. Otherwise every later scene is visible from frame 0.
- **Keep assets inline or in the workspace.** Export rasterises the frame through an SVG snapshot; a cross-origin image taints it and the clip drops that frame. Inline SVG, data URIs and CSS gradients are safe.
- **Use system font stacks** unless a webfont is embedded as a data URI — an external font does not load inside the export snapshot, so the exported type falls back and reflows.
- **Make it resolution-independent** if it will also be previewed at pane size: set `html { font-size: min(<100/W>vw, <100/H>vh) }` and lay out in `rem` so 1rem is one design pixel, then animate with `scale` / `opacity` / `xPercent` / `yPercent` / `clip-path` rather than raw pixel offsets.
- **The last tween sets the length.** If the authored `data-composition-duration` is longer than the final tween's end, pin it (`tl.set({}, {}, 14)`) or the composition is cut short.

### Audio in a composition

A composition carries its own mix. Put an `<audio>` (or a `<video>` with sound) in the markup and give it timing attributes; Arg plays it in the preview and **mixes it into the exported video**.

```html
<audio src="/audio/vo.mp3" data-start="2" data-duration="6" data-volume="0.9"></audio>
<audio
  src="/audio/bed.mp3"
  data-start="0"
  data-duration="14"
  data-volume="0.5"
  data-automation='{"version":1,"lanes":[{"target":"volume","points":[{"t":0,"v":1},{"t":2,"v":0.35}]}]}'
></audio>
```

| attribute                                     | meaning                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `data-start`                                  | composition seconds it starts at - **required**, and what marks an element as scheduled at all |
| `data-duration`                               | composition seconds it occupies; omit to run to the end of the source                          |
| `data-media-start` (or `data-playback-start`) | seconds into the source to start from                                                          |
| `data-playback-rate`                          | 0.1-5                                                                                          |
| `data-volume`                                 | level, 0-1                                                                                     |
| `data-automation`                             | volume envelope: `t` is seconds from the element's own start, `v` is 0-1                       |

An `<audio>` with **no** `data-start` is left entirely alone - it is yours to drive.

Automation lanes hold their first value backwards and their last forwards, so a bed that begins before a voiceover needs an explicit `{"t":0,"v":1}` point or it starts out already ducked. `data-volume` and a lane multiply: a bed at `0.5` ducking to `0.35` reaches `0.175`.

Reference workspace audio by path (`/audio/vo.mp3`) - Arg signs those before mounting the composition.

**Not supported:** `data-fx-chain` and `data-fx-carve` (EQ, compressor, limiter, gate, delay, reverb, chorus, phaser, bitcrush, and voiceover carve). A composition that declares them still plays and still exports, but **dry** - Arg says so rather than shipping a mix that sounds plausible and is wrong. Bake the effect into the source file, or mix on the `.video` timeline instead.

To use one in a video: open a `.video` and drag the `.html` file onto the timeline, or use **Insert → Composition**. See `arg-file-video-edit` for the `hyperframes` clip's fields.

## Guidance

- **Prefer storing data in plain `.json` files** so it stays inspectable and editable inside Arg.
- Supported on web, desktop, iOS, and Android - always feature-detect for pages opened outside Arg.
- Need a real server/process (a framework, a backend, a port) instead of a file-backed arg-app? Use a **`.server`** file instead - a JSON config (`command`, `port`, optional `exec`/`timeout`, and optional `access`) that launches a process in a sandboxed container. `access` can be `"public"`, `"personal"`, or `"workspace"` and defaults to `"public"` for compatibility. Personal servers require a human launcher and only that launcher can open them; workspace servers require workspace-wide read access. Over MCP you can also host a workspace command with `deploy_server`.
- A `.server` that needs built-in workspace Actions declares the smallest explicit allowlist, for example `"actions": ["file_read", "text_generate"]`. Only declared Actions whose backend is not `integration` are visible or runnable. The file will not auto-launch; the user must review and launch it. Server code can use the preinstalled `arg-action` helper through injected `ARG_API_URL`, `ARG_WORKSPACE_ID`, and `ARG_ACTION_TOKEN`. Treat the token as sensitive: never print, persist, return, or copy it into source. It is revoked with the tunnel or when the launching principal loses authority. Servers run from the live workspace mount, so requests from the approved audience and collaborators who change live server code can exercise the declared Actions until the server stops.
- A `.server` that calls a third-party API declares portable provider aliases, for example `"integrations": { "github": { "provider": "github" } }`. Never write OAuth tokens, PATs, refresh tokens, connection ids, or an upstream base URL into the file or generated source. Arg asks the user to bind each alias to one of their real connections when they explicitly launch the server; an integration-enabled file does not auto-launch. The connection keeps its existing owner: user-owned connections run only as that user, and service-account-owned connections run only as that service account. Runtime ownership checks support service accounts, but the current connection creation flow provisions user-owned connections only.
- Server code calls the integration broker at `${ARG_INTEGRATIONS_URL}/${alias}/${relativePath}` with `Authorization: Bearer ${ARG_INTEGRATIONS_TOKEN}`. The broker URL already includes `/api/server-integrations/v1`; append only the alias and provider-relative path, never an absolute provider URL. The broker attaches the real provider credential without exposing it to the sandbox. Treat the broker token as sensitive, never print or persist it, and never return it to a tunnel client. Servers run from the live workspace mount: collaborators who change server code can change what the approved audience executes until the tunnel is stopped or relaunched. Use the narrowest provider scopes available for unattended servers.
- **Publish a folder as a durable hosted website (Sites).** When the goal is a real, versioned website on its own subdomain — not an app that only runs inside Arg's preview — deploy a workspace folder as a **Site** on `<slug>.sitearg.com`. Sites build and serve static folders and framework apps (`static`, `vite`, `astro`, `next` — auto-detected from `package.json`), keep a version history you can promote/roll back, and can be `workspace`-only (default) or `public`. Deploy from the **Deployments** hub in the app, or over MCP with `deploy_site` (pass `source_path`; optionally `slug`, `framework`, `access`, `display_name`) — it returns the live `url`. Sister tools: `list_sites`, `get_site_deploy` (poll a framework build until live), `promote_site_version` (rollback), `set_site_access`, `get_site_share_link`, `delete_site`. Choose Sites over an arg-app when you want a shareable, deployed site with clean URLs and versioning; choose an arg-app when the page must read/write live workspace files at runtime via `window.arg`; choose a `.server` when you need a long-running server process.
- **Share an inline artifact without a workspace.** Construct a `/view?type=<type>&content=<content>` URL to render a read-only artifact directly in the viewer with no workspace required. Supported types: `design`, `video`, `daw`, `psd` (base64 payload), `whiteboard`, `kanban`, `csv`, `html`, `tsx`, `jsx`. The `content` parameter is the raw file text (UTF-8 for all types except `psd`). JSON-based types (`design`, `video`, `daw`, `whiteboard`, `kanban`) must receive a JSON object. HTML and React documents execute only on their own isolated `sitearg.com` origin — the same cross-origin sandbox as workspace previews. The preview is read-only: `window.arg` is unavailable and there is no workspace file system access. A viewer can use **Save to Arg** to authenticate, choose a destination, and save a copy into a workspace.
