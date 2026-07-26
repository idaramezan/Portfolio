import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { pool } from "@workspace/db";
import {
  CONTACT_EMAIL,
  emailShell,
  escapeHtml,
  OWNER_EMAIL,
  sendEmail,
  sendEmailBatch,
} from "../lib/email";
import { attributeSubscriber } from "./analytics";

const router = Router();
const ISTANBUL_EVENT_CAMPAIGN = "istanbul-painting-day-2026-08-04";
const ISTANBUL_EVENT_DEADLINE = new Date("2026-08-05T13:00:00.000Z");
const ISTANBUL_EVENT_CAPACITY = 11;
const ISTANBUL_EVENT_FEE_TRY = 150;

function requireAdmin(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const expected =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expected || request.headers["x-admin-password"] !== expected)
    return response
      .status(401)
      .json({ error: "Admin authentication required" });
  return next();
}

async function ensureDeliveryColumns() {
  await pool.query(`
    ALTER TABLE newsletter_subscribers
      ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS owner_notification_sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS welcome_email_version INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS source TEXT,
      ADD COLUMN IF NOT EXISTS locale TEXT,
      ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT
  `);
  await pool.query(`
    UPDATE newsletter_subscribers
    SET unsubscribe_token = md5(random()::text || clock_timestamp()::text || id::text)
    WHERE unsubscribe_token IS NULL
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS newsletter_unsubscribe_token_idx
    ON newsletter_subscribers (unsubscribe_token)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_campaigns (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      preheader TEXT,
      blocks JSONB NOT NULL,
      status TEXT NOT NULL,
      recipient_count INTEGER NOT NULL DEFAULT 0,
      sent_count INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    )
  `);
  await pool.query(
    `ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS rendered_html TEXT`,
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      preheader TEXT,
      blocks JSONB NOT NULL,
      is_starter BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `ALTER TABLE newsletter_templates ADD COLUMN IF NOT EXISTS document_version INTEGER NOT NULL DEFAULT 1`,
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_event_interests (
      id BIGSERIAL PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      subscriber_id INTEGER NOT NULL REFERENCES newsletter_subscribers(id),
      email TEXT NOT NULL,
      is_free BOOLEAN NOT NULL DEFAULT FALSE,
      event_email_sent_at TIMESTAMPTZ,
      email_delivery_status TEXT NOT NULL DEFAULT 'pending',
      email_delivery_error TEXT,
      subscriber_status TEXT NOT NULL DEFAULT 'existing',
      whatsapp_confirmation_status TEXT NOT NULL DEFAULT 'not_contacted',
      reservation_status TEXT NOT NULL DEFAULT 'interest',
      seat_count INTEGER NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (campaign_id, email)
    )
  `);
  await pool.query(`
    ALTER TABLE newsletter_event_interests
      ADD COLUMN IF NOT EXISTS email_delivery_status TEXT NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS email_delivery_error TEXT,
      ADD COLUMN IF NOT EXISTS subscriber_status TEXT NOT NULL DEFAULT 'existing',
      ADD COLUMN IF NOT EXISTS whatsapp_confirmation_status TEXT NOT NULL DEFAULT 'not_contacted',
      ADD COLUMN IF NOT EXISTS reservation_status TEXT NOT NULL DEFAULT 'interest',
      ADD COLUMN IF NOT EXISTS seat_count INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_template_revisions (
      id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES newsletter_templates(id) ON DELETE CASCADE,
      subject TEXT NOT NULL, preheader TEXT, blocks JSONB NOT NULL,
      document_version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS featured_studio_letter_config (
      id TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE,
      template_id TEXT REFERENCES newsletter_templates(id) ON DELETE SET NULL,
      template_revision_id TEXT REFERENCES newsletter_template_revisions(id) ON DELETE SET NULL,
      public_eyebrow TEXT, public_title_override TEXT, public_metadata_override TEXT,
      preview_image_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      preview_word_count INTEGER NOT NULL DEFAULT 65,
      show_on_homepage BOOLEAN NOT NULL DEFAULT TRUE, show_on_turkiye_shop BOOLEAN NOT NULL DEFAULT TRUE,
      show_on_international_shop BOOLEAN NOT NULL DEFAULT FALSE, start_at TIMESTAMPTZ, end_at TIMESTAMPTZ,
      timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO featured_studio_letter_config (id) VALUES ('primary') ON CONFLICT (id) DO NOTHING;
    CREATE TABLE IF NOT EXISTS featured_studio_letter_deliveries (
      subscriber_id INTEGER NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
      template_revision_id TEXT NOT NULL REFERENCES newsletter_template_revisions(id) ON DELETE CASCADE,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (subscriber_id, template_revision_id)
    )
  `);
}

type CampaignBlock =
  | {
      id?: string;
      type: "text";
      text: string;
      size?: "small" | "normal" | "large" | "heading";
      align?: "left" | "center";
      bold?: boolean;
      italic?: boolean;
      linkUrl?: string;
      linkText?: string;
    }
  | {
      id?: string;
      type: "image" | "photograph";
      url: string;
      alt?: string;
      linkUrl?: string;
      caption?: string;
      decorative?: boolean;
      width?: number;
      align?: "left" | "center" | "right";
      style?: "studio-photograph" | "clean" | "borderless";
    }
  | {
      id?: string;
      type: "photo-row";
      columns: 2 | 3;
      ratios: number[];
      gap: 8 | 16 | 24;
      photos: Array<{
        url: string;
        alt?: string;
        caption?: string;
        linkUrl?: string;
        decorative?: boolean;
        style?: "studio-photograph" | "clean" | "borderless";
      }>;
    }
  | {
      id?: string;
      type: "product-card";
      productId: string;
      market?: "turkiye" | "international" | "mixed";
      layout?: "featured" | "vertical" | "horizontal";
      showPrice?: boolean;
      showDescription?: boolean;
      showProductType?: boolean;
      showAvailability?: boolean;
      customEyebrow?: string;
      customDescription?: string;
      ctaText?: string;
      utmCampaign?: string;
      utmContent?: string;
    }
  | {
      id?: string;
      type: "product-row";
      columns: 2 | 3;
      ratios: number[];
      gap: 8 | 16 | 24;
      products: Array<{
        productId: string;
        market?: "turkiye" | "international" | "mixed";
        showPrice?: boolean;
        showDescription?: boolean;
        showProductType?: boolean;
        ctaText?: string;
      }>;
    }
  | { id?: string; type: "button"; text: string; url: string }
  | { id?: string; type: "divider" }
  | { id?: string; type: "spacer"; height?: number }
  | { id?: string; type: "heading"; text: string; align?: "left" | "center" };

function safeUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function publicUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 2000)
    return null;
  if (value.startsWith("/")) {
    const site = (
      process.env.PUBLIC_SITE_URL || "https://www.aedaart.com"
    ).replace(/\/$/, "");
    return `${site}${value}`;
  }
  return safeUrl(value);
}

function storyText(blocks: CampaignBlock[]) {
  return blocks
    .filter((block) => block.type === "text" || block.type === "heading")
    .map((block) => String("text" in block ? block.text : "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function templateImages(blocks: CampaignBlock[]) {
  const images: Array<{
    id: string;
    url: string;
    alt: string;
    caption: string;
  }> = [];
  blocks.forEach((block, blockIndex) => {
    if (block.type === "image" || block.type === "photograph") {
      const url = publicUrl(block.url);
      if (url)
        images.push({
          id: block.id || `image-${blockIndex}`,
          url,
          alt: block.alt || "Photograph from Aida’s studio",
          caption: block.caption || "",
        });
    } else if (block.type === "photo-row") {
      block.photos.forEach((photo, photoIndex) => {
        const url = publicUrl(photo.url);
        if (url)
          images.push({
            id: `${block.id || `row-${blockIndex}`}-${photoIndex}`,
            url,
            alt: photo.alt || "Photograph from Aida’s studio",
            caption: photo.caption || "",
          });
      });
    }
  });
  return images;
}

async function eligibleTemplate(template: any) {
  const campaign = validateCampaign(template);
  const text = storyText(campaign.blocks);
  const images = templateImages(campaign.blocks);
  if (text.split(/\s+/).filter(Boolean).length < 20)
    throw new Error(
      "The letter needs at least 20 words of readable story text",
    );
  if (!images.length)
    throw new Error("The letter needs at least one permanent image");
  const rawUrls = JSON.stringify(campaign.blocks);
  if (/blob:|file:\/\/|(?:[A-Za-z]:\\|\/(?:Users|home|tmp)\/)/i.test(rawUrls))
    throw new Error("The letter contains temporary or local media");
  await renderCampaignBlocks(campaign.blocks);
  return { campaign, text, images };
}

function validateCampaign(body: unknown) {
  const value = body as Record<string, unknown>;
  const subject =
    typeof value?.subject === "string" ? value.subject.trim() : "";
  const preheader =
    typeof value?.preheader === "string" ? value.preheader.trim() : "";
  const blocks = Array.isArray(value?.blocks) ? value.blocks : [];
  if (!subject || subject.length > 200)
    throw new Error("Subject is required and must be under 200 characters");
  if (preheader.length > 300)
    throw new Error("Preview text must be under 300 characters");
  if (!blocks.length || blocks.length > 40)
    throw new Error("Add between 1 and 40 email blocks");
  const supported = new Set([
    "text",
    "heading",
    "image",
    "photograph",
    "button",
    "divider",
    "spacer",
    "photo-row",
    "product-card",
    "product-row",
  ]);
  for (const block of blocks as any[]) {
    if (!block || typeof block !== "object" || !supported.has(block.type))
      throw new Error(
        `Unsupported email block: ${String(block?.type || "unknown")}`,
      );
    if (
      block.id != null &&
      (typeof block.id !== "string" || block.id.length > 100)
    )
      throw new Error("Email block IDs must be valid strings");
  }
  return {
    version: Number(value.version) === 2 ? 2 : 1,
    subject,
    preheader,
    blocks: blocks as CampaignBlock[],
  };
}

function framedImage(photo: any, width = "100%", rotation = 0) {
  const url = publicUrl(photo.url || photo.imageUrl);
  if (!url)
    throw new Error("Every photograph needs a valid HTTPS image address");
  const altText = photo.decorative
    ? ""
    : String(
        photo.alt ||
          photo.altText ||
          photo.caption ||
          "Photograph from Aida’s studio",
      ).trim();
  const style = photo.style || "studio-photograph";
  const frame =
    style === "studio-photograph"
      ? `padding:10px 10px 24px;background:#fffdf7;border:1px solid rgba(91,77,58,.22);box-shadow:0 10px 22px rgba(54,43,29,.10),0 2px 5px rgba(54,43,29,.06);transform:rotate(${rotation}deg)`
      : style === "clean"
        ? "border:1px solid #cbbb9f"
        : "";
  const image = `<table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" style="width:${width};${frame}"><tr><td><img src="${escapeHtml(url)}" alt="${escapeHtml(altText)}" style="display:block;width:100%;max-width:100%;height:auto" /></td></tr>${photo.caption ? `<tr><td style="padding-top:8px;font-size:12px;line-height:1.4;color:#75695d">${escapeHtml(photo.caption)}</td></tr>` : ""}</table>`;
  const link = safeUrl(photo.linkUrl);
  return link
    ? `<a href="${escapeHtml(link)}" style="text-decoration:none">${image}</a>`
    : image;
}

async function productCatalog() {
  const result = await pool.query(
    "SELECT payload FROM shop_settings WHERE id='primary' LIMIT 1",
  );
  const settings = result.rows[0]?.payload || {};
  return [
    ...(settings.originalProducts || []),
    ...(settings.printProducts || []),
    ...(settings.studioMailPackages || []),
  ];
}

function productMarkup(item: any, catalog: any[], width = "100%") {
  const product = catalog.find((entry) => entry.id === item.productId);
  if (!product) throw new Error("A linked product no longer exists");
  if (["draft", "archived"].includes(product.status))
    throw new Error(`${product.name || product.title} is not published`);
  const title = product.name || product.title;
  const imageUrl = publicUrl(product.imageUrl || product.coverImage);
  if (!imageUrl) throw new Error(`${title} needs a public product image`);
  const market = item.market || "mixed";
  const slug = product.slug || product.id;
  const base =
    market === "international"
      ? `https://www.aedaart.com/shop/international`
      : product.kind === "original"
        ? `https://www.aedaart.com/shop/turkiye/originals/${encodeURIComponent(slug)}`
        : `https://www.aedaart.com/shop/turkiye/prints?product=${encodeURIComponent(product.id)}`;
  const url = new URL(base);
  url.searchParams.set("utm_source", "studio_letter");
  url.searchParams.set("utm_medium", "email");
  if (item.utmCampaign) url.searchParams.set("utm_campaign", item.utmCampaign);
  if (item.utmContent) url.searchParams.set("utm_content", item.utmContent);
  const available =
    product.available !== false &&
    !["sold", "sold_out"].includes(product.status) &&
    Number(product.inventory ?? 1) > 0;
  const priceMinor = product.priceMinor ?? product.priceUsdCents;
  const currency =
    product.priceCurrency || (market === "international" ? "USD" : "TRY");
  const price =
    item.showPrice === false || market === "mixed"
      ? ""
      : new Intl.NumberFormat(market === "turkiye" ? "tr-TR" : "en-US", {
          style: "currency",
          currency,
        }).format(Number(priceMinor || 0) / 100);
  const description =
    item.customDescription ||
    product.description ||
    product.shortDescription ||
    "";
  const cta = item.ctaText || (available ? "View product" : "View the artwork");
  const image = `<a href="${escapeHtml(url.toString())}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" width="560" style="display:block;width:100%;max-width:100%;height:auto" /></a>`;
  const info = `${item.showProductType === false ? "" : `<p style="margin:0 0 7px;color:#a44938;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">${escapeHtml(item.customEyebrow || product.category || product.kind || "From the studio")}</p>`}<h3 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;line-height:1.2">${escapeHtml(title)}</h3>${item.showDescription === false || !description ? "" : `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#5f554b">${escapeHtml(description)}</p>`}${price ? `<p style="margin:0 0 12px;font-weight:700">${escapeHtml(price)}</p>` : ""}${!available ? `<p style="margin:0 0 12px;color:#a44938;font-weight:700">${product.kind === "original" ? "Sold" : "Sold out"}</p>` : ""}<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#a44938" style="background:#a44938"><a href="${escapeHtml(url.toString())}" style="display:inline-block;padding:12px 18px;color:#fffaf1;text-decoration:none;font-weight:700">${escapeHtml(cta)}</a></td></tr></table>`;
  if (item.layout === "featured" || item.layout === "horizontal") {
    const imageWidth = item.layout === "featured" ? 58 : 36;
    return `<table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" style="width:${width};background:#fffaf1;border:1px solid #cbbb9f" class="email-row"><tr><td class="email-column" width="${imageWidth}%" valign="middle" style="padding:12px">${image}</td><td class="email-column" width="${100 - imageWidth}%" valign="middle" style="padding:18px">${info}</td></tr></table>`;
  }
  return `<table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" style="width:${width};background:#fffaf1;border:1px solid #cbbb9f"><tr><td style="padding:12px">${image}</td></tr><tr><td style="padding:8px 16px 18px">${info}</td></tr></table>`;
}

async function renderCampaignBlocks(blocks: CampaignBlock[]) {
  const needsProducts = blocks.some(
    (block) => block.type === "product-card" || block.type === "product-row",
  );
  const catalog = needsProducts ? await productCatalog() : [];
  const responsiveStyles = `<style>@media only screen and (max-width:620px){.email-row,.email-row tbody,.email-row tr{display:block!important;width:100%!important}.email-column{display:block!important;width:100%!important;box-sizing:border-box!important}}</style>`;
  const rendered = (
    await Promise.all(
      blocks.map(async (block) => {
        if (!block || typeof block !== "object")
          throw new Error("Invalid email block");
        if (block.type === "divider")
          return '<hr style="border:0;border-top:1px solid #cbbb9f;margin:26px 0">';
        if (block.type === "spacer")
          return `<div style="height:${Math.max(8, Math.min(80, Number(block.height || 24)))}px;line-height:1px">&nbsp;</div>`;
        if (block.type === "heading")
          return `<h2 style="margin:0 0 18px;font-family:Georgia,serif;font-size:30px;line-height:1.25;text-align:${block.align === "center" ? "center" : "left"}">${escapeHtml(block.text || "")}</h2>`;
        if (block.type === "image" || block.type === "photograph") {
          const width = Math.max(20, Math.min(100, Number(block.width || 100)));
          const align =
            block.align === "left"
              ? "left"
              : block.align === "right"
                ? "right"
                : "center";
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0"><tr><td align="${align}">${framedImage(block, `${width}%`, -0.45)}</td></tr></table>`;
        }
        if (block.type === "photo-row") {
          const photos = (block as any).photos || (block as any).images || [];
          if (
            ![2, 3].includes(block.columns) ||
            photos.length !== block.columns
          )
            throw new Error("Every photo-row slot needs a photograph");
          const ratios =
            block.ratios.length === block.columns
              ? block.ratios
              : Array(block.columns).fill(100 / block.columns);
          if (Math.abs(ratios.reduce((a, b) => a + Number(b), 0) - 100) > 1)
            throw new Error("Photo-row ratios must total 100%");
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-row" style="margin:28px 0"><tr>${photos.map((photo: any, index: number) => `<td class="email-column" width="${ratios[index]}%" valign="top" style="padding:${Number(block.gap || 16) / 2}px;${index % 2 === 0 ? "padding-top:3px" : "padding-bottom:3px"}">${framedImage(photo, "100%", Number(photo.rotation ?? (index % 2 === 0 ? -0.8 : 0.65)))}</td>`).join("")}</tr></table>`;
        }
        if (block.type === "product-card")
          return `<div style="margin:24px 0">${productMarkup(block, catalog)}</div>`;
        if (block.type === "product-row") {
          if (
            ![2, 3].includes(block.columns) ||
            block.products.length !== block.columns
          )
            throw new Error("Every product-row slot needs a product");
          const ratios =
            block.ratios.length === block.columns
              ? block.ratios
              : Array(block.columns).fill(100 / block.columns);
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-row"><tr>${block.products.map((product, index) => `<td class="email-column" width="${ratios[index]}%" valign="top" style="padding:${Number(block.gap || 16) / 2}px">${productMarkup({ ...product, layout: "vertical" }, catalog)}</td>`).join("")}</tr></table>`;
        }
        if (block.type === "button") {
          const url = safeUrl(block.url);
          if (!url || !block.text?.trim())
            throw new Error("Every button needs text and a valid link");
          return `<p style="margin:24px 0;text-align:center"><a href="${escapeHtml(url)}" style="display:inline-block;background:#a44938;color:#fffaf1;padding:13px 22px;text-decoration:none;font-weight:700">${escapeHtml(block.text.trim())}</a></p>`;
        }
        if (block.type === "text") {
          if (typeof block.text !== "string" || block.text.length > 5000)
            throw new Error("Text blocks must be under 5,000 characters");
          const sizes = { small: 13, normal: 16, large: 20, heading: 30 };
          const size = sizes[block.size || "normal"] || sizes.normal;
          const align = block.align === "center" ? "center" : "left";
          const weight = block.bold ? "700" : "400";
          const style = block.italic ? "italic" : "normal";
          const text = escapeHtml(block.text).replaceAll("\n", "<br>");
          const link = safeUrl(block.linkUrl);
          const linkText = block.linkText?.trim();
          const linked =
            link && linkText
              ? `${text}<br><a href="${escapeHtml(link)}" style="color:#a44938;text-decoration:underline">${escapeHtml(linkText)}</a>`
              : text;
          return `<p style="margin:0 0 18px;font-size:${size}px;line-height:1.7;text-align:${align};font-weight:${weight};font-style:${style}">${linked}</p>`;
        }
        throw new Error("Unsupported email block");
      }),
    )
  ).join("");
  return responsiveStyles + rendered;
}

const starterTemplates = [
  {
    id: "starter-blank",
    name: "Blank Studio Letter",
    subject: "A note from Aida’s studio",
    preheader: "A new Studio Letter from Aida",
    blocks: [
      { type: "text", text: "Hello, art lover!", size: "large" },
      {
        type: "text",
        text: "Write your Studio Letter here. Add more text, artwork, links or a button using the editor.",
        size: "normal",
      },
    ],
  },
  {
    id: "starter-welcome",
    name: "Art Club welcome",
    subject: "You’re officially in Aida’s Art Club ✨",
    preheader: "Welcome to Aida’s creative world",
    blocks: [
      { type: "text", text: "Hello, art lover!", size: "large" },
      {
        type: "text",
        text: "I'm so happy you're here. ❤️ Welcome to the Art Club!",
        size: "normal",
      },
      {
        type: "text",
        text: "This little community means a lot to me, and I'm excited to share more of my creative world with you. You'll get early access to new paintings, behind-the-scenes moments from my studio, exclusive offers, and the occasional surprise; things I don't share anywhere else.",
        size: "normal",
      },
      {
        type: "text",
        text: "More than anything, thank you for supporting independent artists. Every print, painting, message, and subscription helps me keep creating, and I'm truly grateful that you've chosen to be part of this journey.",
        size: "normal",
      },
    ],
  },
  {
    id: "starter-artwork",
    name: "New artwork announcement",
    subject: "A new painting has left the studio walls",
    preheader: "See Aida’s newest original before it is shared elsewhere",
    blocks: [
      { type: "text", text: "Hello, art lover!", size: "large" },
      {
        type: "text",
        text: "I’ve just finished a new painting and wanted you to be among the first to see it.",
        size: "normal",
      },
      { type: "divider" },
      {
        type: "button",
        text: "See the new artwork",
        url: "https://www.aedaart.com/shop/turkiye/originals",
      },
    ],
  },
  {
    id: "starter-story",
    name: "Story from the studio",
    subject: "A small story from my Istanbul studio",
    preheader: "The memory and process behind a painting",
    blocks: [
      { type: "text", text: "A story from the studio", size: "heading" },
      {
        type: "text",
        text: "Hello, art lover! Today I wanted to share the moment behind one of my paintings.",
        size: "normal",
      },
      {
        type: "text",
        text: "Write the story here, then add the painting and any related photograph with the image button.",
        size: "normal",
      },
    ],
  },
  {
    id: "starter-offer",
    name: "Limited studio offer",
    subject: "A private offer for the Art Club",
    preheader: "A limited studio release shared with subscribers first",
    blocks: [
      {
        type: "text",
        text: "A little something, just for the Art Club",
        size: "heading",
      },
      {
        type: "text",
        text: "You’re receiving this first because you’re part of my Studio Letter community.",
        size: "normal",
      },
      {
        type: "button",
        text: "View the private offer",
        url: "https://www.aedaart.com",
      },
    ],
  },
] as const;

async function ensureStarterTemplates() {
  await ensureDeliveryColumns();
  for (const template of starterTemplates) {
    await pool.query(
      `INSERT INTO newsletter_templates
        (id, name, subject, preheader, blocks, is_starter)
       VALUES ($1, $2, $3, $4, $5::jsonb, TRUE)
       ON CONFLICT (id) DO NOTHING`,
      [
        template.id,
        template.name,
        template.subject,
        template.preheader,
        JSON.stringify(template.blocks),
      ],
    );
  }
}

function unsubscribeUrl(token: string) {
  const siteUrl = (
    process.env.PUBLIC_SITE_URL || "https://www.aedaart.com"
  ).replace(/\/$/, "");
  return `${siteUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

async function registerEventInterest(
  subscriberId: number,
  email: string,
  subscriberStatus: "new" | "existing",
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      ISTANBUL_EVENT_CAMPAIGN,
    ]);
    const existing = await client.query(
      `SELECT id, event_email_sent_at, email_delivery_status,
              whatsapp_confirmation_status, reservation_status, subscriber_status
       FROM newsletter_event_interests
       WHERE campaign_id = $1 AND email = $2
       LIMIT 1`,
      [ISTANBUL_EVENT_CAMPAIGN, email],
    );
    if (existing.rows[0]) {
      await client.query("COMMIT");
      return {
        ...existing.rows[0],
        alreadyRegistered: true,
      };
    }
    const inserted = await client.query(
      `INSERT INTO newsletter_event_interests
        (campaign_id, subscriber_id, email, subscriber_status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, event_email_sent_at, email_delivery_status,
                 whatsapp_confirmation_status, reservation_status, subscriber_status`,
      [ISTANBUL_EVENT_CAMPAIGN, subscriberId, email, subscriberStatus],
    );
    await client.query("COMMIT");
    return { ...inserted.rows[0], alreadyRegistered: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const EVENT_EMAIL_PREHEADER =
  "A relaxed girls-only painting afternoon in Istanbul on Wednesday, 5 August at 4 PM.";
const EVENT_WHATSAPP_MESSAGE =
  "Hello Aida, I joined the Studio Letter through the Istanbul painting day invitation. I would love to reserve my place for the event on Wednesday, 5 August 2026 at 4:00 PM.";

async function getEventWhatsappUrl() {
  const result = await pool.query(
    "SELECT payload FROM shop_settings WHERE id = $1 LIMIT 1",
    ["primary"],
  );
  const number = String(
    result.rows[0]?.payload?.whatsapp?.number || "",
  ).replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(number))
    throw new Error("The configured WhatsApp number is missing or invalid");
  return `https://wa.me/${number}?text=${encodeURIComponent(EVENT_WHATSAPP_MESSAGE)}`;
}

function buildPaintingEventInterestEmail(input: {
  whatsappUrl: string;
  unsubscribe: string;
}) {
  const participationHtml = `<p style="margin:0 0 5px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#a44938">Participation fee</p><p style="margin:0;font-size:28px;font-weight:700">150 TL</p><p style="margin:9px 0 0;font-size:15px;line-height:1.65">The fee helps cover tea and snacks.</p>`;
  const detailRows = [
    ["Date", "Wednesday, 5 August 2026"],
    ["Time", "4:00 PM"],
    ["Location", "A park on Istanbul’s European side"],
    ["Exact park and time", "Shared after your place is personally confirmed"],
    ["Who can join", "Girls only"],
    ["Experience needed", "None"],
    ["Format", "A relaxed social painting gathering, not a class"],
    ["Places", "8 places remaining"],
  ]
    .map(
      ([label, value]) =>
        `<tr><th scope="row" style="padding:9px 12px 9px 0;border-bottom:1px solid #ded5c6;text-align:left;vertical-align:top;font-size:13px;color:#75695d">${escapeHtml(label)}</th><td style="padding:9px 0;border-bottom:1px solid #ded5c6;text-align:left;vertical-align:top;font-size:14px;font-weight:600">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const content = `<h1 style="margin:0 0 22px;font-size:31px;line-height:1.2">I’m so happy you’d like to join us.</h1><p style="font-size:16px;line-height:1.7">Thank you for joining the Studio Letter through the Istanbul painting day invitation.</p><p style="font-size:16px;line-height:1.7">On Wednesday, 5 August at 4 PM, I’m bringing together a small group of girls for a relaxed afternoon of painting, conversation, tea and snacks in a park on Istanbul’s European side.</p><p style="font-size:16px;line-height:1.7">You do not need any painting experience. This is not a lesson or workshop. It is simply a chance to create something, meet new people and enjoy a summer day together.</p><table role="presentation" style="width:100%;margin:24px 0;border-collapse:collapse">${detailRows}</table><div style="margin:24px 0;padding:18px;border-left:3px solid #a44938;background:#f3eadb">${participationHtml}</div><p style="font-size:16px;line-height:1.7"><strong>Your email has registered your interest, but it has not reserved a place.</strong></p><p style="font-size:16px;line-height:1.7">Your attendance is confirmed personally by Aida on WhatsApp. The exact park will be shared with confirmed participants.</p><p style="margin:26px 0;text-align:center"><a href="${escapeHtml(input.whatsappUrl)}" style="display:inline-block;background:#a44938;color:#fffaf1;padding:14px 22px;text-decoration:none;font-weight:700">Contact Aida to reserve my place</a></p><p style="margin-top:28px;font-size:16px;line-height:1.7">I’m looking forward to painting together.</p><p style="font-size:16px;line-height:1.7">See you in Istanbul,<br><strong>Aida</strong></p>`;
  const text = `AIDA RAMEZANI · STUDIO LETTER\n\nI’m so happy you’d like to join us.\n\nThank you for joining the Studio Letter through the Istanbul painting day invitation.\n\nOn Wednesday, 5 August at 4 PM, I’m bringing together a small group of girls for a relaxed afternoon of painting, conversation, tea and snacks in a park on Istanbul’s European side.\n\nYou do not need any painting experience. This is not a lesson or workshop. It is simply a chance to create something, meet new people and enjoy a summer day together.\n\nEVENT DETAILS\nDate: Wednesday, 5 August 2026\nTime: 4:00 PM\nLocation: A park on Istanbul’s European side\nExact park: Shared with confirmed participants\nWho can join: Girls only\nExperience needed: None\nFormat: A relaxed social painting gathering, not a class\nPlaces: 8\n\nParticipation fee: 150 TL\nThe fee helps cover tea and snacks.\n\nYour email has registered your interest, but it has not reserved a place.\n\nYour attendance is confirmed personally by Aida on WhatsApp. The exact park will be shared with confirmed participants.\n\nContact Aida to reserve my place:\n${input.whatsappUrl}\n\nI’m looking forward to painting together.\n\nSee you in Istanbul,\nAida\n\nYou received this email because you joined Aida’s Studio Letter through the Istanbul painting day invitation.\nUnsubscribe: ${input.unsubscribe}`;
  return {
    subject: "Your Istanbul painting day details from Aida 🎨",
    html: emailShell(content, {
      preheader: EVENT_EMAIL_PREHEADER,
      unsubscribeUrl: input.unsubscribe,
      headerLabel: "AIDA RAMEZANI · STUDIO LETTER",
      footerNote:
        "You received this email because you joined Aida’s Studio Letter through the Istanbul painting day invitation.",
      showSignature: false,
    }),
    text,
  };
}

async function sendPaintingEventInterestEmail(input: {
  to: string;
  whatsappUrl: string;
  unsubscribe: string;
}) {
  const email = buildPaintingEventInterestEmail(input);
  await sendEmail({
    to: input.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: {
      "List-Unsubscribe": `<${input.unsubscribe}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

async function notifyOwner(email: string, name: string | null) {
  const displayName = name?.trim() || email;
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `New subscriber: ${displayName}`,
    html: emailShell(
      `<h1 style="font-size:28px">A new studio-letter reader</h1><p><strong>${escapeHtml(displayName)}</strong> joined your newsletter.</p><p>Email: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>`,
    ),
  });
}

async function welcomeSubscriber(email: string, name: string | null) {
  await sendEmail({
    to: email,
    subject: "You’re officially in Aida’s Art Club ✨",
    html: emailShell(
      `<p style="font-size:17px">Hello, art lover!</p><p style="font-size:16px;line-height:1.75">I'm so happy you're here. ❤️ Welcome to the Art Club!</p><p style="font-size:16px;line-height:1.75">This little community means a lot to me, and I'm excited to share more of my creative world with you. You'll get early access to new paintings, behind-the-scenes moments from my studio, exclusive offers, and the occasional surprise; things I don't share anywhere else.</p><p style="font-size:16px;line-height:1.75">More than anything, thank you for supporting independent artists. Every print, painting, message, and subscription helps me keep creating, and I'm truly grateful that you've chosen to be part of this journey.</p><p style="font-size:16px;line-height:1.75">I can't wait to share what's coming next.</p>`,
    ),
  });
}

// GET /newsletter/event-status — public availability for the August event banner
router.get("/event-status", async (req, res) => {
  try {
    const campaignId =
      typeof req.query.campaignId === "string" ? req.query.campaignId : "";
    if (campaignId !== ISTANBUL_EVENT_CAMPAIGN)
      return res.status(404).json({ error: "Event campaign not found" });
    await ensureDeliveryColumns();
    const reserved = await pool.query(
      `SELECT COALESCE(SUM(seat_count), 0)::int AS count
       FROM newsletter_event_interests
       WHERE campaign_id = $1 AND reservation_status IN ('confirmed', 'attended')`,
      [ISTANBUL_EVENT_CAMPAIGN],
    );
    const remainingSeats = Math.max(
      0,
      ISTANBUL_EVENT_CAPACITY - Number(reserved.rows[0]?.count || 0),
    );
    return res.json({
      campaignId: ISTANBUL_EVENT_CAMPAIGN,
      active: new Date() < ISTANBUL_EVENT_DEADLINE,
      remainingSeats,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load event campaign status");
    return res.status(500).json({ error: "Event status could not be loaded" });
  }
});

// GET /newsletter/event-interests — protected operational view for Aida
router.get("/event-interests", requireAdmin, async (req, res) => {
  try {
    await ensureDeliveryColumns();
    const result = await pool.query(
      `SELECT id, email, created_at, subscriber_status, is_free, seat_count,
              CASE WHEN is_free THEN 0 ELSE seat_count * $2 END AS participation_fee_try,
              email_delivery_status, whatsapp_confirmation_status,
              reservation_status, updated_at
       FROM newsletter_event_interests
       WHERE campaign_id = $1
       ORDER BY created_at ASC, id ASC`,
      [ISTANBUL_EVENT_CAMPAIGN, ISTANBUL_EVENT_FEE_TRY],
    );
    const reserved = result.rows.reduce(
      (total, registration) =>
        ["confirmed", "attended"].includes(registration.reservation_status)
          ? total + Number(registration.seat_count)
          : total,
      0,
    );
    return res.json({
      registrations: result.rows,
      remainingSeats: Math.max(0, ISTANBUL_EVENT_CAPACITY - reserved),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load event registrations");
    return res
      .status(500)
      .json({ error: "Event registrations could not be loaded" });
  }
});

router.patch("/event-interests/:id", requireAdmin, async (req, res) => {
  try {
    const whatsappStatuses = new Set(["not_contacted", "contacted"]);
    const reservationStatuses = new Set([
      "interest",
      "confirmed",
      "cancelled",
      "attended",
    ]);
    const whatsappStatus = req.body?.whatsappConfirmationStatus;
    const reservationStatus = req.body?.reservationStatus;
    const seatCount = Number(req.body?.seatCount);
    const isFree = req.body?.isFree;
    if (
      !whatsappStatuses.has(whatsappStatus) ||
      !reservationStatuses.has(reservationStatus) ||
      !Number.isInteger(seatCount) ||
      seatCount < 1 ||
      seatCount > ISTANBUL_EVENT_CAPACITY ||
      typeof isFree !== "boolean"
    )
      return res
        .status(400)
        .json({ error: "Valid event statuses are required" });
    await ensureDeliveryColumns();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        ISTANBUL_EVENT_CAMPAIGN,
      ]);
      const otherReserved = await client.query(
        `SELECT COALESCE(SUM(seat_count), 0)::int AS count
       FROM newsletter_event_interests
       WHERE campaign_id = $1 AND id <> $2
         AND reservation_status IN ('confirmed', 'attended')`,
        [ISTANBUL_EVENT_CAMPAIGN, req.params.id],
      );
      const requestedReserved = ["confirmed", "attended"].includes(
        reservationStatus,
      )
        ? seatCount
        : 0;
      if (
        Number(otherReserved.rows[0]?.count || 0) + requestedReserved >
        ISTANBUL_EVENT_CAPACITY
      ) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Not enough places remain for this reservation",
        });
      }
      const result = await client.query(
        `UPDATE newsletter_event_interests
       SET whatsapp_confirmation_status = $2, reservation_status = $3,
           seat_count = $4, is_free = $5,
           updated_at = NOW()
       WHERE id = $1 AND campaign_id = $6
       RETURNING *`,
        [
          req.params.id,
          whatsappStatus,
          reservationStatus,
          seatCount,
          isFree,
          ISTANBUL_EVENT_CAMPAIGN,
        ],
      );
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Event registration not found" });
      }
      const reservedCount =
        Number(otherReserved.rows[0]?.count || 0) + requestedReserved;
      await client.query("COMMIT");
      return res.json({
        registration: {
          ...result.rows[0],
          participation_fee_try: isFree
            ? 0
            : seatCount * ISTANBUL_EVENT_FEE_TRY,
        },
        remainingSeats: Math.max(0, ISTANBUL_EVENT_CAPACITY - reservedCount),
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log.error({ err }, "Failed to update event registration");
    return res
      .status(500)
      .json({ error: "Event registration could not be updated" });
  }
});

router.get("/event-email-preview", requireAdmin, async (req, res) => {
  try {
    const whatsappUrl = await getEventWhatsappUrl();
    const email = buildPaintingEventInterestEmail({
      whatsappUrl,
      unsubscribe: "https://www.aedaart.com/newsletter",
    });
    return res.json({
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to render event email preview");
    return res
      .status(500)
      .json({ error: "Email preview could not be rendered" });
  }
});

// GET /newsletter/subscribers — protected admin subscriber list
router.get("/subscribers", requireAdmin, async (req, res) => {
  try {
    await ensureDeliveryColumns();
    const result = await pool.query(`
      SELECT id, email, name, created_at, welcome_email_sent_at, unsubscribed_at
      FROM newsletter_subscribers
      ORDER BY created_at DESC, id DESC
    `);
    return res.json({
      subscribers: result.rows.map((subscriber) => ({
        id: subscriber.id,
        email: subscriber.email,
        name: subscriber.name,
        subscribedAt: subscriber.created_at,
        welcomeEmailSentAt: subscriber.welcome_email_sent_at,
        unsubscribedAt: subscriber.unsubscribed_at,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load newsletter subscribers");
    return res.status(500).json({ error: "Subscribers could not be loaded" });
  }
});

router.get("/featured-letter", async (req, res) => {
  try {
    await ensureDeliveryColumns();
    const requestedContext =
      typeof req.query.context === "string" ? req.query.context : "newsletter";
    const context =
      requestedContext === "turkiye"
        ? "turkiye-shop"
        : requestedContext === "international"
          ? "international-shop"
          : requestedContext;
    const result = await pool.query(
      `
      SELECT c.*, r.subject, r.blocks
      FROM featured_studio_letter_config c
      LEFT JOIN newsletter_template_revisions r ON r.id = c.template_revision_id
      WHERE c.id = 'primary' AND c.enabled = TRUE
        AND (c.start_at IS NULL OR c.start_at <= NOW()) AND (c.end_at IS NULL OR c.end_at > NOW())
        AND ($1 = 'newsletter' OR $1 = 'home' AND c.show_on_homepage
          OR $1 = 'turkiye-shop' AND c.show_on_turkiye_shop
          OR $1 = 'international-shop' AND c.show_on_international_shop)
      LIMIT 1`,
      [context],
    );
    if (!result.rowCount || !result.rows[0].blocks)
      return res.status(404).json({ error: "No featured Studio Letter" });
    const row = result.rows[0];
    const text = storyText(row.blocks);
    const words = text.split(/\s+/).filter(Boolean);
    const visibleWords = words.slice(0, row.preview_word_count);
    const images = templateImages(row.blocks);
    const selected = Array.isArray(row.preview_image_ids)
      ? row.preview_image_ids
      : [];
    const previewImages = (
      selected.length
        ? selected
            .map((id: string) => images.find((image) => image.id === id))
            .filter(Boolean)
        : images
    ).slice(0, 2);
    return res.json({
      id: row.template_revision_id,
      eyebrow: row.public_eyebrow || "A PREVIEW FROM THE STUDIO",
      title: row.public_title_override || row.subject,
      metadata:
        row.public_metadata_override ||
        `From Aida’s Istanbul Studio · ${Math.max(1, Math.ceil(words.length / 200))} min read`,
      excerpt: visibleWords.join(" "),
      hasMore: words.length > visibleWords.length,
      images: previewImages,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load featured Studio Letter");
    return res
      .status(500)
      .json({ error: "Featured Studio Letter could not be loaded" });
  }
});

router.get("/featured-letter/admin", requireAdmin, async (_req, res) => {
  try {
    await ensureDeliveryColumns();
    const [config, templates] = await Promise.all([
      pool.query(
        "SELECT * FROM featured_studio_letter_config WHERE id = 'primary'",
      ),
      pool.query(
        "SELECT id, name, subject, preheader, blocks, is_starter, document_version, updated_at FROM newsletter_templates ORDER BY updated_at DESC",
      ),
    ]);
    const candidates = await Promise.all(
      templates.rows.map(async (template) => {
        try {
          const valid = await eligibleTemplate(template);
          return {
            ...template,
            eligible: true,
            images: valid.images,
            wordCount: valid.text.split(/\s+/).filter(Boolean).length,
          };
        } catch (error) {
          return {
            id: template.id,
            name: template.name,
            subject: template.subject,
            updated_at: template.updated_at,
            eligible: false,
            reason: error instanceof Error ? error.message : "Invalid template",
          };
        }
      }),
    );
    return res.json({ config: config.rows[0], templates: candidates });
  } catch (err) {
    return res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : "Featured letter settings could not be loaded",
    });
  }
});

router.put("/featured-letter/admin", requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureDeliveryColumns();
    const templateId =
      typeof req.body?.templateId === "string" ? req.body.templateId : null;
    if (!templateId && req.body?.enabled)
      return res
        .status(400)
        .json({ error: "Choose a Studio Letter before enabling the feature" });
    let revisionId: string | null = null;
    let imageIds: string[] = [];
    await client.query("BEGIN");
    if (templateId) {
      const found = await client.query(
        "SELECT * FROM newsletter_templates WHERE id = $1",
        [templateId],
      );
      if (!found.rowCount)
        throw new Error("The selected template no longer exists");
      const valid = await eligibleTemplate(found.rows[0]);
      imageIds = Array.isArray(req.body.previewImageIds)
        ? req.body.previewImageIds
            .filter(
              (id: unknown) =>
                typeof id === "string" &&
                valid.images.some((image) => image.id === id),
            )
            .slice(0, 2)
        : [];
      if (!imageIds.length)
        imageIds = valid.images.slice(0, 2).map((image) => image.id);
      revisionId = crypto.randomUUID();
      await client.query(
        `INSERT INTO newsletter_template_revisions (id, template_id, subject, preheader, blocks, document_version) VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
        [
          revisionId,
          templateId,
          valid.campaign.subject,
          valid.campaign.preheader || null,
          JSON.stringify(valid.campaign.blocks),
          valid.campaign.version,
        ],
      );
    }
    const count = Math.max(
      20,
      Math.min(180, Number(req.body?.previewWordCount || 65)),
    );
    const clean = (value: unknown, max: number) =>
      typeof value === "string" && value.trim()
        ? value.trim().slice(0, max)
        : null;
    const result = await client.query(
      `UPDATE featured_studio_letter_config SET
      enabled=$1, template_id=$2, template_revision_id=$3, public_eyebrow=$4, public_title_override=$5,
      public_metadata_override=$6, preview_image_ids=$7::jsonb, preview_word_count=$8,
      show_on_homepage=$9, show_on_turkiye_shop=$10, show_on_international_shop=$11,
        start_at=CASE WHEN $12::text IS NULL THEN NULL ELSE $12::timestamp AT TIME ZONE $14 END,
        end_at=CASE WHEN $13::text IS NULL THEN NULL ELSE $13::timestamp AT TIME ZONE $14 END,
        timezone=$14, updated_at=NOW() WHERE id='primary' RETURNING *`,
      [
        Boolean(req.body?.enabled),
        templateId,
        revisionId,
        clean(req.body?.publicEyebrow, 100),
        clean(req.body?.publicTitleOverride, 200),
        clean(req.body?.publicMetadataOverride, 200),
        JSON.stringify(imageIds),
        count,
        req.body?.showOnHomepage !== false,
        req.body?.showOnTurkiyeShop !== false,
        Boolean(req.body?.showOnInternationalShop),
        req.body?.startAt || null,
        req.body?.endAt || null,
        clean(req.body?.timezone, 80) || "Europe/Istanbul",
      ],
    );
    await client.query("COMMIT");
    return res.json({ config: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    return res.status(400).json({
      error:
        err instanceof Error
          ? err.message
          : "Featured Studio Letter could not be saved",
    });
  } finally {
    client.release();
  }
});

// Reusable bulk-email templates. All content still renders inside emailShell.
router.get("/templates", requireAdmin, async (req, res) => {
  try {
    await ensureStarterTemplates();
    const result = await pool.query(`
      SELECT id, name, subject, preheader, blocks, is_starter, document_version, created_at, updated_at
      FROM newsletter_templates
      ORDER BY is_starter DESC, updated_at DESC, name
    `);
    return res.json({ templates: result.rows });
  } catch (err) {
    req.log.error({ err }, "Failed to load newsletter templates");
    return res.status(500).json({ error: "Templates could not be loaded" });
  }
});

router.post("/templates", requireAdmin, async (req, res) => {
  try {
    await ensureStarterTemplates();
    const campaign = validateCampaign(req.body);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 120)
      return res.status(400).json({ error: "Template name is required" });
    const result = await pool.query(
      `INSERT INTO newsletter_templates
        (id, name, subject, preheader, blocks, document_version)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING *`,
      [
        crypto.randomUUID(),
        name,
        campaign.subject,
        campaign.preheader || null,
        JSON.stringify(campaign.blocks),
        campaign.version,
      ],
    );
    return res.status(201).json({ template: result.rows[0] });
  } catch (err) {
    req.log.error({ err }, "Failed to create newsletter template");
    return res.status(400).json({
      error:
        err instanceof Error ? err.message : "Template could not be created",
    });
  }
});

router.put("/templates/:id", requireAdmin, async (req, res) => {
  try {
    await ensureStarterTemplates();
    const campaign = validateCampaign(req.body);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 120)
      return res.status(400).json({ error: "Template name is required" });
    const result = await pool.query(
      `UPDATE newsletter_templates
       SET name = $2, subject = $3, preheader = $4, blocks = $5::jsonb, document_version = $6,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        name,
        campaign.subject,
        campaign.preheader || null,
        JSON.stringify(campaign.blocks),
        campaign.version,
      ],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Template not found" });
    return res.json({ template: result.rows[0] });
  } catch (err) {
    req.log.error({ err }, "Failed to update newsletter template");
    return res.status(400).json({
      error: err instanceof Error ? err.message : "Template could not be saved",
    });
  }
});

router.delete("/templates/:id", requireAdmin, async (req, res) => {
  try {
    await ensureStarterTemplates();
    const result = await pool.query(
      "DELETE FROM newsletter_templates WHERE id = $1 AND is_starter = FALSE RETURNING id",
      [req.params.id],
    );
    if (!result.rowCount)
      return res.status(400).json({
        error:
          "Starter templates cannot be deleted. Duplicate one to customize it.",
      });
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete newsletter template");
    return res.status(500).json({ error: "Template could not be deleted" });
  }
});

// GET /newsletter/campaigns — recent sends for the admin composer
router.get("/campaigns", requireAdmin, async (req, res) => {
  try {
    await ensureDeliveryColumns();
    const result = await pool.query(`
      SELECT id, subject, status, recipient_count, sent_count, error, created_at, sent_at
      FROM newsletter_campaigns
      ORDER BY created_at DESC
      LIMIT 12
    `);
    return res.json({ campaigns: result.rows });
  } catch (err) {
    req.log.error({ err }, "Failed to load newsletter campaigns");
    return res
      .status(500)
      .json({ error: "Campaign history could not be loaded" });
  }
});

// POST /newsletter/campaigns/test — send the formatted draft only to Aida
router.post("/campaigns/preview", requireAdmin, async (req, res) => {
  try {
    const campaign = validateCampaign(req.body);
    const content = await renderCampaignBlocks(campaign.blocks);
    return res.json({
      html: emailShell(content, {
        preheader: campaign.preheader,
        unsubscribeUrl: "https://www.aedaart.com/newsletter",
      }),
    });
  } catch (err) {
    return res.status(400).json({
      error:
        err instanceof Error ? err.message : "Preview could not be rendered",
    });
  }
});

router.post("/campaigns/test", requireAdmin, async (req, res) => {
  try {
    const campaign = validateCampaign(req.body);
    const content = await renderCampaignBlocks(campaign.blocks);
    const requestedEmail =
      typeof req.body?.testEmail === "string"
        ? req.body.testEmail.trim().toLowerCase()
        : CONTACT_EMAIL;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail))
      return res.status(400).json({ error: "A valid test email is required" });
    await sendEmail({
      to: requestedEmail,
      subject: `[TEST] ${campaign.subject}`,
      html: emailShell(content, { preheader: campaign.preheader }),
    });
    return res.json({ ok: true, sentTo: requestedEmail });
  } catch (err) {
    req.log.error({ err }, "Failed to send newsletter test");
    return res.status(400).json({
      error:
        err instanceof Error ? err.message : "Test email could not be sent",
    });
  }
});

// POST /newsletter/campaigns/send — send one private, unsubscribe-enabled email per active subscriber
router.post("/campaigns/send", requireAdmin, async (req, res) => {
  const campaignId = crypto.randomUUID();
  let sentCount = 0;
  try {
    if (req.body?.confirmation !== "SEND")
      return res
        .status(400)
        .json({ error: "Type SEND to confirm the campaign" });
    const campaign = validateCampaign(req.body);
    const content = await renderCampaignBlocks(campaign.blocks);
    await ensureDeliveryColumns();
    const requestedIds = Array.isArray(req.body?.recipientIds)
      ? req.body.recipientIds
          .map(Number)
          .filter((value: number) => Number.isInteger(value) && value > 0)
      : null;
    if (Array.isArray(req.body?.recipientIds) && !requestedIds?.length)
      return res
        .status(400)
        .json({ error: "Select at least one active subscriber" });
    const subscribers = requestedIds
      ? await pool.query(
          `SELECT id, email, unsubscribe_token
           FROM newsletter_subscribers
           WHERE unsubscribed_at IS NULL AND id = ANY($1::int[])
           ORDER BY id`,
          [requestedIds],
        )
      : await pool.query(`
          SELECT id, email, unsubscribe_token
          FROM newsletter_subscribers
          WHERE unsubscribed_at IS NULL
          ORDER BY id
        `);
    if (!subscribers.rowCount)
      return res.status(400).json({ error: "There are no active subscribers" });
    await pool.query(
      `INSERT INTO newsletter_campaigns
        (id, subject, preheader, blocks, status, recipient_count, rendered_html)
       VALUES ($1, $2, $3, $4::jsonb, 'sending', $5, $6)`,
      [
        campaignId,
        campaign.subject,
        campaign.preheader || null,
        JSON.stringify(campaign.blocks),
        subscribers.rowCount,
        emailShell(content, { preheader: campaign.preheader }),
      ],
    );
    for (let index = 0; index < subscribers.rows.length; index += 100) {
      const batch = subscribers.rows.slice(index, index + 100);
      await sendEmailBatch(
        batch.map((subscriber) => {
          const unsubscribe = unsubscribeUrl(subscriber.unsubscribe_token);
          return {
            to: subscriber.email,
            subject: campaign.subject,
            html: emailShell(content, {
              preheader: campaign.preheader,
              unsubscribeUrl: unsubscribe,
            }),
            headers: {
              "List-Unsubscribe": `<${unsubscribe}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          };
        }),
        `${campaignId}-${index / 100}`,
      );
      sentCount += batch.length;
      await pool.query(
        "UPDATE newsletter_campaigns SET sent_count = $2 WHERE id = $1",
        [campaignId, sentCount],
      );
    }
    await pool.query(
      "UPDATE newsletter_campaigns SET status = 'sent', sent_at = NOW() WHERE id = $1",
      [campaignId],
    );
    return res.json({ ok: true, campaignId, sentCount });
  } catch (err) {
    req.log.error(
      { err, campaignId, sentCount },
      "Failed to send newsletter campaign",
    );
    await pool
      .query(
        "UPDATE newsletter_campaigns SET status = 'failed', sent_count = $2, error = $3 WHERE id = $1",
        [
          campaignId,
          sentCount,
          err instanceof Error ? err.message.slice(0, 1000) : "Unknown error",
        ],
      )
      .catch(() => undefined);
    return res.status(502).json({
      error:
        err instanceof Error
          ? err.message
          : "Newsletter campaign could not be sent",
      sentCount,
    });
  }
});

async function unsubscribe(req: Request, res: Response) {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) return res.status(400).send("Invalid unsubscribe link");
    await ensureDeliveryColumns();
    const result = await pool.query(
      `UPDATE newsletter_subscribers
       SET unsubscribed_at = COALESCE(unsubscribed_at, NOW())
       WHERE unsubscribe_token = $1
       RETURNING email`,
      [token],
    );
    if (!result.rowCount)
      return res.status(404).send("Unsubscribe link not found");
    if (req.method === "POST") return res.status(200).send("");
    return res
      .status(200)
      .type("html")
      .send(
        '<!doctype html><html><body style="margin:0;background:#e9e0cf;color:#342d25;font-family:Arial,sans-serif"><main style="max-width:560px;margin:80px auto;background:#fffaf1;border:1px solid #cbbb9f;padding:40px"><h1>You have been unsubscribed.</h1><p>You will no longer receive Studio Letter campaigns.</p><p><a href="https://www.aedaart.com" style="color:#a44938">Return to Aida’s website</a></p></main></body></html>',
      );
  } catch (err) {
    req.log.error({ err }, "Failed to unsubscribe newsletter reader");
    return res.status(500).send("Your request could not be completed");
  }
}

router.get("/unsubscribe", unsubscribe);
router.post("/unsubscribe", unsubscribe);

// POST /newsletter
router.post("/", async (req, res) => {
  try {
    const { email, name } = req.body;
    const eventInterest =
      req.body?.eventInterest === true ||
      req.body?.source === "istanbul-painting-day-august-2026" ||
      req.body?.campaignId === ISTANBUL_EVENT_CAMPAIGN;
    if (
      eventInterest &&
      req.body?.campaignId !== ISTANBUL_EVENT_CAMPAIGN &&
      req.body?.source !== "istanbul-painting-day-august-2026"
    )
      return res
        .status(400)
        .json({ error: "Valid event campaign is required" });
    if (eventInterest && req.body?.consentToStudioLetter !== true)
      return res.status(400).json({ error: "Valid event consent is required" });
    if (eventInterest && new Date() >= ISTANBUL_EVENT_DEADLINE)
      return res.status(410).json({ error: "This event campaign has ended" });

    if (
      !email ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    await ensureDeliveryColumns();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName =
      typeof name === "string" && name.trim() ? name.trim() : null;
    const allowedSources = new Set([
      "homepage",
      "turkiye-shop",
      "international-shop",
      "mystery-mail",
      "newsletter-page",
      "istanbul-painting-day-august-2026",
      "footer",
    ]);
    const source = allowedSources.has(req.body?.source)
      ? req.body.source
      : null;
    const locale = req.body?.locale === "tr" ? "tr" : "en";
    const result = await pool.query(
      `INSERT INTO newsletter_subscribers (email, name, source, locale)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET name = COALESCE(newsletter_subscribers.name, EXCLUDED.name),
           source = COALESCE(newsletter_subscribers.source, EXCLUDED.source),
           locale = COALESCE(newsletter_subscribers.locale, EXCLUDED.locale),
           unsubscribed_at = NULL
       RETURNING id, email, name, created_at, welcome_email_sent_at, owner_notification_sent_at, welcome_email_version, unsubscribe_token, (xmax <> 0) AS already_subscribed`,
      [normalizedEmail, normalizedName, source, locale],
    );
    const subscriber = result.rows[0];

    const requestedFeaturedRevision =
      typeof req.body?.featuredLetterRevisionId === "string"
        ? req.body.featuredLetterRevisionId
        : null;

    await attributeSubscriber({
      subscriberId: subscriber.id,
      visitorUuid:
        typeof req.body?.analyticsVisitorId === "string"
          ? req.body.analyticsVisitorId
          : undefined,
      sessionUuid:
        typeof req.body?.analyticsSessionId === "string"
          ? req.body.analyticsSessionId
          : undefined,
      signupPath:
        typeof req.body?.analyticsSignupPath === "string"
          ? req.body.analyticsSignupPath.slice(0, 500)
          : undefined,
      signupForm: source || "newsletter",
      isNew: !subscriber.already_subscribed,
    }).catch((error) =>
      req.log.error({ err: error }, "Subscriber attribution failed"),
    );

    const subscriberEmail = subscriber.email;
    const subscriberName = subscriber.name;
    const subscriberStatus: "new" | "existing" = subscriber.already_subscribed
      ? "existing"
      : "new";
    const eventRegistration = eventInterest
      ? await registerEventInterest(
          subscriber.id,
          subscriberEmail,
          subscriberStatus,
        )
      : null;
    let eventWhatsappUrl: string | null = null;
    if (eventRegistration) {
      try {
        eventWhatsappUrl = await getEventWhatsappUrl();
      } catch (error) {
        req.log.error({ err: error }, "Failed to build event WhatsApp URL");
      }
    }
    const eventUnsubscribeUrl = eventRegistration
      ? unsubscribeUrl(subscriber.unsubscribe_token)
      : null;
    const emailTasks = [
      subscriber.welcome_email_version >= 2
        ? Promise.resolve("already-sent")
        : welcomeSubscriber(subscriberEmail, subscriberName).then(async () => {
            await pool.query(
              "UPDATE newsletter_subscribers SET welcome_email_sent_at = NOW(), welcome_email_version = 2 WHERE id = $1",
              [subscriber.id],
            );
            return "sent";
          }),
      subscriber.owner_notification_sent_at
        ? Promise.resolve("already-sent")
        : notifyOwner(subscriberEmail, subscriberName).then(async () => {
            await pool.query(
              "UPDATE newsletter_subscribers SET owner_notification_sent_at = NOW() WHERE id = $1",
              [subscriber.id],
            );
            return "sent";
          }),
      !eventRegistration || eventRegistration.event_email_sent_at
        ? Promise.resolve("already-sent")
        : eventWhatsappUrl
          ? sendPaintingEventInterestEmail({
              to: subscriberEmail,
              whatsappUrl: eventWhatsappUrl,
              unsubscribe: eventUnsubscribeUrl!,
            }).then(async () => {
              await pool.query(
                "UPDATE newsletter_event_interests SET event_email_sent_at = NOW(), email_delivery_status = 'sent', email_delivery_error = NULL, updated_at = NOW() WHERE id = $1",
                [eventRegistration.id],
              );
              return "sent";
            })
          : Promise.reject(new Error("Event WhatsApp URL is unavailable")),
      !requestedFeaturedRevision
        ? Promise.resolve("not-requested")
        : (async () => {
            const featured = await pool.query(
              `
              SELECT r.id, r.subject, r.preheader, r.blocks
              FROM featured_studio_letter_config c
              JOIN newsletter_template_revisions r ON r.id = c.template_revision_id
              LEFT JOIN featured_studio_letter_deliveries d ON d.subscriber_id = $2 AND d.template_revision_id = r.id
              WHERE c.id='primary' AND c.enabled=TRUE AND r.id=$1 AND d.subscriber_id IS NULL
                AND (c.start_at IS NULL OR c.start_at <= NOW()) AND (c.end_at IS NULL OR c.end_at > NOW())`,
              [requestedFeaturedRevision, subscriber.id],
            );
            if (!featured.rowCount) return "already-sent-or-unavailable";
            const letter = featured.rows[0];
            const content = await renderCampaignBlocks(letter.blocks);
            const unsubscribe = unsubscribeUrl(subscriber.unsubscribe_token);
            await sendEmail({
              to: subscriberEmail,
              subject: letter.subject,
              html: emailShell(content, {
                preheader: letter.preheader || "",
                unsubscribeUrl: unsubscribe,
              }),
              headers: {
                "List-Unsubscribe": `<${unsubscribe}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            });
            await pool.query(
              "INSERT INTO featured_studio_letter_deliveries (subscriber_id, template_revision_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
              [subscriber.id, letter.id],
            );
            return "sent";
          })(),
    ];
    const emailResults = await Promise.allSettled(emailTasks);
    emailResults.forEach((delivery, index) => {
      if (delivery.status === "rejected")
        req.log.error(
          { err: delivery.reason },
          index === 0
            ? "Failed to send newsletter welcome email"
            : index === 1
              ? "Failed to send owner notification email"
              : index === 2
                ? "Failed to send event interest email"
                : "Failed to send featured Studio Letter",
        );
    });

    const welcomeDelivery = emailResults[0];
    if (welcomeDelivery.status === "rejected" && !eventInterest)
      return res.status(502).json({
        error:
          "You joined the Art Club, but the welcome email could not be sent. Please try again.",
      });
    const eventDelivery = emailResults[2];
    if (eventRegistration && eventDelivery.status === "rejected")
      await pool.query(
        "UPDATE newsletter_event_interests SET email_delivery_status = 'failed', email_delivery_error = $2, updated_at = NOW() WHERE id = $1",
        [eventRegistration.id, "Delivery failed and is pending retry"],
      );

    return res.status(201).json({
      id: subscriber.id,
      email: subscriber.email,
      name: subscriber.name,
      createdAt: subscriber.created_at,
      emailSent: emailResults.every(
        (delivery) => delivery.status === "fulfilled",
      ),
      featuredLetterSent:
        emailResults[3]?.status === "fulfilled" &&
        emailResults[3].value === "sent",
      alreadySubscribed: subscriber.already_subscribed,
      success: true,
      subscriberStatus,
      ...(eventRegistration
        ? {
            eventRegistrationStatus: eventRegistration.alreadyRegistered
              ? "existing"
              : "created",
            emailDeliveryStatus:
              eventDelivery.status === "rejected" ? "failed" : "sent",
            whatsappUrl: eventWhatsappUrl,
            event: {
              campaignId: ISTANBUL_EVENT_CAMPAIGN,
              alreadyRegistered: eventRegistration.alreadyRegistered,
            },
          }
        : {}),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to subscribe to newsletter");
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

export default router;
