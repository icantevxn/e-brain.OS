import { useMemo, useState, useEffect } from "react";
import { Plus, Pencil, LayoutGrid, ListTree } from "lucide-react";
import OptionWheel from "@/components/vendor/OptionWheel";
import ItemDetail from "@/components/ItemDetail";
import ObjectCard from "@/components/ObjectCard";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fmt } from "@/lib/format";
import { STATUS_KEYS } from "@/lib/status";
import { typeOf, capitalize } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Inside a world. The wheel drives the selection; the detail panel follows.
 * A grid toggle is there for scanning a large registry, where reading names
 * one at a time stops being useful.
 */
export default function WorldView({
  world,
  filter,
  setFilter,
  onEditWorld,
  onNewItem,
  onEditItem,
}) {
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState("wheel");

  const t = typeOf(world);
  const filters = useMemo(
    () => [
      { key: "all", label: "All" },
      ...STATUS_KEYS.map((k) => ({ key: k, label: t.status[k] })),
    ],
    [t]
  );

  const items = useMemo(
    () => (filter === "all" ? world.items : world.items.filter((i) => i.status === filter)),
    [world.items, filter]
  );

  // The filtered list can shrink under the current selection — after a delete
  // or a filter change — so clamp rather than letting the index dangle.
  useEffect(() => {
    setSelected((s) => (s >= items.length ? 0 : s));
  }, [items.length]);

  const ownedTotal = world.items
    .filter((i) => i.status === "owned")
    .reduce((s, i) => s + Number(i.price || 0), 0);
  const wantTotal = world.items
    .filter((i) => i.status !== "owned")
    .reduce((s, i) => s + Number(i.price || 0), 0);

  const labels = useMemo(() => items.map((i) => i.name), [items]);
  const current = items[selected] || null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* masthead for the world */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 px-5 pb-4 pt-5 sm:px-8">
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
            onClick={onEditWorld}
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            size="sm"
            onClick={onNewItem}
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
          >
            <Plus className="size-3.5" />
            Add {t.itemNoun}
          </Button>
        </div>
      </div>

      {/* readout + controls */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] sm:px-8">
        {/* Money only where it means something — a value readout on a film or
            subculture world is noise. */}
        {t.showPrice && (
          <>
            <span className="text-muted-foreground">
              Value <b className="ml-1 font-normal text-owned">{fmt(ownedTotal)}</b>
            </span>
            <span className="text-muted-foreground">
              Wanted <b className="ml-1 font-normal text-wishlist">{fmt(wantTotal)}</b>
            </span>
          </>
        )}
        <span className="text-muted-foreground">
          {capitalize(t.itemPlural)}{" "}
          <b className="ml-1 font-normal text-foreground">{world.items.length}</b>
        </span>

        <div className="ml-auto flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(v) => v && setFilter(v)}
            variant="outline"
            size="sm"
            aria-label="Filter objects by status"
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

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMode((m) => (m === "wheel" ? "grid" : "wheel"))}
            aria-label={mode === "wheel" ? "Switch to grid view" : "Switch to wheel view"}
            title={mode === "wheel" ? "Grid view" : "Wheel view"}
          >
            {mode === "wheel" ? (
              <LayoutGrid className="size-4" />
            ) : (
              <ListTree className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyRegistry filtered={filter !== "all"} noun={t.itemNoun} plural={t.itemPlural} onNewItem={onNewItem} />
      ) : mode === "grid" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
            {items.map((it) => (
              <ObjectCard key={it.id} item={it} type={t} onEdit={() => onEditItem(it)} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="h-52 shrink-0 border-b fos-nodrag lg:h-auto lg:w-[36%] lg:max-w-md lg:border-b-0 lg:border-r">
            <OptionWheel
              /* Uncontrolled internally, so remount it when the list identity
                 changes — otherwise the wheel keeps a stale position. */
              key={`${world.id}:${filter}:${items.length}`}
              items={labels}
              defaultSelected={Math.min(selected, Math.max(labels.length - 1, 0))}
              onChange={setSelected}
              textColor="var(--muted-foreground)"
              activeColor="var(--foreground)"
              fontSize={1.9}
              spacing={1.55}
              inset={28}
              side="left"
            />
          </div>
          <div className="min-h-0 flex-1">
            <ItemDetail item={current} type={t} onEdit={() => current && onEditItem(current)} />
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyRegistry({ filtered, noun, plural, onNewItem }) {
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
          onClick={onNewItem}
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
