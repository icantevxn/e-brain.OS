import { parse } from "node-html-parser";

/* ═══════════════════════════════════════════════
   scrape.js — read what a page already says about itself.

   Most shop and editorial pages publish structured metadata: Open Graph tags,
   JSON-LD Product records, Twitter cards. Reading those is free, instant, and
   cannot invent a price or a dead image URL. This runs first on every capture;
   Claude is only asked about what's left over.
═══════════════════════════════════════════════ */

const TIMEOUT_MS = 12_000;
const MAX_BYTES = 2_000_000; // plenty for markup; stops us pulling a video down

// Pretending to be a browser matters: several fashion retailers serve a
// stripped page (or a bot wall) to an unrecognised agent.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * Reject anything that isn't a public web page.
 *
 * This endpoint fetches a URL chosen by the caller, which is a server-side
 * request forgery risk: without this, a crafted URL could make the function
 * fetch cloud metadata endpoints or hosts inside the provider's network and
 * hand the response back. Authentication limits who can try it, but a leaked
 * capture token shouldn't turn into a network probe.
 */
export function assertSafeUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https links can be captured");
  }

  const host = url.hostname.toLowerCase();

  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    // IPv4 private, loopback, and link-local (169.254.169.254 is the cloud
    // metadata service on every major provider)
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    // IPv6 loopback and unique-local
    host === "::1" ||
    host.startsWith("[::1") ||
    /^\[?f[cd]/i.test(host);

  if (blocked) throw new Error("That address isn't reachable");

  return url;
}

/** Fetch the page, bounded in both time and size. */
export async function fetchPage(raw) {
  const url = assertSafeUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      // A fuller browser fingerprint than a bare User-Agent. Measured: this is
      // the difference between 403 and 200 on Net-a-Porter. It does not defeat
      // real bot protection (SSENSE, Vestiaire still refuse) and isn't meant to
      // — see the capture endpoint for how blocked pages are handled.
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (!response.ok) {
      throw new Error(`The page returned ${response.status}`);
    }

    const type = response.headers.get("content-type") || "";
    if (!type.includes("html")) {
      throw new Error("That link isn't a web page");
    }

    // Read incrementally so an enormous response can't exhaust memory.
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    reader.cancel().catch(() => {});

    const html = new TextDecoder("utf-8").decode(
      chunks.length === 1 ? chunks[0] : Buffer.concat(chunks)
    );
    return { html, finalUrl: response.url || url.toString() };
  } catch (err) {
    if (err.name === "AbortError") throw new Error("The page took too long to load");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ═══════════════════════════════════════════════
   extraction
═══════════════════════════════════════════════ */

const clean = (s) =>
  typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "";

/** Prices arrive as "£1,450.00", "1450.00", or a bare number. Keep the digits. */
function normalizePrice(value) {
  if (value == null) return "";
  const digits = String(value).replace(/[^\d.]/g, "");
  if (!digits) return "";
  const n = Number.parseFloat(digits);
  return Number.isFinite(n) ? String(Math.round(n)) : "";
}

function metaContent(root, selectors) {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    const content = el?.getAttribute("content");
    if (content && clean(content)) return clean(content);
  }
  return "";
}

/** Walk JSON-LD looking for a Product record — the richest source when present. */
function fromJsonLd(root) {
  const out = {};

  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch {
      continue; // malformed JSON-LD is common; skip rather than fail the capture
    }

    // A page may ship an array, a @graph, or a bare object.
    const queue = Array.isArray(data) ? [...data] : [data];
    while (queue.length) {
      const node = queue.shift();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node["@graph"])) queue.push(...node["@graph"]);

      const type = [].concat(node["@type"] || []).join(",").toLowerCase();
      if (!type.includes("product")) continue;

      out.name ||= clean(node.name);
      out.notes ||= clean(node.description);

      const brand = node.brand;
      out.brand ||= clean(typeof brand === "string" ? brand : brand?.name);

      const image = [].concat(node.image || [])[0];
      out.image ||= clean(typeof image === "string" ? image : image?.url);

      const offer = [].concat(node.offers || [])[0];
      out.price ||= normalizePrice(offer?.price ?? offer?.lowPrice);
    }
  }

  return out;
}

/**
 * Everything the page says about itself, mapped onto the item schema.
 * Returns `{ fields, gaps }` — `gaps` names what's still empty, which is what
 * decides whether Claude gets involved at all.
 */
export function extractMetadata(html, finalUrl) {
  const root = parse(html);
  const jsonLd = fromJsonLd(root);

  const name =
    jsonLd.name ||
    metaContent(root, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    clean(root.querySelector("title")?.textContent);

  const image =
    jsonLd.image ||
    metaContent(root, [
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ]);

  const price =
    jsonLd.price ||
    normalizePrice(
      metaContent(root, [
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]',
        'meta[name="twitter:data1"]',
      ])
    );

  const brand =
    jsonLd.brand ||
    metaContent(root, [
      'meta[property="product:brand"]',
      'meta[property="og:brand"]',
    ]);

  const notes =
    jsonLd.notes ||
    metaContent(root, [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]',
    ]);

  const siteName = metaContent(root, ['meta[property="og:site_name"]']);

  const fields = {
    name,
    // Deliberately NOT falling back to og:site_name. It reads as the brand on a
    // single-label store, but on Vogue it yields brand "Vogue" for a Prada
    // collection, and on a multi-brand retailer "Farfetch" for everything —
    // confidently wrong in exactly the cases you'd want it. Better to leave it
    // empty, let it count as a gap, and have the model read the actual page.
    brand,
    price,
    image: absolutize(image, finalUrl),
    notes,
  };

  const gaps = ["name", "brand", "price", "image"].filter((k) => !fields[k]);

  // siteName is still worth knowing — it's useful context for the model and a
  // reasonable label on the capture — it just isn't the brand.
  return { fields, gaps, siteName };
}

/** Metadata often carries a root-relative image path. */
function absolutize(src, base) {
  if (!src) return "";
  try {
    return new URL(src, base).toString();
  } catch {
    return "";
  }
}

/**
 * Readable text for the model. Scripts, styles and chrome are dropped, and the
 * result is capped — a product page's useful content is near the top, and
 * uncapped input is the difference between a cent and a dollar per capture.
 */
export function pageText(html, maxChars = 6000) {
  const root = parse(html);
  for (const el of root.querySelectorAll("script, style, noscript, svg, iframe, nav, footer, header")) {
    el.remove();
  }
  return clean(root.textContent).slice(0, maxChars);
}
