import { useState, useEffect } from "react";
import { fmt } from "@/lib/format";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Compact card for grid mode — for scanning a large registry at a glance. */
export default function ObjectCard({ item, type, onEdit }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [item?.id, item?.image]);

  const st = statusOf(item);
  const showImage = item.image && !broken;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="group block w-full border bg-card text-left transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square overflow-hidden">
        {showImage ? (
          <img
            src={item.image}
            alt={item.name}
            onError={() => setBroken(true)}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden
            className="size-full bg-[radial-gradient(circle_at_35%_28%,rgba(244,241,234,0.12),transparent_62%)]"
          />
        )}
        <span
          aria-hidden
          className={cn("absolute right-3 top-3 size-1.5 rounded-full", st.bg)}
          title={type.status[item.status] || type.status.wishlist}
        />
      </div>

      <div className="p-3">
        <p className="truncate font-display text-lg leading-tight">{item.name}</p>
        <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {(item.brand || "Unknown").toUpperCase()}
        </p>
        {type.showPrice && (
          <p className="mt-2 font-mono text-[11px] text-hunting">
            {item.price ? fmt(item.price) : "—"}
          </p>
        )}
      </div>
    </button>
  );
}
