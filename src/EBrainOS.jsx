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
  const { worlds, setWorlds, saveStatus, role, canEdit, signIn, signOut } =
    useSyncedState(SEED_WORLDS);

  // No login gate any more: the archive is public to read, so a visitor lands
  // straight on it. Signing in is an action you take, not a wall you pass.
  return (
    <ArchiveProvider
      worlds={worlds}
      setWorlds={setWorlds}
      saveStatus={saveStatus}
      canEdit={canEdit}
      signIn={signIn}
      signOut={signOut}
    >
      <div className="relative flex h-full flex-col overflow-hidden bg-background fos-grain">
        <Masthead />

        <main className="flex min-h-0 flex-1 flex-col">
          <Routes>
            {/* A universe is the same dome, narrowed — so it gets a real
                address instead of being a toggle you can't link to. */}
            <Route path="/" element={<MapView />} />

            {/* In Orbit sits above the universes rather than inside one: it is
                pinned to `fashion` only because every world needs a universe,
                and putting that in its URL would imply a categorisation it
                explicitly doesn't have. Declared before /:universe so it isn't
                swallowed by it. */}
            <Route path="/in-orbit" element={<WorldView inbox />} />
            <Route path="/in-orbit/:itemId" element={<ObjectView inbox />} />

            {/* Signing in is a page you visit, not a wall in front of the app.
                Already signed in? Nothing to do here. */}
            <Route
              path="/sign-in"
              element={
                canEdit ? <Navigate to="/" replace /> : <Login onSubmit={signIn} />
              }
            />

            <Route path="/:universe" element={<MapView />} />
            <Route path="/:universe/:worldId" element={<WorldView />} />
            <Route path="/:universe/:worldId/:itemId" element={<ObjectView />} />

            {/* A stale bookmark or a deleted world lands home rather than blank. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <StatusBar />
      </div>
    </ArchiveProvider>
  );
}
