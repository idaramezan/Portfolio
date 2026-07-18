import { useState } from "react";
import { useListArtworks, getListArtworksQueryKey, Artwork } from "@workspace/api-client-react";
import ArtworkCard from "@/components/ArtworkCard";
import ArtworkModal from "@/components/ArtworkModal";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Animals", "Other", "Portraits", "Still Life"];

export default function ShopOriginals() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedArtwork, setSelectedArtwork] = useState<{ artwork: Artwork; index: number } | null>(null);

  const queryParams: Record<string, string> = { forSale: "true" };
  if (activeCategory !== "All") queryParams.category = activeCategory;

  const { data: artworks, isLoading } = useListArtworks(queryParams, {
    query: { queryKey: getListArtworksQueryKey(queryParams) },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div>
          <h1 className="text-5xl md:text-7xl font-serif text-ink mb-4">Shop Originals</h1>
          <p className="text-xl text-muted-foreground font-sans max-w-xl">
            Own an original oil pastel. Each piece is one-of-a-kind — reach out via WhatsApp to purchase.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "font-sans text-sm md:text-base px-4 py-2 border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral",
                activeCategory === cat
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/20 text-ink hover:border-ink"
              )}
              style={{
                clipPath:
                  cat === "All"
                    ? "polygon(2% 0, 100% 2%, 98% 100%, 0 98%)"
                    : cat === "Animals"
                    ? "polygon(0 2%, 98% 0, 100% 98%, 2% 100%)"
                    : "polygon(1% 1%, 99% 0, 100% 99%, 0 100%)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-64 flex items-center justify-center">
          <div className="font-hand text-3xl text-ink animate-pulse">Loading the studio...</div>
        </div>
      ) : artworks && artworks.length > 0 ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
          {artworks.map((artwork, idx) => (
            <ArtworkCard
              key={artwork.id}
              artwork={artwork}
              index={idx}
              onClick={() => setSelectedArtwork({ artwork, index: idx })}
            />
          ))}
        </div>
      ) : (
        <div className="w-full py-32 flex flex-col items-center justify-center text-center bg-ink/5 torn-edge-2">
          <h3 className="font-serif text-3xl text-ink mb-4">No originals available right now</h3>
          <p className="text-muted-foreground font-sans text-lg">Check back soon — new work drops regularly.</p>
        </div>
      )}

      <ArtworkModal
        artwork={selectedArtwork?.artwork || null}
        index={selectedArtwork?.index || 0}
        onClose={() => setSelectedArtwork(null)}
        showBuyButton
      />
    </div>
  );
}
