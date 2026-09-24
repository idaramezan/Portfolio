import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { pool } from "@workspace/db";

const router = Router();
const ACEO_DIMENSION = "6.4 × 8.9 cm · 2.5 × 3.5 in";
const PRODUCT_IMAGE_PATTERN =
  /^\/api\/product-images\/([a-f0-9-]+)(?:\.[a-z0-9]+)?$/i;

function productImageIds(value: unknown, result = new Set<string>()) {
  if (typeof value === "string") {
    const id = value.trim().match(PRODUCT_IMAGE_PATTERN)?.[1];
    if (id) result.add(id);
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) productImageIds(item, result);
    return result;
  }
  if (value && typeof value === "object")
    for (const item of Object.values(value)) productImageIds(item, result);
  return result;
}

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
    Array.isArray(record.originalProducts)
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
    const grouped = Boolean(record.fourthwallVariantGroupEnabled);
    const variants = Array.isArray(record.fourthwallVariants)
      ? record.fourthwallVariants
      : [];
    if (grouped) {
      const enabled = variants.filter(
        (variant) =>
          variant &&
          typeof variant === "object" &&
          Boolean((variant as Record<string, unknown>).enabled),
      ) as Record<string, unknown>[];
      const ids = enabled.map((variant) =>
        String(variant.fourthwallProductId || "").trim(),
      );
      const types = enabled.map((variant) =>
        String(variant.variantType || "").trim(),
      );
      const sizes = enabled.map((variant) =>
        String(variant.sizeLabel || "").trim(),
      );
      if (
        !enabled.length ||
        ids.some((value) => !value || value.length > 200) ||
        types.some((value) => !value || value.length > 50) ||
        // Existing grouped mappings predate sizeLabel. Keep them loadable and
        // savable; ProductEditor requires labels when a product is published.
        sizes.some((value) => value.length > 100) ||
        new Set(ids).size !== ids.length ||
        [...new Set(types)].some(
          (format) =>
            enabled.filter(
              (variant) =>
                String(variant.variantType || "").trim() === format &&
                Boolean(variant.isDefault),
            ).length > 1,
        )
      )
        return false;
      for (const variant of enabled) {
        const variantUrl = String(variant.fourthwallProductUrl || "").trim();
        if (!variantUrl) continue;
        try {
          const parsed = new URL(variantUrl);
          if (
            parsed.protocol !== "https:" ||
            !expectedHost ||
            parsed.hostname !== expectedHost
          )
            return false;
        } catch {
          return false;
        }
      }
    }
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
function validProductSales(settings: Record<string, any>) {
  const sales = [
    ...(settings.printProducts || []).map((item: any) => item.sale),
    ...(settings.originalProducts || []).map((item: any) => item.sale),
    ...(settings.readyMadePalettes || []).map((item: any) => item.sale),
    ...(settings.mailClubEditions || []).map((item: any) => item.sale),
    settings.paletteSettings?.sale,
  ].filter(Boolean);
  return sales.every(
    (sale: any) =>
      typeof sale.enabled === "boolean" &&
      Number.isFinite(Number(sale.percentage)) &&
      Number(sale.percentage) >= 1 &&
      Number(sale.percentage) <= 100 &&
      typeof sale.allowDiscountCodes === "boolean" &&
      (!sale.startsAt || Number.isFinite(Date.parse(sale.startsAt))) &&
      (!sale.endsAt || Number.isFinite(Date.parse(sale.endsAt))) &&
      (!sale.startsAt ||
        !sale.endsAt ||
        Date.parse(sale.startsAt) < Date.parse(sale.endsAt)),
  );
}

