import { Router } from "express";
import { db, artworksTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// POST /checkout/initiate
// With a real Paddle integration, this would create a Paddle transaction and
// return a hosted checkout URL. For now it returns a stub that the frontend
// can display with instructions to set PADDLE_API_KEY.
router.post("/initiate", async (req, res) => {
  try {
    const { type, artworkId, printSize, customerEmail } = req.body;

    if (!type || !artworkId) {
      return res.status(400).json({ error: "type and artworkId are required" });
    }

    const [artwork] = await db
      .select()
      .from(artworksTable)
      .where(eq(artworksTable.id, parseInt(artworkId)))
      .limit(1);

    if (!artwork) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    if (type === "original" && artwork.status !== "AVAILABLE") {
      return res.status(400).json({ error: "This artwork is no longer available" });
    }

    if (type === "print" && !artwork.availableAsPrint) {
      return res.status(400).json({ error: "This artwork is not available as a print" });
    }

    const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const paddleApiKey = process.env.PADDLE_API_KEY;

    if (!paddleApiKey || !paddleClientToken) {
      // Return a stub response indicating Paddle is not yet configured
      return res.json({
        checkoutUrl: null,
        transactionId: null,
        _stub: true,
        message: "Paddle not configured. Set PADDLE_API_KEY and PADDLE_WEBHOOK_SECRET environment variables.",
      });
    }

    // TODO: Call Paddle Billing API to create a transaction
    // const paddleRes = await fetch("https://api.paddle.com/transactions", {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${paddleApiKey}`, "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     items: [{ price_id: artwork.paddlePriceId, quantity: 1 }],
    //     customer: { email: customerEmail },
    //     custom_data: { artworkId: artwork.id, type },
    //   }),
    // });
    // const paddleData = await paddleRes.json();
    // return res.json({ checkoutUrl: paddleData.data.checkout.url, transactionId: paddleData.data.id });

    return res.json({ checkoutUrl: null, transactionId: null });
  } catch (err) {
    req.log.error({ err }, "Failed to initiate checkout");
    return res.status(500).json({ error: "Failed to initiate checkout" });
  }
});

export default router;
