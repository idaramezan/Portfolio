import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { pool } from "@workspace/db";

const router = Router();
export const GALLERY_PREVIEW_SLUG = "gallery-preview-7v4m2k9";
export type GalleryVisibility =
  "private_preview" | "public_unlisted" | "public";

function requireAdmin(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const expected =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  if (!expected || request.headers["x-admin-password"] !== expected)
    return response.status(404).json({ error: "Not found" });
  return next();
}

export function galleryVisibilityAllowsAccess(
  visibility: GalleryVisibility,
  authenticated: boolean,
) {
  return visibility === "private_preview" ? authenticated : true;
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gallery_settings (id TEXT PRIMARY KEY DEFAULT 'primary',enabled BOOLEAN NOT NULL DEFAULT TRUE,visibility TEXT NOT NULL DEFAULT 'private_preview',title_en TEXT NOT NULL DEFAULT 'Aida''s Virtual Gallery',title_tr TEXT NOT NULL DEFAULT 'Aida''nın Sanal Galerisi',intro_en TEXT NOT NULL DEFAULT '',intro_tr TEXT NOT NULL DEFAULT '',preview_slug TEXT NOT NULL DEFAULT '${GALLERY_PREVIEW_SLUG}',updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    INSERT INTO gallery_settings (id) VALUES ('primary') ON CONFLICT(id) DO NOTHING;
    CREATE TABLE IF NOT EXISTS gallery_scenes (id UUID PRIMARY KEY,internal_name TEXT NOT NULL,title_en TEXT NOT NULL,title_tr TEXT NOT NULL DEFAULT '',description_en TEXT NOT NULL DEFAULT '',description_tr TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'draft',display_order INTEGER NOT NULL DEFAULT 0,wall_color TEXT NOT NULL DEFAULT '#efe4d4',wall_texture TEXT NOT NULL DEFAULT 'subtle_plaster',floor_type TEXT NOT NULL DEFAULT 'light_oak',baseboard BOOLEAN NOT NULL DEFAULT TRUE,lighting_preset TEXT NOT NULL DEFAULT 'natural_daylight',light_direction TEXT NOT NULL DEFAULT 'left',mobile_crop TEXT NOT NULL DEFAULT 'center',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS gallery_elements (id UUID PRIMARY KEY,scene_id UUID NOT NULL REFERENCES gallery_scenes(id) ON DELETE CASCADE,type TEXT NOT NULL,reference_id TEXT,label TEXT NOT NULL DEFAULT '',image_url TEXT NOT NULL DEFAULT '',x_percent DOUBLE PRECISION NOT NULL,y_percent DOUBLE PRECISION NOT NULL,width_percent DOUBLE PRECISION NOT NULL,height_percent DOUBLE PRECISION NOT NULL,rotation DOUBLE PRECISION NOT NULL DEFAULT 0,z_index INTEGER NOT NULL DEFAULT 1,visible BOOLEAN NOT NULL DEFAULT TRUE,locked BOOLEAN NOT NULL DEFAULT FALSE,flip_x BOOLEAN NOT NULL DEFAULT FALSE,lock_aspect BOOLEAN NOT NULL DEFAULT TRUE,scale_mode TEXT NOT NULL DEFAULT 'realistic',frame_style TEXT NOT NULL DEFAULT 'none',mat_style TEXT NOT NULL DEFAULT 'none',shadow_intensity DOUBLE PRECISION NOT NULL DEFAULT .18,shadow_blur DOUBLE PRECISION NOT NULL DEFAULT 10,shadow_offset DOUBLE PRECISION NOT NULL DEFAULT 4);
    CREATE TABLE IF NOT EXISTS gallery_assets (id UUID PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,image_url TEXT NOT NULL,default_width DOUBLE PRECISION NOT NULL DEFAULT 30,default_layer INTEGER NOT NULL DEFAULT 1,enabled BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    ALTER TABLE gallery_scenes ADD COLUMN IF NOT EXISTS template_id TEXT NOT NULL DEFAULT 'contemporary_gallery';
    ALTER TABLE gallery_scenes ADD COLUMN IF NOT EXISTS environment_preset TEXT NOT NULL DEFAULT 'daylight';
    ALTER TABLE gallery_scenes ADD COLUMN IF NOT EXISTS active_camera_view_id TEXT NOT NULL DEFAULT 'main';
    ALTER TABLE gallery_scenes ADD COLUMN IF NOT EXISTS camera_views JSONB NOT NULL DEFAULT '[{"id":"main","name":"Main gallery wall","position":[7,2.25,8.8],"target":[0,1.65,-1.5],"fieldOfView":36,"displayOrder":0},{"id":"side","name":"Side wall","position":[2.8,2.1,7.5],"target":[5,1.55,-1],"fieldOfView":38,"displayOrder":1},{"id":"corridor","name":"Reading corner","position":[-4.5,2.15,6.8],"target":[-4.2,1.5,-3.6],"fieldOfView":35,"displayOrder":2}]'::jsonb;
    ALTER TABLE gallery_elements ADD COLUMN IF NOT EXISTS wall_id TEXT NOT NULL DEFAULT 'main';
    ALTER TABLE gallery_elements ADD COLUMN IF NOT EXISTS position_3d JSONB;
    ALTER TABLE gallery_elements ADD COLUMN IF NOT EXISTS rotation_3d JSONB;
    ALTER TABLE gallery_elements ADD COLUMN IF NOT EXISTS scale_3d JSONB;
    ALTER TABLE gallery_elements ADD COLUMN IF NOT EXISTS real_width_cm DOUBLE PRECISION;
    ALTER TABLE gallery_elements ADD COLUMN IF NOT EXISTS real_height_cm DOUBLE PRECISION;
    ALTER TABLE gallery_elements ADD COLUMN IF NOT EXISTS center_height_m DOUBLE PRECISION NOT NULL DEFAULT 1.45;
    ALTER TABLE gallery_assets ADD COLUMN IF NOT EXISTS model_url TEXT;
    ALTER TABLE gallery_assets ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
    ALTER TABLE gallery_assets ADD COLUMN IF NOT EXISTS default_scale JSONB NOT NULL DEFAULT '[1,1,1]'::jsonb;
    ALTER TABLE gallery_assets ADD COLUMN IF NOT EXISTS ground_offset DOUBLE PRECISION NOT NULL DEFAULT 0;
    ALTER TABLE gallery_assets ADD COLUMN IF NOT EXISTS rotation_offset JSONB NOT NULL DEFAULT '[0,0,0]'::jsonb;
  `);
}

const mapElement = (row: any) => ({
  id: row.id,
  sceneId: row.scene_id,
  type: row.type,
  referenceId: row.reference_id,
  label: row.label,
  imageUrl: row.image_url,
  x: row.x_percent,
  y: row.y_percent,
  width: row.width_percent,
  height: row.height_percent,
  rotation: row.rotation,
  zIndex: row.z_index,
  visible: row.visible,
  locked: row.locked,
  flipX: row.flip_x,
  lockAspect: row.lock_aspect,
  scaleMode: row.scale_mode,
  frameStyle: row.frame_style,
  matStyle: row.mat_style,
  shadowIntensity: row.shadow_intensity,
  shadowBlur: row.shadow_blur,
  shadowOffset: row.shadow_offset,
  wallId: row.wall_id,
  position3d: row.position_3d,
  rotation3d: row.rotation_3d,
  scale3d: row.scale_3d,
  realWidthCm: row.real_width_cm,
  realHeightCm: row.real_height_cm,
  centerHeightM: row.center_height_m,
});
const mapScene = (row: any, elements: any[]) => ({
  id: row.id,
  internalName: row.internal_name,
  titleEn: row.title_en,
  titleTr: row.title_tr,
  descriptionEn: row.description_en,
  descriptionTr: row.description_tr,
  status: row.status,
  displayOrder: row.display_order,
  wallColor: row.wall_color,
  wallTexture: row.wall_texture,
  floorType: row.floor_type,
  baseboard: row.baseboard,
  lightingPreset: row.lighting_preset,
  lightDirection: row.light_direction,
  mobileCrop: row.mobile_crop,
  templateId: row.template_id,
  environmentPreset: row.environment_preset,
  activeCameraViewId: row.active_camera_view_id,
  cameraViews: row.camera_views,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  elements: elements.filter((e) => e.sceneId === row.id),
});

async function state(publishedOnly = false) {
  await ensureTables();
  const [settingsResult, scenesResult, elementsResult, assetsResult] =
    await Promise.all([
      pool.query("SELECT * FROM gallery_settings WHERE id='primary'"),
      pool.query(
        `SELECT * FROM gallery_scenes ${publishedOnly ? "WHERE status='published'" : ""} ORDER BY display_order,created_at`,
      ),
      pool.query("SELECT * FROM gallery_elements ORDER BY z_index"),
      pool.query("SELECT * FROM gallery_assets ORDER BY created_at DESC"),
    ]);
  const elements = elementsResult.rows.map(mapElement);
  const s = settingsResult.rows[0];
  return {
    settings: {
      enabled: s.enabled,
      visibility: s.visibility,
      titleEn: s.title_en,
      titleTr: s.title_tr,
      introEn: s.intro_en,
      introTr: s.intro_tr,
      previewSlug: s.preview_slug,
    },
    scenes: scenesResult.rows.map((row) => mapScene(row, elements)),
    assets: assetsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      imageUrl: row.image_url,
      defaultWidth: row.default_width,
      defaultLayer: row.default_layer,
      enabled: row.enabled,
      modelUrl: row.model_url,
      thumbnailUrl: row.thumbnail_url,
      defaultScale: row.default_scale,
      groundOffset: row.ground_offset,
      rotationOffset: row.rotation_offset,
    })),
  };
}

router.get("/gallery/admin", requireAdmin, async (_req, res) =>
  res.json(await state()),
);
router.get("/gallery/preview", async (req, res) => {
  const payload = await state(true);
  const expected =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "development" ? "a0019280718" : undefined);
  const authenticated = Boolean(
    expected && req.headers["x-admin-password"] === expected,
  );
  if (
    !payload.settings.enabled ||
    !galleryVisibilityAllowsAccess(payload.settings.visibility, authenticated)
  )
    return res.status(404).json({ error: "Not found" });
  return res.set("Cache-Control", "no-store").json(payload);
});
router.put("/gallery/admin/settings", requireAdmin, async (req, res) => {
  await ensureTables();
  const b = req.body || {};
  await pool.query(
    "UPDATE gallery_settings SET enabled=$1,visibility=$2,title_en=$3,title_tr=$4,intro_en=$5,intro_tr=$6,updated_at=NOW() WHERE id='primary'",
    [
      Boolean(b.enabled),
      ["private_preview", "public_unlisted", "public"].includes(b.visibility)
        ? b.visibility
        : "private_preview",
      String(b.titleEn || "Aida's Virtual Gallery"),
      String(b.titleTr || "Aida'nın Sanal Galerisi"),
      String(b.introEn || ""),
      String(b.introTr || ""),
    ],
  );
  res.json(await state());
});
router.post("/gallery/admin/scenes", requireAdmin, async (req, res) => {
  await ensureTables();
  const b = req.body || {};
  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO gallery_scenes(id,internal_name,title_en,title_tr,display_order,wall_color,floor_type) VALUES($1,$2,$3,$4,(SELECT COALESCE(MAX(display_order),-1)+1 FROM gallery_scenes),$5,$6)",
    [
      id,
      String(b.internalName || "Untitled room"),
      String(b.titleEn || b.internalName || "Untitled room"),
      String(b.titleTr || ""),
      String(b.wallColor || "#efe4d4"),
      String(b.floorType || "light_oak"),
    ],
  );
  res.status(201).json(await state());
});
router.put("/gallery/admin/scenes/:id", requireAdmin, async (req, res) => {
  await ensureTables();
  const b = req.body || {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE gallery_scenes SET internal_name=$2,title_en=$3,title_tr=$4,description_en=$5,description_tr=$6,status=$7,display_order=$8,wall_color=$9,wall_texture=$10,floor_type=$11,baseboard=$12,lighting_preset=$13,light_direction=$14,mobile_crop=$15,template_id=$16,environment_preset=$17,active_camera_view_id=$18,camera_views=$19::jsonb,updated_at=NOW() WHERE id=$1",
      [
        req.params.id,
        b.internalName,
        b.titleEn,
        b.titleTr || "",
        b.descriptionEn || "",
        b.descriptionTr || "",
        b.status === "published" ? "published" : "draft",
        Number(b.displayOrder) || 0,
        b.wallColor || "#efe4d4",
        b.wallTexture || "none",
        b.floorType || "none",
        b.baseboard !== false,
        b.lightingPreset || "natural_daylight",
        b.lightDirection || "left",
        b.mobileCrop || "center",
        b.templateId || "contemporary_gallery",
        b.environmentPreset || "daylight",
        b.activeCameraViewId || "entrance",
        JSON.stringify(Array.isArray(b.cameraViews) ? b.cameraViews : []),
      ],
    );
    await client.query("DELETE FROM gallery_elements WHERE scene_id=$1", [
      req.params.id,
    ]);
    for (const e of Array.isArray(b.elements) ? b.elements : [])
      await client.query(
        "INSERT INTO gallery_elements(id,scene_id,type,reference_id,label,image_url,x_percent,y_percent,width_percent,height_percent,rotation,z_index,visible,locked,flip_x,lock_aspect,scale_mode,frame_style,mat_style,shadow_intensity,shadow_blur,shadow_offset,wall_id,position_3d,rotation_3d,scale_3d,real_width_cm,real_height_cm,center_height_m) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24::jsonb,$25::jsonb,$26::jsonb,$27,$28,$29)",
        [
          e.id || crypto.randomUUID(),
          req.params.id,
          e.type,
          e.referenceId || null,
          e.label || "",
          e.imageUrl || "",
          Number(e.x) || 0,
          Number(e.y) || 0,
          Number(e.width) || 20,
          Number(e.height) || 20,
          Math.max(-8, Math.min(8, Number(e.rotation) || 0)),
          Number(e.zIndex) || 1,
          e.visible !== false,
          Boolean(e.locked),
          Boolean(e.flipX),
          e.lockAspect !== false,
          e.scaleMode || "realistic",
          e.frameStyle || "none",
          e.matStyle || "none",
          Number(e.shadowIntensity) ?? 0.18,
          Number(e.shadowBlur) || 10,
          Number(e.shadowOffset) || 4,
          e.wallId || "main",
          JSON.stringify(e.position3d || null),
          JSON.stringify(e.rotation3d || null),
          JSON.stringify(e.scale3d || [1, 1, 1]),
          Number(e.realWidthCm) || null,
          Number(e.realHeightCm) || null,
          Number(e.centerHeightM) || null,
        ],
      );
    await client.query("COMMIT");
    res.json(await state());
  } catch (error) {
    await client.query("ROLLBACK");
    req.log.error({ error }, "Gallery scene save failed");
    res
      .status(500)
      .json({ error: "Couldn't save this room. Your changes are still here." });
  } finally {
    client.release();
  }
});
router.post(
  "/gallery/admin/scenes/:id/duplicate",
  requireAdmin,
  async (req, res) => {
    const payload = await state();
    const source = payload.scenes.find((s) => s.id === req.params.id);
    if (!source) return res.status(404).json({ error: "Room not found" });
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO gallery_scenes(id,internal_name,title_en,title_tr,description_en,description_tr,status,display_order,wall_color,wall_texture,floor_type,baseboard,lighting_preset,light_direction,mobile_crop,template_id,environment_preset,active_camera_view_id,camera_views) SELECT $2,internal_name||' copy',title_en,title_tr,description_en,description_tr,'draft',(SELECT COALESCE(MAX(display_order),-1)+1 FROM gallery_scenes),wall_color,wall_texture,floor_type,baseboard,lighting_preset,light_direction,mobile_crop,template_id,environment_preset,active_camera_view_id,camera_views FROM gallery_scenes WHERE id=$1",
      [req.params.id, id],
    );
    for (const e of source.elements)
      await pool.query(
        "INSERT INTO gallery_elements(id,scene_id,type,reference_id,label,image_url,x_percent,y_percent,width_percent,height_percent,rotation,z_index,visible,locked,flip_x,lock_aspect,scale_mode,frame_style,mat_style,shadow_intensity,shadow_blur,shadow_offset,wall_id,position_3d,rotation_3d,scale_3d,real_width_cm,real_height_cm,center_height_m) SELECT $1,$2,type,reference_id,label,image_url,x_percent,y_percent,width_percent,height_percent,rotation,z_index,visible,locked,flip_x,lock_aspect,scale_mode,frame_style,mat_style,shadow_intensity,shadow_blur,shadow_offset,wall_id,position_3d,rotation_3d,scale_3d,real_width_cm,real_height_cm,center_height_m FROM gallery_elements WHERE id=$3",
        [crypto.randomUUID(), id, e.id],
      );
    return res.status(201).json(await state());
  },
);
router.delete("/gallery/admin/scenes/:id", requireAdmin, async (req, res) => {
  await ensureTables();
  await pool.query("DELETE FROM gallery_scenes WHERE id=$1", [req.params.id]);
  res.json(await state());
});
router.post("/gallery/admin/assets", requireAdmin, async (req, res) => {
  await ensureTables();
  const b = req.body || {};
  await pool.query(
    "INSERT INTO gallery_assets(id,name,category,image_url,default_width,default_layer,enabled,model_url,thumbnail_url,default_scale,ground_offset,rotation_offset) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb)",
    [
      crypto.randomUUID(),
      String(b.name || "Gallery asset"),
      String(b.category || "other"),
      String(b.imageUrl || ""),
      Number(b.defaultWidth) || 30,
      Number(b.defaultLayer) || 1,
      b.enabled !== false,
      String(b.modelUrl || "") || null,
      String(b.thumbnailUrl || b.imageUrl || "") || null,
      JSON.stringify(b.defaultScale || [1, 1, 1]),
      Number(b.groundOffset) || 0,
      JSON.stringify(b.rotationOffset || [0, 0, 0]),
    ],
  );
  res.status(201).json(await state());
});

export default router;
