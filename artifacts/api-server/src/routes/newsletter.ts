import { Router } from "express";
import { db, newsletterSubscribersTable } from "@workspace/db";
import nodemailer from "nodemailer";

const router = Router();

function getMailer() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function notifyOwner(email: string, name: string | null) {
  const mailer = getMailer();
  if (!mailer) {
    console.warn("[newsletter] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping owner notification");
    return;
  }
  const displayName = name?.trim() || email;
  await mailer.sendMail({
    from: `"Aeda Art" <${process.env.GMAIL_USER}>`,
    to: "idaramezan@gmail.com",
    subject: `New subscriber: ${displayName}`,
    text: `${displayName} joined Aeda Art Newsletter.\n\nEmail: ${email}${name ? `\nName: ${name}` : ""}`,
  });
}

// POST /newsletter
router.post("/", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const [subscriber] = await db
      .insert(newsletterSubscribersTable)
      .values({ email: email.toLowerCase().trim(), name: name ?? null })
      .onConflictDoNothing()
      .returning();

    if (!subscriber) {
      // Already subscribed — return success anyway (don't leak info)
      return res.status(201).json({ id: 0, email, createdAt: new Date().toISOString() });
    }

    // Fire-and-forget owner notification
    notifyOwner(email, name ?? null).catch((err) =>
      req.log.error({ err }, "Failed to send owner notification email")
    );

    return res.status(201).json(subscriber);
  } catch (err) {
    req.log.error({ err }, "Failed to subscribe to newsletter");
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

export default router;
