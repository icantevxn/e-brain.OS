import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { Pencil, ArrowLeft, ExternalLink } from "lucide-react";
import ItemDialog from "@/components/ItemDialog";
import DeleteButton from "@/components/DeleteButton";
import MoveControl from "@/components/MoveControl";
import { Button } from "@/components/ui/button";
import { useArchive } from "@/ArchiveContext";
import { fmt, hexId } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { typeOf } from "@/lib/universes";
import { findWorld, findItem, itemPath, worldPath, INBOX_WORLD_ID } from "@/lib/slug";
import { cn } from "@/lib/utils";

/** Captures made before `source` existed left the link in `notes`. */
const URL_RE = /https?:\/\/\S+/;

/**
 * One object, at its own address.
 *
 * This used to be a panel beside the option wheel, which meant it could only be
 * reached by scrolling a list and could not be linked to. As a route it can be
 * bookmarked, shared to yourself, and returned to with the back button.
 */
export default function ObjectView({ inbox = false }) {
  const { universe, worldId: routeWorldId, itemId } = useParams();
  const worldId = inbox ? INBOX_WORLD_ID : routeWorldId;
  const navigate = useNavigate();
  const { worlds, canEdit, updateItem, removeItem } = useArchive();

  const [editing, setEditing] = useState(false);
  const [broken, setBroken] = useState(false);

  const world = findWorld(worlds, worldId);
  const item = findItem(world, itemId);

  useEffect(() => setBroken(false), [item?.image]);

  if (!world) return <Navigate to="/" replace />;
  if (!item) return <Navigate to={worldPath(world)} replace />;

  // Reached by id, a pre-rename slug, or a stale universe — normalise.
  const canonical = itemPath(world, item);
  const arrivedAt = inbox ? `/in-orbit/${itemId}` : `/${universe}/${worldId}/${itemId}`;
  if (arrivedAt !== canonical) return <Navigate to={canonical} replace />;

  const t = typeOf(world);
  const st = statusOf(item);
  const statusText = t.status[item.status] || t.status.wishlist;
  const showImage = item.image && !broken;
  const sourceUrl = item.source?.trim() || item.notes?.match(URL_RE)?.[0];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <article className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10 fos-rise">
        <Link
          to={worldPath(world)}
          className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {world.name}
        </Link>

        <div className="relative mb-6 aspect-[4/5] max-h-[52vh] w-full overflow-hidden border bg-card sm:aspect-[3/2]">
          {showImage ? (
            <img
              src={item.image}
              alt={item.name}
              onError={() => setBroken(true)}
              className="size-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="size-full bg-[radial-gradient(circle_at_35%_28%,rgba(244,241,234,0.14),transparent_62%)]"
            />
          )}
          <span
            className={cn(
              "absolute left-4 top-4 border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] backdrop-blur-sm",
              st.text,
              st.border
            )}
          >
            {statusText}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              {item.name}
            </h1>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {(item.brand || "Unknown").toUpperCase()} · {hexId(item.id, 6)}
            </p>
          </div>
          {/* Delete used to live inside the edit dialog, two steps from here.
              It's a first-class action, so it sits beside Edit. */}
          {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="font-mono text-[10px] uppercase tracking-[0.15em]"
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <MoveControl
              world={world}
              worlds={worlds}
              onMove={(target) => {
                updateItem(world.id, item.id, { moveTo: target });
                const nextWorld = worlds.find((w) => w.id === target);
                // The object's address changes with its world — follow it.
                if (nextWorld) navigate(itemPath(nextWorld, item), { replace: true });
              }}
            />
            <DeleteButton
              onDelete={() => {
                removeItem(world.id, item.id);
                navigate(worldPath(world), { replace: true });
              }}
            />
          </div>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-px border bg-border sm:grid-cols-3">
          {t.showPrice && <Stat label="Value" value={item.price ? fmt(item.price) : "—"} />}
          <Stat label="Status" value={statusText} className={st.text} />
          <Stat label="Added" value={item.added || "—"} />
        </dl>

        {item.notes && (
          <p className="mt-6 max-w-prose border-l-2 pl-4 text-sm leading-relaxed break-words text-muted-foreground">
            {item.notes}
          </p>
        )}

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
            {hostOf(sourceUrl) || "Open source page"}
          </a>
        )}
      </article>

      {editing && (
        <ItemDialog
          modal={{ mode: "edit", item }}
          world={world}
          worlds={worlds}
          onSave={(data) => {
            const target = updateItem(world.id, item.id, data);
            setEditing(false);
            // Renaming or moving changes the address, so follow it there rather
            // than leaving the bar pointing at a slug that no longer resolves.
            const nextWorld = worlds.find((w) => w.id === target) || world;
            navigate(itemPath(nextWorld, { ...item, ...data }), { replace: true });
          }}
          onDelete={() => {
            removeItem(world.id, item.id);
            navigate(worldPath(world), { replace: true });
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

/** Show where a link goes, not just that it exists. */
function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function Stat({ label, value, className }) {
  return (
    <div className="bg-background px-4 py-3">
      <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("mt-1 font-mono text-sm", className)}>{value}</dd>
    </div>
  );
}
