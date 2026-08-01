/* Formatting and stable-hash helpers, lifted from the original single-file
   build so the view components can share them. Behaviour is unchanged. */

export const uid = () => Math.random().toString(36).slice(2, 10);

export const fmt = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

/** FNV-1a, rendered as fixed-width hex. Used for the mono ID readouts. */
export const hexId = (s, len = 8) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0;
  return h.toString(16).toUpperCase().padStart(len, "0").slice(0, len);
};

/** Stable 0..1 from a string + salt. Drives per-world colour, never layout. */
export const hashN = (s, salt) => {
  let h = salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h / 9973;
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};
