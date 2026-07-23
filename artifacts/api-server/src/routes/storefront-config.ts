import { Router } from "express";

const router = Router();

router.get("/storefront-config", async (_request, response) => {
  let number = String(process.env.WHATSAPP_ORDER_NUMBER || "").replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(number) && process.env.DATABASE_URL) {
    try {
      const { pool } = await import("@workspace/db");
      const result = await pool.query(
        "SELECT payload->'whatsapp'->>'number' AS number FROM shop_settings WHERE id = $1 LIMIT 1",
        ["primary"],
      );
      number = String(result.rows[0]?.number || "").replace(/\D/g, "");
    } catch {
      // The environment value remains the primary source. A missing settings
      // table simply means there is no database fallback yet.
    }
  }
  const configured = /^\d{8,15}$/.test(number);
  response.set("Cache-Control", "no-store");
  return response.json({
    whatsapp: {
      configured,
      enabled: configured && process.env.WHATSAPP_ORDERING_ENABLED !== "false",
      number: configured ? number : null,
    },
  });
});

export default router;
