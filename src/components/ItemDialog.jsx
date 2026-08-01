import { useState } from "react";
import { Trash2, Link2, Loader2 } from "lucide-react";
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
import { captureUrl } from "@/lib/remote";
import { nameTaken } from "@/lib/slug";
import { moveTargets } from "@/lib/inbox";
import { cn } from "@/lib/utils";

const monoLabel = "font-mono text-[10px] uppercase tracking-[0.18em]";

export default function ItemDialog({ modal, world, worlds = [], onSave, onDelete, onClose }) {
  const it = modal.item || {};
  const t = typeOf(world);
  const [moveTo, setMoveTo] = useState(world?.id || "");
  const [name, setName] = useState(it.name || "");
  const [brand, setBrand] = useState(it.brand || "");
  const [price, setPrice] = useState(it.price || "");
  const [status, setStatus] = useState(it.status || "wishlist");
  const [image, setImage] = useState(it.image || "");
  const [notes, setNotes] = useState(it.notes || "");

  const [link, setLink] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [captureNote, setCaptureNote] = useState(null);

  const isNew = modal.mode === "new";

  const destinations = moveTargets(worlds, world);

  // Checked against the world it's going *to*, not the one it's in — moving a
  // piece into a world that already has one by that name is the same clash.
  const targetWorld = worlds.find((w) => w.id === moveTo) || world;
  const duplicate = nameTaken(targetWorld?.items || [], name, it.id ?? null);
  const valid = name.trim().length > 0 && !duplicate;

  /**
   * Pull what the page says about itself and fill the blanks.
   *
   * Deliberately only fills empty fields — a capture run against a half-filled
   * form should never wipe something typed by hand.
   */
  const capture = async () => {
    const url = link.trim();
    if (!url || capturing) return;

    setCapturing(true);
    setCaptureNote(null);
    try {
      const { fields, meta } = await captureUrl(url);

      setName((v) => v || fields.name);
      setBrand((v) => v || fields.brand);
      setPrice((v) => v || fields.price);
      setImage((v) => v || fields.image);
      setNotes((v) => v || fields.notes);

      if (meta.blocked) {
        setCaptureNote({
          tone: "warn",
          text: "That site blocks automated reads — fill it in by hand",
        });
      } else if (!fields.name && !fields.image) {
        setCaptureNote({ tone: "warn", text: "Nothing useful on that page" });
      } else {
        const still = ["name", "brand", "price", "image"].filter((k) => !fields[k]);
        setCaptureNote({
          tone: "ok",
          text: still.length ? `Filled — still missing ${still.join(", ")}` : "Filled",
        });
      }
    } catch {
      setCaptureNote({ tone: "warn", text: "Couldn't reach the server" });
    } finally {
      setCapturing(false);
    }
  };

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
      moveTo,
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

        {/* Capture. Only offered on new objects — running it over an existing
            entry is a way to make a mess, not a shortcut. */}
        {isNew && (
          <div className="space-y-2 border-b pb-4">
            <Label htmlFor="item-link" className={monoLabel}>
              Paste a link
            </Label>
            <div className="flex gap-2">
              <Input
                id="item-link"
                value={link}
                placeholder="https://…"
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  // Enter here means "fetch", not "submit the whole form".
                  if (e.key === "Enter") {
                    e.preventDefault();
                    capture();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={capture}
                disabled={!link.trim() || capturing}
                className="shrink-0 font-mono text-[10px] uppercase tracking-[0.15em]"
              >
                {capturing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Link2 className="size-3.5" />
                )}
                {capturing ? "Reading" : "Fill"}
              </Button>
            </div>
            {captureNote && (
              <p
                role="status"
                className={cn(
                  "font-mono text-[9px] uppercase tracking-[0.15em]",
                  captureNote.tone === "ok" ? "text-owned" : "text-hunting"
                )}
              >
                {captureNote.text}
              </p>
            )}
          </div>
        )}

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
              aria-invalid={duplicate || undefined}
            />
            {duplicate && (
              <p role="alert" className="font-mono text-[9px] uppercase tracking-[0.15em] text-destructive">
                {targetWorld?.name} already has “{name.trim()}”
              </p>
            )}
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

          {/* Triage. Restricted to the same universe (In Orbit excepted), for
              the same reason as the Move control — a cross-universe move
              relabels a piece rather than relocating it. */}
          {destinations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="item-world" className={monoLabel}>
                World
              </Label>
              <select
                id="item-world"
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {[world, ...destinations].filter(Boolean).map((w) => (
                  <option key={w.id} value={w.id} className="bg-background">
                    {w.name}
                  </option>
                ))}
              </select>
              {moveTo !== world?.id && (
                <p className={cn(monoLabel, "text-hunting")}>
                  Will move out of {world?.name}
                </p>
              )}
            </div>
          )}

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
