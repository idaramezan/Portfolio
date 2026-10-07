import { Router } from "express";
import { pool } from "@workspace/db";
import sharp from "sharp";

const router = Router();

router.get("/product-images/:id", async (request, response) => {
  try {
    const imageId = String(request.params.id).replace(
      /\.(webp|jpe?g|png|gif)$/i,
      "",
    );
    const result = await pool.query(
      `SELECT original_name, mime_type, byte_size, data
       FROM product_images
       WHERE id = $1
       LIMIT 1`,
      [imageId],
    );
    const image = result.rows[0];
    if (!image) return response.status(404).json({ error: "Image not found" });
    const requestedWidth = Math.min(
      2000,
      Math.max(0, Number.parseInt(String(request.query.w || "0"), 10) || 0),
    );
    const canResize = requestedWidth > 0 && image.mime_type !== "image/gif";
    const output = canResize
      ? await sharp(image.data)
          .resize({
            width: requestedWidth,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 84, effort: 4, smartSubsample: true })
          .toBuffer()
      : image.data;
    const mimeType = canResize ? "image/webp" : image.mime_type;
    response.set({
      "Content-Type": mimeType,
      "Content-Length": String(output.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Product-Image-Storage": "postgres",
      "Content-Disposition": `inline; filename="${String(image.original_name).replace(/["\\]/g, "")}"`,
    });
    return response.send(output);
  } catch (error) {
    request.log.error({ error }, "Failed to serve product image");
    return response.status(500).json({ error: "Image could not be loaded" });
  }
});

export default router;
