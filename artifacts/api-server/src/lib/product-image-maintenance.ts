import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function compactProductImageStorage() {
  try {
    const table = await pool.query(
      "SELECT to_regclass('public.product_images') AS name",
    );
    if (!table.rows[0]?.name) return;
    let compacted = 0;
    for (;;) {
      const result = await pool.query(`
        UPDATE product_images
        SET source_data=NULL, source_byte_size=NULL, source_mime_type=NULL
        WHERE id IN (
          SELECT id FROM product_images
          WHERE source_data IS NOT NULL
          LIMIT 10
        )
        RETURNING id
      `);
      compacted += result.rowCount || 0;
      if (!result.rowCount) break;
    }
    if (compacted) await pool.query("VACUUM (ANALYZE) product_images");
    logger.info(
      { operation: "product-image-compaction", compacted },
      "Removed unused original product image copies",
    );
  } catch (error) {
    logger.error(
      { error, operation: "product-image-compaction" },
      "Product image storage compaction could not run",
    );
  }
}
