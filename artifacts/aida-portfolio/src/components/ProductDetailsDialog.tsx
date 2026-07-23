import { X } from "lucide-react";
import { type ManagedProduct } from "@/lib/store";
import Money from "@/components/Money";
import { Button } from "@/components/ui/button";
import { formatArtworkSurface } from "@/lib/artwork-surface";

interface ProductDetailsDialogProps {
  product: ManagedProduct | null;
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
}

export default function ProductDetailsDialog({
  product,
  open,
  onClose,
  onAdd,
}: ProductDetailsDialogProps) {
  if (!product) return null;

  const kindLabel =
    product.kind === "print" ? (product.printType ?? "Print") : "Original";
  const availabilityLabel = product.available ? "Available now" : "Reserved";
  const purchaseLabel =
    product.kind === "print"
      ? (product.printType?.toLowerCase() ?? "print")
      : "original";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 mx-auto w-full max-w-4xl overflow-hidden rounded-none border border-ink/10 bg-paper shadow-2xl">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative flex min-h-0 items-center justify-center bg-ink/5">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className={`${product.kind === "original" ? "aspect-[4/5] object-contain" : "object-cover"} max-h-[80dvh] h-full w-full`}
              />
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-muted-foreground">
                No image available
              </div>
            )}
          </div>
          <div className="flex h-full flex-col justify-between p-8">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                    {kindLabel}
                  </p>
                  <h2 className="mt-3 text-4xl font-serif text-ink">
                    {product.name}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-ink transition-colors hover:text-coral"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-ink/10 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-ink">
                  {availabilityLabel}
                </span>
                <span className="rounded-full border border-ink/10 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-ink">
                  {product.dimension || "Custom size"}
                </span>
              </div>

              <div className="mt-8 space-y-4 text-ink/80">
                <p className="text-base leading-relaxed">
                  {product.description || "No description provided."}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-none border border-ink/10 bg-card p-4">
                    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                      Medium
                    </p>
                    <p className="mt-2 text-base text-ink">
                      {product.kind === "print"
                        ? "Studio print edition"
                        : formatArtworkSurface(product.artworkSurface)}
                    </p>
                  </div>
                  <div className="rounded-none border border-ink/10 bg-card p-4">
                    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                      Includes
                    </p>
                    <p className="mt-2 text-base text-ink">
                      Signed piece and studio note
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-none border-t border-ink/10 pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                    Price
                  </p>
                  <Money
                    baseAmountUsdCents={product.priceUsdCents}
                    showBase
                    className="mt-2 block font-sans text-3xl font-bold text-ink"
                  />
                </div>
                <Button
                  onClick={onAdd}
                  className="rounded-none bg-blue px-8 py-4 text-lg text-paper hover:bg-ink"
                >
                  Add this {purchaseLabel} to basket
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
