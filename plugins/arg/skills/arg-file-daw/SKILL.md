---
name: arg-file-daw
version: "1.0.2"
description: Create, read, and update Arg's .daw multi-track audio sessions — a JSON DAW project with a transport, instrument/audio/MIDI tracks, MIDI clips (inline notes), instruments (multi-engine synth, 808/909/707 drum machines, and a sampler that pitches a workspace audio file), MIDI + audio effect chains, a mixer with sends/returns, a master bus, and VST3/AU plugin slots. Plays and bounces to WAV/MP3 in the browser; also renderable offline via `arg daw render` (wav/mp3/flac/aac/ogg/opus). Load when building or editing a .daw song, beat, MIDI part, podcast mix, film cue, or when mixing/mastering a multi-track session. For raw audio files (wav/mp3), see arg-files.
---

# DAW session (`.daw`)

A `.daw` file is a JSON multi-track music/audio production: a **transport** (tempo, time signature, loop), **tracks** (instrument, audio, MIDI, bus), the **clips** on each track, per-track **instruments** and **effect chains**, a **mixer** with sends, and a **master** bus. The editor renders it as a multi-track timeline with **Arrange / Mix / MIDI / Plugins** views. Arg plays it live in the browser (Web Audio) and bounces it to WAV/MP3 (More menu → Export audio).

This is the _session/arrangement_, not an audio file. Audio clips **reference** existing workspace media by `src` (a live link); MIDI clips store their notes inline. Raw audio assets (`.wav`/`.mp3`) have no dedicated skill — see `arg-files`.

## CRUD

- **Read before you edit** (`arg-files` rule). Parsing deep-clones defaults and clamps/drops invalid values, so a hand-authored file round-trips safely — but include the fields below or they fall back to defaults.
- **All timing is in beats** (floats), never seconds. The engine converts beats→seconds with `transport.bpm`. One bar in 4/4 = 4 beats.
- **Every node needs a unique `id`** — tracks, clips, notes, effect slots, MIDI devices. Reused ids cause selection/automation bugs.
- **Reference only workspace media that exists** for audio clips, by workspace-relative `src` (always starts with `/`). A bad `src` plays nothing. MIDI clips have `src: null`.

## Schema

### Top level — `DawProject`

- `version`: `1` (required).
- `name`: string.
- `transport`: `{ bpm, timeSignature, swing, snap, loop, metronome }` — `bpm` 20–300; `timeSignature` is `[numerator, denominator]` (e.g. `[4, 4]`); `swing` 0–0.75 and **audible** — it delays off-beat 16ths in playback + export (≈0.67 = triplet shuffle); `snap` in beats (e.g. `0.25` = 1/16); `loop` is `{ enabled, start, end }` (beats); `metronome` boolean.
- `tracks`: `DawTrack[]` — the arrangement.
- `returns`: `DawTrack[]` — aux/return tracks fed by sends (usually `kind: "return"`). Use `[]` if unused.
- `master`: `DawMaster` — `{ mixer, chain }` (the master bus + its effect chain).
- `midi`: recording config — `{ deviceName, inputId, outputId, recordQuantize, recordMode, countInBars, mappings }`. Safe default: `{ "deviceName": "", "inputId": null, "outputId": null, "recordQuantize": 0.25, "recordMode": "overdub", "countInBars": 0, "mappings": {} }`.

### Track — `DawTrack`

`{ id, kind, name, color, height, collapsed, mixer, instrument, midiChain, chain, routing, clips, automation }`

