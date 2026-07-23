import { Router } from "express";

const router = Router();

router.get("/storefront-config", (_request, response) => {
  const number = String(process.env.WHATSAPP_ORDER_NUMBER || "").replace(/\D/g, "");
  const configured = /^\d{8,15}$/.test(number);
  response.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return response.json({
    whatsapp: {
      configured,
      enabled: configured && process.env.WHATSAPP_ORDERING_ENABLED !== "false",
      number: configured ? number : null,
    },
  });
});

export default router;
