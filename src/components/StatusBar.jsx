import { storageKind } from "@/storage.js";
import { hexId } from "@/lib/format";
import { cn } from "@/lib/utils";

/* Persistence readout. Reflects the real state of the write, so a blocked or
   full store is visible instead of failing silently. Carried over from the
   original build unchanged in behaviour — only the styling is new. */
const SAVE_READOUT = {
  idle: null,
  pending: { text: "Syncing", className: "text-muted-foreground" },
  saved: { text: "Saved", className: "text-owned" },
  quota: { text: "Save failed — storage full", className: "text-destructive" },
  write: { text: "Save failed", className: "text-destructive" },
  serialize: { text: "Save failed", className: "text-destructive" },
};

export default function StatusBar({ worlds, active, saveStatus }) {
  const readout =
    storageKind === "memory"
      ? { text: "Session only — storage blocked", className: "text-hunting" }
      : SAVE_READOUT[saveStatus];

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
