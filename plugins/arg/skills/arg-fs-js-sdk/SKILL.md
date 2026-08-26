---
name: arg-fs-js-sdk
version: "1.3.1"
description: Use the window.arg filesystem JavaScript SDK inside previewed Arg .html, .tsx, and .jsx apps. Load when building or modifying an app that reads, writes, or watches workspace files at runtime, needs stable file IDs, asset URLs, SQLite access, current-user identity, or team member metadata from the injected arg-fs browser bridge.
---

# Arg FS SDK (`window.arg`)

An optional **runtime** SDK that lets a single self-contained `.html` file read and write real workspace files and read the signed-in user's identity — so one page can act as its own backend (blogs, CRMs, dashboards, note apps), with data persisted as ordinary workspace files.

> **Runtime global:** `window.arg` · **Availability:** previewed `.html`, `.tsx`, and `.jsx` apps · **Import:** none (injected)

## What it is, in one paragraph

When a `.html` file is previewed inside arg it renders in a **sandboxed, null-origin iframe** with no session cookie. Ordinary workspace previews start with **Scripts** and folder-scoped, read-only **Workspace access** on, so the editor **injects `window.arg` inline** into the page. The user can turn it off or explicitly grant **Read and write**. Each call is relayed over `postMessage` to the editor, which performs the backend operation with the signed-in user's session and posts the result back. The page never sees a token; the backend still enforces that user's own permissions on every call.

## Runtime theme

Every HTML document that receives `window.arg` also receives exactly one active Arg theme class on `<body>`: `light`, `dark`, or `focus`. Preserve these runtime classes in generated SDK-enabled pages and provide explicit styles for all three, treating `focus` as its own warm, low-distraction palette rather than a light alias. Read the body class instead of `prefers-color-scheme`, which may disagree with the user's selected Arg theme.

## The three rules (read these first)

1. **There is NO import.** Do not add `<script src>`, npm, ESM, or a CDN tag. `window.arg` is injected automatically when the capability is on. Trying to import it does nothing.
2. **Always feature-detect with `if (window.arg)` and degrade gracefully.** The SDK is absent when the page is opened outside Arg or Workspace access is unavailable. A page that assumes `window.arg` exists will throw there.
3. **Build a single-document app.** Never `<a href="page.html">` to another HTML file — that reloads the sandboxed preview and **drops `window.arg`**, losing the SDK session. Change views with in-page state (buttons / click handlers / `location.hash` + a `hashchange` listener) and read data from `arg.fs`. Treat workspace files as your data store, not as pages.

## Boilerplate

A classic `<script>` has no top-level `await`, so wrap calls in an async IIFE and await `arg.ready` before using the API:

```html
<script>
  (async () => {
    if (!window.arg) return; // opened outside Arg - degrade gracefully
    await arg.ready; // resolves once the editor handshake completes
    const posts = (await arg.fs.exists("posts.json")) ? await arg.fs.readJSON("posts.json") : [];
    posts.push({ author: arg.me.name, at: Date.now() });
    await arg.fs.writeJSON("posts.json", posts); // creates the file if missing
  })();
</script>
```

`arg.ready` is a `Promise` that resolves to the `arg` object once the editor's context handshake arrives. If the handshake never comes within ~4s (e.g. the capability is off), it **rejects** — so guard with `if (!window.arg) return;` and optionally `.catch()` on `arg.ready`. Every `arg.fs.*` / `arg.team.*` method returns a Promise; individual operations time out after ~30s.

## Files API — `arg.fs.*`

File operations return Promises. `watch*()` returns its stop function synchronously. Paths are strings (see **Paths & scope** below).

