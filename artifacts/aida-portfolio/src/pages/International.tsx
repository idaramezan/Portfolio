import { ExternalLink } from "lucide-react";
import InternationalProductCard from "@/components/InternationalProductCard";
import { useInternationalProducts } from "@/hooks/use-international";
import { usePageMeta } from "@/hooks/use-page-meta";
export default function International() {
  usePageMeta(
    "International Shop — Aida Ramezani",
    "Shop Aida Ramezani products internationally through Fourthwall.",
  );
  const { products, shopUrl, loading, error } = useInternationalProducts();
  return (
    <div className="section-shell">
      <p className="eyebrow">International shop</p>
      <h1 className="mt-4 max-w-5xl text-5xl md:text-7xl">
        Art and objects, available worldwide.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
        Browse Aida’s international collection. Orders, payment, shipping and
        fulfillment are completed through Fourthwall.
      </p>
      <p className="mt-4 text-sm font-semibold">
        You will continue to Fourthwall to select variants and complete your
        order.
      </p>
      {loading && (
        <div
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Loading international products"
        >
          {[1, 2, 3].map((x) => (
            <div key={x} className="animate-pulse border border-ink/10">
              <div className="aspect-square bg-ink/10" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-1/2 bg-ink/10" />
                <div className="h-8 bg-ink/10" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && products.length > 0 && (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((x) => (
            <InternationalProductCard key={x.id} product={x} />
          ))}
        </div>
      )}
      {!loading && (error || products.length === 0) && (
        <div className="mt-12 border border-ink/10 bg-card p-8">
          <h2 className="text-3xl">
            The international collection is temporarily unavailable here.
          </h2>
          <p className="mt-3 text-ink/60">
            You can still visit Aida’s complete Fourthwall storefront.
          </p>
          {shopUrl ? (
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button-primary mt-6"
            >
              Visit the Fourthwall shop <ExternalLink size={15} />
            </a>
          ) : (
            <p className="mt-5 text-sm text-coral">
              The Fourthwall shop link is still being configured.
            </p>
          )}
        </div>
      )}
      <p className="mt-10 text-sm text-ink/55">
        Final prices, available variants and shipping are confirmed on
        Fourthwall.
      </p>
    </div>
  );
}
