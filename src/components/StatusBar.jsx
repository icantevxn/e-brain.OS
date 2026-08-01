import { hexId } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Persistence readout. Reflects the real state of the write, so a blocked or
   full store is visible instead of failing silently. Carried over from the
   original build unchanged in behaviour — only the styling is new. */
const SAVE_READOUT = {
  idle: null,
  pending: { text: "Syncing", className: "text-muted-foreground" },
  saved: { text: "Synced", className: "text-owned" },
  // Not an error: edits are held in the local cache and pushed on reconnect.
  offline: { text: "Offline — changes held locally", className: "text-hunting" },
  // Another device wrote first; the two archives were merged.
  conflict: { text: "Merged changes from another device", className: "text-wishlist" },
  quota: { text: "Save failed — storage full", className: "text-destructive" },
  write: { text: "Save failed", className: "text-destructive" },
  serialize: { text: "Save failed", className: "text-destructive" },
};

export default function StatusBar({ worlds, active, saveStatus }) {
  // Blocked localStorage used to mean "nothing persists". It no longer does —
  // the server holds the archive and the cache is only a paint accelerator — so
  // the sync status is the honest thing to show.
  const readout = SAVE_READOUT[saveStatus];

  const index = active ? worlds.findIndex((w) => w.id === active.id) + 1 : 0;

  return (
    <footer className="flex shrink-0 items-center gap-3 border-t px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:px-8">
      <span>{active ? hexId(active.id, 4) : "ARCHIVE"}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="truncate">
        {active
          ? `World N.${String(index).padStart(2, "0")} — ${active.name}`
          : "Personal taste archive"}
      </span>
      {readout && (
        <>
          <span aria-hidden className="hidden h-px w-8 bg-border sm:block" />
          <span className={cn("shrink-0", readout.className)} role="status">
            {readout.text}
          </span>
        </>
      )}
    </footer>
  );
}
