---
name: arg-file-html
description: Create, read, update, and delete HTML/web files (html, htm) in Arg, including file-backed single-page apps that use the window.arg JS FS SDK for persistent state. Load when building web pages, dashboards, blogs, CRMs, or any .html that needs to read/write workspace files at runtime.
---

# HTML / web files (`.html`, `.htm`)

Arg has a live-preview editor for `.html`: it renders the page in a **sandboxed, null-origin iframe** (scripts off by default). Plain HTML files are created with `write_file` using standard markup.

## CRUD

`.html`/`.htm` are plain text — use your active Arg access method (`arg-mcp` / `arg-cli` / `arg-fuse` — see `arg-core`). The rest of this skill covers the runtime `window.arg` FS SDK for file-backed pages.

## File-backed apps with the `window.arg` FS SDK

A `.html` page can read/write real workspace files and read the signed-in user's identity **at runtime**, so a single self-contained page becomes its own backend (blogs, CRMs, dashboards, note apps) — data persists as ordinary workspace files. Full reference: **https://arg.ai/docs/sdks/fs/llms.txt**

### The three rules (follow these)

1. **There is NO import.** Never add `<script src>`, npm, ESM, or a CDN tag for it. The editor injects `window.arg` inline when the user turns on **"Scripts" + "Workspace access"** in the preview's permissions menu.
2. **Feature-detect with `if (window.arg)` and degrade gracefully.** It's absent when the page is opened outside Arg or in the iOS app. The user — not you — enables the capability, so the page must still work (read-only or with a hint) when it's off.
3. **Build a single-document app.** Never `<a href="page.html">` to another HTML file — that reloads the sandboxed preview and **drops `window.arg`**. Change views with in-page state (buttons / click handlers / `location.hash` + a `hashchange` listener) and render from `arg.fs` reads. Treat workspace files as the data store, not as pages.

### Boilerplate

A classic `<script>` has no top-level `await` — wrap calls in an async IIFE and `await arg.ready` (it rejects after ~4s if the capability is off):

```html
<script>
  (async () => {
    if (!window.arg) return; // opened outside arg, or iOS — degrade gracefully
    try { await arg.ready; } catch { /* capability off — show a hint */ return; }
    const FILE = "notes.json";
    const notes = (await arg.fs.exists(FILE)) ? await arg.fs.readJSON(FILE) : [];
    notes.push({ text: "New note", by: arg.me.name, at: Date.now() });
    await arg.fs.writeJSON(FILE, notes); // creates the file (and parent folders) if missing
  })();
</script>
```

### Files API — `arg.fs.*` (all return Promises)

| Method | Returns | Notes |
| --- | --- | --- |
| `read(path, opts?)` | `string \| Uint8Array \| ArrayBuffer \| FileData` | Text by default. For binary files, pass `{ encoding: "base64" \| "dataUrl" \| "bytes" \| "arrayBuffer" \| "file" }`. |
| `readJSON(path)` | parsed value | `JSON.parse(await read(path))`. |
| `readById(id, opts?)` / `readJSONById(id)` | same as path variants | Start from a stable file-registry UUID, then apply access scope. |
| `readBytes(path)` / `readBytesById(id)` | `Uint8Array` | Convenience for `{ encoding: "bytes" }`. |
| `readFile(path)` / `readFileById(id)` | `FileData` | Full file payload. Binary content is base64 plus a ready `dataUrl`. |
| `dataUrl(path)` / `dataUrlById(id)` | `string` | Good for small inline assets. |
| `assetUrl(path)` / `assetUrlById(id)` | `AssetUrl` | Short-lived signed URL for normal `<img>`, `<video>`, `<audio>`, `<embed>` sources; prefer for large media. |
| `open(path)` / `openById(id)` | `OpenResult` | Ask the Arg host to open the file in an editor tab. May reject with `unavailable`. |
| `resolveId(id)` | `string \| null` | Resolve a file UUID to its current workspace path; `null` if deleted. |
| `getId(path)` | `string` | Get or create the stable file UUID for a scoped path. |
| `write(path, text)` | `{ path, revision }` | Creates the file + any missing parent folders. |
| `writeJSON(path, value)` | `{ path, revision }` | Pretty-prints with 2 spaces. |
| `list(dir?)` | `Entry[]` | Lists one directory (defaults to the scope root). |
| `glob(pattern, { cwd }?)` | `string[]` | `*` within a segment, `**` spans `/`, `?` one char. |
| `search(query, { path, include }?)` | `Match[]` | Full-text search. |
| `info(path)` / `infoById(id)` | `Entry \| null` | Storage metadata plus best-effort id/audit attribution; `null` if missing/deleted. |
| `exists(path)` | `boolean` | Convenience over `info()`. |
| `remove(path)` | `{ deleted }` | Alias `arg.fs.delete(path)`. |
| `mkdir(path)` | `{ path }` | Create a folder. |
| `move(from, to)` / `copy(from, to)` | `{ from, to, path }` | Move/rename or copy. |

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

Actor metadata intentionally omits member emails. Use `arg.me.email` only for the current signed-in user.

### Rendering MDX `FileEmbed` images

MDX documents embed workspace files by stable UUID:

```mdx
<FileEmbed id="5286c2f0-18ea-4817-b27b-5be456fa3f46" height={506} />
```

In a custom `.html` preview, use the UUID helpers rather than guessing a path. Prefer `assetUrlById(id).url` for normal image/media rendering:

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

Use `dataUrlById(id)` only for small inline images. UUID helpers resolve id-to-path first, then apply the active access scope; if a `FileEmbed` points outside this HTML file's folder, the preview must use the `"workspace"` access scope.

### Identity & context

- `arg.me` → `{ id, name, email, avatarUrl }` (`null` until the capability is on; use for the current user's email).
- `arg.team.members()` (alias `arg.team.list()`) → members `{ id, name, avatarUrl, role, kind, isMe }` — **names + avatars only, no emails**.
- `arg.dir` (this file's folder), `arg.path`, `arg.name`, `arg.workspaceId`, `arg.scope` (`"folder"` | `"workspace"`), `arg.enabled`, `arg.ready`, `arg.version`.

### Paths, scope & errors

- Relative paths (`"data/x.json"`) resolve against this file's folder (`arg.dir`); a **leading `/`** is workspace-root-relative.
- The user's access scope bounds every **file** path: `"folder"` (this subtree) or `"workspace"` (everything). Identity is workspace-level regardless. The backend still enforces the user's own permissions.
- UUID helpers (`readById`, `assetUrlById`, `resolveId`, `infoById`, etc.) resolve the id to its current path first, then enforce the same scope.
- Calls reject with an `Error` whose `.code` is one of `out_of_scope`, `bad_request`, `access_denied`, `not_found`, `binary_file`, `request_failed`, `disabled`, `unavailable`, `unknown_op`. Wrap in `try/catch`; treat `not_found` / a `null` `info()` as first-run and seed defaults. Treat `unavailable` from `open()` / `openById()` as "this host cannot open editor tabs".

## Guidance

- **Prefer storing data in plain `.json` files** so it stays inspectable and editable inside Arg.
- Supported on web + desktop; **not** on iOS (no bridge) — always feature-detect.
- Need a real server/process (a framework, a backend, a port) instead of a file-backed page? Use a **`.site`** file instead — a JSON config (`command`, `port`, optional `exec`/`timeout`) that launches a process in a sandboxed container and exposes it as a public URL. Over MCP you can also host a workspace command with `deploy_server`.
