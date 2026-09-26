---
name: arg-sdk
version: "0.1.0"
description: Guide to host-provided @arg-ai/sdk for HTML and React apps, plus @arg/sdk for local serving, authenticated agent scripts, API-key CI, hosted Sites and gateways. Covers runtime selection, permissions, every namespace and supported legacy interfaces.
---

# Arg SDK

Use `@arg-ai/sdk` for new Arg app code. For scripts and server clients, follow the runtime-specific SDK guide. Read the current SDK documentation at https://developers.arg.ai/guides/sdk/overview and its runtime-specific guides before choosing a transport or method. Inside custom apps, Arg hosts resolve `@arg-ai/sdk` without an install or account token. Imports never grant permissions; handle host denials and unsupported capabilities explicitly. Keep credentials on the server.

The API inventory below is a quick reference. The developer documentation is authoritative for current signatures and runtime support.

## Embedded HTML, TSX and JSX

```ts
import { actions, auth, fs } from "@arg-ai/sdk";

const principal = await auth.principal();
const settings = await fs.readJSON<{ title: string }>("./settings.json");
const stop = fs.watch("./settings.json", async () => {
  console.log(await fs.readJSON("./settings.json", { fresh: true }));
});
// Call stop() when the component or page no longer needs the subscription.
```

Prefer named imports from `@arg-ai/sdk` for app namespaces. Subpath imports such as
`@arg-ai/sdk/fs` and `@arg-ai/sdk/actions` expose the same objects.
Client factories keep their explicit runtime entry points: `@arg/sdk/server`,
`@arg/sdk/local`, `@arg/sdk/hosted`, and `@arg/sdk/gateway`.

The `arg` object also provides all namespaces and runtime readiness:

```ts
import { arg } from "@arg-ai/sdk";
await arg.ready;
const rows = await arg.db.query("./notes.sqlite", "SELECT * FROM notes LIMIT 50");
const people = await arg.users.list();
```

HTML uses `<script type="module">`. Arg's HTML hosts inject an import map;
the React preview compiler resolves these modules locally. No package download
or account token is needed inside the guest. Web and desktop use their existing
isolated bridges; native HTML uses the existing iOS and Android bridges.

Filesystem access and Actions retain their separate grants. An import does
not grant access. Host denials propagate and never trigger a credential fallback.
The `db` namespace still operates on workspace SQLite files; it is not a managed
multiuser database. Conditional file writes are supported by the HTTP transport;
legacy embedded hosts reject them explicitly rather than ignoring the condition.

`ui` from `@arg-ai/sdk` exposes the existing app chrome registration, update, event and
dispose contract. It requires no filesystem grant. React components and the
`useAppChrome` hook remain in `@arg/ui`.

```ts
import { agents } from "@arg-ai/sdk";
const run = await agents.run("Summarize the notes", {
  readOnly: true,
  waitForCompletion: true,
});
// Both the Action and the agent have statuses; inspect both before using output.
if (run.status === "succeeded" && run.output?.status === "completed") {
  console.log(run.output.result);
}
```

Agent execution uses the registered `agent_run` Action and the viewer's separate
Actions consent. Code execution, automation execution, provider API requests,
and notification delivery are also available through their registered Actions.
Use `actions.list` and `actions.schema` to discover their current contracts.

## Notify people and share files

Authenticated HTTP runtimes expose explicit helpers for notifying the current
user or one teammate, and for sharing cloud files or folder hierarchies with an
Arg user:

```ts
const me = await arg.auth.principal();
const teammate = (await arg.users.list()).find(
  (member) => member.kind === "user" && member.id !== me.id,
);
if (!teammate) throw new Error("No teammate is available");
await arg.notifications.sendToMe({ title: "Export complete" });
await arg.notifications.sendToUser(teammate.id, { title: "Review ready" });
await arg.permissions.shareFolder("/reports", {
  userId: teammate.id,
  permission: "write",
});
```

