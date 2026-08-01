/* ═══════════════════════════════════════════════
   types.js — what kind of thing a world collects.

   A world's type never changes what is stored on its items, only how those
   fields are labelled. The item still persists `brand` and the status still
   persists `owned` / `wishlist` / `hunting`; a film world simply renders
   `brand` as "Director" and `owned` as "Seen". That keeps every existing
   archive readable and means switching a world's type is non-destructive.

   The three statuses map to one shape across every type:
     owned    — you have it / have done it
     wishlist — you want to
     hunting  — you are actively seeking it out
═══════════════════════════════════════════════ */

export const WORLD_TYPES = {
  fashion: {
    label: "Fashion",
    hue: 20,
    creator: "Brand",
    creatorPlaceholder: "Prada",
    itemNoun: "object",
    itemPlural: "objects",
    namePlaceholder: "Nylon shoulder bag",
    showPrice: true,
    text: "text-fashion",
    bg: "bg-fashion",
    border: "border-fashion",
    status: { owned: "Owned", wishlist: "Wishlist", hunting: "Hunting" },
  },
  books: {
    label: "Books",
    hue: 85,
    creator: "Author",
    creatorPlaceholder: "Frank Herbert",
    itemNoun: "book",
    itemPlural: "books",
    namePlaceholder: "Dune",
    showPrice: true,
    text: "text-books",
    bg: "bg-books",
    border: "border-books",
    status: { owned: "Read", wishlist: "Reading list", hunting: "Hunting" },
  },
  film: {
    label: "Film",
    hue: 265,
    creator: "Director",
    creatorPlaceholder: "Wong Kar-wai",
    itemNoun: "film",
    itemPlural: "films",
    namePlaceholder: "In the Mood for Love",
    showPrice: false,
    text: "text-film",
    bg: "bg-film",
    border: "border-film",
    status: { owned: "Seen", wishlist: "Watchlist", hunting: "Hunting" },
  },
  music: {
    label: "Music",
    hue: 155,
    creator: "Artist",
    creatorPlaceholder: "Aphex Twin",
    itemNoun: "record",
    itemPlural: "records",
    namePlaceholder: "Selected Ambient Works",
    showPrice: true,
    text: "text-music",
    bg: "bg-music",
    border: "border-music",
    status: { owned: "Owned", wishlist: "Listen list", hunting: "Hunting" },
  },
  food: {
    label: "Food",
    hue: 55,
    creator: "Cuisine",
    creatorPlaceholder: "Sichuan",
    itemNoun: "dish",
    itemPlural: "dishes",
    namePlaceholder: "Mapo tofu",
    showPrice: false,
    text: "text-food",
    bg: "bg-food",
    border: "border-food",
    status: { owned: "Cooked", wishlist: "To cook", hunting: "Sourcing" },
  },
  spaces: {
    label: "Spaces",
    hue: 205,
    // Architecture and interior design share a category: the same eye reads
    // both, and splitting them would strand half of every project.
    creator: "Studio",
    creatorPlaceholder: "SANAA",
    itemNoun: "space",
    itemPlural: "spaces",
    namePlaceholder: "Casa Malaparte",
    showPrice: false,
    text: "text-spaces",
    bg: "bg-spaces",
    border: "border-spaces",
    status: { owned: "Visited", wishlist: "To visit", hunting: "Researching" },
  },
  subculture: {
    label: "Subculture",
    hue: 320,
    creator: "Scene",
    creatorPlaceholder: "Tokyo, 1998",
    itemNoun: "reference",
    itemPlural: "references",
    namePlaceholder: "Ura-Harajuku",
    showPrice: false,
    text: "text-subculture",
    bg: "bg-subculture",
    border: "border-subculture",
    status: { owned: "Explored", wishlist: "To explore", hunting: "Digging" },
  },
};

export const TYPE_KEYS = Object.keys(WORLD_TYPES);

/** Worlds written before types existed are fashion — that is where this started. */
export const DEFAULT_TYPE = "fashion";

export const typeOf = (world) =>
  WORLD_TYPES[world?.type] || WORLD_TYPES[DEFAULT_TYPE];

/** Display label for a stored status key, in the vocabulary of this type. */
export const statusLabel = (world, statusKey) =>
  typeOf(world).status[statusKey] || WORLD_TYPES[DEFAULT_TYPE].status[statusKey];

/** Title-case a noun for use at the start of a sentence or button. */
export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
