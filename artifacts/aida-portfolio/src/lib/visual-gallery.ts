export const GALLERY_PREVIEW_PATH = "/gallery-preview-7v4m2k9";
export type GalleryVisibility =
  "private_preview" | "public_unlisted" | "public";
export type GalleryElementType =
  | "artwork"
  | "furniture"
  | "lighting"
  | "plant"
  | "table"
  | "decor"
  | "rug"
  | "other";

export interface GalleryElement {
  id: string;
  sceneId?: string;
  type: GalleryElementType;
  referenceId?: string | null;
  label: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  flipX: boolean;
  lockAspect: boolean;
  scaleMode: "realistic" | "manual";
  frameStyle: string;
  matStyle: string;
  shadowIntensity: number;
  shadowBlur: number;
  shadowOffset: number;
}
export interface GalleryScene {
  id: string;
  internalName: string;
  titleEn: string;
  titleTr: string;
  descriptionEn: string;
  descriptionTr: string;
  status: "draft" | "published";
  displayOrder: number;
  wallColor: string;
  wallTexture: string;
  floorType: string;
  baseboard: boolean;
  lightingPreset: string;
  lightDirection: string;
  mobileCrop: string;
  elements: GalleryElement[];
}
export interface GalleryAsset {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  defaultWidth: number;
  defaultLayer: number;
  enabled: boolean;
}
export interface GalleryState {
  settings: {
    enabled: boolean;
    visibility: GalleryVisibility;
    titleEn: string;
    titleTr: string;
    introEn: string;
    introTr: string;
    previewSlug: string;
  };
  scenes: GalleryScene[];
  assets: GalleryAsset[];
}

export const galleryAuthHeaders = () => ({
  "Content-Type": "application/json",
  "x-admin-password":
    sessionStorage.getItem("aida-admin-password") ||
    import.meta.env.VITE_ADMIN_PASSWORD ||
    "a0019280718",
});
export async function galleryRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    headers: { ...galleryAuthHeaders(), ...(init.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.error || "The gallery could not be loaded.");
  return payload as GalleryState;
}