function normalizeAceos(settings: Record<string, any>) {
  const products = Array.isArray(settings.printProducts)
    ? settings.printProducts
    : [];
  for (const product of products) {
    if (product?.category !== "aceo") continue;
    const price = Number(product.priceMinor ?? product.priceUsdCents);
    const inventory = Number(product.inventory);
    if (!Number.isInteger(price) || price <= 0)
      return "ACEO price must be greater than zero.";
    if (!Number.isInteger(inventory) || inventory < 0 || inventory > 1)
      return "ACEO inventory must be zero or one.";
    Object.assign(product, {
      kind: "print",
      priceCurrency: "TRY",
      priceMinor: price,
      priceUsdCents: price,
      dimension: ACEO_DIMENSION,
      maxPerUser: 1,
      availableInTurkiye: true,
      availableInternationally: false,
      freeShippingInTurkiye: true,
      paintedLive: true,
      ...(inventory === 0 && product.status === "published"
        ? { status: "sold_out", available: false }
        : {}),
    });
    delete product.printOptions;
    delete product.tshirtOptions;
    delete product.mugOptions;
    delete product.stickerOptions;
    delete product.fourthwallProductId;
    delete product.fourthwallProductUrl;
    delete product.fourthwallLinkType;
  }
  return null;
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
    if (!settings.paletteSettings) {
      settings.paletteSettings = {
        enabled: true,
        priceMinor: 120000,
        coverImage: "/assets/custom-watercolor-palette.jpg",
        types: [],
        colors: [],
      };
      upgraded = true;
    }
    if (!Array.isArray(settings.paletteSettings.types)) {
      settings.paletteSettings.types = [
        {
          id: "resin",
          enabled: true,
          nameEn: "Resin",
          nameTr: "Reçine",
          descriptionEn: "Smooth, translucent and full of flowing colour.",
          descriptionTr: "Pürüzsüz, yarı saydam ve akışkan renklerle dolu.",
        },
        {
          id: "stone",
          enabled: true,
          nameEn: "Stone",
          nameTr: "Taş",
          descriptionEn: "Textured, weighty and naturally one of a kind.",
          descriptionTr: "Dokulu, ağırlıklı ve doğal olarak benzersiz.",
        },
      ];
      upgraded = true;
    }
    if (!Array.isArray(settings.paletteSettings.colors)) {
      const defaults = [
        ["dusty-rose", "Dusty Rose", "Pudra Gülü", "#c98f91"],
        ["sky-blue", "Sky Blue", "Gök Mavisi", "#78bddd"],
        ["sage", "Sage", "Adaçayı", "#9ca98c"],
        ["lavender", "Lavender", "Lavanta", "#a99abd"],
      ];
      settings.paletteSettings.colors = defaults.flatMap(
        ([id, nameEn, nameTr, hex], displayOrder) =>
          ["resin", "stone"].map((paletteType) => ({
            id: `${paletteType}-${id}`,
            paletteType,
            nameEn,
            nameTr,
            hex,
            enabled: true,
            displayOrder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
      );
      upgraded = true;
    }
    if (!Array.isArray(settings.readyMadePalettes)) {
      settings.readyMadePalettes = [];
      upgraded = true;
    } else {
      settings.readyMadePalettes = settings.readyMadePalettes.map(
        (palette: any) => {
          if (palette.colors) return palette;
          upgraded = true;
          return { ...palette, colors: palette.description || "" };
        },
      );
    }
    if (!Array.isArray(settings.mailClubEditions)) {
      settings.mailClubEditions = [
        {
          id: "mail-club-october",
          slug: "october-mail-club",
          internalName: "October Mail Club",
          title: "October Mail Club",
          titleTr: "Ekim Mail Club",
          monthYear: "2026-10",
          description:
            "A small collection of things I made for this month, sent only to the people who choose to keep a piece of it.",
          descriptionTr:
            "Bu ay için hazırladığım küçük bir koleksiyon, ondan bir parça saklamayı seçen insanlara gönderiliyor.",
          coverImage: "/assets/mail-club-october.jpg",
          altText: "October Mail Club contents",
          priceMinor: 49000,
          stock: 20,
          enabled: true,
          status: "published",
          current: true,
          createdAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      ];
      upgraded = true;
    }
    if (!Array.isArray(settings.animationMerchProductIds)) {
      settings.animationMerchProductIds = [];
      upgraded = true;
    }
    if (!settings.hundredWindows) {
      settings.hundredWindows = {
        currentDay: 1,
        currentProductId: null,
        heroImageUrl: null,
        heroUpdatedAt: null,
      };
      upgraded = true;
    } else if (!("heroImageUrl" in settings.hundredWindows)) {
      settings.hundredWindows.heroImageUrl = null;
      settings.hundredWindows.heroUpdatedAt = null;
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
    const beforeAceoUpgrade = JSON.stringify(settings.printProducts);
    normalizeAceos(settings);
    if (JSON.stringify(settings.printProducts) !== beforeAceoUpgrade)
      upgraded = true;
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
  if (!validProductSales(request.body.settings))
    return response
      .status(400)
      .json({ error: "Product sale settings are invalid." });
  const currentMailEditions = Array.isArray(
    request.body.settings.mailClubEditions,
  )
    ? request.body.settings.mailClubEditions.filter(
        (edition: any) => edition?.current,
      )
    : [];
  if (currentMailEditions.length > 1)
    return response
      .status(400)
      .json({ error: "Only one Mail Club edition can be current." });
  const aceoError = normalizeAceos(request.body.settings);
  if (aceoError) return response.status(400).json({ error: aceoError });
  if (!validFourthwallConnections(request.body.settings))
    return response.status(400).json({
      error:
        "Fourthwall connections must use valid products and the configured Fourthwall shop",
    });
  try {
    await ensureTable();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const previous = await client.query(
        "SELECT payload FROM shop_settings WHERE id=$1 FOR UPDATE",
        ["primary"],
      );
      const result = await client.query(
        `INSERT INTO shop_settings (id, payload, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE
         SET payload = EXCLUDED.payload, updated_at = NOW()
         RETURNING updated_at`,
        ["primary", JSON.stringify(request.body.settings)],
      );
      const oldIds = productImageIds(previous.rows[0]?.payload);
      const retainedIds = productImageIds(request.body.settings);
      const orphanedIds = [...oldIds].filter((id) => !retainedIds.has(id));
      let deletedImages = 0;
      if (orphanedIds.length) {
        const table = await client.query(
          "SELECT to_regclass('public.product_images') AS name",
        );
        if (table.rows[0]?.name) {
          const deleted = await client.query(
            "DELETE FROM product_images WHERE id = ANY($1::text[]) RETURNING id",
            [orphanedIds],
          );
          deletedImages = deleted.rowCount || 0;
        }
      }
      await client.query("COMMIT");
      if (orphanedIds.length)
        request.log.info(
          {
            operation: "product-image-cleanup",
            orphanedReferences: orphanedIds.length,
            deletedImages,
          },
          "Removed product images no longer referenced by shop settings",
        );
      return response.json({
        ok: true,
        updatedAt: result.rows[0].updated_at,
        deletedImages,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    request.log.error({ error }, "Failed to save shop settings");
    return response
      .status(500)
      .json({ error: "Shop settings could not be saved" });
  }
});

export default router;
