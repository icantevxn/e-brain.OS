import { useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Delete, with the confirmation built into the button.
 *
 * A modal for every delete is heavier than the action deserves, and a bare
 * one-click delete on a grid card is an accident waiting to happen. Arming the
 * button instead keeps it to two deliberate clicks, disarms itself after a few
 * seconds, and needs no dialog plumbing at the call site.
 */
export default function DeleteButton({ onDelete, label = "Delete", className, compact }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const disarm = () => {
    clearTimeout(timer.current);
    setArmed(false);
  };

  const click = (e) => {
    // These sit on top of a link-wrapped card; without this the click also
    // navigates to the object being deleted.
    e.preventDefault();
    e.stopPropagation();

    if (armed) {
      disarm();
      onDelete();
      return;
    }

    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 4000);
  };

  return (
    <button
      type="button"
      onClick={click}
      onBlur={disarm}
      onMouseLeave={armed ? undefined : disarm}
      aria-label={armed ? `Confirm ${label.toLowerCase()}` : label}
      title={armed ? "Click again to confirm" : label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-mono text-[9px] uppercase tracking-[0.15em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "px-2 py-1.5" : "px-3 py-2",
        armed
          ? "border-destructive bg-destructive text-destructive-foreground"
          : "border-border/70 bg-background/70 text-muted-foreground backdrop-blur-sm hover:border-destructive hover:text-destructive",
        className
      )}
    >
      <Trash2 className="size-3.5" />
      {armed ? "Sure?" : compact ? null : label}
    </button>
  );
}
