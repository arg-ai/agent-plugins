---
name: arg-fs-js-sdk
version: "1.0.0"
description: Use the window.arg filesystem JavaScript SDK inside previewed Arg .html files. Load when building or modifying a single-file HTML app that reads or writes workspace files at runtime, needs stable file IDs, asset URLs, SQLite access, current-user identity, or team member metadata from the injected arg-fs browser bridge.
---

# Arg FS SDK (`window.arg`)

An optional **runtime** SDK that lets a single self-contained `.html` file read and write real workspace files and read the signed-in user's identity — so one page can act as its own backend (blogs, CRMs, dashboards, note apps), with data persisted as ordinary workspace files.

> **Runtime global:** `window.arg` · **Availability:** previewed `.html` (web + desktop) · **Import:** none (injected)

## What it is, in one paragraph

When a `.html` file is previewed inside arg it renders in a **sandboxed, null-origin iframe** with no session cookie — by design, so a page can't silently touch your data. The side effect is the page can't reach the backend at all. The arg-fs SDK fixes that for opted-in pages: when the user turns on the **"Workspace access"** capability (plus **"Scripts"**) in the preview's permissions menu, the editor **injects `window.arg` inline** into the page. Each call is relayed over `postMessage` to the editor, which performs the backend operation with the signed-in user's session and posts the result back. The page never sees a token; the backend still enforces that user's own permissions on every call.

## The three rules (read these first)

1. **There is NO import.** Do not add `<script src>`, npm, ESM, or a CDN tag. `window.arg` is injected automatically when the capability is on. Trying to import it does nothing.
2. **Always feature-detect with `if (window.arg)` and degrade gracefully.** The SDK is absent when the page is opened outside arg, or in the iOS app (which renders `.html` natively in a `WKWebView` with no bridge). A page that assumes `window.arg` exists will throw there.
3. **Build a single-document app.** Never `<a href="page.html">` to another HTML file — that reloads the sandboxed preview and **drops `window.arg`**, losing the SDK session. Change views with in-page state (buttons / click handlers / `location.hash` + a `hashchange` listener) and read data from `arg.fs`. Treat workspace files as your data store, not as pages.

## Boilerplate

A classic `<script>` has no top-level `await`, so wrap calls in an async IIFE and await `arg.ready` before using the API:

```html
<script>
  (async () => {
    if (!window.arg) return; // opened outside arg, or iOS — degrade gracefully
    await arg.ready; // resolves once the editor handshake completes
    const posts = (await arg.fs.exists("posts.json")) ? await arg.fs.readJSON("posts.json") : [];
    posts.push({ author: arg.me.name, at: Date.now() });
    await arg.fs.writeJSON("posts.json", posts); // creates the file if missing
  })();
</script>
```

`arg.ready` is a `Promise` that resolves to the `arg` object once the editor's context handshake arrives. If the handshake never comes within ~4s (e.g. the capability is off), it **rejects** — so guard with `if (!window.arg) return;` and optionally `.catch()` on `arg.ready`. Every `arg.fs.*` / `arg.team.*` method returns a Promise; individual operations time out after ~30s.

## Files API — `arg.fs.*`

All methods return Promises. Paths are strings (see **Paths & scope** below).

| Method                              | Returns                                           | Notes                                                                                                                |
| ----------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `read(path, opts?)`                 | `string \| Uint8Array \| ArrayBuffer \| FileData` | Text by default. For binary files, pass `{ encoding: "base64" \| "dataUrl" \| "bytes" \| "arrayBuffer" \| "file" }`. |
| `readJSON(path)`                    | parsed value                                      | `JSON.parse(read(path))`. Throws if the file isn't valid JSON.                                                       |
| `readById(id, opts?)`               | `string \| Uint8Array \| ArrayBuffer \| FileData` | Same as `read()`, but starts from a stable file UUID.                                                                |
| `readJSONById(id)`                  | parsed value                                      | `JSON.parse(readById(id))`.                                                                                          |
| `readBytes(path)`                   | `Uint8Array`                                      | Convenience for `read(path, { encoding: "bytes" })`.                                                                 |
| `readBytesById(id)`                 | `Uint8Array`                                      | Convenience for `readById(id, { encoding: "bytes" })`.                                                               |
| `readFile(path)`                    | `FileData`                                        | Text or binary content. Binary files return base64 plus a `dataUrl`.                                                 |
| `readFileById(id)`                  | `FileData`                                        | Same as `readFile()`, but starts from a stable file UUID.                                                            |
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
| `info(path)`                        | `Entry \| null`                                   | Metadata, including best-effort created/updated/owner fields. `null` if the path doesn't exist.                      |
| `infoById(id)`                      | `Entry \| null`                                   | Metadata by stable file UUID. `null` if deleted.                                                                     |
| `exists(path)`                      | `boolean`                                         | Convenience over `info()`.                                                                                           |
| `remove(path)`                      | `{ deleted }`                                     | Also available as `arg.fs.delete(path)`.                                                                             |
| `mkdir(path)`                       | `{ path }`                                        | Create a folder.                                                                                                     |
| `move(from, to)`                    | `{ from, to, path }`                              | Move/rename.                                                                                                         |
| `copy(from, to)`                    | `{ from, to, path }`                              | Copy.                                                                                                                |

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