| Method                              | Returns                                           | Notes                                                                                                                |
| ----------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `read(path, opts?)`                 | `string \| Uint8Array \| ArrayBuffer \| FileData` | Text by default. For binary files, pass `{ encoding: "base64" \| "dataUrl" \| "bytes" \| "arrayBuffer" \| "file" }`. |
| `readJSON(path, opts?)`             | parsed value                                      | `JSON.parse(read(path, opts))`. Throws if the file isn't valid JSON.                                                 |
| `readById(id, opts?)`               | `string \| Uint8Array \| ArrayBuffer \| FileData` | Same as `read()`, but starts from a stable file UUID.                                                                |
| `readJSONById(id, opts?)`           | parsed value                                      | `JSON.parse(readById(id, opts))`.                                                                                    |
| `readBytes(path, opts?)`            | `Uint8Array`                                      | Convenience for `read(path, { ...opts, encoding: "bytes" })`.                                                        |
| `readBytesById(id, opts?)`          | `Uint8Array`                                      | Convenience for `readById(id, { ...opts, encoding: "bytes" })`.                                                      |
| `readFile(path, opts?)`             | `FileData`                                        | Text or binary content. Binary files return base64 plus a `dataUrl`.                                                 |
| `readFileById(id, opts?)`           | `FileData`                                        | Same as `readFile()`, but starts from a stable file UUID.                                                            |
| `dataUrl(path)`                     | `string`                                          | Convenience over `readFile(path).dataUrl`. Useful for small images.                                                  |
| `dataUrlById(id)`                   | `string`                                          | Convenience for rendering a UUID-backed image embed.                                                                 |
| `assetUrl(path)`                    | `AssetUrl`                                        | Short-lived signed URL for `<img>`, `<video>`, `<audio>`, `<embed>`. Prefer for large media.                         |
| `assetUrlById(id)`                  | `AssetUrl`                                        | Same as `assetUrl()`, but starts from a stable file UUID.                                                            |
| `open(path)`                        | `OpenResult`                                      | Open the file in a workspace editor tab.                                                                             |
| `openById(id)`                      | `OpenResult`                                      | Same as `open()`, but starts from a stable file UUID.                                                                |
| `resolveId(id)`                     | `string \| null`                                  | Resolve a stable file UUID to its current path. `null` if deleted.                                                   |
| `getId(path)`                       | `string`                                          | Get or create the stable file UUID for a path.                                                                       |
| `write(path, text)`                 | `{ path, revision }`                              | Creates the file if missing, **including any missing parent folders**. `text` must be a string.                      |
| `writeJSON(path, value)`            | `{ path, revision }`                              | `write(path, JSON.stringify(value, null, 2))`.                                                                       |
| `list(dir?)`                        | `Entry[]`                                         | Lists one directory. Defaults to the scope root when `dir` is omitted.                                               |
| `glob(pattern, { cwd }?)`           | `string[]`                                        | Absolute paths matching the glob. `cwd` scopes the search dir, e.g. `glob("**/*.md", { cwd: "posts" })`.             |
| `search(query, { path, include }?)` | `Match[]`                                         | Full-text search. `path` narrows the dir; `include` filters filenames.                                               |
| `info(path, opts?)`                 | `Entry \| null`                                   | Metadata, including best-effort created/updated/owner fields. `null` if the path doesn't exist.                      |
| `infoById(id, opts?)`               | `Entry \| null`                                   | Metadata by stable file UUID. `null` if deleted.                                                                     |
| `watch(path, onChange, opts?)`      | stop function                                     | Watch any file format for create, modify, or delete without restarting the app runtime.                              |
| `watchById(id, onChange, opts?)`    | stop function                                     | Same watcher using a stable file UUID, so it also follows path changes.                                              |
| `exists(path, opts?)`               | `boolean`                                         | Convenience over `info()`.                                                                                           |
| `remove(path)`                      | `{ deleted }`                                     | Also available as `arg.fs.delete(path)`.                                                                             |
| `mkdir(path)`                       | `{ path }`                                        | Create a folder.                                                                                                     |
| `move(from, to)`                    | `{ from, to, path }`                              | Move/rename.                                                                                                         |
| `copy(from, to)`                    | `{ from, to, path }`                              | Copy.                                                                                                                |

Desktop local-only workspaces support every path-based method in this table, including `list`, `glob`, and `search`, directly against the opened folder. The stable registry-ID methods (`*ById`, `resolveId`, and `getId`) are cloud-workspace features because local files have no Arg registry rows.

