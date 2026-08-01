import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ArchiveActions from "@/components/ArchiveActions";
import { today } from "@/lib/format";

/**
 * Editorial masthead. Replaces the original REC/timecode chrome: same
 * information density, but carried by a serif wordmark and a hairline rule
 * rather than a blinking record dot.
 */
export default function Masthead({ worlds, active, onBack, onImport }) {
  const objectCount = worlds.reduce((sum, w) => sum + w.items.length, 0);

  return (
    <header className="flex shrink-0 items-baseline gap-4 border-b px-5 py-3 sm:px-8">
      {/* The wordmark doubles as the way home. A button rather than an anchor:
          there are no routes here, so this changes state, it doesn't navigate.
          Inert on the map itself, where there is nowhere to go back to. */}
      <h1 className="font-display text-2xl leading-none tracking-tight sm:text-3xl">
        {active ? (
          <button
            type="button"
            onClick={onBack}
            title="Back to the archive"
            className="cursor-pointer underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            e-brain<span className="text-muted-foreground">.OS</span>
          </button>
        ) : (
          <>
            e-brain<span className="text-muted-foreground">.OS</span>
          </>
        )}
      </h1>

      <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
        {today()}
      </span>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline">
          {worlds.length} {worlds.length === 1 ? "world" : "worlds"} / {objectCount} obj
        </span>

        <ArchiveActions worlds={worlds} onImport={onImport} />
        {active && (
          <Button variant="ghost" size="sm" onClick={onBack} className="font-mono text-[11px] uppercase tracking-[0.15em]">
            <ArrowLeft className="size-3.5" />
            Archive
          </Button>
        )}
      </div>
    </header>
  );
}
