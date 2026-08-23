---
name: arg-sites
description: Publish an Arg workspace folder as a hosted website on its own subdomain - static sites, framework builds, and server-side apps - via the workspace agent's site tools or the arg CLI (arg sites deploy). Load this whenever you are asked to deploy, publish, host, or update a website, dashboard, or internal tool from workspace files, or to roll one back, share it, or take it offline.
metadata:
  version: "1.1.1"
---

# Arg Sites

A folder in an Arg workspace becomes a real website at `<slug>.sitearg.com`. You build the files, then deploy - never ask the user to click through a UI, and always hand back the final URL.

Every deploy creates an immutable **version**. The live URL points at one version, and repointing it is instant, so a rollback is never a rebuild.

## Sites vs. a running server

Publishing a **Site** is the default way to put anything the user wants to **keep or share** on a public URL - a static page, landing page, report/dashboard, a built SPA, or an SSR app. A Site is permanent, versioned, and hands back a clean shareable URL.

Do **not** use `deploy_server` (the workspace tunnel) to serve static files or a finished site. A tunnel is **ephemeral** - it auto-expires within minutes and is capped at 3 per workspace - so the link dies and the user is left with a dead URL. Reach for `deploy_server` only when the app genuinely needs a long-running server a Site cannot be: a persistent process, WebSockets, or a non-JS backend (Flask / FastAPI / Node). If it is really just static files, publish a Site.

## Deploy

`deploy_site` creates-or-redeploys, builds, and goes live in one call.

- `source_path` - the folder to publish (defaults to the workspace root).
- `slug` - the subdomain label (3-63 chars, lowercase letters/digits/inner hyphens). Reuse the same slug to redeploy that site.
- `framework` - omit to auto-detect from `package.json`.
- `access` - `workspace` (default, private) or `public`.
- `display_name` - optional label in site listings.

Static sites usually go live inside the call (`status: "live"`). A framework build returns `status: "building"` plus a `site_id`; poll `get_site_deploy` until it reports live or `failed` (with a build-log tail you can fix and redeploy).

For a private site the returned `url` carries a time-limited access token. Hand the user that `url`, not a bare address.

## Frameworks

| framework        | what it does                                                                            |
| ---------------- | --------------------------------------------------------------------------------------- |
| `static`         | ships the folder exactly as-is                                                          |
| `vite` / `astro` | runs `npm install` + `npm run build`, ships `dist/`                                     |
| `next`           | static export only - `output: "export"` in `next.config`, ships `out/`                  |
| `worker`         | **server-side**: runs your code on every request (SSR pages, API routes, form handlers) |

### Server-side sites (`worker`)

Available only where server-side sites are enabled for the organization; a request without that entitlement fails with "Server-side sites are not enabled for this organization".

The build must emit a Cloudflare `_worker.js` into its output dir - either a single ES module file, or a `_worker.js/` directory whose entry is `index.js`. The Cloudflare adapters emit exactly this shape:

- `@astrojs/cloudflare`
- `@sveltejs/adapter-cloudflare`
- `@cloudflare/vite-plugin`

Detection picks any of them up from `package.json`. A plain Hono or fetch-handler project works too - just have the build write `_worker.js`.

Static files in the same output dir are served first; every request that doesn't match one reaches your worker.

**What a worker site does not have:**

- no database and no file storage - keep state in the page, or call an external API
- no WebSocket support
- `env.ASSETS` exists **only** when the build also produced static files; a pure-SSR bundle has no assets binding

If `deploy_site` returns a `degraded` note, the build produced no `_worker.js` and the site went live as plain static files. Tell the user that - do not claim the server-side routes work.

## Environment variables and secrets

Not a worker-only feature. Every site that gets built can carry configuration, and each variable has a **scope** that decides where it is delivered:

| scope     | delivered as                      | works on                                    |
| --------- | --------------------------------- | ------------------------------------------- |
| `build`   | exported into the build shell     | `vite`, `astro`, `next`, `worker`           |
| `runtime` | `env.NAME` in the request handler | `worker` only - a static site has no server |
| `both`    | each of the above                 | the default                                 |

`build` scope is how a `VITE_`/`NEXT_PUBLIC_`/`PUBLIC_` value reaches a bundler, so it is the scope most sites actually need. Both scopes apply at **build** time, so changing a variable requires a redeploy.

**The user sets these, not you.** Values are write-only everywhere - no tool, command, page or API returns one. `list_site_env` shows the names, kinds and scopes on a site so you can see what is missing; the user sets a value in the site's panel or with `arg sites env set <slug> <NAME>`.

A `VITE_`/`NEXT_PUBLIC_`/`PUBLIC_` name cannot be marked secret, because the bundler inlines its value into the JavaScript every visitor downloads.

**How to use it when building a site:**

1. Code that needs a value reads it - `import.meta.env.VITE_API_URL`, or `env.API_KEY` in worker code. Never hardcode a value and never invent one.
2. Deploy.
3. Tell the user the exact names to set and the exact command.
4. Redeploy once they have.

Never write a secret the user pastes into chat into a file or a tool argument - anything written down persists in the chat history. Never create a `.env` file inside a site's source folder either: a `static` site ships that folder as-is, hidden files included, so the file would be published and served to anyone holding the link.

## From the arg CLI (local folder → live site)

When you are on a machine with the `arg` CLI instead of the workspace tools, `arg sites deploy [dir]` is the whole flow in one command: it uploads the LOCAL folder into the workspace (honoring `.gitignore` plus standard ignores; `.env`/`.env.*` never leave the machine), creates or reuses the site by slug, builds with promote-on-success, and prints the openable URL. `arg sites list` and `arg sites status <slug>` cover listing and version history. `arg sites delete <slug>` takes a site offline and frees its subdomain (preview first with `--dry-run` - not reversible). Flags mirror the tool params: `--slug`, `--framework`, `--public`, `--name`, `--source-path`. Works headlessly with `ARG_API_KEY`. Full detail lives in `arg-cli`; the tool-based flow below is unchanged and remains the right path from inside a workspace chat.

## Manage

- `list_sites` - the workspace's sites and their live URLs.
- `list_site_env` - the names, kinds and scopes of a site's environment variables. Never a value; there is no tool that sets one.
- `promote_site_version` - repoint the live URL at a specific build. Promoting an older version **is** the rollback. Very old versions have their artifacts reclaimed and can no longer be promoted; rebuild instead.
- `set_site_access` - toggle `workspace` (private) and `public`. Public requires the organization to have enabled public sites.
- `get_site_share_link` - mint a fresh private link when an earlier one expires.
- `delete_site` - take the site offline and free the subdomain.

## Rules

- Build the files first, then deploy. Don't describe the steps - do them.
- Always give the user the final URL when you're done.
- Redeploying with the same slug applies any changed `source_path`, `framework`, `access`, or `display_name` before it builds.
- A site's slug is a globally unique subdomain: a slug taken by another workspace is a conflict, not a silent rename.
