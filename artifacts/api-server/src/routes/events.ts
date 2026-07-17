import { Router } from "express";
import { db, eventsTable, eventSignupsTable } from "@workspace/db";
import { eq, count, gte } from "drizzle-orm";

const router = Router();

// GET /events
router.get("/", async (req, res) => {
  try {
    const { upcoming } = req.query;

    let query = db.select().from(eventsTable).$dynamic();

    if (upcoming === "true") {
      query = query.where(gte(eventsTable.dateTime, new Date()));
    }

    const events = await query.orderBy(eventsTable.dateTime);

    // Add signup counts
    const signupCounts = await db
      .select({ eventId: eventSignupsTable.eventId, count: count() })
      .from(eventSignupsTable)
      .groupBy(eventSignupsTable.eventId);

    const countMap: Record<number, number> = {};
    signupCounts.forEach((r) => {
      countMap[r.eventId] = Number(r.count);
    });

    return res.json(
      events.map((e) => ({
        ...e,
        signupCount: countMap[e.id] ?? 0,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list events");
    return res.status(500).json({ error: "Failed to list events" });
  }
});

// POST /events
router.post("/", async (req, res) => {
  try {
    const { title, description, dateTime, location, imageUrl } = req.body;

    if (!title || !description || !dateTime || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [event] = await db
      .insert(eventsTable)
      .values({
        title,
        description,
        dateTime: new Date(dateTime),
        location,
        imageUrl: imageUrl ?? null,
      })
      .returning();

    return res.status(201).json({ ...event, signupCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create event");
    return res.status(500).json({ error: "Failed to create event" });
  }
});

// GET /events/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const [signupCount] = await db
      .select({ count: count() })
      .from(eventSignupsTable)
      .where(eq(eventSignupsTable.eventId, id));

    return res.json({ ...event, signupCount: Number(signupCount?.count ?? 0) });
  } catch (err) {
    req.log.error({ err }, "Failed to get event");
    return res.status(500).json({ error: "Failed to get event" });
  }
});

// POST /events/:id/signup
router.post("/:id/signup", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check for duplicate
    const [existing] = await db
      .select()
      .from(eventSignupsTable)
      .where(eq(eventSignupsTable.eventId, id))
      .limit(1);

    const [signup] = await db
      .insert(eventSignupsTable)
      .values({ eventId: id, name, email })
      .returning();

    return res.status(201).json(signup);
  } catch (err) {
    req.log.error({ err }, "Failed to sign up for event");
    return res.status(500).json({ error: "Failed to sign up for event" });
  }
});

export default router;