Use `read`, `write` or `manage` for file and folder grants. The caller needs
`manage` on the path, the target user must belong to the workspace organization,
and folder grants flow to descendants. `admin` remains a workspace-only level.
The backend applies the same checks to server clients, authenticated `arg serve`
sessions and agent scripts. Embedded apps report `unsupported_capability` for
this namespace until their host has a dedicated delegation grant.

## Agent-authored JavaScript

`run_code` accepts leading static imports from `@arg/sdk` and its browser-safe
subpaths. The host binds each run to the current principal, workspace, read-only
state and turn switches before the isolate starts. The isolate receives no bearer,
API key or SDK capability and has no network egress; SDK calls cross its existing
host dispatcher. Each execution gets a fresh binding, so cached source cannot
inherit another turn's authority. Tool-restricted subagents cannot use the unified
SDK, and one script may make at most 100 SDK calls.

```ts
import { actions, auth, chat, fs } from "@arg/sdk";

const principal = await auth.principal();
const notes = await fs.readJSON("notes.json");
const catalog = await actions.list({ query: "summarize" });
return { principal, notes: notes.length, actions: catalog.length };
```

`run_bash` and `arg exec` sandbox images contain the generated `@arg/sdk`
package at the image root, so a `.mjs` file under `/ws` can use root or subpath
imports without installing dependencies:

```ts
import { actions, fs } from "@arg/sdk";

const text = await fs.read("notes.md");
await fs.write("notes-copy.md", text);
await actions.run("file_read", { path: "notes-copy.md" });
```

Every shell command receives a newly minted capability scoped to its principal,
workspace and read/write gate, expiring within 15 minutes. The SDK detects that
capability from the injected environment. OAuth access tokens and API keys stay
in Arg. Command output and server logs redact the injected token values. Scripts
must not print, persist, copy or transmit `ARG_*_TOKEN` values. Direct `/ws` file
access remains available for ordinary shell tools; use the SDK when a script also
needs Actions, chats, workspace discovery or the normalized API contracts.

Agent runtimes expose every backend resource their transport can enforce. Host
navigation (`fs.open` / `host`), embedded SQLite, app chrome and raw integration
proxying require their dedicated host/capability and return
`unsupported_capability` here. `fs.watch` uses sequential metadata polling while
the JavaScript process remains alive. The Code and Servers turn switches also
gate `code.run` and `servers.*` calls made from `run_code`. From `run_bash` and `run_code`,
`chat.start` / `chat.continue` / `chat.create` / `chat.send` and `code.run` are
refused with `permission_denied` unless the turn runs under `full_access`: the
script's token outlives the one command an approval card covered.

## Workspace chats and discovery

Custom apps import these bindings from `@arg-ai/sdk`; agent scripts import the
same bindings from `@arg/sdk`.

`chat` / `arg.chat` operate on the client's selected **cloud workspace**.
Chats belong to the current user or service identity and must be bound to that
workspace. List and search return Arg chats, plus - inside the Arg desktop app -
the Claude Code and Codex sessions the machine keeps for that workspace.
`workspace` / `arg.workspace.list()` returns workspaces the identity can access
in the selected workspace's organization, including its private workspace. It
exposes no create, update or delete methods.

```ts
import { chat, workspace } from "@arg-ai/sdk";

const workspaces = await workspace.list();
const turn = await chat.start("Summarize this workspace", {
  title: "Workspace summary",
  openPanel: true,
});
const page = await chat.list({ limit: 20, offset: 0 });
const matches = await chat.search("summary", { limit: 10 });
const history = await chat.get(turn.chat_id);
await chat.continue(turn.chat_id, "What should I do next?");
```

`start` creates a chat and submits its first message; `continue` submits to an
existing chat. `create({ title, agent })` and `send(chatId, message, options)`
expose the two steps separately if you need to retain the chat ID before
submission. A send returns acceptance (`chat_id`, `job_id`, `call_id`) or a queued
result (`status: "queued"`, `queue_id`, `position`). It does not wait for the
answer or stream tokens. Read the transcript with `get`; while its run is current,
inspect `status(chatId, callId ?? jobId)` for `pending`, `completed` or `error`. A
queued turn has no call ID until dispatched. Do not retry an accepted send to
fetch a response.

### Claude Code and Codex on the desktop

