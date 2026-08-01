import { universeOf, INBOX_WORLD_ID } from "./slug.js";

/* ═══════════════════════════════════════════════
   inbox.js — the staging world, from the client's side.
═══════════════════════════════════════════════ */

export { INBOX_WORLD_ID };

export const isInbox = (world) => world?.id === INBOX_WORLD_ID;

/** Everything except the staging world — what the dome and counts should show. */
export const realWorlds = (worlds) => worlds.filter((w) => w.id !== INBOX_WORLD_ID);

export const findInbox = (worlds) => worlds.find((w) => w.id === INBOX_WORLD_ID) || null;

/**
 * Where an object in `world` is allowed to go.
 *
 * Universes decide how an object is *read*: the same stored `brand` field is
 * labelled Brand in fashion and Director in film, and the status words differ
 * too. Moving across universes would silently relabel a piece rather than
 * relocate it, so it isn't offered.
 *
 * In Orbit is the exception, because it is the one world whose contents are by
 * definition uncategorised — a capture lands there before anyone has decided
 * what it is, and moving out of it is that decision. It is pinned to `fashion`
 * for want of a neutral universe, which would otherwise strand every film or
 * food capture in a fashion world for good.
 */
export function moveTargets(worlds, world) {
  if (!world) return [];

  const others = worlds.filter((w) => w.id !== world.id && w.id !== INBOX_WORLD_ID);
  if (isInbox(world)) return others;

  return others.filter((w) => universeOf(w) === universeOf(world));
}
