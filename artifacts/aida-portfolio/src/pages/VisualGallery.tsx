import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Images, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLocale } from "@/lib/locale";
import { useShopSettings } from "@/hooks/use-shop-settings";
import {
  galleryRequest,
  type GalleryElement,
  type GalleryState,
} from "@/lib/visual-gallery";
import { isSoldOut } from "@/lib/product-status";

const copy = {
  en: {
    eyebrow: "STEP INSIDE",
    heading: "A little gallery for the art.",
    body: "See Aida's paintings styled inside real spaces and imagine how they might feel in your own home.",
    enter: "Enter the gallery",
    previous: "Previous room",
    next: "Next room",
    rooms: "View all rooms",
    artwork: "View artwork",
    sold: "Sold",
    soldBody: "This piece has found a home.",
    available: "Available",
    final: "Found something that feels at home?",
    finalBody:
      "Explore the available work and see the details behind each piece.",
    shop: "Explore the shop",
    restart: "Start again",
  },
  tr: {
    eyebrow: "İÇERİ GEL",
    heading: "Resimler için küçük bir galeri.",
    body: "Aida'nın resimlerini gerçek yaşam alanlarında gör ve kendi evinde nasıl hissedebileceklerini hayal et.",
    enter: "Galeriye gir",
    previous: "Önceki oda",
    next: "Sonraki oda",
    rooms: "Tüm odalar",
    artwork: "Eseri gör",
    sold: "Satıldı",
    soldBody: "Bu eser yeni evini buldu.",
    available: "Mevcut",
    final: "Evine yakışacak bir şey buldun mu?",
    finalBody: "Mevcut eserleri ve her parçanın ardındaki ayrıntıları keşfet.",
    shop: "Mağazayı keşfet",
    restart: "Başa dön",
  },
};