`agent` on `start` / `create` picks the harness: `"arg"` (the cloud agent, the
default on a cloud workspace), `"claude_code"` or `"codex"`. The local harnesses
are CLI processes the Arg desktop app spawns, so only an app open inside the
desktop can create or continue one; every other host (web, iOS, Android, `arg
serve`, server and gateway clients) refuses with `unsupported_capability` and
names the harness rather than substituting the cloud agent. On a folder mounted
only from disk, which has no cloud workspace, an unnamed `agent` means the
desktop's own default, Claude Code.

```ts
const turn = await chat.start("Add tests for the parser", { agent: "claude_code" });
const status = await chat.status(turn.chat_id, turn.call_id);
const transcript = await chat.get(turn.chat_id);
```

A local-harness send is a handoff to the desktop's mounted harness view, which
owns that harness's transport, approvals and recovery. The view runs hidden by
default, the receipt is accepted once it has taken the message, and `call_id` is
the user message it was submitted as. Set `openPanel: true`, or call
`chat.open(chatId)`, to reveal that same running conversation. `status` reads the
desktop's local history: `pending` while the turn runs,
`completed` with the assistant text answering that message, `error` when the
turn failed or was stopped before replying. `list` includes those sessions on the
first page only; `search` scans their transcripts on this machine. The chat's
`agent_type` tells you which harness answers it.

`openPanel: true` on `start` or `continue` reveals the conversation after the send
is accepted. Web and desktop open their chat panel beside the app; iOS and Android
open the native chat. `open(chatId)` reveals an existing conversation. The result
reports `panelOpened` (or `opened` for `open`), and is false for server, local HTTP
and hosted gateway clients without an Arg UI host. Failure to open the panel does
not discard an accepted send.

Embedded previews need Workspace access enabled with **Workspace** scope.
Creating or sending additionally needs **Read and write** and **Actions** enabled;
read-only or folder-scoped grants cannot widen into chat authority. Missing host
support returns an explicit unsupported error. A desktop folder mounted only from disk has no cloud workspace: there, `chat` reaches the local harnesses only, `workspace.list` is unavailable, and because Actions are never offered on such a folder the **Read and write** grant is the whole consent for a send; use authenticated `arg serve --workspace …` or a cloud-mounted preview for cloud conversations. Under `arg serve`, chat uses
the selected cloud workspace while `fs` still uses local disk. `--anonymous` and
Site/Server Action-only capability tokens grant no chat or workspace discovery.
Published Sites opened inside Arg can use the viewer bridge after consent. Standalone pages require a gateway with an explicit account session and resource policy.

## Local apps and disk files

```sh
arg serve ./my-app --open                 # CLI account + local files
arg serve ./my-app --write --open         # also allow local disk edits
arg serve ./my-app --anonymous --open     # disk-only, no account access
```

The CLI serves HTML and built assets, injects SDK modules, and roots filesystem
access in the selected directory. In served HTML, the same
`import { fs } from "@arg-ai/sdk"` reads local disk. Relative paths resolve beside
the HTML file; `/` is the served directory. Files are not uploaded. By default
the CLI uses its logged-in account (or explicit API key) and the active cloud
workspace; `--workspace <id-or-name>` selects another for this run. Login and
workspace access are checked before serving. `--anonymous` skips account
credentials and all cloud requests. Build TSX/JSX with your app's build tool before
serving its output; this command is not a React development compiler.

Node scripts can connect to that running directory server explicitly:

```ts
import { createLocalClient } from "@arg/sdk/local";
const arg = createLocalClient({
  baseUrl: "http://127.0.0.1:3333",
  token: process.env.ARG_LOCAL_TOKEN!, // arg-token from this run's launch URL
});
try {
  console.log(await arg.fs.read("./notes.txt"));
} finally {
  arg.dispose();
}
```

Disk operations run in the CLI through directory-rooted filesystem handles.
The SDK does not directly open arbitrary Node paths: `arg serve` selects the root
and its write policy. Each server start mints a new session. Open its full launch
URL once to establish a browser session; the fragment is removed before loading
the app. Requests require the session plus exact host/origin validation.

