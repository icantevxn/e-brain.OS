import { FolderInput } from "lucide-react";
import { moveTargets, isInbox } from "@/lib/inbox";
import { cn } from "@/lib/utils";

/**
 * Move an object to another world in one gesture.
 *
 * Filing something out of In Orbit used to mean opening the object, hitting
 * Edit, changing a dropdown and saving — four steps for the most common thing
 * you do with a capture.
 *
 * It's a real <select> with the visible button drawn underneath it: iOS and
 * Android get their native pickers, desktop gets a normal dropdown, and there
 * is no menu component or focus trap to maintain.
 */
export default function MoveControl({ world, worlds, onMove, compact, className }) {
  // Same universe only — see moveTargets for why, and why In Orbit is exempt.
  const others = moveTargets(worlds, world);

  // Nowhere to go: the only world in its universe, and not a capture waiting to
  // be filed. Showing a control that opens an empty list would be worse.
  if (others.length === 0) return null;

  return (
    <div className={cn("relative inline-flex", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background/70 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground backdrop-blur-sm",
          compact ? "px-2 py-1.5" : "px-3 py-2"
        )}
      >
        <FolderInput className="size-3.5" />
        {compact ? null : "Move"}
      </span>

      <select
        // Sits on top and invisible: the styled span above is what you see,
        // this is what you interact with.
        aria-label="Move to another world"
        value=""
        onChange={(e) => e.target.value && onMove(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="" disabled>
          {isInbox(world) ? "File into…" : "Move to…"}
        </option>
        {others.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </div>
  );
}
