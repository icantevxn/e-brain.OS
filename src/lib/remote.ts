import type { Item, StoredArchive, World } from "@/types";

/* ═══════════════════════════════════════════════
   remote.ts — the archive API, as seen from the browser.

   Everything here is same-origin, so the session cookie rides along on its own.
   Failures are separated into three kinds the UI treats differently:

     AuthError      → show the login screen
     ConflictError  → merge and retry (carries the archive that beat us)
     OfflineError   → keep working from cache, try again later
═══════════════════════════════════════════════ */

export class AuthError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "AuthError";
  }
}

export class ConflictError extends Error {
  /** The archive as stored right now, so the caller can merge against it. */
  current: StoredArchive | null;

  constructor(current: StoredArchive | null) {
    super("Archive changed underneath this write");
    this.name = "ConflictError";
    this.current = current;
  }
}

export class OfflineError extends Error {
  constructor(cause?: unknown) {
    super("Cannot reach the server");
    this.name = "OfflineError";
    this.cause = cause;
  }
}

/**
 * Parse a response as JSON, tolerating a body that isn't.
 *
 * This matters in plain `vite dev`, where /api doesn't exist and the SPA
 * fallback answers with index.html — HTML parsed as JSON would otherwise throw
 * something unrecognisable instead of a clean offline signal.
 */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (err) {
    throw new OfflineError(err);
  }

  if (response.status === 401) throw new AuthError();

  const body = (await readJson(response)) as (T & { error?: string; current?: StoredArchive }) | null;

  // No JSON back from an endpoint that always speaks JSON: treat as unreachable
  // rather than pretending we got an answer.
  if (body === null) throw new OfflineError(new Error(`Non-JSON from ${path}`));

  if (response.status === 409) throw new ConflictError(body.current ?? null);
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);

  return body;
}

export async function checkAuth(): Promise<boolean> {
  const body = await request<{ authenticated: boolean }>("/api/login", { method: "GET" });
  return Boolean(body.authenticated);
}

export async function signIn(password: string): Promise<true> {
  await request("/api/login", { method: "POST", body: JSON.stringify({ password }) });
  return true;
}

export async function signOut(): Promise<void> {
  await request("/api/login", { method: "DELETE" });
}

/** `worlds: null` means nothing has ever been stored. */
export async function fetchArchive(): Promise<{ version: number; worlds: World[] | null }> {
  return request("/api/archive", { method: "GET" });
}

/** Returns the new version. Throws ConflictError if `version` was stale. */
export async function pushArchive(version: number, worlds: World[]): Promise<number> {
  const body = await request<{ version: number }>("/api/archive", {
    method: "PUT",
    body: JSON.stringify({ version, worlds }),
  });
  return body.version;
}

export interface CaptureResult {
  fields: Item & { status: Item["status"] };
  meta: {
    url: string;
    finalUrl?: string;
    siteName?: string;
    gaps: string[];
    enriched: boolean;
    enrichReason?: string;
    blocked?: string | null;
  };
  saved?: boolean;
  duplicate?: boolean;
}

/**
 * Turn a URL into a draft object.
 *
 * Always resolves with a draft — a page that can't be read comes back with
 * empty fields and `meta.blocked` explaining why, rather than as an error.
 */
export async function captureUrl(url: string): Promise<CaptureResult> {
  return request("/api/capture", { method: "POST", body: JSON.stringify({ url }) });
}
