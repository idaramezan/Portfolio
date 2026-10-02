import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

async function ensureTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS edition_reservations (
    id UUID PRIMARY KEY,
    edition_group_id TEXT NOT NULL,
    edition_number INTEGER NOT NULL,
    fourthwall_product_id TEXT NOT NULL,
    basket_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sold_at TIMESTAMPTZ
  )`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS edition_reservations_active_unit
    ON edition_reservations(edition_group_id,edition_number) WHERE status='active'`);
  await pool.query(`ALTER TABLE edition_reservations
    ADD COLUMN IF NOT EXISTS limited_collection_id TEXT,
    ADD COLUMN IF NOT EXISTS product_id TEXT,
    ADD COLUMN IF NOT EXISTS order_id TEXT,
    ADD COLUMN IF NOT EXISTS collector_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS edition_size INTEGER,
    ADD COLUMN IF NOT EXISTS purchase_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS edition_reservations_allocated_unit
    ON edition_reservations(edition_group_id,edition_number) WHERE status IN ('active','sold')`);
}

router.get(
  "/limited-editions/:slug/availability",
  async (request, response) => {
    const slug = String(request.params.slug || "");
    if (!/^[a-z0-9-]{1,120}$/i.test(slug))
      return response.status(400).json({ error: "Invalid edition." });
    await ensureTables();
    await pool.query(
      "UPDATE edition_reservations SET status='expired' WHERE status='active' AND expires_at<=NOW()",
    );
    const stored = await pool.query(
      "SELECT payload FROM shop_settings WHERE id='primary'",
    );
    const settings = stored.rows[0]?.payload || {};
    const group = (settings.limitedEditionGroups || []).find(
      (item: any) => item.slug === slug,
    );
    if (!group)
      return response.status(404).json({ error: "Edition not found." });
    const allocated = await pool.query(
      "SELECT COUNT(*)::int count FROM edition_reservations WHERE edition_group_id=$1 AND status IN ('active','sold')",
      [group.id],
    );
    const sold = (group.units || []).filter(
      (item: any) => item.status === "sold",
    ).length;
    const unavailable = Math.max(sold, Number(allocated.rows[0]?.count || 0));
    return response.json({
      editionSize: Number(group.editionSize || 0),
      remaining: Math.max(0, Number(group.editionSize || 0) - unavailable),
      collected: sold,
    });
  },
);

router.post("/limited-editions/:slug/reserve", async (request, response) => {
  const slug = String(request.params.slug || "");
  if (!/^[a-z0-9-]{1,120}$/i.test(slug))
    return response.status(400).json({ error: "Invalid edition." });
  await ensureTables();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [slug]);
    await client.query(
      "UPDATE edition_reservations SET status='expired' WHERE status='active' AND expires_at<=NOW()",
    );
    const stored = await client.query(
      "SELECT payload FROM shop_settings WHERE id='primary' FOR SHARE",
    );
    const settings = stored.rows[0]?.payload || {};
    const group = (settings.limitedEditionGroups || []).find(
      (item: any) => item.slug === slug,
    );
    if (!group) {
      await client.query("ROLLBACK");
      return response.status(404).json({ error: "Edition not found." });
    }
    const collection = (settings.weeklyLimitedCollections || []).find(
      (item: any) => (item.editionGroupIds || []).includes(group.id),
    );
    const now = Date.now(),
      start = Date.parse(group.releaseStart || ""),
      end = Date.parse(collection?.endAt || group.releaseEnd || "");
    if (
      ["draft", "closed", "archived"].includes(group.status) ||
      (Number.isFinite(start) && now < start) ||
      (Number.isFinite(end) && now >= end)
    ) {
      await client.query("ROLLBACK");
      return response.status(409).json({ error: "This edition is closed." });
    }
    const active = await client.query(
      "SELECT edition_number FROM edition_reservations WHERE edition_group_id=$1 AND status IN ('active','sold') FOR UPDATE",
      [group.id],
    );
    const reserved = new Set(
      active.rows.map((row) => Number(row.edition_number)),
    );
    const unit = [...(group.units || [])]
      .sort((a: any, b: any) => a.editionNumber - b.editionNumber)
      .find(
        (item: any) =>
          item.status === "available" &&
          !reserved.has(Number(item.editionNumber)),
      );
    if (!unit) {
      await client.query("ROLLBACK");
      return response.status(409).json({ error: "This edition is sold out." });
    }
    const id = crypto.randomUUID();
    const product = (settings.printProducts || []).find(
      (item: any) => item.id === group.productId,
    );
    const requestedFourthwallId = String(
      request.body?.fourthwallProductId || product?.fourthwallProductId || "",
    ).slice(0, 180);
    await client.query(
      `INSERT INTO edition_reservations(
        id,edition_group_id,edition_number,fourthwall_product_id,basket_id,
        expires_at,limited_collection_id,product_id,edition_size,purchase_snapshot
      ) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '15 minutes',$6,$7,$8,$9::jsonb)`,
      [
        id,
        group.id,
        unit.editionNumber,
        requestedFourthwallId || "local",
        String(request.body?.basketId || "").slice(0, 160) || null,
        collection?.id || null,
        group.productId || null,
        group.editionSize,
        JSON.stringify({
          limitedCollectionId: collection?.id || null,
          limitedEditionId: group.id,
          productId: group.productId || null,
          editionNumber: unit.editionNumber,
          editionSize: group.editionSize,
          fourthwallProductId: requestedFourthwallId || null,
          reservedAt: new Date().toISOString(),
        }),
      ],
    );
    await client.query("COMMIT");
    return response.status(201).json({
      reservationId: id,
      productId: group.productId || null,
      fourthwallProductId: requestedFourthwallId || null,
      editionNumber: unit.editionNumber,
      expiresInSeconds: 900,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    request.log.error({ error }, "Limited edition reservation failed");
    return response
      .status(500)
      .json({ error: "This edition could not be reserved." });
  } finally {
    client.release();
  }
});

export default router;
