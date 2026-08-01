# e-brain.OS

A single-user personal taste archive. You organize what you're into — fashion,
books, film, music, food, spaces, subcultures — into **worlds**, file
**objects** into each one, and browse the whole collection as a rotating dome
of cover art. Items get captured from anywhere (a pasted link, a browser
bookmarklet, an iOS Shortcut) and the archive syncs across every device you
use it from.

## What it does

- **Worlds** are collections you define — "Archive Prada," "Hong Kong New
  Wave," "Brutalist Interiors." Each world has a **type** (Fashion, Books,
  Film, Music, Food, Spaces, Subculture) that only changes vocabulary, not
  data: a film world calls its items "seen," a books world calls the same
  field "read." Switching a world's type later is non-destructive.
- **Objects** live inside a world: a name, a creator (brand/author/director/
  cuisine/studio/scene, labeled per type), a price where that's meaningful, an
  image, freeform notes, and a **status** — `owned`, `wishlist`, or `hunting`
  (worded per type, e.g. "Watchlist" vs. "Reading list").
- **The Archive (map view)** renders every world as a tile on a draggable 3D
  dome — a moodboard you orbit rather than a list you scroll. Worlds can be
  filtered by type, and clicking any tile enters that world's grid of objects.
- **Capture** turns a URL into a draft object automatically: the server (or
  your browser, for sites that block server-side reads) fetches the page,
  scrapes OpenGraph/product metadata, and — if fields are still missing — asks
  Claude to fill in what the page's own text supports (never inventing a price
  or brand). Capture works three ways:
  - pasting a link into the "Add object" dialog,
  - a **bookmarklet** that files the current page straight to an Inbox world,
  - an **iOS Shortcut** reachable from Safari's share sheet.
- **Sync** is server-backed with offline fallback: the server holds the source
  of truth, localStorage is a paint-instant cache, edits are debounced and
  pushed automatically, and a write that lands after another device's edit is
  merged (not overwritten) via optimistic concurrency versioning.
- **Import/export** moves the whole archive in and out as a JSON file. Import
  merges by world id, so a bad file can add worlds but never wipe the ones you
  have.
- **Auth** is single-user: a password unlocks a signed session cookie for the
  app, and a separate long-lived bearer token (`CAPTURE_TOKEN`) authorizes the
  bookmarklet/Shortcut to file captures without ever holding the password.

## Tech stack

- **Frontend**: React 19, React Router, Vite, Tailwind CSS v4, Radix UI
  primitives, Motion (animation), a custom WebGL dome gallery.
- **Backend**: Vercel serverless functions (`/api`), Neon (serverless
  Postgres) for storage, the Anthropic SDK for AI enrichment.
- **Hosting**: Vercel (the `vercel.json` rewrite sends every non-`/api` path
  to `index.html` for client-side routing).

## Project structure

```
api/                        Vercel serverless functions
  login.js                  Password → session cookie (GET/POST/DELETE)
  archive.js                GET/PUT the whole archive, optimistic concurrency
  capture.js                URL (or supplied HTML) → draft object, optional file-to-Inbox
  bookmarklet.js             Session-gated install page for the capture bookmarklet
  _lib/
    auth.js                Session cookie + capture bearer token verification
    db.js                  Neon connection, schema, versioned read/write
    inbox.js               Append-to-Inbox-world helper used by capture
    scrape.js               HTML fetch + OpenGraph/metadata extraction
    enrich.js               Claude fallback for fields the scrape couldn't find

src/
  main.jsx                  Entry point
  EBrainOS.jsx               App shell: auth gate + routes (/, /w/:id, /w/:id/:itemId)
  ArchiveContext.jsx         All archive mutations (create/update/remove world & item)
  useSyncedState.js           Client ↔ server sync, offline cache, conflict merge
  storage.js                 localStorage wrapper (schema versioning, quota handling)
  components/
    Login.jsx                Password entry screen
    Masthead.jsx              Header: breadcrumb + world/object counts + archive actions
    ArchiveActions.jsx         Export/import archive as JSON
    StatusBar.jsx              Footer: sync status readout
    MapView.jsx                The Archive — dome gallery of all worlds, type filters
    WorldView.jsx               One world's objects as a grid, filterable by status
    ObjectView.jsx              One object's detail page (own route, bookmarkable)
    ObjectCard.jsx              Grid tile for an object
    ItemDetail.jsx              (unused) leftover from an earlier detail-panel layout
    WorldDialog.jsx             Create/edit a world (name, type, cover)
    ItemDialog.jsx               Create/edit an object, incl. "paste a link" capture
    vendor/DomeGallery           3D dome renderer used by MapView
  lib/
    types.js                  World type definitions (vocabulary, hue, placeholders)
    status.js                  Status → color class mapping
    covers.js                  World cover resolution + generated fallback tile (SVG)
    archive.js                 Export/import/merge helpers for the JSON archive file
    remote.js                  Typed fetch wrapper for /api (Auth/Conflict/Offline errors)
    format.js                  id generation, date, price/hex formatting
  data/seed.json               Starter archive shown before anything is saved
```