`arg.fs.readBytes(path)` and `arg.fs.readBytesById(id)` are aliases for the `bytes` mode.

**Glob semantics:** `*` matches within a path segment, `**` spans separators, `?` matches a single non-`/` character. A leading `/` in the pattern is workspace-root-relative; otherwise it resolves against `cwd` (default: the scope root).

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
- Errors reject with the same `.code` values as the Files API (e.g. `not_found`, `access_denied`); SQL errors surface as `request_failed`.
- **Availability:** `arg.db` executes in the **web editor** only. It is **not yet available in the native iOS HTML viewer** (which, like the rest of the SDK, has no bridge — see **Portability**). Feature-detect and degrade gracefully.

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

## Context — what this file knows about itself

| Property          | Meaning                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `arg.dir`         | This file's folder, workspace-absolute (e.g. `/blog` or `/`). Relative paths resolve against it. |
| `arg.path`        | This file's own workspace-absolute path.                                                         |
| `arg.name`        | This file's name.                                                                                |
| `arg.workspaceId` | The workspace id.                                                                                |
| `arg.scope`       | The active file-path access scope: `"folder"` or `"workspace"`.                                  |
| `arg.enabled`     | Whether the capability is currently on.                                                          |
| `arg.ready`       | Promise resolving to the `arg` object once the handshake completes.                              |
| `arg.version`     | SDK version (currently `1`).                                                                     |

## Paths & scope

- **Relative paths** (`"data/x.json"`, `"posts.json"`) resolve against **this file's folder** (`arg.dir`).
- **A leading `/`** (`"/shared/config.json"`) is **workspace-root-relative**.
- The user picks an **access scope** in the permissions menu that bounds every file path:
  - `"folder"` — only this file's folder and its subtree. A path outside it throws `code: "out_of_scope"`. (A file living at the workspace root effectively gets whole-workspace reach, since its folder _is_ the root.)
  - `"workspace"` — the entire workspace.
- Scope clamps **file paths only**. `arg.me` and `arg.team.members()` are workspace-level either way.
- The backend independently enforces the signed-in user's own permissions on every call, so the SDK can never exceed what that user could already do by hand.
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

- **Web + desktop**: supported. The SDK is injected inline, so it works on the desktop app's null `file://` origin where an absolute `<script src>` wouldn't resolve.
- **iOS**: **not supported.** iOS renders `.html` in a native `WKWebView`, so `window.arg` is absent. Pages must feature-detect and degrade gracefully.

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
        const load = async () => ((await arg.fs.exists(FILE)) ? await arg.fs.readJSON(FILE) : []);
        const save = (notes) => arg.fs.writeJSON(FILE, notes);

        async function render() {
          const notes = await load();
          app.innerHTML = `
            <h1>Notes (${notes.length})</h1>
            <button id="add">Add note</button>
            <ul>${notes.map((n) => `<li>${n.text} — ${n.by}</li>`).join("")}</ul>`;
          document.getElementById("add").onclick = async () => {
            notes.push({ text: "New note", by: arg.me.name, at: Date.now() });
            await save(notes);
            render(); // re-render from state, never navigate to another .html
          };
        }
        render();
      })();
    </script>
  </body>
</html>
```

## Tips

- Feature-detect with `if (window.arg)` and provide a sensible read-only / "open in arg" fallback — the same `.html` may be viewed outside arg or on iOS.
- Store data in plain `.json` files so it stays inspectable and editable in arg, and treat workspace files as the data store, not as pages.
- Keep everything in one document: drive navigation from in-page state (`location.hash` + `hashchange`), never `<a href="page.html">`.