function SceneElement({
  element,
  interactive,
  onOpen,
}: {
  element: GalleryElement;
  interactive: boolean;
  onOpen: () => void;
}) {
  if (!element.visible || !element.imageUrl) return null;
  const style = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    zIndex: element.zIndex,
    transform: `rotate(${element.rotation}deg) scaleX(${element.flipX ? -1 : 1})`,
    "--gallery-shadow": `0 ${element.shadowOffset}px ${element.shadowBlur}px rgb(57 40 51 / ${element.shadowIntensity})`,
  } as React.CSSProperties;
  const image = (
    <img
      src={element.imageUrl}
      alt={element.type === "artwork" ? element.label : ""}
      loading="lazy"
      draggable={false}
      onError={(event) => {
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
  return element.type === "artwork" && interactive ? (
    <button
      type="button"
      className={`visual-gallery__element visual-gallery__artwork frame-${element.frameStyle}`}
      style={style}
      onClick={onOpen}
      aria-label={`View details for ${element.label}`}
    >
      {image}
    </button>
  ) : (
    <div
      className={`visual-gallery__element ${element.type === "artwork" ? "visual-gallery__artwork" : "visual-gallery__decor"}`}
      style={style}
      aria-hidden="true"
    >
      {image}
    </div>
  );
}

export default function VisualGallery() {
  const { locale } = useLocale();
  const c = copy[locale];
  const [, navigate] = useLocation();
  const products = useShopSettings();
  const [data, setData] = useState<GalleryState | null>(null);
  const [room, setRoom] = useState(0);
  const [entered, setEntered] = useState(false);
  const [selected, setSelected] = useState<GalleryElement | null>(null);
  const [navigator, setNavigator] = useState(false);
  const roomRef = useRef<HTMLElement>(null);
  useEffect(() => {
    galleryRequest("/api/gallery/preview")
      .then(setData)
      .catch(() => navigate("/"));
  }, [navigate]);
  const allProducts = useMemo(
    () => [...products.originalProducts, ...products.printProducts],
    [products],
  );
  const current = data?.scenes[room];
  const selectedProduct = selected?.referenceId
    ? allProducts.find((product) => product.id === selected.referenceId)
    : undefined;
  const enter = () => {
    setEntered(true);
    setTimeout(
      () =>
        roomRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      20,
    );
  };
  const move = (next: number) => {
    if (!data?.scenes.length) return;
    setRoom(Math.max(0, Math.min(data.scenes.length - 1, next)));
    setNavigator(false);
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setNavigator(false);
        return;
      }
      if (selected || navigator) return;
      if (event.key === "ArrowLeft") move(room - 1);
      if (event.key === "ArrowRight") move(room + 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [room, selected, navigator, data]);
  if (!data)
    return (
      <main className="section-shell min-h-[60vh]">
        <p>Preparing the gallery…</p>
      </main>
    );
  if (!data.scenes.length)
    return (
      <main className="section-shell min-h-[60vh]">
        <p className="eyebrow">VISUAL GALLERY</p>
        <h1 className="mt-3 text-5xl">
          Your gallery is ready for its first room.
        </h1>
        <p className="mt-4">
          Create and publish a room in Admin &gt; Visual Gallery.
        </p>
      </main>
    );
  return (
    <div className="visual-gallery">
      <section className="section-shell visual-gallery__intro">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1>
          {locale === "tr"
            ? data.settings.titleTr || c.heading
            : data.settings.titleEn || c.heading}
        </h1>
        <p>
          {locale === "tr"
            ? data.settings.introTr || c.body
            : data.settings.introEn || c.body}
        </p>
        <button
          className="paper-button paper-button--pink paper-button--lg"
          onClick={enter}
        >
          {c.enter} <ArrowRight />
        </button>
      </section>
      <section
        ref={roomRef}
        className="section-shell visual-gallery__experience"
        aria-label={current?.titleEn}
      >
        {entered && current && (
          <>
            <header>
              <p className="eyebrow">
                {locale === "tr"
                  ? current.titleTr || current.titleEn
                  : current.titleEn}
              </p>
              <p>
                {locale === "tr"
                  ? current.descriptionTr || current.descriptionEn
                  : current.descriptionEn}
              </p>
            </header>
            <div
              className={`visual-gallery__scene texture-${current.wallTexture} light-${current.lightingPreset}`}
              style={{
                backgroundColor: current.wallColor,
                objectPosition: current.mobileCrop,
              }}
            >
              <div
                className={`visual-gallery__floor floor-${current.floorType}`}
              />
              {current.baseboard && (
                <div className="visual-gallery__baseboard" />
              )}
              {current.elements.map((element) => (
                <SceneElement
                  key={element.id}
                  element={element}
                  interactive={
                    element.type !== "artwork" ||
                    !element.referenceId ||
                    allProducts.some(
                      (product) => product.id === element.referenceId,
                    )
                  }
                  onOpen={() => setSelected(element)}
                />
              ))}
            </div>
            <nav className="visual-gallery__nav" aria-label="Gallery rooms">
              <button disabled={room === 0} onClick={() => move(room - 1)}>
                <ArrowLeft /> {c.previous}
              </button>
              <button onClick={() => setNavigator(true)}>
                <Images /> {room + 1} / {data.scenes.length}
              </button>
              <button
                disabled={room === data.scenes.length - 1}
                onClick={() => move(room + 1)}
              >
                {c.next} <ArrowRight />
              </button>
            </nav>
            {room === data.scenes.length - 1 && (
              <div className="visual-gallery__final">
                <h2>{c.final}</h2>
                <p>{c.finalBody}</p>
                <div>
                  <Link className="button-primary" href="/shop">
                    {c.shop}
                  </Link>
                  <button className="button-link" onClick={() => move(0)}>
                    {c.restart}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      {navigator && (
        <div
          className="visual-gallery__overlay"
          role="dialog"
          aria-modal="true"
          aria-label={c.rooms}
        >
          <button
            className="visual-gallery__close"
            onClick={() => setNavigator(false)}
            aria-label="Close"
          >
            <X />
          </button>
          <div className="visual-gallery__room-list">
            {data.scenes.map((scene, index) => (
              <button key={scene.id} onClick={() => move(index)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {locale === "tr"
                  ? scene.titleTr || scene.titleEn
                  : scene.titleEn}
              </button>
            ))}
          </div>
        </div>
      )}
      {selected && (
        <div
          className="visual-gallery__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-artwork-title"
        >
          <button
            className="visual-gallery__close"
            onClick={() => setSelected(null)}
            aria-label="Close"
          >
            <X />
          </button>
          <article className="visual-gallery__detail">
            <img
              src={selectedProduct?.imageUrl || selected.imageUrl}
              alt={selected.label}
            />
            <div>
              <p className="eyebrow">
                {selectedProduct?.kind === "original"
                  ? "Original artwork"
                  : "Artwork"}
              </p>
              <h2 id="gallery-artwork-title">
                {selectedProduct?.name || selected.label}
              </h2>
              {selectedProduct?.dimension && <p>{selectedProduct.dimension}</p>}
              <p>{selectedProduct?.description}</p>
              <strong>
                {selectedProduct && isSoldOut(selectedProduct)
                  ? c.sold
                  : c.available}
              </strong>
              {selectedProduct && isSoldOut(selectedProduct) && (
                <p>{c.soldBody}</p>
              )}
              <Link
                className="button-primary"
                href={
                  selectedProduct
                    ? `/shop/${selectedProduct.kind === "original" ? "originals" : "prints"}/${selectedProduct.slug || selectedProduct.id}`
                    : "/shop"
                }
              >
                {selectedProduct && !isSoldOut(selectedProduct)
                  ? c.artwork
                  : c.shop}
              </Link>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
