import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WORLD_TYPES, DEFAULT_TYPE } from "@/lib/universes";
import { nameTaken } from "@/lib/slug";
import { useArchive } from "@/ArchiveContext";
import { cn } from "@/lib/utils";

export default function WorldDialog({ modal, onSave, onDelete, onClose }) {
  const { worlds } = useArchive();
  const world = modal.world || {};
  const [name, setName] = useState(world.name || "");
  const [cover, setCover] = useState(world.cover || "");
  const [type, setType] = useState(world.type || DEFAULT_TYPE);

  const isNew = modal.mode === "new";

  // Two worlds with the same name are indistinguishable in the breadcrumb and
  // would fight over the same slug. `exceptId` lets a world keep its own name
  // while you edit something else about it.
  const duplicate = nameTaken(worlds, name, world.id ?? null);
  const valid = name.trim().length > 0 && !duplicate;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave({ name: name.trim(), cover: cover.trim(), type });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal tracking-tight">
            {isNew ? "New world" : "Edit world"}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.18em]">
            A mood you collect into
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="world-name" className="font-mono text-[10px] uppercase tracking-[0.18em]">
              Name
            </Label>
            <Input
              id="world-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Archive Prada"
              aria-invalid={duplicate || undefined}
            />
            {duplicate && (
              <p role="alert" className="font-mono text-[9px] uppercase tracking-[0.15em] text-destructive">
                A world called “{name.trim()}” already exists
              </p>
            )}
          </div>

          <fieldset>
            <legend className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em]">
              Universe
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(WORLD_TYPES).map(([key, t]) => {
                const on = type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    aria-pressed={on}
                    className={cn(
                      "border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      t.border,
                      on ? cn(t.bg, "text-background") : cn(t.text, "hover:bg-accent")
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Sets the vocabulary inside — {WORLD_TYPES[type].creator}, {WORLD_TYPES[type].status.owned}, {WORLD_TYPES[type].status.wishlist}
            </p>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="world-cover" className="font-mono text-[10px] uppercase tracking-[0.18em]">
              Cover image URL (optional)
            </Label>
            <Input
              id="world-cover"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="https://…"
            />
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              Falls back to the first object with an image, then a generated tile
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {!isNew ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(world.id)}
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="submit"
              disabled={!valid}
              className="font-mono text-[10px] uppercase tracking-[0.15em]"
            >
              {isNew ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
