/* ═══════════════════════════════════════════════
   slug.js — readable URLs, without breaking the old ones.

   /w/archive-prada says more than /w/w1, but a slug is derived from a name and
   names change. So resolution tries the slug first and falls back to the id:
   a link you bookmarked before a rename still lands in the right place, it just
   isn't the canonical address any more.

   Names are unique per level (enforced when saving), so slugs are too.
═══════════════════════════════════════════════ */

/**
 * Latin letters, digits and dashes. Anything else becomes a separator.
 *
 * Returns "" for a name with no latin characters at all — a world named in
 * Japanese, say — which is why every caller falls back to the id.
 */
export function slugify(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents: "Résumé" → "Resume"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const worldSlug = (world) => slugify(world?.name) || world?.id || "";
export const itemSlug = (item) => slugify(item?.name) || item?.id || "";

/**
 * A world's universe. Stored as `type` on the record — the field name predates
 * the vocabulary and renaming it would mean migrating every saved archive for
 * no behavioural gain.
 */
export const universeOf = (world) => world?.type || "fashion";

export const universePath = (universe) => `/${universe}`;
export const worldPath = (world) => `/${universeOf(world)}/${worldSlug(world)}`;
export const itemPath = (world, item) =>
  `/${universeOf(world)}/${worldSlug(world)}/${itemSlug(item)}`;

/**
 * Slug first, then id — so pre-rename links keep working.
 *
 * The universe segment is deliberately *not* part of the match. A world can be
 * re-typed at any time, and a link written before that should still find it;
 * the caller redirects to the corrected path afterwards.
 */
export function findWorld(worlds, param) {
  if (!param) return null;
  return (
    worlds.find((w) => worldSlug(w) === param) ||
    worlds.find((w) => w.id === param) ||
    null
  );
}

export function findItem(world, param) {
  if (!world || !param) return null;
  return (
    world.items.find((i) => itemSlug(i) === param) ||
    world.items.find((i) => i.id === param) ||
    null
  );
}

/* ═══════════════════════════════════════════════
   uniqueness

   Compared case- and whitespace-insensitively, because "Archive Prada" and
   "archive prada " are the same world to a person, and would collide as slugs
   anyway.
═══════════════════════════════════════════════ */

const normalize = (s) => String(s || "").trim().toLowerCase();

/** True when `name` is already taken. `exceptId` lets a rename keep its own name. */
export function nameTaken(collection, name, exceptId = null) {
  const target = normalize(name);
  if (!target) return false;
  return collection.some((x) => x.id !== exceptId && normalize(x.name) === target);
}
