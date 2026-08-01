import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { findInbox } from "@/lib/inbox";
import { worldPath } from "@/lib/slug";

/**
 * The way into In Orbit.
 *
 * Captures used to land in a world sitting on the dome among the real ones,
 * which both hid them and inflated the Fashion count. In Orbit is now off the
 * dome entirely, so it needs its own door — and a craft circling the archive
 * says what the world is better than a tile does: things aloft, not yet landed.
 *
 * Absent when there is nothing waiting. An empty inbox is not worth a control.
 */
export default function OrbitShuttle({ worlds }) {
  const inbox = findInbox(worlds);
  const waiting = inbox?.items.length ?? 0;
  if (!inbox || waiting === 0) return null;

  return (
    // The wrapper is the orbit's centre; the child is flung out to its radius.
    // pointer-events are off here so the dome can still be dragged through it.
    <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center">
      <div className="fos-orbit">
        <Link
          to={worldPath(inbox)}
          title={`${waiting} waiting in ${inbox.name}`}
          aria-label={`${inbox.name}, ${waiting} waiting`}
          className="pointer-events-auto group relative flex size-11 items-center justify-center rounded-full border border-border/70 bg-background/80 text-foreground shadow-lg backdrop-blur-md transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Rocket className="size-4 -rotate-45" />
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[9px] leading-4 text-background">
            {waiting}
          </span>
        </Link>
      </div>
    </div>
  );
}
