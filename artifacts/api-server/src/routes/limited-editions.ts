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
}

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
    const now = Date.now(),
      start = Date.parse(group.releaseStart || ""),
      end = Date.parse(group.releaseEnd || "");
    if (
      ["draft", "closed", "archived"].includes(group.status) ||
      (Number.isFinite(start) && now < start) ||
      (Number.isFinite(end) && now >= end)
    ) {
      await client.query("ROLLBACK");
      return response.status(409).json({ error: "This edition is closed." });
    }
    const active = await client.query(
      "SELECT edition_number FROM edition_reservations WHERE edition_group_id=$1 AND status='active' FOR UPDATE",
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
          item.fourthwallProductId &&
          !reserved.has(Number(item.editionNumber)),
      );
    if (!unit) {
      await client.query("ROLLBACK");
      return response.status(409).json({ error: "This edition is sold out." });
    }
    const id = crypto.randomUUID();
    await client.query(
      "INSERT INTO edition_reservations(id,edition_group_id,edition_number,fourthwall_product_id,basket_id,expires_at) VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '15 minutes')",
      [
        id,
        group.id,
        unit.editionNumber,
        unit.fourthwallProductId,
        String(request.body?.basketId || "").slice(0, 160) || null,
      ],
    );
    await client.query("COMMIT");
    return response
      .status(201)
      .json({
        reservationId: id,
        fourthwallProductId: unit.fourthwallProductId,
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
