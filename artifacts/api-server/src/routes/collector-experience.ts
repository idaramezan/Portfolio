import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import { pool } from "@workspace/db";

const router = Router();
const DEFAULT_YOUTUBE_ID = "gAJYgEfwpQg";

function requireAdmin(request: Request, response: Response, next: NextFunction) {
  const expected =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expected || request.headers["x-admin-password"] !== expected)
    return response.status(401).json({ error: "Admin authentication required" });
  return next();
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collector_video_media (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS collector_experience_config (
      id TEXT PRIMARY KEY,
      video_source TEXT NOT NULL DEFAULT 'youtube',
      uploaded_video_id TEXT REFERENCES collector_video_media(id) ON DELETE SET NULL,
      youtube_video_id TEXT,
      poster_url TEXT,
      youtube_has_embedded_borders BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO collector_experience_config
      (id, video_source, youtube_video_id, youtube_has_embedded_borders)
    VALUES ('default', 'youtube', '${DEFAULT_YOUTUBE_ID}', TRUE)
    ON CONFLICT (id) DO NOTHING;
  `);
}

function youtubeId(value: unknown) {
  const raw = String(value || "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname === "youtu.be") return url.pathname.split("/")[1] || null;
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/"))
        return url.pathname.split("/")[2] || null;
      return url.searchParams.get("v");
    }
  } catch {}
  return null;
}

function publicConfig(row: any) {
  const videoId = row.uploaded_video_id as string | null;
  return {
    videoSource: row.video_source,
    uploadedVideoId: videoId,
    uploadedVideoUrl: videoId ? `/api/collector-video/${videoId}` : null,
    youtubeVideoId: row.youtube_video_id,
    posterUrl: row.poster_url,
    youtubeHasEmbeddedBorders: row.youtube_has_embedded_borders,
    updatedAt: row.updated_at,
  };
}

router.get("/collector-experience", async (request, response) => {
  try {
    await ensureTables();
    const result = await pool.query(
      "SELECT * FROM collector_experience_config WHERE id='default'",
    );
    return response.json({ config: publicConfig(result.rows[0]) });
  } catch (error) {
    request.log.error({ error }, "Collector experience config failed");
    return response.status(500).json({ error: "Video settings could not be loaded" });
  }
});

router.get("/collector-experience/admin", requireAdmin, async (request, response) => {
  try {
    await ensureTables();
    const [config, media] = await Promise.all([
      pool.query("SELECT * FROM collector_experience_config WHERE id='default'"),
      pool.query("SELECT id, original_name, mime_type, byte_size, created_at FROM collector_video_media ORDER BY created_at DESC"),
    ]);
    return response.json({ config: publicConfig(config.rows[0]), media: media.rows });
  } catch (error) {
    request.log.error({ error }, "Collector admin config failed");
    return response.status(500).json({ error: "Video settings could not be loaded" });
  }
});

router.put("/collector-experience/admin", requireAdmin, async (request, response) => {
  try {
    await ensureTables();
    const source = request.body.videoSource === "uploaded" ? "uploaded" : "youtube";
    const id = youtubeId(request.body.youtubeVideoId || request.body.youtubeUrl);
    if (source === "youtube" && !id)
      return response.status(400).json({ error: "Enter a valid YouTube URL or video ID" });
    if (source === "uploaded" && !request.body.uploadedVideoId)
      return response.status(400).json({ error: "Choose an uploaded video" });
    const result = await pool.query(
      `UPDATE collector_experience_config SET
        video_source=$1, uploaded_video_id=$2, youtube_video_id=$3,
        poster_url=$4, youtube_has_embedded_borders=$5, updated_at=NOW()
       WHERE id='default' RETURNING *`,
      [source, request.body.uploadedVideoId || null, id || null,
       String(request.body.posterUrl || "").trim() || null,
       Boolean(request.body.youtubeHasEmbeddedBorders)],
    );
    return response.json({ config: publicConfig(result.rows[0]) });
  } catch (error: any) {
    request.log.error({ error }, "Collector admin save failed");
    const missingMedia = error?.code === "23503";
    return response.status(missingMedia ? 400 : 500).json({
      error: missingMedia ? "The selected video no longer exists" : "Video settings could not be saved",
    });
  }
});

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 450 * 1024 * 1024 },
  fileFilter: (_request, file, callback) =>
    callback(null, file.mimetype === "video/mp4" || file.mimetype === "video/webm"),
});

router.post(
  "/collector-experience/media",
  requireAdmin,
  videoUpload.single("video"),
  async (request, response) => {
    if (!request.file)
      return response.status(400).json({ error: "Choose an MP4 or WebM video" });
    try {
      await ensureTables();
      const id = crypto.randomUUID();
      await pool.query(
        "INSERT INTO collector_video_media(id,original_name,mime_type,byte_size,data) VALUES($1,$2,$3,$4,$5)",
        [id, request.file.originalname, request.file.mimetype, request.file.size, request.file.buffer],
      );
      return response.status(201).json({
        media: { id, original_name: request.file.originalname, mime_type: request.file.mimetype, byte_size: request.file.size },
        videoUrl: `/api/collector-video/${id}`,
      });
    } catch (error) {
      request.log.error({ error }, "Collector video upload failed");
      return response.status(500).json({ error: "Video could not be stored" });
    }
  },
);

router.get("/collector-video/:id", async (request, response) => {
  try {
    await ensureTables();
    const result = await pool.query(
      "SELECT original_name,mime_type,byte_size,data FROM collector_video_media WHERE id=$1",
      [request.params.id],
    );
    const video = result.rows[0];
    if (!video) return response.status(404).json({ error: "Video not found" });
    const data = video.data as Buffer;
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    const requestedStart = range?.[1] ? Number(range[1]) : 0;
    const requestedEnd = range?.[2]
      ? Number(range[2])
      : Math.min(requestedStart + 2 * 1024 * 1024 - 1, data.length - 1);
    const ranged = Boolean(range);
    const start = Math.max(0, Math.min(requestedStart, data.length - 1));
    const end = Math.max(start, Math.min(requestedEnd, data.length - 1));
    const body = ranged ? data.subarray(start, end + 1) : data;
    response.set({
      "Content-Type": video.mime_type,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${String(video.original_name).replace(/["\\]/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    });
    if (ranged) {
      response.status(206).set("Content-Range", `bytes ${start}-${end}/${data.length}`);
    }
    return response.send(body);
  } catch (error) {
    request.log.error({ error }, "Collector video serving failed");
    return response.status(500).json({ error: "Video could not be loaded" });
  }
});

export default router;
