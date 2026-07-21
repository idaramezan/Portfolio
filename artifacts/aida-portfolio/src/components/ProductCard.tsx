import { formatPrice } from "@/lib/utils";
import { type ManagedProduct } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: ManagedProduct;
  onClick: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const kindLabel = product.kind === "print" ? product.printType ?? "Print" : "Original";
  const availabilityLabel = product.available ? "Available now" : "Reserved";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left border border-ink/10 bg-paper shadow-sm transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-coral",
        "rounded-none overflow-hidden"
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
          <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em]", product.available ? "bg-ochre/90 text-ink" : "bg-ink/90 text-paper")}> 
            {availabilityLabel}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            {product.dimension && (
              <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">{product.dimension}</p>
            )}
            <h3 className="mt-2 font-serif text-2xl text-ink">{product.name || "Untitled product"}</h3>
          </div>
          <span className="font-hand text-3xl text-ochre">{formatPrice(product.priceCents)}</span>
        </div>
        {product.description && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
        )}
        <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4 text-sm text-ink/70">
          <span>{product.kind === "print" ? "Studio print" : "Hand-finished original"}</span>
          <span className="font-medium text-ink">View details</span>
        </div>
      </div>
    </button>
  );
}
