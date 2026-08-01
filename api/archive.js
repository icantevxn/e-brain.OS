import { readArchive, writeArchive, initArchive } from "./_lib/db.js";
import { hasValidSession } from "./_lib/auth.js";

/* ═══════════════════════════════════════════════
   /api/archive — the whole archive, read and replaced as one document.

   GET  → { version, worlds }
          version 0 with worlds null means nothing has ever been saved. The
          client then uploads what it has, which covers both a first-run seed
          and migrating an existing localStorage archive with one code path.

   PUT  → { version, worlds }
          Optimistic concurrency: `version` is what the client last read.
          A stale version returns 409 with the current archive attached, so the
          client can merge and retry without an extra round trip.

   The capture bearer token is deliberately not accepted here — it can file an
   item, not read or replace everything.
═══════════════════════════════════════════════ */

/** Reject anything that isn't recognisably an archive before it reaches storage. */
function isWorldsArray(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (w) =>
        w &&
        typeof w === "object" &&
        typeof w.id === "string" &&
        typeof w.name === "string" &&
        Array.isArray(w.items)
    )
  );
}

export default async function handler(req, res) {
  if (!hasValidSession(req)) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    if (req.method === "GET") {
      const archive = await readArchive();
      if (!archive) return res.status(200).json({ version: 0, worlds: null });
      return res.status(200).json(archive);
    }

    if (req.method === "PUT") {
      const { version, worlds } = req.body ?? {};

      if (!Number.isInteger(version) || version < 0) {
        return res.status(400).json({ error: "version must be a non-negative integer" });
      }
      if (!isWorldsArray(worlds)) {
        return res.status(400).json({ error: "worlds must be an array of worlds" });
      }

      // version 0 means "I believe nothing is stored yet" — a create, not an update.
      if (version === 0) {
        const created = await initArchive(worlds);
        if (created) return res.status(200).json({ version: created.version });

        // Lost the race; someone else created it first. Same shape as a stale write.
        return res.status(409).json({
          error: "conflict",
          current: await readArchive(),
        });
      }

      const result = await writeArchive(worlds, version);
      if (result.ok) return res.status(200).json({ version: result.version });

      return res.status(409).json({ error: "conflict", current: result.current });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[e-brain.os] /api/archive failed", err);
    return res.status(500).json({ error: "Storage unavailable" });
  }
}
