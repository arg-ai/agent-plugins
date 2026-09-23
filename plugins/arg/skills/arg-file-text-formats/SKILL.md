---
name: arg-file-text-formats
version: "1.0.0"
description: Exact syntax for Arg's smaller hand-written file formats - calendars (.ics), GLSL shaders (.shadertoy), DJ mixer projects (.dj), playlists (.m3u), subtitles (.srt/.vtt), terminal recordings (.cast), RSS feeds (.rss) and contact cards (.vcf). Load before writing or editing one of these.
---

# Arg text formats

Each of these opens in a dedicated viewer or editor in Arg but is plain text (or JSON) on disk, so write it directly with your file-write tool. For every other format, see the `arg-files` skill.

## iCalendar Files (.ics)

The workspace includes a split-panel iCalendar editor: a Monaco source editor on the left and a calendar with day / week / month / year / agenda views on the right. Recurring events (RRULE) expand automatically. Click an event to see its details. Also handles `.ical`, `.icalendar`, `.ifb`, and legacy vCalendar (.vcs).

Write `.ics` files as plain text following RFC 5545. Each VEVENT needs at least UID, DTSTAMP, DTSTART, and SUMMARY. Use `Z` (UTC) timestamps when you don't have timezone data; use `VALUE=DATE` for all-day events. Example:

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//arg.ai//Calendar//EN
X-WR-CALNAME:Sample Calendar
BEGIN:VEVENT
UID:event-1@arg.ai
DTSTAMP:20260101T000000Z
DTSTART:20260115T100000Z
DTEND:20260115T110000Z
SUMMARY:Team sync
DESCRIPTION:Weekly product sync
LOCATION:Room 4
RRULE:FREQ=WEEKLY;BYDAY=MO
END:VEVENT
BEGIN:VEVENT
UID:holiday-1@arg.ai
DTSTAMP:20260101T000000Z
DTSTART;VALUE=DATE:20260704
DTEND;VALUE=DATE:20260705
SUMMARY:Independence Day
END:VEVENT
END:VCALENDAR
```

When scheduling many events, generate the file with the `icalendar` Python package in a shell instead of writing it by hand.

## .shadertoy (GLSL fragment shader)

A GLSL fragment shader rendered on a fullscreen WebGL2 quad (`#version 300 es`, `highp`), with a live preview beside the source. Use `.shadertoy` (preferred); `.glsl` and `.frag` open in the same editor. Write it as plain GLSL - no JSON wrapper.