Reads, binary/JSON encodings, listings, glob, info, polling watches, writes,
mkdir, file copy/move and removal work locally. Content reads/writes are capped
at 8 MiB and directory listings at 1,000 entries, with at most 16 concurrent requests. Hidden paths, symlinks and
non-regular files are excluded. Copy requires an unused destination; move uses
filesystem rename semantics and can replace a destination file. Removal refuses
nonempty directories. `createOnly` is atomic; `baseRevision` is unsupported
because external editors do not participate in the server's write protocol.
Stable cloud file IDs and SQLite remain unsupported by the local filesystem.
In account mode, `await arg.ready` discovers the selected cloud workspace;
`arg.auth`, `arg.users`, `arg.permissions`, `arg.actions`, `arg.agents`, comments,
notifications, integration discovery, automations, code, sites and servers use
the CLI-owned account bridge. Local `arg.fs` paths and cloud resource paths are
separate: permission grants, comments, automation files and site sources refer
to the selected cloud workspace, never implicitly uploaded disk files. App
chrome and host navigation still need an Arg application host. Integration
proxying still requires its separate capability transport.

Serve only code you trust with this account. Account mode permits the supported
backend reads and mutations under that principal's existing permissions;
`--write` controls **disk writes only**, not cloud Actions or mutations. This is
an explicit local developer session, not a hosted visitor-consent mechanism.
Use `--anonymous` to run the previous disk-only mode.

Account access/refresh tokens and API keys remain in the CLI. The browser gets
only the per-run loopback session. The bridge accepts reviewed method/path
contracts, pins workspace-bearing requests and the active organization, checks
Site ownership, strips all incoming headers, refuses redirects, and sanitizes
upstream errors. It cannot call credential-management endpoints or proxy an
arbitrary URL. New service-worker registrations are refused to prevent browser
persistence across local sessions; ordinary web workers remain supported. Responses and requests are limited to 8 MiB; account calls have
a 12-minute server deadline and share the 16-request concurrency cap. Backend
resource authorization still applies, including scopes of code and agent runs.
OAuth logout or replacement credentials stop future requests; another CLI
process rotating that login also requires restarting this server. Requests
already accepted by Arg may finish. Stopping the server revokes its local
session; API-key sessions last until stopped or the key is revoked.

## Servers and CI

```ts
import { createServerClient } from "@arg/sdk/server";

const arg = createServerClient({
  workspaceId: process.env.ARG_WORKSPACE_ID!,
  auth: { kind: "api-key", key: process.env.ARG_API_KEY! },
});
try {
  const file = await arg.fs.readFile("/state.json");
  if (!file.revision) throw new Error("A revision is required to update this file");
  await arg.fs.writeJSON("/state.json", { updated: true }, { baseRevision: file.revision });
  const sites = await arg.sites.list();
} finally {
  arg.dispose();
}
```

API keys can belong to a user or a service account. Bearer access tokens are
also accepted through `{ kind: "access-token", token }`. The server entry point
refuses execution in a browser. Credentials remain server-side. `basePath` is a
relative-path convenience, **not an authorization boundary**: resource access
continues to be checked by Arg's backend.

The server client implements FS, Actions, principal lookup, workspace members,
file and folder permission grants, comments, notifications, integration
discovery, automation lifecycle, command execution, Site
builds/versions/promotion and server lifecycle using existing Arg APIs.
Existing backend permissions still apply; user-only endpoints can refuse a
service account.

For advanced existing APIs, `files` exposes multipart uploads and streaming,
`workspaces`, `chats`, `keys` and `agentLifecycle` expose the supported legacy
resource implementations. Their public DTOs and errors remain the legacy
contracts. `agents.run` is the same Actions-based interface as in embedded apps.

HTTP requests use bounded responses, deadlines, cancellation and no redirects.
Mutating requests are not automatically retried. Cancellation stops waiting and
cannot undo an already accepted mutation; reconcile its result before retrying.
Directory listings stop after
one storage page and reject a truncated result; glob walks stop at 64 directories
or 10,000 entries. File watchers poll sequentially and stop on `dispose()`.
Use the advanced file resource for large transfers.

