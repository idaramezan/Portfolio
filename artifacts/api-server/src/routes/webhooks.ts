import { Router, Request } from "express";
import { db, artworksTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function verifyPaddleSignature(req: Request): boolean {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const signatureHeader = req.headers["paddle-signature"] as string;
  if (!signatureHeader) return false;

  try {
    const parts = Object.fromEntries(signatureHeader.split(";").map((p) => p.split("=", 2) as [string, string]));
    const ts = parts["ts"];
    const h1 = parts["h1"];

    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody) return false;

    const signedPayload = `${ts}:${rawBody.toString()}`;
    const expectedHash = crypto.createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");

    return crypto.timingSafeEqual(Buffer.from(h1 ?? "", "hex"), Buffer.from(expectedHash, "hex"));
  } catch {
    return false;
  }
}

// POST /webhooks/paddle
router.post("/paddle", async (req, res) => {
  try {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    if (webhookSecret && !verifyPaddleSignature(req)) {
      req.log.warn("Invalid Paddle webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = req.body;
    const eventType = event?.event_type;

    req.log.info({ eventType }, "Received Paddle webhook");

    if (eventType === "transaction.completed") {
      const txData = event?.data;
      const customData = txData?.custom_data ?? {};
      const artworkId = customData?.artworkId ? parseInt(customData.artworkId) : null;
      const type = customData?.type ?? "original";
      const customerEmail = txData?.customer?.email;
      const transactionId = txData?.id;
      const priceCents = txData?.details?.totals?.grand_total ?? null;

      if (artworkId && type === "original") {
        await db.update(artworksTable).set({ status: "SOLD" }).where(eq(artworksTable.id, artworkId));
      }

      if (artworkId) {
        await db.insert(ordersTable).values({
          artworkId,
          type,
          paddleTransactionId: transactionId,
          customerEmail,
          priceCents: priceCents ? Math.round(Number(priceCents)) : null,
          status: "paid",
        });
      }

      // TODO: For print orders, create Printful order here
      // if (type === 'print') { await createPrintfulOrder(...) }
    }

    if (eventType === "transaction.payment_failed") {
      req.log.warn({ data: event?.data }, "Paddle payment failed — inventory untouched");
    }

    return res.json({ received: true });
  } catch (err) {
    req.log.error({ err }, "Failed to process Paddle webhook");
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