Implement `mainImage` Shadertoy-style. The host prepends the uniform header and a `main()`, so never redeclare these (it fails to compile): `iResolution` (vec3: xy pixels, z device pixel ratio), `iTime`, `iTimeDelta`, `iFrame`, `iMouse` (vec4: xy pointer, zw last click, origin bottom-left), `iDate` (vec4: year, month 0..11, day, seconds), `iSampleRate`, `iChannelTime[4]`, `iChannelResolution[4]`, `iChannel0..3` (declared, no textures bound - sampling returns black). A file that defines its own `main()` and `out vec4 outColor` is used as-is.

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0.0, 2.0, 4.0)), 1.0);
}
```

The same shader can paint a `.design` layer (a shader fill) or run as a `shader` clip in a `.video` timeline - see `arg-file-design` and `arg-file-video-edit`.

## .dj (DJ Set / Mixer Project)

JSON for the two-deck DJ mixer (Web Audio decks with waveform, sync, pitch, 3-band EQ, filter, loops and an FX rack; Web MIDI controllers with a one-click Pioneer DDJ-FLX4 mapping and MIDI Learn). Write it as pretty-printed JSON:

```json
{
  "version": 1,
  "name": "Saturday warm-up",
  "setlist": [
    {
      "id": "track-1",
      "path": "/music/opener.mp3",
      "title": "Opener",
      "artist": "",
      "bpm": null,
      "duration": -1
    }
  ],
  "decks": {
    "a": { "trackId": null, "cuePoint": 0, "pitch": 0, "loop": null, "hotCues": {} },
    "b": { "trackId": null, "cuePoint": 0, "pitch": 0, "loop": null, "hotCues": {} }
  },
  "mixer": {
    "crossfader": 0,
    "masterGain": 0.85,
    "headphoneMix": 0,
    "headphoneGain": 0.7,
    "channelA": {
      "gain": 0.85,
      "trim": 0,
      "high": 0,
      "mid": 0,
      "low": 0,
      "filter": 0,
      "cue": false
    },
    "channelB": {
      "gain": 0.85,
      "trim": 0,
      "high": 0,
      "mid": 0,
      "low": 0,
      "filter": 0,
      "cue": false
    }
  },
  "fx": {
    "a": { "type": "off", "wet": 0, "param": 0.5, "beats": 1 },
    "b": { "type": "off", "wet": 0, "param": 0.5, "beats": 1 }
  },
  "midi": null
}
```

Rules: `setlist` paths are workspace-relative, start with `/`, and must name audio files (.mp3/.wav/.ogg/.flac/.m4a/.aac) already in the workspace - preserve an existing `fileId` on an entry, never invent one. Track ids are short and unique (`track-1`); `bpm` may be `null` (auto-detected) and `duration: -1` means unknown. Deck `trackId`s are `null` or a setlist id; leave both decks empty unless the user asks for a starting load. `crossfader` runs -1 (A) to +1 (B), EQ values are dB (-26..+12), `filter` is bipolar (-1 lowpass, +1 highpass). `fx.type` is `off`/`reverb`/`delay`/`filter`/`flanger`/`bitcrush` with `wet`/`param` 0..1 and `beats` the delay grid. Leave `midi` null - the editor offers the FLX4 mapping in-app.

## Media Playlists (.m3u, .m3u8)

Plain text: first line `#EXTM3U`, then per track `#EXTINF:<seconds or -1>,<title>` followed by a workspace-relative path to an audio or video file already in the workspace - `http(s)://` URLs are not supported. The player fills in real durations as tracks play and writes them back. Use `.m3u` / `.m3u8` when the user asks for a playlist, mixtape, queue, or "songs to listen to in order".

## Subtitles / Captions (.srt, .vtt)

Standard SubRip / WebVTT cue files, edited in a cue-list editor. `.srt`: numbered cues with `HH:MM:SS,mmm --> HH:MM:SS,mmm` (comma before milliseconds). `.vtt`: a `WEBVTT` header line, dot milliseconds, no index required. Keep cues chronological with non-overlapping times and each end after its start, keep text to 1-2 short lines paced at roughly 15-20 characters per second, and use `.srt` unless the user needs an HTML5 `<track>` file or names WebVTT.

## Terminal recordings (.cast)

asciicast recordings replayed in a real terminal emulator with a scrubbable timeline; read-only. Never author one by hand - a hand-written recording replays as fabricated terminal output. Users record with `asciinema rec demo.cast` or download from asciinema.org and upload it; a recording can also be a `cast` clip in a `.video` timeline. v2 (most common) is JSONL: a header line (`{"version":2,"width":80,"height":24}`) then `[time, code, data]` events with `time` in seconds since start (`o` output, `i` input, `r` resize, `m` marker); v3 uses per-event intervals and a nested `term` size; v1 is one object with a `stdout` array. To inspect one, read it as text - it is line-oriented JSON, so `head`/`jq` in a shell work. To convert a recording to a video or GIF, convert it in a shell.

## RSS Feeds (.rss)

UTF-8 RSS 2.0 XML edited as source: one `<rss version="2.0">` root, one `<channel>` with `title`, `link` and `description`, then `<item>` entries. Write it directly. Escape XML text and attribute values, keep each item's `guid` stable across regenerations, format `pubDate` as an RFC 822 date, add the iTunes namespace elements only for a podcast feed, and use another feed dialect only when the user asks for one.

## Contacts (.vcf)

vCard text (also `.vcard`): one or many `BEGIN:VCARD` / `END:VCARD` blocks back to back, shown as editable contact cards. Use `VERSION:3.0` unless the user asks for 4.0. `FN` is required, and include `N` (`Family;Given;;;`) so the editor can split first and last name; other supported fields are `ORG`, `TITLE`, `EMAIL;TYPE=work`, `TEL;TYPE=cell`, `URL`, `BDAY` (YYYY-MM-DD) and `NOTE`. Escape literal commas, semicolons and backslashes with a backslash and newlines as `\\n`.
