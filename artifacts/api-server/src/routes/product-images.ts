import { Router } from "express";
import { pool } from "@workspace/db";

const router = Router();

router.get("/product-images/:id", async (request, response) => {
  try {
    const imageId = String(request.params.id).replace(/\.webp$/i, "");
    const result = await pool.query(
      `SELECT original_name, mime_type, byte_size, data
       FROM product_images
       WHERE id = $1
       LIMIT 1`,
      [imageId],
    );
    const image = result.rows[0];
    if (!image) return response.status(404).json({ error: "Image not found" });
    response.set({
      "Content-Type": image.mime_type,
      "Content-Length": String(image.byte_size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Product-Image-Storage": "postgres",
      "Content-Disposition": `inline; filename="${String(image.original_name).replace(/["\\]/g, "")}"`,
    });
    return response.send(image.data);
  } catch (error) {
    request.log.error({ error }, "Failed to serve product image");
    return response.status(500).json({ error: "Image could not be loaded" });
  }
});

export default router;
