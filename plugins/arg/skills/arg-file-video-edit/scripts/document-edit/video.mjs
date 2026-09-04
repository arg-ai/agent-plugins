// Generated from sdk/typescript/src/documents/video.ts. Do not edit directly.
import {
  DocumentEditError,
  applyJsonEdits,
  assertJsonArray,
  assertJsonObject,
  cloneJson,
  isJsonObject,
  parseJsonDocument,
  setJsonProperty,
  stringifyJsonDocument,
} from "./common.mjs";
const SRC_REQUIRED_CLIP_TYPES = new Set(["video", "audio", "image", "gif", "cast"]);
/** Slack for float error when a clip abuts or dissolves into its predecessor; well under one frame at any frame rate. */
const OVERLAP_TOLERANCE_SECONDS = 1e-6;
let generatedId = 0;
const id = (prefix) => `${prefix}_${Date.now().toString(36)}_${generatedId++}`;
const fail = (code, message) => {
  throw new DocumentEditError(code, message);
};
const finite = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    fail("invalid_timing", `${label} must be a nonnegative finite number`);
  }
  return value;
};
const atLeast = (value, minimum, label) => {
  const result = finite(value, label);
  if (result < minimum) {
    fail("invalid_timing", `${label} must be at least ${minimum}`);
  }
  return result;
};
const namedId = (value, label) => {
  if (typeof value !== "string" || value.length === 0) fail("invalid_id", `${label} needs an id`);
  return value;
};
const sortedClips = (clips) => clips.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
const sortedMarkers = (markers) =>
  markers.sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
