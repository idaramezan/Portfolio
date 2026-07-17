import { Router } from "express";
import { db, artworksTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

const router = Router();

// GET /artworks
router.get("/", async (req, res) => {
  try {
    const { status, category, limit } = req.query;
    let query = db.select().from(artworksTable).$dynamic();

    if (status && typeof status === "string") {
      query = query.where(eq(artworksTable.status, status as "AVAILABLE" | "SOLD" | "RESERVED"));
    }
    if (category && typeof category === "string") {
      query = query.where(eq(artworksTable.category, category));
    }

    const limitNum = limit ? Math.min(parseInt(limit as string) || 50, 100) : 50;
    const artworks = await query.limit(limitNum).orderBy(artworksTable.createdAt);

    return res.json(artworks);
  } catch (err) {
    req.log.error({ err }, "Failed to list artworks");
    return res.status(500).json({ error: "Failed to list artworks" });
  }
});

// GET /artworks/stats
router.get("/stats", async (req, res) => {
  try {
    const [totalRes, byStatusRes, byCategoryRes] = await Promise.all([
      db.select({ count: count() }).from(artworksTable),
      db
        .select({ status: artworksTable.status, count: count() })
        .from(artworksTable)
        .groupBy(artworksTable.status),
      db
        .select({ category: artworksTable.category, count: count() })
        .from(artworksTable)
        .groupBy(artworksTable.category),
    ]);

    const statusMap: Record<string, number> = {};
    byStatusRes.forEach((r) => {
      statusMap[r.status] = Number(r.count);
    });

    return res.json({
      total: Number(totalRes[0]?.count ?? 0),
      available: statusMap["AVAILABLE"] ?? 0,
      sold: statusMap["SOLD"] ?? 0,
      reserved: statusMap["RESERVED"] ?? 0,
      byCategory: byCategoryRes.map((r) => ({
        category: r.category,
        count: Number(r.count),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get artwork stats");
    return res.status(500).json({ error: "Failed to get artwork stats" });
  }
});

// GET /artworks/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [artwork] = await db.select().from(artworksTable).where(eq(artworksTable.id, id)).limit(1);

    if (!artwork) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    return res.json(artwork);
  } catch (err) {
    req.log.error({ err }, "Failed to get artwork");
    return res.status(500).json({ error: "Failed to get artwork" });
  }
});

// PATCH /artworks/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, status, priceCents, category, availableAsPrint, printfulProductId } = req.body;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priceCents !== undefined) updateData.priceCents = priceCents;
    if (category !== undefined) updateData.category = category;
    if (availableAsPrint !== undefined) updateData.availableAsPrint = availableAsPrint;
    if (printfulProductId !== undefined) updateData.printfulProductId = printfulProductId;

    const [updated] = await db
      .update(artworksTable)
      .set(updateData)
      .where(eq(artworksTable.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update artwork");
    return res.status(500).json({ error: "Failed to update artwork" });
  }
});

export default router;
