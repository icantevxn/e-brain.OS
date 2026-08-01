import { useRef, useState, useEffect } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadArchive, parseArchive, mergeWorlds } from "@/lib/archive";
import { today } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Export the archive to a file, or merge one back in.
 *
 * Import merges by world id rather than replacing, so a mistaken file can add
 * worlds but never wipe the ones you have — which is why this needs no
 * confirmation step in front of it.
 */
export default function ArchiveActions({ worlds, onImport }) {
  const fileRef = useRef(null);
  const [note, setNote] = useState(null);

  // Clear the inline result after a beat so it doesn't sit in the masthead.
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(id);
  }, [note]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    // Reset immediately so re-picking the same file still fires a change event.
    e.target.value = "";
    if (!file) return;

    try {
      const incoming = parseArchive(await file.text());
      const merged = mergeWorlds(worlds, incoming);
      const added = merged.length - worlds.length;
      onImport(merged);
      setNote({
        ok: true,
        text: `Imported ${incoming.length} — ${added} new`,
      });
    } catch (err) {
      setNote({ ok: false, text: err.message });
    }
  };

  return (
    <div className="flex items-center gap-1">
      {note && (
        <span
          role="status"
          className={cn(
            "mr-1 font-mono text-[9px] uppercase tracking-[0.15em]",
            note.ok ? "text-owned" : "text-destructive"
          )}
        >
          {note.text}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        title="Export archive as JSON"
        aria-label="Export archive as JSON"
        disabled={worlds.length === 0}
        onClick={() => downloadArchive(worlds, today())}
      >
        <Download className="size-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        title="Import archive from JSON"
        aria-label="Import archive from JSON"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-3.5" />
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