function assertJsonTree(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) return value.forEach(assertJsonTree);
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(assertJsonTree);
    return;
  }
  fail("invalid_document", "Video project contains a non-lossless JSON value");
}
function expectedKind(type) {
  return type === "audio" ? "audio" : type === "zoom" ? "zoom" : "video";
}
function location(project, clipId) {
  for (let trackIndex = 0; trackIndex < project.tracks.length; trackIndex++) {
    const clipIndex = project.tracks[trackIndex].clips.findIndex((clip) => clip.id === clipId);
    if (clipIndex >= 0) return { trackIndex, clipIndex };
  }
  return fail("not_found", `Video clip not found: ${clipId}`);
}
function trackIndex(project, id) {
  const index = project.tracks.findIndex((track) => track.id === id);
  return index >= 0 ? index : fail("not_found", `Video track not found: ${id}`);
}
function markerIndex(project, id) {
  const index = project.markers.findIndex((marker) => marker.id === id);
  return index >= 0 ? index : fail("not_found", `Video marker not found: ${id}`);
}
function nextFree(clips, start, duration) {
  let candidate = start;
  for (const clip of clips) {
    if (candidate + duration <= clip.start) break;
    if (candidate < clip.start + clip.duration && candidate + duration > clip.start) {
      candidate = clip.start + clip.duration;
    }
  }
  return candidate;
}
function place(track, clip, placement) {
  if (placement === "next-free") clip.start = nextFree(track.clips, clip.start, clip.duration);
  track.clips.push(clip);
  sortedClips(track.clips);
}
function copy(project) {
  validateVideo(project);
  return cloneJson(project);
}
function finish(project) {
  validateVideo(project);
  return project;
}
export function createVideoProject(overrides = {}) {
  const project = {
    version: 1,
    name: "Untitled Video",
    settings: { width: 1920, height: 1080, fps: 30, sampleRate: 48000, background: "#000000" },
    tracks: [
      createVideoTrack({ id: "video-1", kind: "video", name: "V1" }),
      createVideoTrack({ id: "audio-1", kind: "audio", name: "A1" }),
    ],
    markers: [],
    ...cloneJson(overrides),
  };
  validateVideo(project);
  return project;
}
export function parseVideo(text) {
  const project = parseJsonDocument(text, "Video project");
  validateVideo(project);
  return project;
}
export function stringifyVideo(project) {
  validateVideo(project);
  return stringifyJsonDocument(project);
}
export function editVideo(project, edits) {
  return finish(applyJsonEdits(project, edits));
}
export function validateVideo(value) {
  if (value.version !== 1) fail("invalid_version", "Video project version must be 1");
  assertJsonObject(value.settings, "Video project settings");
  assertJsonArray(value.tracks, "Video project tracks");
  assertJsonArray(value.markers, "Video project markers");
  const trackIds = new Set();
  const clipIds = new Set();
  const markerIds = new Set();
  const unique = (ids, entry, label) => {
    const entryId = namedId(entry, label);
    if (ids.has(entryId)) fail("duplicate_id", `${label} id must be unique: ${entryId}`);
    ids.add(entryId);
    return entryId;
  };
  for (const rawTrack of value.tracks) {
    assertJsonObject(rawTrack, "Video track");
    unique(trackIds, rawTrack.id, "Video track");
    if (rawTrack.kind !== "video" && rawTrack.kind !== "audio" && rawTrack.kind !== "zoom") {
      fail("invalid_track_kind", `Unsupported video track kind: ${String(rawTrack.kind)}`);
    }
    assertJsonArray(rawTrack.clips, "Video track clips");
    let previousStart = -1;
    let occupiedUntil = 0;
    for (const rawClip of rawTrack.clips) {
      assertJsonObject(rawClip, "Video clip");
      unique(clipIds, rawClip.id, "Video clip");
      if (typeof rawClip.type !== "string" || rawClip.type.length === 0)
        fail("invalid_document", "Video clip needs a type");
      const clipType = rawClip.type;
      if (
        SRC_REQUIRED_CLIP_TYPES.has(clipType) &&
        (typeof rawClip.src !== "string" || rawClip.src.trim().length === 0)
      ) {
        fail("missing_source", `${clipType} clips require a source path`);
      }
      if (expectedKind(clipType) !== rawTrack.kind)
        fail(
          "incompatible_clip",
          `${clipType} clips require ${expectedKind(clipType) === "audio" ? "an" : "a"} ${expectedKind(clipType)} track`,
        );
      const start = finite(rawClip.start, "Video clip start");
      const duration = atLeast(rawClip.duration, 0.02, "Video clip duration");
      if (start < previousStart)
        fail("unsorted_timeline", `Video track ${String(rawTrack.id)} clips must be sorted`);
      const transitionIn = rawClip.transitionIn;
      const dissolveDuration =
        isJsonObject(transitionIn) && transitionIn.type === "cross-dissolve"
          ? finite(transitionIn.duration, "Cross-dissolve duration")
          : 0;
      // Authors overlap a dissolve by exactly its duration (`start = previous
      // end - duration`), and in binary floats `4 - 3.4` is `0.6000000000000001`,
      // so an exact comparison rejected the documented pattern for most values.
      if (occupiedUntil - start > dissolveDuration + OVERLAP_TOLERANCE_SECONDS)
        fail("overlap", `Video clip ${String(rawClip.id)} overlaps another clip`);
      previousStart = start;
      occupiedUntil = Math.max(occupiedUntil, start + duration);
      if (rawClip.sourceIn !== undefined) finite(rawClip.sourceIn, "Video clip sourceIn");
      if (rawClip.speed !== undefined) atLeast(rawClip.speed, 0.1, "Video clip speed");
      if (rawClip.keyframes !== undefined) {
        assertJsonArray(rawClip.keyframes, "Video clip keyframes");
        let keyTime = -1;
        const keyframeIds = new Set();
        for (const rawKeyframe of rawClip.keyframes) {
          assertJsonObject(rawKeyframe, "Video keyframe");
          const keyframeId = namedId(rawKeyframe.id, "Video keyframe");
          if (keyframeIds.has(keyframeId))
            fail("duplicate_id", `Video keyframe id must be unique within its clip: ${keyframeId}`);
          keyframeIds.add(keyframeId);
          if (
            typeof rawKeyframe.prop !== "string" ||
            typeof rawKeyframe.value !== "number" ||
            !Number.isFinite(rawKeyframe.value)
          )
            fail("invalid_keyframe", "Video keyframes need a prop and finite value");
          const time = finite(rawKeyframe.time, "Video keyframe time");
          if (time < keyTime) fail("unsorted_timeline", "Video keyframes must be sorted");
          keyTime = time;
        }
      }
    }
  }
  let markerTime = -1;
  for (const rawMarker of value.markers) {
    assertJsonObject(rawMarker, "Video marker");
    unique(markerIds, rawMarker.id, "Video marker");
    const time = finite(rawMarker.time, "Video marker time");
    if (time < markerTime) fail("unsorted_timeline", "Video markers must be sorted");
    markerTime = time;
  }
  if (value.transcripts !== undefined) assertJsonObject(value.transcripts, "Video transcripts");
  assertJsonTree(value);
}
export function createVideoTrack(input) {
  const track = {
    name: input.kind === "video" ? "Video" : input.kind === "audio" ? "Audio" : "Zoom",
    clips: [],
    ...cloneJson(input),
    id: typeof input.id === "string" ? input.id : id("track"),
  };
  validateTracks([track]);
  return track;
}
export function addVideoTrack(project, track, index) {
  return editVideo(project, [{ op: "insert", path: ["tracks"], value: track, index }]);
}
export function patchVideoTrack(project, id, patch) {
  return editVideo(project, [
    { op: "merge", path: ["tracks", trackIndex(project, id)], value: patch },
  ]);
}
export function removeVideoTrack(project, id) {
  return editVideo(project, [{ op: "delete", path: ["tracks", trackIndex(project, id)] }]);
}
export function moveVideoTrack(project, id, to) {
  return editVideo(project, [{ op: "move", path: ["tracks"], from: trackIndex(project, id), to }]);
}
export function createVideoClip(input) {
  const clip = {
    ...cloneJson(input),
    id: typeof input.id === "string" ? input.id : id("clip"),
  };
  validateTracks([{ id: "track", kind: expectedKind(clip.type), name: "Track", clips: [clip] }]);
  return clip;
}
export function addVideoClip(project, trackId, clip, options = {}) {
  const next = copy(project);
  place(next.tracks[trackIndex(next, trackId)], cloneJson(clip), options.placement ?? "reject");
  return finish(next);
}
export function patchVideoClip(project, clipId, patch, options = {}) {
  const next = copy(project);
  const where = location(next, clipId);
  const track = next.tracks[where.trackIndex];
  const clip = { ...track.clips[where.clipIndex], ...cloneJson(patch) };
  track.clips.splice(where.clipIndex, 1);
  place(track, clip, options.placement ?? "reject");
  return finish(next);
}
export function removeVideoClip(project, clipId) {
  const where = location(project, clipId);
  return editVideo(project, [
    { op: "delete", path: ["tracks", where.trackIndex, "clips", where.clipIndex] },
  ]);
}
export function moveVideoClip(project, clipId, targetTrackId, start, options = {}) {
  const next = copy(project);
  const where = location(next, clipId);
  const [clip] = next.tracks[where.trackIndex].clips.splice(where.clipIndex, 1);
  clip.start = finite(start, `Video clip ${clipId} start`);
  place(next.tracks[trackIndex(next, targetTrackId)], clip, options.placement ?? "reject");
  return finish(next);
}
export function splitVideoClip(project, clipId, time, rightId = id("clip")) {
  const next = copy(project);
  const where = location(next, clipId);
  const track = next.tracks[where.trackIndex];
  const clip = track.clips[where.clipIndex];
  finite(time, "Video split time");
  if (time <= clip.start || time >= clip.start + clip.duration)
    fail("invalid_timing", "Split time must be inside the clip");
  const leftDuration = time - clip.start;
  const left = { ...cloneJson(clip), duration: leftDuration, fadeOut: 0 };
  const right = {
    ...cloneJson(clip),
    id: rightId,
    start: time,
    duration: clip.duration - leftDuration,
    sourceIn: (clip.sourceIn ?? 0) + leftDuration * (clip.speed ?? 1),
    fadeIn: 0,
  };
  delete left.transitionOut;
  delete left.transition;
  delete right.transitionIn;
  track.clips.splice(where.clipIndex, 1, left, right);
  return finish(next);
}
export function addVideoMarker(project, marker) {
  return editVideo(project, [
    { op: "set", path: ["markers"], value: sortedMarkers([...project.markers, cloneJson(marker)]) },
  ]);
}
export function patchVideoMarker(project, markerId, patch) {
  const markers = cloneJson(project.markers);
  const index = markerIndex(project, markerId);
  markers[index] = { ...markers[index], ...cloneJson(patch) };
  return editVideo(project, [{ op: "set", path: ["markers"], value: sortedMarkers(markers) }]);
}
export function removeVideoMarker(project, markerId) {
  return editVideo(project, [{ op: "delete", path: ["markers", markerIndex(project, markerId)] }]);
}
export function upsertVideoKeyframe(project, clipId, keyframe) {
  const where = location(project, clipId);
  const keys = cloneJson(project.tracks[where.trackIndex].clips[where.clipIndex].keyframes ?? []);
  const index = keyframe.id
    ? keys.findIndex((entry) => entry.id === keyframe.id)
    : keys.findIndex((entry) => entry.prop === keyframe.prop && entry.time === keyframe.time);
  const value = {
    ...(index >= 0 ? keys[index] : {}),
    ...cloneJson(keyframe),
    id: keyframe.id ?? (index >= 0 ? keys[index].id : id("keyframe")),
  };
  if (index >= 0) keys[index] = value;
  else keys.push(value);
  keys.sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  return patchVideoClip(project, clipId, { keyframes: keys });
}
export function removeVideoKeyframe(project, clipId, keyframeId) {
  const where = location(project, clipId);
  const keys = cloneJson(project.tracks[where.trackIndex].clips[where.clipIndex].keyframes ?? []);
  const index = keys.findIndex((entry) => entry.id === keyframeId);
  if (index < 0) fail("not_found", `Video keyframe not found: ${keyframeId}`);
  keys.splice(index, 1);
  return patchVideoClip(project, clipId, { keyframes: keys });
}
export function setVideoTranscript(project, src, transcript) {
  return editVideo(project, [
    {
      op: "set",
      path: ["transcripts"],
      value: { ...(project.transcripts ?? {}), [src]: transcript },
    },
  ]);
}
export function removeVideoTranscript(project, src) {
  if (!project.transcripts || !Object.hasOwn(project.transcripts, src)) return copy(project);
  const transcripts = { ...project.transcripts };
  delete transcripts[src];
  return editVideo(project, [
    {
      op: Object.keys(transcripts).length ? "set" : "delete",
      path: ["transcripts"],
      ...(Object.keys(transcripts).length ? { value: transcripts } : {}),
    },
  ]);
}
const workspacePath = (value) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
function collectReference(references, track, clip, field, idField) {
  const filePath = clip[field];
  if (workspacePath(filePath))
    references.push({
      clipId: clip.id,
      trackId: track.id,
      field,
      filePath,
      fileId: typeof clip[idField] === "string" ? clip[idField] : null,
    });
}
export function collectVideoFileReferences(project) {
  validateVideo(project);
  const references = [];
  for (const track of project.tracks)
    for (const clip of track.clips) {
      collectReference(references, track, clip, "src", "srcFileId");
      collectReference(references, track, clip, "cursorTelemetrySrc", "cursorTelemetryFileId");
    }
  return references;
}
export function replaceVideoClipSource(project, clipId, src, options = {}) {
  const next = copy(project);
  const where = location(next, clipId);
  const clip = next.tracks[where.trackIndex].clips[where.clipIndex];
  const previous = clip.src;
  clip.src = src;
  delete clip.srcFileId;
  const stillUsed = next.tracks.some((track) =>
    track.clips.some((entry) => entry.id !== clipId && entry.src === previous),
  );
  const previousTranscript =
    previous && next.transcripts && Object.hasOwn(next.transcripts, previous)
      ? next.transcripts[previous]
      : undefined;
  if (
    options.rekeyTranscript !== false &&
    previous &&
    previous !== src &&
    !stillUsed &&
    previousTranscript !== undefined &&
    next.transcripts
  ) {
    if (!Object.hasOwn(next.transcripts, src)) {
      setJsonProperty(next.transcripts, src, previousTranscript);
    }
    delete next.transcripts[previous];
  }
  return finish(next);
}
function validateTracks(tracks) {
  validateVideo({ version: 1, name: "Validation", settings: {}, tracks, markers: [] });
}
