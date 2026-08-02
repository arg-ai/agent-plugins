---
name: arg-apps
version: "2.5.2"
description: Build React previews and arg-apps in Arg. Covers live .tsx/.jsx apps with relative workspace modules, @arg/ui, and versioned npm imports, plus self-contained .html apps using the window.arg filesystem SDK for persistent state and identity, and .server files that call third-party APIs through the integration broker.
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
- Bare npm imports when the package has an exact version in the nearest workspace `package.json`. React and React DOM are pinned by the editor. A versioned `https://esm.sh/package@version` import is also accepted.

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

React previews can also receive `window.arg` after the user explicitly enables Workspace access in the preview permissions menu. Keep capability-dependent code behind `if (window.arg)` and `await arg.ready`; use `.html` when a build-free, single-document arg-app is the better fit.

An **arg-app** is an internal app your team builds and runs inside Arg: a single self-contained `.html` file that becomes its own backend by reading and writing real workspace files — and reading the signed-in user's identity — **at runtime** via the `window.arg` FS SDK. Data persists as ordinary workspace files, so a page turns into a durable tool: dashboards, CRMs, admin panels, trackers, note apps, blogs. No server, no database, no build step — just an HTML file sitting on the workspace filesystem.

Arg renders `.html` in a live-preview editor. Cloud workspaces use a per-file `sitearg.com` origin; local desktop workspaces use a sandboxed inline preview. Plain HTML files are created with `write_file` using standard markup; the SDK only activates when the user turns it on.

## CRUD

`.html`/`.htm` are plain text — use your active Arg access method (`arg-mcp` / `arg-cli` — see `arg-files`). A static page needs nothing more. The rest of this skill covers the runtime `window.arg` FS SDK that turns a static page into an arg-app.

## Runtime theme

HTML that receives the `window.arg` SDK also receives the active Arg theme as exactly one runtime `<body>` class: `light`, `dark`, or `focus`. Theme generated SDK-enabled pages - including `/me` pages - with explicit styles for all three classes, treating `focus` as its own design rather than a light alias. Use these classes instead of `prefers-color-scheme`, which may disagree with the user's selected Arg theme.

## Building an arg-app with the `window.arg` FS SDK

A `.html` page can read/write workspace files and read the signed-in user's identity at runtime, so a single self-contained page becomes its own backend — data persists as ordinary workspace files. Load `arg-fs-js-sdk` for the full SDK reference.

### The three rules (follow these)

1. **There is NO import.** Never add `<script src>`, npm, ESM, or a CDN tag for it. The editor injects `window.arg` inline when the user turns on **"Scripts" + "Workspace access"** in the preview's permissions menu.
2. **Feature-detect with `if (window.arg)` and degrade gracefully.** It's absent when the page is opened outside Arg or Workspace access is unavailable. The user — not you — enables the capability, so the page must still work (read-only or with a hint) when it's off. After `arg.ready`, check `arg.readOnly` before showing mutation controls; reads remain available, while `write`, `remove`, `mkdir`, `move`, `copy`, and `db.exec` reject with `read_only` in a read-only host.
3. **Build a single-document app.** Never `<a href="page.html">` to another HTML file — that reloads the sandboxed preview and **drops `window.arg`**. Change views with in-page state (buttons / click handlers / `location.hash` + a `hashchange` listener) and render from `arg.fs` reads. Treat workspace files as the data store, not as pages.

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

### Files API — `arg.fs.*` (all return Promises)

