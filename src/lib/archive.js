/* ═══════════════════════════════════════════════
   archive.js — moving an archive in and out of the browser.

   The data lives in localStorage, which is keyed to the origin and invisible
   to the repo. These helpers make it a file you can keep, commit, or carry to
   another machine.
═══════════════════════════════════════════════ */

const EXPORT_VERSION = 1;

/** Shape check. A file that isn't an archive should fail loudly, not half-load. */
function isWorld(w) {
  return (
    w &&
    typeof w === "object" &&
    typeof w.id === "string" &&
    typeof w.name === "string" &&
    Array.isArray(w.items)
  );
}

/**
 * Pull the worlds array out of whatever envelope a file arrived in — a bare
 * array (the earliest format), the stored `{v, worlds}` shape, or an export
 * from this module. Throws with a readable reason so the UI can show it.
 */
export function parseArchive(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Not valid JSON");
  }

  const worlds = Array.isArray(parsed) ? parsed : parsed?.worlds;
  if (!Array.isArray(worlds)) throw new Error("No worlds found in this file");
  if (!worlds.every(isWorld)) throw new Error("File does not look like an archive");

  return worlds;
}

/**
 * Merge incoming worlds into the current set, matching on id: a world that
 * already exists is replaced, anything new is appended.
 *
 * Merging rather than replacing means importing can never silently delete an
 * archive — restoring into an empty browser still yields the full set, and
 * importing into a populated one is additive.
 */
export function mergeWorlds(current, incoming) {
  const byId = new Map(current.map((w) => [w.id, w]));
  for (const w of incoming) byId.set(w.id, w);
  return [...byId.values()];
}

export function serializeArchive(worlds, dateStamp) {
  return JSON.stringify(
    { v: EXPORT_VERSION, exported: dateStamp, worlds },
    null,
    2
  );
}

/** Hand the user a .json file. Object URL is revoked so the blob can be freed. */
export function downloadArchive(worlds, dateStamp) {
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
