import { useEffect, useState } from "react";
import { PackageCheck } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductDetailsDialog from "@/components/ProductDetailsDialog";
import { originalsCoverImage } from "@/lib/assets";
import {
  addItemToCart,
  loadShopSettings,
  type ManagedProduct,
} from "@/lib/store";
import { isPubliclyVisible } from "@/lib/product-status";

export default function ShopOriginals() {
  const [settings, setSettings] = useState(loadShopSettings());
  const [selected, setSelected] = useState<ManagedProduct | null>(null);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const sync = () => setSettings(loadShopSettings());
    window.addEventListener("shop-settings:updated", sync);
    const requestedId = new URLSearchParams(window.location.search).get(
      "product",
    );
    if (requestedId) {
      const requested = loadShopSettings().originalProducts.find(
        (product) => product.id === requestedId,
      );
      if (requested) setSelected(requested);
    }
    return () => window.removeEventListener("shop-settings:updated", sync);
  }, []);

  const products = settings.originalProducts.filter(isPubliclyVisible);

  const addOriginal = (product: ManagedProduct) => {
    const result = addItemToCart(
      {
        id: `original-${product.id}`,
        kind: "original",
        title: product.name,
        subtitle: product.dimension || "Original oil pastel",
        imageUrl: product.imageUrl,
        priceUsdCents: product.priceUsdCents,
        quantity: 1,
        maxQuantity: 1,
      },
      1,
    );
    setAnnouncement(
      result.ok
        ? `${product.name} added to your collection basket.`
        : result.reason || "This work could not be added.",
    );
    if (result.ok) setSelected(null);
  };

  return (
    <>
      <section className="originals-hero">
        <div className="originals-hero__content">
          <p className="eyebrow">Direct Collecting from Türkiye</p>
          <h1 className="mt-3 text-5xl leading-[.98] md:text-6xl lg:text-7xl">
            Original Paintings for Sale
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink/65">
            Explore one of a kind oil pastel paintings, created and signed by
            Aida Ramezani. Each original artwork is accompanied by a Certificate
            of Authenticity.
          </p>
          <p className="mt-3 text-lg leading-relaxed text-ink/65">
            Orders are available in Türkiye and internationally.
          </p>
        </div>
        <div className="originals-hero__media">
          <img
            src={originalsCoverImage}
            alt="Original paintings by Aida Ramezani"
            fetchPriority="high"
          />
        </div>
      </section>

      <aside className="shipping-banner" aria-label="Shipping information">
        <span className="shipping-banner__icon">
          <PackageCheck size={27} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p>
          <strong>Shipping within Türkiye is included.</strong> International
          shipping costs are calculated separately and paid by the collector.
        </p>
      </aside>

      <div className="section-shell !pt-0">
        <div className="flex justify-end border-b border-ink/10 pb-10">
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={showUnavailable}
              onChange={(e) => setShowUnavailable(e.target.checked)}
            />
            Show unavailable artworks
          </label>
        </div>
        <p aria-live="polite" className="mt-3 text-sm font-semibold text-coral">
          {announcement}
        </p>
        {products.length ? (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="original"
                onClick={() => setSelected(product)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 border border-ink/10 bg-card p-12 text-center">
            <h2 className="text-3xl">
              The current collection has found its homes.
            </h2>
            <p className="mt-3 text-ink/60">
              New originals can be published from the admin panel.
            </p>
          </div>
        )}
        <ProductDetailsDialog
          product={selected}
          open={Boolean(selected)}
          onClose={() => {
            setSelected(null);
            if (window.location.search)
              window.history.replaceState({}, "", "/originals");
          }}
          onAdd={() => selected && addOriginal(selected)}
        />
      </div>
    </>
  );
}
