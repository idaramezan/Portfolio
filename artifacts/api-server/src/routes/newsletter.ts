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

const router = Router();

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
}

type CampaignBlock =
  | {
      type: "text";
      text: string;
      size?: "small" | "normal" | "large" | "heading";
      align?: "left" | "center";
      bold?: boolean;
      italic?: boolean;
      linkUrl?: string;
      linkText?: string;
    }
  | { type: "image"; url: string; alt?: string; linkUrl?: string }
  | { type: "button"; text: string; url: string }
  | { type: "divider" };

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
  return { subject, preheader, blocks: blocks as CampaignBlock[] };
}

function renderCampaignBlocks(blocks: CampaignBlock[]) {
  return blocks
    .map((block) => {
      if (!block || typeof block !== "object")
        throw new Error("Invalid email block");
      if (block.type === "divider")
        return '<hr style="border:0;border-top:1px solid #cbbb9f;margin:26px 0">';
      if (block.type === "image") {
        const url = safeUrl(block.url);
        if (!url) throw new Error("Every image needs a valid web address");
        const image = `<img src="${escapeHtml(url)}" alt="${escapeHtml(block.alt || "Studio artwork")}" style="display:block;width:100%;height:auto;margin:22px 0;border:1px solid #cbbb9f">`;
        const link = safeUrl(block.linkUrl);
        return link ? `<a href="${escapeHtml(link)}">${image}</a>` : image;
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
    })
    .join("");
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

// Reusable bulk-email templates. All content still renders inside emailShell.
router.get("/templates", requireAdmin, async (req, res) => {
  try {
    await ensureStarterTemplates();
    const result = await pool.query(`
      SELECT id, name, subject, preheader, blocks, is_starter, created_at, updated_at
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
    renderCampaignBlocks(campaign.blocks);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 120)
      return res.status(400).json({ error: "Template name is required" });
    const result = await pool.query(
      `INSERT INTO newsletter_templates
        (id, name, subject, preheader, blocks)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [
        crypto.randomUUID(),
        name,
        campaign.subject,
        campaign.preheader || null,
        JSON.stringify(campaign.blocks),
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
    renderCampaignBlocks(campaign.blocks);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 120)
      return res.status(400).json({ error: "Template name is required" });
    const result = await pool.query(
      `UPDATE newsletter_templates
       SET name = $2, subject = $3, preheader = $4, blocks = $5::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        name,
        campaign.subject,
        campaign.preheader || null,
        JSON.stringify(campaign.blocks),
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
router.post("/campaigns/test", requireAdmin, async (req, res) => {
  try {
    const campaign = validateCampaign(req.body);
    const content = renderCampaignBlocks(campaign.blocks);
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
    const content = renderCampaignBlocks(campaign.blocks);
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
        (id, subject, preheader, blocks, status, recipient_count)
       VALUES ($1, $2, $3, $4::jsonb, 'sending', $5)`,
      [
        campaignId,
        campaign.subject,
        campaign.preheader || null,
        JSON.stringify(campaign.blocks),
        subscribers.rowCount,
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
       RETURNING id, email, name, created_at, welcome_email_sent_at, owner_notification_sent_at, welcome_email_version, (xmax <> 0) AS already_subscribed`,
      [normalizedEmail, normalizedName, source, locale],
    );
    const subscriber = result.rows[0];

    const subscriberEmail = subscriber.email;
    const subscriberName = subscriber.name;
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
    ];
    const emailResults = await Promise.allSettled(emailTasks);
    emailResults.forEach((delivery, index) => {
      if (delivery.status === "rejected")
        req.log.error(
          { err: delivery.reason },
          index === 0
            ? "Failed to send newsletter welcome email"
            : "Failed to send owner notification email",
        );
    });

    const welcomeDelivery = emailResults[0];
    if (welcomeDelivery.status === "rejected")
      return res.status(502).json({
        error:
          "You joined the Art Club, but the welcome email could not be sent. Please try again.",
      });

    return res.status(201).json({
      id: subscriber.id,
      email: subscriber.email,
      name: subscriber.name,
      createdAt: subscriber.created_at,
      emailSent: emailResults.every(
        (delivery) => delivery.status === "fulfilled",
      ),
      alreadySubscribed: subscriber.already_subscribed,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to subscribe to newsletter");
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

export default router;
