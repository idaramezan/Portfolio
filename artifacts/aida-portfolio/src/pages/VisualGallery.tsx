import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Home,
  Minus,
  Plus,
  RotateCcw,
  Scan,
  X,
} from "lucide-react";
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
import Money from "@/components/Money";
import type { SpatialGalleryHandle } from "@/components/visual-gallery/SpatialGalleryScene";

const fallbackViews: GalleryCameraView[] = [
  {
    id: "entrance",
    name: "Main gallery wall",
    position: [0.7, 1.62, 2.8],
    target: [0, 1.5, -3.65],
    fieldOfView: 44,
    displayOrder: 0,
  },
  {
    id: "center",
    name: "Small Works Wall",
    position: [-2.7, 1.6, -0.2],
    target: [-4.82, 1.5, -1.15],
    fieldOfView: 46,
    displayOrder: 1,
  },
  {
    id: "corner",
    name: "Corner",
    position: [2.8, 1.65, 1.2],
    target: [1.3, 1.5, -3.55],
    fieldOfView: 43,
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
  const [focused, setFocused] = useState(false);
  const [details, setDetails] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [inspectZoom, setInspectZoom] = useState(1);
  const [inspectPan, setInspectPan] = useState({ x: 0, y: 0 });
  const gallery = useRef<SpatialGalleryHandle>(null);
  const drag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
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
    setFocused(false);
    setDetails(false);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (inspecting) setInspecting(false);
        else if (details) setDetails(false);
        else if (focused) gallery.current?.backToRoom();
      }
      if (!selected && event.key === "ArrowLeft") moveView(-1);
      if (!selected && event.key === "ArrowRight") moveView(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, focused, details, inspecting, views.length]);

  const focusArtwork = (element: GalleryElement) => {
    setSelected(element);
    setDetails(false);
    gallery.current?.focusArtwork(element);
  };
  const openInspector = () => {
    setInspectZoom(1);
    setInspectPan({ x: 0, y: 0 });
    setInspecting(true);
    if (product?.imageUrl) new Image().src = product.imageUrl;
  };

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
          ref={gallery}
          scene={scene}
          assets={data.assets}
          cameraView={views[viewIndex]}
          quality={mobile ? "mobile" : "high"}
          wallMood={wallMood}
          selectedId={selected?.id}
          onArtworkClick={focusArtwork}
          onFocusChange={setFocused}
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
      <div className="gallery-3d-zoom" aria-label="Gallery zoom controls">
        <button
          onClick={() => gallery.current?.zoomOut()}
          aria-label="Zoom out"
        >
          <Minus />
        </button>
        <button onClick={() => gallery.current?.zoomIn()} aria-label="Zoom in">
          <Plus />
        </button>
        <button
          onClick={() => gallery.current?.resetView()}
          aria-label="Reset gallery view"
        >
          <RotateCcw />
        </button>
      </div>
      <section className="sr-only" aria-label="Artworks in this room">
        {scene.elements
          .filter((item) => item.type === "artwork" && item.visible)
          .map((item) => (
            <button key={item.id} onClick={() => focusArtwork(item)}>
              {item.label}
            </button>
          ))}
      </section>
      {selected && focused && (
        <div className="gallery-3d-focus-actions">
          <button onClick={() => gallery.current?.backToRoom()}>
            <ArrowLeft /> Back to room
          </button>
          <button onClick={() => setDetails(true)}>View details</button>
          <button onClick={openInspector}>
            <Scan /> Inspect artwork
          </button>
        </div>
      )}
      {selected && details && (
        <aside
          className="gallery-3d-artwork"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-art-title"
        >
          <button
            className="gallery-3d-close"
            onClick={() => setDetails(false)}
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
            {product?.priceUsdCents != null && (
              <Money baseAmountUsdCents={product.priceUsdCents} />
            )}
            <strong>
              {product && isSoldOut(product)
                ? "Sold. This piece has found a home."
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
      {selected && inspecting && (
        <div
          className="gallery-inspector"
          role="dialog"
          aria-modal="true"
          aria-label={`Inspect ${product?.name || selected.label}`}
        >
          <div className="gallery-inspector__controls">
            <button
              onClick={() => setInspecting(false)}
              aria-label="Close inspector"
            >
              <X />
            </button>
            <button
              onClick={() =>
                setInspectZoom((value) => Math.max(1, value - 0.35))
              }
              aria-label="Zoom out"
            >
              <Minus />
            </button>
            <button
              onClick={() =>
                setInspectZoom((value) => Math.min(5, value + 0.35))
              }
              aria-label="Zoom in"
            >
              <Plus />
            </button>
            <button
              onClick={() => {
                setInspectZoom(1);
                setInspectPan({ x: 0, y: 0 });
              }}
              aria-label="Reset artwork view"
            >
              <RotateCcw />
            </button>
          </div>
          <div
            className="gallery-inspector__stage"
            onWheel={(event) => {
              event.preventDefault();
              setInspectZoom((value) =>
                Math.min(
                  5,
                  Math.max(1, value + (event.deltaY < 0 ? 0.25 : -0.25)),
                ),
              );
            }}
            onDoubleClick={() =>
              setInspectZoom((value) => (value > 1 ? 1 : 2.5))
            }
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                panX: inspectPan.x,
                panY: inspectPan.y,
              };
            }}
            onPointerMove={(event) => {
              if (!drag.current || inspectZoom === 1) return;
              setInspectPan({
                x: drag.current.panX + event.clientX - drag.current.x,
                y: drag.current.panY + event.clientY - drag.current.y,
              });
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onTouchStart={(event) => {
              if (event.touches.length !== 2) return;
              const [a, b] = [event.touches[0], event.touches[1]];
              pinch.current = {
                distance: Math.hypot(
                  a.clientX - b.clientX,
                  a.clientY - b.clientY,
                ),
                zoom: inspectZoom,
              };
            }}
            onTouchMove={(event) => {
              if (event.touches.length !== 2 || !pinch.current) return;
              const [a, b] = [event.touches[0], event.touches[1]];
              const distance = Math.hypot(
                a.clientX - b.clientX,
                a.clientY - b.clientY,
              );
              setInspectZoom(
                Math.min(
                  5,
                  Math.max(
                    1,
                    (pinch.current.zoom * distance) / pinch.current.distance,
                  ),
                ),
              );
            }}
            onTouchEnd={() => {
              pinch.current = null;
            }}
          >
            <img
              src={product?.imageUrl || selected.imageUrl}
              alt={product?.name || selected.label}
              draggable={false}
              style={{
                transform: `translate3d(${inspectPan.x}px, ${inspectPan.y}px, 0) scale(${inspectZoom})`,
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
