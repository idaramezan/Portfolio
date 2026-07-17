import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface FourthwallProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  images: string[];
  price: number | null;
  currency: string;
  hasVariants: boolean;
  state: string;
  checkoutUrl: string;
}

async function fetchPrints(): Promise<FourthwallProduct[]> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api/prints`);
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return "See shop";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function ProductCard({ product, index }: { product: FourthwallProduct; index: number }) {
  const [imgError, setImgError] = useState(false);
  const edgeClass = ["torn-edge", "torn-edge-2", "torn-edge-3"][index % 3];
  const rotation = ["rotate-1", "-rotate-2", "rotate-2", "-rotate-1"][index % 4];
  const isSoldOut = product.state === "SOLD_OUT" || product.state === "UNAVAILABLE";

  return (
    <div
      className={cn(
        "flex flex-col bg-paper border border-ink/10 shadow-sm hover:shadow-md transition-all duration-500 group relative",
        "hover:border-ink/20",
        isSoldOut && "opacity-60"
      )}
    >
      {/* Image */}
      <div className={cn("w-full aspect-[4/5] bg-ink/5 overflow-hidden relative", edgeClass)}>
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            className={cn(
              "w-full h-full object-cover transition-transform duration-700 group-hover:scale-105",
              "transform",
              rotation
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-hand text-4xl text-ink/20">✦</span>
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper/60">
            <span className="font-hand text-3xl text-ink transform -rotate-12">Sold Out</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-6 gap-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-ink leading-snug">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 pt-2">
          <span className="font-hand text-2xl text-ochre">
            {formatPrice(product.price, product.currency)}
          </span>

          <a
            href={product.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "bg-blue text-paper font-serif font-bold px-5 py-2 torn-edge transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 whitespace-nowrap text-sm",
              isSoldOut
                ? "pointer-events-none opacity-40"
                : "hover:bg-ink"
            )}
            aria-disabled={isSoldOut}
          >
            {isSoldOut ? "Sold Out" : product.hasVariants ? "Choose Options" : "Order Now"}
          </a>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-paper border border-ink/10 animate-pulse">
      <div className="w-full aspect-[4/5] bg-ink/10" />
      <div className="p-6 space-y-3">
        <div className="h-5 bg-ink/10 rounded w-3/4" />
        <div className="h-4 bg-ink/5 rounded w-1/2" />
        <div className="h-8 bg-ink/10 rounded w-1/3 mt-4" />
      </div>
    </div>
  );
}

export default function Prints() {
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ["fourthwall-products"],
    queryFn: fetchPrints,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const available = products?.filter((p) => p.state !== "UNAVAILABLE") ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-24">
      {/* Header */}
      <div className="max-w-3xl mb-16">
        <h1 className="text-5xl md:text-7xl font-serif text-ink mb-6">Prints, Tees &amp; Mugs</h1>
        <p className="text-xl text-ink/80 font-sans leading-relaxed">
          Oil pastel energy on things you actually use. Fine art prints, cozy tees, mugs and more. Every piece ships worldwide straight from the studio via Fourthwall.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {isError && (
        <div className="w-full py-32 flex flex-col items-center justify-center text-center bg-coral/10 torn-edge">
          <h3 className="font-serif text-3xl text-ink mb-4">Couldn't load the shop right now</h3>
          <p className="text-muted-foreground font-sans text-lg mb-6">
            Try refreshing, or visit the shop directly.
          </p>
          <a
            href="https://aeda-shop.fourthwall.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-coral text-paper font-serif text-lg px-8 py-3 torn-edge hover:bg-ink transition-colors"
          >
            Open Fourthwall Shop ↗
          </a>
        </div>
      )}

      {!isLoading && !isError && available.length === 0 && (
        <div className="w-full py-32 flex flex-col items-center justify-center text-center bg-blue/10 torn-edge">
          <h3 className="font-serif text-3xl text-ink mb-4">No products available yet</h3>
          <p className="text-muted-foreground font-sans text-lg">Check back soon!</p>
        </div>
      )}

      {!isLoading && !isError && available.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {available.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>
      )}

      {/* Footer CTA */}
      {!isLoading && !isError && available.length > 0 && (
        <div className="mt-16 text-center">
          <a
            href="https://aeda-shop.fourthwall.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-hand text-xl text-ink/60 hover:text-coral transition-colors link-underline"
          >
            View everything on aeda-shop.fourthwall.com ↗
          </a>
        </div>
      )}
    </div>
  );
}