**Shapes:**

```ts
Entry = {
  id?: string;                         // stable file UUID when known
  name: string;                       // basename
  path: string;                       // workspace-absolute, e.g. "/blog/post.md"
  type: "file" | "folder";
  size: number;                       // bytes
  modified?: string;                  // ISO timestamp when known
  mimeType?: string;                  // MIME type when known
  createdAt?: string | null;          // first visible create-like audit row
  updatedAt?: string | null;          // latest visible mutation audit row, or modified fallback
  ownerId?: string | null;            // creator/first-writer actor id
  ownerKind?: string | null;          // "user" | "service"
  createdByUserId?: string | null;    // user id when created by a human
  updatedByUserId?: string | null;    // user id when last updated by a human
  createdBy?: ActorInfo | null;
  updatedBy?: ActorInfo | null;
}

ActorInfo = {
  id: string;
  kind: string;                       // "user" | "service"
  userId?: string | null;             // same as id for human users; null for services
}

FileData = {
  path: string;
  name: string;
  type: "file";
  content: string;                    // utf-8 text or base64 bytes
  encoding: "utf-8" | "base64";
  mimeType: string;
  size: number;
  revision: string | null;
  dataUrl: string;                    // data:<mime>;base64,...
}

AssetUrl = {
  url: string;                        // short-lived signed URL
  expiresAt: number;                  // epoch ms
  size: number;
  contentType: string;
}

OpenResult = {
  opened: true;
  name: string;
  path: string;
  type: "file";
  size: number;
}

Match = { path: string; line: number; text: string }   // one per matching line

FileWatchEvent = {
  type: "initial" | "created" | "modified" | "deleted";
  path: string;
  previous: Entry | null;
  current: Entry | null;
}
```

**Binary reads:** `read(path)` and `readById(id)` stay text-first for existing pages. If the target is an image, PDF, audio file, or other binary asset, choose an explicit representation:

```js
const bytes = await arg.fs.read("test (2).png", { encoding: "bytes" }); // Uint8Array
const base64 = await arg.fs.read("test (2).png", { encoding: "base64" });
const dataUrl = await arg.fs.read("test (2).png", { encoding: "dataUrl" });

const img = new Image();
img.src = dataUrl;
document.body.append(img);
```

`arg.fs.readBytes(path)` and `arg.fs.readBytesById(id)` are aliases for the `bytes` mode. Pass `{ fresh: true }` when re-reading after a watch event.

## Live data without restarting the app

`arg.fs.watch()` observes file metadata, then calls your code when the file is created, modified, or deleted. It does not reload the iframe, remount React, or parse the file, so component state, scroll position, open menus, canvas state, and other app runtime state stay intact. Re-read only the changed data in the callback and update the affected UI.

```html
<script>
  (async () => {
    if (!window.arg) return;
    await arg.ready;

    const FILE = "data/dashboard.json";
    async function refresh() {
      const data = await arg.fs.readJSON(FILE, { fresh: true });
      document.querySelector("#total").textContent = data.total;
    }

    await refresh();
    const stop = arg.fs.watch(FILE, refresh);
    window.addEventListener("beforeunload", stop, { once: true });
  })();
</script>
```

In React, create the watcher in an effect and return its stop function from the effect. Do not call `location.reload()` and do not add changing data as a static workspace import.

```tsx
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let active = true;
    let stop = () => {};
    const refresh = async () => {
      const next = await window.arg.fs.readJSON("data/rows.json", { fresh: true });
      if (active) setRows(next);
    };
    void (async () => {
      if (!window.arg?.fs) return;
      await window.arg.ready;
      if (!active) return;
      await refresh();
      if (active) stop = window.arg.fs.watch("data/rows.json", refresh);
    })();
    return () => {
      active = false;
      stop();
    };
  }, []);

  return <p>{rows.length} rows</p>;
}
```

Web and desktop keep an already-shown workspace HTML or React app mounted and backgrounded while another tab or the Files browser is active, so its watcher and in-memory UI state resume on return. Closing the app tab still runs this cleanup and destroys the runtime.

