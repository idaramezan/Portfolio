import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import sharp from "sharp";
import { pool } from "@workspace/db";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
});
const statuses = new Set([
  "draft",
  "scheduled",
  "active",
  "paused",
  "expired",
  "archived",
]);
const frequencyModes = new Set([
  "once_per_campaign",
  "once_per_session",
  "repeat_after_days",
]);
const destinationTypes = new Set([
  "local_product",
  "fourthwall_product",
  "external_url",
]);

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expected || req.header("x-admin-password") !== expected)
    return res.status(401).json({ error: "Admin authentication required" });
  return next();
}

export async function ensureStickerDropTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sticker_drop_campaigns (
      id UUID PRIMARY KEY, internal_name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
      start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ NOT NULL, timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
      english_eyebrow TEXT NOT NULL, english_title TEXT NOT NULL, english_description TEXT NOT NULL,
      turkish_eyebrow TEXT NOT NULL, turkish_title TEXT NOT NULL, turkish_description TEXT NOT NULL,
      animation_duration_ms INTEGER NOT NULL DEFAULT 3000, maximum_desktop_stickers INTEGER NOT NULL DEFAULT 12,
      maximum_mobile_stickers INTEGER NOT NULL DEFAULT 7, show_on_homepage BOOLEAN NOT NULL DEFAULT TRUE,
      show_on_turkiye_shop BOOLEAN NOT NULL DEFAULT TRUE, show_on_international_shop BOOLEAN NOT NULL DEFAULT TRUE,
      show_on_other_storefront_pages BOOLEAN NOT NULL DEFAULT TRUE, frequency_mode TEXT NOT NULL DEFAULT 'once_per_campaign',
      repeat_after_days INTEGER, turkiye_enabled BOOLEAN NOT NULL DEFAULT FALSE, turkiye_destination_type TEXT NOT NULL DEFAULT 'local_product',
      turkiye_local_product_id TEXT, turkiye_custom_product_url TEXT, international_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      international_destination_type TEXT NOT NULL DEFAULT 'fourthwall_product', international_local_product_id TEXT,
      international_fourthwall_product_id TEXT, international_external_product_url TEXT,
      published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sticker_drop_assets (
      id UUID PRIMARY KEY, campaign_id UUID NOT NULL REFERENCES sticker_drop_campaigns(id) ON DELETE CASCADE,
      original_filename TEXT NOT NULL, alt_text TEXT NOT NULL DEFAULT '', display_order INTEGER NOT NULL DEFAULT 0,
      mime_type TEXT NOT NULL DEFAULT 'image/png', byte_size INTEGER NOT NULL, data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sticker_drop_campaign_schedule_idx ON sticker_drop_campaigns(status,start_at,end_at);
    CREATE INDEX IF NOT EXISTS sticker_drop_assets_campaign_idx ON sticker_drop_assets(campaign_id,display_order);
  `);
}

function clean(value: unknown, max = 500) {
  return String(value || "")
    .trim()
    .slice(0, max);
}
function httpsUrl(value: unknown) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
function campaignInput(body: any) {
  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  const status = statuses.has(body.status) ? body.status : "draft";
  const duration = Number(body.animationDurationMs || 3000);
  const data = {
    internalName: clean(body.internalName, 150),
    slug: clean(body.slug, 150)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, ""),
    status,
    startAt,
    endAt,
    timezone: clean(body.timezone, 80) || "Europe/Istanbul",
    englishEyebrow: clean(body.englishEyebrow, 120),
    englishTitle: clean(body.englishTitle, 200),
    englishDescription: clean(body.englishDescription, 500),
    turkishEyebrow: clean(body.turkishEyebrow, 120),
    turkishTitle: clean(body.turkishTitle, 200),
    turkishDescription: clean(body.turkishDescription, 500),
    duration,
    desktop: Math.min(
      20,
      Math.max(1, Number(body.maximumDesktopStickers || 12)),
    ),
    mobile: Math.min(12, Math.max(1, Number(body.maximumMobileStickers || 7))),
    homepage: body.showOnHomepage !== false,
    turkiye: body.showOnTurkiyeShop !== false,
    international: body.showOnInternationalShop !== false,
    other: body.showOnOtherStorefrontPages !== false,
    frequency: frequencyModes.has(body.frequencyMode)
      ? body.frequencyMode
      : "once_per_campaign",
    repeat: body.repeatAfterDays
      ? Math.max(1, Number(body.repeatAfterDays))
      : null,
    trEnabled: body.turkiyeEnabled === true,
    trType: destinationTypes.has(body.turkiyeDestinationType)
      ? body.turkiyeDestinationType
      : "local_product",
    trProduct: clean(body.turkiyeLocalProductId, 150) || null,
    trUrl: httpsUrl(body.turkiyeCustomProductUrl),
    intEnabled: body.internationalEnabled === true,
    intType: destinationTypes.has(body.internationalDestinationType)
      ? body.internationalDestinationType
      : "fourthwall_product",
    intProduct: clean(body.internationalLocalProductId, 150) || null,
    fourthwallId: clean(body.internationalFourthwallProductId, 150) || null,
    intUrl: httpsUrl(body.internationalExternalProductUrl),
  };
  const errors: string[] = [];
  if (!data.internalName || !data.slug)
    errors.push("Campaign name and slug are required");
  if (
    Number.isNaN(startAt.valueOf()) ||
    Number.isNaN(endAt.valueOf()) ||
    endAt <= startAt
  )
    errors.push("End date must be after start date");
  if (duration < 1500 || duration > 6000)
    errors.push("Animation duration must be between 1500 and 6000 ms");
  if (
    ![
      data.englishEyebrow,
      data.englishTitle,
      data.englishDescription,
      data.turkishEyebrow,
      data.turkishTitle,
      data.turkishDescription,
    ].every(Boolean)
  )
    errors.push("English and Turkish campaign copy is required");
  if (!data.homepage && !data.turkiye && !data.international && !data.other)
    errors.push("Choose at least one storefront placement");
  if (!data.trEnabled && !data.intEnabled)
    errors.push("Enable at least one market destination");
  if (data.trEnabled && !data.trProduct && !data.trUrl)
    errors.push("Choose a Türkiye sticker product");
  if (data.intEnabled && data.intType === "local_product" && !data.intProduct)
    errors.push("Choose an International local product");
  if (data.intEnabled && data.intType !== "local_product" && !data.intUrl)
    errors.push("Enter a valid HTTPS International product URL");
  return { data, errors };
}

async function products() {
  const result = await pool.query(
    "SELECT payload FROM shop_settings WHERE id='primary' LIMIT 1",
  );
  return result.rows[0]?.payload || { printProducts: [] };
}
function productSummary(settings: any, id: string | null) {
  const product = (settings.printProducts || []).find(
    (entry: any) =>
      entry.id === id &&
      entry.category === "sticker" &&
      !["draft", "archived"].includes(entry.status),
  );
  if (!product) return null;
  return {
    id: product.id,
    title: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    priceMinor: product.priceMinor ?? product.priceUsdCents,
    currency: product.priceCurrency || "TRY",
    available:
      product.available &&
      product.status !== "sold_out" &&
      Number(product.inventory ?? 1) > 0,
    soldOut:
      product.status === "sold_out" ||
      !product.available ||
      Number(product.inventory ?? 1) < 1,
    inventory: product.inventory ?? null,
    maxPerUser: product.maxPerUser || 1,
    freeShippingInTurkiye: product.freeShippingInTurkiye === true,
  };
}

router.get("/sticker-drops", requireAdmin, async (req, res) => {
  try {
    await ensureStickerDropTables();
    const result = await pool.query(
      `SELECT c.*, COUNT(a.id)::int asset_count FROM sticker_drop_campaigns c LEFT JOIN sticker_drop_assets a ON a.campaign_id=c.id GROUP BY c.id ORDER BY c.updated_at DESC`,
    );
    return res.json({ campaigns: result.rows });
  } catch (error) {
    req.log.error({ err: error }, "Sticker drops failed");
    return res.status(500).json({ error: "Sticker drops could not be loaded" });
  }
});
router.get("/sticker-drops/:id", requireAdmin, async (req, res) => {
  try {
    await ensureStickerDropTables();
    const [campaign, assets] = await Promise.all([
      pool.query("SELECT * FROM sticker_drop_campaigns WHERE id=$1", [
        req.params.id,
      ]),
      pool.query(
        "SELECT id, original_filename, alt_text, display_order, byte_size FROM sticker_drop_assets WHERE campaign_id=$1 ORDER BY display_order",
        [req.params.id],
      ),
    ]);
    if (!campaign.rows[0])
      return res.status(404).json({ error: "Campaign not found" });
    return res.json({
      campaign: campaign.rows[0],
      assets: assets.rows.map((x) => ({
        ...x,
        fileUrl: `/api/sticker-drop-assets/${x.id}.png`,
      })),
    });
  } catch (error) {
    req.log.error({ err: error }, "Sticker drop failed");
    return res.status(500).json({ error: "Campaign could not be loaded" });
  }
});
router.post("/sticker-drops", requireAdmin, async (req, res) => {
  try {
    await ensureStickerDropTables();
    const { data, errors } = campaignInput(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const id = crypto.randomUUID();
    const published = ["scheduled", "active"].includes(data.status);
    const result = await pool.query(
      `INSERT INTO sticker_drop_campaigns (id,internal_name,slug,status,start_at,end_at,timezone,english_eyebrow,english_title,english_description,turkish_eyebrow,turkish_title,turkish_description,animation_duration_ms,maximum_desktop_stickers,maximum_mobile_stickers,show_on_homepage,show_on_turkiye_shop,show_on_international_shop,show_on_other_storefront_pages,frequency_mode,repeat_after_days,turkiye_enabled,turkiye_destination_type,turkiye_local_product_id,turkiye_custom_product_url,international_enabled,international_destination_type,international_local_product_id,international_fourthwall_product_id,international_external_product_url,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32) RETURNING *`,
      [
        id,
        data.internalName,
        data.slug,
        data.status,
        data.startAt,
        data.endAt,
        data.timezone,
        data.englishEyebrow,
        data.englishTitle,
        data.englishDescription,
        data.turkishEyebrow,
        data.turkishTitle,
        data.turkishDescription,
        data.duration,
        data.desktop,
        data.mobile,
        data.homepage,
        data.turkiye,
        data.international,
        data.other,
        data.frequency,
        data.repeat,
        data.trEnabled,
        data.trType,
        data.trProduct,
        data.trUrl,
        data.intEnabled,
        data.intType,
        data.intProduct,
        data.fourthwallId,
        data.intUrl,
        published ? new Date() : null,
      ],
    );
    return res.status(201).json({ campaign: result.rows[0] });
  } catch (error) {
    req.log.error({ err: error }, "Create sticker drop failed");
    return res.status(500).json({ error: "Campaign could not be created" });
  }
});
router.put("/sticker-drops/:id", requireAdmin, async (req, res) => {
  try {
    await ensureStickerDropTables();
    const { data, errors } = campaignInput(req.body);
    const assetCount = await pool.query(
      "SELECT COUNT(*)::int count FROM sticker_drop_assets WHERE campaign_id=$1",
      [req.params.id],
    );
    if (
      ["scheduled", "active"].includes(data.status) &&
      Number(assetCount.rows[0]?.count) < 1
    )
      errors.push("Upload at least one PNG before publishing");
    if (errors.length) return res.status(400).json({ errors });
    const overlap = await pool.query(
      `SELECT id,internal_name FROM sticker_drop_campaigns WHERE id<>$1 AND status IN ('scheduled','active') AND start_at<$3 AND end_at>$2 LIMIT 1`,
      [req.params.id, data.startAt, data.endAt],
    );
    const result = await pool.query(
      `UPDATE sticker_drop_campaigns SET internal_name=$2,slug=$3,status=$4,start_at=$5,end_at=$6,timezone=$7,english_eyebrow=$8,english_title=$9,english_description=$10,turkish_eyebrow=$11,turkish_title=$12,turkish_description=$13,animation_duration_ms=$14,maximum_desktop_stickers=$15,maximum_mobile_stickers=$16,show_on_homepage=$17,show_on_turkiye_shop=$18,show_on_international_shop=$19,show_on_other_storefront_pages=$20,frequency_mode=$21,repeat_after_days=$22,turkiye_enabled=$23,turkiye_destination_type=$24,turkiye_local_product_id=$25,turkiye_custom_product_url=$26,international_enabled=$27,international_destination_type=$28,international_local_product_id=$29,international_fourthwall_product_id=$30,international_external_product_url=$31,published_at=CASE WHEN $4 IN ('scheduled','active') THEN COALESCE(published_at,NOW()) ELSE published_at END,updated_at=NOW() WHERE id=$1 RETURNING *`,
      [
        req.params.id,
        data.internalName,
        data.slug,
        data.status,
        data.startAt,
        data.endAt,
        data.timezone,
        data.englishEyebrow,
        data.englishTitle,
        data.englishDescription,
        data.turkishEyebrow,
        data.turkishTitle,
        data.turkishDescription,
        data.duration,
        data.desktop,
        data.mobile,
        data.homepage,
        data.turkiye,
        data.international,
        data.other,
        data.frequency,
        data.repeat,
        data.trEnabled,
        data.trType,
        data.trProduct,
        data.trUrl,
        data.intEnabled,
        data.intType,
        data.intProduct,
        data.fourthwallId,
        data.intUrl,
      ],
    );
    if (!result.rows[0])
      return res.status(404).json({ error: "Campaign not found" });
    return res.json({
      campaign: result.rows[0],
      warning: overlap.rows[0]
        ? `Schedule overlaps ${overlap.rows[0].internal_name}`
        : null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Update sticker drop failed");
    return res.status(500).json({ error: "Campaign could not be updated" });
  }
});
router.post("/sticker-drops/:id/duplicate", requireAdmin, async (req, res) => {
  try {
    await ensureStickerDropTables();
    const source = await pool.query(
      "SELECT * FROM sticker_drop_campaigns WHERE id=$1",
      [req.params.id],
    );
    if (!source.rows[0])
      return res.status(404).json({ error: "Campaign not found" });
    const c = source.rows[0],
      id = crypto.randomUUID();
    const result = await pool.query(
      `INSERT INTO sticker_drop_campaigns SELECT $1, internal_name||' Copy', slug||'-'||substr($1,1,6), 'draft', start_at,end_at,timezone,english_eyebrow,english_title,english_description,turkish_eyebrow,turkish_title,turkish_description,animation_duration_ms,maximum_desktop_stickers,maximum_mobile_stickers,show_on_homepage,show_on_turkiye_shop,show_on_international_shop,show_on_other_storefront_pages,frequency_mode,repeat_after_days,turkiye_enabled,turkiye_destination_type,turkiye_local_product_id,turkiye_custom_product_url,international_enabled,international_destination_type,international_local_product_id,international_fourthwall_product_id,international_external_product_url,NULL,NOW(),NOW() FROM sticker_drop_campaigns WHERE id=$2 RETURNING *`,
      [id, c.id],
    );
    return res.status(201).json({ campaign: result.rows[0] });
  } catch (error) {
    req.log.error({ err: error }, "Duplicate failed");
    return res.status(500).json({ error: "Campaign could not be duplicated" });
  }
});
router.post(
  "/sticker-drops/:id/assets",
  requireAdmin,
  upload.array("stickers", 20),
  async (req, res) => {
    try {
      await ensureStickerDropTables();
      const files = (req.files || []) as Express.Multer.File[];
      const current = await pool.query(
        "SELECT COUNT(*)::int count FROM sticker_drop_assets WHERE campaign_id=$1",
        [req.params.id],
      );
      if (Number(current.rows[0]?.count) + files.length > 20)
        return res
          .status(400)
          .json({ error: "A campaign can contain at most 20 stickers" });
      const assets = [];
      for (const file of files) {
        if (
          file.mimetype !== "image/png" ||
          !file.buffer
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        )
          return res
            .status(400)
            .json({ error: "Only genuine PNG files are accepted" });
        const meta = await sharp(file.buffer).metadata();
        if (meta.format !== "png" || !meta.hasAlpha)
          return res
            .status(400)
            .json({ error: "Sticker PNGs must preserve transparency" });
        const id = crypto.randomUUID();
        await pool.query(
          "INSERT INTO sticker_drop_assets(id,campaign_id,original_filename,display_order,byte_size,data) VALUES($1,$2,$3,$4,$5,$6)",
          [
            id,
            req.params.id,
            file.originalname,
            Number(current.rows[0]?.count) + assets.length,
            file.size,
            file.buffer,
          ],
        );
        assets.push({
          id,
          fileUrl: `/api/sticker-drop-assets/${id}.png`,
          originalFilename: file.originalname,
        });
      }
      return res.status(201).json({ assets });
    } catch (error) {
      req.log.error({ err: error }, "Sticker upload failed");
      return res.status(500).json({ error: "Stickers could not be uploaded" });
    }
  },
);
router.put("/sticker-drops/:id/assets", requireAdmin, async (req, res) => {
  try {
    const assets = Array.isArray(req.body?.assets) ? req.body.assets : [];
    for (const [index, asset] of assets.entries())
      await pool.query(
        "UPDATE sticker_drop_assets SET display_order=$3,alt_text=$4 WHERE id=$1 AND campaign_id=$2",
        [asset.id, req.params.id, index, clean(asset.altText, 200)],
      );
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Sticker order could not be saved" });
  }
});
router.delete(
  "/sticker-drops/:campaignId/assets/:assetId",
  requireAdmin,
  async (req, res) => {
    await pool.query(
      "DELETE FROM sticker_drop_assets WHERE id=$1 AND campaign_id=$2",
      [req.params.assetId, req.params.campaignId],
    );
    return res.status(204).end();
  },
);

router.get("/sticker-drop-assets/:id.png", async (req, res) => {
  try {
    await ensureStickerDropTables();
    const result = await pool.query(
      "SELECT original_filename,byte_size,data FROM sticker_drop_assets WHERE id=$1",
      [req.params.id],
    );
    if (!result.rows[0]) return res.status(404).end();
    res.set({
      "Content-Type": "image/png",
      "Content-Length": String(result.rows[0].byte_size),
      "Cache-Control": "public,max-age=31536000,immutable",
      "X-Content-Type-Options": "nosniff",
    });
    return res.send(result.rows[0].data);
  } catch {
    return res.status(404).end();
  }
});
router.get("/sticker-drop/active", async (req, res) => {
  try {
    await ensureStickerDropTables();
    const result = await pool.query(
      `SELECT * FROM sticker_drop_campaigns WHERE status IN ('scheduled','active') AND start_at<=NOW() AND end_at>NOW() ORDER BY published_at DESC NULLS LAST,updated_at DESC LIMIT 1`,
    );
    const campaign = result.rows[0];
    if (!campaign) {
      res.set("Cache-Control", "public,max-age=30");
      return res.json({ campaign: null });
    }
    const [assets, settings] = await Promise.all([
      pool.query(
        "SELECT id FROM sticker_drop_assets WHERE campaign_id=$1 ORDER BY display_order",
        [campaign.id],
      ),
      products(),
    ]);
    if (!assets.rows.length) return res.json({ campaign: null });
    const trProduct = campaign.turkiye_enabled
      ? productSummary(settings, campaign.turkiye_local_product_id)
      : null;
    const intProduct =
      campaign.international_enabled &&
      campaign.international_destination_type === "local_product"
        ? productSummary(settings, campaign.international_local_product_id)
        : null;
    const tr =
      campaign.turkiye_enabled &&
      (trProduct || campaign.turkiye_custom_product_url)
        ? {
            type: campaign.turkiye_destination_type,
            product: trProduct,
            url: campaign.turkiye_custom_product_url,
          }
        : null;
    const intl =
      campaign.international_enabled &&
      (intProduct || campaign.international_external_product_url)
        ? {
            type: campaign.international_destination_type,
            product: intProduct,
            url: campaign.international_external_product_url,
            fourthwallProductId: campaign.international_fourthwall_product_id,
          }
        : null;
    if (!tr && !intl) return res.json({ campaign: null });
    res.set("Cache-Control", "public,max-age=30");
    return res.json({
      campaign: {
        id: campaign.id,
        slug: campaign.slug,
        startAt: campaign.start_at,
        endAt: campaign.end_at,
        duration: campaign.animation_duration_ms,
        maximumDesktopStickers: campaign.maximum_desktop_stickers,
        maximumMobileStickers: campaign.maximum_mobile_stickers,
        copy: {
          en: {
            eyebrow: campaign.english_eyebrow,
            title: campaign.english_title,
            description: campaign.english_description,
          },
          tr: {
            eyebrow: campaign.turkish_eyebrow,
            title: campaign.turkish_title,
            description: campaign.turkish_description,
          },
        },
        placements: {
          homepage: campaign.show_on_homepage,
          turkiye: campaign.show_on_turkiye_shop,
          international: campaign.show_on_international_shop,
          other: campaign.show_on_other_storefront_pages,
        },
        frequencyMode: campaign.frequency_mode,
        repeatAfterDays: campaign.repeat_after_days,
        assets: assets.rows.map((x) => `/api/sticker-drop-assets/${x.id}.png`),
        destinations: { turkiye: tr, international: intl },
      },
    });
  } catch (error) {
    req.log.error({ err: error }, "Active sticker drop failed");
    return res.status(500).json({ error: "Sticker Drop could not be loaded" });
  }
});

export default router;
