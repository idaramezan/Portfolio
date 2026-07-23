import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import { pool } from "@workspace/db";

const router = Router();

async function ensureProductImagesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
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
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO product_images
          (id, original_name, mime_type, byte_size, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          request.file.originalname,
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
          byteSize: request.file.size,
        },
        "Product media stored in PostgreSQL",
      );
      return response.status(201).json({
        imageUrl: `/api/product-images/${id}`,
        storage: "postgres",
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
      (image) => `/api/product-images/${image.id}`,
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
