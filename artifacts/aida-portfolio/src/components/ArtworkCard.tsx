import { Artwork } from "@workspace/api-client-react";
import { getArtworkImage } from "@/lib/assets";
import { cn } from "@/lib/utils";

interface ArtworkCardProps {
  artwork: Artwork;
  index: number;
  onClick: (artwork: Artwork) => void;
}

export default function ArtworkCard({
  artwork,
  index,
  onClick,
}: ArtworkCardProps) {
  // Generate random rotation based on index so it's stable but random-looking
  const rotationSeed = ((index * 137) % 7) - 3; // Random value between -3 and +3
  const edgeSeed = index % 3;
  const edgeClass =
    edgeSeed === 0
      ? "torn-edge"
      : edgeSeed === 1
        ? "torn-edge-2"
        : "torn-edge-3";

  return (
    <button
      type="button"
      className="group relative w-full text-left"
      onClick={() => onClick(artwork)}
      aria-label={`View details for ${artwork.title}`}
    >
      <div
        className={cn(
          "relative transition-all duration-300 ease-out hover:scale-[1.02] hover:z-10",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-coral",
        )}
        style={{ transform: `rotate(${rotationSeed}deg)` }}
      >
        {/* Shadow backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-ink/10 translate-y-2 translate-x-2 -z-10",
            edgeClass,
          )}
        />

        {/* Main image */}
        <img
          src={getArtworkImage(artwork, index)}
          alt={artwork.title}
          className={cn("w-full h-auto object-cover", edgeClass)}
          loading="lazy"
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 px-2">
        <div className="flex items-center justify-between gap-3">
          <span className="badge">Original · 1 of 1</span>
          <span className="text-xs font-semibold text-green">Available</span>
        </div>
        <h3 className="font-serif text-2xl font-bold text-ink">
          {artwork.title}
        </h3>
        <p className="text-sm text-ink/65">{artwork.medium}</p>
        <span className="mt-2 text-sm font-semibold underline decoration-coral underline-offset-4">
          View artwork
        </span>
      </div>
    </button>
  );
}