| Method                                     | Returns                                           | Notes                                                                                                                |
| ------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `read(path, opts?)`                        | `string \| Uint8Array \| ArrayBuffer \| FileData` | Text by default. For binary files, pass `{ encoding: "base64" \| "dataUrl" \| "bytes" \| "arrayBuffer" \| "file" }`. |
| `readJSON(path)`                           | parsed value                                      | `JSON.parse(await read(path))`.                                                                                      |
| `readById(id, opts?)` / `readJSONById(id)` | same as path variants                             | Start from a stable file id (`argfile_<uuid>`), then apply access scope.                                             |
| `readBytes(path)` / `readBytesById(id)`    | `Uint8Array`                                      | Convenience for `{ encoding: "bytes" }`.                                                                             |
| `readFile(path)` / `readFileById(id)`      | `FileData`                                        | Full file payload. Binary content is base64 plus a ready `dataUrl`.                                                  |
| `dataUrl(path)` / `dataUrlById(id)`        | `string`                                          | Good for small inline assets.                                                                                        |
| `assetUrl(path)` / `assetUrlById(id)`      | `AssetUrl`                                        | Short-lived signed URL for normal `<img>`, `<video>`, `<audio>`, `<embed>` sources; prefer for large media.          |
| `open(path)` / `openById(id)`              | `OpenResult`                                      | Ask the Arg host to open the file in an editor tab. May reject with `unavailable`.                                   |
| `resolveId(id)`                            | `string \| null`                                  | Resolve a file id (`argfile_<uuid>`) to its current workspace path; `null` if deleted.                               |
| `getId(path)`                              | `string`                                          | Get or create the stable file id (`argfile_<uuid>`) for a scoped path.                                               |
| `write(path, text)`                        | `{ path, revision }`                              | Creates the file + any missing parent folders.                                                                       |
| `writeJSON(path, value)`                   | `{ path, revision }`                              | Pretty-prints with 2 spaces.                                                                                         |
| `list(dir?)`                               | `Entry[]`                                         | Lists one directory (defaults to the scope root).                                                                    |
| `glob(pattern, { cwd }?)`                  | `string[]`                                        | `*` within a segment, `**` spans `/`, `?` one char.                                                                  |
| `search(query, { path, include }?)`        | `Match[]`                                         | Full-text search.                                                                                                    |
| `info(path)` / `infoById(id)`              | `Entry \| null`                                   | Storage metadata plus best-effort id/audit attribution; `null` if missing/deleted.                                   |
| `exists(path)`                             | `boolean`                                         | Convenience over `info()`.                                                                                           |
| `remove(path)`                             | `{ deleted }`                                     | Alias `arg.fs.delete(path)`.                                                                                         |
| `mkdir(path)`                              | `{ path }`                                        | Create a folder.                                                                                                     |
| `move(from, to)` / `copy(from, to)`        | `{ from, to, path }`                              | Move/rename or copy.                                                                                                 |

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
- `arg.dir` (this file's folder), `arg.path`, `arg.name`, `arg.workspaceId`, `arg.scope` (`"folder"` | `"workspace"`), `arg.enabled`, `arg.readOnly`, `arg.ready`, `arg.version`.

### Paths, scope & errors

- Relative paths (`"data/x.json"`) resolve against this file's folder (`arg.dir`); a **leading `/`** is workspace-root-relative.
- The user's access scope bounds every **file** path: `"folder"` (this subtree) or `"workspace"` (everything). Identity is workspace-level regardless. The backend still enforces the user's own permissions.
- Id helpers (`readById`, `assetUrlById`, `resolveId`, `infoById`, etc.) accept a prefixed `argfile_<uuid>` (or a bare legacy UUID), resolve the id to its current path first, then enforce the same scope.
- Calls reject with an `Error` whose `.code` is one of `out_of_scope`, `bad_request`, `access_denied`, `not_found`, `binary_file`, `request_failed`, `disabled`, `read_only`, `unavailable`, `unknown_op`. Wrap in `try/catch`; treat `not_found` / a `null` `info()` as first-run and seed defaults. Treat `read_only` as a host-level mutation lock, and treat `unavailable` from `open()` / `openById()` as "this host cannot open editor tabs".

## Guidance

- **Prefer storing data in plain `.json` files** so it stays inspectable and editable inside Arg.
- Supported on web, desktop, iOS, and Android - always feature-detect for pages opened outside Arg.
- Need a real server/process (a framework, a backend, a port) instead of a file-backed arg-app? Use a **`.server`** file instead - a JSON config (`command`, `port`, optional `exec`/`timeout`, and optional `access`) that launches a process in a sandboxed container. `access` can be `"public"`, `"personal"`, or `"workspace"` and defaults to `"public"` for compatibility. Personal servers require a human launcher and only that launcher can open them; workspace servers require workspace-wide read access. Over MCP you can also host a workspace command with `deploy_server`.
- A `.server` that calls a third-party API declares portable provider aliases, for example `"integrations": { "github": { "provider": "github" } }`. Never write OAuth tokens, PATs, refresh tokens, connection ids, or an upstream base URL into the file or generated source. Arg asks the user to bind each alias to one of their real connections when they explicitly launch the server; an integration-enabled file does not auto-launch. The connection keeps its existing owner: user-owned connections run only as that user, and service-account-owned connections run only as that service account. Runtime ownership checks support service accounts, but the current connection creation flow provisions user-owned connections only.
- Server code calls the integration broker at `${ARG_INTEGRATIONS_URL}/${alias}/${relativePath}` with `Authorization: Bearer ${ARG_INTEGRATIONS_TOKEN}`. The broker URL already includes `/api/server-integrations/v1`; append only the alias and provider-relative path, never an absolute provider URL. The broker attaches the real provider credential without exposing it to the sandbox. Treat the broker token as sensitive, never print or persist it, and never return it to a tunnel client. Servers run from the live workspace mount: collaborators who change server code can change what the approved audience executes until the tunnel is stopped or relaunched. Use the narrowest provider scopes available for unattended servers.
- **Publish a folder as a durable hosted website (Sites).** When the goal is a real, versioned website on its own subdomain — not an app that only runs inside Arg's preview — deploy a workspace folder as a **Site** on `<slug>.sitearg.com`. Sites build and serve static folders and framework apps (`static`, `vite`, `astro`, `next` — auto-detected from `package.json`), keep a version history you can promote/roll back, and can be `workspace`-only (default) or `public`. Deploy from the **Deployments** hub in the app, or over MCP with `deploy_site` (pass `source_path`; optionally `slug`, `framework`, `access`, `display_name`) — it returns the live `url`. Sister tools: `list_sites`, `get_site_deploy` (poll a framework build until live), `promote_site_version` (rollback), `set_site_access`, `get_site_share_link`, `delete_site`. Choose Sites over an arg-app when you want a shareable, deployed site with clean URLs and versioning; choose an arg-app when the page must read/write live workspace files at runtime via `window.arg`; choose a `.server` when you need a long-running server process.
- **Share an inline artifact without a workspace.** Construct a `/view?type=<type>&content=<content>` URL to render a read-only artifact directly in the viewer with no workspace required. Supported types: `design`, `video`, `daw`, `psd` (base64 payload), `whiteboard`, `kanban`, `csv`, `html`, `tsx`, `jsx`. The `content` parameter is the raw file text (UTF-8 for all types except `psd`). JSON-based types (`design`, `video`, `daw`, `whiteboard`, `kanban`) must receive a JSON object. HTML and React documents execute only on their own isolated `sitearg.com` origin — the same cross-origin sandbox as workspace previews. The preview is read-only: `window.arg` is unavailable and there is no workspace file system access. A viewer can use **Save to Arg** to authenticate, choose a destination, and save a copy into a workspace.
