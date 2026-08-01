import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveStatus, World } from "@/types";
import { load, serialize, writeRaw, STORAGE_KEY } from "./storage.js";
import { mergeWorlds } from "./lib/archive";
import {
  AuthError,
  ConflictError,
  OfflineError,
  checkAuth,
  fetchArchive,
  pushArchive,
  signIn as remoteSignIn,
  signOut as remoteSignOut,
} from "./lib/remote";

/* ═══════════════════════════════════════════════
   useSyncedState — the archive, shared across devices.

   The server is the source of truth; localStorage is a cache. That split buys
   three things: the first paint is instant, the app keeps working offline, and
   storage.js keeps earning its place.

   Two reconciliation rules, and the difference matters:

   - **On load, the server wins outright.** The cache may be an old snapshot;
     merging it would resurrect worlds deleted on another device.
   - **On a write conflict, merge.** Both sides hold real edits there, so
     neither can simply win.

   Reading needs no session — the archive is public. Only writing is gated, and
   the real gate is on the server; `role` here decides what to *show*, not what
   is *allowed*.
═══════════════════════════════════════════════ */

const DEBOUNCE_MS = 500;
const POLL_MS = 60_000;

export type Role = "checking" | "admin" | "visitor";

interface SyncedState {
  worlds: World[];
  setWorlds: React.Dispatch<React.SetStateAction<World[]>>;
  saveStatus: SaveStatus;
  role: Role;
  canEdit: boolean;
  signIn: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useSyncedState(initial: World[]): SyncedState {
  const [worlds, setWorlds] = useState<World[]>(() => load(STORAGE_KEY, initial));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [role, setRole] = useState<Role>("checking");

  const versionRef = useRef(0);
  const syncedRaw = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const cache = useCallback((value: World[]) => {
    const raw = serialize(value);
    if (raw !== null) writeRaw(STORAGE_KEY, raw);
    return raw;
  }, []);

  const adoptServer = useCallback(
    (archive: { version: number; worlds: World[] }) => {
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
      // Fetched first and independently: a visitor with no session still gets
      // the archive, so the app is never gated behind a login it doesn't need.
      try {
        const archive = await fetchArchive();
        if (cancelled || !mountedRef.current) return;
        if (archive.worlds !== null) {
          adoptServer({ version: archive.version, worlds: archive.worlds });
        }
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        setSaveStatus(err instanceof OfflineError ? "offline" : "write");
      }

      try {
        const authed = await checkAuth();
        if (cancelled || !mountedRef.current) return;
        setRole(authed ? "admin" : "visitor");
      } catch {
        // Can't tell — assume visitor. Guessing admin would show controls that
        // every write then bounces off, which reads as the app being broken.
        if (!cancelled && mountedRef.current) setRole("visitor");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adoptServer]);

  /* ── push local changes ──────────────────────────────────────── */
  useEffect(() => {
    if (role !== "admin") return;

    const raw = serialize(worlds);
    if (raw === null) {
      setSaveStatus("serialize");
      return;
    }
    if (raw === syncedRaw.current && !dirtyRef.current) return;

    dirtyRef.current = true;
    setSaveStatus("pending");
    cache(worlds);

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
          const merged = mergeWorlds(worlds, err.current.worlds);
          versionRef.current = err.current.version;
          syncedRaw.current = null;
          setSaveStatus("conflict");
          setWorlds(merged);
          return;
        }

        if (err instanceof AuthError) {
          // The session expired mid-session. Drop to visitor so the UI stops
          // offering edits that will bounce.
          setRole("visitor");
          return;
        }

        setSaveStatus(err instanceof OfflineError ? "offline" : "write");
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [worlds, role, cache]);

  /* ── background refresh: focus + slow poll ───────────────────── */
  useEffect(() => {
    if (role === "checking") return;

    const refresh = async () => {
      if (dirtyRef.current || document.hidden) return;
      try {
        const archive = await fetchArchive();
        if (!mountedRef.current || dirtyRef.current) return;
        if (archive.worlds !== null && archive.version !== versionRef.current) {
          adoptServer({ version: archive.version, worlds: archive.worlds });
        }
      } catch {
        /* best-effort — the push path reports real errors */
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
  }, [role, adoptServer]);

  const signIn = useCallback(async (password: string) => {
    await remoteSignIn(password);
    setRole("admin");
  }, []);

  const signOut = useCallback(async () => {
    await remoteSignOut();
    setRole("visitor");
  }, []);

  return {
    worlds,
    setWorlds,
    saveStatus,
    role,
    canEdit: role === "admin",
    signIn,
    signOut,
  };
}
