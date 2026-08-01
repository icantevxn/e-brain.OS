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

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * An install page rather than a JSON blob.
 *
 * Handing this back as JSON was a mistake: JSON escapes every quote as \", so
 * copying the raw response yields malformed JavaScript and the bookmark dies
 * with "Invalid or unexpected token". Dragging a real link to the bookmarks bar
 * sidesteps the copy entirely, and the copy button (which reads from the DOM,
 * not the page source) is a correct fallback.
 */
function installPage(origin, snippet) {
  const href = escapeHtml(snippet);
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Capture bookmarklet</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{background:#0f0e0d;color:#f4f1ea;font:16px/1.6 -apple-system,BlinkMacSystemFont,sans-serif;
       margin:0;padding:48px 24px;display:flex;justify-content:center}
  main{max-width:560px;width:100%}
  h1{font:400 34px/1.1 Georgia,serif;margin:0 0 8px}
  p{color:#a8a29a;margin:0 0 24px}
  .drag{display:inline-block;padding:14px 28px;background:#f4f1ea;color:#0f0e0d;border-radius:6px;
        font-weight:600;text-decoration:none;cursor:grab;margin:8px 0 4px}
  ol{color:#a8a29a;padding-left:20px} li{margin:8px 0}
  code{background:#1c1a18;padding:2px 6px;border-radius:4px;font-size:13px;color:#f4f1ea}
  textarea{width:100%;height:90px;background:#1c1a18;color:#a8a29a;border:1px solid #34302c;
           border-radius:6px;padding:10px;font:12px/1.4 ui-monospace,monospace;margin-top:8px}
  button{background:none;border:1px solid #34302c;color:#f4f1ea;padding:8px 14px;border-radius:6px;
         cursor:pointer;font-size:13px;margin-top:8px}
  .warn{border-left:2px solid #d98a5f;padding-left:14px;color:#a8a29a;font-size:14px;margin-top:32px}
</style></head><body><main>
  <h1>Capture bookmarklet</h1>
  <p>Drag the button to your bookmarks bar. Then click it on any page to file it to your Inbox.</p>

  <a class="drag" href="${href}">Capture</a>
  <p style="font-size:13px;margin-top:4px">
    Bookmarks bar hidden? <code>&#8984;&#8679;B</code> in Chrome or Safari.
  </p>

  <ol>
    <li>Drag <strong>Capture</strong> up to the bookmarks bar</li>
    <li>Open a page you want to keep</li>
    <li>Click <strong>Capture</strong> — a toast confirms it landed in your Inbox</li>
  </ol>

  <details>
    <summary style="cursor:pointer;color:#a8a29a;font-size:14px">Dragging didn't work</summary>
    <textarea id="s" readonly>${escapeHtml(snippet)}</textarea>
    <button id="c">Copy</button>
    <p style="font-size:13px">Make a new bookmark by hand and paste this as the <em>URL</em>.</p>
  </details>

  <p class="warn">
    This snippet contains your capture token. Anyone with it can add items to your
    Inbox &mdash; not read or change the rest of your archive. Don't post it anywhere;
    if it leaks, change <code>CAPTURE_TOKEN</code> in Vercel and redeploy.
  </p>

  <script>
    document.getElementById('c').addEventListener('click', function () {
      var t = document.getElementById('s');
      t.select();
      navigator.clipboard.writeText(t.value).then(
        function () { document.getElementById('c').textContent = 'Copied'; },
        function () { document.execCommand('copy'); }
      );
    });
  </script>
</main></body></html>`;
}

export default function handler(req, res) {
  if (!hasValidSession(req)) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const token = process.env.CAPTURE_TOKEN;
  if (!token) {
    return res.status(503).json({ error: "CAPTURE_TOKEN is not set on the server" });
  }

  // Derive the origin from the request so this works on preview deployments
  // and a custom domain without being rebuilt.
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const origin = `${proto}://${host}`;
  const snippet = buildSnippet(origin, token);

  // JSON only if explicitly asked for; a browser gets the install page.
  if (String(req.headers.accept || "").includes("application/json")) {
    return res.status(200).json({ origin, bookmarklet: snippet });
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store"); // it carries a credential
  return res.status(200).send(installPage(origin, snippet));
}
