import { fetchPage, extractMetadata, pageText, assertSafeUrl } from "./_lib/scrape.js";
import { enrich, needsEnrichment, isConfigured } from "./_lib/enrich.js";
import { hasValidSession, hasValidCaptureToken } from "./_lib/auth.js";

/* ═══════════════════════════════════════════════
   /api/capture — a URL in, a draft object out.

   POST { url }          fetch the page here and read it
   POST { url, html }    caller supplies the markup it already has

   The second form exists because retail and resale sites increasingly refuse
   server-side requests outright — SSENSE and Vestiaire answer 403 regardless of
   headers, and Net-a-Porter is inconsistent about it. A browser that is already
   on the page has markup no server fetch can obtain, so it can send it along.

   Accepts either credential: the session cookie (app) or the capture bearer
   token (Shortcut). Unlike /api/archive, the bearer token is enough here —
   filing a draft is not the same power as reading the whole archive.
═══════════════════════════════════════════════ */

const MAX_HTML_BYTES = 3_000_000;

/** Never let a failed capture be a dead end — return what we have. */
function draft(fields = {}) {
  return {
    name: fields.name || "",
    brand: fields.brand || "",
    price: fields.price || "",
    image: fields.image || "",
    notes: fields.notes || "",
    status: "wishlist",
  };
}

export default async function handler(req, res) {
  if (!hasValidSession(req) && !hasValidCaptureToken(req)) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, html: suppliedHtml } = req.body ?? {};

  if (typeof url !== "string" || !url.trim()) {
    return res.status(400).json({ error: "A url is required" });
  }
  if (suppliedHtml != null && typeof suppliedHtml !== "string") {
    return res.status(400).json({ error: "html must be a string" });
  }
  if (typeof suppliedHtml === "string" && suppliedHtml.length > MAX_HTML_BYTES) {
    return res.status(413).json({ error: "That page is too large" });
  }

  // Validate the URL even when markup is supplied — it's still used as the base
  // for relative image paths and is echoed back to the client.
  let safeUrl;
  try {
    safeUrl = assertSafeUrl(url.trim()).toString();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  let html = suppliedHtml || null;
  let finalUrl = safeUrl;
  let blocked = null;

  if (!html) {
    try {
      const page = await fetchPage(safeUrl);
      html = page.html;
      finalUrl = page.finalUrl;
    } catch (err) {
      // A page we can't read isn't an error the user should have to act on —
      // hand back an empty draft with the URL so they can fill it in by hand.
      return res.status(200).json({
        fields: draft(),
        meta: {
          url: safeUrl,
          blocked: err.message,
          enriched: false,
          gaps: ["name", "brand", "price", "image"],
        },
      });
    }
  }

  let extracted;
  try {
    extracted = extractMetadata(html, finalUrl);
  } catch (err) {
    console.error("[e-brain.os] extraction failed", err?.message || err);
    return res.status(200).json({
      fields: draft(),
      meta: { url: safeUrl, blocked: "Could not read that page", enriched: false, gaps: [] },
    });
  }

  const { fields: scraped, gaps, siteName } = extracted;

  // The model is only consulted when the page left something important out,
  // which keeps the common case free.
  let fields = scraped;
  let enriched = false;
  let enrichReason = "not-needed";

  if (needsEnrichment(gaps) && isConfigured()) {
    const result = await enrich({
      url: finalUrl,
      siteName,
      scraped,
      text: pageText(html),
    });
    fields = result.fields;
    enriched = result.used;
    enrichReason = result.reason;
  } else if (needsEnrichment(gaps)) {
    enrichReason = "no-api-key";
  }

  return res.status(200).json({
    fields: draft(fields),
    meta: {
      url: safeUrl,
      finalUrl,
      siteName: siteName || "",
      gaps,
      enriched,
      enrichReason,
      blocked,
      suppliedHtml: Boolean(suppliedHtml),
    },
  });
}
