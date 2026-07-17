import { useState } from "react";
import { useListArtworks, getListArtworksQueryKey, Artwork } from "@workspace/api-client-react";
import ArtworkCard from "@/components/ArtworkCard";
import ArtworkModal from "@/components/ArtworkModal";
import { cn } from "@/lib/utils";

export default function Shop() {
  const [showSold, setShowSold] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState<{artwork: Artwork, index: number} | null>(null);

  // For the shop, we want to fetch all works but specifically highlight purchaseability
  // If showSold is false, we filter to AVAILABLE status
  const queryParams = showSold ? {} : { status: "AVAILABLE" as any };
  const { data: artworks, isLoading } = useListArtworks(queryParams, { 
    query: { queryKey: getListArtworksQueryKey(queryParams) } 
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b-2 border-ink pb-8 relative">
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-ink transform rotate-[0.5deg] origin-left"></div>
        <div>
          <h1 className="text-5xl md:text-7xl font-serif text-ink mb-4">Originals Shop</h1>
          <p className="text-xl text-muted-foreground font-sans max-w-xl">
            One-of-a-kind oil pastel works directly from the studio.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-paper border border-ink/20 px-4 py-2 torn-edge">
          <button
            onClick={() => setShowSold(!showSold)}
            className={cn(
              "w-6 h-6 border-2 border-ink flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-coral",
              showSold ? "bg-ochre" : "bg-paper"
            )}
            role="switch"
            aria-checked={showSold}
          >
            {showSold && <span className="text-ink font-bold text-sm block translate-y-[-1px]">×</span>}
          </button>
          <label className="font-sans text-ink select-none cursor-pointer" onClick={() => setShowSold(!showSold)}>
            Show sold pieces
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-64 flex items-center justify-center">
          <div className="font-hand text-3xl text-ink animate-pulse">Setting up the shop...</div>
        </div>
      ) : artworks && artworks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
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
        <div className="w-full py-32 flex flex-col items-center justify-center text-center bg-ochre/10 torn-edge-3">
          <h3 className="font-serif text-3xl text-ink mb-4">The studio is empty</h3>
          <p className="text-muted-foreground font-sans text-lg">All currently available originals have found homes.</p>
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
