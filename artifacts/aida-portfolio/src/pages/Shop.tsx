import { useEffect, useState } from "react";
import {
  useListArtworks,
  getListArtworksQueryKey,
  Artwork,
} from "@workspace/api-client-react";
import ArtworkCard from "@/components/ArtworkCard";
import ArtworkModal from "@/components/ArtworkModal";
import StudioMailBanner from "@/components/StudioMailBanner";
import ProductCard from "@/components/ProductCard";
import ProductDetailsDialog from "@/components/ProductDetailsDialog";
import {
  addItemToCart,
  loadShopSettings,
  type CartItem,
  type ManagedProduct,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export default function Shop() {
  const [showSold, setShowSold] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState<{
    artwork: Artwork;
    index: number;
  } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ManagedProduct | null>(
    null,
  );
  const [settings, setSettings] = useState(loadShopSettings());
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSettings(loadShopSettings());
    window.addEventListener("shop-settings:updated", sync);
    return () => window.removeEventListener("shop-settings:updated", sync);
  }, []);

  const queryParams = showSold ? {} : { status: "AVAILABLE" as any };
  const { data: artworks, isLoading } = useListArtworks(queryParams, {
    query: { queryKey: getListArtworksQueryKey(queryParams) },
  });

  const validArtworks = Array.isArray(artworks) ? artworks : [];

  const handleAddProduct = (product: ManagedProduct) => {
    const item: CartItem = {
      id: `product-${product.id}`,
      kind: "original",
      title: product.name,
      subtitle: product.dimension,
      priceUsdCents: product.priceUsdCents,
      quantity: 1,
    };

    const result = addItemToCart(item, product.maxPerUser);
    if (result.ok) {
      setFeedback(`${product.name} added to your basket.`);
      window.setTimeout(() => setFeedback(null), 2600);
    } else {
      setFeedback(result.reason ?? "This item could not be added.");
      window.setTimeout(() => setFeedback(null), 2600);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-24">
      <div className="flex flex-col gap-10 mb-16 border-b border-ink/10 pb-10">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            Original Paintings
          </p>
          <h1 className="mt-3 text-5xl md:text-7xl font-serif text-ink">
            Available works from the studio
          </h1>
          <p className="mt-6 text-xl text-ink/80 font-sans leading-relaxed">
            A small, curated selection of original oil pastel paintings. Each
            piece is made by hand and released as a limited studio edition.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-ink/70">
          <span>Show sold pieces</span>
          <button
            onClick={() => setShowSold(!showSold)}
            className={cn(
              "w-6 h-6 border-2 border-ink flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral",
              showSold ? "bg-ochre" : "bg-paper",
            )}
            aria-pressed={showSold}
          >
            {showSold && (
              <span className="text-ink font-bold text-sm block translate-y-[-1px]">
                ×
              </span>
            )}
          </button>
          <span className="text-muted-foreground">
            Toggle to reveal works that have already found a home.
          </span>
        </div>
      </div>

      <StudioMailBanner />

      <section className="mb-16 bg-paper border border-ink/10 p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-sans text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Studio Collection
            </p>
            <h2 className="mt-2 font-serif text-3xl text-ink">
              Available works
            </h2>
          </div>
          {feedback && <p className="text-sm text-coral">{feedback}</p>}
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {settings.originalProducts
            .filter((product) => product.available)
            .map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => setSelectedProduct(product)}
              />
            ))}
        </div>
        <ProductDetailsDialog
          product={selectedProduct}
          open={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          onAdd={() => {
            if (selectedProduct) {
              handleAddProduct(selectedProduct);
              setSelectedProduct(null);
            }
          }}
        />
      </section>

      {isLoading ? (
        <div className="w-full h-64 flex items-center justify-center">
          <div className="font-hand text-3xl text-ink animate-pulse">
            Setting up the shop...
          </div>
        </div>
      ) : validArtworks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
          {validArtworks.map((artwork, idx) => (
            <ArtworkCard
              key={artwork.id}
              artwork={artwork}
              index={idx}
              onClick={() => setSelectedArtwork({ artwork, index: idx })}
            />
          ))}
        </div>
      ) : (
        <div className="w-full py-32 flex flex-col items-center justify-center text-center bg-ochre/10 torn-edge-3">
          <h3 className="font-serif text-3xl text-ink mb-4">
            The studio is empty
          </h3>
          <p className="text-muted-foreground font-sans text-lg">
            All currently available originals have found homes.
          </p>
          <button
            onClick={() => setShowSold(true)}
            className="mt-8 font-serif text-blue link-underline text-xl"
          >
            View past work
          </button>
        </div>
      )}

      <ArtworkModal
        artwork={selectedArtwork?.artwork || null}
        index={selectedArtwork?.index || 0}
        onClose={() => setSelectedArtwork(null)}
      />
    </div>
  );
}
