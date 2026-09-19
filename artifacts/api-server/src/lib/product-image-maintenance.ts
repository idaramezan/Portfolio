import { pool } from "@workspace/db";
import { logger } from "./logger";

const IMAGE_PATTERN = /^\/api\/product-images\/([a-f0-9-]+)(?:\.[a-z0-9]+)?$/i;

function collectImageIds(value: unknown, result = new Set<string>()) {
  if (typeof value === "string") {
    const id = value.trim().match(IMAGE_PATTERN)?.[1];
    if (id) result.add(id);
  } else if (Array.isArray(value)) {
    for (const item of value) collectImageIds(item, result);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectImageIds(item, result);
  }
  return result;
}

async function preserveTableReferences(
  retained: Set<string>,
  table: string,
  columns: string[],
) {
  const exists = await pool.query("SELECT to_regclass($1) AS name", [
    `public.${table}`,
  ]);
  if (!exists.rows[0]?.name) return;
  const safeTable = `"${table}"`;
  const safeColumns = columns.map((column) => `"${column}"`).join(",");
  const rows = await pool.query(`SELECT ${safeColumns} FROM ${safeTable}`);
  collectImageIds(rows.rows, retained);
}

export async function compactProductImageStorage() {
  try {
    const table = await pool.query(
      "SELECT to_regclass('public.product_images') AS name",
    );
    if (!table.rows[0]?.name) return;
    const retained = new Set<string>();
    await preserveTableReferences(retained, "shop_settings", ["payload"]);
    await preserveTableReferences(retained, "artworks", ["image_url"]);
    await preserveTableReferences(retained, "events", ["image_url"]);
    await preserveTableReferences(retained, "event_banner_config", ["image_url"]);
    await preserveTableReferences(retained, "event_gallery_images", ["image_url"]);
    await preserveTableReferences(retained, "gallery_elements", ["image_url"]);
    await preserveTableReferences(retained, "gallery_assets", [
      "image_url",
      "thumbnail_url",
    ]);
    await preserveTableReferences(retained, "newsletter_campaigns", ["blocks"]);
    await preserveTableReferences(retained, "newsletter_templates", ["blocks"]);
    await preserveTableReferences(retained, "newsletter_template_revisions", ["blocks"]);
    let compacted = 0;
    for (;;) {
      const result = await pool.query(`
        UPDATE product_images
        SET source_data=NULL, source_byte_size=NULL, source_mime_type=NULL
        WHERE id IN (
          SELECT id FROM product_images
          WHERE source_data IS NOT NULL
          LIMIT 1
        )
        RETURNING id
      `);
      compacted += result.rowCount || 0;
      if (!result.rowCount) break;
    }
    let deleted = 0;
    for (;;) {
      const result = await pool.query(
        `DELETE FROM product_images
         WHERE id IN (
           SELECT id FROM product_images
           WHERE created_at < NOW() - INTERVAL '1 hour'
             AND NOT (id = ANY($1::text[]))
           LIMIT 5
         )
         RETURNING id`,
        [[...retained]],
      );
      deleted += result.rowCount || 0;
      if (!result.rowCount) break;
    }
    if (compacted || deleted)
      await pool.query("VACUUM (ANALYZE) product_images");
    logger.info(
      {
        operation: "product-image-compaction",
        compacted,
        deleted,
        retained: retained.size,
      },
      "Reclaimed unused product image storage",
    );
  } catch (error) {
    logger.error(
      { error, operation: "product-image-compaction" },
      "Product image storage compaction could not run",
    );
  }
}