## Existing Site and Server capabilities

`createCapabilityClient` from `@arg/sdk/server` accepts the existing server-side
Action token plus its workspace ID and API base URL. It uses `/api/actions-exec`
for scoped discovery, schema, execution and run lookup. It does not obtain an
account bearer or change the token's principal, read scope, expiry or revocation.
Unsupported methods fail without trying account-authenticated endpoints.

A Server can also supply its separate `integrationToken` and call
`arg.integrations.proxy(alias, "/provider/path", { method: "GET" })` for JSON
provider APIs. The backend binding selects the connection and injects provider
credentials. The integration token is never substituted for the Action token.
Existing deployment-injected tokens remain server-only; never return them to a
browser. This adapter preserves legacy Site attribution and is not visitor login.

## Published Sites opened in Arg

Bundle the browser SDK into your Site:

```ts
import { arg } from "@arg/sdk";
await arg.ready;
const viewer = await arg.auth.principal();
const settings = await arg.fs.readJSON("./settings.json");
```

Sites opened from Apps or a `.app` Site launcher in Arg web, desktop, iOS or Android
can use the signed-in **viewer**, after they enable **Permissions → Workspace
access**. This starts off for every new Site/account. Folder scope reads relative
to the Site's source folder; writes, Workspace scope and Actions are separate
choices. The grant is remembered for that Site, origin and source folder,
including published updates. Revocation or account changes replace the guest.
Credentials stay in Arg; normal `fetch()` and assets stay on the Site's network.

The bridge supports the existing embedded FS, SQLite, identity/members, chat,
workspace discovery and Actions surfaces with their existing permission gates.
Shared-origin development URLs do not receive a bridge. Android requires a WebView
with document-start scripts and origin-aware messaging.

In ordinary Chrome, public pages render anonymously and private pages retain their
viewing authorization flow. Without an Arg host, `arg.ready` rejects with
`bridge_unavailable`; no viewer/publisher account is automatically attached.
Handle this with your app's signed-out UI or configure the gateway below.

## Hosted frontends outside Arg

```ts
import { createHostedClient } from "@arg/sdk/hosted";
const arg = await createHostedClient({ endpoint: "/api/arg-sdk" });
const principal = await arg.auth.principal();
```

This connects to an **explicitly configured app-server gateway on the same
origin**. It does not log in visitors, exchange a Site viewing capability for
account access, or attach a Site owner's identity. The app server must already
own an authenticated visitor or service session and its delegation policy.

`createGateway` from `@arg/sdk/gateway` mounts on a standard Request/Response
server. Its required `authenticate(request)` callback resolves the server-owned
session afresh on every request and returns:

- `transport`: the authenticated, workspace-bound transport for that session;
- `operations`: an explicit list of permitted SDK operation names;
- `authorize({ operation, args })`: a required per-call resource-policy check.

Return `null` for an expired/revoked session and `false` for a denied call.
`createServerTransport` from `@arg/sdk/server` can supply the HTTP transport.
Never select its credential, workspace, or role from guest-provided arguments.
For Actions, authorize the Action ID and its downstream execution scope too:
allowing `actions.run` alone is not a narrow file grant. A code or agent Action
must not receive a broader workspace or integration scope than its app grant.

The gateway checks one exact origin, JSON content type and protocol header,
does not emit CORS headers, rejects oversized bodies, and hides internal error
messages. This follows the [non-simple request and origin defenses for CSRF](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF).
Cookie verification, installation consent, audience binding, expiry, revocation
and resource authorization belong to the required session callback. This is a
transport adapter, not a replacement for those controls.

## Extending the transport

`createClient({ transport, callOptions })` binds the same resources to a trusted
custom `Transport`. `callOptions` supplies a signal/deadline for its calls.
The canonical wire operation union lives in `packages/api/src/sdk-operations.ts`;
its SDK copy is generated. Unknown or unsupported operations fail explicitly.
Custom transport policy must validate resource arguments, not just operation names.

## Implementation status

