import Money from "@/components/Money";
import { type ManagedProduct } from "@/lib/store";
import { cn } from "@/lib/utils";
import { isSoldOut } from "@/lib/product-status";
import { formatArtworkSurface } from "@/lib/artwork-surface";

interface ProductCardProps {
  product: ManagedProduct;
  onClick: () => void;
  variant?: "default" | "original";
}

export default function ProductCard({
  product,
  onClick,
  variant = "default",
}: ProductCardProps) {
  const kindLabel =
    product.kind === "print" ? (product.printType ?? "Print") : "Original";
  const soldOut = isSoldOut(product);
  const availabilityLabel = soldOut
    ? "SOLD OUT"
    : product.available
      ? "Available now"
      : "Unavailable";

  if (variant === "original") {
    const [dimensions, framing] = (product.dimension || "").split(" · ");
    return (
      <button
        type="button"
        onClick={onClick}
        className="group flex h-full flex-col overflow-hidden border border-ink/10 bg-card text-left shadow-sm transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-coral"
      >
        <div className="overflow-hidden bg-ink/5">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={`${product.name}, original oil pastel painting`}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 640px) calc(100vw - 36px), 33vw"
              className={`aspect-[4/5] w-full bg-paper object-contain transition-transform duration-500 group-hover:scale-[1.015] ${soldOut ? "opacity-65 grayscale-[.65]" : ""}`}
            />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center text-sm text-muted-foreground">
              No image available
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-6">
          <p className="eyebrow">Original Oil Pastel Painting</p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <h3 className="text-3xl text-ink">
              {product.name || "Untitled artwork"}
            </h3>
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-wider",
                soldOut
                  ? "text-coral"
                  : product.available
                    ? "text-green"
                    : "text-ink/45",
              )}
            >
              {product.available ? "Available" : "Unavailable"}
            </span>
          </div>
          <p className="mt-3 text-[.68rem] font-bold uppercase tracking-[.16em] text-ink/50">
            {formatArtworkSurface(product.artworkSurface)}
          </p>
          <div className="mt-5 flex items-end justify-between gap-4 border-y border-ink/10 py-4">
            <p className="text-sm leading-relaxed text-ink/65">
              {dimensions || "Dimensions available on request"}
              {framing && <span className="block">{framing}</span>}
            </p>
            <Money
              baseAmountUsdCents={product.priceUsdCents}
              showBase
              className="font-sans text-xl font-bold text-ink"
            />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-ink/70">
            A one of a kind {formatArtworkSurface(product.artworkSurface).toLowerCase()} artwork,
            created and signed by Aida Ramezani.
          </p>
          <p className="mt-5 text-[.65rem] font-bold uppercase tracking-[.13em] text-ink/50">
            Original artwork • Signed • Certificate included
          </p>
          <span className="button-secondary mt-6 w-full group-hover:bg-ink group-hover:text-paper">
            View artwork
          </span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left border border-ink/10 bg-paper shadow-sm transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-coral",
        "rounded-none overflow-hidden",
      )}
    >
      <div className="relative overflow-hidden bg-ink/5 h-64">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image available
          </div>
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-paper/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-ink">
            {kindLabel}
          </span>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em]",
              product.available
                ? "bg-ochre/90 text-ink"
                : "bg-ink/90 text-paper",
            )}
          >
            {availabilityLabel}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            {product.kind === "original" && (
              <p className="text-[.68rem] font-bold uppercase tracking-[.16em] text-muted-foreground">
                {formatArtworkSurface(product.artworkSurface)}
              </p>
            )}
            {product.dimension && (
              <p className={`${product.kind === "original" ? "mt-2" : ""} text-sm uppercase tracking-[0.35em] text-muted-foreground`}>
                {product.dimension}
              </p>
            )}
            <h3 className="mt-2 font-serif text-2xl text-ink">
              {product.name || "Untitled product"}
            </h3>
          </div>
          <Money
            baseAmountUsdCents={product.priceUsdCents}
            showBase
            className="font-sans text-xl font-bold text-ink"
          />
        </div>
        {product.description && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}
        <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4 text-sm text-ink/70">
          <span>
            {product.kind === "print"
              ? "Studio print"
              : "Hand-finished original"}
          </span>
          <span className="font-medium text-ink">View details</span>
        </div>
      </div>
    </button>
  );
}