- `kind`: `"instrument"` | `"audio"` | `"midi"` | `"bus"` | `"return"` | `"master"`. Instrument/MIDI tracks host an `instrument` + MIDI clips; audio tracks host audio clips and have `instrument: null`.
- `color`: hex string. `height`: px (≈72). `collapsed`: boolean.
- `mixer` (`DawMixerState`): `{ volume (0–1.25), pan (-1..1), mute, solo, arm, monitor ("auto"|"in"|"off"), sends }`. `sends` is `{ A: 0..1, B: 0..1 }` — post-fader levels that **audibly feed the return tracks** (through their FX chains) in playback and export.
- `instrument`: a `DawInstrument` or `null` (see below).
- `midiChain`: `DawMidiDevice[]` — MIDI effects applied to the clip notes **before** the instrument.
- `chain`: `DawPluginSlot[]` — the audio effect chain (insert order).
- `routing`: `{ input, output }` (e.g. `{ "input": "all-midi", "output": "master" }`).
- `clips`: `DawClip[]`.
- `automation`: `DawAutomationPoint[]` — the track's **automation lane**, played back and baked into exports. Points are `{ id, target, time, value, curve }` at **absolute arrangement beats**: `target` ∈ `"volume"` | `"pan"` | `"sendA"` | `"sendB"`; `value` is 0..1 for volume/sends (volume `1` = fader top ≈ 1.25 gain) and -1..1 for pan; `curve` ∈ `"linear"` | `"hold"` | `"ease"` (shapes the segment leaving the point). A target with points overrides its mixer control; constant before the first and after the last point. Use `[]` if unused. (In the editor: the spline button / `A` on a track header opens the lane.)

### Clip — `DawClip`

`{ id, type, trackId, name, start, duration, offset, gain, fadeIn, fadeOut, stretch, warpMode, color, src, notes, automation }`

