import { hasValidSession } from "./_lib/auth.js";

/* ═══════════════════════════════════════════════
   /api/bookmarklet — hands you a one-click capture button.

   The bookmarklet has to carry the capture token, and the token lives only in
   the server's environment. Rather than asking you to copy it out of Vercel and
   splice it in by hand, this builds the finished snippet for you. Session-gated,
   so it takes the password to get one.

   Why a bookmarklet at all: retail and resale sites refuse server-side reads —
   datacenter IP, non-browser TLS fingerprint, no session. Your browser has all
   three and is already looking at the page, so it sends the markup itself.
═══════════════════════════════════════════════ */

/**
 * Built as one line because that is what a bookmark URL has to be.
 *
 * The markup is capped well under the endpoint's limit: metadata lives in
 * <head> and near the top of <body>, so a truncated tail costs nothing, while
 * an uncapped send would fail outright on image-heavy product pages.
 */
function buildSnippet(origin, token) {
  const source = `
    var T = ${JSON.stringify(token)};
    var E = ${JSON.stringify(origin)};
    function toast(msg, ok) {
      var d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;z-index:2147483647;top:16px;right:16px;padding:12px 16px;'
        + 'background:' + (ok ? '#0f0e0d' : '#5c1b1b') + ';color:#f4f1ea;font:500 13px/1.4 -apple-system,sans-serif;'
        + 'border:1px solid rgba(244,241,234,.25);border-radius:6px;box-shadow:0 4px 24px rgba(0,0,0,.4);max-width:320px';
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); }, 4000);
    }
    toast('Capturing…', true);
    fetch(E + '/api/capture?save=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + T },
      body: JSON.stringify({
        url: location.href,
        html: document.documentElement.outerHTML.slice(0, 1500000)
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        toast(d.saved ? 'Filed to Inbox — ' + (d.fields.name || 'untitled') : (d.error || 'Could not file that'), !!d.saved);
      })
      .catch(function (e) { toast('Failed: ' + e.message, false); });
  `;

  // Collapse to a single line; a bookmark URL cannot contain raw newlines.
  const compact = source.replace(/\s*\n\s*/g, " ").trim();
  return `javascript:(function(){${compact}})()`;
}

export default function handler(req, res) {
  if (!hasValidSession(req)) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const token = process.env.CAPTURE_TOKEN;
  if (!token) {
    return res.status(503).json({
      error: "CAPTURE_TOKEN is not set on the server",
    });
  }

  // Derive the origin from the request so this works on preview deployments
  // and a custom domain without being rebuilt.
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const origin = `${proto}://${host}`;

  return res.status(200).json({ origin, bookmarklet: buildSnippet(origin, token) });
}