The watcher is format-agnostic. Choose the existing reader that matches the data:

| Data format                                       | Re-read inside the callback                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| JSON                                              | `readJSON(path, { fresh: true })`                                                          |
| CSV, TSV, YAML, XML, RSS, JSONL, NDJSON, text     | `read(path, { fresh: true })`, then use the app's parser                                   |
| Excel (`.xlsx`, `.xlsm`) and other binary files   | `readBytes(path, { fresh: true })`, then use the app's parser                              |
| SQLite (`.sqlite`, `.sqlite3`, `.db`)             | Run the relevant `arg.db.query()` again in the watch callback                              |
| Images, PDF, audio, video, and other large assets | Re-read metadata or mint a new `assetUrl()` only if that part of the interface must update |

`watch(path, callback, options?)` and `watchById(id, callback, options?)` return a synchronous stop function. Options are `{ intervalMs?: number, emitInitial?: boolean }`; the default interval is 2500 ms and the minimum is 1000 ms. The first metadata read establishes a baseline unless `emitInitial: true`, which emits an `initial` event. Polling pauses while the document is hidden and checks immediately when it becomes visible again. Callback promises are serialized with polling, so updates cannot overlap. Transient metadata errors are retried on the next interval.

Use `watchById` when the file may be renamed or moved. Its `modified` event includes the old path in `previous.path` and the new path in `current.path`. Always stop watchers during teardown. A watcher reports invalidation, not content: use `{ fresh: true }` on the subsequent `read`, `readJSON`, `readBytes`, `readFile`, `info`, or `exists` call so the callback cannot receive a warm cached value.

**Glob semantics:** `*` matches within a path segment, `**` spans separators, `?` matches a single non-`/` character. A leading `/` in the pattern is workspace-root-relative; otherwise it resolves against `cwd` (default: the scope root).

## Workspace file `fetch()`

Requests for relative paths, canonical Arg file URLs, and `arg://` workspace URIs use the same authenticated bridge as `arg.fs`:

```js
const res = await fetch("magic-numbers.csv", { cache: "no-store" });
if (!res.ok) throw new Error(`Could not load CSV (${res.status})`);
const csv = await res.text();

const save = await fetch("magic-numbers.csv", {
  method: "PATCH",
  body: new TextEncoder().encode("4,5,6\n"),
});
if (!save.ok) throw new Error(`Could not save CSV (${save.status})`);

await fetch("obsolete.csv", { method: "DELETE" });
```

- `GET` and `HEAD` read through `arg.fs.readFile()`.
- `POST`, `PUT`, and `PATCH` replace the entire file with the exact request-body bytes through the existing scoped `write` operation. They are equivalent whole-file upserts - `PATCH` is not JSON Patch or a partial merge.
- `DELETE` removes the file through `arg.fs.remove()`.
- `OPTIONS` returns the supported method list without touching the file.
- Relative paths resolve against `arg.dir`; a leading `/` is workspace-root-relative.
- Canonical `https://arg.ai/.../files/workspace/<id>/file/...` links, Arg-owned `*.arg.ai` preview links, and `arg://<org>/w/<workspace>/...` URIs bridge only when their workspace id exactly matches `arg.workspaceId`. A different workspace returns 403 without a network request.
- String, `URL`, and `Request` inputs are supported.
- Query strings and fragments are ignored for the workspace file lookup.
- The result is a normal `Response`, including binary-safe bodies, `Content-Type`, and `Content-Length`.
- Successful writes and deletes return status 200 with the bridge result as JSON.
- `cache: "no-store"`, `"reload"`, or `"no-cache"` forces a fresh file read through the existing cache policy.
- `not_found` becomes 404; permission, scope, read-only, and disabled-access failures become 403; bad paths become 400; over-cap bodies become 413.
- `AbortSignal` prevents a mutation before it is dispatched. Once a write/delete reaches the bridge, fetch resolves its real result rather than claiming a committed mutation was cancelled.
- Other absolute and protocol-relative URLs and unsupported methods keep native browser fetch behavior. Recognized mutations fail closed when Workspace access is disabled.
- Bridged reads and write bodies are limited to 16 MB inline. Use `arg.fs.assetUrl()` for larger images, video, audio, PDFs, and other streaming reads.
- Request headers do not set workspace file metadata and conditional-write headers are not supported.

