import { Link, useMatch } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import ArchiveActions from "@/components/ArchiveActions";
import { useArchive } from "@/ArchiveContext";
import { findWorld, findItem, worldPath } from "@/lib/slug";

/**
 * One bar: where you are, and what you can do to the archive as a whole.
 *
 * The breadcrumb replaces the old back button. A back button only ever went one
 * place; a breadcrumb says where you are and lets you jump to any level, which
 * matters more now that an object sits two levels deep. The date went with it —
 * it was decoration, and this bar had three things competing for the same edge.
 */
export default function Masthead() {
  const { worlds } = useArchive();

  // useMatch rather than useParams: this sits outside <Routes>, so it has no
  // params of its own and has to ask the router what the URL looks like.
  const inWorld = useMatch("/w/:worldId");
  const inObject = useMatch("/w/:worldId/:itemId");
  const match = inObject || inWorld;

  const world = match ? findWorld(worlds, match.params.worldId) : null;
  const item = inObject ? findItem(world, inObject.params.itemId) : null;

  return (
    <header className="flex shrink-0 items-center gap-2 border-b px-5 py-3 sm:px-8">
      <Link
        to="/"
        className="shrink-0 font-display text-2xl leading-none tracking-tight underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-3xl"
      >
        e-brain<span className="text-muted-foreground">.OS</span>
      </Link>

      {world && (
        <>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <Crumb to={worldPath(world)} current={!item}>
            {world.name}
          </Crumb>
        </>
      )}

      {item && (
        <>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <Crumb current>{item.name}</Crumb>
        </>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
          {worlds.length} {worlds.length === 1 ? "world" : "worlds"} /{" "}
          {worlds.reduce((sum, w) => sum + w.items.length, 0)} obj
        </span>
        <ArchiveActions />
      </div>
    </header>
  );
}

/** The last crumb is where you already are, so it isn't a link. */
function Crumb({ to, current, children }) {
  const base =
    "truncate font-mono text-[10px] uppercase tracking-[0.18em] max-w-[8rem] sm:max-w-xs";

  if (current) return <span className={`${base} text-foreground`}>{children}</span>;

  return (
    <Link
      to={to}
      className={`${base} text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline`}
    >
      {children}
    </Link>
  );
}