- `type`: `"midi"` | `"audio"` | `"automation"`.
- `start`, `duration`: in **beats**. `start` is the clip's position on the arrangement.
- `offset`: beats into the source (audio: trims the start; MIDI: usually 0).
- `gain`: linear (1 = unity). `fadeIn`/`fadeOut`: beats — real gain fades on audio clips (draggable corner handles in the editor), applied in playback and export.
- **`stretch`** (audio): time-stretch ratio = clip length ÷ source length (default `1` = no stretch; a clip spans `duration / stretch` source beats). **`warpMode`**: `"repitch"` (pitch follows speed, via playback rate) or a pitch-preserving granular mode `"beats"|"tones"|"texture"|"complex"|"grain"` (the modes differ in grain size). MIDI clips ignore both. In the UI, dragging a clip edge trims; ⌘/Ctrl-dragging an edge stretches.
- **The clip duration windows its notes** (Ableton-style): a MIDI note starting at/after `duration` (or before 0) is silent, and a note running past `duration` is cut at the clip end. So size the clip to contain its notes (or it'll trim them).
- **MIDI clip**: `src: null`, notes in `notes`.
- **Audio clip**: `src` = workspace path (`/drums/loop.wav`), `notes: []`.

### MIDI note — `DawMidiNote`

`{ id, pitch, start, duration, velocity, channel }`

- `pitch`: 0–127 (middle C / C3 = 60). `start`/`duration`: beats, **relative to the clip**. `velocity`: **0–1** (not 0–127). `channel`: 0–15.

### Instrument — `DawInstrument`

`{ type, name, preset, plugin, parameters }`

- `type`: `"synth"` | `"drum-rack"` | `"sampler"` | `"external-midi"` | `"plugin"`.
- **synth** — multi-engine synth. `parameters.engine` ∈ `"analog"` | `"fm"` | `"wavetable"` | `"supersaw"` | `"pluck"` picks the oscillator section. Shared by every engine: amp `attack, decay, sustain, release` (s / 0–1); filter `cutoff` (Hz), `resonance` (0–1), `filterType` (`"lowpass"|"highpass"|"bandpass"`), `filterPoles` (12 or 24 dB/oct — 24 = Moog ladder), `drive` (0–1 saturation), `keytrack` (0–1 cutoff-follows-pitch), `filterEnv` (0–1); `gain` (0–1.5); `noise` (0–1 white-noise layer); `vibratoRate` (Hz) + `vibratoDepth` (cents pitch LFO); and on analog/wavetable/pluck `unison` (1–7 detuned copies), `unisonDetune` (cents), `unisonSpread` (0–1 stereo). The waveform `"pulse"` (on `oscillator`/`osc2`) uses `pulseWidth` (0.05–0.95) for PWM. Engine-specific: **analog** `oscillator`+`osc2` (`"sawtooth"|"square"|"triangle"|"sine"|"pulse"`), `oscMix` (0–1), `detune` (cents), `osc2Octave` (-2..2), `sub` (0–1 sub-osc); **fm** `oscillator` (carrier wave), `fmRatio`, `fmAmount` (0–1); **supersaw** `voices` (1–9), `detune` (cents), `unisonSpread`; **wavetable** `wavetable` (`"harmonic"|"organ"|"vocal"|"bright"|"hollow"`); **pluck** `oscillator` + a high `filterEnv`. The editor ships ~30 factory presets recreating classic synths (Moog, Juno, Massive, Sylenth1, DX7, TB-303, …); `preset` is just a display name, so recreate a sound by setting the params above directly. E.g. a Moog bass: `{ engine:"analog", oscillator:"sawtooth", sub:0.5, filterPoles:24, drive:0.4, cutoff:480, resonance:0.32, filterEnv:0.5, keytrack:0.3, attack:0.005, decay:0.18, sustain:0.5, release:0.16 }`.
- **drum-rack** — classic drum machine. `parameters`: `{ kit, tone (0–1), decay (0–1) }` where `kit` is `"808"` | `"909"` | `"707"` | `"606"` | `"acoustic"`. Notes map to drum pieces by the **General MIDI drum map**: 36 kick, 38 snare, 39 clap, 42 closed hat, 46 open hat, 41/43/45 toms, 49 crash, 51 ride, 56 cowbell, 37 rim, 75 clave.
- **sampler** — plays a workspace audio file. `parameters`: `{ src, mode, rootNote, loop, reverse, slices, sliceCount, sliceThreshold, attack, decay, sustain, release, cutoff, resonance, gain }`. `src` is a **workspace audio path** (e.g. `"/samples/piano-c3.wav"`) — the engine decodes + caches it. **`mode`** ∈ `"keys"` | `"slice"`: in **keys** (default) the whole sample is pitched across the keyboard — `rootNote` (MIDI, default 60) plays it unpitched and other notes resample by semitones; `loop` (bool) sustains by looping while held, `reverse` (bool) plays it backwards. In **slice** mode the sample is cut into contiguous slices and each slice is mapped to a key from `rootNote` upward (a beat slicer, one-shot at original pitch; `loop`/`reverse` don't apply): **`slices`** is a comma-separated string of normalized cut points in (0,1) (e.g. `"0.25,0.5,0.75"` → 4 slices), and the device UI generates them by **grid** (`sliceCount` equal divisions) or **transient** detection (`sliceThreshold` 0–1 sensitivity) or by hand. `attack/decay/sustain/release` (amp ADSR, seconds + 0–1 sustain), `cutoff` (Hz low-pass), `resonance` (0–1), `gain` (0–1.5). A sample that isn't decoded yet is silent for that note (decode is kicked off), so the very first hit after loading may not sound.
- **external-midi / plugin** — send notes to hardware/external MIDI (`external-midi`) or host a VST3/AU instrument (`plugin`). These are metadata slots for desktop/native hosts and interchange; they don't sound in the browser preview, so pair them with a built-in `synth`/`sampler`/`drum-rack` if you want audible playback. `plugin` is `null` except for `type: "plugin"`. `preset` is a display name.

### MIDI device — `DawMidiDevice` (the track's `midiChain`)

`{ id, type, enabled, parameters }`. `type` ∈ `pitch`, `scale`, `chord`, `velocity`, `note-length`, `arpeggiator`, `random`, `note-echo`. Non-destructive: they transform the note stream before the instrument (live monitor + playback), the clip keeps raw notes.

### Audio effect — `DawPluginSlot` (the track/master `chain`)

`{ id, kind, type, name, manufacturer, identifier, preset, enabled, wet, parameters }`

- `kind`: `"builtin"` (the stock, browser-auditionable effects) or `"web-audio"`; for an external Plugin Slot use `"vst3"` / `"au"` / `"external"` (metadata only — stored for desktop/native hosts + interchange, no sound in the browser preview).
- `type` ∈ `eq3`, `eq8`, `filter`, `autopan`, `chorus`, `phaser`, `flanger`, `delay`, `reverb`, `distortion`, `overdrive`, `redux`, `compressor`, `limiter`, `gain`, `utility`, `plugin` (an external plugin slot).
- **External plugin slots**: a `vst3`/`au`/`external`/`plugin` slot carries a human-readable `name`, optional `manufacturer` + `identifier`, and a `parameters` map. Don't claim a binary plugin runs in the browser — store the slot for interchange and reach for a built-in effect for web-auditionable sound.
- `wet`: 0–1 (parallel effects mix dry/wet; series inserts use `1`).
- **Oscillating effects** (`filter`/Auto Filter, `autopan`, `chorus`, `phaser`, `flanger`) have an LFO: `rate` (Hz) and `sync` — `"off"` = free Hz, or a tempo division (`"1/1"`, `"1/2"`, `"1/4"`, `"1/8"`, `"1/16"`, `"1/4T"`, … ); Auto Filter/Pan also take `waveform` (`sine`/`triangle`/`square`/`sawtooth`).
- **Sidechain**: a `compressor` can duck to another track — `parameters.sidechain` = that track's `id`, `parameters.scAmount` 0–1 (depth).

## Minimal example

A 2-bar loop: a 909 drum track and a synth bass, looped.

```json
{
  "version": 1,
  "name": "Loop",
  "transport": {
    "bpm": 120,
    "timeSignature": [4, 4],
    "swing": 0,
    "snap": 0.25,
    "loop": { "enabled": true, "start": 0, "end": 8 },
    "metronome": false
  },
  "tracks": [
    {
      "id": "t_drums",
      "kind": "instrument",
      "name": "Drums",
      "color": "#dc2626",
      "height": 72,
      "collapsed": false,
      "mixer": {
        "volume": 0.9,
        "pan": 0,
        "mute": false,
        "solo": false,
        "arm": false,
        "monitor": "auto",
        "sends": { "A": 0, "B": 0 }
      },
      "instrument": {
        "type": "drum-rack",
        "name": "Drum Rack",
        "preset": "TR-909",
        "plugin": null,
        "parameters": { "kit": "909", "tone": 0.5, "decay": 0.4 }
      },
      "midiChain": [],
      "chain": [
        {
          "id": "fx_comp",
          "kind": "builtin",
          "type": "compressor",
          "name": "Compressor",
          "manufacturer": "Arg",
          "identifier": null,
          "preset": null,
          "enabled": true,
          "wet": 1,
          "parameters": {
            "threshold": -18,
            "ratio": 3,
            "attack": 0.01,
            "release": 0.18,
            "sidechain": "",
            "scAmount": 0.7
          }
        }
      ],
      "routing": { "input": "all-midi", "output": "master" },
      "clips": [
        {
          "id": "c_drums",
          "type": "midi",
          "trackId": "t_drums",
          "name": "Beat",
          "start": 0,
          "duration": 8,
          "offset": 0,
          "gain": 1,
          "fadeIn": 0,
          "fadeOut": 0,
          "color": "#dc2626",
          "src": null,
          "notes": [
            { "id": "n1", "pitch": 36, "start": 0, "duration": 0.5, "velocity": 0.9, "channel": 0 },
            {
              "id": "n2",
              "pitch": 42,
              "start": 0,
              "duration": 0.25,
              "velocity": 0.6,
              "channel": 0
            },
            {
              "id": "n3",
              "pitch": 38,
              "start": 1,
              "duration": 0.5,
              "velocity": 0.85,
              "channel": 0
            },
            {
              "id": "n4",
              "pitch": 42,
              "start": 1,
              "duration": 0.25,
              "velocity": 0.6,
              "channel": 0
            },
            { "id": "n5", "pitch": 36, "start": 2, "duration": 0.5, "velocity": 0.9, "channel": 0 },
            { "id": "n6", "pitch": 38, "start": 3, "duration": 0.5, "velocity": 0.85, "channel": 0 }
          ],
          "automation": []
        }
      ]
    },
    {
      "id": "t_bass",
      "kind": "instrument",
      "name": "Bass",
      "color": "#2563eb",
      "height": 72,
      "collapsed": false,
      "mixer": {
        "volume": 0.82,
        "pan": 0,
        "mute": false,
        "solo": false,
        "arm": false,
        "monitor": "auto",
        "sends": { "A": 0, "B": 0 }
      },
      "instrument": {
        "type": "synth",
        "name": "Analog Synth",
        "preset": "Init",
        "plugin": null,
        "parameters": {
          "oscillator": "sawtooth",
          "attack": 0.01,
          "decay": 0.12,
          "sustain": 0.7,
          "release": 0.25,
          "cutoff": 1200,
          "resonance": 0.2,
          "gain": 0.8
        }
      },
      "midiChain": [],
      "chain": [
        {
          "id": "fx_filter",
          "kind": "builtin",
          "type": "filter",
          "name": "Auto Filter",
          "manufacturer": "Arg",
          "identifier": null,
          "preset": null,
          "enabled": true,
          "wet": 1,
          "parameters": {
            "mode": "lowpass",
            "frequency": 1400,
            "resonance": 3,
            "waveform": "sine",
            "rate": 1,
            "sync": "1/4",
            "amount": 0.5
          }
        }
      ],
      "routing": { "input": "all-midi", "output": "master" },
      "clips": [
        {
          "id": "c_bass",
          "type": "midi",
          "trackId": "t_bass",
          "name": "Bassline",
          "start": 0,
          "duration": 8,
          "offset": 0,
          "gain": 1,
          "fadeIn": 0,
          "fadeOut": 0,
          "color": "#2563eb",
          "src": null,
          "notes": [
            {
              "id": "b1",
              "pitch": 36,
              "start": 0,
              "duration": 0.75,
              "velocity": 0.9,
              "channel": 0
            },
            {
              "id": "b2",
              "pitch": 36,
              "start": 1.5,
              "duration": 0.5,
              "velocity": 0.8,
              "channel": 0
            },
            { "id": "b3", "pitch": 43, "start": 4, "duration": 0.75, "velocity": 0.9, "channel": 0 }
          ],
          "automation": []
        }
      ],
      "automation": [
        { "id": "a1", "target": "volume", "time": 0, "value": 0.66, "curve": "linear" },
        { "id": "a2", "target": "volume", "time": 8, "value": 0.35, "curve": "linear" }
      ]
    }
  ],
  "returns": [],
  "master": {
    "mixer": {
      "volume": 0.9,
      "pan": 0,
      "mute": false,
      "solo": false,
      "arm": false,
      "monitor": "auto",
      "sends": {}
    },
    "chain": [
      {
        "id": "m_limiter",
        "kind": "builtin",
        "type": "limiter",
        "name": "Limiter",
        "manufacturer": "Arg",
        "identifier": null,
        "preset": null,
        "enabled": true,
        "wet": 1,
        "parameters": { "ceiling": -0.2 }
      }
    ]
  },
  "midi": {
    "deviceName": "",
    "inputId": null,
    "outputId": null,
    "recordQuantize": 0.25,
    "recordMode": "overdub",
    "countInBars": 0,
    "mappings": {}
  }
}
```

## Rendering a session to audio

Two routes, and picking the wrong one wastes a long run:

- **`render_daw` action (cloud)** — bounces to **WAV** with no local setup, but it runs inside a memory-bounded headless browser that must hand the whole file back in one piece. WAV is uncompressed (44.1 kHz stereo ≈ 10 MB/min), so it is capped at arrangements of about **2.5 minutes** including the release tail. Over that it fails fast rather than burning a render. The arrangement length is `max(transport.loop.end, last clip end)` in beats — note `loop.end` counts **even when the loop is disabled**, so a stray large `loop.end` can push a short song over the cap.
- **`arg daw render <path.daw>` (CLI)** — the escape hatch for anything longer, and the only route to mp3/flac/aac/ogg/opus or to sample-rate / channel / bit-depth / loudness changes. No length cap (see below).

Both drive the **same** `OfflineAudioContext` exporter, so the audio is identical either way.

## CLI render (`arg daw render`)

Bounce a `.daw` to a local audio file without opening the browser editor. Uses the same `OfflineAudioContext` exporter the More menu → Export audio uses, so the output is identical to what the editor produces.

```
arg daw render track.daw                          # → track.wav (44.1 kHz stereo)
arg daw render track.daw --format mp3 --bitrate 256k -o out.mp3
arg daw render track.daw --format flac --sample-rate 48000
```

Flags: `--format wav|mp3|flac|aac|ogg|opus` (default wav), `--sample-rate <hz>`, `--channels 1|2`, `--bitrate <e.g. 192k>`, `--bit-depth 16|24`, `--normalize` (EBU R128), `--tail <seconds>` (reverb/release tail, default 2). Run `arg daw render install` once to provision the headless browser + ffmpeg. Audio clips and sampler `src` files are fetched from the workspace automatically.

## Pitfalls (silent-failure traps)

- **Timing is beats, not seconds.** A note at `start: 1` is one beat in, not one second. Drum hits at quarter notes are at `start: 0, 1, 2, 3`.
- **Velocity is 0–1**, not 0–127. `127` clamps/sounds wrong; use `0.9`.
- **Clip duration windows notes** — notes past `duration` are cut and notes at/after it are dropped. Make `duration` cover the last note's end.
- **Drum sounds come from the GM note number, not the kit.** To get a kick, write `pitch: 36`; the `kit` only changes the _character_ (808 vs 909). A random pitch on a drum-rack plays the nearest mapped piece (or a generic perc blip).
- **Audio clips need a real workspace `src`** that starts with `/`; MIDI clips use `src: null`.
- **Sidechain** `parameters.sidechain` must be another track's `id` string (not its name).
- **Don't invent fields** — unknown keys are dropped on load. Stick to the schema above; copy a built-in effect's `parameters` shape from this skill rather than guessing.

## Tips

- Quantize to the grid: put note `start`/`duration` on multiples of `transport.snap` (e.g. `0.25` for 1/16) for tight rhythms.
- A musical bassline/chord uses MIDI pitches (C3 = 60, C2 = 48, C1 = 36). Build chords by stacking notes at the same `start` (or use a `chord` MIDI device).
- For a tempo-locked filter/auto-pan wobble, set the effect's `sync` to `"1/8"` or `"1/16"` instead of a free `rate`.
- For pumping sidechain, add a `compressor` to the bass/pad track and set its `sidechain` to the kick/drum track's `id`.
- **No source audio? Scaffold with MIDI.** If the user has no workspace audio files, build the session from instrument/MIDI tracks (drum-rack, synth, sampler) so it still auditions and bounces in the browser — don't leave audio tracks pointing at a `src` that doesn't exist.
- Always include a `master` chain (a `limiter` is a safe default) so exports don't clip; use `return` tracks for shared reverb/delay and feed them with per-track `mixer.sends`.
