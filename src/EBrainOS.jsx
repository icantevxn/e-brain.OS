import { useState, useMemo } from "react";
import { useSyncedState } from "./useSyncedState.js";
import Login from "@/components/Login";
import { uid, today } from "@/lib/format";
import seed from "@/data/seed.json";
import Masthead from "@/components/Masthead";
import StatusBar from "@/components/StatusBar";
import MapView from "@/components/MapView";
import WorldView from "@/components/WorldView";
import WorldDialog from "@/components/WorldDialog";
import ItemDialog from "@/components/ItemDialog";

/* ═══════════════════════════════════════════════
   e-brain.OS — personal taste tracking system

   Orchestrator only: state, persistence and the handlers that mutate it.
   Everything visual lives in @/components. The archive lives on the server via
   useSyncedState; localStorage is a cache behind it, owned by storage.js.
═══════════════════════════════════════════════ */

/**
 * What a browser with no saved archive starts from. This is a real export
 * (src/data/seed.json), so refreshing it is a drop-in: hit export in the
 * masthead and replace the file wholesale — the envelope shape matches.
 *
 * Only used when storage is empty; an existing archive is never overwritten.
 */
const SEED_WORLDS = seed.worlds;

export default function EBrainOS() {
  const { worlds, setWorlds, saveStatus, auth, signIn } = useSyncedState(SEED_WORLDS);
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [worldModal, setWorldModal] = useState(null);
  const [itemModal, setItemModal] = useState(null);

  const active = useMemo(
    () => worlds.find((w) => w.id === activeId) || null,
    [worlds, activeId]
  );

  const enterWorld = (id) => {
    setActiveId(id);
    setFilter("all");
  };
  const exitWorld = () => setActiveId(null);

  const saveWorld = (data) => {
    if (worldModal.mode === "new")
      setWorlds([...worlds, { id: uid(), items: [], ...data }]);
    else
      setWorlds(
        worlds.map((w) => (w.id === worldModal.world.id ? { ...w, ...data } : w))
      );
    setWorldModal(null);
  };

  const deleteWorld = (id) => {
    setWorlds(worlds.filter((w) => w.id !== id));
    setWorldModal(null);
    if (activeId === id) setActiveId(null);
  };

  /**
   * `moveTo` is the target world. It differs from the current one only when the
   * dialog's world selector was changed — which is how captures get triaged out
   * of the Inbox.
   */
  const saveItem = ({ moveTo, ...data }) => {
    const targetId = moveTo || activeId;

    setWorlds((prev) => {
      if (itemModal.mode === "new") {
        return prev.map((w) =>
          w.id === targetId
            ? { ...w, items: [{ id: uid(), added: today(), ...data }, ...w.items] }
            : w
        );
      }

      const updated = { ...itemModal.item, ...data };

      // A move is a delete and an insert; doing both in one pass keeps the
      // item from ever existing in two worlds or none.
      if (targetId !== activeId) {
        return prev.map((w) => {
          if (w.id === activeId)
            return { ...w, items: w.items.filter((i) => i.id !== updated.id) };
          if (w.id === targetId) return { ...w, items: [updated, ...w.items] };
          return w;
        });
      }

      return prev.map((w) =>
        w.id === activeId
          ? { ...w, items: w.items.map((i) => (i.id === updated.id ? updated : i)) }
          : w
      );
    });

    setItemModal(null);
  };

  const deleteItem = (itemId) => {
    setWorlds(
      worlds.map((w) =>
        w.id === activeId
          ? { ...w, items: w.items.filter((it) => it.id !== itemId) }
          : w
      )
    );
    setItemModal(null);
  };

  // Every hook above runs unconditionally; these gates sit below them so the
  // hook order never changes between renders.
  if (auth === "checking") {
    // Blank rather than a spinner: the check is a single fast request, and a
    // flash of loading UI is worse than a beat of empty ground.
    return <div className="h-full bg-background" />;
  }

  if (auth === "unauthenticated") {
    return (
      <div className="relative h-full overflow-hidden bg-background fos-grain">
        <Login onSubmit={signIn} />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background fos-grain">
      <Masthead
        worlds={worlds}
        active={active}
        onBack={exitWorld}
        onImport={setWorlds}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        {active ? (
          <WorldView
            key={active.id}
            world={active}
            filter={filter}
            setFilter={setFilter}
            onEditWorld={() => setWorldModal({ mode: "edit", world: active })}
            onNewItem={() => setItemModal({ mode: "new" })}
            onEditItem={(item) => setItemModal({ mode: "edit", item })}
          />
        ) : (
          <MapView
            worlds={worlds}
            onEnter={enterWorld}
            onNewWorld={() => setWorldModal({ mode: "new" })}
          />
        )}
      </main>

      <StatusBar worlds={worlds} active={active} saveStatus={saveStatus} />

      {worldModal && (
        <WorldDialog
          key={worldModal.world?.id ?? "new"}
          modal={worldModal}
          onSave={saveWorld}
          onDelete={deleteWorld}
          onClose={() => setWorldModal(null)}
        />
      )}
      {itemModal && (
        <ItemDialog
          key={itemModal.item?.id ?? "new"}
          modal={itemModal}
          world={active}
          worlds={worlds}
          onSave={saveItem}
          onDelete={deleteItem}
          onClose={() => setItemModal(null)}
        />
      )}
    </div>
  );
}
