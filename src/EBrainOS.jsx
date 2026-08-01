import { useState, useMemo } from "react";
import { STORAGE_KEY } from "./storage.js";
import { usePersistentState } from "./usePersistentState.js";
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
   Everything visual lives in @/components. Persists to localStorage via
   usePersistentState; the stored schema is owned by storage.js.
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
  const [worlds, setWorlds, saveStatus] = usePersistentState(STORAGE_KEY, SEED_WORLDS);
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

  const saveItem = (data) => {
    setWorlds(
      worlds.map((w) => {
        if (w.id !== activeId) return w;
        if (itemModal.mode === "new")
          return { ...w, items: [{ id: uid(), added: today(), ...data }, ...w.items] };
        return {
          ...w,
          items: w.items.map((it) =>
            it.id === itemModal.item.id ? { ...it, ...data } : it
          ),
        };
      })
    );
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
          onSave={saveItem}
          onDelete={deleteItem}
          onClose={() => setItemModal(null)}
        />
      )}
    </div>
  );
}
