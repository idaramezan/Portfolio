import { Router } from "express";

const router = Router();

// POST /api/admin/verify — check admin password
router.post("/verify", (req, res) => {
  const pw = req.headers["x-admin-password"];
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(503).json({ error: "ADMIN_PASSWORD not configured" });
  }
  if (pw !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return res.json({ ok: true });
});

export default router;
