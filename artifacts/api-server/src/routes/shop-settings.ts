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
    return response
      .status(401)
      .json({ error: "Admin authentication required" });
  return next();
}

function isShopSettings(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const hundred = record.hundredWindows as Record<string, unknown> | undefined;
  const currentId = hundred?.currentProductId;
  const prints = Array.isArray(record.printProducts)
    ? record.printProducts
    : [];
  const projectProductValid =
    currentId == null ||
    prints.some(
      (product) =>
        product &&
        typeof product === "object" &&
        (product as Record<string, unknown>).id === currentId,
    );
  const validHundred =
    !hundred ||
    (Number.isInteger(hundred.currentDay) &&
      Number(hundred.currentDay) >= 1 &&
      Number(hundred.currentDay) <= 100 &&
      (currentId == null || typeof currentId === "string") &&
      projectProductValid);
  return (
    validHundred &&
    Array.isArray(record.printProducts) &&
    Array.isArray(record.originalProducts) &&
    Array.isArray(record.studioMailPackages)
  );
}

function validPublicSocialUrls(settings: Record<string, unknown>) {
  const links = settings.siteLinks;
  if (!links || typeof links !== "object" || Array.isArray(links)) return true;
  return [
    "instagramUrl",
    "tiktokUrl",
    "twitchUrl",
    "kickUrl",
    "discordUrl",
    "youtubeUrl",
  ].every((key) => {
    const value = String((links as Record<string, unknown>)[key] || "").trim();
    if (!value) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  });
}

function validFourthwallConnections(settings: Record<string, unknown>) {
  const configured = process.env.FOURTHWALL_SHOP_URL;
  let expectedHost = "";
  try {
    expectedHost = configured ? new URL(configured).hostname : "";
  } catch {
    return false;
  }
  const products = [settings.printProducts, settings.originalProducts].flatMap(
    (value) => (Array.isArray(value) ? value : []),
  );
  return products.every((product) => {
    if (!product || typeof product !== "object") return false;
    const record = product as Record<string, unknown>;
    const id = String(record.fourthwallProductId || "").trim();
    const url = String(record.fourthwallProductUrl || "").trim();
    const type = String(record.fourthwallLinkType || "").trim();
    if (type && !["exact", "edition", "related"].includes(type)) return false;
    if (id && id.length > 200) return false;
    if (!url) return true;
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol === "https:" &&
        Boolean(expectedHost) &&
        parsed.hostname === expectedHost
      );
    } catch {
      return false;
    }
  });
}

router.get("/shop-settings", async (request, response) => {
  try {
    await ensureTable();
    const result = await pool.query(
      "SELECT payload, updated_at FROM shop_settings WHERE id = $1 LIMIT 1",
      ["primary"],
    );
    if (!result.rows[0]) return response.status(204).end();
    const settings = result.rows[0].payload;
    let upgraded = false;
    if (!settings.hundredWindows) {
      settings.hundredWindows = { currentDay: 1, currentProductId: null };
      upgraded = true;
    }
    settings.printProducts = (settings.printProducts || []).map(
      (product: Record<string, unknown>, index: number) => {
        const next = { ...product };
        if (typeof next.isHundredWindowsProduct !== "boolean") {
          next.isHundredWindowsProduct = false;
          upgraded = true;
        }
        if (!next.createdAt) {
          next.createdAt = new Date(
            Date.UTC(2020, 0, 1, 0, 0, index + 1),
          ).toISOString();
          upgraded = true;
        }
        return next;
      },
    );
    if (upgraded)
      await pool.query(
        "UPDATE shop_settings SET payload=$1::jsonb,updated_at=NOW() WHERE id='primary'",
        [JSON.stringify(settings)],
      );
    response.setHeader("Cache-Control", "no-store");
    return response.json({
      settings,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (error) {
    request.log.error({ error }, "Failed to load shop settings");
    return response
      .status(500)
      .json({ error: "Shop settings could not be loaded" });
  }
});

router.put("/admin/shop-settings", requireAdmin, async (request, response) => {
  if (!isShopSettings(request.body?.settings))
    return response
      .status(400)
      .json({ error: "Valid shop settings are required" });
  if (!validPublicSocialUrls(request.body.settings))
    return response
      .status(400)
      .json({ error: "Social links must be valid HTTPS URLs" });
  if (!validFourthwallConnections(request.body.settings))
    return response.status(400).json({
      error:
        "Fourthwall connections must use valid products and the configured Fourthwall shop",
    });
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
    return response
      .status(500)
      .json({ error: "Shop settings could not be saved" });
  }
});

export default router;
