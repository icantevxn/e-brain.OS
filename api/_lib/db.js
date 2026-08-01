import { neon } from "@neondatabase/serverless";

/* ═══════════════════════════════════════════════
   db.js — the archive's home.

   One row, because the whole archive is a couple of kilobytes. The interesting
   part is not storage but concurrency: two devices editing the same archive
   must not silently overwrite each other. Every write is a compare-and-swap
   against a version the caller read earlier, so a stale write updates zero rows
   and is reported as a conflict rather than applied.
═══════════════════════════════════════════════ */

const ROW_ID = "singleton";

let sqlInstance = null;

/** Lazy so a missing DATABASE_URL surfaces as a handled 500, not a cold-start crash. */
function db() {
  if (!sqlInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  return sqlInstance;
}

let schemaReady = null;

/**
 * Create the table if it isn't there. Memoized per warm instance so we pay the
 * round trip once rather than on every request; `IF NOT EXISTS` keeps it safe
 * when several cold instances race.
 */
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db()`
      CREATE TABLE IF NOT EXISTS archive (
        id         TEXT PRIMARY KEY,
        version    INTEGER     NOT NULL DEFAULT 1,
        worlds     JSONB       NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((err) => {
      schemaReady = null; // let the next request retry rather than caching a failure
      throw err;
    });
  }
  return schemaReady;
}

/** The stored archive, or null when nothing has been saved yet. */
export async function readArchive() {
  await ensureSchema();
  const rows = await db()`
    SELECT version, worlds FROM archive WHERE id = ${ROW_ID}
  `;
  if (rows.length === 0) return null;
  return { version: rows[0].version, worlds: rows[0].worlds };
}

/**
 * Claim an empty archive. Returns the created row, or null if another request
 * got there first — `ON CONFLICT DO NOTHING` makes the race harmless, and the
 * caller re-reads to pick up whichever write won.
 */
export async function initArchive(worlds) {
  await ensureSchema();
  const rows = await db()`
    INSERT INTO archive (id, version, worlds)
    VALUES (${ROW_ID}, 1, ${JSON.stringify(worlds)})
    ON CONFLICT (id) DO NOTHING
    RETURNING version, worlds
  `;
  if (rows.length === 0) return null;
  return { version: rows[0].version, worlds: rows[0].worlds };
}

/**
 * Compare-and-swap. Succeeds only if the stored version still matches the one
 * the caller read; otherwise the archive moved underneath them and they need to
 * reconcile before retrying.
 *
 * Returns `{ ok: true, version }` or `{ ok: false, reason: "conflict", current }`.
 */
export async function writeArchive(worlds, expectedVersion) {
  await ensureSchema();
  const rows = await db()`
    UPDATE archive
       SET worlds = ${JSON.stringify(worlds)},
           version = version + 1,
           updated_at = now()
     WHERE id = ${ROW_ID} AND version = ${expectedVersion}
    RETURNING version
  `;

  if (rows.length === 1) return { ok: true, version: rows[0].version };

  // Zero rows means the version moved. Hand back what is actually stored so the
  // caller can merge against it without a second round trip.
  return { ok: false, reason: "conflict", current: await readArchive() };
}
