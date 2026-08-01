import type { Item, StatusKey } from "@/types";

/* The three states an item can be in. Keys are the persisted values —
   changing them would break stored data.

   Colour only. The *labels* live in @/lib/universes because they read
   differently per universe ("Owned" for fashion, "Seen" for film, "Cooked" for
   food); ask `typeOf(world).status[key]` for the words, never this module. */

interface StatusStyle {
  text: string;
  bg: string;
  border: string;
}

export const STATUS: Record<StatusKey, StatusStyle> = {
  owned: { text: "text-owned", bg: "bg-owned", border: "border-owned" },
  wishlist: { text: "text-wishlist", bg: "bg-wishlist", border: "border-wishlist" },
  hunting: { text: "text-hunting", bg: "bg-hunting", border: "border-hunting" },
};

export const STATUS_KEYS = Object.keys(STATUS) as StatusKey[];

export const statusOf = (item: Item | null | undefined): StatusStyle =>
  STATUS[item?.status as StatusKey] || STATUS.wishlist;
