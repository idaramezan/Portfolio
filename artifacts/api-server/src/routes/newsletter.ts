import { Router } from "express";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { emailShell, escapeHtml, OWNER_EMAIL, sendEmail } from "../lib/email";

const router = Router();

async function notifyOwner(email: string, name: string | null) {
  const displayName = name?.trim() || email;
  await sendEmail({
    to: OWNER_EMAIL,
    subject: `New subscriber: ${displayName}`,
    html: emailShell(`<h1 style="font-family:Georgia,serif;font-size:28px">A new studio-letter reader</h1><p><strong>${escapeHtml(displayName)}</strong> joined your newsletter.</p><p>Email: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>`),
  });
}

async function welcomeSubscriber(email: string, name: string | null) {
  const greeting = name?.trim() ? `Dear ${escapeHtml(name.trim())},` : "Hello art lover,";
  await sendEmail({
    to: email,
    subject: "Welcome to Aida’s Studio Letter",
    html: emailShell(`<p style="font-size:17px">${greeting}</p><h1 style="margin:12px 0 18px;font-family:Georgia,serif;font-size:34px;line-height:1.15">Thank you for joining me.</h1><p style="font-size:16px;line-height:1.75">I’m so happy to welcome you into this little corner of my studio. From time to time, I’ll send you new paintings, behind-the-scenes notes, and first looks at special releases.</p><p style="font-size:16px;line-height:1.75">Thank you for choosing to follow an independent artist. It genuinely means a great deal.</p>`),
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

    const subscriberEmail = subscriber.email;
    const subscriberName = subscriber.name;
    const emailResults = await Promise.allSettled([
      welcomeSubscriber(subscriberEmail, subscriberName),
      notifyOwner(subscriberEmail, subscriberName),
    ]);
    emailResults.forEach((result, index) => {
      if (result.status === "rejected")
        req.log.error({ err: result.reason }, index === 0 ? "Failed to send newsletter welcome email" : "Failed to send owner notification email");
    });

    return res.status(201).json(subscriber);
  } catch (err) {
    req.log.error({ err }, "Failed to subscribe to newsletter");
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

export default router;
