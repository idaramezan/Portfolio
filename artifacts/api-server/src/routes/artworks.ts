import { Router, Request, Response, NextFunction } from "express";
import { db, artworksTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// ── Multer for image uploads ──────────────────────────────────────────────────
const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `artwork_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// ── Admin middleware ──────────────────────────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const pw = req.headers["x-admin-password"];
  if (!process.env.ADMIN_PASSWORD || pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

// ── GET /artworks ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { status, category, forSale, limit } = req.query;
    let query = db.select().from(artworksTable).$dynamic();

    if (status && typeof status === "string") {
      query = query.where(eq(artworksTable.status, status as "AVAILABLE" | "SOLD" | "RESERVED"));
    }
    if (category && typeof category === "string") {
      query = query.where(eq(artworksTable.category, category));
    }
    if (forSale !== undefined) {
      query = query.where(eq(artworksTable.forSale, forSale === "true"));
    }

    const limitNum = limit ? Math.min(parseInt(limit as string) || 100, 200) : 100;
    const artworks = await query.limit(limitNum).orderBy(artworksTable.id);

    return res.json(artworks);
  } catch (err) {
    req.log.error({ err }, "Failed to list artworks");
    return res.status(500).json({ error: "Failed to list artworks" });
  }
});

// ── GET /artworks/stats ───────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [totalRes, byStatusRes, byCategoryRes] = await Promise.all([
      db.select({ count: count() }).from(artworksTable),
      db.select({ status: artworksTable.status, count: count() }).from(artworksTable).groupBy(artworksTable.status),
      db.select({ category: artworksTable.category, count: count() }).from(artworksTable).groupBy(artworksTable.category),
    ]);

    const statusMap: Record<string, number> = {};
    byStatusRes.forEach((r) => { statusMap[r.status] = Number(r.count); });

    return res.json({
      total: Number(totalRes[0]?.count ?? 0),
      available: statusMap["AVAILABLE"] ?? 0,
      sold: statusMap["SOLD"] ?? 0,
      reserved: statusMap["RESERVED"] ?? 0,
      byCategory: byCategoryRes.map((r) => ({ category: r.category, count: Number(r.count) })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get artwork stats");
    return res.status(500).json({ error: "Failed to get artwork stats" });
  }
});

// ── POST /artworks — create (admin) ──────────────────────────────────────────
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { title, description, medium, sizeInches, year, priceCents, currency, status, category, forSale, availableAsPrint, imageUrl } = req.body;

    if (!title) return res.status(400).json({ error: "Title is required" });

    const [artwork] = await db
      .insert(artworksTable)
      .values({
        title,
        description: description ?? null,
        medium: medium ?? "Oil pastel",
        sizeInches: sizeInches ?? null,
        year: year ?? 2026,
        priceCents: priceCents != null ? Number(priceCents) : null,
        currency: currency ?? "USD",
        status: status ?? "AVAILABLE",
        category: category ?? "Other",
        forSale: forSale ?? false,
        availableAsPrint: availableAsPrint ?? false,
        imageUrl: imageUrl ?? "",
      })
      .returning();

    return res.status(201).json(artwork);
  } catch (err) {
    req.log.error({ err }, "Failed to create artwork");
    return res.status(500).json({ error: "Failed to create artwork" });
  }
});

// ── GET /artworks/:id ─────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [artwork] = await db.select().from(artworksTable).where(eq(artworksTable.id, id)).limit(1);
    if (!artwork) return res.status(404).json({ error: "Artwork not found" });
    return res.json(artwork);
  } catch (err) {
    req.log.error({ err }, "Failed to get artwork");
    return res.status(500).json({ error: "Failed to get artwork" });
  }
});

// ── PATCH /artworks/:id — update (admin) ─────────────────────────────────────
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { title, description, status, priceCents, category, sizeInches, year, forSale, availableAsPrint, printfulProductId } = req.body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priceCents !== undefined) updateData.priceCents = priceCents === null || priceCents === "" ? null : Number(priceCents);
    if (category !== undefined) updateData.category = category;
    if (sizeInches !== undefined) updateData.sizeInches = sizeInches;
    if (year !== undefined) updateData.year = Number(year);
    if (forSale !== undefined) updateData.forSale = forSale;
    if (availableAsPrint !== undefined) updateData.availableAsPrint = availableAsPrint;
    if (printfulProductId !== undefined) updateData.printfulProductId = printfulProductId;

    const [updated] = await db.update(artworksTable).set(updateData).where(eq(artworksTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Artwork not found" });
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update artwork");
    return res.status(500).json({ error: "Failed to update artwork" });
  }
});

// ── POST /artworks/:id/image — upload image (admin) ──────────────────────────
router.post("/:id/image", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const imageUrl = `/api/uploads/${req.file.filename}`;
    const [updated] = await db.update(artworksTable).set({ imageUrl }).where(eq(artworksTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Artwork not found" });
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to upload image");
    return res.status(500).json({ error: "Failed to upload image" });
  }
});

// ── DELETE /artworks/:id — delete (admin) ────────────────────────────────────
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(artworksTable).where(eq(artworksTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete artwork");
    return res.status(500).json({ error: "Failed to delete artwork" });
  }
});

export default router;
