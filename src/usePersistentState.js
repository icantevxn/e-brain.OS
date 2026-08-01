import { useEffect, useRef, useState } from "react";
import { load, serialize, writeRaw, onExternalChange } from "./storage.js";

/**
 * useState, but backed by localStorage.
 *
 * - Reads synchronously on mount, so there is no empty first paint.
 * - Debounces writes, so typing in a modal doesn't hit storage per keystroke.
 * - Skips writes whose serialized form matches what is already stored, which
 *   also makes the mount pass a no-op.
 * - Adopts writes from other tabs of the same origin.
 *
 * Returns `[state, setState, saveStatus]`, where saveStatus is one of
 * "idle" | "pending" | "saved" | "quota" | "write" | "serialize".
 */
export function usePersistentState(key, initial, { debounceMs = 400 } = {}) {
  const [state, setState] = useState(() => load(key, initial));
  const [saveStatus, setSaveStatus] = useState("idle");

  // The last payload known to be in storage. Seeded during the first render so
  // the mount effect has something to compare against and stays a no-op.
  const lastRaw = useRef(undefined);
  if (lastRaw.current === undefined) lastRaw.current = serialize(state);

  useEffect(() => {
    const raw = serialize(state);
    if (raw === null) {
      setSaveStatus("serialize");
      return;
    }
    if (raw === lastRaw.current) return;

    setSaveStatus("pending");
    const id = setTimeout(() => {
      const res = writeRaw(key, raw);
      if (res.ok) {
        lastRaw.current = raw;
        setSaveStatus("saved");
      } else {
        console.error("[e-brain.os] save failed", res.error);
        setSaveStatus(res.reason);
      }
    }, debounceMs);

    return () => clearTimeout(id);
  }, [state, key, debounceMs]);

  useEffect(
    () =>
      onExternalChange(key, (next, raw) => {
        if (next == null) return;
        lastRaw.current = raw; // don't bounce another tab's write back at it
        setState(next);
      }),
    [key]
  );

  return [state, setState, saveStatus];
}
