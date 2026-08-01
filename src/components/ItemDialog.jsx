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
import { Textarea } from "@/components/ui/textarea";
import { STATUS } from "@/lib/status";
import { typeOf, capitalize } from "@/lib/types";
import { cn } from "@/lib/utils";

const monoLabel = "font-mono text-[10px] uppercase tracking-[0.18em]";

export default function ItemDialog({ modal, world, onSave, onDelete, onClose }) {
  const it = modal.item || {};
  const t = typeOf(world);
  const [name, setName] = useState(it.name || "");
  const [brand, setBrand] = useState(it.brand || "");
  const [price, setPrice] = useState(it.price || "");
  const [status, setStatus] = useState(it.status || "wishlist");
  const [image, setImage] = useState(it.image || "");
  const [notes, setNotes] = useState(it.notes || "");

  const isNew = modal.mode === "new";
  const valid = name.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave({
      name: name.trim(),
      brand: brand.trim(),
      price,
      status,
      image: image.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal tracking-tight">
            {isNew ? `Add ${t.itemNoun}` : `Edit ${t.itemNoun}`}
          </DialogTitle>
          <DialogDescription className={monoLabel}>
            One {t.itemNoun} in {world?.name || "the archive"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name" className={monoLabel}>
              {capitalize(t.itemNoun)} name
            </Label>
            <Input
              id="item-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="item-brand" className={monoLabel}>
                {t.creator}
              </Label>
              <Input
                id="item-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder={t.creatorPlaceholder}
              />
            </div>
            {/* Price is stored for every type but only offered where it means
                something — you do not pay for a subculture. */}
            {t.showPrice && (
              <div className="w-32 space-y-2">
                <Label htmlFor="item-price" className={monoLabel}>
                  Price ($)
                </Label>
                <Input
                  id="item-price"
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className={cn(monoLabel, "mb-2")}>Status</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS).map(([key, s]) => {
                const on = status === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(key)}
                    aria-pressed={on}
                    className={cn(
                      "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      s.border,
                      on ? cn(s.bg, "text-background") : cn(s.text, "hover:bg-accent")
                    )}
                  >
                    {t.status[key]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="item-image" className={monoLabel}>
              Image URL (optional)
            </Label>
            <Input
              id="item-image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-notes" className={monoLabel}>
              Notes
            </Label>
            <Textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condition, sizing, where you saw it…"
              className="min-h-20"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {!isNew ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(it.id)}
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
              {isNew ? "Register" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
