import { Router } from "express";
import { db, newsletterSubscribersTable } from "@workspace/db";

const router = Router();

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
      const [existing] = await db
        .select()
        .from(newsletterSubscribersTable)
        .limit(1);
      return res.status(201).json({ id: 0, email, createdAt: new Date().toISOString() });
    }

    return res.status(201).json(subscriber);
  } catch (err) {
    req.log.error({ err }, "Failed to subscribe to newsletter");
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

// Stub: sync subscribers to an external ESP
// Call this from a cron job or manually to push emails to Mailchimp/ConvertKit/etc.
// export async function syncToESP(espApiKey: string): Promise<void> {
//   const subscribers = await db.select().from(newsletterSubscribersTable);
//   // TODO: implement ESP-specific sync logic here
//   // e.g. await mailchimp.lists.addListMember(listId, { email_address: sub.email, status: 'subscribed' })
// }

export default router;