## Workspace scripts, stylesheets, and media

With Scripts and Workspace access enabled, static classic scripts, stylesheets, and media can reference workspace files:

```html
<link rel="stylesheet" href="styles/app.css" />
<script src="scripts/app.js" defer></script>
<img src="arg://acme/w/workspace-id/media/hero.png" />
```

The preview resolves relative paths beside the HTML file, or from the workspace root for a leading `/`. Matching-workspace canonical Arg URLs and `arg://` workspace URIs resolve to the path they carry. Static `img`, `video`, `audio`, `source`, and `track` sources plus video posters are replaced with an exact signed asset URL before browser parsing. Runtime media setters are intercepted before native loading, including on detached React-created elements, and resolved through the same `assetUrl()` bridge; a resolved child `<source>` restarts parent media selection. Cross-workspace references and failed URL mints remain inert instead of loading the authored Arg URL directly. The selected folder/workspace scope and the signed-in user's read permission are enforced for every file. Query strings and fragments are ignored for lookup but retained on the loaded URL. Browser-native classic script ordering, `async`, `defer`, and element attributes are preserved. Non-Arg absolute and protocol-relative URLs are unchanged.

This bounded support does not rewrite `type="module"` scripts, preload/modulepreload links, `srcset`, CSS `@import`, or relative `url()` dependencies inside a stylesheet. Keep those inline, use absolute URLs, or load their bytes explicitly through `arg.fs`.

## SQLite — `arg.db.*`

Query and mutate a SQLite database file (`.sqlite` / `.db`) directly, without parsing the bytes yourself. The first argument is always the **path** to the database file (same path rules and scope as `arg.fs`); `params` bind to `?` placeholders in the SQL.

