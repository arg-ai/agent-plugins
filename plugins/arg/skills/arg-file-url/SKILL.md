---
name: arg-file-url
description: Create, read, update, and delete URL shortcut files (.url, .webloc) in Arg — clickable bookmarks that open a single URL in a new tab. Also covers .lnk (Windows shell links). Load when saving a link as a file or making a bookmark shortcut.
---

# URL shortcut files (`.url`, `.webloc`)

Clickable bookmarks that open a single URL in a new browser tab. Two interchangeable text formats:

- **`.url`** — Windows internet shortcut, INI format. **Prefer this for new shortcuts** (portable; Windows opens it natively).
- **`.webloc`** — macOS web location, XML plist.

## CRUD

Both are plain text — use the standard MCP tools and shared rules in the `arg-core` skill (`write_file` to create, `read_file` to read, `edit_file`/`write_file` to update, `run_bash` `rm`/`mv` to delete/move).

- **Filename:** use a hostname-based stem with the chosen extension — e.g. `github.com.url`, or strip the TLD (`medium.com` → `medium.url`).

### `.url` format

INI with an `[InternetShortcut]` section and a `URL=` key. Use CRLF line endings:

```
[InternetShortcut]
URL=https://example.com
```

### `.webloc` format

XML plist with a single `URL` key. Escape XML entities in the URL (`&` → `&amp;`, etc.):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>URL</key>
	<string>https://example.com</string>
</dict>
</plist>
```

Reading either: the URL is the first `URL=` line (`.url`) or the `<string>` after `<key>URL</key>` (`.webloc`). Only `http(s)` / `ftp` / `mailto` URLs are recognized.

## `.lnk` (Windows shell links)

`.lnk` is a **binary** Windows shell-link format — Arg does **not** natively read or create it (it's not a supported editor type, and it can't be produced with `write_file`). When asked for a `.lnk` web shortcut, create a **`.url`** instead — Windows opens `.url` internet shortcuts natively and they're plain text, so they round-trip cleanly in Arg. (A true `.lnk` would have to be generated externally and uploaded as a binary via `upload_file`, but it won't open in an Arg editor.)

## Related (inside documents)

To reference a link *inside* a `.mdx` document rather than as a standalone file, use the document components instead (see `arg-file-document`): `<Bookmark url="…" />` for a rich link-preview card, or `<UrlEmbed url="…" />` for an inline iframe embed.
