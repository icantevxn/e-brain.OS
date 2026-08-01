import { Routes, Route, Navigate } from "react-router-dom";
import { useSyncedState } from "./useSyncedState.js";
import { ArchiveProvider } from "./ArchiveContext.jsx";
import Login from "@/components/Login";
import Masthead from "@/components/Masthead";
import StatusBar from "@/components/StatusBar";
import MapView from "@/components/MapView";
import WorldView from "@/components/WorldView";
import ObjectView from "@/components/ObjectView";
import seed from "@/data/seed.json";

/* ═══════════════════════════════════════════════
   e-brain.OS — personal taste tracking system

   Shell only: auth, the synced archive, and the routes. Everything that draws
   or mutates lives in @/components and @/ArchiveContext.

   Routes are real URLs rather than component state, so the browser's back
   button works, a world can be bookmarked on a phone, and an object has an
   address you can return to.
═══════════════════════════════════════════════ */

/**
 * What a browser with no saved archive starts from. This is a real export
 * (src/data/seed.json), so refreshing it is a drop-in: hit export in the
 * masthead and replace the file wholesale — the envelope shape matches.
 *
 * Only used when the server has nothing stored; an existing archive is never
 * overwritten.
 */
const SEED_WORLDS = seed.worlds;

export default function EBrainOS() {
  const { worlds, setWorlds, saveStatus, auth, signIn } = useSyncedState(SEED_WORLDS);

  // Every hook above runs unconditionally; these gates sit below them so the
  // hook order never changes between renders.
  if (auth === "checking") {
    // Blank rather than a spinner: the check is a single fast request, and a
    // flash of loading UI is worse than a beat of empty ground.
    return <div className="h-full bg-background" />;
  }

  if (auth === "unauthenticated") {
    return (
      <div className="relative h-full overflow-hidden bg-background fos-grain">
        <Login onSubmit={signIn} />
      </div>
    );
  }

  return (
    <ArchiveProvider worlds={worlds} setWorlds={setWorlds} saveStatus={saveStatus}>
      <div className="relative flex h-full flex-col overflow-hidden bg-background fos-grain">
        <Masthead />

        <main className="flex min-h-0 flex-1 flex-col">
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/w/:worldId" element={<WorldView />} />
            <Route path="/w/:worldId/:itemId" element={<ObjectView />} />
            {/* A stale bookmark or a deleted world lands home rather than blank. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <StatusBar />
      </div>
    </ArchiveProvider>
  );
}