## Setup

```bash
npm install
npm run dev
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `APP_PASSWORD` | Password for the web app login. |
| `SESSION_SECRET` | Signs the session cookie. Any long random string. |
| `CAPTURE_TOKEN` | Bearer token used by the bookmarklet and iOS Shortcut to file captures. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. |
| `DATABASE_URL` (or `POSTGRES_URL` / `STORAGE_URL`) | Neon/Postgres connection string, provided automatically by Vercel's storage integration. |
| `ANTHROPIC_API_KEY` | Optional. Enables AI enrichment for captures that are missing name/brand/price/notes. |

Set these in your Vercel project settings (or a local `.env` for `vercel dev`).

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server (`/api` routes need `vercel dev` instead, or a deployed backend). |
| `npm run build` | Production build to `dist/`. |
| `npm run preview` | Serve the production build locally. |

## Data model

The whole archive is one document: an array of worlds, each holding its own
items.

```jsonc
{
  "id": "w1",
  "name": "Archive Prada",
  "type": "fashion",           // one of the WORLD_TYPES keys; defaults to "fashion"
  "cover": "https://…",         // optional; falls back to an item image, then a generated tile
  "items": [
    {
      "id": "8yhe8qc6",
      "added": "2026-08-01",
      "name": "Half Moon Metal Bag (white) SS2003",
      "brand": "Prada",
      "price": "979",
      "status": "owned",         // owned | wishlist | hunting
      "image": "https://…",
      "notes": "preppylook.ph"
    }
  ]
}
```

A capture that isn't triaged into a world lands in a dedicated **Inbox**
world, created on demand.

## Capturing items

There are three ways to file an item without navigating the app by hand.

### Paste a link (in-app)

Open "Add object" in any world and paste a URL into the **Paste a link**
field, then click **Fill**. This only fills fields that are still empty, so
running it against a half-filled form never overwrites something typed by
hand.

### Bookmarklet (desktop/mobile browser)

1. Log in to the app, then visit `/api/bookmarklet` in the same browser.
2. Drag the **Capture** button to your bookmarks bar (⌘⇧B in Chrome or Safari
   if it's hidden).
3. On any page you want to save, click **Capture** — a toast confirms it
   landed in your Inbox.

If dragging doesn't work (e.g. on mobile), expand **Dragging didn't work** on
that page, copy the snippet, and paste it as the URL of a manually created
bookmark.

The bookmarklet page is session-gated and bakes your `CAPTURE_TOKEN` into the
generated link, so don't share that link or post it publicly. If it ever
leaks, rotate `CAPTURE_TOKEN` in Vercel and redeploy.

### iOS Shortcut (share sheet)

Since the bookmarklet needs a bookmarks bar, use a Shortcut for filing items
from Safari's share sheet or from other apps instead:

1. Open the **Shortcuts** app and create a new shortcut.
2. Add a **Get Contents of URL** action, configured as:
   - **URL**: `https://<your-domain>/api/capture?save=1`
   - **Method**: `POST`
   - **Headers**:
     - `Content-Type: application/json`
     - `Authorization: Bearer <your CAPTURE_TOKEN>`
   - **Request Body**: JSON with a single field:
     ```json
     { "url": "Shortcut Input" }
     ```
     (map the `url` value to the **Shortcut Input** variable, which will be
     the shared URL)
3. Tap the shortcut's settings (the ⓘ icon) and enable **Use with Share
   Sheet**, restricting the input type to **URLs**/**Safari web pages**.
4. Optionally add a **Show Notification** action after the request, showing
   the response's `saved` field so you get confirmation on the lock screen.

To use it: on any page in Safari, tap **Share → your shortcut name**. The
server fetches and parses the page itself (no HTML is sent from the Shortcut),
so it works even without JavaScript access to the page.

The Shortcut only needs `CAPTURE_TOKEN` — never your `APP_PASSWORD` — since
the capture endpoint accepts the bearer token as a lesser credential that can
file items but can't read or replace the rest of the archive.
