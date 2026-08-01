import { createContext, useContext, useMemo } from "react";
import { uid, today } from "@/lib/format";

/* ═══════════════════════════════════════════════
   ArchiveContext — the archive and the ways to change it.

   With routing, the pages that mutate the archive are no longer children of the
   component that owns it, so threading four handlers through every route got
   noisy. Everything that writes goes through here instead.

   Every mutation takes the world it applies to explicitly, because a route
   knows its own id from the URL and there is no longer an "active world" in
   state to imply it.
═══════════════════════════════════════════════ */

const ArchiveContext = createContext(null);

export function ArchiveProvider({
  worlds,
  setWorlds,
  saveStatus,
  canEdit = false,
  signIn,
  signOut,
  children,
}) {
  const value = useMemo(() => {
    const createWorld = (data) => {
      const world = { id: uid(), items: [], ...data };
      setWorlds((prev) => [...prev, world]);
      return world;
    };

    const updateWorld = (worldId, data) =>
      setWorlds((prev) => prev.map((w) => (w.id === worldId ? { ...w, ...data } : w)));

    const removeWorld = (worldId) =>
      setWorlds((prev) => prev.filter((w) => w.id !== worldId));

    const addItem = (worldId, data) => {
      const item = { id: uid(), added: today(), ...data };
      setWorlds((prev) =>
        prev.map((w) => (w.id === worldId ? { ...w, items: [item, ...w.items] } : w))
      );
      return item;
    };

    /**
     * `moveTo` differing from `worldId` is a move — a delete and an insert in
     * one pass, so the item never exists in two worlds or none.
     */
    const updateItem = (worldId, itemId, { moveTo, ...data }) => {
      const targetId = moveTo || worldId;

      setWorlds((prev) => {
        const existing = prev
          .find((w) => w.id === worldId)
          ?.items.find((i) => i.id === itemId);
        if (!existing) return prev;

        const updated = { ...existing, ...data };

        if (targetId === worldId) {
          return prev.map((w) =>
            w.id === worldId
              ? { ...w, items: w.items.map((i) => (i.id === itemId ? updated : i)) }
              : w
          );
        }

        return prev.map((w) => {
          if (w.id === worldId)
            return { ...w, items: w.items.filter((i) => i.id !== itemId) };
          if (w.id === targetId) return { ...w, items: [updated, ...w.items] };
          return w;
        });
      });

      return targetId;
    };

    const removeItem = (worldId, itemId) =>
      setWorlds((prev) =>
        prev.map((w) =>
          w.id === worldId ? { ...w, items: w.items.filter((i) => i.id !== itemId) } : w
        )
      );

    return {
      worlds,
      setWorlds,
      saveStatus,
      // What to *show*. The real gate is the session check on PUT /api/archive —
      // hiding a button has never stopped anyone calling the endpoint.
      canEdit,
      signIn,
      signOut,
      createWorld,
      updateWorld,
      removeWorld,
      addItem,
      updateItem,
      removeItem,
    };
  }, [worlds, setWorlds, saveStatus, canEdit, signIn, signOut]);

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchive() {
  const value = useContext(ArchiveContext);
  if (!value) throw new Error("useArchive must be used inside ArchiveProvider");
  return value;
}
