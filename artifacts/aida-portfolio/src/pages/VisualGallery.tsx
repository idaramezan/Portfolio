import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Home, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import SpatialGalleryScene from "@/components/visual-gallery/SpatialGalleryScene";
import { useShopSettings } from "@/hooks/use-shop-settings";
import {
  galleryRequest,
  type GalleryCameraView,
  type GalleryElement,
  type GalleryState,
} from "@/lib/visual-gallery";
import { isSoldOut } from "@/lib/product-status";

const fallbackViews: GalleryCameraView[] = [
  {
    id: "entrance",
    name: "Entrance",
    position: [7, 2.25, 8.8],
    target: [0, 1.55, -2.4],
    fieldOfView: 36,
    displayOrder: 0,
  },
  {
    id: "center",
    name: "Main wall",
    position: [0, 2, 6.6],
    target: [0, 1.55, -3.4],
    fieldOfView: 34,
    displayOrder: 1,
  },
  {
    id: "corner",
    name: "Corner",
    position: [-5, 2.05, 3.9],
    target: [1.6, 1.5, -2.7],
    fieldOfView: 38,
    displayOrder: 2,
  },
];

export default function VisualGallery() {
  const [, navigate] = useLocation();
  const products = useShopSettings();
  const [data, setData] = useState<GalleryState | null>(null);
  const [roomIndex, setRoomIndex] = useState(0);
  const [viewIndex, setViewIndex] = useState(0);
  const [selected, setSelected] = useState<GalleryElement | null>(null);
  const [wallMood, setWallMood] = useState<
    "scene" | "cream" | "blush" | "sage"
  >("scene");
  const mobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 760px)").matches;

  useEffect(() => {
    galleryRequest("/api/gallery/preview")
      .then(setData)
      .catch(() => navigate("/"));
  }, [navigate]);

  const scene = data?.scenes[roomIndex];
  const views = scene?.cameraViews?.length
    ? [...scene.cameraViews].sort((a, b) => a.displayOrder - b.displayOrder)
    : fallbackViews;
  const allProducts = useMemo(
    () => [...products.originalProducts, ...products.printProducts],
    [products],
  );
  const product = selected?.referenceId
    ? allProducts.find((item) => item.id === selected.referenceId)
    : undefined;

  const moveView = (amount: number) => {
    setViewIndex((current) => (current + amount + views.length) % views.length);
    setSelected(null);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (!selected && event.key === "ArrowLeft") moveView(-1);
      if (!selected && event.key === "ArrowRight") moveView(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!data || !scene) {
    return (
      <main className="gallery-3d-shell gallery-3d-empty">
        <p>{data ? "No published gallery room yet." : "Preparing the room…"}</p>
      </main>
    );
  }

  return (
    <main className="gallery-3d-shell">
      <div className="gallery-3d-canvas" aria-hidden="true">
        <SpatialGalleryScene
          scene={scene}
          cameraView={views[viewIndex]}
          quality={mobile ? "mobile" : "high"}
          wallMood={wallMood}
          onArtworkClick={setSelected}
        />
      </div>
      <header className="gallery-3d-topbar">
        <div>
          <strong>Aida Gallery</strong>
          <span>Private preview</span>
        </div>
        <Link href="/" aria-label="Back to website">
          <Home size={17} /> Website
        </Link>
      </header>
      <aside className="gallery-3d-lab" aria-label="Gallery mood controls">
        <span>Wall mood</span>
        {(["scene", "cream", "blush", "sage"] as const).map((mood) => (
          <button
            key={mood}
            className={wallMood === mood ? "is-active" : ""}
            onClick={() => setWallMood(mood)}
          >
            {mood}
          </button>
        ))}
      </aside>
      <nav className="gallery-3d-nav" aria-label="Gallery viewpoints">
        <button onClick={() => moveView(-1)} aria-label="Previous viewpoint">
          <ArrowLeft />
        </button>
        <div>
          <strong>{views[viewIndex]?.name}</strong>
          <span>
            {viewIndex + 1} / {views.length}
          </span>
        </div>
        <button onClick={() => moveView(1)} aria-label="Next viewpoint">
          <ArrowRight />
        </button>
        {data.scenes.length > 1 && (
          <select
            aria-label="Gallery room"
            value={scene.id}
            onChange={(event) => {
              setRoomIndex(
                data.scenes.findIndex((item) => item.id === event.target.value),
              );
              setViewIndex(0);
            }}
          >
            {data.scenes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.titleEn}
              </option>
            ))}
          </select>
        )}
      </nav>
      <section className="sr-only" aria-label="Artworks in this room">
        {scene.elements
          .filter((item) => item.type === "artwork" && item.visible)
          .map((item) => (
            <button key={item.id} onClick={() => setSelected(item)}>
              {item.label}
            </button>
          ))}
      </section>
      {selected && (
        <aside
          className="gallery-3d-artwork"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-art-title"
        >
          <button
            className="gallery-3d-close"
            onClick={() => setSelected(null)}
            aria-label="Close artwork details"
          >
            <X />
          </button>
          <img
            src={product?.imageUrl || selected.imageUrl}
            alt={selected.label}
          />
          <div>
            <span>
              {product?.kind === "original" ? "Original artwork" : "Artwork"}
            </span>
            <h2 id="gallery-art-title">{product?.name || selected.label}</h2>
            {product?.dimension && <p>{product.dimension}</p>}
            <p>{product?.description}</p>
            <strong>
              {product && isSoldOut(product)
                ? "Sold — this piece has found a home."
                : "Available"}
            </strong>
            <Link
              href={
                product
                  ? `/shop/${product.kind === "original" ? "originals" : "prints"}/${product.slug || product.id}`
                  : "/shop"
              }
            >
              View artwork <ArrowRight size={16} />
            </Link>
          </div>
        </aside>
      )}
    </main>
  );
}
