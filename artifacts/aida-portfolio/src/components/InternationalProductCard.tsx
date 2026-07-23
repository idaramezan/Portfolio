import { ExternalLink } from "lucide-react";
import type { InternationalProduct } from "@/lib/fourthwall";
export default function InternationalProductCard({
  product,
  compact = false,
}: {
  product: InternationalProduct;
  compact?: boolean;
}) {
  const prices = [...new Set(product.variants.map((x) => x.price.formatted))];
  return (
    <article
      className={`group border border-ink/10 bg-card ${compact ? "grid grid-cols-[92px_1fr]" : ""}`}
    >
      {product.primaryImage ? (
        <img
          src={product.primaryImage.url}
          width={product.primaryImage.width || 800}
          height={product.primaryImage.height || 800}
          alt={product.primaryImage.alt}
          loading="lazy"
          className={`${compact ? "h-full min-h-28" : "aspect-square"} w-full object-cover`}
        />
      ) : (
        <div
          className={`${compact ? "min-h-28" : "aspect-square"} bg-ink/5`}
          aria-hidden="true"
        />
      )}
      <div className={compact ? "p-4" : "p-5"}>
        <span className="eyebrow">International · Fulfilled by Fourthwall</span>
        <h3 className={`mt-2 ${compact ? "text-xl" : "text-2xl"}`}>
          {product.name}
        </h3>
        <p className="mt-2 font-sans font-bold">
          {prices.length > 1
            ? `From ${product.price.formatted}`
            : product.price.formatted}
        </p>
        <p className="mt-1 text-xs text-ink/55">
          {product.soldOut ? "Sold out" : "Available on Fourthwall"}
        </p>
        <a
          href={product.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button-link mt-4"
          aria-label={`View ${product.name} on Fourthwall, opens in a new tab`}
        >
          View on Fourthwall <ExternalLink size={14} />
        </a>
      </div>
    </article>
  );
}
