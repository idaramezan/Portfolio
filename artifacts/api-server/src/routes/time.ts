import { Router } from "express";

const router = Router();

router.get("/time", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ now: new Date().toISOString() });
});

export default router;
