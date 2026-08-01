/* ═══════════════════════════════════════════════
   storage.js — browser persistence for e-brain.OS

   Replaces the sandbox-only `window.storage` API with real
   localStorage. localStorage is the right fit here: the payload is
   small JSON (images are stored as URLs, not blobs), it is synchronous
   so there is no boot flicker, and it survives reloads and restarts.

   Every access is guarded. Safari in private mode, and any browser
   with site data blocked, throws on `localStorage.setItem` — so we
   probe once and fall back to an in-memory shim. The app stays fully
   usable in that case; it just won't persist, and the UI says so.
═══════════════════════════════════════════════ */

export const STORAGE_KEY = "e-brain-universe";

/**
 * Keys this app used to write under, newest first. `load` falls through to
 * them so an archive saved before a rename still opens; the next save lands on
 * STORAGE_KEY and the old entry is left in place as a backup rather than
 * deleted. Never remove a key from this list — that orphans real data.
 */
const LEGACY_KEYS = ["fashion-universe"];

function createMemoryBackend() {
  const map = new Map();
  return {
    kind: "memory",
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, v),
  };
}

function resolveBackend() {
  try {
    const probe = "__fos_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return {
      kind: "local",
      getItem: (k) => window.localStorage.getItem(k),
      setItem: (k, v) => window.localStorage.setItem(k, v),
    };
  } catch {
    return createMemoryBackend();
  }
}

const backend = resolveBackend();

/** "local" when persistence is real, "memory" when it is session-only. */
export const storageKind = backend.kind;

/**
 * Read and parse the stored payload.
 * Returns `fallback` when nothing is stored or the stored value is corrupt —
 * a bad JSON blob should never brick the app.
 */
export function load(key, fallback) {
  const raw = readFirst([key, ...LEGACY_KEYS]);
  if (raw == null) return fallback;

  try {
    return migrate(JSON.parse(raw), fallback);
  } catch {
    console.warn(`[e-brain.os] stored value for "${key}" is unreadable; starting fresh`);
    return fallback;
  }
}

/** First key that holds anything, or null. A throwing backend ends the search. */
function readFirst(keys) {
  for (const k of keys) {
    let raw;
    try {
      raw = backend.getItem(k);
    } catch {
      return null;
    }
    if (raw != null) return raw;
  }
  return null;
}

/**
 * Serialize a worlds array into the stored envelope. Returns null if the value
 * can't be stringified (a cycle, say) — callers treat null as "do not write".
 * Kept separate from the write so callers can diff before touching storage.
 */
export function serialize(value) {
  try {
    return JSON.stringify({ v: SCHEMA_VERSION, worlds: value });
  } catch {
    return null;
  }
}

/**
 * Write an already-serialized payload. Never throws — returns a result the UI
 * can surface. The realistic failure is QuotaExceededError, which you can hit
 * by pasting `data:` URIs into the image field instead of hosted URLs.
 */
export function writeRaw(key, raw) {
  try {
    backend.setItem(key, raw);
  } catch (e) {
    const quota =
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return { ok: false, reason: quota ? "quota" : "write", error: e };
  }
  return { ok: true };
}

/**
 * Fire `cb` when another tab writes this key. The `storage` event only fires
 * in *other* tabs, so this never echoes a write back to its own origin tab.
 * Returns an unsubscribe function; no-op on the memory backend.
 */
export function onExternalChange(key, cb) {
  if (backend.kind !== "local") return () => {};

  const handler = (e) => {
    if (e.key !== key || e.newValue == null) return;
    try {
      cb(migrate(JSON.parse(e.newValue), null), e.newValue);
    } catch {
      /* another tab wrote something unparseable — ignore it */
    }
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/* ═══════ schema ═══════ */

const SCHEMA_VERSION = 1;

/**
 * Normalize whatever shape came out of storage into a worlds array.
 * v0 (the sandbox build) stored a bare array; v1 wraps it in `{v, worlds}`
 * so future migrations have a version to branch on.
 */
function migrate(parsed, fallback) {
  if (Array.isArray(parsed)) return parsed; // v0
  if (parsed && Array.isArray(parsed.worlds)) return parsed.worlds; // v1
  return fallback;
}
