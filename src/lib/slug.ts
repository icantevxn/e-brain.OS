import type { Item, World, UniverseKey } from "@/types";

/* ═══════════════════════════════════════════════
   slug.ts — readable URLs, without breaking the old ones.

   /fashion/archive-prada says more than /w/w1, but a slug is derived from a
   name and names change. So resolution tries the slug first and falls back to
   the id: a link bookmarked before a rename still lands in the right place, it
   just isn't the canonical address any more.

   Names are unique per level (enforced when saving), so slugs are too.
═══════════════════════════════════════════════ */

/**
 * Latin letters, digits and dashes. Anything else becomes a separator.
 *
 * Returns "" for a name with no latin characters at all — a world named in
 * Japanese, say — which is why every caller falls back to the id.
 */
export function slugify(name: string | undefined | null): string {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents: "Résumé" -> "Resume"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const worldSlug = (world: World | null | undefined): string =>
  slugify(world?.name) || world?.id || "";

export const itemSlug = (item: Item | null | undefined): string =>
  slugify(item?.name) || item?.id || "";

/**
 * A world's universe. Stored as `type` on the record — the field name predates
 * the vocabulary and renaming it would mean migrating every saved archive for
 * no behavioural gain.
 */
export const universeOf = (world: World | null | undefined): UniverseKey =>
  world?.type || "fashion";

/**
 * The staging world's id. It lives here rather than in lib/inbox so the path
 * helpers can special-case it without the two modules importing each other.
 * Mirrors INBOX_ID in api/_lib/inbox.ts.
 */
export const INBOX_WORLD_ID = "inbox";

export const universePath = (universe: UniverseKey | string): string => `/${universe}`;

/**
 * In Orbit gets a top-level address instead of living under a universe. It is
 * pinned to `fashion` only because every world needs a universe, and putting
 * that in its URL would imply a categorisation it explicitly doesn't have.
 */
export const worldPath = (world: World | null | undefined): string =>
  world?.id === INBOX_WORLD_ID
    ? "/in-orbit"
    : `/${universeOf(world)}/${worldSlug(world)}`;

export const itemPath = (world: World, item: Item): string =>
  `${worldPath(world)}/${itemSlug(item)}`;

/**
 * Slug first, then id — so pre-rename links keep working.
 *
 * The universe segment is deliberately not part of the match. A world can be
 * re-typed at any time, and a link written before that should still find it;
 * the caller redirects to the corrected path afterwards.
 */
export function findWorld(
  worlds: World[],
  param: string | undefined
): World | null {
  if (!param) return null;
  return (
    worlds.find((w) => worldSlug(w) === param) ||
    worlds.find((w) => w.id === param) ||
    null
  );
}

export function findItem(
  world: World | null | undefined,
  param: string | undefined
): Item | null {
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

const normalize = (s: string | undefined | null): string =>
  String(s || "").trim().toLowerCase();

/** True when `name` is already taken. `exceptId` lets a rename keep its own name. */
export function nameTaken(
  collection: Array<{ id: string; name: string }>,
  name: string,
  exceptId: string | null = null
): boolean {
  const target = normalize(name);
  if (!target) return false;
  return collection.some((x) => x.id !== exceptId && normalize(x.name) === target);
}
