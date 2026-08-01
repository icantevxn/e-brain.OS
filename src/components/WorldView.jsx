import { useState } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { Plus, Pencil } from "lucide-react";
import ObjectCard from "@/components/ObjectCard";
import DeleteButton from "@/components/DeleteButton";
import MoveControl from "@/components/MoveControl";
import WorldDialog from "@/components/WorldDialog";
import ItemDialog from "@/components/ItemDialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useArchive } from "@/ArchiveContext";
import { fmt } from "@/lib/format";
import { STATUS_KEYS } from "@/lib/status";
import { typeOf } from "@/lib/universes";
import { findWorld, itemPath, worldPath, INBOX_WORLD_ID } from "@/lib/slug";
import { cn } from "@/lib/utils";

/**
 * One world: its objects, as a grid.
 *
 * The grid used to be the alternative to a curved option wheel. The wheel is
 * gone — it showed one name at a time, which stops scaling the moment a world
 * holds more than a handful of objects, and its drag surface swallowed page
 * scrolling. A grid shows everything at once and gets out of the way.
 */
export default function WorldView({ inbox = false }) {
  const { universe, worldId: routeWorldId } = useParams();
  // In Orbit has a fixed address of its own, so its id comes from the route
  // shape rather than a slug in the path.
  const worldId = inbox ? INBOX_WORLD_ID : routeWorldId;
  const navigate = useNavigate();
  const { worlds, canEdit, updateWorld, removeWorld, addItem, updateItem, removeItem } =
    useArchive();

  const [filter, setFilter] = useState("all");
  const [worldModal, setWorldModal] = useState(false);
  const [newItem, setNewItem] = useState(false);
  // The object being edited from the grid, so you don't have to open its page
  // just to fix a typo.
  const [editing, setEditing] = useState(null);

  const world = findWorld(worlds, worldId);

  // A deleted world, or a stale bookmark. Home beats a blank screen.
  if (!world) return <Navigate to="/" replace />;

  // Reached by id, a pre-rename slug, or under the universe it used to be in.
  // Normalise so the address bar matches what's on screen. In Orbit is already
  // at its canonical address, so it skips this.
  const canonical = worldPath(world);
  if (!inbox && `/${universe}/${worldId}` !== canonical)
    return <Navigate to={canonical} replace />;

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
        {/* In Orbit's universe is an implementation detail — it is pinned to
            `fashion` because every world needs one, and showing that badge
            would claim a categorisation these captures haven't been given. */}
        {!inbox && (
          <span
            className={cn(
              "mb-1 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em]",
              t.text,
              t.border
            )}
          >
            {t.label}
          </span>
        )}
        {inbox && (
          <span className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Waiting to be filed
          </span>
        )}

        {canEdit && (
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
        )}
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
          canEdit={canEdit}
          filtered={filter !== "all"}
          noun={t.itemNoun}
          plural={t.itemPlural}
          onAdd={() => setNewItem(true)}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
            {items.map((it) => (
              // The controls are siblings of the link, not children: a button
              // inside an anchor is invalid markup and swallows cmd-click.
              <div key={it.id} className="group/card relative">
                <Link
                  to={itemPath(world, it)}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ObjectCard item={it} type={t} />
                </Link>

                {/* Always present on touch, where there is no hover to reveal
                    them; fading in on pointer devices keeps the grid clean. */}
                {canEdit && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/card:opacity-100 sm:group-focus-within/card:opacity-100">
                  <button
                    type="button"
                    onClick={() => setEditing(it)}
                    aria-label={`Edit ${it.name}`}
                    title="Edit"
                    className="inline-flex items-center rounded-md border border-border/70 bg-background/70 px-2 py-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <MoveControl
                    compact
                    world={world}
                    worlds={worlds}
                    onMove={(target) => updateItem(world.id, it.id, { moveTo: target })}
                  />
                  <DeleteButton compact onDelete={() => removeItem(world.id, it.id)} />
                </div>
                )}
              </div>
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

      {editing && (
        <ItemDialog
          key={editing.id}
          modal={{ mode: "edit", item: editing }}
          world={world}
          worlds={worlds}
          onSave={(data) => {
            updateItem(world.id, editing.id, data);
            setEditing(null);
          }}
          onDelete={() => {
            removeItem(world.id, editing.id);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Empty({ canEdit, filtered, noun, plural, onAdd }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h3 className="font-display text-3xl sm:text-4xl">
        {filtered ? "Nothing in this state" : `No ${plural} yet`}
      </h3>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {filtered ? "Try another filter" : `Add the first ${noun} to begin tracking`}
      </p>
      {!filtered && canEdit && (
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