| Surface                             | Implemented here                                                                                                                | Still required for the full architecture                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Embedded apps on all four platforms | FS/SQLite/user identity/team, Actions, agent execution and app chrome through existing grants; HTML and React module resolution | Separate app-delegation grants for additional backend resource namespaces                |
| Server/API/CI                       | Existing API resource adapters and legacy advanced resources                                                                    | Managed app data, terminal sessions and app-scoped telemetry                             |
| Hosted frontends                    | Viewer bridge and per-Site consent in Arg on four platforms; same-origin gateway and policy hooks                               | Standalone visitor login, managed installation/delegation sessions, Server viewer bridge |
| Data                                | Workspace file reads/writes, server conditional writes, embedded SQLite                                                         | Transactional managed data, row policies, change subscriptions and HTTP SQLite           |
| Compatibility                       | Old exports, globals, grants, build paths and execution identities retained                                                     | Published package rollout and measured migration before deprecation                      |

Do not treat a namespace with an unsupported transport as a completed feature.

## API inventory

Every namespace below is a named export from the host-provided `@arg-ai/sdk`
module and a property of `arg`.
`arg.ready` is a promise; await it before reading runtime context. Imported
namespaces are lazy and follow the current host. An explicit factory client is
bound to its chosen transport until `dispose()`.

