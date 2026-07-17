import { Artwork } from "@workspace/api-client-react";
import { getArtworkImage } from "@/lib/assets";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ArtworkCardProps {
  artwork: Artwork;
  index: number;
  onClick: (artwork: Artwork) => void;
}

export default function ArtworkCard({ artwork, index, onClick }: ArtworkCardProps) {
  // Generate random rotation based on index so it's stable but random-looking
  const rotationSeed = (index * 137) % 7 - 3; // Random value between -3 and +3
  const edgeSeed = index % 3;
  const edgeClass = edgeSeed === 0 ? "torn-edge" : edgeSeed === 1 ? "torn-edge-2" : "torn-edge-3";

  return (
    <div 
      className="group relative cursor-pointer break-inside-avoid mb-8"
      onClick={() => onClick(artwork)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(artwork)}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${artwork.title}`}
    >
      <div 
        className={cn(
          "relative transition-all duration-300 ease-out hover:scale-[1.02] hover:z-10",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral"
        )}
        style={{ transform: `rotate(${rotationSeed}deg)` }}
      >
        {/* Shadow backdrop */}
        <div className={cn("absolute inset-0 bg-ink/10 translate-y-2 translate-x-2 -z-10", edgeClass)} />
        
        {/* Main image */}
        <img 
          src={getArtworkImage(artwork, index)} 
          alt={artwork.title}
          className={cn("w-full h-auto object-cover", edgeClass)}
          loading="lazy"
        />

        {/* Sold Stamp */}
        {artwork.status === "SOLD" && (
          <div className="absolute top-4 right-4 transform -rotate-12 bg-transparent border-4 border-coral text-coral px-4 py-1 z-20 opacity-90 mix-blend-multiply">
            <span className="font-hand text-3xl font-bold tracking-widest uppercase block translate-y-1">Sold</span>
          </div>
        )}

        {/* Info overlay (shows on hover for desktop) */}
        <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 z-10 text-paper torn-edge hidden md:flex">
          <h3 className="font-serif text-2xl font-bold mb-1">{artwork.title}</h3>
          <div className="flex justify-between items-center text-sm font-sans">
            <span>{artwork.medium}</span>
            {artwork.priceCents && artwork.status !== "SOLD" && (
              <span className="font-hand text-2xl text-ochre">{formatPrice(artwork.priceCents)}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile info (always visible) */}
      <div className="mt-4 md:hidden flex flex-col gap-1 px-2" style={{ transform: `rotate(${rotationSeed * 0.5}deg)` }}>
        <h3 className="font-serif text-xl font-bold text-ink">{artwork.title}</h3>
        <div className="flex justify-between items-center">
          <span className="bg-ochre/20 text-ink/80 text-xs px-2 py-1 rounded-sm">{artwork.category}</span>
          {artwork.priceCents && artwork.status !== "SOLD" && (
            <span className="font-hand text-xl text-ink font-bold">{formatPrice(artwork.priceCents)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
