import type { ArchiveEnvelope, World } from "@/types";

/* ═══════════════════════════════════════════════
   archive.ts — moving an archive in and out of the browser.

   The archive lives on the server now, so this is no longer how it travels
   between devices — it is the backup. One free-tier database holding the only
   copy is a good reason to be able to write it to a file.
═══════════════════════════════════════════════ */

const EXPORT_VERSION = 1;

/** Shape check. A file that isn't an archive should fail loudly, not half-load. */
function isWorld(w: unknown): w is World {
  if (!w || typeof w !== "object") return false;
  const c = w as Partial<World>;
  return (
    typeof c.id === "string" && typeof c.name === "string" && Array.isArray(c.items)
  );
}

/**
 * Pull the worlds array out of whatever envelope a file arrived in — a bare
 * array (the earliest format), the stored `{v, worlds}` shape, or an export
 * from this module. Throws with a readable reason so the UI can show it.
 */
export function parseArchive(text: string): World[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Not valid JSON");
  }

  const worlds = Array.isArray(parsed)
    ? parsed
    : (parsed as Partial<ArchiveEnvelope> | null)?.worlds;

  if (!Array.isArray(worlds)) throw new Error("No worlds found in this file");
  if (!worlds.every(isWorld)) throw new Error("File does not look like an archive");

  return worlds;
}

/**
 * Merge incoming worlds into the current set, matching on id: a world that
 * already exists is replaced, anything new is appended.
 *
 * Merging rather than replacing means importing can never silently delete an
 * archive, and it is also what reconciles a sync conflict — both sides hold
 * real edits there, so neither can simply win.
 */
export function mergeWorlds(current: World[], incoming: World[]): World[] {
  const byId = new Map(current.map((w) => [w.id, w]));
  for (const w of incoming) byId.set(w.id, w);
  return [...byId.values()];
}

export function serializeArchive(worlds: World[], dateStamp: string): string {
  return JSON.stringify({ v: EXPORT_VERSION, exported: dateStamp, worlds }, null, 2);
}

/** Hand the user a .json file. Object URL is revoked so the blob can be freed. */
export function downloadArchive(worlds: World[], dateStamp: string): void {
  const blob = new Blob([serializeArchive(worlds, dateStamp)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `e-brain-archive-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
