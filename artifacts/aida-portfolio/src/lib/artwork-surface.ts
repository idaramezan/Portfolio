export type ArtworkSurface = "paper" | "canvas";

export const ARTWORK_SURFACE_LABELS: Record<ArtworkSurface, string> = {
  paper: "Oil pastel on paper",
  canvas: "Oil pastel on canvas",
};

export function normalizeArtworkSurface(value: unknown): ArtworkSurface {
  return value === "canvas" ? "canvas" : "paper";
}

export function formatArtworkSurface(value: unknown): string {
  return ARTWORK_SURFACE_LABELS[normalizeArtworkSurface(value)];
}
