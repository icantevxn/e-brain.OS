/* The three states an item can be in. Keys are the persisted values —
   changing them would break stored data.

   Colour only. The *labels* live in @/lib/types because they read differently
   per world type ("Owned" for fashion, "Seen" for film, "Cooked" for food);
   ask `typeOf(world).status[key]` for the words, never this module. */

export const STATUS = {
  owned: { text: "text-owned", bg: "bg-owned", border: "border-owned" },
  wishlist: { text: "text-wishlist", bg: "bg-wishlist", border: "border-wishlist" },
  hunting: { text: "text-hunting", bg: "bg-hunting", border: "border-hunting" },
};

export const STATUS_KEYS = Object.keys(STATUS);

export const statusOf = (item) => STATUS[item?.status] || STATUS.wishlist;
