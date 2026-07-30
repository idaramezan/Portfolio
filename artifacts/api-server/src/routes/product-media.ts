import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import { pool } from "@workspace/db";
import sharp from "sharp";

const router = Router();

async function ensureProductImagesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      data BYTEA NOT NULL,
      source_mime_type TEXT,
      source_byte_size INTEGER,
      source_data BYTEA,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    `ALTER TABLE product_images ADD COLUMN IF NOT EXISTS source_mime_type TEXT, ADD COLUMN IF NOT EXISTS source_byte_size INTEGER, ADD COLUMN IF NOT EXISTS source_data BYTEA`,
  );
}

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    callback(null, allowedTypes.has(file.mimetype));
  },
});

function requireAdmin(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const password = request.headers["x-admin-password"];
  const expectedPassword =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expectedPassword || password !== expectedPassword) {
    request.log.warn(
      { operation: "product-image-upload", stage: "authentication" },
      "Product media upload rejected",
    );
    return response
      .status(401)
      .json({ error: "Admin authentication required" });
  }
  return next();
}

router.post(
  "/product-media",
  requireAdmin,
  upload.single("image"),
  async (request, response) => {
    if (!request.file)
      return response.status(400).json({ error: "A valid image is required" });
    try {
      await ensureProductImagesTable();
      const newsletterImage = request.body.productId === "newsletter-campaign";
      if (newsletterImage && request.file.size > 8 * 1024 * 1024)
        return response
          .status(413)
          .json({ error: "Newsletter photographs must be 8 MB or smaller" });
      const id = crypto.randomUUID();
      const derivative = newsletterImage
        ? await sharp(request.file.buffer)
            .rotate()
            .resize({
              width: 1400,
              height: 1400,
              fit: "inside",
              withoutEnlargement: true,
            })
            .flatten({ background: "#fffaf1" })
            .jpeg({ quality: 90, mozjpeg: true })
            .toBuffer()
        : await sharp(request.file.buffer)
            .rotate()
            .webp({
              quality: 92,
              nearLossless: true,
              smartSubsample: true,
              effort: 5,
            })
            .toBuffer();
      const mimeType = newsletterImage ? "image/jpeg" : "image/webp";
      const storedName = `${request.file.originalname.replace(/\.[^.]+$/, "")}.${newsletterImage ? "jpg" : "webp"}`;
      await pool.query(
        `INSERT INTO product_images
          (id, original_name, mime_type, byte_size, data, source_mime_type, source_byte_size, source_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          storedName,
          mimeType,
          derivative.length,
          derivative,
          request.file.mimetype,
          request.file.size,
          request.file.buffer,
        ],
      );
      request.log.info(
        {
          operation: "product-image-upload",
          productId: request.body.productId || "new",
          imageId: id,
          sourceByteSize: request.file.size,
          webpByteSize: derivative.length,
        },
        "Product media stored in PostgreSQL",
      );
      return response.status(201).json({
        imageUrl: `/api/product-images/${id}.${newsletterImage ? "jpg" : "webp"}`,
        storage: "postgres",
        format: newsletterImage ? "jpeg" : "webp",
      });
    } catch (error) {
      request.log.error({ error }, "Failed to persist product media");
      return response.status(500).json({ error: "Image could not be stored" });
    }
  },
);

router.get("/product-media", requireAdmin, async (request, response) => {
  try {
    await ensureProductImagesTable();
    const result = await pool.query(
      "SELECT id FROM product_images ORDER BY created_at DESC",
    );
    const images = result.rows.map(
      (image) => `/api/product-images/${image.id}.webp`,
    );
    return response.json({ images });
  } catch (error) {
    request.log.error(
      { error, operation: "product-media-list" },
      "Failed to list product media",
    );
    return response.status(500).json({ error: "Media could not be loaded" });
  }
});

export default router;
