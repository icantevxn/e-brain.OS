import { readArchive, writeArchive, initArchive } from "./db.js";

/* ═══════════════════════════════════════════════
   inbox.js — where a capture lands when nobody is watching.

   A bookmarklet click or a share-sheet tap has no dialog to fill in, so the
   draft has to go somewhere immediately. It goes to a dedicated Inbox world,
   to be triaged later from either device.
═══════════════════════════════════════════════ */

export const INBOX_ID = "inbox";
const INBOX_NAME = "Inbox";

const uid = () => Math.random().toString(36).slice(2, 10);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

/**
 * Append an item to the Inbox, creating it if absent.
 *
 * Retries on conflict rather than failing: a capture races whatever the app is
 * doing on another device, and losing a capture because a world was renamed at
 * the same moment would be a bad trade. Each attempt re-reads, so the retry
 * appends to the newest archive rather than resurrecting an old one.
 */
export async function fileToInbox(fields, { attempts = 3 } = {}) {
  try {
    return await attemptFile(fields, attempts);
  } catch (err) {
    // Storage being unreachable must not take the request down with it. The
    // caller still has a parsed draft to return, and the bookmarklet needs a
    // JSON reply to show a message rather than failing silently.
    console.error("[e-brain.os] filing to Inbox failed", err?.message || err);
    return { ok: false, reason: "storage" };
  }
}

async function attemptFile(fields, attempts) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const archive = await readArchive();

    const item = { id: uid(), added: today(), ...fields };

    if (!archive) {
      // Nothing stored yet — unusual (the app seeds on first login) but valid.
      const created = await initArchive([
        { id: INBOX_ID, name: INBOX_NAME, type: "fashion", items: [item] },
      ]);
      if (created) return { ok: true, item };
      continue; // someone created it first; re-read and append instead
    }

    const worlds = archive.worlds.slice();
    const idx = worlds.findIndex((w) => w.id === INBOX_ID);

    if (idx === -1) {
      worlds.unshift({ id: INBOX_ID, name: INBOX_NAME, type: "fashion", items: [item] });
    } else {
      worlds[idx] = { ...worlds[idx], items: [item, ...worlds[idx].items] };
    }

    const result = await writeArchive(worlds, archive.version);
    if (result.ok) return { ok: true, item };
    // Conflict: the loop re-reads and tries again against the newer archive.
  }

  return { ok: false, reason: "busy" };
}
