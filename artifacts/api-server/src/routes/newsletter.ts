import { Router } from "express";
import { pool } from "@workspace/db";
import { emailShell, escapeHtml, OWNER_EMAIL, sendEmail } from "../lib/email";

const router = Router();

async function ensureDeliveryColumns() {
  await pool.query(`
    ALTER TABLE newsletter_subscribers
      ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS owner_notification_sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS welcome_email_version INTEGER NOT NULL DEFAULT 0
  `);
}

async function notifyOwner(email: string, name: string | null) {
  const displayName = name?.trim() || email;
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `New subscriber: ${displayName}`,
    html: emailShell(`<h1 style="font-size:28px">A new studio-letter reader</h1><p><strong>${escapeHtml(displayName)}</strong> joined your newsletter.</p><p>Email: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>`),
  });
}

async function welcomeSubscriber(email: string, name: string | null) {
  const greeting = name?.trim() ? `Dear ${escapeHtml(name.trim())},` : "Hello art lover,";
  await sendEmail({
    to: email,
    subject: "You’re officially in Aida’s Art Club ✨",
    html: emailShell(`<p style="font-size:17px">${greeting}</p><h1 style="margin:12px 0 18px;font-size:34px;line-height:1.15">Welcome to the Art Club—you’re in.</h1><p style="font-size:16px;line-height:1.75">I’m so happy you found your way here. You’re now part of a small circle of people who get to see what is taking shape in my studio a little closer and a little sooner.</p><p style="font-size:16px;line-height:1.75">From now on, I’ll email you private studio notes, first looks at new artwork, and special offers created for Art Club members. Think of this as your members-only corner—little treats and surprises that won’t be shared with everyone else.</p><p style="font-size:16px;line-height:1.75">Thank you for supporting an independent artist and giving my work a place in your world. It truly means more than you know.</p>`),
  });
}

// POST /newsletter
router.post("/", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    await ensureDeliveryColumns();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = typeof name === "string" && name.trim() ? name.trim() : null;
    const result = await pool.query(
      `INSERT INTO newsletter_subscribers (email, name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE
       SET name = COALESCE(newsletter_subscribers.name, EXCLUDED.name)
       RETURNING id, email, name, created_at, welcome_email_sent_at, owner_notification_sent_at, welcome_email_version`,
      [normalizedEmail, normalizedName],
    );
    const subscriber = result.rows[0];

    const subscriberEmail = subscriber.email;
    const subscriberName = subscriber.name;
    const emailTasks = [
      subscriber.welcome_email_version >= 2
        ? Promise.resolve("already-sent")
        : welcomeSubscriber(subscriberEmail, subscriberName).then(async () => {
            await pool.query("UPDATE newsletter_subscribers SET welcome_email_sent_at = NOW(), welcome_email_version = 2 WHERE id = $1", [subscriber.id]);
            return "sent";
          }),
      subscriber.owner_notification_sent_at
        ? Promise.resolve("already-sent")
        : notifyOwner(subscriberEmail, subscriberName).then(async () => {
            await pool.query("UPDATE newsletter_subscribers SET owner_notification_sent_at = NOW() WHERE id = $1", [subscriber.id]);
            return "sent";
          }),
    ];
    const emailResults = await Promise.allSettled(emailTasks);
    emailResults.forEach((delivery, index) => {
      if (delivery.status === "rejected")
        req.log.error({ err: delivery.reason }, index === 0 ? "Failed to send newsletter welcome email" : "Failed to send owner notification email");
    });

    const welcomeDelivery = emailResults[0];
    if (welcomeDelivery.status === "rejected")
      return res.status(502).json({
        error: "You joined the Art Club, but the welcome email could not be sent. Please try again.",
      });

    return res.status(201).json({
      id: subscriber.id,
      email: subscriber.email,
      name: subscriber.name,
      createdAt: subscriber.created_at,
      emailSent: emailResults.every((delivery) => delivery.status === "fulfilled"),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to subscribe to newsletter");
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

export default router;
