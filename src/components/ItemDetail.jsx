import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmt, hexId } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * The large panel for whichever object the wheel has selected. This is the
 * editorial centrepiece — image first, name at display scale, everything
 * factual demoted to mono.
 */
export default function ItemDetail({ item, type, onEdit }) {
  const [broken, setBroken] = useState(false);

  // A new item may carry a different image; clear any prior load failure.
  useEffect(() => setBroken(false), [item?.id, item?.image]);

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Select a {type.itemNoun}
        </p>
      </div>
    );
  }

  const st = statusOf(item);
  const statusText = type.status[item.status] || type.status.wishlist;
  const showImage = item.image && !broken;

  return (
    <article key={item.id} className="flex h-full flex-col gap-5 overflow-y-auto p-5 sm:p-8 fos-rise">
      {/* Capped rather than purely aspect-driven: at full width a 3:2 image
          pushes the name below the fold, which buries the headline the whole
          layout is built around. */}
      <div className="relative aspect-[4/5] max-h-[46vh] w-full shrink-0 overflow-hidden border bg-card sm:aspect-[3/2]">
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
          <h3 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            {item.name}
          </h3>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {(item.brand || "Unknown").toUpperCase()} · {hexId(item.id, 6)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em]"
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-px border bg-border sm:grid-cols-3">
        {type.showPrice && <Stat label="Value" value={item.price ? fmt(item.price) : "—"} />}
        <Stat label="Status" value={statusText} className={st.text} />
        <Stat label="Added" value={item.added || "—"} />
      </dl>

      {item.notes && (
        <p className="max-w-prose border-l-2 pl-4 text-sm leading-relaxed text-muted-foreground">
          {item.notes}
        </p>
      )}
    </article>
  );
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
