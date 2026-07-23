import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { pool } from "@workspace/db";

const router = Router();

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function requireAdmin(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const password = request.headers["x-admin-password"];
  const expected =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expected || password !== expected)
    return response.status(401).json({ error: "Admin authentication required" });
  return next();
}

function isShopSettings(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.printProducts) &&
    Array.isArray(record.originalProducts) &&
    Array.isArray(record.studioMailPackages)
  );
}

router.get("/shop-settings", async (request, response) => {
  try {
    await ensureTable();
    const result = await pool.query(
      "SELECT payload, updated_at FROM shop_settings WHERE id = $1 LIMIT 1",
      ["primary"],
    );
    if (!result.rows[0]) return response.status(204).end();
    response.setHeader("Cache-Control", "no-store");
    return response.json({
      settings: result.rows[0].payload,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    request.log.error({ error }, "Failed to load shop settings");
    return response.status(500).json({ error: "Shop settings could not be loaded" });
  }
});

router.put("/admin/shop-settings", requireAdmin, async (request, response) => {
  if (!isShopSettings(request.body?.settings))
    return response.status(400).json({ error: "Valid shop settings are required" });
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO shop_settings (id, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE
       SET payload = EXCLUDED.payload, updated_at = NOW()
       RETURNING updated_at`,
      ["primary", JSON.stringify(request.body.settings)],
    );
    return response.json({ ok: true, updatedAt: result.rows[0].updated_at });
  } catch (error) {
    request.log.error({ error }, "Failed to save shop settings");
    return response.status(500).json({ error: "Shop settings could not be saved" });
  }
});

export default router;
