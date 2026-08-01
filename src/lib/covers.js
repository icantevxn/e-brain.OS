import { hashN } from "./format.js";
import { typeOf } from "./types.js";

/* ═══════════════════════════════════════════════
   covers.js — resolve the image that represents a world on the dome.

   Worlds carry no image of their own, and the seed worlds ship with no
   items at all, so a naive `world.items[0].image` would leave the dome
   blank on first run. The fallback below generates a tile per world so an
   empty archive still reads as deliberate rather than broken.

   The generated tile is an inline SVG data URI. Data-URI SVGs referenced
   from <img src> cannot load webfonts, so the glyph falls back to a
   generic serif — close enough to the Instrument Serif used elsewhere.
═══════════════════════════════════════════════ */

/**
 * Deterministic colour pair for a world, stable across reloads.
 *
 * Anchored to the world type's hue and varied only ±22° around it, so a type
 * reads as a family on the dome — the violet tiles are films — while two film
 * worlds still stay distinguishable from each other.
 */
function palette(seed, baseHue) {
  const hue = Math.round((baseHue + (hashN(seed, 11) - 0.5) * 44 + 360) % 360);
  const alt = (hue + 30 + Math.round(hashN(seed, 17) * 40)) % 360;
  return {
    a: `hsl(${hue} 26% 27%)`,
    b: `hsl(${alt} 30% 9%)`,
    glow: `hsl(${hue} 48% 62%)`,
  };
}

/**
 * Build an SVG data URI for a world with no usable imagery.
 * Abstract by design: these tiles repeat many times across the dome, so a
 * full name on each would read as noise. One large, low-contrast initial
 * behaves like texture instead.
 */
export function generatedCover(world) {
  const seed = world.id + (world.name || "");
  const { a, b, glow } = palette(seed, typeOf(world).hue);
  const initial = (world.name || "?").trim().charAt(0).toUpperCase() || "?";
  const tilt = (hashN(seed, 31) - 0.5) * 16;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="1" stop-color="${b}"/>
    </linearGradient>
    <radialGradient id="h" cx="0.32" cy="0.24" r="0.7">
      <stop offset="0" stop-color="${glow}" stop-opacity="0.4"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <rect width="600" height="600" fill="url(#h)"/>
  <text x="300" y="300" fill="#F4F1EA" fill-opacity="0.13"
        font-family="Times New Roman, serif" font-size="420"
        text-anchor="middle" dominant-baseline="central"
        transform="rotate(${tilt.toFixed(2)} 300 300)">${escapeXml(initial)}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeXml(s) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]
  );
}

/**
 * Pick a world's cover, best available first:
 *   1. an explicit cover URL set on the world
 *   2. the first item in the world that has an image
 *   3. a generated tile
 */
export function worldCover(world) {
  if (world.cover && world.cover.trim()) return world.cover.trim();
  const withImage = world.items?.find((it) => it.image && it.image.trim());
  if (withImage) return withImage.image.trim();
  return generatedCover(world);
}

/**
 * Dome tiles for the map. `worldId` rides along so a click on any tile can
 * be traced back to the world it represents — DomeGallery repeats the pool
 * to fill its grid, so one world owns many tiles.
 */
export function worldTiles(worlds) {
  return worlds.map((w) => ({
    src: worldCover(w),
    alt: w.name,
    worldId: w.id,
  }));
}
