import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import DomeGallery from "@/components/vendor/DomeGallery";
import WorldDialog from "@/components/WorldDialog";
import { Button } from "@/components/ui/button";
import { useArchive } from "@/ArchiveContext";
import { worldTiles } from "@/lib/covers";
import { WORLD_TYPES, DEFAULT_TYPE } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The archive map: every world rendered onto a draggable dome.
 *
 * DomeGallery fills a fixed grid of tiles and cycles the image pool to do it,
 * so a world with few peers repeats across the dome. That repetition is the
 * component's nature, not a defect — it reads as a moodboard wall, and every
 * tile carries the id of the world it came from, so clicking any copy enters
 * that world.
 */
export default function MapView() {
  const navigate = useNavigate();
  const { worlds, createWorld } = useArchive();

  // Empty set means "everything". Multi-select, so you can hold film + music
  // side by side without going back through an "All" step each time.
  const [active, setActive] = useState(() => new Set());
  const [newWorld, setNewWorld] = useState(false);

  const onEnter = (id) => navigate(`/w/${id}`);
  const onNewWorld = () => setNewWorld(true);

  const counts = useMemo(() => {
    const tally = Object.fromEntries(Object.keys(WORLD_TYPES).map((k) => [k, 0]));
    for (const w of worlds) {
      const key = w.type || DEFAULT_TYPE;
      if (key in tally) tally[key] += 1;
    }
    return tally;
  }, [worlds]);

  const visible = useMemo(
    () =>
      active.size === 0
        ? worlds
        : worlds.filter((w) => active.has(w.type || DEFAULT_TYPE)),
    [worlds, active]
  );

  const tiles = useMemo(() => worldTiles(visible), [visible]);

  const toggle = (key) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Rendered from both branches below; a brand-new archive needs it as much as
  // a populated one.
  const dialog = newWorld && (
    <WorldDialog
      modal={{ mode: "new" }}
      onSave={(data) => {
        const world = createWorld(data);
        setNewWorld(false);
        // Straight into the new world — you made it to put something in it.
        navigate(`/w/${world.id}`);
      }}
      onClose={() => setNewWorld(false)}
    />
  );

  if (worlds.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <h2 className="font-display text-4xl leading-tight sm:text-6xl">
          The archive is empty
        </h2>
        <p className="max-w-sm font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          A world is a mood you collect into — a label, a director, a cuisine, a scene
        </p>
        <Button onClick={onNewWorld} className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em]">
          <Plus className="size-3.5" />
          Create first world
        </Button>
        {dialog}
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden fos-nodrag">
      {tiles.length > 0 && (
        <DomeGallery
          /* Remount when the visible set changes: the dome builds its tile
             grid once from the pool it was given. */
          key={[...active].sort().join(",") || "all"}
          images={tiles}
          onItemClick={(meta) => meta?.worldId && onEnter(meta.worldId)}
          segments={24}
          minRadius={520}
          fit={0.62}
          imageBorderRadius="2px"
          openedImageBorderRadius="2px"
          /* Translucent, not solid: this drives DomeGallery's edge vignette,
             and an opaque value crushes the outer tiles into the background. */
          overlayBlurColor="rgba(15,14,13,0.45)"
          grayscale={false}
        />
      )}

      {/* Filter bar. Floats over the dome rather than sitting in the layout, so
          nothing reflows and the sphere stays centred. The bar carries its own
          frosted backdrop instead of a page-wide scrim — legible chips without
          dimming the artwork behind them. Only the chips take pointer events,
          so you can still start a drag in the gaps around them. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex flex-wrap items-center gap-2 px-5 pt-4 sm:px-8">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-full border border-border/70 bg-background/60 p-1 backdrop-blur-md">
          <Chip
            active={active.size === 0}
            onClick={() => setActive(new Set())}
            count={worlds.length}
            activeClassName="bg-foreground text-background"
            idleClassName="text-muted-foreground hover:bg-accent"
          >
            All
          </Chip>

          {Object.entries(WORLD_TYPES).map(([key, t]) => (
            <Chip
              key={key}
              active={active.has(key)}
              disabled={counts[key] === 0}
              onClick={() => toggle(key)}
              count={counts[key]}
              activeClassName={cn(t.bg, "text-background")}
              idleClassName={cn(t.text, "hover:bg-accent")}
            >
              {t.label}
            </Chip>
          ))}
        </div>

        {active.size > 0 && (
          <button
            type="button"
            onClick={() => setActive(new Set())}
            className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3" />
            Clear
          </button>
        )}
      </div>

      {tiles.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Nothing in this selection
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActive(new Set())}
            className="font-mono text-[10px] uppercase tracking-[0.15em]"
          >
            Show everything
          </Button>
        </div>
      )}

      {/* Title block. Lighter scrim than before — enough to keep the display
          type legible over bright tiles, not enough to mute the dome. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] flex flex-col items-start gap-3 bg-gradient-to-t from-background via-background/45 to-transparent px-5 pb-6 pt-24 sm:px-8">
        <h2 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl fos-rise">
          The Archive
        </h2>
        <div className="flex w-full flex-wrap items-center gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Drag to orbit — select a world to enter
          </p>
          <Button
            onClick={onNewWorld}
            variant="outline"
            size="sm"
            className="pointer-events-auto ml-auto font-mono text-[10px] uppercase tracking-[0.15em]"
          >
            <Plus className="size-3.5" />
            New world
          </Button>
        </div>
      </div>

      {dialog}
    </div>
  );
}

/**
 * One filter toggle. Types you own nothing in stay visible but disabled —
 * they show the shape of the archive without pretending to be reachable.
 */
function Chip({ active, disabled, onClick, count, children, activeClassName, idleClassName }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled
          ? "cursor-not-allowed text-muted-foreground/60"
          : active
            ? activeClassName
            : idleClassName
      )}
    >
      {children}
      <span className={cn("tabular-nums", active ? "opacity-70" : "opacity-50")}>
        {count}
      </span>
    </button>
  );
}