| Namespace       | Methods and arguments                                                                                                                                                                 | Result / availability                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `auth`          | `principal()`                                                                                                                                                                         | `{ kind: "user"                                                                                                            | "service_account", id, name, email }`; authenticated context only |
| `users`         | `list()`                                                                                                                                                                              | Members visible in the bound workspace                                                                                     |
| `workspace`     | `list()`                                                                                                                                                                              | Accessible workspaces in the bound organization; no create/delete/update                                                   |
| `fs`            | `read(path, options?)`, `readJSON(path, options?)`, `readBytes(path, options?)`, `readFile(path, options?)` and their `ById` forms                                                    | Text, parsed JSON, bytes, or `{ content, encoding, mimeType, size, revision, … }`; `fresh: true` bypasses host read caches |
| `fs`            | `dataUrl(path)`, `assetUrl(path)` and `ById` forms                                                                                                                                    | Embedded data URL or authorized asset URL; do not treat an asset URL as a durable share link                               |
| `fs`            | `info(path)`, `infoById(id)`, `exists(path)`, `resolveId(id)`, `getId(path)`                                                                                                          | Metadata / existence / ID resolution; stable cloud IDs unavailable for disk-only roots                                     |
| `fs`            | `list(path?, options?)`, `glob(pattern, options?)`, `search(query, options?)`                                                                                                         | Entries, matching paths, or search results; bounded by the chosen transport                                                |
| `fs`            | `write(path, content, options?)`, `writeJSON(path, value, condition?)`                                                                                                                | `{ path, revision }`; `encoding: "utf-8"                                                                                   | "base64"`; HTTP supports `baseRevision`or`createOnly: true`       |
| `fs`            | `mkdir(path)`, `move(from, to)`, `copy(from, to)`, `remove(path)` / `delete(path)`                                                                                                    | Mutations require write authority; move/copy targets are literal file paths                                                |
| `fs`            | `watch(path, callback, options?)`, `watchById(id, callback, options?)`                                                                                                                | Returns synchronous stop function; `{ emitInitial, intervalMs }`; minimum 250 ms for polling transports; stop on unmount   |
| `host` / `fs`   | `open(path)`, `openById(id)`                                                                                                                                                          | Open in the Arg UI; unsupported without an application host                                                                |
| `db`            | `query(path, sql, params?)`, `exec(path, sql, params?)`, `tables(path)`, `schema(path, table)`                                                                                        | File-backed SQLite inside supported embedded hosts; no managed row service or HTTP SQL                                     |
| `actions`       | `list(options?)`, `schema(id)`, `describe(id, options?)`                                                                                                                              | Discover actual Action IDs and input contracts before executing                                                            |
| `actions`       | `run(id, input, options?)`, `runBatch(calls)`, `getRun(id)`, `listRuns(options?)`                                                                                                     | Action receipts, output and history; check status, do not retry accepted writes blindly                                    |
| `agents`        | `run(message, options?)`                                                                                                                                                              | Registered `agent_run` Action; e.g. `{ readOnly, waitForCompletion }`; needs Actions authority                             |
| `chat`          | `create({ title, agent }?)`, `send(id, message, options?, callOptions?)`, `start(message, options?, callOptions?)`, `continue(id, message, options?, callOptions?)`                   | Accepted or queued turn; `agent` picks `arg`, `claude_code` or `codex` (desktop only); `openPanel: true` requests host UI  |
| `chat`          | `list({ limit, offset }?)`, `search(query, { limit }?)`, `get(id)`, `status(id, callIdOrJobId)`, `open(id)`                                                                           | Workspace-bound chats for this principal; responses are not streamed                                                       |
| `comments`      | `list(path, { includeResolved }?)`, `create({ path, body, parentId?, metadata? })`, `update(id, body)`, `resolve(id, resolved?)`, `remove(id)`                                        | File comment CRUD; cloud paths even under authenticated local serve                                                        |
| `permissions`   | `share({ path, kind, userId, permission })`, `shareFile(path, options)`, `shareFolder(path, options)`                                                                                 | User grants use `read`, `write` or `manage`; caller needs `manage`, and both users must share the workspace organization   |
| `notifications` | `list({ limit, offset, unreadOnly }?)`, `send(input)`, `sendToMe(input)`, `sendToUser(userId, input)`, `markRead(id)`, `markAllRead()`                                                | `input` accepts `title?`, `body?`, `type?`, `metadata?`, `target?`, `channels?`; a title or target is required             |
| `integrations`  | `providers()`, `connections({ organizationId?, providerId? }?)`, `triggers(providerId)`                                                                                               | Discovery under current identity; connection credentials never returned                                                    |
| `integrations`  | `proxy(alias, path, { method, body }?)`                                                                                                                                               | JSON provider calls through a separate server integration capability; not general viewer or agent HTTP authority           |
| `automations`   | `run({ filePath, document?, input? })`, `getRun(id)`, `stop(id)`, `history({ limit, offset, filePath }?)`, `deployments()`, `pause(filePath)`, `resume(filePath)`                     | Workspace automation files and run lifecycle                                                                               |
| `code`          | `run(command, { sandboxId }?)`                                                                                                                                                        | `{ status: "completed"                                                                                                     | "failed", stdout, stderr, duration_ms }`; inspect `status`        |
| `sites`         | `list()`, `create({ slug, sourcePath, framework, access, displayName? })`, `get(id)`, `build(id, { autoPromote }?)`, `version(id, versionId)`, `promote(id, versionId)`, `remove(id)` | Hosted deployment lifecycle; framework: `static`, `vite`, `astro`, `next`, `worker`; access: `public`, `workspace`         |
| `servers`       | `list()`, `start({ command, port, name?, access?, actions? })`, `get(id)`, `stop(id)`                                                                                                 | Long-running server lifecycle; not an automatic frontend viewer bridge                                                     |
| `ui`            | `register(config, { onTool?, onPropertyChange?, onInspectorDismiss? }?)`                                                                                                              | Returns a handle with `update(config)` and `dispose()`; check `ui.available`; React components stay in `@arg/ui`           |

For file and Action method details, use the [SDK file guide](https://developers.arg.ai/guides/sdk/files) and [Actions guide](https://developers.arg.ai/guides/sdk/actions).

`SdkError` carries `code`, optional HTTP `status` and `requestId`. Handle
`bridge_unavailable` with an Open in Arg / signed-out state, `disabled` or
`permission_denied` with the host's consent flow, `unsupported_capability` by
choosing a supported runtime, and revision conflicts by rereading and reconciling.
Cancellation stops waiting, not an already accepted mutation. A cross-folder
HTTP move/copy may need a second rename; `partial_operation` identifies the
intermediate path if that rename fails. Inspect it before retrying.

This skill is part of the default Arg skill catalog and is available through https://arg.ai/skills/arg-sdk.md and `skill://arg.ai/arg-sdk/SKILL.md`.
