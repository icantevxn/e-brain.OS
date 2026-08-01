import { useState } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { Plus, Pencil } from "lucide-react";
import ObjectCard from "@/components/ObjectCard";
import WorldDialog from "@/components/WorldDialog";
import ItemDialog from "@/components/ItemDialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useArchive } from "@/ArchiveContext";
import { fmt } from "@/lib/format";
import { STATUS_KEYS } from "@/lib/status";
import { typeOf } from "@/lib/types";
import { findWorld, worldSlug, itemPath, worldPath } from "@/lib/slug";
import { cn } from "@/lib/utils";

/**
 * One world: its objects, as a grid.
 *
 * The grid used to be the alternative to a curved option wheel. The wheel is
 * gone — it showed one name at a time, which stops scaling the moment a world
 * holds more than a handful of objects, and its drag surface swallowed page
 * scrolling. A grid shows everything at once and gets out of the way.
 */
export default function WorldView() {
  const { worldId } = useParams();
  const navigate = useNavigate();
  const { worlds, updateWorld, removeWorld, addItem } = useArchive();

  const [filter, setFilter] = useState("all");
  const [worldModal, setWorldModal] = useState(false);
  const [newItem, setNewItem] = useState(false);

  const world = findWorld(worlds, worldId);

  // A deleted world, or a stale bookmark. Home beats a blank screen.
  if (!world) return <Navigate to="/" replace />;

  // Reached by id (an old link, or one saved before a rename) — send it to the
  // readable address so what's in the bar matches what's on screen.
  if (worldId !== worldSlug(world)) return <Navigate to={worldPath(world)} replace />;

  const t = typeOf(world);
  const filters = [
    { key: "all", label: "All" },
    ...STATUS_KEYS.map((k) => ({ key: k, label: t.status[k] })),
  ];

  const items =
    filter === "all" ? world.items : world.items.filter((i) => i.status === filter);

  const ownedTotal = world.items
    .filter((i) => i.status === "owned")
    .reduce((s, i) => s + Number(i.price || 0), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 px-5 pb-4 pt-6 sm:px-8">
        <h2 className="font-display text-4xl leading-none tracking-tight sm:text-6xl">
          {world.name}
        </h2>
        <span
          className={cn(
            "mb-1 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em]",
            t.text,
            t.border
          )}
        >
          {t.label}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWorldModal(true)}
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            onClick={() => setNewItem(true)}
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
          >
            <Plus className="size-3.5" />
            Add {t.itemNoun}
          </Button>
        </div>
      </div>

      {/* One row instead of two: with the view toggle gone, the counts and the
          filters fit together. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-y px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:px-8">
        <span>
          {world.items.length} {world.items.length === 1 ? t.itemNoun : t.itemPlural}
        </span>
        {t.showPrice && ownedTotal > 0 && (
          <span>
            Value <b className="ml-1 font-normal text-owned">{fmt(ownedTotal)}</b>
          </span>
        )}

        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v)}
          variant="outline"
          size="sm"
          aria-label="Filter by status"
          className="ml-auto"
        >
          {filters.map((f) => (
            <ToggleGroupItem
              key={f.key}
              value={f.key}
              className="px-2.5 font-mono text-[9px] uppercase tracking-[0.15em]"
            >
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {items.length === 0 ? (
        <Empty
          filtered={filter !== "all"}
          noun={t.itemNoun}
          plural={t.itemPlural}
          onAdd={() => setNewItem(true)}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
            {items.map((it) => (
              // A real link, not a click handler: objects have addresses now, so
              // cmd-click and long-press-to-open behave as expected.
              <Link
                key={it.id}
                to={itemPath(world, it)}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ObjectCard item={it} type={t} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {worldModal && (
        <WorldDialog
          modal={{ mode: "edit", world }}
          onSave={(data) => {
            updateWorld(world.id, data);
            setWorldModal(false);
          }}
          onDelete={() => {
            removeWorld(world.id);
            navigate("/", { replace: true });
          }}
          onClose={() => setWorldModal(false)}
        />
      )}

      {newItem && (
        <ItemDialog
          modal={{ mode: "new" }}
          world={world}
          worlds={worlds}
          onSave={({ moveTo, ...data }) => {
            addItem(moveTo || world.id, data);
            setNewItem(false);
          }}
          onClose={() => setNewItem(false)}
        />
      )}
    </div>
  );
}

function Empty({ filtered, noun, plural, onAdd }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h3 className="font-display text-3xl sm:text-4xl">
        {filtered ? "Nothing in this state" : `No ${plural} yet`}
      </h3>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {filtered ? "Try another filter" : `Add the first ${noun} to begin tracking`}
      </p>
      {!filtered && (
        <Button
          onClick={onAdd}
          variant="outline"
          size="sm"
          className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em]"
        >
          <Plus className="size-3.5" />
          Add {noun}
        </Button>
      )}
    </div>
  );
}
