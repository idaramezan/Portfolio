import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import fs from "fs";
import multer from "multer";
import path from "path";

const router = Router();
const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(
        null,
        `product_${Date.now()}_${crypto.randomUUID().slice(0, 8)}${extension}`,
      );
    },
  }),
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
  (request, response) => {
    if (!request.file)
      return response.status(400).json({ error: "A valid image is required" });
    request.log.info(
      {
        operation: "product-image-upload",
        productId: request.body.productId || "new",
        timestamp: new Date().toISOString(),
      },
      "Product media uploaded",
    );
    return response.status(201).json({
      imageUrl: `/api/uploads/${request.file.filename}`,
    });
  },
);

router.get("/product-media", requireAdmin, (request, response) => {
  try {
    const images = fs
      .readdirSync(uploadsDir)
      .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
      .map((file) => `/api/uploads/${file}`);
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
