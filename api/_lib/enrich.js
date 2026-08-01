import Anthropic from "@anthropic-ai/sdk";

/* ═══════════════════════════════════════════════
   enrich.js — ask Claude only about what the page didn't say.

   The scraper handles pages that publish their own metadata, which is most of
   them, for free and with no chance of invention. This runs on the remainder:
   editorial pages with no product record, stores that ship a bare <title>, and
   fields metadata never carries — which label actually made a piece, what era
   it's from, why it might be worth noting.

   Structured outputs pin the reply to the item schema, so there is no parsing
   guesswork and no prose to strip.
═══════════════════════════════════════════════ */

/**
 * The shape Claude must return. Every field is a plain string, so none of the
 * unsupported JSON-Schema constraints apply; `additionalProperties: false` is
 * required on every object.
 */
const ITEM_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description:
        "The specific piece, as someone would refer to it. Include season or year when the page gives one, e.g. 'Mirror skirt SS1999'. Do not include the retailer or site name.",
    },
    brand: {
      type: "string",
      description:
        "The label that made it, e.g. 'Prada'. Not the shop selling it and not the publication writing about it. Empty string if genuinely unclear.",
    },
    price: {
      type: "string",
      description:
        "Digits only, no currency symbol or separators, e.g. '1450'. Empty string if the page shows no price.",
    },
    notes: {
      type: "string",
      description:
        "One short line worth remembering — material, era, condition, or what makes it distinctive. Empty string if the page offers nothing useful.",
    },
  },
  required: ["name", "brand", "price", "notes"],
  additionalProperties: false,
};

const SYSTEM = `You extract fashion archive entries from web pages.

Report only what the page supports. An empty string is the correct answer when
the page does not say — a plausible guess is worse than a blank field, because
a blank field is obviously incomplete and a wrong one is not.

Never invent a price. Never name a brand you are inferring from the retailer or
publication rather than from the page's own description of the piece.`;

/** Claude cannot produce a working image URL from memory, so images are never asked for. */
export function needsEnrichment(gaps) {
  return gaps.some((g) => g === "name" || g === "brand" || g === "price");
}

export function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Fill the gaps the scraper left. Returns `{ fields, used, reason }` —
 * `used: false` means the caller should keep the scraped fields as they are.
 *
 * Never throws: a capture that reaches the model and fails is still a capture
 * with real metadata in it, and a dialog the user can finish by hand beats an
 * error message.
 */
export async function enrich({ url, siteName, scraped, text }) {
  if (!isConfigured()) return { fields: scraped, used: false, reason: "no-api-key" };
  if (!text) return { fields: scraped, used: false, reason: "no-text" };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const known = Object.entries(scraped)
    .filter(([k, v]) => v && k !== "image")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: SYSTEM,
      // effort: low is the cost lever here — this is extraction from text that
      // is already in front of the model, not a reasoning problem. Thinking is
      // left at its default rather than disabled; disabling it on this model
      // has documented failure modes and buys little at low effort.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: ITEM_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `URL: ${url}`,
                siteName ? `Site: ${siteName}` : null,
                known ? `Already known from the page's metadata:\n${known}` : null,
                "",
                "Page text:",
                text,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        },
      ],
    });

    // Safety classifiers can decline; content is empty or partial when they do.
    if (response.stop_reason === "refusal") {
      return { fields: scraped, used: false, reason: "refused" };
    }

    const block = response.content.find((b) => b.type === "text");
    if (!block) return { fields: scraped, used: false, reason: "empty" };

    let parsed;
    try {
      parsed = JSON.parse(block.text);
    } catch {
      return { fields: scraped, used: false, reason: "unparseable" };
    }

    // Scraped values win: they came from the page's own declarations. The model
    // only fills blanks, so enrichment can never overwrite a real price.
    return {
      fields: {
        name: scraped.name || parsed.name || "",
        brand: scraped.brand || parsed.brand || "",
        price: scraped.price || parsed.price || "",
        image: scraped.image || "",
        notes: scraped.notes || parsed.notes || "",
      },
      used: true,
      reason: "ok",
    };
  } catch (err) {
    console.error("[e-brain.os] enrichment failed", err?.message || err);
    return { fields: scraped, used: false, reason: "error" };
  }
}
