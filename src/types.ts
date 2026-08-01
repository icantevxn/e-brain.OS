/* ═══════════════════════════════════════════════
   types.ts — what an archive is made of.

   Shared by the client and the serverless functions. Types are erased at
   compile time, so `import type` across that boundary costs nothing at runtime
   and keeps one definition of the shape both sides read and write.
═══════════════════════════════════════════════ */

/** The seven fixed categories. `type` on a World, for historical reasons. */
export type UniverseKey =
  | "fashion"
  | "books"
  | "film"
  | "music"
  | "food"
  | "spaces"
  | "subculture";

/**
 * How far along an object is. The keys are persisted, so they never change —
 * only the words shown for them, which vary by universe ("Owned" in fashion,
 * "Seen" in film).
 */
export type StatusKey = "owned" | "wishlist" | "hunting";

export interface Item {
  id: string;
  name: string;
  /** Brand, author, director, cuisine, studio or scene, depending on universe. */
  brand?: string;
  /** Digits only, as a string — it comes from a form field and may be blank. */
  price?: string;
  status?: StatusKey;
  image?: string;
  notes?: string;
  /** YYYY-MM-DD. */
  added?: string;
}

export interface World {
  id: string;
  name: string;
  /** Absent on worlds saved before universes existed; treated as "fashion". */
  type?: UniverseKey;
  cover?: string;
  items: Item[];
}

/** The wire and file format: what export writes and import reads. */
export interface ArchiveEnvelope {
  v: number;
  exported?: string;
  worlds: World[];
}

/** What the server stores and returns. `worlds: null` means nothing saved yet. */
export interface StoredArchive {
  version: number;
  worlds: World[];
}

export type SaveStatus =
  | "idle"
  | "pending"
  | "saved"
  | "offline"
  | "conflict"
  | "quota"
  | "write"
  | "serialize";

export type AuthState = "checking" | "authenticated" | "unauthenticated";