| Method                      | Returns                               | Notes                                                                                                                               |
| --------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `query(path, sql, params?)` | row objects `[]`                      | Read query. Returns one plain object per row (column name → value).                                                                 |
| `exec(path, sql, params?)`  | `{ rowsModified, lastInsertRowid }`   | `INSERT` / `UPDATE` / `DELETE` / DDL. The modified database is **saved back to the file** (subject to the user's write permission). |
| `tables(path)`              | `string[]`                            | The database's table names.                                                                                                         |
| `schema(path, table)`       | `[{ name, type, notnull, pk, dflt }]` | One row per column: name, declared type, `NOT NULL` flag, primary-key flag, and default value.                                      |

```js
await arg.ready;
const top = await arg.db.query(
  "/data/app.db",
  "SELECT name, score FROM users WHERE score > ? ORDER BY score DESC",
  [100],
);
const { rowsModified } = await arg.db.exec(
  "/data/app.db",
  "UPDATE users SET seen = ? WHERE id = ?",
  [Date.now(), 7],
);
const tables = await arg.db.tables("/data/app.db");
const cols = await arg.db.schema("/data/app.db", "users");
```

- Works on `.sqlite` / `.db` files. Reads and writes go through the same authenticated file routes as `arg.fs`, so the backend still enforces the signed-in user's own FGA permissions on every call — `exec` requires write access to the file.
- Web and desktop coalesce an active burst of calls for the same database onto one file read. Successful `exec` calls update those warm bytes, while `arg.fs` writes/moves/removals and fresh reads/stats invalidate them; after a brief idle gap the next call also reads the file again. This keeps watch callbacks current even when an app otherwise queries continuously.
- Errors reject with the same `.code` values as the Files API (e.g. `not_found`, `access_denied`); SQL errors surface as `request_failed`.
- **Availability:** `arg.db` executes in web and desktop previews, including desktop local-only workspaces. The native iOS and Android file bridges reject database operations. Feature-detect and degrade gracefully.

## Identity — `arg.me` and `arg.team`

- `arg.me` — the signed-in user: `{ id, name, email, avatarUrl }`. It is `null` until the capability is enabled (identity is withheld from a page the user hasn't opted in). Use `arg.me.email` for the current user's email.
- `arg.team.members()` (alias `arg.team.list()`) → `Member[]` — the workspace's members:

  ```ts
  Member = {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    role: string | null;             // "read" | "write" | "manage" | "admin"
    kind: "user" | "service_account";
    isMe: boolean;
  }
  ```

  Members carry **names + avatars only — no emails** (cross-org enumeration guard). For the current user's email, use `arg.me.email`. Members are workspace-level and are returned regardless of the file-path access scope.

  Identity `avatarUrl` values are absolute and can be passed directly to `<img src>` from the isolated preview.

  A desktop local-only workspace has no cloud membership roster, so `arg.team.members()` returns an empty array there.

## Context — what this file knows about itself

| Property          | Meaning                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `arg.dir`         | This file's folder, workspace-absolute (e.g. `/blog` or `/`). Relative paths resolve against it. |
| `arg.path`        | This file's own workspace-absolute path.                                                         |
| `arg.name`        | This file's name.                                                                                |
| `arg.workspaceId` | The workspace id.                                                                                |
| `arg.scope`       | The active file-path access scope: `"folder"` or `"workspace"`.                                  |
| `arg.enabled`     | Whether the capability is currently on.                                                          |
| `arg.canWrite`    | Whether this page may **change** the workspace, not just read it. See below.                     |
| `arg.ready`       | Promise resolving to the `arg` object once the handshake completes.                              |
| `arg.version`     | SDK version (currently `1`).                                                                     |

## Read vs read and write

Workspace access can be **Read** or **Read and write**, and an unconfigured preview starts with **Read** enabled. Reads, `arg.me` and `arg.team.members()` work under both. Under Read, the mutating ops - `write`, `remove`, `mkdir`, `move`, `copy` and `db.exec` - reject with `code: "read_only"`, as do `POST`/`PUT`/`PATCH`/`DELETE` through the relative-fetch shim.

So a page that writes must not assume it can. Check `arg.canWrite` after `arg.ready` and degrade honestly - hide or disable the controls that would fail, and tell the user to pick "Read and write" in the preview's permissions menu:

```js
if (!arg.canWrite) {
  saveButton.disabled = true;
  saveButton.title = 'Switch Workspace access to "Read and write" to save changes.';
}
```

`arg.canWrite` is false whenever a write would be refused, so it already accounts for the surrounding view being read-only (a public share, a view-locked embed) as well as the user's own choice. Prefer it over `arg.readOnly`, which reports only the first of those.

## Paths & scope

- **Relative paths** (`"data/x.json"`, `"posts.json"`) resolve against **this file's folder** (`arg.dir`).
- **A leading `/`** (`"/shared/config.json"`) is **workspace-root-relative**.
- The user picks an **access scope** in the permissions menu that bounds every file path:
  - `"folder"` — only this file's folder and its subtree. A path outside it throws `code: "out_of_scope"`. (A file living at the workspace root effectively gets whole-workspace reach, since its folder _is_ the root.)
  - `"workspace"` — the entire workspace.
- Scope clamps **file paths only**. `arg.me` and `arg.team.members()` are workspace-level either way.
- Cloud calls are independently authorized by the backend. Desktop local-only calls are resolved and scope-clamped in Electron's main process against the folder the user opened; path traversal and symlink escapes are rejected.
- UUID helpers (`readFileById`, `assetUrlById`, `resolveId`, etc.) resolve the id to its current path first, then apply the same access scope. If a `<FileEmbed id="…">` points outside this file's folder, switch the preview's Workspace access scope to `"workspace"`.

**Prefer storing data in plain `.json` files** so it stays inspectable and editable inside arg.

## Rendering MDX `<FileEmbed>` images

MDX files often reference embedded workspace files by stable UUID:

```mdx
<FileEmbed id="5286c2f0-18ea-4817-b27b-5be456fa3f46" height={506} />
```

To render image embeds from a custom `.html` preview, extract the `id` and set the image `src` from `assetUrlById(id).url`:

```html
<script>
  async function renderFileEmbed(id, height) {
    const asset = await arg.fs.assetUrlById(id);
    const img = document.createElement("img");
    img.src = asset.url;
    img.style.maxWidth = "100%";
    if (height) img.style.maxHeight = `${height}px`;
    return img;
  }
</script>
```

For small images where an inline URL is more convenient, `await arg.fs.dataUrlById(id)` returns a `data:image/...;base64,...` string.

## Errors

Failures reject with an `Error` whose `.code` is one of:

| `code`           | Meaning                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `out_of_scope`   | Path is outside the active access scope (or escapes the workspace root).                   |
| `bad_request`    | Missing/invalid argument (e.g. empty path, non-string `write` content).                    |
| `access_denied`  | Backend denied the op (HTTP 403) per the user's permissions.                               |
| `not_found`      | Target doesn't exist (HTTP 404).                                                           |
| `binary_file`    | `read()` / `readById()` was called on a non-text file without an explicit binary encoding. |
| `request_failed` | Other backend error.                                                                       |
| `disabled`       | Capability is off (or no workspace is associated with the file).                           |
| `unavailable`    | Host-only functionality, such as `open()`, is unavailable on this surface.                 |
| `unknown_op`     | Unknown method (shouldn't happen with the documented surface).                             |

Wrap calls in `try/catch` and show a friendly message; treat `not_found` / a `null` from `info()` as "first run" and seed defaults rather than crashing.

## Portability

- **Web + desktop**: supported. The SDK is injected inline, so it works from the desktop app's on-device `arg-preview:` origin where an absolute `<script src>` wouldn't resolve. Desktop local-only workspaces support the full path-based filesystem and SQLite surfaces; cloud registry IDs and team membership are unavailable locally.
- **iOS + Android**: supported through native WebView bridges with the same file, identity, relative-fetch, and bounded static script/stylesheet behavior. `arg.db` remains unavailable in the native mobile bridges.
- **Outside Arg**: unsupported. Pages must feature-detect `window.arg` and degrade gracefully.

## Complete pattern — a single-document, file-backed page

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Notes</title>
  </head>
  <body>
    <main id="app">Loading…</main>
    <script>
      (async () => {
        const app = document.getElementById("app");
        if (!window.arg) {
          app.textContent = "Open this file inside arg to enable saving.";
          return;
        }
        try {
          await arg.ready;
        } catch {
          app.textContent =
            'Enable "Scripts" + "Workspace access" in the preview permissions menu.';
          return;
        }

        const FILE = "notes.json";
        const load = async (fresh = false) => {
          const options = fresh ? { fresh: true } : undefined;
          return (await arg.fs.exists(FILE, options)) ? await arg.fs.readJSON(FILE, options) : [];
        };
        const save = (notes) => arg.fs.writeJSON(FILE, notes);

        async function render(fresh = false) {
          const notes = await load(fresh);
          app.innerHTML = `
            <h1>Notes (${notes.length})</h1>
            <button id="add">Add note</button>
            <ul>${notes.map((n) => `<li>${n.text} — ${n.by}</li>`).join("")}</ul>`;
          document.getElementById("add").onclick = async () => {
            notes.push({ text: "New note", by: arg.me.name, at: Date.now() });
            await save(notes);
            await render(true); // update this view, never navigate to another .html
          };
        }
        await render();
        const stop = arg.fs.watch(FILE, () => render(true));
        window.addEventListener("beforeunload", stop, { once: true });
      })();
    </script>
  </body>
</html>
```

## Tips

- Feature-detect with `if (window.arg)` and provide a sensible read-only / "open in Arg" fallback - the same `.html` may be viewed outside Arg.
- Store data in plain `.json` files so it stays inspectable and editable in arg, and treat workspace files as the data store, not as pages.
- Keep everything in one document: drive navigation from in-page state (`location.hash` + `hashchange`), never `<a href="page.html">`.
