import { useCallback, useEffect, useRef, useState } from "react";
import { load, serialize, writeRaw, STORAGE_KEY } from "./storage.js";
import { mergeWorlds } from "./lib/archive.js";
import {
  AuthError,
  ConflictError,
  OfflineError,
  checkAuth,
  fetchArchive,
  pushArchive,
  signIn as remoteSignIn,
} from "./lib/remote.js";

/* ═══════════════════════════════════════════════
   useSyncedState — the archive, shared across devices.

   The server is the source of truth; localStorage is demoted to a cache. That
   split buys three things: the first paint is instant (no spinner while the
   network answers), the app keeps working offline, and storage.js keeps earning
   its place instead of being deleted.

   Two reconciliation rules, and the difference matters:

   - **On load, the server wins outright.** The cache may be an old snapshot;
     merging it in would resurrect worlds deleted on another device.
   - **On a write conflict, merge.** Here both sides hold real edits — ours in
     memory, theirs on the server — so `mergeWorlds` (already used by archive
     import) is exactly right.

   Returns { worlds, setWorlds, saveStatus, auth, signIn }.
   saveStatus: idle | pending | saved | offline | conflict | write | serialize
   auth:       checking | authenticated | unauthenticated
═══════════════════════════════════════════════ */

const DEBOUNCE_MS = 500;
const POLL_MS = 60_000;

export function useSyncedState(initial) {
  const [worlds, setWorlds] = useState(() => load(STORAGE_KEY, initial));
  const [saveStatus, setSaveStatus] = useState("idle");
  const [auth, setAuth] = useState("checking");

  // Server version this client last saw. 0 = nothing stored yet.
  const versionRef = useRef(0);
  // Serialized form already known to be on the server; suppresses no-op writes.
  const syncedRaw = useRef(null);
  // True between a local edit and its successful push — gates background adoption.
  const dirtyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cache = useCallback((value) => {
    const raw = serialize(value);
    if (raw !== null) writeRaw(STORAGE_KEY, raw);
    return raw;
  }, []);

  /** Take the server's copy wholesale. Used on load and on background refresh. */
  const adoptServer = useCallback(
    (archive) => {
      versionRef.current = archive.version;
      syncedRaw.current = cache(archive.worlds);
      setWorlds(archive.worlds);
      dirtyRef.current = false;
      setSaveStatus("saved");
    },
    [cache]
  );

  /* ── initial load ────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const authed = await checkAuth();
        if (cancelled || !mountedRef.current) return;

        if (!authed) {
          setAuth("unauthenticated");
          return;
        }
        setAuth("authenticated");

        const archive = await fetchArchive();
        if (cancelled || !mountedRef.current) return;

        if (archive.worlds === null) {
          // Nothing stored yet. Upload whatever we have — this is both the
          // first-run seed and the migration of an existing localStorage archive.
          dirtyRef.current = true;
          setSaveStatus("pending");
          return;
        }

        adoptServer(archive);
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        if (err instanceof AuthError) setAuth("unauthenticated");
        else if (err instanceof OfflineError) {
          setAuth("authenticated"); // cached data is still usable
          setSaveStatus("offline");
        } else {
          console.error("[e-brain.os] initial sync failed", err);
          setSaveStatus("offline");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adoptServer]);

  /* ── push local changes ──────────────────────────────────────── */
  useEffect(() => {
    if (auth !== "authenticated") return;

    const raw = serialize(worlds);
    if (raw === null) {
      setSaveStatus("serialize");
      return;
    }
    if (raw === syncedRaw.current && !dirtyRef.current) return;

    dirtyRef.current = true;
    setSaveStatus("pending");
    cache(worlds); // cache immediately so a reload mid-flight doesn't lose the edit

    const id = setTimeout(async () => {
      try {
        const version = await pushArchive(versionRef.current, worlds);
        if (!mountedRef.current) return;
        versionRef.current = version;
        syncedRaw.current = raw;
        dirtyRef.current = false;
        setSaveStatus("saved");
      } catch (err) {
        if (!mountedRef.current) return;

        if (err instanceof ConflictError && err.current) {
          // Another device wrote between our read and our write. Both sides have
          // real edits, so merge rather than picking a winner.
          const merged = mergeWorlds(worlds, err.current.worlds);
          versionRef.current = err.current.version;
          syncedRaw.current = null; // force the merged result to be pushed
          setSaveStatus("conflict");
          setWorlds(merged); // re-runs this effect, which pushes the merge
          return;
        }

        if (err instanceof AuthError) {
          setAuth("unauthenticated");
          return;
        }

        setSaveStatus(err instanceof OfflineError ? "offline" : "write");
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [worlds, auth, cache]);

  /* ── background refresh: focus + slow poll ───────────────────── */
  useEffect(() => {
    if (auth !== "authenticated") return;

    const refresh = async () => {
      // Never clobber edits that haven't landed yet.
      if (dirtyRef.current || document.hidden) return;
      try {
        const archive = await fetchArchive();
        if (!mountedRef.current || dirtyRef.current) return;
        if (archive.worlds !== null && archive.version !== versionRef.current) {
          adoptServer(archive);
        }
      } catch {
        /* background refresh is best-effort — the push path reports real errors */
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const id = setInterval(refresh, POLL_MS);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(id);
    };
  }, [auth, adoptServer]);

  /* ── sign in ─────────────────────────────────────────────────── */
  const signIn = useCallback(
    async (password) => {
      await remoteSignIn(password);
      setAuth("authenticated");

      const archive = await fetchArchive();
      if (archive.worlds === null) {
        dirtyRef.current = true; // upload what we have
        setSaveStatus("pending");
      } else {
        adoptServer(archive);
      }
    },
    [adoptServer]
  );

  return { worlds, setWorlds, saveStatus, auth, signIn };
}
