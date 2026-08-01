import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/* ═══════════════════════════════════════════════
   auth.js — single-user access control.

   Two independent credentials, deliberately:

   - A password you type, exchanged for a signed cookie. Used by the app.
   - A long random bearer token. Used by the iOS Shortcut, so a device that
     only needs to *file* a capture never holds the password that can read the
     whole archive.

   The cookie is a signed assertion, not an opaque session id — there is no
   session table to keep. It carries an expiry and is verified with an HMAC, so
   it cannot be forged without SESSION_SECRET.
═══════════════════════════════════════════════ */

const COOKIE_NAME = "ebrain_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

/** Length-independent equality. Hashing first keeps the compare fixed-width. */
function safeEqual(a, b) {
  const ha = createHmac("sha256", secret()).update(String(a)).digest();
  const hb = createHmac("sha256", secret()).update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

function sign(value) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

/** `<expiry>.<signature>` — no user identity to carry, there is only one user. */
export function createSessionCookie() {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  const token = `${payload}.${sign(payload)}`;

  return [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly", // unreadable from JS, so an XSS bug can't lift the session
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${MAX_AGE_SECONDS}`,
  ].join("; ");
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function readCookie(req, name) {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/** True when the request carries a cookie we signed and that hasn't expired. */
export function hasValidSession(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return false;

  const idx = token.lastIndexOf(".");
  if (idx < 1) return false;

  const payload = token.slice(0, idx);
  const signature = token.slice(idx + 1);

  let signatureOk = false;
  try {
    signatureOk = timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(sign(payload))
    );
  } catch {
    return false; // length mismatch — timingSafeEqual throws rather than returning false
  }
  if (!signatureOk) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export function isCorrectPassword(candidate) {
  const expected = process.env.APP_PASSWORD;
  if (!expected || typeof candidate !== "string") return false;
  return safeEqual(candidate, expected);
}

/**
 * Bearer credential for the capture endpoint. Intentionally *not* accepted by
 * the archive endpoints: a leaked Shortcut token should be able to add an item,
 * never to read or replace the archive.
 */
export function hasValidCaptureToken(req) {
  const expected = process.env.CAPTURE_TOKEN;
  if (!expected) return false;

  const header = req.headers?.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return safeEqual(match[1], expected);
}

/** Convenience for generating a CAPTURE_TOKEN value locally. */
export const suggestToken = () => randomBytes(32).toString("base64url");
