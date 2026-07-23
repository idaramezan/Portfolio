import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { pool } from "@workspace/db";
import { emailShell, escapeHtml, OWNER_EMAIL, sendEmail } from "../lib/email";

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
      ADD COLUMN IF NOT EXISTS locale TEXT
  `);
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
      SELECT id, email, name, created_at, welcome_email_sent_at
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
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load newsletter subscribers");
    return res.status(500).json({ error: "Subscribers could not be loaded" });
  }
});

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
           locale = COALESCE(newsletter_subscribers.locale, EXCLUDED.locale)
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
